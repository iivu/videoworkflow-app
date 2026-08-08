import { toast } from '@r/ui';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { TuyauError } from '@tuyau/core/client';
import type { Route as ApiRoute } from '@tuyau/core/types';
import { useCallback, useRef, useState } from 'react';
import z from 'zod';
import { useAppForm } from '#/components/form';
import { useOss } from '#/hooks/use-oss';
import { normalizeApiFailedMessage, query } from '#/services/api';

import { MODEL_OPTIONS } from './constants';
import { createUploadKey, type Draft, EMPTY_DRAFT, isVoiceCloneModel } from './types';

type AudioCloneBody = ApiRoute.Body<'voices.clone_audio'>;
type VideoCloneBody = ApiRoute.Body<'voices.clone_video'>;
type VoiceCloneConfig = NonNullable<AudioCloneBody['config']>;
type UploadCache = { file: File; key: string; url?: string };

const fileSchema = z.custom<File>((value) => typeof File !== 'undefined' && value instanceof File, '请选择有效的本地文件');

const schema = z
  .object({
    mediaKind: z.enum(['audio', 'video'], '请选择媒体类型'),
    sourceMode: z.enum(['file', 'url'], '请选择媒体来源'),
    selectedFile: z.array(fileSchema).length(1).nullable().optional(),
    url: z.string().optional(),
    provider: z.enum(['bailian', 'minimaxi'], '请选择服务商'),
    model: z.string().min(1, '请选择模型'),
    languageHints: z.string().optional(),
    maxPromptAudioLength: z
      .string()
      .optional()
      .refine((value) => value === '' || (Number(value) >= 3 && Number(value) <= 30), '请输入 3 到 30 之间的数字'),
    enablePreprocess: z.boolean().optional(),
    text: z.string().optional(),
    languageBoost: z.string().optional(),
    needNoiseReduction: z.boolean().optional(),
    needVolumeNormalization: z.boolean().optional(),
    aigcWatermark: z.boolean().optional(),
  })
  .superRefine((draft, c) => {
    if (draft.sourceMode === 'file' && !draft.selectedFile?.length) c.addIssue({ path: ['selectedFile'], code: 'custom', message: '请选择本地文件' });
    const selectedFile = draft.selectedFile?.[0];
    if (draft.sourceMode === 'file' && selectedFile && !matchesMediaKind(selectedFile, draft.mediaKind)) {
      c.addIssue({ path: ['selectedFile'], code: 'custom', message: draft.mediaKind === 'audio' ? '请选择音频文件' : '请选择视频文件' });
    }
    if (draft.sourceMode === 'url' && (!draft.url || !z.url().safeParse(draft.url.trim()).success))
      c.addIssue({ path: ['url'], code: 'custom', message: '请输入有效的网络地址(URL)' });
    if (draft.provider && !(MODEL_OPTIONS[draft.provider] as readonly string[]).includes(draft.model)) {
      c.addIssue({ path: ['model'], code: 'custom', message: '请选择当前服务商支持的模型' });
    }
  });
function matchesMediaKind(file: File, mediaKind: Draft['mediaKind']) {
  const extension = file.name.split('.').pop()?.toLowerCase();
  return mediaKind === 'audio' ? file.type.startsWith('audio/') || extension === 'mp3' : file.type.startsWith('video/') || extension === 'mp4';
}

async function resolveMediaUrl(draft: Draft, upload: ReturnType<typeof useOss>['upload'], uploadCache: { current: UploadCache | null }) {
  if (draft.sourceMode === 'url') return draft.url?.trim();
  if (!draft.selectedFile || draft.selectedFile.length <= 0) return null;
  const file = draft.selectedFile[0];
  if (uploadCache.current?.file !== file) {
    uploadCache.current = { file, key: createUploadKey(draft.mediaKind, file.name) };
  }
  if (uploadCache.current.url) return uploadCache.current.url;
  const result = await upload([{ file, key: uploadCache.current.key }]);
  const url = result?.[0]?.url;
  if (url) uploadCache.current.url = url;
  return url || null;
}

function buildConfig(draft: Draft): VoiceCloneConfig | undefined {
  if (draft.provider === 'bailian') {
    const languageHints = (draft.languageHints || '')
      .split(/[,，\n]/)
      .map((v) => v.trim())
      .filter(Boolean);
    const config = {
      ...(languageHints.length ? { languageHints } : {}),
      ...(draft.maxPromptAudioLength !== '' ? { maxPromptAudioLength: Number(draft.maxPromptAudioLength) } : {}),
      ...(draft.enablePreprocess !== undefined ? { enablePreprocess: draft.enablePreprocess } : {}),
    };
    return Object.keys(config).length ? config : undefined;
  }
  const config = {
    ...(draft.text?.trim() ? { text: draft.text.trim() } : {}),
    ...(draft.languageBoost?.trim() ? { languageBoost: draft.languageBoost.trim() } : {}),
    ...(draft.needNoiseReduction !== undefined ? { needNoiseReduction: draft.needNoiseReduction } : {}),
    ...(draft.needVolumeNormalization !== undefined ? { needVolumeNormalization: draft.needVolumeNormalization } : {}),
    ...(draft.aigcWatermark !== undefined ? { aigcWatermark: draft.aigcWatermark } : {}),
  };
  return Object.keys(config).length ? config : undefined;
}

export function useVoiceCloningDialogForm(opts: { onSuccess?: () => void } = {}) {
  const [formError, setFormError] = useState('');
  const uploadCache = useRef<UploadCache | null>(null);
  const clearUploadCache = useCallback(() => {
    uploadCache.current = null;
  }, []);
  const { upload, uploading } = useOss();
  const queryClient = useQueryClient();
  const audioMutation = useMutation(query.voices.cloneAudio.mutationOptions());
  const videoMutation = useMutation(query.voices.cloneVideo.mutationOptions());
  const form = useAppForm({
    defaultValues: EMPTY_DRAFT,
    validators: { onSubmit: schema },
    onSubmit: async ({ value }) => {
      setFormError('');
      try {
        const mediaUrl = await resolveMediaUrl(value, upload, uploadCache);
        if (!mediaUrl) throw new Error('文件上传失败，请重试');
        if (!value.provider || !isVoiceCloneModel(value.model)) throw new Error('请选择有效的服务商和模型');
        const config = buildConfig(value);
        const common = { provider: value.provider, model: value.model, ...(config ? { config } : {}) };
        if (value.mediaKind === 'audio') {
          const body: AudioCloneBody = { ...common, audioUrl: mediaUrl };
          await audioMutation.mutateAsync({ body });
          await queryClient.invalidateQueries({ queryKey: query.voices.list.queryKey() });
          toast.add({ type: 'success', description: '音色创建成功' });
        } else {
          const body: VideoCloneBody = { ...common, videoUrl: mediaUrl };
          await videoMutation.mutateAsync({ body });
          toast.add({ type: 'success', description: '声音克隆任务已提交' });
        }
        opts.onSuccess?.();
      } catch (error) {
        setFormError(normalizeApiFailedMessage(error as TuyauError) || (error instanceof Error ? error.message : '提交失败，请稍后重试'));
      }
    },
    onSubmitInvalid: () => setFormError(''),
  });
  return { form, formError, setFormError, clearUploadCache, uploading, isAudioMutationPending: audioMutation.isPending, isVideoMutationPending: videoMutation.isPending };
}
