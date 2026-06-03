/**
 * 파일 역할: 회원 스템프 잔액과 적립/사용 내역 조회를 담당하는 모델 파일.
 */
const { getPool } = require('../config/database');

const STAMP_TYPES = {
  MEMBER: 'MEMBER',
  BUSINESS: 'BUSINESS'
};

const STAMP_ACTION_LABELS = {
  VISIT_VERIFICATION: '업소 방문 인증',
  SERVICE_BOTTLE_USE: '서비스 주류 사용',
  BUSINESS_AD_BRONZE: '브론즈 광고 사용',
  BUSINESS_AD_SILVER: '실버 광고 사용',
  BUSINESS_AD_GOLD: '골드 광고 사용',
  ADMIN_ADJUST_ADD: '관리자 수동 적립',
  ADMIN_ADJUST_DEDUCT: '관리자 수동 차감',
  EXPIRED: '유효기간 만료'
};

function normalizeStampType(stampType) {
  const value = String(stampType || '').trim().toUpperCase();
  return value === STAMP_TYPES.BUSINESS ? STAMP_TYPES.BUSINESS : STAMP_TYPES.MEMBER;
}

async function getUserStampBalance(userId, stampType = STAMP_TYPES.MEMBER) {
  const pool = getPool();
  const normalizedType = normalizeStampType(stampType);
  const [rows] = await pool.query(
    `SELECT COALESCE(SUM(amount), 0) AS totalStamps
     FROM stamp_histories
     WHERE user_id = ?
       AND stamp_type = ?`,
    [userId, normalizedType]
  );

  return Math.max(0, Number(rows[0]?.totalStamps || 0));
}

async function getUserStampHistories(userId, options = {}) {
  const pool = getPool();
  const stampType = normalizeStampType(options.stampType);
  const limit = Math.max(1, Math.min(50, Number(options.limit) || 20));
  const [rows] = await pool.query(
    `SELECT
       id,
       stamp_type AS stampType,
       action_type AS actionType,
       amount,
       reason,
       source_label AS sourceLabel,
       created_at AS createdAt
     FROM stamp_histories
     WHERE user_id = ?
       AND stamp_type = ?
     ORDER BY created_at DESC, id DESC
     LIMIT ?`,
    [userId, stampType, limit]
  );

  return rows.map((row) => ({
    id: Number(row.id),
    stampType: row.stampType,
    actionType: row.actionType,
    actionLabel: STAMP_ACTION_LABELS[row.actionType] || row.actionType,
    amount: Number(row.amount || 0),
    reason: row.reason || '',
    sourceLabel: row.sourceLabel || '',
    createdAt: row.createdAt
  }));
}

module.exports = {
  STAMP_TYPES,
  STAMP_ACTION_LABELS,
  getUserStampBalance,
  getUserStampHistories
};
