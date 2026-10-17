import { BaseSchema } from '@adonisjs/lucid/schema';

export default class extends BaseSchema {
  protected tableName = 'douyin_creator_tasks';

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id');
      table.uuid('user_id').notNullable();
      table.integer('creator_id').unsigned().nullable().references('id').inTable('douyin_creators').onDelete('SET NULL');
      table.string('source_url', 255).notNullable();
      table.string('status', 24).notNullable();
      table.string('reason', 512).nullable();
      table.integer('provider_timestamp').unsigned().nullable();
      table.datetime('created_at', { precision: 3 }).notNullable();
      table.datetime('updated_at', { precision: 3 }).nullable();
      table.index(['user_id', 'status']);
    });
  }

  async down() {
    this.schema.dropTable(this.tableName);
  }
}
