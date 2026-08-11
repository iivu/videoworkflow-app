import { Label, Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue, Slider, Switch } from '@r/ui';
import {
  BAILIAN_BIT_RATE_OPTIONS,
  BAILIAN_SAMPLE_RATE_OPTIONS,
  CHANNEL_OPTIONS,
  EMOTION_OPTIONS,
  LANGUAGE_HINT_OPTIONS,
  MINIMAXI_BIT_RATE_OPTIONS,
  MINIMAXI_SAMPLE_RATE_OPTIONS,
} from './constants';
import type { AudioProvider, BailianAudioConfigs, MinimaxiAudioConfigs } from './types';

type ConfigPanelProps = {
  provider: AudioProvider | null;
  bailianConfigs: BailianAudioConfigs;
  minimaxiConfigs: MinimaxiAudioConfigs;
  onBailianChange: (patch: Partial<BailianAudioConfigs>) => void;
  onMinimaxiChange: (patch: Partial<MinimaxiAudioConfigs>) => void;
};

function sliderValue(value: number | readonly number[]) {
  return Array.isArray(value) ? (value[0] ?? 0) : value;
}

function SliderField(props: { id: string; label: string; display: string; min: number; max: number; step: number; value: number; onChange: (value: number) => void }) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <Label htmlFor={props.id}>{props.label}</Label>
        <span className="text-xs tabular-nums text-muted-foreground">{props.display}</span>
      </div>
      <Slider
        id={props.id}
        aria-label={props.label}
        min={props.min}
        max={props.max}
        step={props.step}
        value={[props.value]}
        onValueChange={(value) => props.onChange(sliderValue(value))}
      />
    </div>
  );
}

function SelectField(props: { id: string; label: string; value: string; options: Array<{ label: string; value: string }>; onChange: (value: string) => void }) {
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={props.id}>{props.label}</Label>
      <Select items={props.options} value={props.value} onValueChange={(value) => value && props.onChange(value)}>
        <SelectTrigger id={props.id} className="w-full" aria-label={props.label}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            {props.options.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
    </div>
  );
}

function SwitchField(props: { id: string; label: string; description: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <Label htmlFor={props.id} className="flex flex-col gap-0.5 items-start">
        {props.label}
        <span className="text-xs font-normal text-muted-foreground">{props.description}</span>
      </Label>
      <Switch id={props.id} checked={props.checked} onCheckedChange={props.onChange} />
    </div>
  );
}

function numberOptions(values: number[], unit?: string) {
  return values.map((value) => ({ label: unit ? `${value} ${unit}` : String(value), value: String(value) }));
}

export function ConfigPanel({ provider, bailianConfigs, minimaxiConfigs, onBailianChange, onMinimaxiChange }: ConfigPanelProps) {
  if (!provider) {
    return <p className="py-8 text-center text-sm text-muted-foreground">请先选择音色，配置项将按服务商展示</p>;
  }

  return (
    <div className="flex flex-col gap-5">
      {provider === 'bailian' ? (
        <>
          <SliderField
            id="config-rate"
            label="语速"
            display={`${bailianConfigs.rate.toFixed(1)}x`}
            min={0.5}
            max={2}
            step={0.1}
            value={bailianConfigs.rate}
            onChange={(rate) => onBailianChange({ rate })}
          />
          <SliderField
            id="config-volume"
            label="音量"
            display={`${bailianConfigs.volume}%`}
            min={0}
            max={100}
            step={1}
            value={bailianConfigs.volume}
            onChange={(volume) => onBailianChange({ volume })}
          />
          <SliderField
            id="config-pitch"
            label="音调"
            display={`${bailianConfigs.pitch.toFixed(1)}x`}
            min={0.5}
            max={2}
            step={0.1}
            value={bailianConfigs.pitch}
            onChange={(pitch) => onBailianChange({ pitch })}
          />
          <SelectField
            id="config-sample-rate"
            label="采样率"
            value={String(bailianConfigs.sampleRate)}
            options={numberOptions(BAILIAN_SAMPLE_RATE_OPTIONS, 'Hz')}
            onChange={(value) => onBailianChange({ sampleRate: Number(value) })}
          />
          <SelectField
            id="config-bit-rate"
            label="比特率"
            value={String(bailianConfigs.bitRate)}
            options={numberOptions(BAILIAN_BIT_RATE_OPTIONS, 'kbps')}
            onChange={(value) => onBailianChange({ bitRate: Number(value) })}
          />
          <SelectField
            id="config-language-hint"
            label="目标语言"
            value={bailianConfigs.languageHints[0] || 'auto'}
            options={[{ label: '自动', value: 'auto' }, ...LANGUAGE_HINT_OPTIONS]}
            onChange={(value) => onBailianChange({ languageHints: value === 'auto' ? [] : [value] })}
          />
          <SwitchField
            id="config-ssml"
            label="启用SSML"
            description="按SSML标记解析文案"
            checked={bailianConfigs.enableSsml}
            onChange={(enableSsml) => onBailianChange({ enableSsml })}
          />
        </>
      ) : (
        <>
          <SliderField
            id="config-speed"
            label="语速"
            display={`${minimaxiConfigs.speed.toFixed(1)}x`}
            min={0.5}
            max={2}
            step={0.1}
            value={minimaxiConfigs.speed}
            onChange={(speed) => onMinimaxiChange({ speed })}
          />
          <SliderField
            id="config-vol"
            label="音量"
            display={`${minimaxiConfigs.vol.toFixed(1)}x`}
            min={0.1}
            max={10}
            step={0.1}
            value={minimaxiConfigs.vol}
            onChange={(vol) => onMinimaxiChange({ vol })}
          />
          <SliderField
            id="config-pitch"
            label="音调"
            display={`${minimaxiConfigs.pitch.toFixed(1)}x`}
            min={-12}
            max={12}
            step={0.1}
            value={minimaxiConfigs.pitch}
            onChange={(pitch) => onMinimaxiChange({ pitch })}
          />
          <SelectField id="config-emotion" label="情感" value={minimaxiConfigs.emotion} options={EMOTION_OPTIONS} onChange={(emotion) => onMinimaxiChange({ emotion })} />
          <SelectField
            id="config-sample-rate"
            label="采样率"
            value={String(minimaxiConfigs.sampleRate)}
            options={numberOptions(MINIMAXI_SAMPLE_RATE_OPTIONS, 'Hz')}
            onChange={(value) => onMinimaxiChange({ sampleRate: Number(value) })}
          />
          <SelectField
            id="config-bitrate"
            label="比特率"
            value={String(minimaxiConfigs.bitrate)}
            options={numberOptions(MINIMAXI_BIT_RATE_OPTIONS, 'bps')}
            onChange={(value) => onMinimaxiChange({ bitrate: Number(value) })}
          />
          <SelectField
            id="config-channel"
            label="声道"
            value={String(minimaxiConfigs.channel)}
            options={CHANNEL_OPTIONS}
            onChange={(value) => onMinimaxiChange({ channel: Number(value) })}
          />
          <SwitchField
            id="config-subtitle"
            label="生成字幕"
            description="同时返回字幕时间轴信息"
            checked={minimaxiConfigs.subtitleEnable}
            onChange={(subtitleEnable) => onMinimaxiChange({ subtitleEnable })}
          />
        </>
      )}
    </div>
  );
}
