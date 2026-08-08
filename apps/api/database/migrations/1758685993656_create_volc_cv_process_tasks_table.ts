import { BaseSchema } from '@adonisjs/lucid/schema';

export default class extends BaseSchema {
  protected tableName = 'volc_cv_process_tasks';

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id');
      table.integer('user_id').notNullable();
      table.string('task_id', 64).notNullable();
      table.string('status', 24).notNullable();
      table.text('payload').notNullable();
      table.string('req_key', 64).notNullable();
      table.boolean('is_deleted').notNullable().defaultTo(false);
      table.text('result').nullable();
      table.text('reason').nullable();

      table.timestamp('created_at');
      table.timestamp('updated_at');
    });
  }

  async down() {
    this.schema.dropTable(this.tableName);
  }
}
