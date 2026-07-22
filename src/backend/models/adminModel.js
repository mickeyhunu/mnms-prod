/**
 * 파일 역할: 관리자 전용 회원/광고 데이터 조회 및 수정 쿼리를 담당하는 모델 파일.
 */
const fs = require('fs');
const path = require('path');
const { getPool, getChatbotPool } = require('../config/database');
const { createSeoSlugWithId, extractTrailingSlugId, normalizeSeoSlug } = require('../utils/seoSlug');
const { pickUserRow } = require('../utils/response');
const { ensureResolvedLoginRestriction, getUserActivityStats, getUserActivityDetails, getUserLoginHistories, getBusinessProfileByUserId, updateBusinessProfileReviewByUserId: updateBusinessProfileReviewRecordByUserId, updateBusinessAuthorNicknameSnapshots } = require('./userModel');
const { getStoreByNo, listStores } = require('./liveModel');


const isLocalEnvLoaded = process.env.MNMS_ENV_LOCAL_LOADED === 'true'
  || fs.existsSync(path.join(process.cwd(), '.env.local'))
  || fs.existsSync(path.resolve(__dirname, '..', '.env.local'));
const BUSINESS_AD_PLAN_DURATION_UNIT_SQL = isLocalEnvLoaded ? 'MINUTE' : 'DAY';
const BUSINESS_AD_PLAN_DURATION_UNIT_LABEL = isLocalEnvLoaded ? '분' : '일';
const BUSINESS_AD_PLAN_DURATIONS = isLocalEnvLoaded
  ? {
      BASIC: 3,
      PLUS: 2,
      PREMIUM: 1
    }
  : {
      BASIC: 3,
      PLUS: 2,
      PREMIUM: 1
    };
const BUSINESS_AD_PIECE_PLAN_TYPE = 'PIECE';
const BUSINESS_AD_PIECE_DURATION = 2;
const BUSINESS_AD_PIECE_DURATION_UNIT_SQL = isLocalEnvLoaded ? 'MINUTE' : 'DAY';
const BUSINESS_AD_PIECE_DURATION_UNIT_LABEL = isLocalEnvLoaded ? '분' : '일';

const BUSINESS_AD_PLAN_JUMP_COUNTS = {
  BASIC: 6,
  PLUS: 9,
  PREMIUM: 12
};
const BUSINESS_AD_CURRENT_MINUTE_SQL = "CAST(DATE_FORMAT(NOW(), '%Y-%m-%d %H:%i:00') AS DATETIME)";
const BUSINESS_AD_RENEWAL_INTERVAL_MS = Number(process.env.BUSINESS_AD_RENEWAL_INTERVAL_MS || 1000);
let businessAdRenewalTimer = null;
let businessAdRenewalRunPromise = null;
let businessAdRenewalSchedulerStarted = false;
let businessAdJumpScheduleTimer = null;
let businessAdJumpScheduleRunPromise = null;
let businessAdJumpScheduleSchedulerStarted = false;
const BUSINESS_AD_JUMP_SCHEDULE_INTERVAL_MS = Number(process.env.BUSINESS_AD_JUMP_SCHEDULE_INTERVAL_MS || 30000);

function normalizeBusinessAdPlanType(planType) {
  const normalized = String(planType || '').trim().toUpperCase();
  if (Object.prototype.hasOwnProperty.call(BUSINESS_AD_PLAN_DURATIONS, normalized)) return normalized;
  if (normalized === 'NORMAL') return 'BASIC';
  return 'BASIC';
}

function getBusinessAdPlanDurationDays(planType) {
  return BUSINESS_AD_PLAN_DURATIONS[normalizeBusinessAdPlanType(planType)] || BUSINESS_AD_PLAN_DURATIONS.BASIC;
}

function getBusinessAdPlanDurationLabel(planType) {
  return `${getBusinessAdPlanDurationDays(planType)}${BUSINESS_AD_PLAN_DURATION_UNIT_LABEL}`;
}

function getBusinessAdPlanDurationUnit() {
  return BUSINESS_AD_PLAN_DURATION_UNIT_LABEL === '분' ? 'minute' : 'day';
}

function getBusinessAdPlanDurationConfig() {
  return Object.keys(BUSINESS_AD_PLAN_DURATIONS).reduce((acc, planType) => {
    acc[planType] = {
      duration: getBusinessAdPlanDurationDays(planType),
      durationUnit: getBusinessAdPlanDurationUnit(),
      durationLabel: getBusinessAdPlanDurationLabel(planType)
    };
    return acc;
  }, {});
}

function getPieceAdDurationLabel() {
  return `${BUSINESS_AD_PIECE_DURATION}${BUSINESS_AD_PIECE_DURATION_UNIT_LABEL}`;
}

function getPieceAdPlanDurationConfig() {
  return {
    PIECE: {
      duration: BUSINESS_AD_PIECE_DURATION,
      durationUnit: BUSINESS_AD_PIECE_DURATION_UNIT_LABEL === '분' ? 'minute' : 'day',
      durationLabel: getPieceAdDurationLabel()
    }
  };
}

function getBusinessAdPlanJumpCount(planType) {
  return BUSINESS_AD_PLAN_JUMP_COUNTS[normalizeBusinessAdPlanType(planType)] || BUSINESS_AD_PLAN_JUMP_COUNTS.BASIC;
}


function normalizeJumpScheduleTime(value) {
  const raw = String(value || '').trim();
  const match = raw.match(/^(\d{2}):(\d{2})(?::\d{2})?$/);
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (!Number.isInteger(hour) || !Number.isInteger(minute) || hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}


function normalizeJumpScheduleTimes(times) {
  if (!Array.isArray(times)) return [];
  return [...new Set(times.map(normalizeJumpScheduleTime).filter(Boolean))].sort();
}

function validateJumpScheduleTimes(times, planType = 'BASIC') {
  if (!Array.isArray(times)) {
    const error = new Error('자동 점프 스케줄은 배열로 입력해주세요.');
    error.status = 400;
    throw error;
  }
  const normalized = normalizeJumpScheduleTimes(times);
  if (normalized.length !== times.length) {
    const error = new Error('자동 점프 시간은 HH:mm 형식으로 중복 없이 입력해주세요.');
    error.status = 400;
    throw error;
  }
  const maxCount = getBusinessAdPlanJumpCount(planType);
  if (normalized.length > maxCount) {
    const error = new Error(`자동 점프 스케줄은 현재 광고 상품 기준 최대 ${maxCount}개까지 등록할 수 있습니다.`);
    error.status = 400;
    throw error;
  }
  const minutes = normalized.map((time) => {
    const [hour, minute] = time.split(':').map(Number);
    return hour * 60 + minute;
  });
  for (let index = 0; index < minutes.length; index += 1) {
    const current = minutes[index];
    const next = minutes[(index + 1) % minutes.length];
    const diff = index === minutes.length - 1 ? next + (24 * 60) - current : next - current;
    if (minutes.length > 1 && diff < 10) {
      const error = new Error('자동 점프 스케줄은 각 시간 사이에 최소 10분 간격이 필요합니다.');
      error.status = 400;
      throw error;
    }
  }
  return normalized;
}

function getBusinessAdPublicVisibilityCondition(alias = 'ba') {
  return `${alias}.registration_status = 'REGISTERED' AND ((${alias}.activated_until IS NOT NULL AND ${alias}.activated_until > NOW()) OR (${alias}.piece_activated_until IS NOT NULL AND ${alias}.piece_activated_until > NOW()))`;
}

async function resetBusinessAdDailyJumps(connectionOrPool = getPool()) {
  await connectionOrPool.query(
    `UPDATE business_ads
        SET daily_jump_remaining = CASE plan_type WHEN 'PREMIUM' THEN ? WHEN 'PLUS' THEN ? ELSE ? END,
            jump_reset_date = CURDATE()
      WHERE registration_status = 'REGISTERED'
        AND activated_until IS NOT NULL
        AND activated_until > NOW()
        AND (jump_reset_date IS NULL OR jump_reset_date < CURDATE())`,
    [BUSINESS_AD_PLAN_JUMP_COUNTS.PREMIUM, BUSINESS_AD_PLAN_JUMP_COUNTS.PLUS, BUSINESS_AD_PLAN_JUMP_COUNTS.BASIC]
  );
}

async function renewExpiredPieceAdsWithStamp() {
  const pool = getPool();
  const [expiredAds] = await pool.query(
    `SELECT id
       FROM business_ads
      WHERE registration_status = 'REGISTERED'
        AND piece_is_active = 1
        AND piece_activated_until IS NOT NULL
        AND piece_activated_until <= NOW()
      ORDER BY piece_activated_until ASC, id ASC
      LIMIT 100`
  );

  for (const row of expiredAds) {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      const [adRows] = await connection.query(
        `SELECT id, owner_user_id AS ownerUserId, activated_until AS activatedUntil
           FROM business_ads
          WHERE id = ?
            AND registration_status = 'REGISTERED'
            AND piece_is_active = 1
            AND piece_activated_until IS NOT NULL
            AND piece_activated_until <= NOW()
          FOR UPDATE`,
        [row.id]
      );
      const ad = adRows[0];
      if (!ad) {
        await connection.rollback();
        continue;
      }

      const [businessActiveRows] = await connection.query('SELECT (? IS NOT NULL AND ? > NOW()) AS isBusinessActivePeriod', [ad.activatedUntil, ad.activatedUntil]);
      if (Number(businessActiveRows[0]?.isBusinessActivePeriod || 0) !== 1) {
        await connection.query('UPDATE business_ads SET piece_is_active = 0 WHERE id = ?', [ad.id]);
        await connection.commit();
        continue;
      }

      await connection.query('SELECT id FROM users WHERE id = ? FOR UPDATE', [ad.ownerUserId]);
      const [balanceRows] = await connection.query(
        `SELECT COALESCE(SUM(amount), 0) AS totalStamps
           FROM stamp_histories
          WHERE user_id = ?
            AND stamp_type = 'BUSINESS'
          FOR UPDATE`,
        [ad.ownerUserId]
      );
      const balance = Number(balanceRows[0]?.totalStamps || 0);
      if (balance < 1) {
        await connection.query('UPDATE business_ads SET piece_is_active = 0 WHERE id = ?', [ad.id]);
        await connection.commit();
        continue;
      }

      await connection.query(
        `INSERT INTO stamp_histories (user_id, stamp_type, action_type, amount, reason, source_label)
         VALUES (?, 'BUSINESS', ?, -1, ?, ?)`,
        [ad.ownerUserId, 'BUSINESS_AD_PIECE', `조각제휴 광고 ${getPieceAdDurationLabel()} 자동연장`, `BUSINESS_AD_PIECE-AUTO-${ad.id}-${Date.now()}`]
      );
      await connection.query(
        `UPDATE business_ads
            SET piece_activated_at = ${BUSINESS_AD_CURRENT_MINUTE_SQL},
                piece_activated_until = DATE_ADD(${BUSINESS_AD_CURRENT_MINUTE_SQL}, INTERVAL ? ${BUSINESS_AD_PIECE_DURATION_UNIT_SQL})
          WHERE id = ?`,
        [BUSINESS_AD_PIECE_DURATION, ad.id]
      );
      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }
}

async function renewExpiredBusinessAdsWithStamp() {
  const pool = getPool();
  const [expiredAds] = await pool.query(
    `SELECT id
       FROM business_ads
      WHERE registration_status = 'REGISTERED'
        AND is_active = 1
        AND activated_until IS NOT NULL
        AND activated_until <= NOW()
      ORDER BY activated_until ASC, id ASC
      LIMIT 100`
  );

  for (const row of expiredAds) {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      const [adRows] = await connection.query(
        `SELECT id, owner_user_id AS ownerUserId, plan_type AS planType
           FROM business_ads
          WHERE id = ?
            AND registration_status = 'REGISTERED'
            AND is_active = 1
            AND activated_until IS NOT NULL
            AND activated_until <= NOW()
          FOR UPDATE`,
        [row.id]
      );
      const ad = adRows[0];
      if (!ad) {
        await connection.rollback();
        continue;
      }

      await connection.query('SELECT id FROM users WHERE id = ? FOR UPDATE', [ad.ownerUserId]);
      const [balanceRows] = await connection.query(
        `SELECT COALESCE(SUM(amount), 0) AS totalStamps
           FROM stamp_histories
          WHERE user_id = ?
            AND stamp_type = 'BUSINESS'
          FOR UPDATE`,
        [ad.ownerUserId]
      );
      const balance = Number(balanceRows[0]?.totalStamps || 0);
      if (balance < 1) {
        await connection.query('UPDATE business_ads SET is_active = 0, piece_is_active = 0 WHERE id = ?', [ad.id]);
        await connection.commit();
        continue;
      }

      const planType = normalizeBusinessAdPlanType(ad.planType);
      const durationDays = getBusinessAdPlanDurationDays(planType);
      await connection.query(
        `INSERT INTO stamp_histories (user_id, stamp_type, action_type, amount, reason, source_label)
         VALUES (?, 'BUSINESS', ?, -1, ?, ?)`,
        [ad.ownerUserId, `BUSINESS_AD_${planType}`, `${planType} 광고 ${getBusinessAdPlanDurationLabel(planType)} 자동연장`, `BUSINESS_AD-AUTO-${ad.id}-${Date.now()}`]
      );
      await connection.query(
        `UPDATE business_ads
            SET plan_type = ?,
                activated_at = ${BUSINESS_AD_CURRENT_MINUTE_SQL},
                activated_until = DATE_ADD(${BUSINESS_AD_CURRENT_MINUTE_SQL}, INTERVAL ? ${BUSINESS_AD_PLAN_DURATION_UNIT_SQL}),
                daily_jump_remaining = ?,
                jump_reset_date = CURDATE(),
                jumped_at = NULL
          WHERE id = ?`,
        [planType, durationDays, getBusinessAdPlanJumpCount(planType), ad.id]
      );
      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  await pool.query(
    `UPDATE business_ads
        SET piece_is_active = 0
      WHERE registration_status = 'REGISTERED'
        AND piece_is_active = 1
        AND activated_until IS NOT NULL
        AND activated_until <= NOW()`
  );

  await renewExpiredPieceAdsWithStamp();
}


async function runBusinessAdRenewal() {
  if (businessAdRenewalRunPromise) return businessAdRenewalRunPromise;

  businessAdRenewalRunPromise = renewExpiredBusinessAdsWithStamp();
  try {
    await businessAdRenewalRunPromise;
  } finally {
    businessAdRenewalRunPromise = null;
  }
}

function scheduleNextBusinessAdRenewal() {
  if (!businessAdRenewalSchedulerStarted || businessAdRenewalTimer) return businessAdRenewalTimer;

  businessAdRenewalTimer = setTimeout(() => {
    businessAdRenewalTimer = null;
    runBusinessAdRenewal()
      .catch((error) => {
        console.error('Business ad renewal scheduler error:', error);
      })
      .finally(() => {
        scheduleNextBusinessAdRenewal();
      });
  }, BUSINESS_AD_RENEWAL_INTERVAL_MS);

  if (typeof businessAdRenewalTimer.unref === 'function') {
    businessAdRenewalTimer.unref();
  }

  return businessAdRenewalTimer;
}

async function startBusinessAdRenewalScheduler() {
  if (businessAdRenewalSchedulerStarted) return businessAdRenewalTimer;

  businessAdRenewalSchedulerStarted = true;
  try {
    await runBusinessAdRenewal();
  } catch (error) {
    businessAdRenewalSchedulerStarted = false;
    throw error;
  }

  return scheduleNextBusinessAdRenewal();
}

function stopBusinessAdRenewalScheduler() {
  businessAdRenewalSchedulerStarted = false;
  if (businessAdRenewalTimer) {
    clearTimeout(businessAdRenewalTimer);
    businessAdRenewalTimer = null;
  }
}

function normalizeBusinessInfoValue(value) {
  if (!value) return {};
  if (typeof value === 'object') return value;

  try {
    return JSON.parse(value);
  } catch (_error) {
    return {};
  }
}

const BUSINESS_APPLICATION_SELECT_COLUMNS = `SELECT bp.user_id AS userId,
            bp.company_name AS companyName,
            bp.business_registration_number AS businessRegistrationNumber,
            bp.manager_name AS managerName,
            bp.contact_phone AS contactPhone,
            bp.approval_status AS approvalStatus,
            bp.rejection_reason AS rejectionReason,
            bp.registration_status AS registrationStatus,
            bp.business_info AS businessInfo,
            bp.last_approved_business_info AS lastApprovedBusinessInfo,
            bp.approved_at AS approvedAt,
            bp.created_at AS createdAt,
            bp.updated_at AS updatedAt,
            u.login_id AS loginId,
            u.nickname AS nickname,
            u.phone AS userPhone,
            u.member_type AS memberType,
            u.role AS role`;

const BUSINESS_APPLICATION_SELECT = `${BUSINESS_APPLICATION_SELECT_COLUMNS}
       FROM business_profiles bp
       JOIN users u ON u.id = bp.user_id`;

function hasBusinessInfoSnapshot(value) {
  return Object.keys(normalizeBusinessInfoValue(value)).length > 0;
}

function getBusinessApplicationType(row) {
  const approvalStatus = String(row.approvalStatus || '').toUpperCase();
  if (approvalStatus === 'APPROVED') return 'APPROVED';

  const isBusinessMember = String(row.memberType || '').toUpperCase() === 'BUSINESS'
    || String(row.role || '').toUpperCase() === 'BUSINESS';
  return isBusinessMember || hasBusinessInfoSnapshot(row.lastApprovedBusinessInfo) ? 'MODIFICATION' : 'NEW';
}

function decorateBusinessApplication(row) {
  const businessInfo = normalizeBusinessInfoValue(row.businessInfo);
  const lastApprovedBusinessInfo = normalizeBusinessInfoValue(row.lastApprovedBusinessInfo);
  const isBusinessMember = String(row.memberType || '').toUpperCase() === 'BUSINESS'
    || String(row.role || '').toUpperCase() === 'BUSINESS';

  return {
    ...row,
    businessInfo,
    lastApprovedBusinessInfo,
    isBusinessMember,
    applicationType: getBusinessApplicationType(row)
  };
}

async function countPendingBusinessApplications() {
  const pool = getPool();
  const [rows] = await pool.query(
    `SELECT COUNT(*) AS count
       FROM business_profiles bp
      WHERE bp.registration_status = 'REGISTERED'
        AND bp.approval_status = 'PENDING'`
  );
  return Number(rows[0]?.count || 0);
}

async function listRecentPendingBusinessApplications({ limit = 5 } = {}) {
  const pool = getPool();
  const safeLimit = Math.max(1, Math.min(20, Number(limit) || 5));
  const [rows] = await pool.query(
    `${BUSINESS_APPLICATION_SELECT_COLUMNS}
       FROM business_profiles bp FORCE INDEX (idx_business_profiles_registered_updated)
       STRAIGHT_JOIN users u ON u.id = bp.user_id
      WHERE bp.registration_status = 'REGISTERED'
        AND bp.approval_status = 'PENDING'
      ORDER BY bp.updated_at DESC, bp.user_id DESC
      LIMIT ?`,
    [safeLimit]
  );
  return rows.map(decorateBusinessApplication);
}

async function listBusinessApplications() {
  const pool = getPool();
  const [rows] = await pool.query(
    `${BUSINESS_APPLICATION_SELECT_COLUMNS}
       FROM business_profiles bp FORCE INDEX (idx_business_profiles_registered_updated)
       STRAIGHT_JOIN users u ON u.id = bp.user_id
      WHERE bp.registration_status = 'REGISTERED'
      ORDER BY bp.updated_at DESC, bp.user_id DESC`
  );

  const applications = rows.map(decorateBusinessApplication);
  for (const application of applications) {
    application.rejectionHistories = await listBusinessProfileRejectionHistories(application.userId);
  }

  return applications;
}

async function findBusinessApplicationByUserId(userId) {
  const pool = getPool();
  const [rows] = await pool.query(
    `${BUSINESS_APPLICATION_SELECT}
      WHERE bp.user_id = ?
        AND bp.registration_status = 'REGISTERED'
      LIMIT 1`,
    [userId]
  );

  if (!rows[0]) return null;
  const application = decorateBusinessApplication(rows[0]);
  application.rejectionHistories = await listBusinessProfileRejectionHistories(userId);
  return application;
}

async function listBusinessProfileRejectionHistories(userId, { limit = 10 } = {}) {
  const safeLimit = Math.max(1, Math.min(50, Number(limit) || 10));
  const pool = getPool();
  const [rows] = await pool.query(
    `SELECT bprh.id,
            bprh.user_id AS userId,
            bprh.rejection_reason AS rejectionReason,
            bprh.reviewed_by AS reviewedBy,
            bprh.created_at AS createdAt,
            reviewer.login_id AS reviewerLoginId,
            reviewer.nickname AS reviewerNickname
       FROM business_profile_rejection_histories bprh
       LEFT JOIN users reviewer ON reviewer.id = bprh.reviewed_by
      WHERE bprh.user_id = ?
      ORDER BY bprh.created_at DESC, bprh.id DESC
      LIMIT ?`,
    [userId, safeLimit]
  );

  return rows.map((row) => ({
    id: Number(row.id),
    userId: Number(row.userId),
    rejectionReason: row.rejectionReason || '',
    reviewedBy: row.reviewedBy ? Number(row.reviewedBy) : null,
    reviewerLoginId: row.reviewerLoginId || '',
    reviewerNickname: row.reviewerNickname || '',
    createdAt: row.createdAt
  }));
}


function normalizeSnapshotNickname(value) {
  return String(value || '').trim() || '비회원';
}

async function freezeUserCommunityAuthorSnapshotsBeforeBusinessConversion(userId, connection = null) {
  const db = connection || getPool();
  const [rows] = await db.query(
    `SELECT id, nickname, member_type AS memberType
       FROM users
      WHERE id = ?
      LIMIT 1`,
    [userId]
  );
  const user = rows[0];
  if (!user) return { posts: 0, comments: 0 };
  if (String(user.memberType || '').toUpperCase() === 'BUSINESS') {
    return { posts: 0, comments: 0 };
  }

  const authorNickname = normalizeSnapshotNickname(user.nickname);
  const [postResult] = await db.query(
    `UPDATE posts
        SET author_nickname_snapshot = ?,
            author_role_snapshot = 'MEMBER',
            author_member_type_snapshot = 'MEMBER'
      WHERE user_id = ?
        AND author_nickname_snapshot IS NULL
        AND author_role_snapshot IS NULL
        AND author_member_type_snapshot IS NULL`,
    [authorNickname, userId]
  );
  const [commentResult] = await db.query(
    `UPDATE comments
        SET author_nickname_snapshot = ?,
            author_role_snapshot = 'MEMBER',
            author_member_type_snapshot = 'MEMBER'
      WHERE user_id = ?
        AND author_nickname_snapshot IS NULL
        AND author_role_snapshot IS NULL
        AND author_member_type_snapshot IS NULL`,
    [authorNickname, userId]
  );

  return {
    posts: Number(postResult.affectedRows || 0),
    comments: Number(commentResult.affectedRows || 0)
  };
}

async function recordBusinessProfileRejectionHistory(userId, { rejectionReason = '', reviewedBy = null } = {}) {
  const normalizedRejectionReason = String(rejectionReason || '').trim().slice(0, 500);
  if (!normalizedRejectionReason) return;

  const pool = getPool();
  await pool.query(
    `INSERT INTO business_profile_rejection_histories (user_id, rejection_reason, reviewed_by)
     VALUES (?, ?, ?)`,
    [userId, normalizedRejectionReason, reviewedBy || null]
  );
}

async function updateBusinessProfileReviewByUserId(userId, { approvalStatus = 'PENDING', rejectionReason = '', reviewedBy = null } = {}) {
  const normalizedApprovalStatus = String(approvalStatus || 'PENDING').trim().toUpperCase();
  await updateBusinessProfileReviewRecordByUserId(userId, {
    approvalStatus: normalizedApprovalStatus,
    rejectionReason
  });

  if (normalizedApprovalStatus === 'REJECTED') {
    await recordBusinessProfileRejectionHistory(userId, { rejectionReason, reviewedBy });
  }
}

async function reviewBusinessApplication(userId, { approvalStatus = 'PENDING', rejectionReason = '', reviewedBy = null } = {}) {
  const normalizedApprovalStatus = String(approvalStatus || 'PENDING').trim().toUpperCase();
  const user = await findUserById(userId);
  const wasBusinessMember = String(user?.member_type || user?.memberType || '').toUpperCase() === 'BUSINESS';

  if (normalizedApprovalStatus === 'APPROVED' && !wasBusinessMember) {
    await freezeUserCommunityAuthorSnapshotsBeforeBusinessConversion(userId);
  }

  await updateBusinessProfileReviewByUserId(userId, {
    approvalStatus: normalizedApprovalStatus,
    rejectionReason,
    reviewedBy
  });

  if (normalizedApprovalStatus === 'APPROVED') {
    await updateUserMemberType(userId, 'BUSINESS');
  } else if (normalizedApprovalStatus === 'REJECTED' && !wasBusinessMember) {
    await updateUserMemberType(userId, 'MEMBER');
  }
}

async function listUsers() {
  const pool = getPool();
  const [rows] = await pool.query(
    `SELECT u.*,
            u.login_id AS loginId,
            u.login_id AS userLoginId,
            bp.company_name AS businessCompanyName,
            bp.business_registration_number AS businessRegistrationNumber,
            bp.manager_name AS businessManagerName,
            bp.contact_phone AS businessContactPhone,
            bp.approval_status AS businessApprovalStatus,
            bp.registration_status AS businessRegistrationStatus
       FROM users u
       LEFT JOIN business_profiles bp ON bp.user_id = u.id
      WHERE u.role IN ('MEMBER', 'BUSINESS')
      ORDER BY u.created_at DESC, u.id DESC`
  );
  const resolvedRows = [];
  for (const row of rows) {
    const resolved = await ensureResolvedLoginRestriction(row);
    const source = resolved || row;
    resolvedRows.push({
      ...pickUserRow(source),
      loginId: source.loginId || source.login_id || source.userLoginId || '',
      userLoginId: source.userLoginId || source.login_id || source.loginId || '',
      businessCompanyName: source.businessCompanyName || '',
      businessRegistrationNumber: source.businessRegistrationNumber || '',
      businessManagerName: source.businessManagerName || '',
      businessContactPhone: source.businessContactPhone || '',
      businessApprovalStatus: source.businessApprovalStatus || '',
      businessRegistrationStatus: source.businessRegistrationStatus || ''
    });
  }
  return resolvedRows;
}

async function listAdmins() {
  const pool = getPool();
  const [rows] = await pool.query(
    `SELECT *
     FROM users
     WHERE role = 'ADMIN'
     ORDER BY created_at DESC, id DESC`
  );
  const resolvedRows = [];
  for (const row of rows) {
    const resolved = await ensureResolvedLoginRestriction(row);
    resolvedRows.push({
      ...pickUserRow(resolved || row),
      isMasterAdmin: String((resolved || row)?.login_id || '').trim().toLowerCase() === 'master'
    });
  }
  return resolvedRows;
}

async function findUserById(userId) {
  const pool = getPool();
  const [rows] = await pool.query('SELECT * FROM users WHERE id = ?', [userId]);
  return ensureResolvedLoginRestriction(rows[0] || null);
}

async function getUserDetail(userId) {
  const user = await findUserById(userId);
  if (!user) return null;

  const businessProfile = await getBusinessProfileByUserId(userId);
  return {
    ...pickUserRow(user),
    businessProfile: businessProfile ? {
      registrationStatus: businessProfile.registrationStatus || 'UNREGISTERED',
      approvalStatus: businessProfile.approvalStatus || 'PENDING',
      rejectionReason: businessProfile.rejectionReason || '',
      rejectionHistories: await listBusinessProfileRejectionHistories(userId)
    } : null
  };
}

async function getUserActivityOverview(userId, { limit = 1000 } = {}) {
  const safeLimit = Math.max(1, Math.min(1000, Number(limit) || 1000));
  const [stats, activityDetails, loginHistories] = await Promise.all([
    getUserActivityStats(userId),
    getUserActivityDetails(userId, { limit: safeLimit }),
    getUserLoginHistories(userId, { limit: safeLimit })
  ]);

  return {
    stats: {
      postCount: Number(stats.postCount || 0),
      commentCount: Number(stats.commentCount || 0),
      attendanceCount: Number(stats.attendanceCount || 0),
      reviewCount: Number(stats.reviewCount || 0),
      recommendCount: Number(stats.recommendCount || 0)
    },
    recentPosts: activityDetails.posts.map((post) => ({
      id: Number(post.id),
      title: post.title,
      boardType: post.boardType,
      createdAt: post.createdAt,
      likeCount: Number(post.likeCount || 0),
      commentCount: Number(post.commentCount || 0)
    })),
    recentComments: activityDetails.comments.map((comment) => ({
      id: Number(comment.id),
      postId: Number(comment.postId),
      postTitle: comment.postTitle,
      postBoardType: comment.postBoardType,
      content: comment.content,
      createdAt: comment.createdAt
    })),
    recentLikedPosts: activityDetails.likedPosts.map((post) => ({
      id: Number(post.id),
      title: post.title,
      boardType: post.boardType,
      createdAt: post.createdAt,
      likedAt: post.likedAt,
      likeCount: Number(post.likeCount || 0),
      commentCount: Number(post.commentCount || 0)
    })),
    loginHistories: loginHistories.map((history) => ({
      id: Number(history.id),
      ipAddress: history.ipAddress,
      userAgent: history.userAgent,
      createdAt: history.createdAt
    }))
  };
}

async function updateUserRole(userId, role) {
  const pool = getPool();
  const normalizedRole = String(role || '').trim().toUpperCase();

  if (normalizedRole !== 'BUSINESS') {
    await pool.query('UPDATE users SET role = ? WHERE id = ?', [normalizedRole, userId]);
    return;
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    await freezeUserCommunityAuthorSnapshotsBeforeBusinessConversion(userId, connection);
    await connection.query('UPDATE users SET role = ?, member_type = ? WHERE id = ?', [normalizedRole, 'BUSINESS', userId]);
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}


async function updateUserMemberType(userId, memberType) {
  const pool = getPool();
  const normalizedMemberType = String(memberType || '').trim().toUpperCase();

  if (normalizedMemberType !== 'BUSINESS') {
    await pool.query('UPDATE users SET member_type = ? WHERE id = ?', [memberType, userId]);
    return;
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    await freezeUserCommunityAuthorSnapshotsBeforeBusinessConversion(userId, connection);
    await connection.query('UPDATE users SET member_type = ? WHERE id = ?', [normalizedMemberType, userId]);
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function updateUserByAdmin(userId, payload) {
  const pool = getPool();
  const fields = [];
  const values = [];
  const hasNicknameUpdate = Object.prototype.hasOwnProperty.call(payload, 'nickname');

  if (hasNicknameUpdate) {
    fields.push('nickname = ?');
    values.push(payload.nickname);
  }

  if (Object.prototype.hasOwnProperty.call(payload, 'password')) {
    fields.push('password = ?');
    values.push(payload.password);
  }

  if (Object.prototype.hasOwnProperty.call(payload, 'phone')) {
    fields.push('phone = ?');
    values.push(payload.phone || null);
  }

  if (Object.prototype.hasOwnProperty.call(payload, 'sms_consent')) {
    fields.push('sms_consent = ?');
    values.push(payload.sms_consent ? 1 : 0);
  }

  if (Object.prototype.hasOwnProperty.call(payload, 'role')) {
    fields.push('role = ?');
    values.push(payload.role);
  }

  if (Object.prototype.hasOwnProperty.call(payload, 'member_type')) {
    fields.push('member_type = ?');
    values.push(payload.member_type);
  }

  if (Object.prototype.hasOwnProperty.call(payload, 'account_status')) {
    fields.push('account_status = ?');
    values.push(payload.account_status);
  }

  if (Object.prototype.hasOwnProperty.call(payload, 'login_restricted_until')) {
    fields.push('login_restricted_until = ?');
    values.push(payload.login_restricted_until);
  }

  if (Object.prototype.hasOwnProperty.call(payload, 'is_login_restriction_permanent')) {
    fields.push('is_login_restriction_permanent = ?');
    values.push(payload.is_login_restriction_permanent ? 1 : 0);
  }

  if (Object.prototype.hasOwnProperty.call(payload, 'total_points')) {
    fields.push('total_points = ?');
    values.push(payload.total_points);
  }

  if (!fields.length) return;

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [rows] = await connection.query(
      'SELECT role, member_type FROM users WHERE id = ? LIMIT 1 FOR UPDATE',
      [userId]
    );
    const wasBusinessAccount = String(rows[0]?.role || '').toUpperCase() === 'BUSINESS'
      || String(rows[0]?.member_type || '').toUpperCase() === 'BUSINESS';

    const willBecomeBusinessAccount = String(payload.role || '').toUpperCase() === 'BUSINESS'
      || String(payload.member_type || payload.memberType || '').toUpperCase() === 'BUSINESS';

    if (!wasBusinessAccount && willBecomeBusinessAccount) {
      await freezeUserCommunityAuthorSnapshotsBeforeBusinessConversion(userId, connection);
    }

    values.push(userId);
    await connection.query(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`, values);

    if (wasBusinessAccount && hasNicknameUpdate) {
      await updateBusinessAuthorNicknameSnapshots(userId, payload.nickname, connection);
    }

    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function adjustUserPointsByAdmin(userId, { amount, reason, actionType }) {
  const pool = getPool();
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();
    if (actionType === 'ADMIN_ADJUST_ADD') {
      await connection.query('UPDATE users SET total_points = total_points + ? WHERE id = ?', [amount, userId]);
    } else {
      await connection.query('UPDATE users SET total_points = GREATEST(total_points - ?, 0) WHERE id = ?', [amount, userId]);
    }
    await connection.query(
      'INSERT INTO point_histories (user_id, action_type, points, reason) VALUES (?, ?, ?, ?)',
      [userId, actionType, actionType === 'ADMIN_ADJUST_ADD' ? amount : -amount, reason]
    );
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function deleteUser(userId) {
  const pool = getPool();
  await pool.query('DELETE FROM users WHERE id = ?', [userId]);
}

async function listAds() {
  const pool = getPool();
  const [rows] = await pool.query(
    `SELECT id, title, image_url AS imageUrl, link_url AS linkUrl,
            ad_type AS adType, store_no AS storeNo, display_order AS displayOrder,
            is_active AS isActive, created_at AS createdAt, updated_at AS updatedAt
     FROM banner_ads
     ORDER BY store_no IS NULL ASC, store_no ASC, display_order ASC, id DESC`
  );
  return rows;
}

async function createAd({ title, imageUrl, linkUrl, adType = 'LIVE', storeNo = null, displayOrder = 0, isActive = true }) {
  const pool = getPool();
  const [result] = await pool.query(
    `INSERT INTO banner_ads (title, image_url, link_url, ad_type, store_no, display_order, is_active)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [title, imageUrl, linkUrl, adType, storeNo, displayOrder, isActive ? 1 : 0]
  );
  return result.insertId;
}

async function findAdById(adId) {
  const pool = getPool();
  const [rows] = await pool.query(
    `SELECT id, title, image_url AS imageUrl, link_url AS linkUrl, ad_type AS adType, store_no AS storeNo
       FROM banner_ads
      WHERE id = ?`,
    [adId]
  );
  return rows[0] || null;
}

async function updateAd(adId, { title, imageUrl, linkUrl, adType = 'LIVE', storeNo = null, displayOrder = 0, isActive = true }) {
  const pool = getPool();
  await pool.query(
    `UPDATE banner_ads
     SET title = ?, image_url = ?, link_url = ?, ad_type = ?, store_no = ?, display_order = ?, is_active = ?
     WHERE id = ?`,
    [title, imageUrl, linkUrl, adType, storeNo, displayOrder, isActive ? 1 : 0, adId]
  );
}

async function listLiveAdsByStore(storeNo) {
  const pool = getPool();
  const normalizedStoreNo = Number.parseInt(storeNo, 10);
  if (!Number.isInteger(normalizedStoreNo) || normalizedStoreNo <= 0) return [];

  const [rows] = await pool.query(
    `SELECT id, title, image_url AS imageUrl, link_url AS linkUrl,
            ad_type AS adType, store_no AS storeNo, display_order AS displayOrder
       FROM banner_ads
      WHERE is_active = 1
        AND ad_type = 'LIVE'
        AND store_no = ?
      ORDER BY display_order ASC, id DESC`,
    [normalizedStoreNo]
  );

  return rows;
}

async function listTopAdsByPlacement(placement = 'HOME') {
  const pool = getPool();
  const normalizedPlacement = String(placement || 'HOME').trim().toUpperCase();
  const placementStoreNoMap = {
    HOME: 1,
    COMMUNITY: 2
  };
  const placementStoreNo = placementStoreNoMap[normalizedPlacement];

  if (!placementStoreNo) return [];

  const [rows] = await pool.query(
    `SELECT id, title, image_url AS imageUrl, link_url AS linkUrl,
            ad_type AS adType, store_no AS storeNo, display_order AS displayOrder
       FROM banner_ads
      WHERE is_active = 1
        AND ad_type = 'TOP'
        AND store_no = ?
      ORDER BY display_order ASC, id DESC`,
    [placementStoreNo]
  );

  return rows;
}

async function deleteAd(adId) {
  const pool = getPool();
  await pool.query('DELETE FROM banner_ads WHERE id = ?', [adId]);
}

async function listBusinessAdsByOwner(ownerUserId) {
  await renewExpiredBusinessAdsWithStamp();
  await resetBusinessAdDailyJumps();
  const pool = getPool();
  const [rows] = await pool.query(
    `SELECT id, owner_user_id AS ownerUserId, business_name AS businessName, manager_name AS managerName, manager_contact AS managerContact,
            title, image_url AS imageUrl, link_url AS linkUrl,
            region, district, category, open_hour AS openHour, close_hour AS closeHour,
            kakao_talk_id AS kakaoTalkId, telegram_id AS telegramId, show_business_address_map AS showBusinessAddressMap, use_visit_verification AS useVisitVerification, use_stamp_event AS useStampEvent, stamp_event_description AS stampEventDescription, stamp_event_count AS stampEventCount,
            description, plan_type AS planType, view_count AS viewCount, daily_jump_remaining AS dailyJumpRemaining, jump_reset_date AS jumpResetDate, jumped_at AS jumpedAt,
            registration_status AS registrationStatus, activated_at AS activatedAt, activated_until AS activatedUntil, piece_activated_at AS pieceActivatedAt, piece_activated_until AS pieceActivatedUntil, (piece_is_active = 1 AND piece_activated_until IS NOT NULL AND piece_activated_until > NOW()) AS isPieceActive, (piece_activated_until IS NOT NULL AND piece_activated_until > NOW()) AS isPieceCurrentlyVisible, GREATEST(TIMESTAMPDIFF(SECOND, NOW(), piece_activated_until), 0) AS pieceRemainingSeconds, display_order AS displayOrder, (is_active = 1 AND activated_until IS NOT NULL AND activated_until > NOW()) AS isActive, (activated_until IS NOT NULL AND activated_until > NOW()) AS isCurrentlyVisible, GREATEST(TIMESTAMPDIFF(SECOND, NOW(), activated_until), 0) AS remainingSeconds, GREATEST(TIMESTAMPDIFF(SECOND, NOW(), DATE_ADD(jumped_at, INTERVAL 10 MINUTE)), 0) AS jumpCooldownSeconds, created_at AS createdAt, updated_at AS updatedAt
       FROM business_ads
      WHERE owner_user_id = ?
      ORDER BY display_order ASC, id DESC`,
    [ownerUserId]
  );
  return rows;
}

async function listPublicBusinessAdAreas() {
  await renewExpiredBusinessAdsWithStamp();
  await resetBusinessAdDailyJumps();
  const pool = getPool();
  const [rows] = await pool.query(
    `SELECT TRIM(ba.region) AS region, TRIM(COALESCE(ba.district, '')) AS district, COUNT(*) AS adCount
       FROM business_ads ba
      WHERE ${getBusinessAdPublicVisibilityCondition('ba')}
        AND TRIM(COALESCE(ba.region, '')) <> ''
      GROUP BY TRIM(ba.region), TRIM(COALESCE(ba.district, ''))
      ORDER BY MIN(ba.display_order) ASC, TRIM(ba.region) ASC, TRIM(COALESCE(ba.district, '')) ASC`
  );

  return rows;
}

async function listPublicBusinessAds({ region = '', district = '', category = '', keyword = '' } = {}) {
  await renewExpiredBusinessAdsWithStamp();
  await resetBusinessAdDailyJumps();
  const pool = getPool();
  const whereConditions = [getBusinessAdPublicVisibilityCondition('ba')];
  const whereParams = [];

  if (region) {
    whereConditions.push('ba.region = ?');
    whereParams.push(region);
  }

  if (district) {
    whereConditions.push('ba.district = ?');
    whereParams.push(district);
  }

  if (category) {
    whereConditions.push('ba.category = ?');
    whereParams.push(category);
  }

  if (keyword) {
    whereConditions.push('(ba.title LIKE ? OR COALESCE(u.nickname, \'\') LIKE ?)');
    whereParams.push(`%${keyword}%`, `%${keyword}%`);
  }

  const [rows] = await pool.query(
    `SELECT ba.id, ba.owner_user_id AS ownerUserId, ba.business_name AS businessName, ba.manager_name AS managerName, ba.manager_contact AS managerContact,
            ba.title, ba.image_url AS imageUrl, ba.link_url AS linkUrl,
            ba.region, ba.district, ba.category, ba.open_hour AS openHour, ba.close_hour AS closeHour,
            ba.kakao_talk_id AS kakaoTalkId, ba.telegram_id AS telegramId, ba.show_business_address_map AS showBusinessAddressMap, ba.use_visit_verification AS useVisitVerification, ba.use_stamp_event AS useStampEvent, ba.stamp_event_description AS stampEventDescription, ba.stamp_event_count AS stampEventCount,
            ba.description, ba.plan_type AS planType, ba.display_order AS displayOrder, ba.daily_jump_remaining AS dailyJumpRemaining, ba.jump_reset_date AS jumpResetDate, ba.jumped_at AS jumpedAt, ba.activated_at AS activatedAt, ba.activated_until AS activatedUntil, ba.piece_activated_at AS pieceActivatedAt, ba.piece_activated_until AS pieceActivatedUntil, (ba.piece_is_active = 1 AND ba.piece_activated_until IS NOT NULL AND ba.piece_activated_until > NOW()) AS isPieceActive, (ba.piece_activated_until IS NOT NULL AND ba.piece_activated_until > NOW()) AS isPieceCurrentlyVisible, GREATEST(TIMESTAMPDIFF(SECOND, NOW(), ba.piece_activated_until), 0) AS pieceRemainingSeconds, ba.created_at AS createdAt,
            ba.view_count AS viewCount, ba.registration_status AS registrationStatus, COALESCE(u.nickname, '업체') AS ownerNickname,
            COALESCE(ad_days.cumulativeAdDays, 0) AS cumulativeAdDays,
            COALESCE(bp.company_name, '') AS companyName, COALESCE(bp.manager_name, '') AS profileManagerName,
            COALESCE(JSON_UNQUOTE(JSON_EXTRACT(COALESCE(bp.last_approved_business_info, bp.business_info), '$.businessName')), COALESCE(bp.company_name, '')) AS businessDisclosureName,
            COALESCE(JSON_UNQUOTE(JSON_EXTRACT(COALESCE(bp.last_approved_business_info, bp.business_info), '$.businessOwner')), COALESCE(bp.manager_name, '')) AS businessDisclosureOwner,
            COALESCE(JSON_UNQUOTE(JSON_EXTRACT(COALESCE(bp.last_approved_business_info, bp.business_info), '$.businessAddress')), '') AS businessAddress,
            COALESCE(JSON_UNQUOTE(JSON_EXTRACT(COALESCE(bp.last_approved_business_info, bp.business_info), '$.businessAddressDetail')), '') AS businessAddressDetail
       FROM business_ads ba
       LEFT JOIN users u ON u.id = ba.owner_user_id
       LEFT JOIN business_profiles bp ON bp.user_id = ba.owner_user_id
       LEFT JOIN (
         SELECT user_id,
                COALESCE(SUM(
                  CASE action_type
                    WHEN 'BUSINESS_AD_PREMIUM' THEN 1
                    WHEN 'BUSINESS_AD_PLUS' THEN 2
                    WHEN 'BUSINESS_AD_BASIC' THEN 3
                    ELSE 0
                  END * ABS(amount)
                ), 0) AS cumulativeAdDays
           FROM stamp_histories
          WHERE stamp_type = 'BUSINESS'
            AND amount < 0
            AND action_type IN ('BUSINESS_AD_PREMIUM','BUSINESS_AD_PLUS','BUSINESS_AD_BASIC')
          GROUP BY user_id
       ) ad_days ON ad_days.user_id = ba.owner_user_id
      WHERE ${whereConditions.join(' AND ')}
      ORDER BY CASE ba.plan_type WHEN 'PREMIUM' THEN 0 WHEN 'PLUS' THEN 1 ELSE 2 END, CASE WHEN ba.jumped_at IS NULL THEN 1 ELSE 0 END, ba.jumped_at DESC, ba.display_order ASC, ba.id DESC`,
    whereParams
  );

  return rows;
}


async function listBusinessAdsForAdmin() {
  await renewExpiredBusinessAdsWithStamp();
  const pool = getPool();
  const [rows] = await pool.query(
    `SELECT ba.id, ba.owner_user_id AS ownerUserId, ba.business_name AS businessName, ba.manager_name AS managerName, ba.manager_contact AS managerContact,
            ba.title, ba.image_url AS imageUrl, ba.link_url AS linkUrl, ba.region, ba.district, ba.category, ba.open_hour AS openHour, ba.close_hour AS closeHour,
            ba.kakao_talk_id AS kakaoTalkId, ba.telegram_id AS telegramId, ba.show_business_address_map AS showBusinessAddressMap, ba.use_visit_verification AS useVisitVerification,
            ba.use_stamp_event AS useStampEvent, ba.stamp_event_description AS stampEventDescription, ba.stamp_event_count AS stampEventCount, ba.description, ba.plan_type AS planType,
            ba.view_count AS viewCount, ba.registration_status AS registrationStatus, ba.activated_at AS activatedAt, ba.activated_until AS activatedUntil, ba.display_order AS displayOrder,
            (ba.is_active = 1) AS isActive, (ba.piece_is_active = 1 AND ba.piece_activated_until IS NOT NULL AND ba.piece_activated_until > NOW()) AS isPieceActive, (ba.piece_activated_until IS NOT NULL AND ba.piece_activated_until > NOW()) AS isPieceCurrentlyVisible, GREATEST(TIMESTAMPDIFF(SECOND, NOW(), ba.piece_activated_until), 0) AS pieceRemainingSeconds, (ba.activated_until IS NOT NULL AND ba.activated_until > NOW()) AS isCurrentlyVisible, GREATEST(TIMESTAMPDIFF(SECOND, NOW(), ba.activated_until), 0) AS remainingSeconds, ba.created_at AS createdAt, ba.updated_at AS updatedAt,
            COALESCE(u.login_id, '') AS ownerLoginId, COALESCE(u.nickname, '') AS ownerNickname, COALESCE(bp.company_name, '') AS ownerCompanyName
       FROM business_ads ba
       LEFT JOIN users u ON u.id = ba.owner_user_id
       LEFT JOIN business_profiles bp ON bp.user_id = ba.owner_user_id
      ORDER BY ba.id DESC`
  );
  return rows;
}

async function createBusinessAd({
  ownerUserId,
  businessName = '',
  managerName = '',
  managerContact = '',
  title,
  imageUrl,
  linkUrl,
  region = '',
  district = '',
  category = '',
  openHour = '',
  closeHour = '',
  description = '',
  kakaoTalkId = '',
  telegramId = '',
  showBusinessAddressMap = false,
  useVisitVerification = false,
  useStampEvent = false,
  stampEventDescription = '',
  stampEventCount = 0,
  planType = 'BASIC',
  displayOrder = 0,
  isActive = true,
  registrationStatus = 'UNREGISTERED'
}) {
  const pool = getPool();
  const [result] = await pool.query(
    `INSERT INTO business_ads (
      owner_user_id, business_name, manager_name, manager_contact, title, image_url, link_url, region, district, category, open_hour, close_hour,
      kakao_talk_id, telegram_id, show_business_address_map, use_visit_verification, use_stamp_event, stamp_event_description, stamp_event_count, description, plan_type, registration_status, display_order, is_active
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [ownerUserId, businessName, managerName, managerContact, title, imageUrl, linkUrl, region, district, category, openHour, closeHour, kakaoTalkId, telegramId, showBusinessAddressMap ? 1 : 0, useVisitVerification ? 1 : 0, useStampEvent ? 1 : 0, stampEventDescription, Number(stampEventCount) || 0, description, normalizeBusinessAdPlanType(planType), registrationStatus, displayOrder, isActive ? 1 : 0]
  );
  return result.insertId;
}

async function findPublicBusinessAdById(adId) {
  await renewExpiredBusinessAdsWithStamp();
  await resetBusinessAdDailyJumps();
  const pool = getPool();
  const [rows] = await pool.query(
    `SELECT ba.id, ba.owner_user_id AS ownerUserId, ba.business_name AS businessName, ba.manager_name AS managerName, ba.manager_contact AS managerContact,
            ba.title, ba.image_url AS imageUrl, ba.link_url AS linkUrl,
            ba.region, ba.district, ba.category, ba.open_hour AS openHour, ba.close_hour AS closeHour,
            ba.kakao_talk_id AS kakaoTalkId, ba.telegram_id AS telegramId, ba.show_business_address_map AS showBusinessAddressMap, ba.use_visit_verification AS useVisitVerification, ba.use_stamp_event AS useStampEvent, ba.stamp_event_description AS stampEventDescription, ba.stamp_event_count AS stampEventCount,
            ba.description, ba.plan_type AS planType, ba.display_order AS displayOrder, ba.daily_jump_remaining AS dailyJumpRemaining, ba.jump_reset_date AS jumpResetDate, ba.jumped_at AS jumpedAt, ba.activated_at AS activatedAt, ba.activated_until AS activatedUntil, ba.piece_activated_at AS pieceActivatedAt, ba.piece_activated_until AS pieceActivatedUntil, (ba.piece_is_active = 1 AND ba.piece_activated_until IS NOT NULL AND ba.piece_activated_until > NOW()) AS isPieceActive, (ba.piece_activated_until IS NOT NULL AND ba.piece_activated_until > NOW()) AS isPieceCurrentlyVisible, GREATEST(TIMESTAMPDIFF(SECOND, NOW(), ba.piece_activated_until), 0) AS pieceRemainingSeconds, ba.created_at AS createdAt, ba.updated_at AS updatedAt,
            ba.view_count AS viewCount, ba.registration_status AS registrationStatus, COALESCE(u.nickname, '업체') AS ownerNickname,
            COALESCE(bp.company_name, '') AS companyName, COALESCE(bp.manager_name, '') AS profileManagerName,
            COALESCE(JSON_UNQUOTE(JSON_EXTRACT(COALESCE(bp.last_approved_business_info, bp.business_info), '$.businessName')), COALESCE(bp.company_name, '')) AS businessDisclosureName,
            COALESCE(JSON_UNQUOTE(JSON_EXTRACT(COALESCE(bp.last_approved_business_info, bp.business_info), '$.businessOwner')), COALESCE(bp.manager_name, '')) AS businessDisclosureOwner,
            COALESCE(JSON_UNQUOTE(JSON_EXTRACT(COALESCE(bp.last_approved_business_info, bp.business_info), '$.businessAddress')), '') AS businessAddress,
            COALESCE(JSON_UNQUOTE(JSON_EXTRACT(COALESCE(bp.last_approved_business_info, bp.business_info), '$.businessAddressDetail')), '') AS businessAddressDetail
       FROM business_ads ba
       LEFT JOIN users u ON u.id = ba.owner_user_id
       LEFT JOIN business_profiles bp ON bp.user_id = ba.owner_user_id
      WHERE ba.id = ?
        AND ${getBusinessAdPublicVisibilityCondition('ba')}
      LIMIT 1`,
    [adId]
  );
  return rows[0] || null;
}


async function findPublicBusinessAdBySlug(slug) {
  const normalizedSlug = normalizeSeoSlug(slug);
  if (!normalizedSlug) return null;

  const slugId = extractTrailingSlugId(normalizedSlug);
  if (slugId) {
    const adById = await findPublicBusinessAdById(slugId);
    if (adById) {
      const canonicalSlug = normalizeSeoSlug(createSeoSlugWithId(adById.title || adById.businessName, adById.id, 'business'));
      const fallbackSlug = normalizeSeoSlug(`business-${adById.id}`);
      const numericSlug = String(adById.id);
      if ([canonicalSlug, fallbackSlug, numericSlug].includes(normalizedSlug)) {
        return adById;
      }
    }
  }

  const ads = await listPublicBusinessAds();
  return ads.find((ad) => normalizeSeoSlug(ad.title || ad.businessName) === normalizedSlug) || null;
}


async function listSeoSitemapBusinessAds(limit = 300) {
  await renewExpiredBusinessAdsWithStamp();
  const pool = getPool();
  const safeLimit = Math.min(Math.max(Number(limit) || 300, 1), 1000);
  const [rows] = await pool.query(
    `SELECT id, title, business_name AS businessName, activated_at AS activatedAt, created_at AS createdAt, updated_at AS updatedAt
       FROM business_ads
      WHERE ${getBusinessAdPublicVisibilityCondition('business_ads')}
      ORDER BY CASE plan_type WHEN 'PREMIUM' THEN 0 WHEN 'PLUS' THEN 1 ELSE 2 END,
               display_order ASC,
               updated_at DESC,
               id DESC
      LIMIT ?`,
    [safeLimit]
  );
  return rows;
}

async function listSeoRssBusinessAds(limit = 30) {
  await renewExpiredBusinessAdsWithStamp();
  const pool = getPool();
  const safeLimit = Math.min(Math.max(Number(limit) || 30, 1), 100);
  const [rows] = await pool.query(
    `SELECT id, title, business_name AS businessName, region, district, category, description,
            activated_at AS activatedAt, created_at AS createdAt, updated_at AS updatedAt
       FROM business_ads
      WHERE ${getBusinessAdPublicVisibilityCondition('business_ads')}
      ORDER BY COALESCE(updated_at, activated_at, created_at) DESC, id DESC
      LIMIT ?`,
    [safeLimit]
  );
  return rows;
}

async function findBusinessAdById(adId) {
  await renewExpiredBusinessAdsWithStamp();
  await resetBusinessAdDailyJumps();
  const pool = getPool();
  const [rows] = await pool.query(
    `SELECT id, owner_user_id AS ownerUserId, business_name AS businessName, manager_name AS managerName, manager_contact AS managerContact,
            title, image_url AS imageUrl, link_url AS linkUrl,
            region, district, category, open_hour AS openHour, close_hour AS closeHour,
            kakao_talk_id AS kakaoTalkId, telegram_id AS telegramId, show_business_address_map AS showBusinessAddressMap, use_visit_verification AS useVisitVerification, use_stamp_event AS useStampEvent, stamp_event_description AS stampEventDescription, stamp_event_count AS stampEventCount,
            description, plan_type AS planType, view_count AS viewCount, daily_jump_remaining AS dailyJumpRemaining, jump_reset_date AS jumpResetDate, jumped_at AS jumpedAt,
            registration_status AS registrationStatus, activated_at AS activatedAt, activated_until AS activatedUntil, piece_activated_at AS pieceActivatedAt, piece_activated_until AS pieceActivatedUntil, (piece_is_active = 1 AND piece_activated_until IS NOT NULL AND piece_activated_until > NOW()) AS isPieceActive, (piece_activated_until IS NOT NULL AND piece_activated_until > NOW()) AS isPieceCurrentlyVisible, GREATEST(TIMESTAMPDIFF(SECOND, NOW(), piece_activated_until), 0) AS pieceRemainingSeconds, display_order AS displayOrder, (is_active = 1 AND activated_until IS NOT NULL AND activated_until > NOW()) AS isActive, (activated_until IS NOT NULL AND activated_until > NOW()) AS isCurrentlyVisible, GREATEST(TIMESTAMPDIFF(SECOND, NOW(), activated_until), 0) AS remainingSeconds, created_at AS createdAt, updated_at AS updatedAt
       FROM business_ads
      WHERE id = ?`,
    [adId]
  );
  return rows[0] || null;
}

async function updateBusinessAd(adId, {
  businessName = '',
  managerName = '',
  managerContact = '',
  title,
  imageUrl,
  linkUrl,
  region = '',
  district = '',
  category = '',
  openHour = '',
  closeHour = '',
  description = '',
  kakaoTalkId = '',
  telegramId = '',
  showBusinessAddressMap = false,
  useVisitVerification = false,
  useStampEvent = false,
  stampEventDescription = '',
  stampEventCount = 0,
  planType = 'BASIC',
  displayOrder = 0,
  isActive = true,
  registrationStatus = 'UNREGISTERED'
}) {
  const pool = getPool();
  await pool.query(
    `UPDATE business_ads
     SET business_name = ?, manager_name = ?, manager_contact = ?, title = ?, image_url = ?, link_url = ?, region = ?, district = ?, category = ?, open_hour = ?, close_hour = ?,
         kakao_talk_id = ?, telegram_id = ?, show_business_address_map = ?, use_visit_verification = ?, use_stamp_event = ?, stamp_event_description = ?, stamp_event_count = ?, description = ?, plan_type = ?, registration_status = ?, display_order = ?, is_active = ?
     WHERE id = ?`,
    [businessName, managerName, managerContact, title, imageUrl, linkUrl, region, district, category, openHour, closeHour, kakaoTalkId, telegramId, showBusinessAddressMap ? 1 : 0, useVisitVerification ? 1 : 0, useStampEvent ? 1 : 0, stampEventDescription, Number(stampEventCount) || 0, description, normalizeBusinessAdPlanType(planType), registrationStatus, displayOrder, isActive ? 1 : 0, adId]
  );
}

async function increaseBusinessAdViewCount(adId) {
  const normalizedAdId = Number.parseInt(adId, 10);
  if (!Number.isInteger(normalizedAdId) || normalizedAdId <= 0) return false;

  const pool = getPool();
  const [result] = await pool.query(
    `UPDATE business_ads
        SET view_count = view_count + 1
      WHERE id = ?
        AND ((activated_until IS NOT NULL AND activated_until > NOW()) OR (piece_activated_until IS NOT NULL AND piece_activated_until > NOW()))
        AND registration_status = 'REGISTERED'`,
    [normalizedAdId]
  );
  return result.affectedRows > 0;
}


async function setPieceAdActivationOff(adId) {
  const pool = getPool();
  await pool.query(
    `UPDATE business_ads
        SET piece_is_active = 0
      WHERE id = ?`,
    [adId]
  );
}

async function setBusinessAdActivationOff(adId) {
  const pool = getPool();
  await pool.query(
    `UPDATE business_ads
        SET is_active = 0
      WHERE id = ?`,
    [adId]
  );
}

async function activateBusinessAdWithStamp({ adId, ownerUserId, planType: requestedPlanType, autoRenew = true }) {
  const pool = getPool();
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();
    const [adRows] = await connection.query(
      `SELECT id, owner_user_id AS ownerUserId, plan_type AS planType, registration_status AS registrationStatus, activated_at AS activatedAt, activated_until AS activatedUntil
         FROM business_ads
        WHERE id = ?
          AND owner_user_id = ?
        FOR UPDATE`,
      [adId, ownerUserId]
    );
    const ad = adRows[0];
    if (!ad) {
      const error = new Error('광고를 찾을 수 없습니다.');
      error.status = 404;
      throw error;
    }
    if (ad.registrationStatus !== 'REGISTERED') {
      const error = new Error('등록 완료된 광고만 활성화할 수 있습니다.');
      error.status = 400;
      throw error;
    }

    const [activeRows] = await connection.query('SELECT (? IS NOT NULL AND ? > NOW()) AS isActivePeriod', [ad.activatedUntil, ad.activatedUntil]);
    if (Number(activeRows[0]?.isActivePeriod || 0) === 1) {
      await connection.query('UPDATE business_ads SET is_active = ? WHERE id = ?', [autoRenew ? 1 : 0, adId]);
      await connection.commit();
      return {
        consumedStampCount: 0,
        planType: normalizeBusinessAdPlanType(ad.planType),
        durationDays: getBusinessAdPlanDurationDays(ad.planType),
        durationLabel: getBusinessAdPlanDurationLabel(ad.planType),
        activatedAt: ad.activatedAt || null,
        activatedUntil: ad.activatedUntil,
        isCurrentlyVisible: true
      };
    }

    const planType = normalizeBusinessAdPlanType(requestedPlanType || ad.planType);
    const durationDays = getBusinessAdPlanDurationDays(planType);
    const actionType = `BUSINESS_AD_${planType}`;
    await connection.query('SELECT id FROM users WHERE id = ? FOR UPDATE', [ownerUserId]);
    const [balanceRows] = await connection.query(
      `SELECT COALESCE(SUM(amount), 0) AS totalStamps
         FROM stamp_histories
        WHERE user_id = ?
          AND stamp_type = 'BUSINESS'
        FOR UPDATE`,
      [ownerUserId]
    );
    const balance = Number(balanceRows[0]?.totalStamps || 0);
    if (balance < 1) {
      const error = new Error('광고 활성화에 필요한 비즈니스 스탬프가 부족합니다.');
      error.status = 400;
      throw error;
    }

    await connection.query(
      `INSERT INTO stamp_histories (user_id, stamp_type, action_type, amount, reason, source_label)
       VALUES (?, 'BUSINESS', ?, -1, ?, ?)`,
      [ownerUserId, actionType, `${planType} 광고 ${getBusinessAdPlanDurationLabel(planType)} 활성화`, `BUSINESS_AD-${adId}`]
    );
    await connection.query(
      `UPDATE business_ads
          SET is_active = ?, plan_type = ?, activated_at = ${BUSINESS_AD_CURRENT_MINUTE_SQL}, activated_until = DATE_ADD(${BUSINESS_AD_CURRENT_MINUTE_SQL}, INTERVAL ? ${BUSINESS_AD_PLAN_DURATION_UNIT_SQL}),
              daily_jump_remaining = ?,
              jump_reset_date = CURDATE(),
              jumped_at = NULL
        WHERE id = ?`,
      [autoRenew ? 1 : 0, planType, durationDays, getBusinessAdPlanJumpCount(planType), adId]
    );
    const [[updatedAd]] = await connection.query('SELECT activated_at AS activatedAt, activated_until AS activatedUntil FROM business_ads WHERE id = ?', [adId]);
    await connection.commit();
    return {
      consumedStampCount: 1,
      planType,
      durationDays,
      durationLabel: getBusinessAdPlanDurationLabel(planType),
      activatedAt: updatedAd?.activatedAt || null,
      activatedUntil: updatedAd?.activatedUntil || null,
      isCurrentlyVisible: true
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}


async function activatePieceAdWithStamp({ adId, ownerUserId, autoRenew = true }) {
  const pool = getPool();
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();
    const [adRows] = await connection.query(
      `SELECT id, owner_user_id AS ownerUserId, registration_status AS registrationStatus, piece_activated_at AS pieceActivatedAt, piece_activated_until AS pieceActivatedUntil
         FROM business_ads
        WHERE id = ?
          AND owner_user_id = ?
        FOR UPDATE`,
      [adId, ownerUserId]
    );
    const ad = adRows[0];
    if (!ad) { const error = new Error('광고를 찾을 수 없습니다.'); error.status = 404; throw error; }
    if (ad.registrationStatus !== 'REGISTERED') { const error = new Error('등록 완료된 광고만 활성화할 수 있습니다.'); error.status = 400; throw error; }

    const [businessActiveRows] = await connection.query(
      'SELECT (activated_until IS NOT NULL AND activated_until > NOW()) AS isBusinessActivePeriod FROM business_ads WHERE id = ? AND owner_user_id = ?',
      [adId, ownerUserId]
    );
    if (Number(businessActiveRows[0]?.isBusinessActivePeriod || 0) !== 1) {
      const error = new Error('업체광고가 활성화중인 경우에만 조각제휴 광고를 시작할 수 있습니다.');
      error.status = 400;
      throw error;
    }

    const [activeRows] = await connection.query('SELECT (? IS NOT NULL AND ? > NOW()) AS isActivePeriod', [ad.pieceActivatedUntil, ad.pieceActivatedUntil]);
    if (Number(activeRows[0]?.isActivePeriod || 0) === 1) {
      await connection.query('UPDATE business_ads SET piece_is_active = ? WHERE id = ?', [autoRenew ? 1 : 0, adId]);
      await connection.commit();
      return { consumedStampCount: 0, planType: BUSINESS_AD_PIECE_PLAN_TYPE, durationDays: BUSINESS_AD_PIECE_DURATION, durationLabel: getPieceAdDurationLabel(), activatedAt: ad.pieceActivatedAt || null, activatedUntil: ad.pieceActivatedUntil, isCurrentlyVisible: true };
    }

    await connection.query('SELECT id FROM users WHERE id = ? FOR UPDATE', [ownerUserId]);
    const [balanceRows] = await connection.query(`SELECT COALESCE(SUM(amount), 0) AS totalStamps FROM stamp_histories WHERE user_id = ? AND stamp_type = 'BUSINESS' FOR UPDATE`, [ownerUserId]);
    if (Number(balanceRows[0]?.totalStamps || 0) < 1) { const error = new Error('조각제휴 광고 활성화에 필요한 비즈니스 스탬프가 부족합니다.'); error.status = 400; throw error; }

    await connection.query(`INSERT INTO stamp_histories (user_id, stamp_type, action_type, amount, reason, source_label) VALUES (?, 'BUSINESS', 'BUSINESS_AD_PIECE', -1, ?, ?)`, [ownerUserId, `조각제휴 광고 ${getPieceAdDurationLabel()} 활성화`, `BUSINESS_AD_PIECE-${adId}`]);
    await connection.query(
      `UPDATE business_ads SET piece_is_active = ?, piece_activated_at = ${BUSINESS_AD_CURRENT_MINUTE_SQL}, piece_activated_until = DATE_ADD(${BUSINESS_AD_CURRENT_MINUTE_SQL}, INTERVAL ? ${BUSINESS_AD_PIECE_DURATION_UNIT_SQL}) WHERE id = ?`,
      [autoRenew ? 1 : 0, BUSINESS_AD_PIECE_DURATION, adId]
    );
    const [[updatedAd]] = await connection.query('SELECT piece_activated_at AS activatedAt, piece_activated_until AS activatedUntil FROM business_ads WHERE id = ?', [adId]);
    await connection.commit();
    return { consumedStampCount: 1, planType: BUSINESS_AD_PIECE_PLAN_TYPE, durationDays: BUSINESS_AD_PIECE_DURATION, durationLabel: getPieceAdDurationLabel(), activatedAt: updatedAd?.activatedAt || null, activatedUntil: updatedAd?.activatedUntil || null, isCurrentlyVisible: true };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function jumpBusinessAd({ adId, ownerUserId }) {
  const pool = getPool();
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    await resetBusinessAdDailyJumps(connection);
    const [rows] = await connection.query(
      `SELECT id, daily_jump_remaining AS dailyJumpRemaining, jumped_at AS jumpedAt,
              GREATEST(TIMESTAMPDIFF(SECOND, NOW(), DATE_ADD(jumped_at, INTERVAL 10 MINUTE)), 0) AS jumpCooldownSeconds
         FROM business_ads
        WHERE id = ?
          AND owner_user_id = ?
          AND registration_status = 'REGISTERED'
          AND activated_until IS NOT NULL
          AND activated_until > NOW()
        FOR UPDATE`,
      [adId, ownerUserId]
    );
    const ad = rows[0];
    if (!ad) {
      const error = new Error('점프는 활성화 기간의 등록 완료 광고에만 사용할 수 있습니다.');
      error.status = 400;
      throw error;
    }
    const cooldownSeconds = Number(ad.jumpCooldownSeconds || 0);
    if (cooldownSeconds > 0) {
      const error = new Error(`점프는 최근 사용 10분 뒤부터 다시 사용할 수 있습니다. 남은 시간: ${Math.floor(cooldownSeconds / 60)}분 ${cooldownSeconds % 60}초`);
      error.status = 400;
      throw error;
    }
    const remaining = Number(ad.dailyJumpRemaining || 0);
    if (remaining <= 0) {
      const error = new Error('오늘 사용 가능한 점프를 모두 사용했습니다.');
      error.status = 400;
      throw error;
    }
    await connection.query(
      `UPDATE business_ads
          SET daily_jump_remaining = daily_jump_remaining - 1,
              jumped_at = NOW()
        WHERE id = ?`,
      [adId]
    );
    await connection.commit();
    return findBusinessAdById(adId);
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}


function parseJumpScheduleTimes(value) {
  if (!value) return [];
  if (Array.isArray(value)) return normalizeJumpScheduleTimes(value);
  try {
    const parsed = JSON.parse(String(value));
    return normalizeJumpScheduleTimes(parsed);
  } catch (_error) {
    return [];
  }
}

async function listBusinessAdJumpSchedules({ adId, ownerUserId }) {
  const pool = getPool();
  const [adRows] = await pool.query(
    `SELECT id, plan_type AS planType, jump_schedule_times AS jumpScheduleTimes
       FROM business_ads
      WHERE id = ?
        AND owner_user_id = ?
      LIMIT 1`,
    [adId, ownerUserId]
  );
  const ad = adRows[0];
  if (!ad) {
    const error = new Error('광고를 찾을 수 없습니다.');
    error.status = 404;
    throw error;
  }
  return {
    schedules: parseJumpScheduleTimes(ad.jumpScheduleTimes),
    maxScheduleCount: getBusinessAdPlanJumpCount(ad.planType)
  };
}

async function replaceBusinessAdJumpSchedules({ adId, ownerUserId, schedules }) {
  const pool = getPool();
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [adRows] = await connection.query(
      `SELECT id, plan_type AS planType
         FROM business_ads
        WHERE id = ?
          AND owner_user_id = ?
        FOR UPDATE`,
      [adId, ownerUserId]
    );
    const ad = adRows[0];
    if (!ad) {
      const error = new Error('광고를 찾을 수 없습니다.');
      error.status = 404;
      throw error;
    }
    const normalized = validateJumpScheduleTimes(schedules, ad.planType);
    await connection.query(
      `UPDATE business_ads
          SET jump_schedule_times = ?,
              jump_schedule_last_executed_at = NULL
        WHERE id = ?`,
      [JSON.stringify(normalized), adId]
    );
    await connection.commit();
    return { schedules: normalized, maxScheduleCount: getBusinessAdPlanJumpCount(ad.planType) };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function runDueBusinessAdJumpSchedules() {
  const pool = getPool();
  await resetBusinessAdDailyJumps(pool);
  const [[timeRow]] = await pool.query("SELECT DATE_FORMAT(NOW(), '%H:%i') AS currentTime");
  const currentTime = timeRow?.currentTime;
  if (!currentTime) return;
  const [rows] = await pool.query(
    `SELECT id AS adId,
            owner_user_id AS ownerUserId,
            jump_schedule_times AS jumpScheduleTimes
       FROM business_ads
      WHERE registration_status = 'REGISTERED'
        AND activated_until IS NOT NULL
        AND activated_until > NOW()
        AND jump_schedule_times IS NOT NULL
        AND jump_schedule_times <> ''
        AND (jump_schedule_last_executed_at IS NULL OR DATE_FORMAT(jump_schedule_last_executed_at, '%Y-%m-%d %H:%i') < DATE_FORMAT(NOW(), '%Y-%m-%d %H:%i'))
      ORDER BY id ASC
      LIMIT 500`
  );
  for (const row of rows) {
    const schedules = parseJumpScheduleTimes(row.jumpScheduleTimes);
    if (!schedules.includes(currentTime)) continue;
    try {
      await jumpBusinessAd({ adId: row.adId, ownerUserId: row.ownerUserId });
    } catch (error) {
      if (Number(error.status || 500) >= 500) {
        console.error('Business ad jump schedule failed:', error);
        continue;
      }
    }
    await pool.query(
      `UPDATE business_ads
          SET jump_schedule_last_executed_at = CAST(DATE_FORMAT(NOW(), '%Y-%m-%d %H:%i:00') AS DATETIME)
        WHERE id = ?`,
      [row.adId]
    );
  }
}



async function runBusinessAdJumpScheduleWorker() {
  if (businessAdJumpScheduleRunPromise) return businessAdJumpScheduleRunPromise;
  businessAdJumpScheduleRunPromise = runDueBusinessAdJumpSchedules();
  try {
    await businessAdJumpScheduleRunPromise;
  } finally {
    businessAdJumpScheduleRunPromise = null;
  }
}

function startBusinessAdJumpScheduleScheduler() {
  if (businessAdJumpScheduleSchedulerStarted) return businessAdJumpScheduleTimer;
  businessAdJumpScheduleSchedulerStarted = true;
  businessAdJumpScheduleTimer = setInterval(() => {
    runBusinessAdJumpScheduleWorker().catch((error) => console.error('Business ad jump schedule scheduler error:', error));
  }, BUSINESS_AD_JUMP_SCHEDULE_INTERVAL_MS);
  if (typeof businessAdJumpScheduleTimer.unref === 'function') businessAdJumpScheduleTimer.unref();
  runBusinessAdJumpScheduleWorker().catch((error) => console.error('Business ad jump schedule scheduler start failed:', error));
  return businessAdJumpScheduleTimer;
}

function stopBusinessAdJumpScheduleScheduler() {
  businessAdJumpScheduleSchedulerStarted = false;
  if (businessAdJumpScheduleTimer) {
    clearInterval(businessAdJumpScheduleTimer);
    businessAdJumpScheduleTimer = null;
  }
}

async function deleteBusinessAd(adId) {
  const pool = getPool();
  await pool.query('DELETE FROM business_ads WHERE id = ?', [adId]);
}

function encodeEntryId({ storeNo, workerName, createdAtKey }) {
  return Buffer.from(JSON.stringify({
    storeNo: Number(storeNo),
    workerName: String(workerName || ''),
    createdAtKey: Number.parseInt(createdAtKey, 10)
  })).toString('base64url');
}

function decodeEntryId(entryId) {
  try {
    const raw = Buffer.from(String(entryId || ''), 'base64url').toString('utf8');
    const parsed = JSON.parse(raw);
    const storeNo = Number.parseInt(parsed.storeNo, 10);
    const workerName = String(parsed.workerName || '').trim();
    const createdAtKey = Number.parseInt(parsed.createdAtKey, 10);

    if (!Number.isInteger(storeNo) || storeNo <= 0 || !workerName || !Number.isInteger(createdAtKey) || createdAtKey <= 0) {
      return null;
    }

    return { storeNo, workerName, createdAtKey };
  } catch (error) {
    return null;
  }
}

async function listEntryStores() {
  const stores = await listStores();
  return stores.filter((store) => Number.isInteger(store.storeNo) && store.storeNo > 0 && store.storeName);
}

async function listEntries(storeNo) {
  const chatbotPool = await getChatbotPool();
  const normalizedStoreNo = Number.parseInt(storeNo, 10);
  const [rows] = await chatbotPool.query(
    `SELECT storeNo, workerName, mentionCount, insertCount, createdAt,
            UNIX_TIMESTAMP(createdAt) AS createdAtKey
       FROM ENTRY_TODAY
      WHERE storeNo = ?
      ORDER BY createdAt DESC, workerName ASC`,
    [normalizedStoreNo]
  );

  return rows.map((row) => ({
    entryId: encodeEntryId(row),
    storeNo: Number(row.storeNo),
    workerName: String(row.workerName || '').trim(),
    mentionCount: Number(row.mentionCount || 0),
    insertCount: Number(row.insertCount || 0),
    createdAt: row.createdAt
  }));
}

async function findEntryById(entryId) {
  const chatbotPool = await getChatbotPool();
  const decoded = decodeEntryId(entryId);
  if (!decoded) return null;

  const [rows] = await chatbotPool.query(
    `SELECT storeNo, workerName, mentionCount, insertCount, createdAt,
            UNIX_TIMESTAMP(createdAt) AS createdAtKey
       FROM ENTRY_TODAY
      WHERE storeNo = ?
        AND workerName = ?
        AND UNIX_TIMESTAMP(createdAt) = ?
      LIMIT 1`,
    [decoded.storeNo, decoded.workerName, decoded.createdAtKey]
  );

  if (!rows.length) {
    const fallbackRow = await findEntryByStoreAndName(decoded.storeNo, decoded.workerName);
    if (!fallbackRow) return null;

    return {
      entryId: encodeEntryId(fallbackRow),
      storeNo: Number(fallbackRow.storeNo),
      workerName: String(fallbackRow.workerName || '').trim(),
      mentionCount: Number(fallbackRow.mentionCount || 0),
      insertCount: Number(fallbackRow.insertCount || 0),
      createdAt: fallbackRow.createdAt
    };
  }

  return {
    entryId: encodeEntryId(rows[0]),
    storeNo: Number(rows[0].storeNo),
    workerName: String(rows[0].workerName || '').trim(),
    mentionCount: Number(rows[0].mentionCount || 0),
    insertCount: Number(rows[0].insertCount || 0),
    createdAt: rows[0].createdAt
  };
}

async function findEntryByStoreAndName(storeNo, workerName) {
  const chatbotPool = await getChatbotPool();
  const normalizedStoreNo = Number.parseInt(storeNo, 10);
  const normalizedWorkerName = String(workerName || '').trim();
  const [rows] = await chatbotPool.query(
    `SELECT storeNo, workerName, mentionCount, insertCount, createdAt,
            UNIX_TIMESTAMP(createdAt) AS createdAtKey
       FROM ENTRY_TODAY
      WHERE storeNo = ?
        AND workerName = ?
      ORDER BY createdAt DESC
      LIMIT 1`,
    [normalizedStoreNo, normalizedWorkerName]
  );

  return rows[0] || null;
}

async function createEntry({ storeNo, workerName }) {
  const chatbotPool = await getChatbotPool();
  await chatbotPool.query(
    `INSERT INTO ENTRY_TODAY (storeNo, workerName, mentionCount, insertCount, createdAt)
     VALUES (?, ?, 0, 0, NOW())`,
    [storeNo, workerName]
  );

  const createdRow = await findEntryByStoreAndName(storeNo, workerName);
  return createdRow ? {
    entryId: encodeEntryId(createdRow),
    storeNo: Number(createdRow.storeNo),
    workerName: String(createdRow.workerName || '').trim(),
    mentionCount: Number(createdRow.mentionCount || 0),
    insertCount: Number(createdRow.insertCount || 0),
    createdAt: createdRow.createdAt
  } : null;
}

async function updateEntry(entryId, { workerName }) {
  const chatbotPool = await getChatbotPool();
  const decoded = decodeEntryId(entryId);
  if (!decoded) return null;

  await chatbotPool.query(
    `UPDATE ENTRY_TODAY
        SET workerName = ?
      WHERE storeNo = ?
        AND workerName = ?
        AND UNIX_TIMESTAMP(createdAt) = ?`,
    [workerName, decoded.storeNo, decoded.workerName, decoded.createdAtKey]
  );

  const updatedRow = await findEntryByStoreAndName(decoded.storeNo, workerName);
  return updatedRow ? {
    entryId: encodeEntryId(updatedRow),
    storeNo: Number(updatedRow.storeNo),
    workerName: String(updatedRow.workerName || '').trim(),
    mentionCount: Number(updatedRow.mentionCount || 0),
    insertCount: Number(updatedRow.insertCount || 0),
    createdAt: updatedRow.createdAt
  } : null;
}

async function deleteEntry(entryId) {
  const chatbotPool = await getChatbotPool();
  const decoded = decodeEntryId(entryId);
  if (!decoded) return false;

  const [result] = await chatbotPool.query(
    `DELETE FROM ENTRY_TODAY
      WHERE storeNo = ?
        AND workerName = ?
        AND UNIX_TIMESTAMP(createdAt) = ?`,
    [decoded.storeNo, decoded.workerName, decoded.createdAtKey]
  );

  if (result.affectedRows > 0) {
    return true;
  }

  const [fallbackResult] = await chatbotPool.query(
    `DELETE FROM ENTRY_TODAY
      WHERE storeNo = ?
        AND workerName = ?`,
    [decoded.storeNo, decoded.workerName]
  );

  return fallbackResult.affectedRows > 0;
}

async function recordSiteVisit({ visitorKey, path }) {
  const pool = getPool();
  const normalizedVisitorKey = String(visitorKey || '').trim();
  const normalizedPath = String(path || '/').trim() || '/';

  if (!normalizedVisitorKey) return;

  await pool.query(
    `INSERT INTO site_visit_logs (visitor_key, path, visit_date, page_views, first_visited_at, last_visited_at)
     VALUES (?, ?, CURRENT_DATE(), 1, NOW(), NOW())
     ON DUPLICATE KEY UPDATE
       page_views = page_views + 1,
       last_visited_at = NOW()`,
    [normalizedVisitorKey, normalizedPath]
  );
}

function normalizeStatsDateKey(value) {
  if (value == null) return '';

  if (value instanceof Date) {
    return formatStatsDate(value);
  }

  const raw = String(value).trim();
  if (!raw) return '';

  const simpleMatch = raw.match(/^(\d{4}-\d{2}-\d{2})/);
  if (simpleMatch) return simpleMatch[1];

  const parsedDate = new Date(raw);
  if (!Number.isNaN(parsedDate.getTime())) {
    return formatStatsDate(parsedDate);
  }

  return raw;
}

function toDailySeriesMap(rows, valueMapper) {
  return new Map(rows.map((row) => [normalizeStatsDateKey(row.statsDate), valueMapper(row)]));
}

function formatStatsDate(date) {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function normalizeStatsPeriod(period) {
  const allowedPeriods = new Set(['daily', 'weekly', 'monthly', 'yearly']);
  return allowedPeriods.has(period) ? period : 'daily';
}

function formatYearMonth(date) {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

function formatWeekRangeLabel(startDate) {
  const endDate = new Date(startDate);
  endDate.setUTCDate(startDate.getUTCDate() + 6);
  return `${formatStatsDate(startDate)} ~ ${formatStatsDate(endDate)}`;
}

function aggregateDailyStatsByPeriod(dailyStats, period = 'daily') {
  const resolvedPeriod = normalizeStatsPeriod(period);
  if (resolvedPeriod === 'daily') {
    return dailyStats.map((item) => ({ ...item, label: item.date }));
  }

  const map = new Map();
  for (const row of dailyStats) {
    const currentDate = new Date(`${row.date}T00:00:00.000Z`);
    let key = row.date;
    let sortKey = row.date;
    let label = row.date;

    if (resolvedPeriod === 'weekly') {
      const day = currentDate.getUTCDay();
      const diffToMonday = day === 0 ? -6 : 1 - day;
      const weekStart = new Date(currentDate);
      weekStart.setUTCDate(currentDate.getUTCDate() + diffToMonday);
      key = formatStatsDate(weekStart);
      sortKey = key;
      label = formatWeekRangeLabel(weekStart);
    } else if (resolvedPeriod === 'monthly') {
      key = formatYearMonth(currentDate);
      sortKey = key;
      label = `${key}월`;
    } else if (resolvedPeriod === 'yearly') {
      key = String(currentDate.getUTCFullYear());
      sortKey = key;
      label = `${key}년`;
    }

    const existing = map.get(key) || {
      key,
      label,
      sortKey,
      visitors: 0,
      pageViews: 0,
      posts: 0,
      comments: 0,
      signups: 0
    };

    existing.visitors += Number(row.visitors || 0);
    existing.pageViews += Number(row.pageViews || 0);
    existing.posts += Number(row.posts || 0);
    existing.comments += Number(row.comments || 0);
    existing.signups += Number(row.signups || 0);
    map.set(key, existing);
  }

  return Array.from(map.values())
    .sort((a, b) => String(a.sortKey).localeCompare(String(b.sortKey)))
    .map((item) => ({
      date: item.key,
      label: item.label,
      visitors: item.visitors,
      pageViews: item.pageViews,
      posts: item.posts,
      comments: item.comments,
      signups: item.signups
    }));
}

async function getDashboardStats(rangeDays = 14, { period = 'daily' } = {}) {
  const pool = getPool();
  const resolvedPeriod = normalizeStatsPeriod(period);
  const periodRangeByType = {
    daily: Math.max(7, Math.min(31, Number.parseInt(rangeDays, 10) || 14)),
    weekly: 7 * 12,
    monthly: 31 * 12,
    yearly: 366 * 5
  };
  const normalizedRangeDays = periodRangeByType[resolvedPeriod] || periodRangeByType.daily;

  const [summaryRows] = await pool.query(
    `SELECT
        (SELECT COUNT(DISTINCT visitor_key) FROM site_visit_logs) AS totalVisitors,
        (SELECT COUNT(DISTINCT visitor_key) FROM site_visit_logs WHERE visit_date = CURRENT_DATE()) AS todayVisitors,
        (SELECT COALESCE(SUM(page_views), 0) FROM site_visit_logs) AS totalPageViews,
        (SELECT COALESCE(SUM(page_views), 0) FROM site_visit_logs WHERE visit_date = CURRENT_DATE()) AS todayPageViews,
        (SELECT COUNT(*) FROM posts WHERE is_deleted = 0) AS totalPosts,
        (SELECT COUNT(*) FROM posts WHERE is_deleted = 0 AND DATE(created_at) = CURRENT_DATE()) AS todayPosts,
        (SELECT COUNT(*) FROM comments WHERE is_deleted = 0) AS totalComments,
        (SELECT COUNT(*) FROM comments WHERE is_deleted = 0 AND DATE(created_at) = CURRENT_DATE()) AS todayComments,
        (SELECT COUNT(*) FROM users WHERE role = 'MEMBER') AS totalUsers,
        (SELECT COUNT(*) FROM users WHERE role = 'MEMBER' AND DATE(created_at) = CURRENT_DATE()) AS todaySignups`
  );

  const [visitRows, postRows, commentRows, signupRows, boardRows] = await Promise.all([
    pool.query(
      `SELECT visit_date AS statsDate,
              COUNT(DISTINCT visitor_key) AS visitors,
              COALESCE(SUM(page_views), 0) AS pageViews
         FROM site_visit_logs
        WHERE visit_date >= DATE_SUB(CURRENT_DATE(), INTERVAL ? DAY)
        GROUP BY visit_date
        ORDER BY visit_date ASC`,
      [normalizedRangeDays - 1]
    ).then(([rows]) => rows),
    pool.query(
      `SELECT DATE(created_at) AS statsDate, COUNT(*) AS postCount
         FROM posts
        WHERE is_deleted = 0
          AND created_at >= DATE_SUB(CURRENT_DATE(), INTERVAL ? DAY)
        GROUP BY DATE(created_at)
        ORDER BY DATE(created_at) ASC`,
      [normalizedRangeDays - 1]
    ).then(([rows]) => rows),
    pool.query(
      `SELECT DATE(created_at) AS statsDate, COUNT(*) AS commentCount
         FROM comments
        WHERE is_deleted = 0
          AND created_at >= DATE_SUB(CURRENT_DATE(), INTERVAL ? DAY)
        GROUP BY DATE(created_at)
        ORDER BY DATE(created_at) ASC`,
      [normalizedRangeDays - 1]
    ).then(([rows]) => rows),
    pool.query(
      `SELECT DATE(created_at) AS statsDate, COUNT(*) AS signupCount
         FROM users
        WHERE role = 'MEMBER'
          AND created_at >= DATE_SUB(CURRENT_DATE(), INTERVAL ? DAY)
        GROUP BY DATE(created_at)
        ORDER BY DATE(created_at) ASC`,
      [normalizedRangeDays - 1]
    ).then(([rows]) => rows),
    pool.query(
      `SELECT board_type AS boardType,
              COUNT(*) AS totalPosts,
              SUM(CASE WHEN DATE(created_at) = CURRENT_DATE() THEN 1 ELSE 0 END) AS todayPosts
         FROM posts
        WHERE is_deleted = 0
        GROUP BY board_type
        ORDER BY totalPosts DESC, board_type ASC`
    ).then(([rows]) => rows)
  ]);

  const visitMap = toDailySeriesMap(visitRows, (row) => ({
    visitors: Number(row.visitors || 0),
    pageViews: Number(row.pageViews || 0)
  }));
  const postMap = toDailySeriesMap(postRows, (row) => Number(row.postCount || 0));
  const commentMap = toDailySeriesMap(commentRows, (row) => Number(row.commentCount || 0));
  const signupMap = toDailySeriesMap(signupRows, (row) => Number(row.signupCount || 0));

  const daily = [];
  for (let offset = normalizedRangeDays - 1; offset >= 0; offset -= 1) {
    const currentDate = new Date();
    currentDate.setUTCHours(0, 0, 0, 0);
    currentDate.setUTCDate(currentDate.getUTCDate() - offset);
    const dateKey = formatStatsDate(currentDate);
    const visitEntry = visitMap.get(dateKey) || { visitors: 0, pageViews: 0 };

    daily.push({
      date: dateKey,
      visitors: visitEntry.visitors,
      pageViews: visitEntry.pageViews,
      posts: postMap.get(dateKey) || 0,
      comments: commentMap.get(dateKey) || 0,
      signups: signupMap.get(dateKey) || 0
    });
  }

  const periodSeries = aggregateDailyStatsByPeriod(daily, resolvedPeriod);

  return {
    period: resolvedPeriod,
    summary: {
      totalVisitors: Number(summaryRows[0]?.totalVisitors || 0),
      todayVisitors: Number(summaryRows[0]?.todayVisitors || 0),
      totalPageViews: Number(summaryRows[0]?.totalPageViews || 0),
      todayPageViews: Number(summaryRows[0]?.todayPageViews || 0),
      totalPosts: Number(summaryRows[0]?.totalPosts || 0),
      todayPosts: Number(summaryRows[0]?.todayPosts || 0),
      totalComments: Number(summaryRows[0]?.totalComments || 0),
      todayComments: Number(summaryRows[0]?.todayComments || 0),
      totalUsers: Number(summaryRows[0]?.totalUsers || 0),
      todaySignups: Number(summaryRows[0]?.todaySignups || 0)
    },
    boardStats: boardRows.map((row) => ({
      boardType: row.boardType,
      totalPosts: Number(row.totalPosts || 0),
      todayPosts: Number(row.todayPosts || 0)
    })),
    daily,
    series: periodSeries
  };
}

module.exports = {
  createEntry,
  encodeEntryId,
  decodeEntryId,
  deleteEntry,
  listBusinessApplications,
  countPendingBusinessApplications,
  listRecentPendingBusinessApplications,
  findBusinessApplicationByUserId,
  reviewBusinessApplication,
  listUsers,
  listAdmins,
  listEntryStores,
  listEntries,
  findUserById,
  findEntryById,
  findEntryByStoreAndName,
  getUserDetail,
  getUserActivityOverview,
  updateUserRole,
  updateUserMemberType,
  updateBusinessProfileReviewByUserId,
  freezeUserCommunityAuthorSnapshotsBeforeBusinessConversion,
  listBusinessProfileRejectionHistories,
  updateUserByAdmin,
  adjustUserPointsByAdmin,
  deleteUser,
  listAds,
  listLiveAdsByStore,
  listTopAdsByPlacement,
  createAd,
  findAdById,
  getStoreByNo,
  updateAd,
  deleteAd,
  BUSINESS_AD_PLAN_DURATIONS,
  BUSINESS_AD_RENEWAL_INTERVAL_MS,
  BUSINESS_AD_JUMP_SCHEDULE_INTERVAL_MS,
  listBusinessAdJumpSchedules,
  replaceBusinessAdJumpSchedules,
  runDueBusinessAdJumpSchedules,
  startBusinessAdJumpScheduleScheduler,
  stopBusinessAdJumpScheduleScheduler,
  normalizeBusinessAdPlanType,
  getBusinessAdPlanDurationDays,
  getBusinessAdPlanDurationLabel,
  getBusinessAdPlanDurationUnit,
  getBusinessAdPlanDurationConfig,
  getPieceAdPlanDurationConfig,
  renewExpiredBusinessAdsWithStamp,
  startBusinessAdRenewalScheduler,
  stopBusinessAdRenewalScheduler,
  getBusinessAdPublicVisibilityCondition,
  listBusinessAdsByOwner,
  listBusinessAdsForAdmin,
  listPublicBusinessAdAreas,
  listPublicBusinessAds,
  findPublicBusinessAdById,
  findPublicBusinessAdBySlug,
  listSeoSitemapBusinessAds,
  listSeoRssBusinessAds,
  increaseBusinessAdViewCount,
  createBusinessAd,
  findBusinessAdById,
  updateBusinessAd,
  activateBusinessAdWithStamp,
  activatePieceAdWithStamp,
  jumpBusinessAd,
  setBusinessAdActivationOff,
  setPieceAdActivationOff,
  deleteBusinessAd,
  updateEntry,
  recordSiteVisit,
  getDashboardStats
};
