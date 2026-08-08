import { createFileRoute } from '@tanstack/react-router';

import { VideoCreateForm } from '#/features/video/form';

export const Route = createFileRoute('/_auth/videos/create')({
  staticData: { breadcrumb: '创建视频' },
  component: VideoCreateForm,
});
