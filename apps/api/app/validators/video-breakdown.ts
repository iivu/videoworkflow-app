import vine from '@vinejs/vine';

const httpsUrl = vine
  .string()
  .trim()
  .url({
    protocols: ['https'],
    require_protocol: true,
    require_valid_protocol: true,
  });

export const createVideoBreakdownTaskValidator = vine.create({
  videoUrl: httpsUrl,
  model: vine.string().trim().optional(),
});

export const listVideoBreakdownTasksValidator = vine.create({
  page: vine.number().positive().optional(),
  size: vine.number().positive().optional(),
  status: vine.string().trim().optional(),
});

export const showVideoBreakdownTaskValidator = vine.create({
  params: vine.object({ taskId: vine.string().uuid() }),
});
