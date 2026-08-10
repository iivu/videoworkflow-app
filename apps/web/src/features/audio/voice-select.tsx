import { Badge, Popover, PopoverContent, PopoverTrigger } from '@r/ui';
import { Check, ChevronDown } from 'lucide-react';
import { useState } from 'react';
import { MOCK_VOICES } from './mock';

type VoiceSelectProps = {
  value: string;
  onChange: (voiceId: string) => void;
};

/** 与模型 Select 同款样式的音色选择器，但使用 Popover 面板承载更丰富的音色信息 */
export function VoiceSelect({ value, onChange }: VoiceSelectProps) {
  const [open, setOpen] = useState(false);
  const selectedVoice = MOCK_VOICES.find((voice) => voice.id === value) ?? MOCK_VOICES[0];

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        aria-label="音色"
        className="flex h-8 w-56 items-center gap-1.5 rounded-lg border border-input bg-transparent py-2 pr-2 pl-2.5 text-sm whitespace-nowrap transition-colors outline-none select-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30 dark:hover:bg-input/50"
      >
        <span className="shrink-0 text-muted-foreground">音色</span>
        <span className="h-4 w-px shrink-0 bg-border" />
        <span className="line-clamp-1">{selectedVoice.name}</span>
        <ChevronDown className="ml-auto size-4 shrink-0 text-muted-foreground" />
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 gap-1 p-1.5">
        <ul className="flex max-h-80 flex-col gap-1 overflow-y-auto">
          {MOCK_VOICES.map((voice) => {
            const selected = voice.id === value;
            return (
              <li key={voice.id}>
                <button
                  type="button"
                  aria-pressed={selected}
                  onClick={() => {
                    onChange(voice.id);
                    setOpen(false);
                  }}
                  className={`w-full rounded-md p-2.5 text-left transition-colors hover:bg-accent ${selected ? 'bg-accent' : ''}`}
                >
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{voice.name}</span>
                    {voice.tags.map((tag) => (
                      <Badge key={tag} variant="secondary">
                        {tag}
                      </Badge>
                    ))}
                    {selected ? <Check className="ml-auto size-4 shrink-0 text-primary" /> : null}
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">{voice.description}</p>
                </button>
              </li>
            );
          })}
        </ul>
      </PopoverContent>
    </Popover>
  );
}
