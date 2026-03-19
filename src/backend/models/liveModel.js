/**
 * 파일 역할: chatBot_DB 기반 LIVE 페이지 필터/목록 데이터를 조회하는 모델 파일.
 */
const { getChatbotPool } = require('../config/database');

const TABLE_NAME_PATTERN = /^[A-Za-z0-9_]+$/;
const STORE_NAME_CANDIDATES = ['storeName', 'store_name', 'name', 'shopName', 'shop_name', 'branchName', 'branch_name'];
const STORE_FILTER_CANDIDATES = ['storeName', 'store_name', 'name', 'shopName', 'shop_name', 'branchName', 'branch_name', 'store', 'storeNm'];
const ORDER_CANDIDATES = ['updatedAt', 'updated_at', 'createdAt', 'created_at', 'regDate', 'reg_date', 'entryDate', 'entry_date', 'date'];
const DISPLAY_FIELD_CANDIDATES = ['title', 'subject', 'name', 'nickName', 'nickname', 'roomName', 'choiceName', 'entryName', 'message'];

const LIVE_CATEGORY_MAP = {
  choice: { key: 'choice', label: '초이스톡', tableName: 'INFO_CHOICE' },
  waiting: { key: 'waiting', label: '웨이팅', tableName: 'INFO_ROOM' },
  entry: { key: 'entry', label: '엔트리', tableName: 'ENTRY_TODAY' }
};

function ensureTableName(tableName) {
  const normalized = String(tableName || '').trim();
  if (!TABLE_NAME_PATTERN.test(normalized)) {
    throw new Error('유효하지 않은 테이블 이름입니다.');
  }
  return normalized;
}

function normalizeLimit(limit) {
  const parsed = Number.parseInt(limit, 10);
  if (!Number.isInteger(parsed) || parsed <= 0) return 50;
  return Math.min(parsed, 100);
}

function getCategoryConfig(categoryKey) {
  return LIVE_CATEGORY_MAP[String(categoryKey || '').trim()] || LIVE_CATEGORY_MAP.choice;
}

function findColumn(columns, candidates) {
  const normalizedMap = new Map(columns.map((column) => [String(column).toLowerCase(), column]));
  for (const candidate of candidates) {
    const match = normalizedMap.get(String(candidate).toLowerCase());
    if (match) return match;
  }
  return null;
}

async function getTableColumns(tableName) {
  const pool = getChatbotPool();
  const safeTableName = ensureTableName(tableName);
  const [rows] = await pool.query(`SHOW COLUMNS FROM \`${safeTableName}\``);
  return rows.map((row) => row.Field);
}

async function listStoreNames() {
  const pool = getChatbotPool();
  const tableName = 'INFO_STORE';
  const columns = await getTableColumns(tableName);
  const storeNameColumn = findColumn(columns, STORE_NAME_CANDIDATES);

  if (!storeNameColumn) {
    throw new Error('INFO_STORE에서 매장명 컬럼을 찾을 수 없습니다.');
  }

  const [rows] = await pool.query(
    `SELECT DISTINCT \`${storeNameColumn}\` AS storeName
     FROM \`${tableName}\`
     WHERE \`${storeNameColumn}\` IS NOT NULL
       AND TRIM(\`${storeNameColumn}\`) <> ''
     ORDER BY \`${storeNameColumn}\` ASC`
  );

  return rows.map((row) => String(row.storeName).trim()).filter(Boolean);
}

async function countRows(tableName, storeName = '') {
  const pool = getChatbotPool();
  const safeTableName = ensureTableName(tableName);
  const columns = await getTableColumns(safeTableName);
  const storeColumn = findColumn(columns, STORE_FILTER_CANDIDATES);
  const hasStoreFilter = Boolean(storeName && storeColumn);

  const [rows] = await pool.query(
    `SELECT COUNT(*) AS total
     FROM \`${safeTableName}\`
     ${hasStoreFilter ? `WHERE \`${storeColumn}\` = ?` : ''}`,
    hasStoreFilter ? [storeName] : []
  );

  return Number(rows[0]?.total || 0);
}

async function listLiveEntries(categoryKey, { storeName = '', limit = 50 } = {}) {
  const pool = getChatbotPool();
  const category = getCategoryConfig(categoryKey);
  const safeTableName = ensureTableName(category.tableName);
  const rowLimit = normalizeLimit(limit);
  const columns = await getTableColumns(safeTableName);
  const storeColumn = findColumn(columns, STORE_FILTER_CANDIDATES);
  const orderColumn = findColumn(columns, ORDER_CANDIDATES);
  const titleColumn = findColumn(columns, DISPLAY_FIELD_CANDIDATES);
  const whereClause = storeName && storeColumn ? `WHERE \`${storeColumn}\` = ?` : '';
  const orderClause = orderColumn ? `ORDER BY \`${orderColumn}\` DESC` : '';
  const params = storeName && storeColumn ? [storeName, rowLimit] : [rowLimit];

  const [rows] = await pool.query(
    `SELECT * FROM \`${safeTableName}\`
     ${whereClause}
     ${orderClause}
     LIMIT ?`,
    params
  );

  return {
    category,
    storeFilterColumn: storeColumn,
    titleColumn,
    columns,
    rows
  };
}

async function getLiveFilters() {
  const stores = await listStoreNames();
  const categories = await Promise.all(
    Object.values(LIVE_CATEGORY_MAP).map(async (category) => ({
      key: category.key,
      label: category.label,
      tableName: category.tableName,
      totalCount: await countRows(category.tableName)
    }))
  );

  return { stores, categories };
}

module.exports = {
  LIVE_CATEGORY_MAP,
  countRows,
  getCategoryConfig,
  getLiveFilters,
  getTableColumns,
  listLiveEntries,
  listStoreNames,
  normalizeLimit
};
