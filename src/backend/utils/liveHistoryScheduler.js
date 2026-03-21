/**
 * 파일 역할: LIVE 초이스톡/룸 데이터를 5분 주기로 히스토리 테이블에 적재하는 스케줄러 파일.
 */
const crypto = require('crypto');

const { getChatbotPool } = require('../config/database');
const liveModel = require('../models/liveModel');

const LIVE_HISTORY_INTERVAL_MS = 5 * 60 * 1000;

let liveHistoryTimer = null;
let liveHistoryRunPromise = null;

function hashHistoryKey(parts = []) {
  return crypto
    .createHash('sha256')
    .update(JSON.stringify(parts))
    .digest('hex');
}

function getBucketDate(date = new Date()) {
  const bucketTime = Math.floor(date.getTime() / LIVE_HISTORY_INTERVAL_MS) * LIVE_HISTORY_INTERVAL_MS;
  return new Date(bucketTime);
}

function formatMySqlDateTime(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toISOString().slice(0, 19).replace('T', ' ');
}

async function ensureLiveHistoryTables() {
  const pool = await getChatbotPool();

  await pool.query(`
    CREATE TABLE IF NOT EXISTS LIVE_CHOICE_HISTORY (
      id BIGINT PRIMARY KEY AUTO_INCREMENT,
      dedupeKey CHAR(64) NOT NULL UNIQUE,
      storeNo INT NULL,
      storeName VARCHAR(255) NOT NULL DEFAULT '',
      choiceMsg LONGTEXT NOT NULL,
      createdAt DATETIME NULL,
      capturedAt DATETIME NOT NULL,
      INDEX idx_live_choice_history_store_created_at (storeNo, createdAt),
      INDEX idx_live_choice_history_store_name_created_at (storeName, createdAt)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS LIVE_ROOM_HISTORY (
      id BIGINT PRIMARY KEY AUTO_INCREMENT,
      dedupeKey CHAR(64) NOT NULL UNIQUE,
      snapshotAt DATETIME NOT NULL,
      storeNo INT NULL,
      storeName VARCHAR(255) NOT NULL DEFAULT '',
      roomInfo VARCHAR(255) NULL,
      waitInfo VARCHAR(255) NULL,
      roomDetail LONGTEXT NULL,
      updatedAt DATETIME NOT NULL,
      sourceUpdatedAt DATETIME NULL,
      capturedAt DATETIME NOT NULL,
      INDEX idx_live_room_history_store_updated_at (storeNo, updatedAt),
      INDEX idx_live_room_history_store_name_updated_at (storeName, updatedAt)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
}

async function getLatestChoiceHistoryCreatedAt() {
  const pool = await getChatbotPool();
  const [rows] = await pool.query('SELECT MAX(createdAt) AS latestCreatedAt FROM LIVE_CHOICE_HISTORY');
  return rows[0]?.latestCreatedAt || null;
}

async function captureChoiceHistory() {
  const pool = await getChatbotPool();
  const latestCreatedAt = await getLatestChoiceHistoryCreatedAt();
  const rows = await liveModel.listLiveSourceRows('choice', { since: latestCreatedAt });
  const capturedAt = formatMySqlDateTime(new Date());

  for (const row of rows) {
    const sourceCreatedAt = row.createdAt ? formatMySqlDateTime(new Date(row.createdAt)) : null;
    const createdAt = sourceCreatedAt || capturedAt;
    const dedupeKey = hashHistoryKey([
      'choice',
      row.storeNo,
      row.storeName,
      row.choiceMsg,
      sourceCreatedAt || ''
    ]);

    await pool.query(
      `INSERT IGNORE INTO LIVE_CHOICE_HISTORY
        (dedupeKey, storeNo, storeName, choiceMsg, createdAt, capturedAt)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        dedupeKey,
        row.storeNo,
        row.storeName || '',
        row.choiceMsg || '',
        createdAt,
        capturedAt
      ]
    );
  }
}

async function captureRoomHistory() {
  const pool = await getChatbotPool();
  const snapshotAt = formatMySqlDateTime(getBucketDate());
  const capturedAt = formatMySqlDateTime(new Date());
  const rows = await liveModel.listLiveSourceRows('waiting');

  for (const row of rows) {
    const dedupeKey = hashHistoryKey([
      'waiting',
      snapshotAt,
      row.storeNo,
      row.storeName,
      row.roomInfo,
      row.waitInfo,
      row.roomDetail
    ]);

    await pool.query(
      `INSERT IGNORE INTO LIVE_ROOM_HISTORY
        (dedupeKey, snapshotAt, storeNo, storeName, roomInfo, waitInfo, roomDetail, updatedAt, sourceUpdatedAt, capturedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        dedupeKey,
        snapshotAt,
        row.storeNo,
        row.storeName || '',
        row.roomInfo == null ? null : String(row.roomInfo),
        row.waitInfo == null ? null : String(row.waitInfo),
        row.roomDetail == null
          ? null
          : (typeof row.roomDetail === 'string' ? row.roomDetail : JSON.stringify(row.roomDetail)),
        snapshotAt,
        row.sourceUpdatedAt ? formatMySqlDateTime(new Date(row.sourceUpdatedAt)) : null,
        capturedAt
      ]
    );
  }
}

async function runLiveHistorySnapshot() {
  if (liveHistoryRunPromise) {
    return liveHistoryRunPromise;
  }

  liveHistoryRunPromise = (async () => {
    await ensureLiveHistoryTables();
    await captureChoiceHistory();
    await captureRoomHistory();
  })();

  try {
    await liveHistoryRunPromise;
  } finally {
    liveHistoryRunPromise = null;
  }
}

async function startLiveHistoryScheduler() {
  await runLiveHistorySnapshot();

  if (liveHistoryTimer) {
    return liveHistoryTimer;
  }

  liveHistoryTimer = setInterval(() => {
    runLiveHistorySnapshot().catch((error) => {
      console.error('LIVE history snapshot error:', error);
    });
  }, LIVE_HISTORY_INTERVAL_MS);

  return liveHistoryTimer;
}

module.exports = {
  LIVE_HISTORY_INTERVAL_MS,
  ensureLiveHistoryTables,
  runLiveHistorySnapshot,
  startLiveHistoryScheduler
};
