import { BaseTransformer } from '@adonisjs/core/transformers';
import type Voice from '#models/voice';

export default class VoiceTransformer extends BaseTransformer<Voice> {
  toObject() {
    return this.pick(this.resource, ['id', 'provider', 'model', 'voiceId', 'name', 'description', 'config', 'demoUrl', 'createdAt', 'updatedAt']);
  }
}
