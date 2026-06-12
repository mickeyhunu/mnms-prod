/**
 * 파일 역할: 광고 스탬프 이벤트 신청 조회/승인/반려와 신청 생성 로직을 담당하는 모델 파일.
 */
const { getPool } = require('../config/database');
const { getUserStampBalance, STAMP_TYPES } = require('./stampModel');

const REQUEST_TYPES = {
  VISIT_VERIFICATION: 'VISIT_VERIFICATION',
  STAMP_USE: 'STAMP_USE'
};

const REQUEST_STATUSES = {
  PENDING: 'PENDING',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED'
};

function normalizeRequestType(value) {
  const normalized = String(value || '').trim().toUpperCase();
  return Object.prototype.hasOwnProperty.call(REQUEST_TYPES, normalized) ? normalized : '';
}

function normalizeRequestStatus(value) {
  const normalized = String(value || '').trim().toUpperCase();
  return Object.prototype.hasOwnProperty.call(REQUEST_STATUSES, normalized) ? normalized : REQUEST_STATUSES.PENDING;
}

function mapRequestRow(row = {}) {
  return {
    id: Number(row.id),
    businessAdId: Number(row.businessAdId),
    ownerUserId: Number(row.ownerUserId),
    applicantUserId: Number(row.applicantUserId),
    applicantNickname: row.applicantNickname || '',
    applicantLoginId: row.applicantLoginId || '',
    businessName: row.businessName || '',
    adTitle: row.adTitle || '',
    requestType: row.requestType,
    status: row.status,
    stampAmount: Number(row.stampAmount || 0),
    rejectionReason: row.rejectionReason || '',
    reviewedAt: row.reviewedAt || null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt
  };
}

async function createStampEventRequest({ businessAdId, applicantUserId, requestType }) {
  const pool = getPool();
  const normalizedType = normalizeRequestType(requestType);
  if (!normalizedType) {
    const error = new Error('유효하지 않은 이벤트 신청 유형입니다.');
    error.status = 400;
    throw error;
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [ads] = await connection.query(
      `SELECT id, owner_user_id AS ownerUserId, business_name AS businessName, title, use_stamp_event AS useStampEvent, stamp_event_count AS stampEventCount
         FROM business_ads
        WHERE id = ?
          AND is_active = 1
          AND registration_status = 'REGISTERED'
        LIMIT 1
        FOR UPDATE`,
      [businessAdId]
    );
    const ad = ads[0];
    if (!ad || !Number(ad.useStampEvent)) {
      const error = new Error('스탬프 이벤트를 사용 중인 광고가 아닙니다.');
      error.status = 404;
      throw error;
    }
    if (Number(ad.ownerUserId) === Number(applicantUserId)) {
      const error = new Error('내 광고에는 이벤트를 신청할 수 없습니다.');
      error.status = 400;
      throw error;
    }

    const stampAmount = normalizedType === REQUEST_TYPES.VISIT_VERIFICATION ? 1 : Math.max(1, Number(ad.stampEventCount || 0));
    if (normalizedType === REQUEST_TYPES.STAMP_USE) {
      const balance = await getUserStampBalance(applicantUserId, STAMP_TYPES.MEMBER);
      if (balance < stampAmount) {
        const error = new Error('보유 스탬프가 부족합니다.');
        error.status = 400;
        throw error;
      }
    }

    const [duplicates] = await connection.query(
      `SELECT id
         FROM stamp_event_requests
        WHERE business_ad_id = ?
          AND applicant_user_id = ?
          AND request_type = ?
          AND status = 'PENDING'
        LIMIT 1`,
      [businessAdId, applicantUserId, normalizedType]
    );
    if (duplicates.length) {
      const error = new Error('이미 처리 대기 중인 신청이 있습니다.');
      error.status = 409;
      throw error;
    }

    const [result] = await connection.query(
      `INSERT INTO stamp_event_requests (business_ad_id, owner_user_id, applicant_user_id, request_type, stamp_amount)
       VALUES (?, ?, ?, ?, ?)`,
      [businessAdId, ad.ownerUserId, applicantUserId, normalizedType, stampAmount]
    );
    await connection.commit();

    return {
      id: Number(result.insertId),
      businessAdId: Number(ad.id),
      businessName: ad.businessName || '',
      adTitle: ad.title || '',
      requestType: normalizedType,
      status: REQUEST_STATUSES.PENDING,
      stampAmount
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function listOwnerStampEventRequests(ownerUserId, options = {}) {
  const pool = getPool();
  const status = normalizeRequestStatus(options.status);
  const limit = Math.max(1, Math.min(100, Number(options.limit) || 50));
  const params = [ownerUserId];
  let statusWhere = '';
  if (status) {
    statusWhere = ' AND ser.status = ?';
    params.push(status);
  }
  params.push(limit);

  const [rows] = await pool.query(
    `SELECT ser.id, ser.business_ad_id AS businessAdId, ser.owner_user_id AS ownerUserId, ser.applicant_user_id AS applicantUserId,
            ser.request_type AS requestType, ser.status, ser.stamp_amount AS stampAmount, ser.rejection_reason AS rejectionReason,
            ser.reviewed_at AS reviewedAt, ser.created_at AS createdAt, ser.updated_at AS updatedAt,
            COALESCE(u.nickname, '') AS applicantNickname, COALESCE(u.login_id, '') AS applicantLoginId,
            COALESCE(ba.business_name, '') AS businessName, COALESCE(ba.title, '') AS adTitle
       FROM stamp_event_requests ser
       JOIN business_ads ba ON ba.id = ser.business_ad_id
       LEFT JOIN users u ON u.id = ser.applicant_user_id
      WHERE ser.owner_user_id = ?${statusWhere}
      ORDER BY ser.created_at DESC, ser.id DESC
      LIMIT ?`,
    params
  );

  return rows.map(mapRequestRow);
}

async function reviewStampEventRequest({ requestId, ownerUserId, status, rejectionReason = '' }) {
  const pool = getPool();
  const normalizedStatus = normalizeRequestStatus(status);
  if (![REQUEST_STATUSES.APPROVED, REQUEST_STATUSES.REJECTED].includes(normalizedStatus)) {
    const error = new Error('승인 또는 반려 상태만 처리할 수 있습니다.');
    error.status = 400;
    throw error;
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [rows] = await connection.query(
      `SELECT ser.*, ba.business_name, ba.title
         FROM stamp_event_requests ser
         JOIN business_ads ba ON ba.id = ser.business_ad_id
        WHERE ser.id = ?
          AND ser.owner_user_id = ?
        LIMIT 1
        FOR UPDATE`,
      [requestId, ownerUserId]
    );
    const request = rows[0];
    if (!request) {
      const error = new Error('신청 내역을 찾을 수 없습니다.');
      error.status = 404;
      throw error;
    }
    if (request.status !== REQUEST_STATUSES.PENDING) {
      const error = new Error('이미 처리된 신청입니다.');
      error.status = 400;
      throw error;
    }

    if (normalizedStatus === REQUEST_STATUSES.APPROVED) {
      const amount = Number(request.stamp_amount || 0);
      if (request.request_type === REQUEST_TYPES.STAMP_USE) {
        const balance = await getUserStampBalance(request.applicant_user_id, STAMP_TYPES.MEMBER);
        if (balance < amount) {
          const error = new Error('신청자의 보유 스탬프가 부족합니다.');
          error.status = 400;
          throw error;
        }
      }
      const actionType = request.request_type === REQUEST_TYPES.VISIT_VERIFICATION ? 'VISIT_VERIFICATION' : 'SERVICE_BOTTLE_USE';
      const historyAmount = request.request_type === REQUEST_TYPES.VISIT_VERIFICATION ? amount : -amount;
      const reason = request.request_type === REQUEST_TYPES.VISIT_VERIFICATION
        ? `${request.business_name || request.title || '광고'} 방문 인증 승인`
        : `${request.business_name || request.title || '광고'} 스탬프 사용 승인`;
      await connection.query(
        `INSERT INTO stamp_histories (user_id, stamp_type, action_type, amount, reason, source_label)
         VALUES (?, 'MEMBER', ?, ?, ?, ?)`,
        [request.applicant_user_id, actionType, historyAmount, reason, `STAMP-EVENT-${request.id}`]
      );
    }

    await connection.query(
      `UPDATE stamp_event_requests
          SET status = ?, rejection_reason = ?, reviewed_at = NOW(), reviewed_by = ?, updated_at = NOW()
        WHERE id = ?`,
      [normalizedStatus, normalizedStatus === REQUEST_STATUSES.REJECTED ? String(rejectionReason || '').trim().slice(0, 500) : '', ownerUserId, requestId]
    );
    await connection.commit();

    return { success: true, id: requestId, status: normalizedStatus };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

module.exports = {
  REQUEST_TYPES,
  REQUEST_STATUSES,
  createStampEventRequest,
  listOwnerStampEventRequests,
  reviewStampEventRequest
};
