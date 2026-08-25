import { BaseSchema } from '@adonisjs/lucid/schema';

export default class extends BaseSchema {
  protected tableName = 'crawler_video_tasks';

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.string('platform', 12).notNullable().defaultTo('douyin');
    });
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('platform');
    });
  }
}
