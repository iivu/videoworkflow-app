import { Input, Label, Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue, Slider, Switch } from '@r/ui';
import { EMOTION_OPTIONS, FORMAT_OPTIONS } from './mock';
import type { AudioConfig } from './types';

type ConfigPanelProps = {
  config: AudioConfig;
  onConfigChange: (patch: Partial<AudioConfig>) => void;
};

function sliderValue(value: number | readonly number[]) {
  return Array.isArray(value) ? (value[0] ?? 0) : value;
}

export function ConfigPanel({ config, onConfigChange }: ConfigPanelProps) {
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="config-speech-rate">语速</Label>
          <span className="text-xs tabular-nums text-muted-foreground">{config.speechRate.toFixed(1)}x</span>
        </div>
        <Slider
          id="config-speech-rate"
          aria-label="语速"
          min={0.5}
          max={2}
          step={0.1}
          value={[config.speechRate]}
          onValueChange={(value) => onConfigChange({ speechRate: sliderValue(value) })}
        />
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="config-volume">音量</Label>
          <span className="text-xs tabular-nums text-muted-foreground">{config.volume}%</span>
        </div>
        <Slider id="config-volume" aria-label="音量" min={0} max={100} step={1} value={[config.volume]} onValueChange={(value) => onConfigChange({ volume: sliderValue(value) })} />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="config-emotion">情感</Label>
        <Select items={EMOTION_OPTIONS} value={config.emotion} onValueChange={(value) => value && onConfigChange({ emotion: value })}>
          <SelectTrigger id="config-emotion" className="w-full" aria-label="情感">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              {EMOTION_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="config-format">输出格式</Label>
        <Select items={FORMAT_OPTIONS} value={config.format} onValueChange={(value) => value && onConfigChange({ format: value })}>
          <SelectTrigger id="config-format" className="w-full" aria-label="输出格式">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              {FORMAT_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="config-title">音频名称</Label>
        <Input id="config-title" value={config.title} maxLength={50} placeholder="留空则自动生成" onChange={(event) => onConfigChange({ title: event.target.value })} />
      </div>

      <div className="flex items-center justify-between gap-3">
        <Label htmlFor="config-bgm" className="flex flex-col gap-0.5">
          背景音乐
          <span className="text-xs font-normal text-muted-foreground">为生成的音频叠加轻音乐（Mock）</span>
        </Label>
        <Switch id="config-bgm" checked={config.bgm} onCheckedChange={(checked) => onConfigChange({ bgm: checked })} />
      </div>

      <div className="flex items-center justify-between gap-3">
        <Label htmlFor="config-autoplay" className="flex flex-col gap-0.5">
          生成后自动播放
          <span className="text-xs font-normal text-muted-foreground">生成完成后自动开始播放</span>
        </Label>
        <Switch id="config-autoplay" checked={config.autoplay} onCheckedChange={(checked) => onConfigChange({ autoplay: checked })} />
      </div>
    </div>
  );
}
