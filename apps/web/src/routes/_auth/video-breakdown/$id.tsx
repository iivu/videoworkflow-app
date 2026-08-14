import { createFileRoute } from '@tanstack/react-router';
import { VideoBreakdownDetailPage } from '#/features/video-breakdown/detail';

export const Route = createFileRoute('/_auth/video-breakdown/$id')({
  staticData: { breadcrumb: '拆解详情' },
  component: VideoBreakdownDetailPage,
});
