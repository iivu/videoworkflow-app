import type { FC, PropsWithChildren } from 'react';
import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { type VoiceItem, VoiceListDialog } from '#/features/voice/voice-list-dialog';

type VoiceListDialogContextValue = {
  openVoiceList: () => void;
  /** 以选择模式打开音色弹窗，用户选中后 resolve 音色，取消/关闭则 resolve null */
  selectVoice: () => Promise<VoiceItem | null>;
};

const VoiceListDialogContext = createContext<VoiceListDialogContextValue | null>(null);

export const VoiceListDialogProvider: FC<PropsWithChildren> = ({ children }) => {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<'browse' | 'select'>('browse');
  const resolverRef = useRef<((voice: VoiceItem | null) => void) | null>(null);
  const isServer = typeof window === 'undefined';

  const settle = useCallback((voice: VoiceItem | null) => {
    resolverRef.current?.(voice);
    resolverRef.current = null;
  }, []);

  const openVoiceList = useCallback(() => {
    settle(null);
    setMode('browse');
    setOpen(true);
  }, [settle]);

  const selectVoice = useCallback(() => {
    settle(null);
    setMode('select');
    setOpen(true);
    return new Promise<VoiceItem | null>((resolve) => {
      resolverRef.current = resolve;
    });
  }, [settle]);

  const handleOpenChange = useCallback(
    (next: boolean) => {
      setOpen(next);
      if (!next) settle(null);
    },
    [settle],
  );

  const handleSelect = useCallback(
    (voice: VoiceItem) => {
      settle(voice);
      setOpen(false);
    },
    [settle],
  );

  const value = useMemo<VoiceListDialogContextValue>(() => ({ openVoiceList, selectVoice }), [openVoiceList, selectVoice]);

  return (
    <VoiceListDialogContext.Provider value={value}>
      {children}
      {isServer ? null : <VoiceListDialog open={open} onOpenChange={handleOpenChange} mode={mode} onSelect={handleSelect} />}
    </VoiceListDialogContext.Provider>
  );
};

export function useVoiceListDialog() {
  const ctx = useContext(VoiceListDialogContext);
  if (!ctx) {
    throw new Error('useVoiceListDialog must be used within a VoiceListDialogProvider');
  }
  return ctx;
}
