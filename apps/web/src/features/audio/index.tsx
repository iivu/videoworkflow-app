import { Tabs, TabsContent, TabsList, TabsTrigger, toast } from '@r/ui';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { History, Settings2 } from 'lucide-react';
import { useState } from 'react';
import { normalizeApiFailedMessage, query } from '#/services/api';
import { ConfigPanel } from './config-panel';
import { type AudioModelValue, BAILIAN_DEFAULT_CONFIGS, MINIMAXI_DEFAULT_CONFIGS, providerOfModel } from './constants';
import { EditorCard } from './editor-card';
import { HistoryPanel } from './history-panel';
import { ModelSelect } from './model-select';
import { PlayerBar } from './player-bar';
import type { BailianAudioConfigs, BusyAction, CreativeAudioItem, MinimaxiAudioConfigs, VoiceItem } from './types';
import { VoiceSelect } from './voice-select';

const HISTORY_PAGE_SIZE = 20;

export function AudioCreatePage() {
  const queryClient = useQueryClient();
  const [text, setText] = useState('');
  const [selectedVoice, setSelectedVoice] = useState<VoiceItem | null>(null);
  const [model, setModel] = useState('');
  const [bailianConfigs, setBailianConfigs] = useState<BailianAudioConfigs>(BAILIAN_DEFAULT_CONFIGS);
  const [minimaxiConfigs, setMinimaxiConfigs] = useState<MinimaxiAudioConfigs>(MINIMAXI_DEFAULT_CONFIGS);
  const [page, setPage] = useState(1);
  const [current, setCurrent] = useState<CreativeAudioItem | null>(null);
  const [busy, setBusy] = useState<BusyAction>(null);

  const historyQuery = useQuery(query.creativeAudios.list.queryOptions({ query: { page, size: HISTORY_PAGE_SIZE } }));
  const createMutation = useMutation(query.creativeAudios.create.mutationOptions());

  const provider = selectedVoice ? providerOfModel(selectedVoice.model) : null;
  const canSubmit = text.trim().length > 0 && selectedVoice !== null && model !== '' && busy === null && !createMutation.isPending;

  function handleVoiceChange(voice: VoiceItem) {
    setSelectedVoice(voice);
    // 切换音色时模型默认重置为音色自身的模型
    setModel(voice.model);
  }

  function handlePolish() {
    // 暂不实现
  }

  function handleFixTypos() {
    // 暂不实现
  }

  function handleGenerate() {
    if (!canSubmit || !selectedVoice) return;
    const audioProvider = providerOfModel(model);
    setBusy('generate');
    createMutation.mutate(
      {
        body: {
          provider: audioProvider,
          model: model as AudioModelValue,
          text: text.trim(),
          voiceId: selectedVoice.voiceId,
          configs:
            audioProvider === 'bailian'
              ? { ...bailianConfigs, format: 'mp3' as const }
              : { ...minimaxiConfigs, format: 'mp3' as const },
        },
      },
      {
        onSuccess: (res) => {
          setBusy(null);
          setCurrent(res.data as CreativeAudioItem);
          setPage(1);
          void queryClient.invalidateQueries({ queryKey: query.creativeAudios.list.queryKey() });
          toast.add({ type: 'success', description: '音频已生成' });
        },
        onError: (error) => {
          setBusy(null);
          toast.add({ type: 'error', description: normalizeApiFailedMessage(error) || '生成失败' });
        },
      },
    );
  }

  function handleSelectHistory(item: CreativeAudioItem) {
    setText(item.text);
    setModel(item.model);
    // 尝试从音色查询缓存中找回音色对象，找不到则需用户重新选择
    const cached = queryClient.getQueriesData<{ data: { list: VoiceItem[] } }>({ queryKey: query.voices.list.queryKey() });
    const voice = cached.flatMap(([, data]) => data?.data.list ?? []).find((entry) => entry.voiceId === item.voiceId);
    setSelectedVoice(voice ?? null);
    setCurrent(item);
  }

  return (
    <div className="flex h-(--content-min-height) flex-col overflow-hidden">
      <div className="flex min-h-0 flex-1">
        {/* 左侧主区域 */}
        <main className="flex min-w-0 flex-1 flex-col gap-4 p-6">
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-semibold">文字转语音</h1>
            <div className="ml-auto flex items-center gap-2">
              <VoiceSelect voice={selectedVoice} onChange={handleVoiceChange} />
              <ModelSelect provider={provider} value={model} onChange={setModel} />
            </div>
          </div>
          <EditorCard text={text} busy={busy} onTextChange={setText} onPolish={handlePolish} onFixTypos={handleFixTypos} onGenerate={handleGenerate} />
        </main>

        {/* 右侧：配置 / 生成历史 */}
        <aside className="flex w-80 shrink-0 flex-col overflow-hidden border-l bg-muted/30">
          <Tabs defaultValue="config" className="flex min-h-0 flex-1 flex-col">
            <TabsList variant="line" className="shrink-0 border-b px-4">
              <TabsTrigger value="config" className="flex-1 gap-1.5 text-sm">
                <Settings2 className="size-4" />
                配置
              </TabsTrigger>
              <TabsTrigger value="history" className="flex-1 gap-1.5 text-sm">
                <History className="size-4" />
                生成历史
              </TabsTrigger>
            </TabsList>
            <TabsContent value="config" className="min-h-0 flex-1 overflow-y-auto p-4">
              <ConfigPanel
                provider={provider}
                bailianConfigs={bailianConfigs}
                minimaxiConfigs={minimaxiConfigs}
                onBailianChange={(patch) => setBailianConfigs((prev) => ({ ...prev, ...patch }))}
                onMinimaxiChange={(patch) => setMinimaxiConfigs((prev) => ({ ...prev, ...patch }))}
              />
            </TabsContent>
            <TabsContent value="history" className="min-h-0 flex-1 overflow-y-auto p-4">
              <HistoryPanel
                items={historyQuery.data?.data.list ?? []}
                total={historyQuery.data?.data.meta.total ?? 0}
                page={page}
                pageSize={HISTORY_PAGE_SIZE}
                isLoading={historyQuery.isLoading}
                error={historyQuery.error}
                activeId={current?.id}
                onSelect={handleSelectHistory}
                onPageChange={setPage}
              />
            </TabsContent>
          </Tabs>
        </aside>
      </div>

      {/* 底部播放控制区域 */}
      {current ? <PlayerBar item={current} onClose={() => setCurrent(null)} /> : null}
    </div>
  );
}
