import vine from '@vinejs/vine';

export const paraformerVideoValidator = vine.create({
  params: vine.object({ videoId: vine.number().positive().withoutDecimals() }),
});
