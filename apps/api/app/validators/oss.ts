import vine from '@vinejs/vine';

export const uploadURLValidator = vine.create({
  url: vine.string().url(),
  key: vine.string(),
});
