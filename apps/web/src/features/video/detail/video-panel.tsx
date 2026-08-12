import { Video } from 'lucide-react';

import { VideoActionsMenuTrigger } from '../components/video-actions-menu';
import type { VideoData } from '../components/video-edit-dialog';
import { PanelHeader } from './components';

export function VideoPanel({ video, onEdit }: { video: VideoData; onEdit: () => void }) {
  return (
    <section className="flex min-h-100 shrink-0 flex-col border-b bg-background xl:min-h-0 xl:border-b-0 xl:border-r" aria-labelledby="video-panel-title">
      <PanelHeader id="video-panel-title" icon={<Video />} title="视频" />
      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4">
        <div className="group relative flex min-h-0 flex-1 items-center justify-center overflow-hidden bg-black">
          <video className="h-full max-h-full w-full object-contain" src={video.fileUrl} controls playsInline preload="metadata">
            <track kind="captions" />
          </video>
          <VideoActionsMenuTrigger videoUrl={video.fileUrl} onEdit={onEdit} className="hover:bg-white/20" />
        </div>
        <div className="min-w-0 shrink-0">
          <h1 className="truncate-2 max-h-12 wrap-break-word text-base font-semibold leading-6" title={video.title}>
            {video.title}
          </h1>
          <p className="mt-1 wrap-break-word text-sm text-muted-foreground">@{video.author}</p>
        </div>
      </div>
    </section>
  );
}
