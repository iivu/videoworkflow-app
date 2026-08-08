import { errors as authErrors } from '@adonisjs/auth';
import { ExceptionHandler, type HttpContext } from '@adonisjs/core/http';
import app from '@adonisjs/core/services/app';
import { errors as vineJSErrors } from '@vinejs/vine';

import BusinessException from '#exceptions/business-exception';

export default class HttpExceptionHandler extends ExceptionHandler {
  /**
   * In debug mode, the exception handler will display verbose errors
   * with pretty printed stack traces.
   */
  protected debug = !app.inProduction;

  /**
   * The method is used for handling errors and returning
   * response to the client
   */
  async handle(error: unknown, ctx: HttpContext) {
    if (error instanceof vineJSErrors.E_VALIDATION_ERROR) {
      ctx.response.unprocessableEntity({ code: 42200, message: '参数错误' });
      return;
    }
    if (error instanceof authErrors.E_UNAUTHORIZED_ACCESS || error instanceof authErrors.E_INVALID_CREDENTIALS) {
      const message = error.message ?? 'Unauthorized';
      ctx.response.unauthorized({ code: 40100, message });
      return;
    }
    if (error instanceof BusinessException) {
      return error.handle(error, ctx);
    }
    console.error('Unhandled error:', error);
    return ctx.response.internalServerError({
      code: 50000,
      message: 'Internal Server Error',
    });
  }

  /**
   * The method is used to report error to the logging service or
   * the a third party error monitoring service.
   *
   * @note You should not attempt to send a response from this method.
   */
  async report(error: unknown, ctx: HttpContext) {
    return super.report(error, ctx);
  }
}
