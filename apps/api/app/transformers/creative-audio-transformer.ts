import { BaseTransformer } from '@adonisjs/core/transformers';
import type CreativeAudio from '#models/creative-audio';

export default class CreativeAudioTransformer extends BaseTransformer<CreativeAudio> {
  toObject() {
    return this.pick(this.resource, ['id', 'provider', 'model', 'voiceId', 'text', 'configs', 'audioUrl', 'createdAt', 'updatedAt']);
  }
}
