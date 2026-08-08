import { belongsTo } from '@adonisjs/lucid/orm';
import type { BelongsTo } from '@adonisjs/lucid/types/relations';
import { UserAiArticleSchema } from '#database/schema';
import Video from '#models/video';

export default class UserAiArticle extends UserAiArticleSchema {
  @belongsTo(() => Video)
  declare video: BelongsTo<typeof Video>;
}
