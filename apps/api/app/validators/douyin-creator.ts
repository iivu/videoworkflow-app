import vine from '@vinejs/vine';

export const createDouyinCreatorValidator = vine.create({
  source: vine.string().trim().minLength(1).maxLength(255),
});

export const listDouyinCreatorsValidator = vine.create({
  page: vine.number().withoutDecimals().min(1).optional(),
  size: vine.number().withoutDecimals().min(1).max(48).optional(),
  keyword: vine.string().trim().maxLength(128).optional(),
  sortBy: vine.enum(['totalFavorited', 'followerCount', 'awemeCount']).optional(),
  sortOrder: vine.enum(['asc', 'desc']).optional(),
});

export const douyinCreatorIdValidator = vine.create({
  params: vine.object({ id: vine.number().withoutDecimals().min(1) }),
});

export const douyinCreatorTaskIdValidator = vine.create({
  params: vine.object({ taskId: vine.number().withoutDecimals().min(1) }),
});
