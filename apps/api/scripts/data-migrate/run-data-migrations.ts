import '@poppinss/ts-exec';
import { readdir } from 'node:fs/promises';
import { createPool } from 'mysql2/promise';
import { type DataMigrationConfig, migrateTable } from './data-migrate.ts';

/**
 * 数据库数据搬运入口（项目无关，可独立运行）。
 *
 * 不读取项目内任何配置，数据库连接信息通过环境变量提供：
 *   DB_HOST     连接地址，默认 127.0.0.1
 *   DB_PORT     端口，默认 3306
 *   DB_USER     用户名，默认 root
 *   DB_PASSWORD 密码，默认空
 *
 * 运行方式：
 *   node scripts/data-migrate/run-data-migrations.ts
 *   DB_USER=root DB_PASSWORD=xxx node scripts/data-migrate/run-data-migrations.ts
 *
 * 迁移定义放在 scripts/data-migrate/data-migrations/ 目录下，每个 .ts 文件默认导出一个
 * 迁移配置（或由多个配置组成的数组），本脚本会自动发现并逐个执行；
 * 以下划线开头的文件（如 _example.ts）会被跳过。
 */

const host = process.env.DB_HOST ?? '127.0.0.1';
const port = Number(process.env.DB_PORT ?? 3306);
const user = process.env.DB_USER ?? 'root';
const password = process.env.DB_PASSWORD ?? '';

const pool = createPool({
  host,
  port,
  user,
  password,
  charset: 'utf8mb4',
  connectionLimit: 5,
});

console.log(`数据库连接: ${user}@${host}:${port}（源/目标库由各迁移配置指定）`);

// 自动发现迁移定义
const migrationsDir = new URL('./data-migrations/', import.meta.url);
const files = (await readdir(migrationsDir)).filter((file) => file.endsWith('.ts') && !file.startsWith('_')).sort();

const migrations: DataMigrationConfig[] = [];
for (const file of files) {
  const module = await import(new URL(file, migrationsDir).href);
  const exported = module.default ?? module;
  if (Array.isArray(exported)) {
    migrations.push(...exported);
  } else if (exported && typeof exported === 'object') {
    migrations.push(exported);
  }
}

if (migrations.length === 0) {
  console.log('未发现任何迁移定义（scripts/data-migrate/data-migrations/ 目录为空）');
  await pool.end();
  process.exit(0);
}

console.log(`发现 ${migrations.length} 个迁移任务，开始执行`);
console.log();

let failedCount = 0;
for (const migration of migrations) {
  const label = migration.name ?? `${migration.source.database}.${migration.source.table} -> ${migration.target.database}.${migration.target.table}`;
  try {
    await migrateTable(pool, migration);
  } catch (error) {
    failedCount += 1;
    console.error(`[${label}] 迁移失败:`);
    console.error(error);
  }
}

await pool.end();

if (failedCount > 0) {
  console.error(`执行完毕：${migrations.length - failedCount} 个成功，${failedCount} 个失败`);
  process.exit(1);
}
console.log('全部迁移执行完毕');
