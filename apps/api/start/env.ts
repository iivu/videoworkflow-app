/*
|--------------------------------------------------------------------------
| Environment variables service
|--------------------------------------------------------------------------
|
| The `Env.create` method creates an instance of the Env service. The
| service validates the environment variables and also cast values
| to JavaScript data types.
|
*/

import { Env } from '@adonisjs/core/env';

export default await Env.create(new URL('../', import.meta.url), {
  // Node
  NODE_ENV: Env.schema.enum(['development', 'production', 'test'] as const),
  PORT: Env.schema.number(),
  HOST: Env.schema.string({ format: 'host' }),
  LOG_LEVEL: Env.schema.string(),

  // Session
  SESSION_DRIVER: Env.schema.enum(['cookie', 'memory', 'database'] as const),

  // CORS
  CORS_ORIGIN: Env.schema.string(),

  // App
  APP_KEY: Env.schema.secret(),
  APP_URL: Env.schema.string({ format: 'url', tld: false }),
  APP_MODE: Env.schema.enum(['development', 'production', 'test'] as const),
  ALIYUN_BAILIAN_KEY: Env.schema.string(),
  ALIYUN_BAILIAN_WORKSPACE_ID: Env.schema.string(),
  ALIYUN_BAILIAN_BASE_URL: Env.schema.string({ format: 'url' }),
  ALIYUN_BAILIAN_TEXT_EMBEDDING_BASE_URL: Env.schema.string({ format: 'url' }),
  ALIYUN_BAILIAN_MULTIMODAL_EMBEDDING_BASE_URL: Env.schema.string({ format: 'url' }),
  OSS_ACCESS_KEY_ID: Env.schema.string(),
  OSS_ACCESS_KEY_SECRET: Env.schema.string(),
  OSS_REGION: Env.schema.string(),
  OSS_HOST: Env.schema.string({ format: 'url' }),
  OSS_CDN: Env.schema.string({ format: 'url' }),
  OSS_BUCKET: Env.schema.string(),
  OSS_DIR: Env.schema.string(),
  MINIMAXI_GROUP_ID: Env.schema.string(),
  MINIMAXI_API_KEY: Env.schema.string(),
  MINIMAXI_BASE_URL: Env.schema.string({ format: 'url' }),
  JWT_SECRET_KEY: Env.schema.string(),
  JWT_ALGORITHM: Env.schema.string(),
  JWT_EXPIRES_AT: Env.schema.string(),
  VOLC_ACCESSKEY: Env.schema.string(),
  VOLC_SECRETKEY: Env.schema.string(),
  VOLC_LLM_API_KEY: Env.schema.string(),
  RESOURCE_SAVE_MODE: Env.schema.enum(['filesystem', 'oss'] as const),
  PUBLIC_URL: Env.schema.string(),
  PUBLIC_PATH: Env.schema.string(),
  DB_MYSQL_HOST: Env.schema.string({ format: 'host' }),
  DB_MYSQL_PORT: Env.schema.number(),
  DB_MYSQL_USER: Env.schema.string(),
  DB_MYSQL_PASSWORD: Env.schema.string(),
  DB_MYSQL_DATABASE: Env.schema.string(),
  ZHIPU_API_KEY: Env.schema.string(),
  ZHIPU_BASE_URL: Env.schema.string({ format: 'url' }),
  KIMI_API_KEY: Env.schema.string(),
  KIMI_BASE_URL: Env.schema.string({ format: 'url' }),

  REDIS_HOST: Env.schema.string({ format: 'host' }),
  REDIS_PORT: Env.schema.number(),
  REDIS_PASSWORD: Env.schema.string.optional(),

  OPENROUTER_KEY: Env.schema.string(),

  // NanoBananas API 配置
  NANOBANANAS_API_KEY: Env.schema.string(),
  NANOBANANAS_BASE_URL: Env.schema.string({ format: 'url' }),
  NANOBANANAS_DEFAULT_MODEL: Env.schema.string.optional(),
  NANOBANANAS_DEFAULT_ASPECT_RATIO: Env.schema.string.optional(),
  NANOBANANAS_REQUEST_TIMEOUT_MS: Env.schema.number.optional(),
  NANOBANANAS_MAX_RETRIES: Env.schema.number.optional(),

  // DashVector
  DASHVECTOR_COLLECTION_NAME: Env.schema.string(),
  DASHVECTOR_CLUSTER_ENDPOINT: Env.schema.string({ format: 'url' }),
  DASHVECTOR_API_KEY: Env.schema.string(),

  // Shanhai API
  SHANHAI_API_KEY: Env.schema.string(),
  SHANHAI_API_HOST: Env.schema.string({ format: 'url' }),
  SHANHAI_API_PREFIX: Env.schema.string(),

  /*
  |----------------------------------------------------------
  | Variables for configuring @adonisjs/queue
  |----------------------------------------------------------
  */
  QUEUE_DRIVER: Env.schema.enum(['redis', 'database', 'sync'] as const),
});
