import { Button, Input, Label, Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue, Switch, Textarea } from '@r/ui';
import { Handle, type NodeProps, Position } from '@xyflow/react';
import { CirclePlay, LoaderCircle, Play, Video } from 'lucide-react';
import { useState } from 'react';

import { useVideoPlayer } from '#/providers/video-player-provider';
import { selectGenerationPromptReady, selectIsNodeLocked, useCanvasStore } from '../store';
import {
  GENERATION_DURATION_OPTIONS,
  GENERATION_INPUT_HANDLE,
  GENERATION_MODEL_OPTIONS,
  GENERATION_RATIO_OPTIONS,
  GENERATION_RESOLUTION_OPTIONS,
  type GenerationParameters,
  isActiveTaskStatus,
  type VideoWorkspaceNode,
  WANXIANG_TASK_STATUS,
} from '../types';
import { NodeShell } from './node-shell';

function ParameterField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

/** 右侧视频预览基准宽度（px）；高度按所选画幅比例计算，画幅变化时预览随之缩放 */
const PREVIEW_WIDTH = 208;
const RATIO_PREVIEW_HEIGHTS: Record<string, number> = {
  '16:9': Math.round((PREVIEW_WIDTH * 9) / 16),
  '4:3': Math.round((PREVIEW_WIDTH * 3) / 4),
  '1:1': PREVIEW_WIDTH,
  '3:4': Math.round((PREVIEW_WIDTH * 4) / 3),
  '9:16': Math.round((PREVIEW_WIDTH * 16) / 9),
};

export function GenerationNode({ id, data }: NodeProps<VideoWorkspaceNode>) {
  const { playVideo } = useVideoPlayer();
  const generate = useCanvasStore((state) => state.generate);
  const abandon = useCanvasStore((state) => state.abandon);
  const updateNodeData = useCanvasStore((state) => state.updateNodeData);
  const promptReady = useCanvasStore(selectGenerationPromptReady(id));
  const locked = useCanvasStore(selectIsNodeLocked(id));
  const [submitting, setSubmitting] = useState(false);

  if (data.kind !== 'generation') return null;

  const { parameters, task } = data;
  const running = task ? isActiveTaskStatus(task.status) : false;
  const busy = running || submitting;

  function updateParameters(patch: Partial<GenerationParameters>) {
    updateNodeData(id, { parameters: { ...parameters, ...patch } });
  }

  async function handleGenerate() {
    setSubmitting(true);
    try {
      await generate(id);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleAbandon() {
    try {
      await abandon(id);
    } catch {
      // 已由页面统一提示
    }
  }

  const statusText = task ? (task.status === WANXIANG_TASK_STATUS.PENDING ? '排队中' : task.status === WANXIANG_TASK_STATUS.RUNNING ? '生成中' : task.status) : '待生成';
  const videoUrl = task?.status === WANXIANG_TASK_STATUS.SUCCEEDED ? task.videoUrl : null;

  return (
    <div className="flex items-start gap-3">
      <NodeShell id={id} title="视频生成">
        <Handle type="target" position={Position.Left} id={GENERATION_INPUT_HANDLE} />
        <div className="flex w-120 flex-col gap-2">
          <ParameterField label="提示词">
            <Textarea
              value={parameters.prompt}
              placeholder="输入画面提示词…"
              disabled={locked}
              className="nodrag min-h-20 resize-y"
              onChange={(event) => updateParameters({ prompt: event.target.value })}
            />
          </ParameterField>

          <div className="grid grid-cols-2 gap-2">
            <ParameterField label="模型">
              <Select items={GENERATION_MODEL_OPTIONS} value={parameters.model} disabled={locked} onValueChange={(value) => value && updateParameters({ model: value })}>
                <SelectTrigger className="w-full nodrag" aria-label="模型">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {GENERATION_MODEL_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </ParameterField>
            <ParameterField label="分辨率">
              <Select
                items={GENERATION_RESOLUTION_OPTIONS}
                value={parameters.resolution}
                disabled={locked}
                onValueChange={(value) => value && updateParameters({ resolution: value })}
              >
                <SelectTrigger className="w-full nodrag" aria-label="分辨率">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {GENERATION_RESOLUTION_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </ParameterField>
            <ParameterField label="画幅">
              <Select items={GENERATION_RATIO_OPTIONS} value={parameters.ratio} disabled={locked} onValueChange={(value) => value && updateParameters({ ratio: value })}>
                <SelectTrigger className="w-full nodrag" aria-label="画幅">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {GENERATION_RATIO_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </ParameterField>
            <ParameterField label="时长">
              <Select
                items={GENERATION_DURATION_OPTIONS}
                value={String(parameters.duration)}
                disabled={locked}
                onValueChange={(value) => value && updateParameters({ duration: Number(value) })}
              >
                <SelectTrigger className="w-full nodrag" aria-label="时长">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {GENERATION_DURATION_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </ParameterField>
          </div>

          <div className="flex items-end gap-2">
            <ParameterField label="Seed（可选）">
              <Input
                type="number"
                min={0}
                max={2147483647}
                value={parameters.seed ?? ''}
                placeholder="随机"
                className="h-8 w-full nodrag"
                disabled={locked}
                onChange={(event) => {
                  const raw = event.target.value;
                  if (raw === '') {
                    updateParameters({ seed: undefined });
                    return;
                  }
                  const parsed = Number(raw);
                  if (Number.isInteger(parsed) && parsed >= 0 && parsed <= 2147483647) {
                    updateParameters({ seed: parsed });
                  }
                }}
              />
            </ParameterField>
            <div className="flex flex-col gap-1">
              <Label className="text-xs text-muted-foreground">音频</Label>
              <Switch className="nodrag" disabled={locked} checked={parameters.audio} onCheckedChange={(checked) => updateParameters({ audio: checked })} aria-label="音频" />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            {!promptReady ? <p className="text-xs text-muted-foreground">请填写提示词</p> : null}
            {task && task.status === WANXIANG_TASK_STATUS.FAILED ? <p className="text-xs text-destructive">{task.reason || '生成失败'}</p> : null}
            {task && task.status === WANXIANG_TASK_STATUS.CANCELED ? <p className="text-xs text-muted-foreground">{task.reason || '已放弃'}</p> : null}

            <div className="flex items-center gap-2">
              <Button type="button" size="sm" className="flex-1 nodrag" disabled={!promptReady || busy} onClick={() => void handleGenerate()}>
                {busy ? <LoaderCircle className="animate-spin" /> : <Play />}
                {busy ? statusText : task ? '重新生成' : '生成视频'}
              </Button>
              {running ? (
                <Button type="button" size="sm" variant="outline" className="nodrag" disabled={submitting} onClick={() => void handleAbandon()}>
                  放弃
                </Button>
              ) : null}
            </div>
          </div>
        </div>
      </NodeShell>

      {/* 独立于配置卡片的视频预览面板：固定基准宽度，高度随所选画幅变化；无视频时展示等待占位 */}
  
        <div
          className="nodrag relative overflow-hidden rounded-md border border-border bg-muted/40"
          style={{ width: PREVIEW_WIDTH, height: RATIO_PREVIEW_HEIGHTS[parameters.ratio] ?? PREVIEW_WIDTH }}
        >
          {videoUrl ? (
            <button type="button" title="点击播放" className="group relative block size-full" onClick={() => playVideo(videoUrl)}>
              {/* biome-ignore lint/a11y/useMediaCaption: AI 生成视频无字幕资源，节点内仅做封面预览 */}
              <video src={videoUrl} preload="metadata" className="size-full bg-black/5 object-contain" />
              <span className="absolute inset-0 flex items-center justify-center bg-black/30 transition-colors group-hover:bg-black/20">
                <CirclePlay className="size-8 text-white" />
              </span>
            </button>
          ) : (
            <div className="flex size-full flex-col items-center justify-center gap-1 text-muted-foreground">
              <Video className="size-5" />
              <span className="text-xs">{statusText}</span>
            </div>
          )}
        </div>
    </div>
  );
}
