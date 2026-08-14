import { createFileRoute } from '@tanstack/react-router';
import { VideoBreakdownListPage } from '#/features/video-breakdown/list';

export const Route = createFileRoute('/_auth/video-breakdown/')({
  staticData: { breadcrumb: '视频拆解' },
  component: VideoBreakdownListPage,
});
