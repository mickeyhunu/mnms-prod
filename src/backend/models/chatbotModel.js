/**
 * 파일 역할: chatbotdb 테이블을 안전하게 조회하는 모델 파일.
 */
const { getChatbotPool } = require('../config/database');

const TABLE_NAME_PATTERN = /^[A-Za-z0-9_]+$/;
const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 500;
const SORT_COLUMN_CANDIDATES = [
  'created_at',
  'createdAt',
  'updated_at',
  'updatedAt',
  'reg_date',
  'regDate',
  'registered_at',
  'registeredAt',
  'timestamp',
  'time',
  'datetime',
  'id'
];

function ensureTableName(tableName) {
  const normalized = String(tableName || '').trim();
  if (!TABLE_NAME_PATTERN.test(normalized)) {
    throw new Error('유효하지 않은 테이블 이름입니다.');
  }
  return normalized;
}

function normalizeLimit(limit) {
  const parsed = Number.parseInt(limit, 10);
  if (!Number.isInteger(parsed) || parsed <= 0) return DEFAULT_LIMIT;
  return Math.min(parsed, MAX_LIMIT);
}

async function listTables() {
  const pool = getChatbotPool();
  const [rows] = await pool.query('SHOW TABLES');

  return rows
    .map((row) => Object.values(row)[0])
    .filter((name) => TABLE_NAME_PATTERN.test(String(name || '')))
    .sort((a, b) => String(a).localeCompare(String(b), 'ko-KR'));
}

async function getTableColumns(tableName) {
  const pool = getChatbotPool();
  const safeTableName = ensureTableName(tableName);
  const [rows] = await pool.query(`SHOW COLUMNS FROM \`${safeTableName}\``);
  return rows;
}

async function resolveSortColumn(tableName) {
  const columns = await getTableColumns(tableName);
  const columnNames = columns.map((column) => column.Field);

  for (const candidate of SORT_COLUMN_CANDIDATES) {
    if (columnNames.includes(candidate)) {
      return candidate;
    }
  }

  return columnNames[0] || null;
}

async function listTableRows(tableName, limit = DEFAULT_LIMIT) {
  const pool = getChatbotPool();
  const safeTableName = ensureTableName(tableName);
  const rowLimit = normalizeLimit(limit);
  const sortColumn = await resolveSortColumn(safeTableName);

  const orderClause = sortColumn ? `ORDER BY \`${sortColumn}\` DESC` : '';
  const [rows] = await pool.query(
    `SELECT * FROM \`${safeTableName}\` ${orderClause} LIMIT ?`,
    [rowLimit]
  );

  return rows;
}

module.exports = {
  ensureTableName,
  normalizeLimit,
  listTables,
  getTableColumns,
  resolveSortColumn,
  listTableRows
};
