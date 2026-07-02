/**
 * 파일 역할: LIVE 페이지용 필터/목록 조회 요청을 처리하는 컨트롤러 파일.
 */
const liveModel = require('../models/liveModel');
const adminModel = require('../models/adminModel');

const LIVE_DB_CONNECTION_ERROR_CODES = new Set([
  'ECONNREFUSED',
  'ENOTFOUND',
  'ETIMEDOUT',
  'EHOSTUNREACH',
  'ENETUNREACH'
]);
const TOP_AD_PLACEMENTS = new Set(['HOME', 'COMMUNITY']);
const LIVE_CATEGORY_ALIASES = {
  room: 'waiting',
  rooms: 'waiting',
  waiting: 'waiting',
  wait: 'waiting',
  룸: 'waiting',
  방: 'waiting',
  웨이팅: 'waiting',
  entry: 'entry',
  entries: 'entry',
  엔트리: 'entry',
  출근부: 'entry',
  choice: 'choice',
  choices: 'choice',
  choiceTalk: 'choice',
  choicetalk: 'choice',
  초이스톡: 'choice',
  초톡: 'choice',
  chojoong: 'chojoong',
  초중: 'chojoong'
};

function normalizeLiveCategory(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  return LIVE_CATEGORY_ALIASES[raw] || LIVE_CATEGORY_ALIASES[raw.toLowerCase()] || raw;
}

function parsePositiveInt(value) {
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function handleLiveError(error, next, res) {
  if (error.code === 'ER_NO_SUCH_TABLE') {
    return res.status(404).json({ message: 'LIVE 페이지 조회 대상 테이블을 찾을 수 없습니다.' });
  }

  if (error.code === 'ER_BAD_DB_ERROR') {
    return res.status(503).json({ message: 'LIVE 전용 데이터베이스를 찾을 수 없습니다.', detail: error.message });
  }

  if (LIVE_DB_CONNECTION_ERROR_CODES.has(error.code)) {
    return res.status(503).json({ message: 'LIVE 전용 데이터베이스에 연결할 수 없습니다.', detail: error.message });
  }

  return next(error);
}

async function getLiveFilters(req, res, next) {
  try {
    const data = await liveModel.getLiveFilters();
    return res.json(data);
  } catch (error) {
    return handleLiveError(error, next, res);
  }
}

async function getLiveEntries(req, res, next) {
  try {
    const categoryKey = normalizeLiveCategory(req.query.category || req.query.infoType || req.query.type);
    const storeNo = parsePositiveInt(req.query.storeNo);
    const { limit, offset } = req.query;
    const data = await liveModel.listLiveEntries(categoryKey, { storeNo, limit, offset });
    const totalCount = await liveModel.countRows(data.category.tableName, {
      storeNo,
      storeName: data.selectedStore?.storeName || ''
    });

    return res.json({
      selectedCategory: data.category,
      selectedStoreNo: data.selectedStore?.storeNo || null,
      selectedStoreName: data.selectedStore?.storeName || '전체',
      totalCount,
      columns: data.columns,
      titleColumn: data.titleColumn,
      storeFilterColumn: data.storeFilterColumn,
      rows: data.rows,
      limit: data.rowLimit,
      offset: data.rowOffset,
      hasMore: data.category.key !== 'entry' && totalCount > (data.rowOffset + data.rows.length),
      nextOffset: data.category.key !== 'entry' ? data.rowOffset + data.rows.length : data.rowOffset
    });
  } catch (error) {
    return handleLiveError(error, next, res);
  }
}


async function getLiveSignal(req, res, next) {
  try {
    const { category, infoType, type, info, storeNo, store_no: storeNoSnake, storeNumber, limit, offset } = req.query;
    const requestedInfoType = category || infoType || type || info;
    const categoryKey = normalizeLiveCategory(requestedInfoType);
    const normalizedStoreNo = parsePositiveInt(storeNo || storeNoSnake || storeNumber);

    if (!categoryKey) {
      return res.status(400).json({ message: '조회할 LIVE 정보 유형이 필요합니다. 예: room, entry, choiceTalk' });
    }

    if (!Object.prototype.hasOwnProperty.call(liveModel.LIVE_CATEGORY_MAP, categoryKey)) {
      return res.status(400).json({ message: '지원하지 않는 LIVE 정보 유형입니다.', allowedTypes: Object.keys(liveModel.LIVE_CATEGORY_MAP) });
    }

    if (!normalizedStoreNo) {
      return res.status(400).json({ message: '유효한 스토어넘버가 필요합니다.' });
    }

    const data = await liveModel.listLiveEntries(categoryKey, { storeNo: normalizedStoreNo, limit, offset });
    const totalCount = await liveModel.countRows(data.category.tableName, {
      storeNo: normalizedStoreNo,
      storeName: data.selectedStore?.storeName || ''
    });

    return res.json({
      storeNo: normalizedStoreNo,
      storeName: data.selectedStore?.storeName || '',
      requestedInfoType: requestedInfoType || null,
      selectedCategory: data.category,
      totalElements: totalCount,
      columns: data.columns,
      content: data.rows,
      limit: data.rowLimit,
      offset: data.rowOffset
    });
  } catch (error) {
    return handleLiveError(error, next, res);
  }
}

async function getLiveAds(req, res, next) {
  try {
    const storeNo = parsePositiveInt(req.query.storeNo);
    if (!storeNo) {
      return res.status(400).json({ message: '유효한 매장 번호가 필요합니다.' });
    }

    const ads = await adminModel.listLiveAdsByStore(storeNo);
    return res.json({
      storeNo,
      content: ads,
      totalElements: ads.length
    });
  } catch (error) {
    return handleLiveError(error, next, res);
  }
}

async function getTopAds(req, res, next) {
  try {
    const placement = String(req.query.placement || 'HOME').trim().toUpperCase();
    if (!TOP_AD_PLACEMENTS.has(placement)) {
      return res.status(400).json({ message: '유효한 상단 광고 위치값이 필요합니다.' });
    }

    const ads = await adminModel.listTopAdsByPlacement(placement);
    return res.json({
      placement,
      content: ads,
      totalElements: ads.length
    });
  } catch (error) {
    return handleLiveError(error, next, res);
  }
}

async function getBusinessAdAreas(req, res, next) {
  try {
    const rows = await adminModel.listPublicBusinessAdAreas();
    const districtMap = new Map();

    for (const row of rows) {
      const region = String(row.region || '').trim();
      const district = String(row.district || '').trim();
      if (!region) continue;

      if (!districtMap.has(region)) {
        districtMap.set(region, new Set());
      }
      if (district) {
        districtMap.get(region).add(district);
      }
    }

    const content = Array.from(districtMap.entries()).map(([region, districts]) => ({
      region,
      districts: Array.from(districts)
    }));

    return res.json({
      content,
      totalElements: content.length
    });
  } catch (error) {
    return handleLiveError(error, next, res);
  }
}

async function getBusinessAd(req, res, next) {
  try {
    const slug = String(req.params.id || '').trim();
    const ad = await adminModel.findPublicBusinessAdBySlug(slug);

    if (!ad) {
      return res.status(404).json({ message: '업체정보를 찾을 수 없습니다.' });
    }

    await adminModel.increaseBusinessAdViewCount(ad.id);
    return res.json({
      content: {
        ...ad,
        viewCount: Number(ad.viewCount || 0) + 1
      }
    });
  } catch (error) {
    return handleLiveError(error, next, res);
  }
}

async function recordBusinessAdView(req, res, next) {
  try {
    const adId = parsePositiveInt(req.params.id);
    if (!adId) {
      return res.status(400).json({ message: '유효한 업체정보 번호가 필요합니다.' });
    }

    const updated = await adminModel.increaseBusinessAdViewCount(adId);
    if (!updated) {
      return res.status(404).json({ message: '노출 가능한 업체정보를 찾을 수 없습니다.' });
    }

    return res.json({ success: true });
  } catch (error) {
    return handleLiveError(error, next, res);
  }
}

async function getBusinessAds(req, res, next) {
  try {
    const region = String(req.query.region || '').trim();
    const district = String(req.query.district || '').trim();
    const category = String(req.query.category || '').trim();
    const keyword = String(req.query.keyword || '').trim();
    const ads = await adminModel.listPublicBusinessAds({ region, district, category, keyword });
    return res.json({
      region: region || null,
      district: district || null,
      category: category || null,
      keyword: keyword || null,
      content: ads,
      totalElements: ads.length
    });
  } catch (error) {
    return handleLiveError(error, next, res);
  }
}

module.exports = {
  getLiveFilters,
  getLiveEntries,
  getLiveSignal,
  getLiveAds,
  getTopAds,
  getBusinessAdAreas,
  recordBusinessAdView,
  getBusinessAd,
  getBusinessAds
};
