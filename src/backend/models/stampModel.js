/**
 * 파일 역할: 회원 스탬프 잔액과 적립/사용 내역 조회를 담당하는 모델 파일.
 */
const { getPool } = require('../config/database');

const STAMP_TYPES = {
  MEMBER: 'MEMBER',
  BUSINESS: 'BUSINESS'
};

const STAMP_PURCHASE_PLANS = {
  starter: {
    name: '🥉 스타터팩',
    composition: '스탬프 5개',
    stampCount: 5,
    price: 100000
  },
  basic: {
    name: '🥈 베이직팩',
    composition: '스탬프 10개 + 1개',
    stampCount: 11,
    price: 200000
  },
  premium: {
    name: '🥇 프리미엄팩',
    composition: '스탬프 20개 + 3개',
    stampCount: 23,
    price: 400000
  },
  vip: {
    name: '💎 VIP팩',
    composition: '스탬프 30개 + 5개',
    stampCount: 35,
    price: 600000
  }
};

const STAMP_ACTION_LABELS = {
  STAMP_PURCHASE: '스탬프 구매',
  STAMP_PURCHASE_CANCEL: '스탬프 결제취소',
  VISIT_VERIFICATION: '업소 방문 인증',
  SERVICE_BOTTLE_USE: '이벤트 참여 사용',
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

function normalizeStampPurchasePlanCode(planCode) {
  const value = String(planCode || '').trim().toLowerCase();
  return Object.prototype.hasOwnProperty.call(STAMP_PURCHASE_PLANS, value) ? value : '';
}

function getStampPurchasePlan(planCode) {
  const normalizedCode = normalizeStampPurchasePlanCode(planCode);
  if (!normalizedCode) return null;

  return {
    code: normalizedCode,
    ...STAMP_PURCHASE_PLANS[normalizedCode]
  };
}


async function createStampPurchase(userId, { planCode, stampType = STAMP_TYPES.MEMBER } = {}) {
  const pool = getPool();
  const plan = getStampPurchasePlan(planCode);

  if (!plan) {
    const error = new Error('구매할 스탬프 상품을 선택해주세요.');
    error.status = 400;
    throw error;
  }

  const normalizedType = normalizeStampType(stampType);
  const vat = Math.round(plan.price * 0.1);
  const totalPrice = plan.price + vat;
  const orderId = `STAMP-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
  const reason = `${plan.name} (${plan.composition})`;

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [result] = await connection.query(
      `INSERT INTO stamp_histories (user_id, stamp_type, action_type, amount, reason, source_label)
       VALUES (?, ?, 'STAMP_PURCHASE', ?, ?, ?)`,
      [userId, normalizedType, plan.stampCount, reason, orderId]
    );
    await connection.commit();

    return {
      id: Number(result.insertId),
      orderId,
      planCode: plan.code,
      planName: plan.name,
      composition: plan.composition,
      stampCount: plan.stampCount,
      supplyPrice: plan.price,
      vat,
      totalPrice,
      stampType: normalizedType,
      status: '결제완료'
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
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


async function getUserStampPaymentHistories(userId, options = {}) {
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
       AND action_type IN ('STAMP_PURCHASE', 'STAMP_PURCHASE_CANCEL')
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
    createdAt: row.createdAt,
    status: row.actionType === 'STAMP_PURCHASE_CANCEL' || Number(row.amount || 0) < 0 ? '결제취소' : '결제완료'
  }));
}

module.exports = {
  STAMP_TYPES,
  STAMP_PURCHASE_PLANS,
  STAMP_ACTION_LABELS,
  getStampPurchasePlan,
  createStampPurchase,
  getUserStampBalance,
  getUserStampHistories,
  getUserStampPaymentHistories
};
