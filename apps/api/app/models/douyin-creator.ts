import { belongsTo } from '@adonisjs/lucid/orm';
import type { BelongsTo } from '@adonisjs/lucid/types/relations';
import { DouyinCreatorSchema } from '#database/schema';
import DouyinCreatorTask from '#models/douyin-creator-task';

export default class DouyinCreator extends DouyinCreatorSchema {
  @belongsTo(() => DouyinCreatorTask, { foreignKey: 'currentTaskId' })
  declare currentTask: BelongsTo<typeof DouyinCreatorTask>;
}
