import { CrawlerVideoTaskSchema } from '#database/schema';

export default class CrawlerVideoTask extends CrawlerVideoTaskSchema {}

export const TASK_STATUS = {
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  FAILED: 'failed',
} as const;
