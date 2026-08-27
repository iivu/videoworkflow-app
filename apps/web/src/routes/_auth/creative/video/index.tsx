import { createFileRoute } from '@tanstack/react-router';
import { CreativeVideoPage } from '#/features/creative-video';

export const Route = createFileRoute('/_auth/creative/video/')({
  component: CreativeVideoPage,
});
