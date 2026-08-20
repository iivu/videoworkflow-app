import { Button } from '@r/ui';
import { AudioLines, Download, FastForward, Pause, Play, Rewind, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { formatDuration, parseAudioConfigs } from './constants';
import type { CreativeAudioItem } from './types';

type PlayerBarProps = {
  item: CreativeAudioItem;
  onClose: () => void;
};

export function PlayerBar({ item, onClose }: PlayerBarProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.src = item.audioUrl;
    setCurrentTime(0);
    setDuration(0);
    audio.play().then(
      () => setPlaying(true),
      () => setPlaying(false),
    );
  }, [item.id, item.audioUrl]);

  function togglePlay() {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) {
      audio.pause();
      setPlaying(false);
    } else {
      audio.play().then(
        () => setPlaying(true),
        () => setPlaying(false),
      );
    }
  }

  function skip(offset: number) {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = Math.min(Math.max(audio.currentTime + offset, 0), audio.duration || 0);
  }

  function seek(event: React.MouseEvent<HTMLDivElement>) {
    const audio = audioRef.current;
    const bar = progressRef.current;
    if (!audio || !bar || !audio.duration) return;
    const rect = bar.getBoundingClientRect();
    const ratio = Math.min(Math.max((event.clientX - rect.left) / rect.width, 0), 1);
    audio.currentTime = ratio * audio.duration;
    setCurrentTime(audio.currentTime);
  }

  function handleProgressKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'ArrowRight') skip(5);
    if (event.key === 'ArrowLeft') skip(-5);
  }

  const configs = parseAudioConfigs(item.configs);
  const format = typeof configs.format === 'string' ? configs.format : 'mp3';
  const title = `${item.model}-${item.id}`;
  const progress = duration > 0 ? Math.min(currentTime / duration, 1) : 0;

  return (
    <div className="flex h-16 shrink-0 items-center gap-3 border-t bg-background px-4">
      <div className="grid size-10 shrink-0 place-items-center rounded-md bg-secondary text-foreground">
        <AudioLines className="size-5" />
      </div>
      <div className="w-52 shrink-0">
        <div className="truncate text-sm font-medium">{item.model}</div>
        <div className="truncate text-xs text-muted-foreground">{item.text}</div>
      </div>

      <div className="flex shrink-0 items-center gap-1">
        <Button type="button" size="icon-sm" variant="ghost" aria-label="后退 10 秒" title="后退 10 秒" onClick={() => skip(-10)}>
          <Rewind />
        </Button>
        <Button type="button" size="icon" variant="default" className="rounded-full" aria-label={playing ? '暂停' : '播放'} onClick={togglePlay}>
          {playing ? <Pause /> : <Play />}
        </Button>
        <Button type="button" size="icon-sm" variant="ghost" aria-label="前进 10 秒" title="前进 10 秒" onClick={() => skip(10)}>
          <FastForward />
        </Button>
      </div>

      <span className="w-10 shrink-0 text-right text-xs tabular-nums text-muted-foreground">{formatDuration(currentTime)}</span>
      <div
        ref={progressRef}
        role="slider"
        aria-label="播放进度"
        aria-valuemin={0}
        aria-valuemax={Math.round(duration)}
        aria-valuenow={Math.round(currentTime)}
        tabIndex={0}
        className="relative h-1.5 min-w-0 flex-1 cursor-pointer rounded-full bg-muted"
        onClick={seek}
        onKeyDown={handleProgressKeyDown}
      >
        <div className="absolute inset-y-0 left-0 rounded-full bg-primary" style={{ width: `${progress * 100}%` }} />
      </div>
      <span className="w-10 shrink-0 text-xs tabular-nums text-muted-foreground">{formatDuration(duration)}</span>

      <Button type="button" size="icon-sm" variant="ghost" aria-label="下载音频" title="下载音频" render={<a href={item.audioUrl} download={`${title}.${format}`} />}>
        <Download />
      </Button>
      <Button type="button" size="icon-sm" variant="ghost" aria-label="关闭播放器" onClick={onClose}>
        <X />
      </Button>

      {/* biome-ignore lint/a11y/useMediaCaption: 生成的语音音频没有字幕轨道。 */}
      <audio
        ref={audioRef}
        className="hidden"
        onLoadedMetadata={(e) => setDuration(e.currentTarget.duration || 0)}
        onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
        onEnded={() => setPlaying(false)}
      />
    </div>
  );
}
