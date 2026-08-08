import { Readable } from 'node:stream';
import type { ApplicationService, ContainerBindings } from '@adonisjs/core/types';
import OSS from 'ali-oss';

import BusinessException from '#exceptions/business-exception';

import env from '#start/env';

declare module 'ali-oss' {
  interface Options {
    authorizationV4?: boolean;
  }
}
declare module '@adonisjs/core/types' {
  interface ContainerBindings {
    oss: OssService;
  }
}
export type PutStreamResponse = { name: string; res: OSS.NormalSuccessResponse; url: string };
export interface OssClient {
  putStream<T extends NodeJS.ReadableStream>(file: T, key: string): Promise<PutStreamResponse>;
  putURL(url: string, key: string): Promise<PutStreamResponse>;
  delete(key: string): Promise<unknown>;
}

class OssService implements OssClient {
  private readonly client;

  constructor(private readonly fc: ContainerBindings['fetch']) {
    this.client = new OSS({
      accessKeyId: env.get('OSS_ACCESS_KEY_ID'),
      accessKeySecret: env.get('OSS_ACCESS_KEY_SECRET'),
      region: env.get('OSS_REGION'),
      authorizationV4: true,
      bucket: env.get('OSS_BUCKET'),
      endpoint: env.get('OSS_HOST'),
    });
  }

  async putStream<T extends NodeJS.ReadableStream>(file: T, key: string): Promise<PutStreamResponse> {
    const resp = (await this.client
      // @ts-expect-error
      .putStream(`${env.get('OSS_DIR')}/${key}`, file, { timeout: 1000 * 60 * 10 })
      .catch((err) => {
        throw new BusinessException(err.message);
      })) as unknown as PutStreamResponse;
    return { ...resp, url: resp.url };
  }

  async putURL(url: string, key: string) {
    const resp = await this.fc.stream(url, { headers: { 'Content-Type': '' } });
    return this.putStream(Readable.fromWeb(resp), key);
  }

  async delete(key: string) {
    return await this.client.delete(key);
  }

  async getPolicy() {
    const date = new Date();
    date.setSeconds(date.getSeconds() + 2 * 60 * 60);
    const policy = {
      expiration: date.toISOString(),
      conditions: [['content-length-range', 0, 1048576000], { bucket: env.get('OSS_BUCKET') }],
    };
    const formData = await this.client.calculatePostSignature(policy);
    const ossBucketLocation = await this.client.getBucketLocation(env.get('OSS_BUCKET'));
    const host = `https://${env.get('OSS_BUCKET')}.${ossBucketLocation.location}.aliyuncs.com`.toString();
    return {
      policy: formData.policy,
      signature: formData.Signature,
      ossAccessKeyId: formData.OSSAccessKeyId,
      host,
      dir: env.get('OSS_DIR'),
      cdn: env.get('OSS_CDN'),
    };
  }
}

export default class OssProvider {
  constructor(protected app: ApplicationService) {}

  /**
   * Register bindings to the container
   */
  register() {
    this.app.container.singleton('oss', async () => {
      const fc = await this.app.container.make('fetch');
      return new OssService(fc);
    });
  }
}
