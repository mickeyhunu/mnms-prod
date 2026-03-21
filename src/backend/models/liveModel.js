/**
 * 파일 역할: chatBot_DB에서 룸/웨이팅/초이스톡/엔트리 데이터를 읽어오는 LIVE 페이지 조회 모델 파일.
 */
const { getChatbotPool } = require('../config/database');

const TABLE_NAME_PATTERN = /^[A-Za-z0-9_]+$/;
const STORE_NO_CANDIDATES = ['storeNo', 'store_no', 'shopNo', 'shop_no', 'branchNo', 'branch_no'];
const STORE_NAME_CANDIDATES = ['storeName', 'store_name', 'name', 'shopName', 'shop_name', 'branchName', 'branch_name'];
const STORE_ADDRESS_CANDIDATES = ['storeAddress', 'store_address', 'address', 'addr', 'location', 'locationAddress', 'roadAddress', 'jibunAddress'];
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
  return Math.min(parsed, 300);
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
  const pool = await getChatbotPool();
  const safeTableName = ensureTableName(tableName);
  const [rows] = await pool.query(`SHOW COLUMNS FROM \`${safeTableName}\``);
  return rows.map((row) => row.Field);
}

async function listStores() {
  const pool = await getChatbotPool();
  const tableName = 'INFO_STORE';
  const columns = await getTableColumns(tableName);
  const storeNoColumn = findColumn(columns, STORE_NO_CANDIDATES);
  const storeNameColumn = findColumn(columns, STORE_NAME_CANDIDATES);
  const storeAddressColumn = findColumn(columns, STORE_ADDRESS_CANDIDATES);

  if (!storeNameColumn) {
    throw new Error('INFO_STORE에서 매장명 컬럼을 찾을 수 없습니다.');
  }

  const selectStoreNo = storeNoColumn ? `\`${storeNoColumn}\` AS storeNo,` : 'NULL AS storeNo,';
  const selectStoreAddress = storeAddressColumn ? `\`${storeAddressColumn}\` AS storeAddress` : "'' AS storeAddress";
  const orderByClause = storeNoColumn
    ? `ORDER BY \`${storeNoColumn}\` ASC, \`${storeNameColumn}\` ASC`
    : `ORDER BY \`${storeNameColumn}\` ASC`;

  const [rows] = await pool.query(
    `SELECT DISTINCT ${selectStoreNo}
            \`${storeNameColumn}\` AS storeName,
            ${selectStoreAddress}
       FROM \`${tableName}\`
      WHERE \`${storeNameColumn}\` IS NOT NULL
        AND TRIM(\`${storeNameColumn}\`) <> ''
      ${orderByClause}`
  );

  return rows
    .map((row) => ({
      storeNo: Number.isFinite(Number(row.storeNo)) ? Number(row.storeNo) : null,
      storeName: String(row.storeName || '').trim(),
      storeAddress: String(row.storeAddress || '').trim()
    }))
    .filter((row) => row.storeName)
    .sort((a, b) => {
      if (a.storeNo === null && b.storeNo === null) return a.storeName.localeCompare(b.storeName, 'ko');
      if (a.storeNo === null) return 1;
      if (b.storeNo === null) return -1;
      return a.storeNo - b.storeNo;
    });
}

async function getStoreByNo(storeNo) {
  const normalizedStoreNo = Number.parseInt(storeNo, 10);
  if (!Number.isInteger(normalizedStoreNo) || normalizedStoreNo <= 0) {
    return null;
  }

  const stores = await listStores();
  return stores.find((store) => store.storeNo === normalizedStoreNo) || null;
}

function buildStoreFilter(columns, { storeNo = null, storeName = '' } = {}) {
  const normalizedStoreNo = Number.parseInt(storeNo, 10);
  const normalizedStoreName = String(storeName || '').trim();
  const storeNoColumn = findColumn(columns, STORE_NO_CANDIDATES);
  const storeNameColumn = findColumn(columns, STORE_FILTER_CANDIDATES);

  if (Number.isInteger(normalizedStoreNo) && normalizedStoreNo > 0 && storeNoColumn) {
    return { clause: `WHERE \`${storeNoColumn}\` = ?`, params: [normalizedStoreNo], column: storeNoColumn, type: 'storeNo' };
  }

  if (normalizedStoreName && storeNameColumn) {
    return { clause: `WHERE \`${storeNameColumn}\` = ?`, params: [normalizedStoreName], column: storeNameColumn, type: 'storeName' };
  }

  return { clause: '', params: [], column: storeNoColumn || storeNameColumn || null, type: null };
}

async function countRows(tableName, { storeNo = null, storeName = '' } = {}) {
  const pool = await getChatbotPool();
  const safeTableName = ensureTableName(tableName);
  const columns = await getTableColumns(safeTableName);
  const storeFilter = buildStoreFilter(columns, { storeNo, storeName });

  const [rows] = await pool.query(
    `SELECT COUNT(*) AS total
       FROM \`${safeTableName}\`
       ${storeFilter.clause}`,
    storeFilter.params
  );

  return Number(rows[0]?.total || 0);
}

async function listLiveEntries(categoryKey, { storeNo = null, limit = 50 } = {}) {
  const pool = await getChatbotPool();
  const category = getCategoryConfig(categoryKey);
  const safeTableName = ensureTableName(category.tableName);
  const rowLimit = normalizeLimit(limit);
  const columns = await getTableColumns(safeTableName);
  const orderColumn = findColumn(columns, ORDER_CANDIDATES);
  const titleColumn = findColumn(columns, DISPLAY_FIELD_CANDIDATES);
  const selectedStore = await getStoreByNo(storeNo);
  const storeFilter = buildStoreFilter(columns, {
    storeNo,
    storeName: selectedStore?.storeName || ''
  });
  const params = [...storeFilter.params, rowLimit];

  const query = orderColumn
    ? category.key === 'entry'
      ? `SELECT *
           FROM (
             SELECT *
               FROM \`${safeTableName}\`
               ${storeFilter.clause}
              ORDER BY \`${orderColumn}\` DESC
              LIMIT ?
           ) AS recent_entries
          ORDER BY \`${orderColumn}\` ASC`
      : `SELECT *
           FROM \`${safeTableName}\`
           ${storeFilter.clause}
          ORDER BY \`${orderColumn}\` DESC
          LIMIT ?`
    : `SELECT *
         FROM \`${safeTableName}\`
         ${storeFilter.clause}
         LIMIT ?`;

  const [rows] = await pool.query(query, params);

  return {
    category,
    selectedStore,
    storeFilterColumn: storeFilter.column,
    titleColumn,
    columns,
    rows
  };
}

async function getLiveFilters() {
  const stores = await listStores();
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
  getStoreByNo,
  listStores,
  normalizeLimit
};
