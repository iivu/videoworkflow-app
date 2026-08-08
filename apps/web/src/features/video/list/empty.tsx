import { Button } from '@r/ui';
import { useNavigate } from '@tanstack/react-router';
import { VideoOff } from 'lucide-react';

export function Empty() {
  const navigate = useNavigate();
  return (
    <div className="h-(--content-min-height) flex-center flex-col gap-2 text-gray-400">
      <VideoOff className="size-12 text-gray-400" />
      <p>暂无视频</p>
      <Button onClick={() => navigate({ to: '/videos/create' })}>创建视频</Button>
    </div>
  );
}
