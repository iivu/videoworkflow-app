import { BaseSchema } from '@adonisjs/lucid/schema';

export default class extends BaseSchema {
  protected tableName = 'video_minimaxi_voice_tasks';

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id');
      table.integer('user_id').notNullable();
      table.integer('video_id').notNullable();
      table.string('status', 24).notNullable();
      table.string('reason', 256).nullable();
      table.integer('minimaxi_voice_id').nullable();

      table.timestamp('created_at');
      table.timestamp('updated_at');
    });
  }

  async down() {
    this.schema.dropTable(this.tableName);
  }
}
