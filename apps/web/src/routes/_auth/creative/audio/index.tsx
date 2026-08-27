import { createFileRoute } from '@tanstack/react-router';
import { CreativeAudioPage } from '#/features/creative-audio';

export const Route = createFileRoute('/_auth/creative/audio/')({
  staticData: { breadcrumb: '创作音频' },
  component: CreativeAudioPage,
});
