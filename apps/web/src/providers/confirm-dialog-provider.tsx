import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, Button } from '@r/ui';
import type { FC, PropsWithChildren } from 'react';
import { createContext, useContext, useRef, useState } from 'react';

type Options = {
  title?: string;
  description?: string;
  open: boolean;
  cancelBtnText?: string;
  confirmBtnText?: string;
  danger?: boolean;
  warning?: boolean;
};
type ConfirmDialogContextType = {
  confirm: (options: Omit<Options, 'open'>) => Promise<boolean>;
  warning: (options: Omit<Options, 'open' | 'cancelBtnText' | 'danger' | 'warning'>) => Promise<void>;
};
type ConfirmDialogProps = Options & {
  onConfirm?: () => void;
  onCancel?: () => void;
};

export const ConfirmDialogContext = createContext<ConfirmDialogContextType | null>(null);

function ConfirmDialog(props: ConfirmDialogProps) {
  const { open, title = '提示', description, cancelBtnText = '取消', confirmBtnText = '确认', danger = false, warning = false, onConfirm, onCancel } = props;
  return (
    <AlertDialog open={open}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description || ''}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          {!warning ? <AlertDialogCancel onClick={onCancel}>{cancelBtnText}</AlertDialogCancel> : null}
          <Button variant={danger ? 'destructive' : 'default'} onClick={onConfirm}>
            {confirmBtnText}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export const ConfirmDialogProvider: FC<PropsWithChildren> = ({ children }) => {
  const [options, setOptions] = useState<Options>({ open: false });
  const promiseResolve = useRef<null | ((value: boolean) => void)>(null);
  const isServer = typeof window === 'undefined';

  const confirm: ConfirmDialogContextType['confirm'] = (opts) => {
    return new Promise<boolean>((resolve) => {
      setOptions({ ...opts, open: true });
      promiseResolve.current = resolve;
    });
  };

  const warning: ConfirmDialogContextType['warning'] = (opts) => {
    return new Promise<void>((resolve) => {
      setOptions({ ...opts, open: true, warning: true, confirmBtnText: opts.confirmBtnText ?? '知道了' });
      promiseResolve.current = () => resolve();
    });
  };

  const close = () => {
    setOptions((prev) => ({ ...prev, open: false }));
    promiseResolve.current = null;
  };

  const onConfirm = () => {
    promiseResolve.current?.(true);
    close();
  };

  const onCancel = () => {
    promiseResolve.current?.(false);
    close();
  };

  return (
    <ConfirmDialogContext.Provider value={{ confirm, warning }}>
      {children}
      {isServer ? null : <ConfirmDialog {...options} onConfirm={onConfirm} onCancel={onCancel} />}
    </ConfirmDialogContext.Provider>
  );
};

export function useConfirm() {
  const ctx = useContext(ConfirmDialogContext);
  if (!ctx) {
    throw new Error('useConfirm must be used within a ConfirmDialogProvider');
  }
  return ctx;
}
