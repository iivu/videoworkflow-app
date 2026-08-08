import vine from '@vinejs/vine';

export const createSessionValidator = vine.create(
  vine.object({
    username: vine.string().trim(),
    password: vine.string().trim().minLength(8),
  }),
);
