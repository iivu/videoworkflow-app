import { useSelector } from '@tanstack/react-form';
import { useMemo } from 'react';
import { MODEL_OPTIONS, mediaKindOptions, providerOptions, sourceModeOptions } from './constants';
import type { Provider } from './types';
import { useVoiceCloningDialogForm } from './use-voice-cloning-form';

type Form = ReturnType<typeof useVoiceCloningDialogForm>['form'];
type Props = {
  onSubmit?: React.SubmitEventHandler<HTMLFormElement>;
  error?: string;
  form: Form;
  busy?: boolean;
  onFileChange?: () => void;
};

function getModelOptions(provider: Provider) {
  return (MODEL_OPTIONS[provider] ?? []).reduce(
    (acc, model) => {
      acc.push({ label: model, value: model });
      return acc;
    },
    [] as { label: string; value: string }[],
  );
}

export function VoiceCloningForm({ onSubmit, error, form, busy = false, onFileChange }: Props) {
  const selectedProvider = useSelector(form.store, (state) => state.values.provider);
  const selectedMediaKind = useSelector(form.store, (state) => state.values.mediaKind);
  const modelOptions = useMemo(() => (selectedProvider ? getModelOptions(selectedProvider) : []), [selectedProvider]);
  const modelSelectPlaceholder = useMemo(() => (modelOptions.length ? '选择模型' : '请先选择服务商'), [modelOptions]);
  return (
    <form id="voice-cloning-form" className="min-h-0 w-full flex-1 space-y-5 overflow-y-auto px-1 md:px-4" onSubmit={onSubmit}>
      {error ? <ErrorMessage errorMessage={error || ''} /> : null}
      <div className="grid gap-4 sm:grid-cols-2">
        <form.AppField
          name="mediaKind"
          listeners={{
            onChange: () => {
              onFileChange?.();
              form.setFieldValue('selectedFile', null);
              form.setFieldValue('url', '');
            },
          }}
        >
          {(field) => <field.FieldSegmented label="媒体类型" options={mediaKindOptions} disabled={busy} />}
        </form.AppField>
        <form.AppField name="sourceMode">{(field) => <field.FieldSegmented label="媒体来源" options={sourceModeOptions} disabled={busy} />}</form.AppField>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <form.AppField name="provider" listeners={{ onChange: () => form.setFieldValue('model', '') }}>
          {(field) => <field.FieldSelect disabled={busy} placeholder="请选择服务商" label="服务商" options={providerOptions} />}
        </form.AppField>
        <form.AppField name="model">
          {(field) => <field.FieldSelect placeholder={modelSelectPlaceholder} label="模型" disabled={busy || !selectedProvider} options={modelOptions} />}
        </form.AppField>
      </div>
      <form.Subscribe selector={(state) => state.values.sourceMode}>
        {(sourceMode) => (
          <form.AppField name={sourceMode === 'file' ? 'selectedFile' : 'url'} listeners={sourceMode === 'file' ? { onChange: onFileChange } : undefined}>
            {(field) =>
              sourceMode === 'file' ? (
                <field.FieldFileUpload disabled={busy} label="选择本地文件" maxCount={1} accept={selectedMediaKind === 'audio' ? 'audio/*,.mp3' : 'video/*,.mp4'} />
              ) : (
                <field.FieldInput disabled={busy} placeholder="https://example.com/media" label="填写网络地址(URL)" />
              )
            }
          </form.AppField>
        )}
      </form.Subscribe>
      <section className="space-y-4">
        <h3 className="text-sm font-medium">
          高级配置<span className="text-xs text-muted-foreground">(如不确定如何使用，请保持默认)</span>
        </h3>
        <form.Subscribe selector={(state) => state.values.provider}>
          {(provider) => {
            if (!provider) return null;
            return (
              <>
                {provider === 'bailian' ? <BailianAdvancedFields form={form} /> : null}
                {provider === 'minimaxi' ? <MinimaxiAdvancedFields form={form} /> : null}
              </>
            );
          }}
        </form.Subscribe>
      </section>
    </form>
  );
}

function ErrorMessage({ errorMessage }: { errorMessage: string }) {
  return (
    <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive" role="alert">
      {errorMessage}
    </div>
  );
}

function BailianAdvancedFields({ form }: { form: Form }) {
  return (
    <>
      <form.AppField name="languageHints">
        {(field) => (
          <field.FieldInput
            description="辅助模型识别样本音频的语种，从而更准确地提取音色特征，提升复刻效果。若设置的语种与实际音频语种不符（例如为中文音频设置 en），系统将忽略该设置并自动检测语种。"
            label="语言提示"
            placeholder="zh, en"
          />
        )}
      </form.AppField>
      <form.AppField name="maxPromptAudioLength">
        {(field) => (
          <field.FieldInput
            description="音频预处理后用于声音复刻的参考音频最大时长（秒）。取值范围：[3.0, 30.0]。"
            label="最大提示音频时长"
            type="number"
            min="3"
            max="30"
            step="any"
          />
        )}
      </form.AppField>
      <form.AppField name="enablePreprocess">
        {(field) => (
          <field.FieldSwitch
            orientation="horizontal"
            description="是否开启音频预处理（降噪、音频增强、音量规整）。有背景噪音时建议开启；安静环境建议关闭以最大程度还原音色。"
            label="启用音频预处理"
          />
        )}
      </form.AppField>
    </>
  );
}

function MinimaxiAdvancedFields({ form }: { form: Form }) {
  return (
    <>
      <form.AppField name="text">
        {(field) => (
          <field.FieldTextarea
            description="复刻试听参数，限制1000字符以内。模型将使用复刻后的音色朗读本段文本内容，并返回试听音频链接。"
            label="试听文本"
            placeholder="请输入试听文本"
            maxLength={1000}
          />
        )}
      </form.AppField>
      <form.AppField name="languageBoost">
        {(field) => (
          <field.FieldInput
            description="是否增强对指定的小语种和方言的识别能力。默认值为 null，可设置为 auto 让模型自主判断。"
            label="增强对指定的小语种和方言的识别能力"
            placeholder="Chinese, Chinese Yue, English..."
          />
        )}
      </form.AppField>
      <form.AppField name="needNoiseReduction">{(field) => <field.FieldSwitch orientation="horizontal" label="是否开启降噪" />}</form.AppField>
      <form.AppField name="needVolumeNormalization">{(field) => <field.FieldSwitch orientation="horizontal" label="是否开启音量归一化" />}</form.AppField>
      <form.AppField name="aigcWatermark">{(field) => <field.FieldSwitch orientation="horizontal" label="是否在合成试听音频的末尾添加音频节奏标识" />}</form.AppField>
    </>
  );
}
