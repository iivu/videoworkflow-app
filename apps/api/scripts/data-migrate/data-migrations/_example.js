/**
 * 迁移定义示例（以下划线开头，运行脚本时会跳过本文件，不会被真正执行）。
 *
 * 新建你自己的迁移定义文件（例如 my-table.js）放到本目录，默认导出一个
 * 迁移配置（或由多个配置组成的数组），运行
 *
 *   node scripts/data-migrate/run-data-migrations.js
 *
 * 即可自动发现并全部执行。
 *
 * 数据结构表达的是「从哪个数据库的哪张表的哪个字段，搬到哪个数据库的哪张表的哪个字段」：
 *   source.database / source.table  ->  源库、源表
 *   target.database / target.table  ->  目标库、目标表
 *   fields 每项为 [源表字段名, 目标表字段名]，或带第三个参数 [源表字段名, 目标表字段名, 固定值]；
 *   带第三个参数时不会从源表读取，而是直接向目标表字段写入该固定值。
 */
export default {
  name: '示例：users -> members',
  source: { database: 'my_db_old', table: 'users' },
  target: { database: 'my_db_new', table: 'members' },
  fields: [
    ['id', 'id'],
    ['username', 'name'],
    ['created_at', 'created_at'],
    ['', 'source_marker', 'migrated'], // 目标表 source_marker 字段固定写入 'migrated'
  ],
};
