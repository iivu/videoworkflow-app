import { BaseSchema } from '@adonisjs/lucid/schema';

export default class extends BaseSchema {
  protected tableName = 'user_configs';

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id');
      table.integer('user_id').notNullable().unsigned();
      table.string('key', 255).notNullable();
      table.text('value').nullable();
      table.timestamp('created_at').notNullable();
      table.timestamp('updated_at').nullable();

      // 复合唯一索引：同一用户下的 key 必须唯一
      table.unique(['user_id', 'key']);
      table.index(['key']);
    });
  }

  async down() {
    this.schema.dropTable(this.tableName);
  }
}
