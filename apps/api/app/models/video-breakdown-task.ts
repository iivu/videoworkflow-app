import { VideoBreakdownTaskSchema } from '#database/schema';

export default class VideoBreakdownTask extends VideoBreakdownTaskSchema {}

export const VIDEO_BREAKDOWN_TASK_STATUS = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  FAILED: 'failed',
} as const;

export type VideoBreakdownTaskStatus = (typeof VIDEO_BREAKDOWN_TASK_STATUS)[keyof typeof VIDEO_BREAKDOWN_TASK_STATUS];
