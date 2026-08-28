import { BaseSchema } from '@adonisjs/lucid/schema';

export default class extends BaseSchema {
  protected tableName = 'video_workspaces';

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id');
      table.uuid('user_id').notNullable();
      table.string('name', 60).notNullable();
      table
        .text('canvas')
        .notNullable()
        .defaultTo(JSON.stringify({ nodes: [], edges: [], viewport: null }));
      table.datetime('created_at', { precision: 3 }).notNullable();
      table.datetime('updated_at', { precision: 3 }).nullable();

      table.index(['user_id'], 'idx_video_workspaces_user_id');
      table.index(['created_at'], 'idx_video_workspaces_created_at');
    });
  }

  async down() {
    this.schema.dropTable(this.tableName);
  }
}
