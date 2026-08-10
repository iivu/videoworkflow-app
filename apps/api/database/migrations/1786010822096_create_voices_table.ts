import { BaseSchema } from '@adonisjs/lucid/schema';

export default class extends BaseSchema {
  protected tableName = 'voices';

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id');
      table.uuid('user_id').notNullable();
      table.string('provider', 32).notNullable();
      table.string('model', 128).notNullable();
      table.string('voice_id', 256).notNullable();
      table.string('name', 128).notNullable();
      table.string('description', 512).nullable();
      table.string('demo_url', 512).nullable();
      table.text('config').notNullable();
      table.datetime('created_at', { precision: 3 }).notNullable();
      table.datetime('updated_at', { precision: 3 }).nullable();
      table.index(['user_id'], 'idx_voices_user_id');
      table.index(['provider', 'voice_id'], 'idx_voices_provider_voice_id');
    });
  }

  async down() {
    this.schema.dropTable(this.tableName);
  }
}
