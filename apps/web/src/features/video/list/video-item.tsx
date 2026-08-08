import { Link } from '@tanstack/react-router';
import dayjs from 'dayjs';
import { Bookmark, Heart, MessageCircle, Share2 } from 'lucide-react';
import { useRef } from 'react';

import { VideoActionsMenuTrigger } from '../components/video-actions-menu';
import type { Video } from '../type';

function formatCount(count: number): string {
  if (count >= 10000) {
    return `${(count / 10000).toFixed(1).replace(/\.0$/, '')}w`;
  }
  return count.toString();
}

export function VideoItem({ video, onEdit }: { video: Video; onEdit: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  return (
    <Link
      className="group relative block cursor-pointer overflow-hidden rounded-sm shadow-sm"
      to="/videos/$id"
      params={{ id: `${video.id}` }}
      onMouseEnter={() => videoRef.current?.play()}
      onMouseLeave={() => videoRef.current?.pause()}
    >
      <div className="relative aspect-3/4 bg-gray-100">
        <video className="h-full w-full object-cover" preload="metadata" ref={videoRef} muted>
          <source src={video.fileUrl} type="video/mp4" />
        </video>
        <VideoActionsMenuTrigger videoUrl={video.fileUrl} onEdit={onEdit} />
        <Data video={video} />
      </div>
      <div className="px-3 py-2 text-sm">
        <div className="truncate-2 h-12 break-all text-justify leading-6 truncate-2">{video.title}</div>
        <div className="mb-1 mt-2 flex justify-between text-muted-foreground truncate">@{video.author}</div>
        <div className="flex justify-between text-xs text-muted-foreground">发布日期：{dayjs(video.publishAt).format('YYYY-MM-DD')}</div>
      </div>
    </Link>
  );
}

function Data({ video }: { video: Video }) {
  return (
    <div className="absolute bottom-2 left-2 flex items-center gap-2 text-center text-white">
      <div className="flex flex-col items-center">
        <Heart className="size-5" />
        <span className="mt-0.5 text-xs drop-shadow-md">{formatCount(video.likeCount || 0)}</span>
      </div>
      <div className="flex flex-col items-center">
        <Share2 className="size-5" />
        <span className="mt-0.5 text-xs drop-shadow-md">{formatCount(video.shareCount || 0)}</span>
      </div>
      <div className="flex flex-col items-center">
        <Bookmark className="size-5" />
        <span className="mt-0.5 text-xs drop-shadow-md">{formatCount(video.favoriteCount || 0)}</span>
      </div>
      <div className="flex flex-col items-center">
        <MessageCircle className="size-5" />
        <span className="mt-0.5 text-xs drop-shadow-md">{formatCount(video.commentCount || 0)}</span>
      </div>
    </div>
  );
}
