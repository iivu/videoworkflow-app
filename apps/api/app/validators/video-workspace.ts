import vine from '@vinejs/vine';

export const videoWorkspaceNameValidator = vine.string().trim().minLength(1).maxLength(60);

const videoWorkspaceParamsSchema = vine.object({
  id: vine.string().trim().minLength(1),
});

export const createVideoWorkspaceValidator = vine.create({
  name: videoWorkspaceNameValidator,
});

export const renameVideoWorkspaceValidator = vine.create({
  params: videoWorkspaceParamsSchema,
  name: videoWorkspaceNameValidator,
});

export const showVideoWorkspaceValidator = vine.create({
  params: videoWorkspaceParamsSchema,
});

export const saveVideoWorkspaceCanvasValidator = vine.create({
  params: videoWorkspaceParamsSchema,
  /** 画布数据格式版本；由前端维护，随画布一并持久化，避免载入时重复迁移 */
  version: vine.number().optional(),
  nodes: vine.array(vine.any()),
  edges: vine.array(vine.any()),
  viewport: vine.any().optional(),
});

export const removeVideoWorkspaceValidator = vine.create({
  params: videoWorkspaceParamsSchema,
});
