import mitt from 'mitt';

export const EVENT_OPEN_CRAWLER_VIDEO_FORM_DIALOG = 'open-crawler-video-form-dialog';
export const EVENT_OPEN_VOICE_CLONING_DIALOG = 'open-voice-cloning-dialog';

export type VoiceCloningOpenPayload =
  | { video: File; videoUrl?: never; audio?: never; audioUrl?: never }
  | { video?: never; videoUrl: string; audio?: never; audioUrl?: never }
  | { video?: never; videoUrl?: never; audio: File; audioUrl?: never }
  | { video?: never; videoUrl?: never; audio?: never; audioUrl: string };

type Events = {
  [EVENT_OPEN_CRAWLER_VIDEO_FORM_DIALOG]: undefined;
  [EVENT_OPEN_VOICE_CLONING_DIALOG]: VoiceCloningOpenPayload | undefined;
};

export const emitter = mitt<Events>();
