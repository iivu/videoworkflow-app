import { Button, Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, Input } from '@r/ui';
import { LoaderCircle } from 'lucide-react';

type WorkspaceNameDialogProps = {
  open: boolean;
  mode: 'create' | 'rename';
  name: string;
  submitting: boolean;
  onNameChange(value: string): void;
  onClose(): void;
  onSubmit(): void;
};

export function WorkspaceNameDialog({ open, mode, name, submitting, onNameChange, onClose, onSubmit }: WorkspaceNameDialogProps) {
  const isRename = mode === 'rename';
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
    >
      <DialogContent className="max-w-sm!">
        <DialogHeader>
          <DialogTitle>{isRename ? '重命名创作空间' : '新建创作空间'}</DialogTitle>
        </DialogHeader>
        <form
          id="workspace-name-form"
          onSubmit={(event) => {
            event.preventDefault();
            onSubmit();
          }}
        >
          <Input autoFocus value={name} placeholder="输入空间名称" maxLength={60} onChange={(event) => onNameChange(event.target.value)} />
        </form>
        <DialogFooter>
          <Button type="button" variant="outline" disabled={submitting} onClick={onClose}>
            取消
          </Button>
          <Button type="submit" form="workspace-name-form" disabled={submitting || name.trim().length === 0}>
            {submitting ? <LoaderCircle className="animate-spin" /> : null}
            确定
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
