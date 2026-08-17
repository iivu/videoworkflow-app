import type { Pool, PoolConnection, RowDataPacket } from 'mysql2/promise';

/**
 * 通用数据库数据搬运引擎（项目无关，只依赖 mysql2）。
 *
 * 传入一个 mysql2 连接池（不需要指定 database，每个迁移配置里都会显式
 * 给出源库/目标库）以及迁移配置，即可把源库源表的字段按映射关系搬运到
 * 目标库目标表。
 */

export interface TableRef {
  /** 数据库名 */
  database: string;
  /** 表名 */
  table: string;
}

/** 字段映射：每一项为 [源表字段名, 目标表字段名] */
export type FieldMapping = Array<[string, string]>;

export type OnConflictStrategy = 'update' | 'ignore' | 'error';

export interface DataMigrationConfig {
  /** 迁移名称（仅用于日志），默认自动生成 "源库.源表 -> 目标库.目标表" */
  name?: string;
  /** 源：数据从哪个数据库的哪张表搬出 */
  source: TableRef;
  /** 目标：数据搬到哪个数据库的哪张表 */
  target: TableRef;
  /**
   * 字段映射，函数会逐项迭代它。
   * 例如 [['title', 'name']] 表示把源表 title 字段的数据写入目标表 name 字段。
   */
  fields: FieldMapping;
  /** 每批读取并写入的行数，默认 500 */
  batchSize?: number;
  /** 源表主键字段名，用于分批读取；默认自动检测 */
  primaryKey?: string;
  /** 目标表发生唯一键冲突时的处理方式，默认 'update' */
  onConflict?: OnConflictStrategy;
  /** 是否在写入成功后删除源表中已搬运的行，默认 false（仅复制，不删除） */
  deleteSourceRows?: boolean;
  /** 是否将整个迁移过程包在事务中，默认 true */
  useTransaction?: boolean;
  /** 附加过滤条件（不含 WHERE 关键字），例如 "created_at < '2025-01-01'" */
  where?: string;
}

export interface MigrationSummary {
  name: string;
  source: string;
  target: string;
  total: number;
  processed: number;
  durationMs: number;
}

const DEFAULT_BATCH_SIZE = 500;

type Queryable = Pool | PoolConnection;

function escapeId(identifier: string): string {
  return `\`${identifier.replaceAll('`', '``')}\``;
}

function qualify(table: TableRef): string {
  return `${escapeId(table.database)}.${escapeId(table.table)}`;
}

async function getColumns(db: Queryable, table: TableRef): Promise<Set<string>> {
  const [rows] = await db.query<RowDataPacket[]>('SELECT COLUMN_NAME AS name FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?', [
    table.database,
    table.table,
  ]);
  return new Set(rows.map((row) => String(row.name)));
}

async function getPrimaryKeyColumns(db: Queryable, table: TableRef): Promise<string[]> {
  const [rows] = await db.query<RowDataPacket[]>(
    "SELECT COLUMN_NAME AS name FROM information_schema.KEY_COLUMN_USAGE WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND CONSTRAINT_NAME = 'PRIMARY' ORDER BY ORDINAL_POSITION ASC",
    [table.database, table.table],
  );
  return rows.map((row) => String(row.name));
}

async function countRows(db: Queryable, config: DataMigrationConfig): Promise<number> {
  const whereClause = config.where ? `WHERE ${config.where}` : '';
  const [rows] = await db.query<RowDataPacket[]>(`SELECT COUNT(*) AS total FROM ${qualify(config.source)} ${whereClause}`);
  return Number(rows[0]?.total ?? 0);
}

/**
 * 将源库源表的数据按字段映射搬运到目标库目标表。
 *
 * @param db mysql2 连接池（createPool 创建）
 * @param config 迁移配置
 */
export async function migrateTable(db: Pool, config: DataMigrationConfig): Promise<MigrationSummary> {
  const batchSize = config.batchSize ?? DEFAULT_BATCH_SIZE;
  const onConflict = config.onConflict ?? 'update';
  const useTransaction = config.useTransaction ?? true;
  const deleteSourceRows = config.deleteSourceRows ?? false;
  const name = config.name ?? `${config.source.database}.${config.source.table} -> ${config.target.database}.${config.target.table}`;

  if (config.fields.length === 0) {
    throw new Error(`迁移 "${name}" 的字段映射为空`);
  }

  const startedAt = performance.now();
  const source = qualify(config.source);
  const target = qualify(config.target);

  // ---- 校验：表与字段都存在 ----
  const sourceColumns = await getColumns(db, config.source);
  const targetColumns = await getColumns(db, config.target);
  if (sourceColumns.size === 0) {
    throw new Error(`源表不存在: ${source}`);
  }
  if (targetColumns.size === 0) {
    throw new Error(`目标表不存在: ${target}`);
  }

  const sourceFields = config.fields.map(([sourceField]) => sourceField);
  const targetFields = config.fields.map(([, targetField]) => targetField);
  const missingSourceFields = sourceFields.filter((field) => !sourceColumns.has(field));
  if (missingSourceFields.length > 0) {
    throw new Error(`源表 ${source} 缺少字段: ${missingSourceFields.join(', ')}`);
  }
  const missingTargetFields = targetFields.filter((field) => !targetColumns.has(field));
  if (missingTargetFields.length > 0) {
    throw new Error(`目标表 ${target} 缺少字段: ${missingTargetFields.join(', ')}`);
  }

  // ---- 源表主键（用于分批读取） ----
  const primaryKeyColumns = config.primaryKey ? [config.primaryKey] : await getPrimaryKeyColumns(db, config.source);
  if (primaryKeyColumns.length === 0) {
    throw new Error(`无法自动检测源表 ${source} 的主键，请通过 primaryKey 选项指定`);
  }
  if (primaryKeyColumns.length > 1) {
    throw new Error(`源表 ${source} 为复合主键 (${primaryKeyColumns.join(', ')})，无法安全分批，请通过 primaryKey 指定单个唯一字段`);
  }
  const primaryKey = primaryKeyColumns[0];
  if (!sourceColumns.has(primaryKey)) {
    throw new Error(`源表 ${source} 不存在主键字段: ${primaryKey}`);
  }

  // ---- 统计总数（仅用于进度展示） ----
  const total = await countRows(db, config);
  console.log(`[${name}] 开始搬运，共 ${total} 行`);

  // ---- 分批读取与写入 ----
  const selectFields = [...new Set([...sourceFields, primaryKey])];
  const selectList = selectFields.map(escapeId).join(', ');
  const whereSuffix = config.where ? ` AND (${config.where})` : '';
  const orderBy = `ORDER BY ${escapeId(primaryKey)} ASC`;
  const firstBatchSql = `SELECT ${selectList} FROM ${source} WHERE ${escapeId(primaryKey)} IS NOT NULL${whereSuffix} ${orderBy} LIMIT ?`;
  const nextBatchSql = `SELECT ${selectList} FROM ${source} WHERE ${escapeId(primaryKey)} > ?${whereSuffix} ${orderBy} LIMIT ?`;

  const targetColumnsList = targetFields.map(escapeId).join(', ');
  const rowPlaceholder = `(${targetFields.map(() => '?').join(', ')})`;
  const buildInsertSql = (rowCount: number): string => {
    const valuesClause = Array.from({ length: rowCount }, () => rowPlaceholder).join(', ');
    if (onConflict === 'ignore') {
      return `INSERT IGNORE INTO ${target} (${targetColumnsList}) VALUES ${valuesClause}`;
    }
    if (onConflict === 'update') {
      const assignments = targetFields.map((field) => `${escapeId(field)} = VALUES(${escapeId(field)})`).join(', ');
      return `INSERT INTO ${target} (${targetColumnsList}) VALUES ${valuesClause} ON DUPLICATE KEY UPDATE ${assignments}`;
    }
    return `INSERT INTO ${target} (${targetColumnsList}) VALUES ${valuesClause}`;
  };

  const deleteRows = async (executor: Queryable, rows: RowDataPacket[]): Promise<void> => {
    const pks = rows.map((row) => row[primaryKey]);
    const deleteSql = `DELETE FROM ${source} WHERE ${escapeId(primaryKey)} IN (${pks.map(() => '?').join(', ')})`;
    await executor.query(deleteSql, pks);
  };

  // ---- 执行 ----
  let connection: PoolConnection | undefined;
  const executor: Queryable = useTransaction ? await db.getConnection() : db;
  if (useTransaction) {
    connection = executor as PoolConnection;
    await connection.beginTransaction();
  }

  let processed = 0;

  try {
    let lastPrimaryKey: unknown = null;

    while (true) {
      const [rows] = await executor.query<RowDataPacket[]>(
        lastPrimaryKey === null ? firstBatchSql : nextBatchSql,
        lastPrimaryKey === null ? [batchSize] : [lastPrimaryKey, batchSize],
      );
      if (rows.length === 0) {
        break;
      }

      const params: unknown[] = [];
      for (const row of rows) {
        for (const sourceField of sourceFields) {
          params.push(row[sourceField]);
        }
      }
      await executor.query(buildInsertSql(rows.length), params);
      if (deleteSourceRows) {
        await deleteRows(executor, rows);
      }

      processed += rows.length;
      lastPrimaryKey = rows[rows.length - 1][primaryKey];

      const percent = total > 0 ? Math.round((processed / total) * 100) : 100;
      console.log(`[${name}] 已搬运 ${processed}/${total} 行 (${percent}%)`);
    }

    if (connection) {
      await connection.commit();
    }
  } catch (error) {
    if (connection) {
      await connection.rollback();
    }
    throw error;
  } finally {
    if (connection) {
      connection.release();
    }
  }

  const durationMs = Math.round(performance.now() - startedAt);
  console.log(`[${name}] 完成，共搬运 ${processed} 行，耗时 ${durationMs}ms`);

  return { name, source, target, total, processed, durationMs };
}
