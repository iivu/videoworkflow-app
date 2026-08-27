import { Button, Textarea } from '@r/ui';
import { Eraser, LoaderCircle, Sparkles } from 'lucide-react';
import { MAX_TEXT_LENGTH } from './constants';
import { ModelSelect } from './model-select';
import type { AudioProvider, BusyAction, VoiceItem } from './types';
import { VoiceSelect } from './voice-select';

type EditorCardProps = {
  text: string;
  busy: BusyAction;
  /** 由父组件计算的完整提交条件（文案 + 音色 + 模型 + 非忙碌），保证生成按钮禁用状态如实 */
  canSubmit: boolean;
  voice: VoiceItem | null;
  provider: AudioProvider | null;
  voiceModel: string | null;
  model: string;
  onTextChange: (text: string) => void;
  onVoiceChange: (voice: VoiceItem) => void;
  onModelChange: (model: string) => void;
  onGenerate: () => void;
};

export function EditorCard({ text, busy, canSubmit, voice, provider, voiceModel, model, onTextChange, onVoiceChange, onModelChange, onGenerate }: EditorCardProps) {
  const selectorsDisabled = busy !== null;

  return (
    <div className="flex min-h-0 flex-1 flex-col rounded-xl border bg-card shadow-xs">
      {/* 音色 / 模型工具栏 */}
      <div className="flex shrink-0 flex-wrap items-center gap-2 border-b px-4 py-3">
        <VoiceSelect voice={voice} onChange={onVoiceChange} disabled={selectorsDisabled} />
        <ModelSelect provider={provider} voiceModel={voiceModel} value={model} onChange={onModelChange} disabled={selectorsDisabled} />
      </div>

      <Textarea
        value={text}
        maxLength={MAX_TEXT_LENGTH}
        placeholder="输入想要生成音频的文案…"
        aria-label="文案内容"
        className="min-h-0 flex-1 resize-none border-none bg-transparent p-4 text-base leading-relaxed focus-visible:border-transparent focus-visible:ring-0 dark:bg-transparent"
        onChange={(event) => onTextChange(event.target.value)}
      />

      <div className="flex items-center gap-2 rounded-b-xl border-t bg-muted/40 px-4 py-3">
        <span className="ml-auto text-xs tabular-nums text-muted-foreground">
          {text.length.toLocaleString()} / {MAX_TEXT_LENGTH.toLocaleString()} 字符
        </span>
        <Button variant="ghost" size="icon-sm" aria-label="清空文案" title="清空文案" disabled={text.length === 0 || busy !== null} onClick={() => onTextChange('')}>
          <Eraser />
        </Button>
        <Button disabled={!canSubmit} onClick={onGenerate}>
          {busy === 'generate' ? <LoaderCircle className="animate-spin" /> : <Sparkles />}
          {busy === 'generate' ? '生成中…' : '生成音频'}
        </Button>
      </div>
    </div>
  );
}
