import { createFileRoute } from '@tanstack/react-router';
import { DouyinPostSearchPage } from '#/features/douyin-post/search-page';

export const Route = createFileRoute('/_auth/douyin-download/')({ staticData: { breadcrumb: '博主搜索下载' }, component: DouyinPostSearchPage });
