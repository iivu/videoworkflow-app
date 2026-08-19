import { Button, Textarea } from '@r/ui';
import { Eraser, LoaderCircle, Sparkles, SpellCheck } from 'lucide-react';
import { MAX_TEXT_LENGTH } from './constants';
import type { BusyAction } from './types';

type EditorCardProps = {
  text: string;
  busy: BusyAction;
  onTextChange: (text: string) => void;
  onPolish: () => void;
  onFixTypos: () => void;
  onGenerate: () => void;
};

export function EditorCard({ text, busy, onTextChange, onPolish, onFixTypos, onGenerate }: EditorCardProps) {
  const canSubmit = text.trim().length > 0 && busy === null;

  return (
    <div className="flex min-h-0 flex-1 flex-col rounded-xl border bg-card shadow-xs">
      <Textarea
        value={text}
        maxLength={MAX_TEXT_LENGTH}
        placeholder="输入想要生成音频的文案…"
        aria-label="文案内容"
        className="min-h-0 flex-1 resize-none border-none bg-transparent p-4 text-base leading-relaxed focus-visible:border-transparent focus-visible:ring-0 dark:bg-transparent"
        onChange={(event) => onTextChange(event.target.value)}
      />

      <div className="flex items-center gap-2 rounded-b-xl border-t bg-muted/40 px-4 py-3">
        {/* <Button variant="outline" size="sm" className="rounded-full bg-background" onClick={onPolish}>
          <Sparkles />
          AI 润色
        </Button>
        <Button variant="outline" size="sm" className="rounded-full bg-background" onClick={onFixTypos}>
          <SpellCheck />
          修正错别字
        </Button> */}
        <span className="ml-auto text-xs tabular-nums text-muted-foreground">
          {text.length.toLocaleString()} / {MAX_TEXT_LENGTH.toLocaleString()} 字符
        </span>
        <Button variant="ghost" size="icon-sm" aria-label="清空文案" title="清空文案" disabled={text.length === 0 || busy !== null} onClick={() => onTextChange('')}>
          <Eraser />
        </Button>
        <Button
          size="sm"
          className="rounded-full bg-linear-to-r from-violet-500 to-purple-500 px-4 text-white hover:from-violet-500/90 hover:to-purple-500/90"
          disabled={!canSubmit}
          onClick={onGenerate}
        >
          {busy === 'generate' ? <LoaderCircle className="animate-spin" /> : <Sparkles />}
          {busy === 'generate' ? '生成中…' : '生成音频'}
        </Button>
      </div>
    </div>
  );
}
