import vine from '@vinejs/vine';

export const createCrawlerVideoTaskValidator = vine.create({
  userInput: vine.array(vine.string().trim()).minLength(1),
});

export const listCrawlerVideoTasksValidator = vine.create({
  page: vine.number().positive().optional(),
  size: vine.number().positive().optional(),
  status: vine.string().trim().optional(),
});

export const updateCrawlerVideoTaskValidator = vine.create({
  taskId: vine.number().positive(),
  status: vine.string().trim(),
  reason: vine.string().trim().optional(),
  result: vine.string().trim().optional(),
});
