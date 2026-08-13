import vine from '@vinejs/vine';

const polishArticleVideoParams = vine.object({
  videoId: vine.number().positive().withoutDecimals(),
});

export const polishArticleValidator = vine.create({
  params: polishArticleVideoParams,
  message: vine.string().trim(),
  model: vine.string().trim().optional(),
});

export const listPolishArticleMessagesValidator = vine.create({
  params: polishArticleVideoParams,
  page: vine.number().positive().optional(),
  size: vine.number().positive().optional(),
});
