/**
 * 파일 역할: 광고회원 배너광고 월 단위 경매(입찰/마감/확정/노출) 데이터를 담당하는 모델 파일.
 *
 * 일정(한국시간 기준)
 * - 노출: 매월 1일 00:00 ~ 말일 24:00
 * - 입찰: 노출 전월 1일 00:00 ~ 노출 전월 말일 00:00 (노출 1일 전 마감)
 * - 마감 후 노출순서를 확정하고, 회원에게는 내 순위(낙찰/미낙찰)만 보여준다
 *
 * 소재(제목/이미지/링크)는 입찰과 별개로 회원·위치별 설정(banner_ad_creatives)에 저장되고, 노출 시 조인한다.
 *
 * 노출순서: 입찰 스탬프 DESC → 입찰 확정 시각 ASC(같은 금액이면 먼저 확정한 순) → id ASC
 */
const { getPool } = require('../config/database');
const { createSeoSlugWithId } = require('../utils/seoSlug');

const KOREA_UTC_OFFSET_MS = 9 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;
const BANNER_AUCTION_SETTLE_INTERVAL_MS = Number(process.env.BANNER_AUCTION_SETTLE_INTERVAL_MS || 60 * 1000);

const BANNER_AUCTION_PLACEMENTS = {
  HOME: { code: 'HOME', label: '홈 상단', slotCount: 20, minBidStamps: 10, requiresStore: false },
  COMMUNITY: { code: 'COMMUNITY', label: '커뮤니티 상단', slotCount: 20, minBidStamps: 15, requiresStore: false },
  LIVE: { code: 'LIVE', label: 'LIVE 하단', slotCount: 10, minBidStamps: 20, requiresStore: true }
};

const BID_ORDER_SQL = 'b.bid_stamps DESC, b.bid_updated_at ASC, b.id ASC';

let settleTimer = null;
let settleRunPromise = null;
let lastLazySettleAt = 0;

function createHttpError(message, status = 400) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function getPlacementConfig(placement) {
  return BANNER_AUCTION_PLACEMENTS[String(placement || '').trim().toUpperCase()] || null;
}

function normalizeStoreNoForPlacement(config, storeNo) {
  if (!config.requiresStore) return 0;
  const normalized = Number.parseInt(storeNo, 10);
  return Number.isInteger(normalized) && normalized > 0 ? normalized : null;
}

function toMonthKey(year, monthIndex) {
  const date = new Date(Date.UTC(year, monthIndex, 1));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
}

function parseMonthKey(monthKey) {
  const [year, month] = String(monthKey).split('-').map(Number);
  return { year, monthIndex: month - 1 };
}

// 한국시간 해당 월 1일 00:00 을 UTC Date 로 반환
function getMonthStartUtc(monthKey) {
  const { year, monthIndex } = parseMonthKey(monthKey);
  return new Date(Date.UTC(year, monthIndex, 1) - KOREA_UTC_OFFSET_MS);
}

function shiftMonthKey(monthKey, diff) {
  const { year, monthIndex } = parseMonthKey(monthKey);
  return toMonthKey(year, monthIndex + diff);
}

function getCurrentMonthKey(now = new Date()) {
  const korea = new Date(now.getTime() + KOREA_UTC_OFFSET_MS);
  return toMonthKey(korea.getUTCFullYear(), korea.getUTCMonth());
}

function getAuctionSchedule(targetMonth) {
  const exposureStartAt = getMonthStartUtc(targetMonth);
  return {
    targetMonth,
    bidOpenAt: getMonthStartUtc(shiftMonthKey(targetMonth, -1)),
    bidCloseAt: new Date(exposureStartAt.getTime() - DAY_MS),
    exposureStartAt,
    exposureEndAt: getMonthStartUtc(shiftMonthKey(targetMonth, 1))
  };
}

// 지금 입찰/확정 대상이 되는 월(항상 다음 달)과 그 일정
function getUpcomingAuction(now = new Date()) {
  const targetMonth = shiftMonthKey(getCurrentMonthKey(now), 1);
  const schedule = getAuctionSchedule(targetMonth);
  return {
    ...schedule,
    status: now < schedule.bidCloseAt ? 'BIDDING' : 'CLOSED'
  };
}

// 마감 시각이 지난 가장 최근 대상 월
function getLatestClosedMonth(now = new Date()) {
  const upcoming = getUpcomingAuction(now);
  return upcoming.status === 'CLOSED' ? upcoming.targetMonth : getCurrentMonthKey(now);
}

function isValidBannerLinkUrl(url) {
  const value = String(url || '').trim();
  if (!value) return true;
  if (value.startsWith('/') && !value.startsWith('//')) return true;
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch (error) {
    return false;
  }
}

function mapBid(row) {
  if (!row) return null;
  return {
    id: Number(row.id),
    placement: row.placement,
    storeNo: Number(row.storeNo || 0) || null,
    targetMonth: row.targetMonth,
    bidStamps: Number(row.bidStamps || 0),
    bidUpdatedAt: row.bidUpdatedAt,
    status: row.status,
    finalRank: row.finalRank == null ? null : Number(row.finalRank),
    isHidden: Boolean(Number(row.isHidden || 0)),
    hiddenReason: row.hiddenReason || '',
    createdAt: row.createdAt
  };
}

async function findOwnerRegisteredBusinessAd(executor, ownerUserId) {
  const [rows] = await executor.query(
    `SELECT id, title, business_name AS businessName
       FROM business_ads
      WHERE owner_user_id = ?
        AND registration_status = 'REGISTERED'
      ORDER BY id ASC
      LIMIT 1`,
    [ownerUserId]
  );
  return rows[0] || null;
}

function buildBusinessAdDetailPath(ad) {
  if (!ad) return '';
  return `/business-info/${encodeURIComponent(createSeoSlugWithId(ad.title || ad.businessName, ad.id, 'business'))}`;
}

async function getBusinessStampBalance(executor, userId, { lock = false } = {}) {
  const [rows] = await executor.query(
    `SELECT COALESCE(SUM(amount), 0) AS totalStamps
       FROM stamp_histories
      WHERE user_id = ?
        AND stamp_type = 'BUSINESS'${lock ? '\n      FOR UPDATE' : ''}`,
    [userId]
  );
  return Math.max(0, Number(rows[0]?.totalStamps || 0));
}

async function insertStampHistory(executor, { userId, actionType, amount, reason, sourceLabel }) {
  await executor.query(
    `INSERT INTO stamp_histories (user_id, stamp_type, action_type, amount, reason, source_label)
     VALUES (?, 'BUSINESS', ?, ?, ?, ?)`,
    [userId, actionType, amount, reason, sourceLabel]
  );
}

function describeTarget(config, targetMonth, storeName = '') {
  const [year, month] = targetMonth.split('-');
  const storeText = config.requiresStore && storeName ? `(${storeName}) ` : '';
  return `${year}년 ${Number(month)}월 ${config.label} ${storeText}배너광고`;
}

function mapCreative(row, config) {
  return {
    placement: config.code,
    label: config.label,
    title: row?.title || '',
    imageUrl: row?.imageUrl || '',
    linkUrl: row?.linkUrl || '',
    updatedAt: row?.updatedAt || null
  };
}

async function findCreative(executor, ownerUserId, placement) {
  const [rows] = await executor.query(
    `SELECT title, image_url AS imageUrl, link_url AS linkUrl, updated_at AS updatedAt
       FROM banner_ad_creatives
      WHERE owner_user_id = ? AND placement = ?`,
    [ownerUserId, placement]
  );
  return rows[0] || null;
}

async function listCreatives(ownerUserId) {
  const [rows] = await getPool().query(
    `SELECT placement, title, image_url AS imageUrl, link_url AS linkUrl, updated_at AS updatedAt
       FROM banner_ad_creatives
      WHERE owner_user_id = ?`,
    [ownerUserId]
  );
  return Object.values(BANNER_AUCTION_PLACEMENTS).map((config) => mapCreative(rows.find((row) => row.placement === config.code), config));
}

// 위치별 배너 소재 저장. 링크 미입력 시 내 업체 상세페이지로 연결한다.
// imageUrl: 새로 업로드한 이미지(없으면 기존 유지), removeImage: 기존 이미지 삭제(이미지가 없으면 낙찰돼도 노출되지 않음)
async function saveCreative({ ownerUserId, placement, title, imageUrl, removeImage = false, linkUrl }) {
  const config = getPlacementConfig(placement);
  if (!config) throw createHttpError('유효한 배너 위치를 선택해주세요.');
  if (!isValidBannerLinkUrl(linkUrl)) throw createHttpError('링크는 http(s) 주소 또는 / 로 시작하는 사이트 내부 경로만 입력할 수 있습니다.');

  const pool = getPool();
  const previous = await findCreative(pool, ownerUserId, config.code);
  const resolvedImageUrl = String(imageUrl || '').trim() || (removeImage ? '' : previous?.imageUrl || '');

  const businessAd = await findOwnerRegisteredBusinessAd(pool, ownerUserId);
  const resolvedLinkUrl = String(linkUrl || '').trim() || buildBusinessAdDetailPath(businessAd);
  if (!resolvedLinkUrl) throw createHttpError('업체광고프로필을 등록해야 내 업체 상세페이지로 연결할 수 있습니다. 링크를 직접 입력해주세요.');
  const resolvedTitle = String(title || '').trim().slice(0, 100) || businessAd?.title || businessAd?.businessName || '배너광고';

  await pool.query(
    `INSERT INTO banner_ad_creatives (owner_user_id, placement, title, image_url, link_url)
     VALUES (?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE title = VALUES(title), image_url = VALUES(image_url), link_url = VALUES(link_url)`,
    [ownerUserId, config.code, resolvedTitle, resolvedImageUrl, resolvedLinkUrl]
  );
  return { previousImageUrl: previous?.imageUrl || null, imageUrl: resolvedImageUrl };
}

async function countCreativesUsingImage(imageUrl) {
  const [rows] = await getPool().query('SELECT COUNT(*) AS cnt FROM banner_ad_creatives WHERE image_url = ?', [imageUrl]);
  return Number(rows[0]?.cnt || 0);
}

/**
 * 입찰 생성/상향. 해당 위치의 배너 소재가 먼저 설정되어 있어야 한다.
 * - 입찰 기간에만 가능, 입찰 스탬프는 즉시 차감(예치)되고 낙찰 실패/취소 시 환불된다.
 * - 입찰가는 올리기만 가능하며, 금액이 바뀔 때만 입찰 확정 시각이 갱신된다.
 */
async function placeBid({ ownerUserId, placement, storeNo, storeName = '', bidStamps }) {
  const config = getPlacementConfig(placement);
  if (!config) throw createHttpError('유효한 배너 위치를 선택해주세요.');
  const normalizedStoreNo = normalizeStoreNoForPlacement(config, storeNo);
  if (normalizedStoreNo == null) throw createHttpError('LIVE 하단 배너는 매장을 선택해야 합니다.');

  const upcoming = getUpcomingAuction();
  if (upcoming.status !== 'BIDDING') throw createHttpError('이번 입찰은 마감되었습니다. 다음 달 1일부터 다시 입찰할 수 있습니다.', 409);

  const nextBidStamps = Number(bidStamps);
  if (!Number.isInteger(nextBidStamps) || nextBidStamps < config.minBidStamps) {
    throw createHttpError(`${config.label} 배너는 최소 ${config.minBidStamps}스탬프부터 입찰할 수 있습니다.`);
  }

  const pool = getPool();
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    await connection.query('SELECT id FROM users WHERE id = ? FOR UPDATE', [ownerUserId]);

    const businessAd = await findOwnerRegisteredBusinessAd(connection, ownerUserId);
    if (!businessAd) throw createHttpError('업체광고프로필이 등록 상태여야 배너광고에 입찰할 수 있습니다.');

    const creative = await findCreative(connection, ownerUserId, config.code);
    if (!creative?.imageUrl) throw createHttpError(`배너광고 관리에서 ${config.label} 배너 이미지를 먼저 설정해주세요.`);

    const [existingRows] = await connection.query(
      `SELECT id, bid_stamps AS bidStamps, status
         FROM banner_ad_bids
        WHERE owner_user_id = ? AND placement = ? AND store_no = ? AND target_month = ?
        FOR UPDATE`,
      [ownerUserId, config.code, normalizedStoreNo, upcoming.targetMonth]
    );
    const existing = existingRows[0] || null;
    const isActiveBid = existing?.status === 'BIDDING';
    const previousBidStamps = isActiveBid ? Number(existing.bidStamps || 0) : 0;

    if (isActiveBid && nextBidStamps < previousBidStamps) {
      throw createHttpError(`입찰가는 내릴 수 없습니다. 현재 입찰가는 ${previousBidStamps}스탬프입니다. 낮추려면 입찰을 취소 후 다시 입찰해주세요.`);
    }

    const chargeStamps = nextBidStamps - previousBidStamps;
    if (chargeStamps <= 0) throw createHttpError(`현재 입찰가(${previousBidStamps}스탬프)보다 높게 입력해주세요.`);

    const balance = await getBusinessStampBalance(connection, ownerUserId, { lock: true });
    if (balance < chargeStamps) {
      throw createHttpError(`비즈니스 스탬프가 부족합니다. (필요 ${chargeStamps}개 / 보유 ${balance}개)`);
    }
    await insertStampHistory(connection, {
      userId: ownerUserId,
      actionType: 'BANNER_AD_BID',
      amount: -chargeStamps,
      reason: `${describeTarget(config, upcoming.targetMonth, storeName)} 입찰 ${isActiveBid ? `상향 (${previousBidStamps}→${nextBidStamps})` : `(${nextBidStamps})`}`,
      sourceLabel: `BANNER_AD_BID-${config.code}-${normalizedStoreNo}-${upcoming.targetMonth}`
    });

    let bidId;
    if (existing) {
      await connection.query(
        `UPDATE banner_ad_bids
            SET business_ad_id = ?, bid_stamps = ?, status = 'BIDDING', bid_updated_at = UTC_TIMESTAMP(3), final_rank = NULL
          WHERE id = ?`,
        [businessAd.id, nextBidStamps, existing.id]
      );
      bidId = Number(existing.id);
    } else {
      const [result] = await connection.query(
        `INSERT INTO banner_ad_bids
           (owner_user_id, business_ad_id, placement, store_no, target_month, bid_stamps, bid_updated_at, status)
         VALUES (?, ?, ?, ?, ?, ?, UTC_TIMESTAMP(3), 'BIDDING')`,
        [ownerUserId, businessAd.id, config.code, normalizedStoreNo, upcoming.targetMonth, nextBidStamps]
      );
      bidId = Number(result.insertId);
    }

    await connection.commit();
    return { bidId, chargedStamps: chargeStamps };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function cancelBid({ ownerUserId, placement, storeNo, storeName = '' }) {
  const config = getPlacementConfig(placement);
  if (!config) throw createHttpError('유효한 배너 위치를 선택해주세요.');
  const normalizedStoreNo = normalizeStoreNoForPlacement(config, storeNo);
  if (normalizedStoreNo == null) throw createHttpError('LIVE 하단 배너는 매장을 선택해야 합니다.');

  const upcoming = getUpcomingAuction();
  if (upcoming.status !== 'BIDDING') throw createHttpError('입찰이 마감되어 취소할 수 없습니다.', 409);

  const pool = getPool();
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [rows] = await connection.query(
      `SELECT id, bid_stamps AS bidStamps
         FROM banner_ad_bids
        WHERE owner_user_id = ? AND placement = ? AND store_no = ? AND target_month = ? AND status = 'BIDDING'
        FOR UPDATE`,
      [ownerUserId, config.code, normalizedStoreNo, upcoming.targetMonth]
    );
    const bid = rows[0];
    if (!bid) throw createHttpError('취소할 입찰이 없습니다.', 404);

    await connection.query("UPDATE banner_ad_bids SET status = 'CANCELED' WHERE id = ?", [bid.id]);
    await insertStampHistory(connection, {
      userId: ownerUserId,
      actionType: 'BANNER_AD_REFUND',
      amount: Number(bid.bidStamps),
      reason: `${describeTarget(config, upcoming.targetMonth, storeName)} 입찰 취소 환불`,
      sourceLabel: `BANNER_AD_REFUND-${bid.id}`
    });
    await connection.commit();
    return { refundedStamps: Number(bid.bidStamps) };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

/**
 * 마감된 월의 입찰을 확정한다. 슬롯 수 안의 입찰은 WON(노출순서 확정),
 * 나머지는 LOST 처리 후 입찰 스탬프 전액 환불.
 */
async function settleGroup(group) {
  const config = getPlacementConfig(group.placement);
  if (!config) return;
  const pool = getPool();
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [bids] = await connection.query(
      `SELECT b.id, b.owner_user_id AS ownerUserId, b.bid_stamps AS bidStamps
         FROM banner_ad_bids b
        WHERE b.placement = ? AND b.store_no = ? AND b.target_month = ? AND b.status = 'BIDDING'
        ORDER BY ${BID_ORDER_SQL}
        FOR UPDATE`,
      [group.placement, group.storeNo, group.targetMonth]
    );

    for (let index = 0; index < bids.length; index += 1) {
      const bid = bids[index];
      const isWinner = index < config.slotCount;
      await connection.query(
        'UPDATE banner_ad_bids SET status = ?, final_rank = ? WHERE id = ?',
        [isWinner ? 'WON' : 'LOST', isWinner ? index + 1 : null, bid.id]
      );
      if (!isWinner) {
        await insertStampHistory(connection, {
          userId: bid.ownerUserId,
          actionType: 'BANNER_AD_REFUND',
          amount: Number(bid.bidStamps),
          reason: `${describeTarget(config, group.targetMonth)} 미낙찰 환불`,
          sourceLabel: `BANNER_AD_REFUND-${bid.id}`
        });
      }
    }
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function settleClosedBannerAuctions() {
  const pool = getPool();
  const [groups] = await pool.query(
    `SELECT DISTINCT placement, store_no AS storeNo, target_month AS targetMonth
       FROM banner_ad_bids
      WHERE status = 'BIDDING'
        AND target_month <= ?`,
    [getLatestClosedMonth()]
  );
  for (const group of groups) {
    await settleGroup(group);
  }
}

async function runSettle() {
  if (settleRunPromise) return settleRunPromise;
  settleRunPromise = settleClosedBannerAuctions();
  try {
    await settleRunPromise;
  } finally {
    settleRunPromise = null;
  }
}

// 조회 직전에 호출: 스케줄러가 돌기 전이라도 마감 직후 결과가 바로 반영되도록 한다.
async function ensureSettled() {
  if (Date.now() - lastLazySettleAt < 5000) return;
  lastLazySettleAt = Date.now();
  await runSettle();
}

function startBannerAuctionSettleScheduler() {
  if (settleTimer) return settleTimer;
  settleTimer = setInterval(() => {
    runSettle().catch((error) => console.error('Banner auction settle scheduler error:', error));
  }, BANNER_AUCTION_SETTLE_INTERVAL_MS);
  if (typeof settleTimer.unref === 'function') settleTimer.unref();
  runSettle().catch((error) => console.error('Banner auction settle error:', error));
  return settleTimer;
}

// 현재 월 노출 중인 낙찰 배너 (공개 캐러셀용)
async function listExposedBannerAds(placement, storeNo = 0) {
  const config = getPlacementConfig(placement);
  if (!config) return [];
  const normalizedStoreNo = normalizeStoreNoForPlacement(config, storeNo);
  if (normalizedStoreNo == null) return [];
  await ensureSettled();
  const [rows] = await getPool().query(
    `SELECT b.id, c.title, c.image_url AS imageUrl, c.link_url AS linkUrl, b.final_rank AS finalRank
       FROM banner_ad_bids b
       JOIN banner_ad_creatives c ON c.owner_user_id = b.owner_user_id AND c.placement = b.placement
      WHERE b.placement = ? AND b.store_no = ? AND b.target_month = ? AND b.status = 'WON'
        AND b.is_hidden = 0
        AND c.image_url <> ''
      ORDER BY b.final_rank ASC`,
    [config.code, normalizedStoreNo, getCurrentMonthKey()]
  );
  return rows.map((row) => ({
    id: `auction-${row.id}`,
    title: row.title,
    imageUrl: row.imageUrl,
    linkUrl: row.linkUrl,
    adType: 'AUCTION',
    displayOrder: Number(row.finalRank)
  }));
}

/**
 * 광고 활성화 > 배너광고 탭용 위치별 입찰 현황.
 * 다른 업체 정보는 보여주지 않고 커트라인과 내 예상(마감 후에는 확정) 순위만 준다.
 */
async function getPlacementOverview({ ownerUserId, placement, storeNo }) {
  const config = getPlacementConfig(placement);
  if (!config) throw createHttpError('유효한 배너 위치를 선택해주세요.');
  const normalizedStoreNo = normalizeStoreNoForPlacement(config, storeNo);
  await ensureSettled();

  const upcoming = getUpcomingAuction();
  const currentMonth = getCurrentMonthKey();
  const base = {
    placement: config,
    storeNo: normalizedStoreNo || null,
    currentMonth,
    currentPeriod: {
      startAt: getMonthStartUtc(currentMonth),
      endAt: getMonthStartUtc(shiftMonthKey(currentMonth, 1))
    },
    upcoming: {
      targetMonth: upcoming.targetMonth,
      status: upcoming.status,
      bidOpenAt: upcoming.bidOpenAt,
      bidCloseAt: upcoming.bidCloseAt,
      exposureStartAt: upcoming.exposureStartAt,
      exposureEndAt: upcoming.exposureEndAt
    }
  };
  if (normalizedStoreNo == null) {
    return { ...base, creative: null, myBid: null, myCurrentBanner: null, bidderCount: 0, cutoffBidStamps: null, expectedRank: null };
  }

  const pool = getPool();
  const creative = mapCreative(await findCreative(pool, ownerUserId, config.code), config);
  const [myRows] = await pool.query(
    `SELECT id, placement, store_no AS storeNo, target_month AS targetMonth, bid_stamps AS bidStamps,
            bid_updated_at AS bidUpdatedAt, status, final_rank AS finalRank,
            is_hidden AS isHidden, hidden_reason AS hiddenReason, created_at AS createdAt
       FROM banner_ad_bids
      WHERE owner_user_id = ? AND placement = ? AND store_no = ? AND target_month IN (?, ?)`,
    [ownerUserId, config.code, normalizedStoreNo, currentMonth, upcoming.targetMonth]
  );
  const myBid = mapBid(myRows.find((row) => row.targetMonth === upcoming.targetMonth && row.status !== 'CANCELED'));
  const myCurrentBanner = mapBid(myRows.find((row) => row.targetMonth === currentMonth && row.status === 'WON'));

  const statusFilter = upcoming.status === 'BIDDING' ? "b.status = 'BIDDING'" : "b.status = 'WON'";
  const [rankRows] = await pool.query(
    `SELECT b.id, b.owner_user_id AS ownerUserId, b.bid_stamps AS bidStamps, b.final_rank AS finalRank
       FROM banner_ad_bids b
      WHERE b.placement = ? AND b.store_no = ? AND b.target_month = ? AND ${statusFilter}
      ORDER BY ${upcoming.status === 'BIDDING' ? BID_ORDER_SQL : 'b.final_rank ASC'}`,
    [config.code, normalizedStoreNo, upcoming.targetMonth]
  );

  const myIndex = rankRows.findIndex((row) => Number(row.ownerUserId) === Number(ownerUserId));
  const cutoffRow = rankRows.length >= config.slotCount ? rankRows[config.slotCount - 1] : null;

  return {
    ...base,
    creative,
    myBid,
    myCurrentBanner,
    bidderCount: rankRows.length,
    cutoffBidStamps: cutoffRow ? Number(cutoffRow.bidStamps) : null,
    expectedRank: myIndex >= 0 ? myIndex + 1 : null
  };
}

// 배너광고 관리 페이지 상단 요약용: 이번 달/다음 달 내 배너 현황
async function listMyRecentBids(ownerUserId) {
  await ensureSettled();
  const currentMonth = getCurrentMonthKey();
  const [rows] = await getPool().query(
    `SELECT id, placement, store_no AS storeNo, target_month AS targetMonth, bid_stamps AS bidStamps,
            bid_updated_at AS bidUpdatedAt, status, final_rank AS finalRank,
            is_hidden AS isHidden, hidden_reason AS hiddenReason, created_at AS createdAt
       FROM banner_ad_bids
      WHERE owner_user_id = ? AND target_month IN (?, ?) AND status <> 'CANCELED'
      ORDER BY target_month ASC, FIELD(placement, 'HOME', 'COMMUNITY', 'LIVE'), store_no ASC`,
    [ownerUserId, currentMonth, shiftMonthKey(currentMonth, 1)]
  );
  return rows.map(mapBid);
}

// ---- 관리자 ----

// 해당 월 경매의 진행 단계: 입찰 전 / 입찰중 / 마감(순서 확정) / 노출중 / 종료
function getAuctionPhase(targetMonth) {
  const currentMonth = getCurrentMonthKey();
  const upcoming = getUpcomingAuction();
  if (targetMonth < currentMonth) return 'ENDED';
  if (targetMonth === currentMonth) return 'EXPOSING';
  if (targetMonth === upcoming.targetMonth) return upcoming.status;
  return 'NOT_OPEN';
}

async function adminListAuctionMonths() {
  const currentMonth = getCurrentMonthKey();
  const [rows] = await getPool().query('SELECT DISTINCT target_month AS targetMonth FROM banner_ad_bids');
  const months = new Set([shiftMonthKey(currentMonth, 1), currentMonth, shiftMonthKey(currentMonth, -1), ...rows.map((row) => row.targetMonth)]);
  return [...months].sort().reverse();
}

/**
 * 관리자용 입찰 목록. 입찰중인 건은 현재 순서(입찰 스탬프 → 입찰 확정 시각)로 '현재 순위'를 계산해 준다.
 * placement 를 비우면 전체 위치, LIVE 에서 storeNo 를 비우면 전체 매장.
 */
async function adminListBids({ month, placement = '', storeNo = null, status = '' } = {}) {
  await ensureSettled();
  const targetMonth = /^\d{4}-\d{2}$/.test(String(month || '')) ? month : shiftMonthKey(getCurrentMonthKey(), 1);
  const config = placement ? getPlacementConfig(placement) : null;
  const where = ['b.target_month = ?'];
  const params = [targetMonth];
  if (config) {
    where.push('b.placement = ?');
    params.push(config.code);
    const normalizedStoreNo = Number.parseInt(storeNo, 10);
    if (config.requiresStore && normalizedStoreNo > 0) {
      where.push('b.store_no = ?');
      params.push(normalizedStoreNo);
    }
  }
  if (['BIDDING', 'WON', 'LOST', 'CANCELED'].includes(String(status).toUpperCase())) {
    where.push('b.status = ?');
    params.push(String(status).toUpperCase());
  }

  const [rows] = await getPool().query(
    `SELECT b.id, b.owner_user_id AS ownerUserId, u.login_id AS loginId, u.nickname,
            COALESCE(NULLIF(ba.business_name, ''), NULLIF(ba.title, ''), u.nickname) AS businessName,
            b.placement, b.store_no AS storeNo, b.target_month AS targetMonth,
            b.bid_stamps AS bidStamps, b.bid_updated_at AS bidUpdatedAt, b.created_at AS createdAt,
            b.status, b.final_rank AS finalRank, b.is_hidden AS isHidden, b.hidden_reason AS hiddenReason,
            c.title AS creativeTitle, c.image_url AS imageUrl, c.link_url AS linkUrl
       FROM banner_ad_bids b
       JOIN users u ON u.id = b.owner_user_id
       LEFT JOIN business_ads ba ON ba.id = b.business_ad_id
       LEFT JOIN banner_ad_creatives c ON c.owner_user_id = b.owner_user_id AND c.placement = b.placement
      WHERE ${where.join(' AND ')}
      ORDER BY FIELD(b.placement, 'HOME', 'COMMUNITY', 'LIVE'), b.store_no ASC,
               FIELD(b.status, 'WON', 'BIDDING', 'LOST', 'CANCELED'),
               b.final_rank IS NULL, b.final_rank ASC, b.bid_stamps DESC, b.bid_updated_at ASC, b.id ASC`,
    params
  );

  const biddingRankByGroup = new Map();
  const items = rows.map((row) => {
    const groupKey = `${row.placement}:${row.storeNo}`;
    let rank = row.finalRank == null ? null : Number(row.finalRank);
    if (row.status === 'BIDDING') {
      rank = (biddingRankByGroup.get(groupKey) || 0) + 1;
      biddingRankByGroup.set(groupKey, rank);
    }
    const slotCount = getPlacementConfig(row.placement)?.slotCount || 0;
    return {
      id: Number(row.id),
      ownerUserId: Number(row.ownerUserId),
      loginId: row.loginId,
      nickname: row.nickname,
      businessName: row.businessName,
      placement: row.placement,
      storeNo: Number(row.storeNo || 0) || null,
      bidStamps: Number(row.bidStamps || 0),
      bidUpdatedAt: row.bidUpdatedAt,
      createdAt: row.createdAt,
      status: row.status,
      rank,
      withinSlots: rank != null && rank <= slotCount && ['BIDDING', 'WON'].includes(row.status),
      isHidden: Boolean(Number(row.isHidden || 0)),
      hiddenReason: row.hiddenReason || '',
      creativeTitle: row.creativeTitle || '',
      imageUrl: row.imageUrl || '',
      linkUrl: row.linkUrl || ''
    };
  });

  const schedule = getAuctionSchedule(targetMonth);
  return {
    targetMonth,
    phase: getAuctionPhase(targetMonth),
    schedule,
    items,
    summary: {
      bidderCount: items.filter((item) => item.status !== 'CANCELED').length,
      wonCount: items.filter((item) => item.status === 'WON').length,
      hiddenCount: items.filter((item) => item.isHidden).length,
      totalBidStamps: items.filter((item) => ['BIDDING', 'WON'].includes(item.status)).reduce((sum, item) => sum + item.bidStamps, 0)
    }
  };
}

async function findBidForAdmin(executor, bidId, { lock = false } = {}) {
  const [rows] = await executor.query(
    `SELECT id, owner_user_id AS ownerUserId, placement, store_no AS storeNo, target_month AS targetMonth,
            bid_stamps AS bidStamps, status, is_hidden AS isHidden
       FROM banner_ad_bids WHERE id = ?${lock ? ' FOR UPDATE' : ''}`,
    [bidId]
  );
  return rows[0] || null;
}

// 노출 중지/재개. 순위와 스탬프는 그대로 두고 공개 배너 목록에서만 빠진다.
async function adminSetBidHidden({ bidId, hidden, reason = '' }) {
  const pool = getPool();
  const bid = await findBidForAdmin(pool, bidId);
  if (!bid) throw createHttpError('입찰을 찾을 수 없습니다.', 404);
  if (bid.status === 'CANCELED' || bid.status === 'LOST') throw createHttpError('취소되었거나 미낙찰된 입찰은 노출 상태를 바꿀 수 없습니다.', 409);
  const normalizedReason = String(reason || '').trim().slice(0, 255);
  await pool.query('UPDATE banner_ad_bids SET is_hidden = ?, hidden_reason = ? WHERE id = ?', [hidden ? 1 : 0, hidden ? normalizedReason || null : null, bid.id]);
  return { ...bid, isHidden: hidden, hiddenReason: normalizedReason };
}

// 입찰중인 건을 관리자가 취소하고 입찰 스탬프를 전액 환불한다.
async function adminCancelBid({ bidId, reason = '' }) {
  const pool = getPool();
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const bid = await findBidForAdmin(connection, bidId, { lock: true });
    if (!bid) throw createHttpError('입찰을 찾을 수 없습니다.', 404);
    if (bid.status !== 'BIDDING') throw createHttpError('입찰중인 건만 취소할 수 있습니다. (마감 후에는 노출 중지를 사용하세요)', 409);
    const config = getPlacementConfig(bid.placement);
    const normalizedReason = String(reason || '').trim().slice(0, 100);
    await connection.query("UPDATE banner_ad_bids SET status = 'CANCELED' WHERE id = ?", [bid.id]);
    await insertStampHistory(connection, {
      userId: bid.ownerUserId,
      actionType: 'BANNER_AD_REFUND',
      amount: Number(bid.bidStamps),
      reason: `${describeTarget(config, bid.targetMonth)} 관리자 입찰 취소 환불${normalizedReason ? ` (${normalizedReason})` : ''}`,
      sourceLabel: `BANNER_AD_REFUND-ADMIN-${bid.id}`
    });
    await connection.commit();
    return { ...bid, refundedStamps: Number(bid.bidStamps) };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

function describeBidForMessage(bid) {
  const config = getPlacementConfig(bid.placement);
  return config ? describeTarget(config, bid.targetMonth) : '배너광고';
}

module.exports = {
  adminListAuctionMonths,
  adminListBids,
  adminSetBidHidden,
  adminCancelBid,
  describeBidForMessage,
  BANNER_AUCTION_PLACEMENTS,
  countCreativesUsingImage,
  listCreatives,
  saveCreative,
  listMyRecentBids,
  getPlacementConfig,
  getUpcomingAuction,
  getCurrentMonthKey,
  placeBid,
  cancelBid,
  settleClosedBannerAuctions,
  startBannerAuctionSettleScheduler,
  listExposedBannerAds,
  getPlacementOverview
};
