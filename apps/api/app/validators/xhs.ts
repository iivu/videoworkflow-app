import vine from '@vinejs/vine';

const sessionParams = vine.object({ id: vine.number().positive() });

export const createXhsSessionValidator = vine.create({
  title: vine.string().trim().optional(),
});

export const listXhsSessionsValidator = vine.create({
  page: vine.number().positive().optional(),
  limit: vine.number().positive().optional(),
});

export const checkXhsSessionValidator = vine.create({
  params: sessionParams,
});

export const updateXhsSessionValidator = vine.create({
  params: sessionParams,
  title: vine.string().trim(),
});

export const listXhsMessagesValidator = vine.create({
  params: sessionParams,
  page: vine.number().positive().optional(),
  limit: vine.number().positive().optional(),
  contentType: vine.enum(['text', 'image']).optional(),
});

export const chatCopyValidator = vine.create({
  params: sessionParams,
  message: vine.string().trim(),
  model: vine.string().optional(),
  imageUrl: vine.string().trim().optional(),
});

export const chatImageValidator = vine.create({
  params: sessionParams,
  prompt: vine.string().trim(),
  imageUrl: vine.string().trim().optional(),
  model: vine.enum(['gemini-2.5-flash-image-preview', 'gemini-3-pro-image-preview', 'gemini-3-pro-image-preview-vip', 'sora_image', 'jimeng-4.5']).optional(),
  aspectRatio: vine.enum(['1:1', '16:9', '9:16', '4:3', '3:4', '21:9']).optional(),
  hdPro: vine.boolean().optional(),
});
