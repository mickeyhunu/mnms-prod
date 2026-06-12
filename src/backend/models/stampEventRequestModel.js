/**
 * 파일 역할: 광고 스탬프 이벤트 신청 조회/승인/반려와 신청 생성 로직을 담당하는 모델 파일.
 */
const { getPool } = require('../config/database');
const { STAMP_TYPES } = require('./stampModel');

const REQUEST_TYPES = {
  VISIT_VERIFICATION: 'VISIT_VERIFICATION',
  STAMP_USE: 'STAMP_USE'
};

const REQUEST_STATUSES = {
  PENDING: 'PENDING',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED'
};

const DAILY_VISIT_VERIFICATION_LIMIT = 3;

function normalizeRequestType(value) {
  const normalized = String(value || '').trim().toUpperCase();
  return Object.prototype.hasOwnProperty.call(REQUEST_TYPES, normalized) ? normalized : '';
}

function normalizeRequestStatus(value) {
  const normalized = String(value || '').trim().toUpperCase();
  return Object.prototype.hasOwnProperty.call(REQUEST_STATUSES, normalized) ? normalized : REQUEST_STATUSES.PENDING;
}

function isRegularMemberRow(user = {}) {
  const role = String(user.role || '').toUpperCase();
  const memberType = String(user.member_type || user.memberType || '').toUpperCase();
  return role === 'MEMBER' && memberType === 'MEMBER';
}

async function getStampBalanceForConnection(connection, userId, stampType) {
  const [rows] = await connection.query(
    `SELECT COALESCE(SUM(amount), 0) AS totalStamps
       FROM stamp_histories
      WHERE user_id = ?
        AND stamp_type = ?`,
    [userId, stampType]
  );
  return Math.max(0, Number(rows[0]?.totalStamps || 0));
}

async function getTodayVisitVerificationRequestPlaceCount(connection, applicantUserId) {
  const [rows] = await connection.query(
    `SELECT COUNT(DISTINCT business_ad_id) AS totalRequestPlaces
       FROM stamp_event_requests
      WHERE applicant_user_id = ?
        AND request_type = 'VISIT_VERIFICATION'
        AND created_at >= CURRENT_DATE()
        AND created_at < CURRENT_DATE() + INTERVAL 1 DAY`,
    [applicantUserId]
  );
  return Number(rows[0]?.totalRequestPlaces || 0);
}

async function hasStampUseRequestToday(connection, applicantUserId) {
  const [rows] = await connection.query(
    `SELECT id
       FROM stamp_event_requests
      WHERE applicant_user_id = ?
        AND request_type = 'STAMP_USE'
        AND created_at >= CURRENT_DATE()
        AND created_at < CURRENT_DATE() + INTERVAL 1 DAY
      LIMIT 1`,
    [applicantUserId]
  );
  return rows.length > 0;
}

async function hasVisitVerificationRequestForAdToday(connection, applicantUserId, businessAdId) {
  const [rows] = await connection.query(
    `SELECT id
       FROM stamp_event_requests
      WHERE applicant_user_id = ?
        AND business_ad_id = ?
        AND request_type = 'VISIT_VERIFICATION'
        AND created_at >= CURRENT_DATE()
        AND created_at < CURRENT_DATE() + INTERVAL 1 DAY
      LIMIT 1`,
    [applicantUserId, businessAdId]
  );
  return rows.length > 0;
}

async function hasApprovedVisitVerificationForAdToday(connection, applicantUserId, businessAdId, excludeRequestId = null) {
  const params = [applicantUserId, businessAdId];
  let excludeClause = '';
  if (excludeRequestId) {
    excludeClause = ' AND id <> ?';
    params.push(excludeRequestId);
  }

  const [rows] = await connection.query(
    `SELECT id
       FROM stamp_event_requests
      WHERE applicant_user_id = ?
        AND business_ad_id = ?
        AND request_type = 'VISIT_VERIFICATION'
        AND status = 'APPROVED'
        AND reviewed_at IS NOT NULL
        AND reviewed_at >= CURRENT_DATE()
        AND reviewed_at < CURRENT_DATE() + INTERVAL 1 DAY${excludeClause}
      LIMIT 1`,
    params
  );
  return rows.length > 0;
}

async function getTodayApprovedVisitVerificationCount(connection, applicantUserId, excludeRequestId = null) {
  const params = [applicantUserId];
  let excludeClause = '';
  if (excludeRequestId) {
    excludeClause = ' AND id <> ?';
    params.push(excludeRequestId);
  }

  const [rows] = await connection.query(
    `SELECT COUNT(*) AS totalApprovals
       FROM stamp_event_requests
      WHERE applicant_user_id = ?
        AND request_type = 'VISIT_VERIFICATION'
        AND status = 'APPROVED'
        AND reviewed_at IS NOT NULL
        AND reviewed_at >= CURRENT_DATE()
        AND reviewed_at < CURRENT_DATE() + INTERVAL 1 DAY${excludeClause}`,
    params
  );
  return Number(rows[0]?.totalApprovals || 0);
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
      `SELECT id, owner_user_id AS ownerUserId, business_name AS businessName, title,
              use_visit_verification AS useVisitVerification, use_stamp_event AS useStampEvent,
              stamp_event_count AS stampEventCount
         FROM business_ads
        WHERE id = ?
          AND is_active = 1
          AND registration_status = 'REGISTERED'
        LIMIT 1
        FOR UPDATE`,
      [businessAdId]
    );
    const ad = ads[0];
    if (!ad) {
      const error = new Error('이벤트를 신청할 수 있는 광고가 아닙니다.');
      error.status = 404;
      throw error;
    }

    const [applicants] = await connection.query(
      `SELECT id, role, member_type
         FROM users
        WHERE id = ?
        LIMIT 1
        FOR UPDATE`,
      [applicantUserId]
    );
    const applicant = applicants[0];
    if (!applicant || !isRegularMemberRow(applicant)) {
      const error = new Error('광고 이벤트는 일반 회원만 참여할 수 있습니다.');
      error.status = 403;
      throw error;
    }

    const isVisitRequest = normalizedType === REQUEST_TYPES.VISIT_VERIFICATION;
    const eventEnabled = isVisitRequest ? Number(ad.useVisitVerification) : Number(ad.useStampEvent);
    if (!eventEnabled) {
      const error = new Error(isVisitRequest ? '방문 인증 이벤트를 사용 중인 광고가 아닙니다.' : '스탬프 사용 이벤트를 사용 중인 광고가 아닙니다.');
      error.status = 404;
      throw error;
    }

    if (Number(ad.ownerUserId) === Number(applicantUserId)) {
      const error = new Error('내 광고에는 이벤트를 신청할 수 없습니다.');
      error.status = 400;
      throw error;
    }

    const stampAmount = isVisitRequest ? 1 : Math.max(1, Number(ad.stampEventCount || 0));
    if (isVisitRequest) {
      if (await hasApprovedVisitVerificationForAdToday(connection, applicantUserId, businessAdId)) {
        const error = new Error('오늘 이미 승인된 광고에는 방문 인증을 다시 신청할 수 없습니다.');
        error.status = 409;
        throw error;
      }

      const todayRequestPlaceCount = await getTodayVisitVerificationRequestPlaceCount(connection, applicantUserId);
      const requestedThisAdToday = await hasVisitVerificationRequestForAdToday(connection, applicantUserId, businessAdId);
      if (!requestedThisAdToday && todayRequestPlaceCount >= DAILY_VISIT_VERIFICATION_LIMIT) {
        const error = new Error(`방문 인증 신청은 하루 최대 ${DAILY_VISIT_VERIFICATION_LIMIT}곳까지만 가능합니다.`);
        error.status = 429;
        throw error;
      }
    }

    if (normalizedType === REQUEST_TYPES.STAMP_USE) {
      if (await hasStampUseRequestToday(connection, applicantUserId)) {
        const error = new Error('스탬프 사용 이벤트는 여러 업소를 통틀어 하루 한 번만 참여할 수 있습니다.');
        error.status = 429;
        throw error;
      }

      const balance = await getStampBalanceForConnection(connection, applicantUserId, STAMP_TYPES.MEMBER);
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
      const businessName = request.business_name || request.title || '광고';
      if (request.request_type === REQUEST_TYPES.VISIT_VERIFICATION) {
        await connection.query(
          `SELECT id
             FROM users
            WHERE id = ?
            LIMIT 1
            FOR UPDATE`,
          [request.applicant_user_id]
        );

        if (await hasApprovedVisitVerificationForAdToday(connection, request.applicant_user_id, request.business_ad_id, request.id)) {
          const error = new Error('신청자가 오늘 이미 승인받은 광고는 다시 방문 인증 승인할 수 없습니다.');
          error.status = 409;
          throw error;
        }

        const todayApprovalCount = await getTodayApprovedVisitVerificationCount(connection, request.applicant_user_id, request.id);
        if (todayApprovalCount >= DAILY_VISIT_VERIFICATION_LIMIT) {
          const error = new Error(`방문 인증 스탬프 지급은 회원당 하루 최대 ${DAILY_VISIT_VERIFICATION_LIMIT}개까지만 가능합니다.`);
          error.status = 429;
          throw error;
        }

        const ownerBalance = await getStampBalanceForConnection(connection, request.owner_user_id, STAMP_TYPES.BUSINESS);
        if (ownerBalance < 1) {
          const error = new Error('승인에 필요한 광고주 스탬프가 부족합니다.');
          error.status = 400;
          throw error;
        }
        await connection.query(
          `INSERT INTO stamp_histories (user_id, stamp_type, action_type, amount, reason, source_label)
           VALUES (?, 'BUSINESS', 'VISIT_VERIFICATION', -1, ?, ?)`,
          [request.owner_user_id, `${businessName} 방문 인증 승인 차감`, `STAMP-EVENT-${request.id}-OWNER`]
        );
        await connection.query(
          `INSERT INTO stamp_histories (user_id, stamp_type, action_type, amount, reason, source_label)
           VALUES (?, 'MEMBER', 'VISIT_VERIFICATION', ?, ?, ?)`,
          [request.applicant_user_id, amount, `${businessName} 방문 인증 승인`, `STAMP-EVENT-${request.id}-APPLICANT`]
        );
      } else {
        const applicantBalance = await getStampBalanceForConnection(connection, request.applicant_user_id, STAMP_TYPES.MEMBER);
        if (applicantBalance < amount) {
          const error = new Error('신청자의 보유 스탬프가 부족합니다.');
          error.status = 400;
          throw error;
        }
        await connection.query(
          `INSERT INTO stamp_histories (user_id, stamp_type, action_type, amount, reason, source_label)
           VALUES (?, 'MEMBER', 'SERVICE_BOTTLE_USE', ?, ?, ?)`,
          [request.applicant_user_id, -amount, `${businessName} 스탬프 사용 승인`, `STAMP-EVENT-${request.id}-APPLICANT`]
        );
        const ownerRewardAmount = Math.max(0, amount - 1);
        if (ownerRewardAmount > 0) {
          await connection.query(
            `INSERT INTO stamp_histories (user_id, stamp_type, action_type, amount, reason, source_label)
             VALUES (?, 'BUSINESS', 'SERVICE_BOTTLE_USE', ?, ?, ?)`,
            [request.owner_user_id, ownerRewardAmount, `${businessName} 스탬프 사용 승인 적립`, `STAMP-EVENT-${request.id}-OWNER`]
          );
        }
      }
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
