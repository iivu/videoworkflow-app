import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@r/ui';
import { BAILIAN_VOICE_MODELS, MODEL_OPTIONS } from './constants';
import type { AudioProvider } from './types';

type ModelSelectProps = {
  provider: AudioProvider | null;
  /** 当前音色生成时所用的模型，用于限制百炼只能选择该模型 */
  voiceModel: string | null;
  value: string;
  onChange: (model: string) => void;
  disabled?: boolean;
};

/** 模型选择器：可选项由当前音色的 provider 决定，未选音色时禁用；百炼音色额外限制为生成音色的同一模型（qwen/cosyvoice 系列） */
export function ModelSelect({ provider, voiceModel, value, onChange, disabled = false }: ModelSelectProps) {
  // 百炼限制：仅允许选择与生成音色完全一致的模型；音色模型无法识别时回退为展示全部百炼模型
  const lockedModel = provider === 'bailian' && voiceModel && (BAILIAN_VOICE_MODELS as readonly string[]).includes(voiceModel) ? voiceModel : null;
  const options = MODEL_OPTIONS.filter((option) => option.provider === provider && (lockedModel === null || option.value === lockedModel));

  return (
    <Select items={options} value={value} disabled={!provider || disabled} onValueChange={(next) => next && onChange(next)}>
      <SelectTrigger className="w-72" aria-label="模型" disabled={!provider || disabled}>
        <span className="shrink-0 text-muted-foreground">模型</span>
        <span className="h-4 w-px shrink-0 bg-border" />
        <SelectValue placeholder="先选择音色" />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}
