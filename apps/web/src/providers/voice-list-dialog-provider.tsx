import type { FC, PropsWithChildren } from 'react';
import { createContext, useContext, useMemo, useState } from 'react';
import { VoiceListDialog } from '#/features/voice/voice-list-dialog';

type VoiceListDialogContextValue = {
  openVoiceList: () => void;
};

const VoiceListDialogContext = createContext<VoiceListDialogContextValue | null>(null);

export const VoiceListDialogProvider: FC<PropsWithChildren> = ({ children }) => {
  const [open, setOpen] = useState(false);
  const isServer = typeof window === 'undefined';

  const value = useMemo<VoiceListDialogContextValue>(() => ({ openVoiceList: () => setOpen(true) }), []);

  return (
    <VoiceListDialogContext.Provider value={value}>
      {children}
      {isServer ? null : <VoiceListDialog open={open} onOpenChange={setOpen} />}
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
