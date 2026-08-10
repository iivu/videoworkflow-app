import { Tabs, TabsContent, TabsList, TabsTrigger, toast } from '@r/ui';
import { History, Settings2 } from 'lucide-react';
import { useState } from 'react';
import { ConfigPanel } from './config-panel';
import { EditorCard } from './editor-card';
import { HistoryPanel } from './history-panel';
import { createMockAudioUrl, estimateDuration, fixTypos, MOCK_HISTORY, MOCK_VOICES, MODEL_OPTIONS, polishCopy, wait } from './mock';
import { ModelSelect } from './model-select';
import { PlayerBar } from './player-bar';
import type { AudioConfig, AudioHistoryItem, BusyAction } from './types';
import { VoiceSelect } from './voice-select';

const DEFAULT_CONFIG: AudioConfig = {
  speechRate: 1,
  volume: 80,
  emotion: 'natural',
  format: 'mp3',
  title: '',
  bgm: false,
  autoplay: true,
};

export function AudioCreatePage() {
  const [text, setText] = useState('');
  const [voiceId, setVoiceId] = useState(MOCK_VOICES[0].id);
  const [model, setModel] = useState(MODEL_OPTIONS[0].value);
  const [config, setConfig] = useState<AudioConfig>(DEFAULT_CONFIG);
  const [history, setHistory] = useState<AudioHistoryItem[]>(MOCK_HISTORY);
  const [current, setCurrent] = useState<(AudioHistoryItem & { audioUrl: string }) | null>(null);
  const [busy, setBusy] = useState<BusyAction>(null);

  const canSubmit = text.trim().length > 0 && busy === null;

  function updateConfig(patch: Partial<AudioConfig>) {
    setConfig((prev) => ({ ...prev, ...patch }));
  }

  async function handlePolish() {
    if (!canSubmit) return;
    setBusy('polish');
    await wait(800);
    const polished = polishCopy(text);
    setText(polished);
    setBusy(null);
    toast.add({ type: 'success', description: polished === text ? '文案已经很通顺，无需调整' : '文案已润色（示例效果）' });
  }

  async function handleFixTypos() {
    if (!canSubmit) return;
    setBusy('typo');
    await wait(600);
    const result = fixTypos(text);
    setText(result.text);
    setBusy(null);
    toast.add({ type: 'success', description: result.count > 0 ? `已修正 ${result.count} 处错别字` : '未发现错别字' });
  }

  async function handleGenerate() {
    if (!canSubmit) return;
    const voice = MOCK_VOICES.find((item) => item.id === voiceId) ?? MOCK_VOICES[0];
    const modelOption = MODEL_OPTIONS.find((item) => item.value === model) ?? MODEL_OPTIONS[0];
    setBusy('generate');
    await wait(1200);
    const content = text.trim();
    const audioUrl = createMockAudioUrl(content, voice.id, config.speechRate);
    const ready: AudioHistoryItem & { audioUrl: string } = {
      id: `gen-${Date.now()}`,
      text: content,
      title: config.title.trim() || undefined,
      voiceId: voice.id,
      voiceName: voice.name,
      modelName: modelOption.label.split('（')[0],
      createdAt: Date.now(),
      speechRate: config.speechRate,
      duration: estimateDuration(content, config.speechRate),
      audioUrl,
    };
    setHistory((prev) => [ready, ...prev]);
    setCurrent(ready);
    setBusy(null);
    toast.add({ type: 'success', description: '音频已生成（Mock）' });
  }

  function handleSelectHistory(item: AudioHistoryItem) {
    const audioUrl = item.audioUrl ?? createMockAudioUrl(item.text, item.voiceId, item.speechRate);
    const ready = { ...item, audioUrl };
    if (!item.audioUrl) setHistory((prev) => prev.map((entry) => (entry.id === item.id ? ready : entry)));
    setText(item.text);
    setVoiceId(item.voiceId);
    setCurrent(ready);
  }

  return (
    <div className="flex h-(--content-min-height) flex-col overflow-hidden">
      <div className="flex min-h-0 flex-1">
        {/* 左侧主区域 */}
        <main className="flex min-w-0 flex-1 flex-col gap-4 p-6">
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-semibold">文字转语音</h1>
            <div className="ml-auto flex items-center gap-2">
              <VoiceSelect value={voiceId} onChange={setVoiceId} />
              <ModelSelect value={model} onChange={setModel} />
            </div>
          </div>
          <EditorCard text={text} busy={busy} onTextChange={setText} onPolish={handlePolish} onFixTypos={handleFixTypos} onGenerate={handleGenerate} />
        </main>

        {/* 右侧：配置 / 生成历史 */}
        <aside className="flex w-80 shrink-0 flex-col overflow-hidden border-l bg-muted/30">
          <Tabs defaultValue="config" className="flex min-h-0 flex-1 flex-col gap-0">
            <TabsList variant="line" className="w-full shrink-0 border-b px-4">
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
              <ConfigPanel config={config} onConfigChange={updateConfig} />
            </TabsContent>
            <TabsContent value="history" className="min-h-0 flex-1 overflow-y-auto p-4">
              <HistoryPanel history={history} activeId={current?.id} onSelect={handleSelectHistory} />
            </TabsContent>
          </Tabs>
        </aside>
      </div>

      {/* 底部播放控制区域 */}
      {current ? <PlayerBar item={current} volume={config.volume / 100} autoPlay={config.autoplay} onClose={() => setCurrent(null)} /> : null}
    </div>
  );
}
