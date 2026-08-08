import { createFileRoute } from '@tanstack/react-router';

import { VideoDetailPage } from '#/features/video/detail';

export const Route = createFileRoute('/_auth/videos/$id')({
  staticData: { breadcrumb: '视频详情' },
  component: VideoDetailPage,
});
