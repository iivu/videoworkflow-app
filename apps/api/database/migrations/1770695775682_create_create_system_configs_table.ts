import { BaseSchema } from '@adonisjs/lucid/schema';

export default class extends BaseSchema {
  protected tableName = 'system_configs';

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').notNullable();
      table.string('key', 255).notNullable().unique().comment('配置键');
      table.text('value').nullable().comment('配置值');
      table.string('group', 100).nullable().comment('配置分组');
      table.text('description').nullable().comment('描述');

      table.timestamp('created_at').notNullable();
      table.timestamp('updated_at').nullable();

      table.index(['group'], 'idx_system_configs_group');
    });
  }

  async down() {
    this.schema.dropTable(this.tableName);
  }
}
