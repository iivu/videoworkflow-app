import { createFileRoute, Link, notFound } from '@tanstack/react-router';
import { z } from 'zod';
import { DouyinCreatorDetailPage } from '#/features/douyin-creator/detail-page';

export const Route = createFileRoute('/_auth/douyin-creators/$id')({
  staticData: { breadcrumb: '博主详情' },
  beforeLoad: ({ params }) => {
    if (!/^[1-9]\d*$/.test(params.id) || !Number.isSafeInteger(Number(params.id))) throw notFound();
    return {};
  },
  validateSearch: z.object({
    page: z.coerce.number().int().min(1).default(1).catch(1),
    size: z.coerce.number().int().min(1).max(100).default(20).catch(20),
    keyword: z.string().trim().max(128).default('').catch(''),
  }),
  notFoundComponent: () => (
    <main className="space-y-4 p-6">
      <h1 className="text-xl font-semibold">博主不存在</h1>
      <Link to="/douyin-creators" className="text-sm text-primary hover:underline">
        返回博主库
      </Link>
    </main>
  ),
  component: DouyinCreatorDetailPage,
});
