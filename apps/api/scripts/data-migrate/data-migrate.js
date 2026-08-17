/**
 * 通用数据库数据搬运引擎（项目无关，只依赖 mysql2）。
 *
 * 传入一个 mysql2 连接池（不需要指定 database，每个迁移配置里都会显式
 * 给出源库/目标库）以及迁移配置，即可把源库源表的字段按映射关系搬运到
 * 目标库目标表。
 *
 * config.fields 每项支持两种写法：
 *   [源表字段名, 目标表字段名]                      —— 从源表读取该字段值写入目标表
 *   [源表字段名, 目标表字段名, 固定值]              —— 不读取源表，直接向目标表写入固定值
 */

const DEFAULT_BATCH_SIZE = 500;

function escapeId(identifier) {
  return `\`${identifier.replaceAll('`', '``')}\``;
}

function qualify(table) {
  return `${escapeId(table.database)}.${escapeId(table.table)}`;
}

async function getColumns(db, table) {
  const [rows] = await db.query('SELECT COLUMN_NAME AS name FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?', [
    table.database,
    table.table,
  ]);
  return new Set(rows.map((row) => String(row.name)));
}

async function getPrimaryKeyColumns(db, table) {
  const [rows] = await db.query(
    "SELECT COLUMN_NAME AS name FROM information_schema.KEY_COLUMN_USAGE WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND CONSTRAINT_NAME = 'PRIMARY' ORDER BY ORDINAL_POSITION ASC",
    [table.database, table.table],
  );
  return rows.map((row) => String(row.name));
}

async function countRows(db, config) {
  const whereClause = config.where ? `WHERE ${config.where}` : '';
  const [rows] = await db.query(`SELECT COUNT(*) AS total FROM ${qualify(config.source)} ${whereClause}`);
  return Number(rows[0]?.total ?? 0);
}

/**
 * 将源库源表的数据按字段映射搬运到目标库目标表。
 *
 * @param db mysql2 连接池（createPool 创建）
 * @param config 迁移配置
 */
export async function migrateTable(db, config) {
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

  // 字段映射：fields 每项为 [源表字段名, 目标表字段名]，或带第三个参数 [源表字段名, 目标表字段名, 固定值]；
  // 带第三个参数（固定值）的项不会从源表读取，而是直接向目标表字段写入该固定值。
  const fieldSpecs = config.fields.map((entry) => {
    const [sourceField, targetField, fixedValue] = entry;
    return { sourceField, targetField, fixedValue, isFixed: entry.length >= 3 };
  });
  const sourceFields = fieldSpecs.filter((spec) => !spec.isFixed).map((spec) => spec.sourceField);
  const targetFields = fieldSpecs.map((spec) => spec.targetField);
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
  const buildInsertSql = (rowCount) => {
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

  const deleteRows = async (executor, rows) => {
    const pks = rows.map((row) => row[primaryKey]);
    const deleteSql = `DELETE FROM ${source} WHERE ${escapeId(primaryKey)} IN (${pks.map(() => '?').join(', ')})`;
    await executor.query(deleteSql, pks);
  };

  // ---- 执行 ----
  let connection;
  const executor = useTransaction ? await db.getConnection() : db;
  if (useTransaction) {
    connection = executor;
    await connection.beginTransaction();
  }

  let processed = 0;

  try {
    let lastPrimaryKey = null;

    while (true) {
      const [rows] = await executor.query(
        lastPrimaryKey === null ? firstBatchSql : nextBatchSql,
        lastPrimaryKey === null ? [batchSize] : [lastPrimaryKey, batchSize],
      );
      if (rows.length === 0) {
        break;
      }

      const params = [];
      for (const row of rows) {
        for (const spec of fieldSpecs) {
          params.push(spec.isFixed ? spec.fixedValue : row[spec.sourceField]);
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
