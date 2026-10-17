import { BaseSchema } from '@adonisjs/lucid/schema';

export default class extends BaseSchema {
  async up() {
    this.schema.createTable('douyin_post_caches', (table) => {
      table.increments('id').comment('共享作品缓存主键');
      table.string('cache_key', 64).notNullable().unique().comment('上游接口、博主标识及请求数量的 SHA-256，不含用户筛选条件');
      table.uuid('version').notNullable().comment('缓存版本，防止历史记录读取或失效操作影响新版本');
      table.string('sec_uid', 128).collate('utf8mb4_bin').notNullable().comment('抖音博主 sec_uid，区分大小写');
      table.integer('post_limit').unsigned().notNullable().comment('请求上游的作品数量，取博主作品数且最大为 10000');
      table.string('status', 24).notNullable().comment('缓存状态：processing、completed、failed、invalidated、expired');
      table.bigInteger('provider_timestamp').nullable().comment('上游任务使用的秒级 Unix 时间戳，创建和查询共用');
      table.boolean('submitted').notNullable().defaultTo(false).comment('是否已占用付费提交机会，在请求前标记，不代表上游成功');
      table.text('result', 'longtext').nullable().comment('规范化后的完整作品列表 JSON，缓存失效或过期后清空');
      table.string('reason', 512).nullable().comment('上游作品查询失败的原因摘要');
      table.datetime('started_at', { precision: 3 }).notNullable().comment('本轮上游作品查询的开始时间');
      table.datetime('expires_at', { precision: 3 }).nullable().index().comment('缓存过期时间，成功取得结果后七天，读取不续期');
      table.datetime('created_at', { precision: 3 }).notNullable().comment('缓存记录创建时间');
      table.datetime('updated_at', { precision: 3 }).nullable().comment('缓存记录最后更新时间');
    });
    this.schema.createTable('douyin_post_searches', (table) => {
      table.increments('id').comment('作品搜索记录主键');
      table.uuid('user_id').notNullable().index().comment('发起搜索的用户 ID，用于搜索历史隔离');
      table.integer('creator_id').unsigned().nullable().comment('关联博主 ID，新博主资料入库前可为空');
      table.integer('creator_task_id').unsigned().nullable().comment('需要等待完成的博主资料采集任务 ID');
      table.string('creator_name', 255).nullable().comment('搜索时的博主名称快照，用于历史展示');
      table.string('source', 255).notNullable().comment('规范化后的搜索来源，保存博主链接或标识');
      table.string('status', 24).notNullable().comment('搜索状态：processing、completed、failed');
      table.text('filters').notNullable().comment('本次搜索的原始筛选条件 JSON，包含日期及互动量门槛');
      table.integer('cache_id').unsigned().nullable().comment('关联共享作品缓存 ID，不重复保存完整搜索结果');
      table.uuid('cache_version').nullable().comment('本次搜索引用的缓存版本，用于历史结果及缓存失效校验');
      table.boolean('cache_hit').notNullable().defaultTo(false).comment('关联缓存时是否命中有效且已完成的缓存');
      table.integer('fetched_count').unsigned().notNullable().defaultTo(0).comment('上游结果规范化后、筛选前的作品数量');
      table.integer('matched_count').unsigned().notNullable().defaultTo(0).comment('符合本次原始筛选条件的作品数量摘要');
      table.string('reason', 512).nullable().comment('搜索失败时向用户展示的原因摘要');
      table.datetime('created_at', { precision: 3 }).notNullable().comment('搜索记录创建时间');
      table.datetime('updated_at', { precision: 3 }).nullable().comment('搜索记录最后更新时间');
      table.index(['user_id', 'status']);
    });
    this.schema.createTable('douyin_download_batches', (table) => {
      table.increments('id').comment('下载批次主键，一次选中作品提交对应一个批次');
      table.uuid('user_id').notNullable().index().comment('提交下载的用户 ID');
      table.integer('creator_id').unsigned().notNullable().comment('本批下载作品所属的博主 ID');
      table.string('creator_name', 255).nullable().comment('提交下载时的博主名称快照');
      table.datetime('created_at', { precision: 3 }).notNullable().comment('下载批次创建时间');
      table.datetime('updated_at', { precision: 3 }).nullable().comment('下载批次最后更新时间');
    });
    this.schema.createTable('douyin_download_tasks', (table) => {
      table.increments('id').comment('单条作品下载任务主键');
      table.uuid('user_id').notNullable().comment('下载任务所属用户 ID');
      table.integer('creator_id').unsigned().notNullable().comment('下载作品所属的博主 ID');
      table.integer('batch_id').unsigned().notNullable().index().comment('所属下载批次 ID');
      table.string('aweme_id', 128).collate('utf8mb4_bin').notNullable().comment('抖音作品 ID，用于同用户下载去重');
      table.string('status', 24).notNullable().comment('下载状态：queued、processing、completed、failed');
      table.text('metadata').notNullable().comment('下载所需作品信息 JSON，含候选视频及封面地址，不依赖搜索缓存');
      table.string('reason', 512).nullable().comment('下载失败时向用户展示的原因摘要');
      table.uuid('execution_token').nullable().comment('本轮执行令牌，防止过期 worker 覆盖重试任务');
      table.datetime('started_at', { precision: 3 }).nullable().comment('本轮下载执行开始时间，排队时为空，用于执行超时判断');
      table.datetime('created_at', { precision: 3 }).notNullable().comment('任务创建或最近手动重试时间，用于排队超时判断');
      table.datetime('updated_at', { precision: 3 }).nullable().comment('下载任务最后更新时间');
      table.index(['user_id', 'aweme_id', 'status']);
    });
    this.schema.createTable('douyin_works', (table) => {
      table.increments('id').comment('下载成功的博主作品主键，独立于现有视频库');
      table.uuid('user_id').notNullable().comment('作品所属用户 ID，与作品 ID 联合唯一');
      table.integer('creator_id').unsigned().notNullable().index().comment('作品所属的博主 ID');
      table.string('aweme_id', 128).collate('utf8mb4_bin').notNullable().comment('抖音作品 ID，同一用户仅保存一份成功作品');
      table.text('title').notNullable().comment('作品标题');
      table.text('metadata').notNullable().comment('作品信息 JSON，含原发布时间及互动量，不保留候选视频地址');
      table.text('video_url').notNullable().comment('成功转存后的视频 OSS 访问地址');
      table.string('video_key', 512).notNullable().comment('视频完整 OSS 对象键，包含目录前缀，用于删除文件');
      table.text('cover_url').nullable().comment('成功转存后的封面 OSS 访问地址，封面转存失败时为空');
      table.string('cover_key', 512).nullable().comment('封面完整 OSS 对象键，包含目录前缀，转存失败时为空');
      table.datetime('created_at', { precision: 3 }).notNullable().comment('作品成功下载入库时间，非抖音原发布时间');
      table.datetime('updated_at', { precision: 3 }).nullable().comment('作品记录最后更新时间');
      table.unique(['user_id', 'aweme_id']);
    });
  }

  async down() {
    for (const table of ['douyin_works', 'douyin_download_tasks', 'douyin_download_batches', 'douyin_post_searches', 'douyin_post_caches']) {
      this.schema.dropTable(table);
    }
  }
}
