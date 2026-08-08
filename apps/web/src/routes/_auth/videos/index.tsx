import { createFileRoute, stripSearchParams } from '@tanstack/react-router';
import { z } from 'zod';

import { VideoListPage } from '#/features/video/list';

const DEFAULT_QUERY = {
  page: 1,
  size: 20,
  title: '',
  author: '',
};

const searchSchema = z.object({
  page: z.coerce.number().int().min(1).default(DEFAULT_QUERY.page).catch(DEFAULT_QUERY.page),
  size: z.coerce.number().int().min(1).max(20).default(DEFAULT_QUERY.size).catch(DEFAULT_QUERY.size),
  title: z.coerce.string().optional(),
  author: z.coerce.string().optional(),
});

export const Route = createFileRoute('/_auth/videos/')({
  staticData: { breadcrumb: '视频库' },
  validateSearch: searchSchema,
  search: {
    middlewares: [stripSearchParams(DEFAULT_QUERY)],
  },
  component: VideoListPage,
});
