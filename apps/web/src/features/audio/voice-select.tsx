import { Button } from '@r/ui';
import { ChevronDown } from 'lucide-react';
import { useState } from 'react';
import { useVoiceListDialog } from '#/providers/voice-list-dialog-provider';
import type { VoiceItem } from './types';

type VoiceSelectProps = {
  voice: VoiceItem | null;
  onChange: (voice: VoiceItem) => void;
};

/** 音色选择按钮：打开音色列表弹窗（选择模式），选中后回传完整音色记录 */
export function VoiceSelect({ voice, onChange }: VoiceSelectProps) {
  const { selectVoice } = useVoiceListDialog();
  const [pending, setPending] = useState(false);

  async function handleClick() {
    if (pending) return;
    setPending(true);
    try {
      const selected = await selectVoice();
      if (selected) onChange(selected);
    } finally {
      setPending(false);
    }
  }

  return (
    <Button type="button" variant="outline" aria-label="音色" disabled={pending} onClick={handleClick} className="w-56 justify-start font-normal">
      <span className="shrink-0 text-muted-foreground">音色</span>
      <span className="h-4 w-px shrink-0 bg-border" />
      <span className={`line-clamp-1 ${voice ? '' : 'text-muted-foreground'}`}>{voice?.name ?? '选择音色'}</span>
      <ChevronDown className="ml-auto size-4 shrink-0 text-muted-foreground" />
    </Button>
  );
}
