import type { HttpContext } from '@adonisjs/core/http';
import app from '@adonisjs/core/services/app';

import { getUniqueFilename } from '#utils/index';
import { uploadURLValidator } from '#validators/oss';

export default class OssController {
  async upload(ctx: HttpContext) {
    const oss = await app.container.make('oss');
    ctx.request.multipart.onFile('file', { size: '500mb' }, async (part, reporter) => {
      part.pause();
      part.on('data', reporter);
      const key = ctx.request.input('key', getUniqueFilename(part.file.clientName));
      return { ossResp: await oss.putStream(part, key) };
    });
    await ctx.request.multipart.process();
    const file = ctx.request.file('file');
    if (!file) return ctx.error('upload failed #1');
    if (!file.meta?.ossResp) return ctx.error('upload failed #2');
    if (!file.meta.ossResp.url) return ctx.error(`upload failed #3 - ${file.meta.ossResp}`);
    return ctx.ok(file.meta.ossResp.url);
  }

  async uploadURL(ctx: HttpContext) {
    const oss = await app.container.make('oss');
    const { url, key } = await ctx.request.validateUsing(uploadURLValidator);
    const { url: ossURL } = await oss.putURL(url, key);
    return ctx.ok(ossURL);
  }

  async getPolicy(ctx: HttpContext) {
    const oss = await app.container.make('oss');
    return ctx.ok(await oss.getPolicy());
  }
}
