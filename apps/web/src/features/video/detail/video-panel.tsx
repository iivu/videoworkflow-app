import { VideoActionsMenuTrigger } from '../components/video-actions-menu';
import type { VideoData } from '../components/video-edit-dialog';

export function VideoPanel({ video, onEdit }: { video: VideoData; onEdit: () => void }) {
  return (
    <section className="flex min-h-100 shrink-0 flex-col border-b bg-background xl:min-h-0 xl:border-b-0 xl:border-r" aria-label="视频播放器">
      <div className="group relative flex min-h-0 flex-1 items-center justify-center overflow-hidden bg-black">
        <video className="h-full max-h-full w-full object-contain" src={video.fileUrl} controls playsInline preload="metadata">
          <track kind="captions" />
        </video>
        <VideoActionsMenuTrigger videoUrl={video.fileUrl} onEdit={onEdit} className="hover:bg-white/20" />
      </div>
    </section>
  );
}
