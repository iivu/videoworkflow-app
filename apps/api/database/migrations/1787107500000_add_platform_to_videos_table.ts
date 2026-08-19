import { BaseSchema } from '@adonisjs/lucid/schema';

export default class extends BaseSchema {
  protected tableName = 'videos';

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.string('platform', 32).notNullable().defaultTo('unknown');
    });
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('platform');
    });
  }
}
