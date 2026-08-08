import { BaseSchema } from '@adonisjs/lucid/schema';

export default class extends BaseSchema {
  protected tableName = 'user_ai_articles';

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.string('model', 48).notNullable();
    });
  }
}
