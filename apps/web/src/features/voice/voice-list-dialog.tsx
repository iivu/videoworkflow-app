import {
  Badge,
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Skeleton,
  Tabs,
  TabsList,
  TabsTrigger,
} from '@r/ui';
import { useQuery } from '@tanstack/react-query';
import type { Route } from '@tuyau/core/types';
import dayjs from 'dayjs';
import { Pause, Play } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { providerOptions } from '#/features/voice/voice-cloning-dialog/constants';
import { normalizeApiFailedMessage, query } from '#/services/api';

const PAGE_SIZE = 20;

type VoiceSource = 'user' | 'system';
type VoiceProvider = 'bailian' | 'minimaxi';
type VoiceItem = Route.Response<'voices.list'>['data']['list'][number];

const sourceTabs: Array<{ label: string; value: VoiceSource }> = [
  { label: '我的音色', value: 'user' },
  { label: '系统音色', value: 'system' },
];
// 目前只有minimaxti提供系统音色
const availableSystemProviderOptions = providerOptions.filter((option) => ['minimaxi'].includes(option.value));

function providerLabel(provider: string) {
  return providerOptions.find((option) => option.value === provider)?.label ?? provider;
}

export function VoiceListDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const [source, setSource] = useState<VoiceSource>('user');
  const [provider, setProvider] = useState<VoiceProvider>(() => availableSystemProviderOptions[0].value);
  const [page, setPage] = useState(1);
  const [playingUrl, setPlayingUrl] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  const { data, isLoading, error } = useQuery(
    query.voices.list.queryOptions({ query: source === 'system' ? { source, provider, page, size: PAGE_SIZE } : { source, page, size: PAGE_SIZE } }, { enabled: open }),
  );
  const voices = data?.data.list ?? [];

  function stopPlaying() {
    audioRef.current?.pause();
    setPlayingUrl(null);
  }

  function togglePlay(url: string) {
    const audio = audioRef.current;
    if (!audio) return;
    if (playingUrl === url) {
      stopPlaying();
      return;
    }
    audio.src = url;
    void audio.play();
    setPlayingUrl(url);
  }

  function changeSource(next: VoiceSource) {
    stopPlaying();
    setSource(next);
    setPage(1);
  }

  function changeProvider(next: VoiceProvider) {
    stopPlaying();
    setProvider(next);
    setPage(1);
  }

  useEffect(() => {
    if (!open) stopPlaying();
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100dvh-4rem)] max-w-4xl! grid-rows-[auto_auto_minmax(0,1fr)_auto]">
        <DialogHeader className="pr-8">
          <DialogTitle>音色列表</DialogTitle>
        </DialogHeader>
        <Tabs value={source} onValueChange={(value) => changeSource(value === 'system' ? 'system' : 'user')}>
          <div className="flex items-center gap-2">
            <TabsList variant="line" aria-label="音色来源">
              {sourceTabs.map((tab) => (
                <TabsTrigger key={tab.value} value={tab.value}>
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>
            {source === 'system' ? (
              <Select items={availableSystemProviderOptions} value={provider} onValueChange={(value) => changeProvider(value === 'minimaxi' ? 'minimaxi' : 'bailian')}>
                <SelectTrigger size="sm" className="ml-auto" aria-label="服务商">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {availableSystemProviderOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            ) : null}
          </div>
        </Tabs>
        <div className="min-h-0 overflow-y-auto">
          {isLoading ? (
            <div className="flex flex-col gap-3 py-2">
              {Array.from({ length: 5 }).map((_, index) => (
                <Skeleton key={index} className="h-12 w-full" />
              ))}
            </div>
          ) : error ? (
            <p className="py-12 text-center text-sm text-muted-foreground">{normalizeApiFailedMessage(error) || '加载失败'}</p>
          ) : voices.length === 0 ? (
            <p className="py-12 text-center text-sm text-muted-foreground">暂无音色</p>
          ) : (
            <ul>
              {voices.map((voice) => (
                <VoiceRow key={voice.voiceId} voice={voice} source={source} playing={playingUrl !== null && playingUrl === voice.demoUrl} onPlay={togglePlay} />
              ))}
            </ul>
          )}
        </div>
        {/* biome-ignore lint/a11y/useMediaCaption: Remote demo audios do not include a separate caption track. */}
        <audio ref={audioRef} className="hidden" onEnded={() => setPlayingUrl(null)} />
      </DialogContent>
    </Dialog>
  );
}

function VoiceRow({ voice, source, playing, onPlay }: { voice: VoiceItem; source: VoiceSource; playing: boolean; onPlay: (url: string) => void }) {
  const demoUrl = voice.demoUrl;
  const subtitle = [providerLabel(voice.provider), voice.model, voice.createdAt ? dayjs(voice.createdAt).format('YYYY-MM-DD') : ''].filter(Boolean).join(' · ');
  return (
    <li className="flex items-center gap-3 border-b py-3 last:border-b-0">
      {demoUrl ? (
        <Button type="button" size="icon-sm" variant="ghost" className="shrink-0 rounded-full" aria-label={playing ? '暂停' : '试听'} onClick={() => onPlay(demoUrl)}>
          {playing ? <Pause /> : <Play />}
        </Button>
      ) : null}
      <div className="min-w-0 flex-1">
        <div className="truncate font-medium">{voice.name}</div>
        <div className="truncate text-muted-foreground">{voice.description}</div>
        <div className="truncate text-xs text-muted-foreground">{subtitle}</div>
      </div>
      <Badge variant="secondary">{source === 'user' ? '克隆' : '公共'}</Badge>
    </li>
  );
}
