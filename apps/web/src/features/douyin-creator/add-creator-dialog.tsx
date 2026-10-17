import { Alert, AlertDescription, Button, Dialog, DialogContent, DialogHeader, DialogTitle, Input, Label } from '@r/ui';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { LoaderCircle } from 'lucide-react';
import { useState } from 'react';
import { normalizeApiFailedMessage, query } from '#/services/api';

export function AddCreatorDialog({ open, onOpenChange, onSubmitted }: { open: boolean; onOpenChange: (open: boolean) => void; onSubmitted: () => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>抖音账号新增</DialogTitle>
        </DialogHeader>
        <AddCreatorForm
          onCancel={() => onOpenChange(false)}
          onSubmitted={() => {
            onOpenChange(false);
            onSubmitted();
          }}
        />
      </DialogContent>
    </Dialog>
  );
}

function AddCreatorForm({ onCancel, onSubmitted }: { onCancel: () => void; onSubmitted: () => void }) {
  const [source, setSource] = useState('');
  const queryClient = useQueryClient();
  const mutation = useMutation({
    ...query.douyinCreators.create.mutationOptions(),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: query.douyinCreators.list.queryKey() });
      onSubmitted();
    },
    onError: () => {
      void queryClient.invalidateQueries({ queryKey: query.douyinCreators.list.queryKey() });
    },
  });
  return (
    <form
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        if (mutation.isPending) return;
        mutation.mutate({ body: { source: source.trim() } });
      }}
    >
      <div className="space-y-2">
        <Label htmlFor="creator-source">博主主页链接或 sec_uid</Label>
        <Input
          id="creator-source"
          value={source}
          onChange={(event) => setSource(event.target.value)}
          placeholder="https://www.douyin.com/user/MS4wLj…"
          required
          maxLength={255}
          disabled={mutation.isPending}
        />
        <p className="text-xs text-muted-foreground">支持抖音主页 URL、分享短链接和 sec_uid。提交后后台抓取资料，重复添加将刷新已有博主。</p>
      </div>
      {mutation.error ? (
        <Alert variant="destructive">
          <AlertDescription>{normalizeApiFailedMessage(mutation.error) || '提交失败，请重试'}</AlertDescription>
        </Alert>
      ) : null}
      <p className="text-xs leading-5 text-destructive">采集博主资料将产生费用，请确认后提交。</p>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel} disabled={mutation.isPending}>
          取消
        </Button>
        <Button type="submit" disabled={mutation.isPending || !source.trim()}>
          {mutation.isPending ? <LoaderCircle className="animate-spin" /> : null}添加博主
        </Button>
      </div>
    </form>
  );
}
