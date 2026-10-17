import vine from '@vinejs/vine';

const filters = () => ({
  startDate: vine
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  endDate: vine
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  minLikes: vine.number().withoutDecimals().min(0).optional(),
  minCollects: vine.number().withoutDecimals().min(0).optional(),
  minComments: vine.number().withoutDecimals().min(0).optional(),
});
const pagination = () => ({ page: vine.number().withoutDecimals().min(1).optional(), size: vine.number().withoutDecimals().min(1).max(100).optional() });
export const createPostSearchValidator = vine.create({
  creatorId: vine.number().withoutDecimals().min(1).optional(),
  source: vine.string().trim().minLength(1).maxLength(255).optional(),
  ...filters(),
});
export const listPostSearchesValidator = vine.create(pagination());
export const postSearchIdValidator = vine.create({ params: vine.object({ id: vine.number().withoutDecimals().min(1) }) });
export const postSearchResultsValidator = vine.create({
  params: vine.object({ id: vine.number().withoutDecimals().min(1) }),
  ...pagination(),
  custom: vine.boolean().optional(),
  ...filters(),
});
export const createPostDownloadsValidator = vine.create({
  searchId: vine.number().withoutDecimals().min(1),
  awemeIds: vine
    .array(vine.string().regex(/^[\w-]{1,128}$/))
    .minLength(1)
    .maxLength(100),
  ...filters(),
});
export const retryPostDownloadsValidator = vine.create({
  params: vine.object({ id: vine.number().withoutDecimals().min(1) }),
  taskId: vine.number().withoutDecimals().min(1).optional(),
});
export const listPostWorksValidator = vine.create({
  ...pagination(),
  creatorId: vine.number().withoutDecimals().min(1).optional(),
  keyword: vine.string().trim().maxLength(128).optional(),
});
