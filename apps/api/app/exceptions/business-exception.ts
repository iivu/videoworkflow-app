import { Exception } from '@adonisjs/core/exceptions';
import type { HttpContext } from '@adonisjs/core/http';

export default class BusinessException extends Exception {
  static status = 200;

  constructor(
    message: string = '业务异常',
    code: number | string = 40000,
    private readonly data: any = null,
  ) {
    super(message, { code: code.toString(), status: BusinessException.status });
  }

  handle(_error: this, ctx: HttpContext) {
    return ctx.response.badRequest({
      message: this.message,
      data: this.data,
      code: Number(this.code),
    });
  }
}
