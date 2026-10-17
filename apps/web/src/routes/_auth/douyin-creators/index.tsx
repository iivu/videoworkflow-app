import { createFileRoute, stripSearchParams } from '@tanstack/react-router';
import { z } from 'zod';
import { DouyinCreatorsPage } from '#/features/douyin-creator';

const defaults = { page: 1, size: 12, keyword: '', sortBy: 'totalFavorited', sortOrder: 'desc' } as const;

export const Route = createFileRoute('/_auth/douyin-creators/')({
  staticData: { breadcrumb: '抖音博主' },
  validateSearch: z.object({
    page: z.coerce.number().int().min(1).default(1).catch(1),
    size: z.coerce.number().int().min(1).max(48).default(12).catch(12),
    keyword: z.string().trim().max(128).default('').catch(''),
    sortBy: z.enum(['totalFavorited', 'followerCount', 'awemeCount']).default('totalFavorited').catch('totalFavorited'),
    sortOrder: z.enum(['asc', 'desc']).default('desc').catch('desc'),
  }),
  search: { middlewares: [stripSearchParams(defaults)] },
  component: DouyinCreatorsPage,
});
