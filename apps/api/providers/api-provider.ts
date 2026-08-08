import { HttpContext } from '@adonisjs/core/http';
import { BaseSerializer } from '@adonisjs/core/transformers';
import type { SimplePaginatorMetaKeys } from '@adonisjs/lucid/types/querybuilder';

import BusinessException from '#exceptions/business-exception';

/**
 * Custom serializer for API responses that ensures consistent JSON structure
 * across all API endpoints. Wraps response data in a 'data' property and handles
 * pagination metadata for Lucid ORM query results.
 */
class ApiSerializer extends BaseSerializer<{
  Wrap: 'data';
  PaginationMetaData: SimplePaginatorMetaKeys;
}> {
  /**
   * Wraps all serialized data under this key in the response object.
   * Example: { data: [...] } instead of returning raw arrays/objects
   */
  wrap: 'data' = 'data';

  /**
   * Validates and defines pagination metadata structure for paginated responses.
   * Ensures that pagination info from Lucid queries is properly formatted.
   *
   * @throws Error if metadata doesn't match Lucid's pagination structure
   */
  definePaginationMetaData(metaData: unknown): SimplePaginatorMetaKeys {
    if (!this.isLucidPaginatorMetaData(metaData)) {
      throw new Error('Invalid pagination metadata. Expected metadata to contain Lucid pagination keys');
    }
    return metaData;
  }
}

/**
 * Single instance of ApiSerializer used across the application
 */
const serializer = new ApiSerializer();
const serialize = Object.assign(
  function (this: HttpContext, ...[data, resolver]: Parameters<ApiSerializer['serialize']>) {
    return serializer.serialize(data, resolver ?? this.containerResolver);
  },
  {
    withoutWrapping(this: HttpContext, ...[data, resolver]: Parameters<ApiSerializer['serializeWithoutWrapping']>) {
      return serializer.serializeWithoutWrapping(data, resolver ?? this.containerResolver);
    },
  },
) as ApiSerializer['serialize'] & {
  withoutWrapping: ApiSerializer['serializeWithoutWrapping'];
};

function ok<T>(this: HttpContext, data: T) {
  const resp = this.serialize.withoutWrapping({ code: 0, message: 'ok', data });
  return resp as typeof resp | { __status: number; __response: { code: number; message: string; data?: any } };
}

function fail(this: HttpContext, message: string, code = 40000, data: any = null): never {
  throw new BusinessException(message, code, data);
}

function error(this: HttpContext, message: string, code = 40000, data: any = null): never {
  throw new BusinessException(message, code, data);
}

/**
 * Adds the serialize, ok, and fail methods to all HttpContext instances.
 * Usage in controllers: return ctx.serialize(data), ctx.ok(data), or ctx.fail(message, data, code).
 * This ensures all API responses follow the same structure with common wrapping.
 */
HttpContext.instanceProperty('serialize', serialize);
HttpContext.instanceProperty('ok', ok);
HttpContext.instanceProperty('fail', fail);
HttpContext.instanceProperty('error', error);

/**
 * Module augmentation to add the serialize, ok, and fail methods to HttpContext.
 * This allows controllers to use ctx.serialize(), ctx.ok(), and ctx.fail() for consistent API responses.
 */
declare module '@adonisjs/core/http' {
  export interface HttpContext {
    serialize: typeof serialize;
    ok: typeof ok;
    fail: typeof fail;
    error: typeof error;
  }
}
