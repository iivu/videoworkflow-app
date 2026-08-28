import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@r/ui';
import type { FC, PropsWithChildren } from 'react';
import { createContext, useCallback, useContext, useMemo, useState } from 'react';

type VideoPlayerState = {
  url: string;
  title?: string;
};

type VideoPlayerContextValue = {
  /** 打开全局视频播放弹窗 */
  playVideo: (url: string, options?: { title?: string }) => void;
};

const VideoPlayerContext = createContext<VideoPlayerContextValue | null>(null);

export const VideoPlayerProvider: FC<PropsWithChildren> = ({ children }) => {
  const [state, setState] = useState<VideoPlayerState | null>(null);
  const isServer = typeof window === 'undefined';

  const playVideo = useCallback<VideoPlayerContextValue['playVideo']>((url, options) => {
    setState({ url, title: options?.title });
  }, []);

  const handleOpenChange = useCallback((next: boolean) => {
    if (!next) setState(null);
  }, []);

  const value = useMemo<VideoPlayerContextValue>(() => ({ playVideo }), [playVideo]);

  return (
    <VideoPlayerContext.Provider value={value}>
      {children}
      {isServer || !state ? null : (
        <Dialog open onOpenChange={handleOpenChange}>
          <DialogContent className="max-w-2xl! max-h-[85vh]">
            <DialogHeader>
              <DialogTitle>{state.title ?? '视频预览'}</DialogTitle>
            </DialogHeader>
            {/* key 变化时重新挂载以触发自动播放（如弹窗内切换视频） */}
            {/* biome-ignore lint/a11y/useMediaCaption: AI 生成视频无字幕资源，弹窗仅做播放 */}
            <video key={state.url} src={state.url} controls autoPlay playsInline className="max-h-[70vh] w-full rounded-md bg-black/5 object-contain" />
          </DialogContent>
        </Dialog>
      )}
    </VideoPlayerContext.Provider>
  );
};

export function useVideoPlayer() {
  const ctx = useContext(VideoPlayerContext);
  if (!ctx) {
    throw new Error('useVideoPlayer must be used within a VideoPlayerProvider');
  }
  return ctx;
}
