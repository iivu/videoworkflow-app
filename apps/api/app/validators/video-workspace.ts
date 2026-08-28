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
  nodes: vine.array(vine.any()),
  edges: vine.array(vine.any()),
  viewport: vine.any().optional(),
});

export const removeVideoWorkspaceValidator = vine.create({
  params: videoWorkspaceParamsSchema,
});
