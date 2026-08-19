import type { Video } from '../type';
import { VideoItem } from './video-item';

export function VideoList({ videos, onEdit }: { videos: Array<Video>; onEdit: (video: Video) => void }) {
  return (
    <div className="grid w-full grid-cols-2 gap-4 px-4 pb-4 pt-16 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
      {videos.map((video) => (
        <VideoItem key={video.id} video={video} onEdit={() => onEdit(video)} />
      ))}
    </div>
  );
}
