/**
 * 파일 역할: LIVE 페이지용 필터/목록 조회 요청을 처리하는 컨트롤러 파일.
 */
const liveModel = require('../models/liveModel');

function handleLiveError(error, next, res) {
  if (error.code === 'ER_NO_SUCH_TABLE') {
    return res.status(404).json({ message: 'LIVE 페이지 조회 대상 테이블을 찾을 수 없습니다.' });
  }

  if (['ECONNREFUSED', 'ENOTFOUND', 'ETIMEDOUT', 'EHOSTUNREACH', 'ENETUNREACH'].includes(error.code)) {
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
    const categoryKey = req.query.category;
    const storeName = String(req.query.storeName || '').trim();
    const limit = req.query.limit;
    const data = await liveModel.listLiveEntries(categoryKey, { storeName, limit });
    const totalCount = await liveModel.countRows(data.category.tableName, storeName);

    return res.json({
      selectedCategory: data.category,
      selectedStoreName: storeName || '전체',
      totalCount,
      columns: data.columns,
      titleColumn: data.titleColumn,
      storeFilterColumn: data.storeFilterColumn,
      rows: data.rows
    });
  } catch (error) {
    return handleLiveError(error, next, res);
  }
}

module.exports = {
  getLiveFilters,
  getLiveEntries
};
