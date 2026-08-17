import type { DataMigrationConfig } from '../data-migrate.ts';

/**
 * 迁移定义示例（以下划线开头，运行脚本时会跳过本文件，不会被真正执行）。
 *
 * 新建你自己的迁移定义文件（例如 my-table.ts）放到本目录，默认导出一个
 * DataMigrationConfig（或由多个配置组成的数组），运行
 *
 *   node scripts/run-data-migrations.ts
 *
 * 即可自动发现并全部执行。
 *
 * 数据结构表达的是「从哪个数据库的哪张表的哪个字段，搬到哪个数据库的哪张表的哪个字段」：
 *   source.database / source.table  ->  源库、源表
 *   target.database / target.table  ->  目标库、目标表
 *   fields 每一项为 [源表字段名, 目标表字段名]
 */
export default {
  name: '示例：users -> members',
  source: { database: 'my_db_old', table: 'users' },
  target: { database: 'my_db_new', table: 'members' },
  fields: [
    ['id', 'id'],
    ['username', 'name'],
    ['created_at', 'created_at'],
  ],
} satisfies DataMigrationConfig;
