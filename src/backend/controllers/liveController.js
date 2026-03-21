/**
 * 파일 역할: LIVE 페이지용 필터/목록 조회 요청을 처리하는 컨트롤러 파일.
 */
const liveModel = require('../models/liveModel');

function handleLiveError(error, next, res) {
  if (error.code === 'ER_NO_SUCH_TABLE') {
    return res.status(404).json({ message: 'LIVE 페이지 조회 대상 테이블을 찾을 수 없습니다.' });
  }

  if (error.code === 'ER_BAD_DB_ERROR') {
    return res.status(503).json({ message: 'LIVE 전용 데이터베이스를 찾을 수 없습니다.', detail: error.message });
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
    const storeNo = Number.parseInt(req.query.storeNo, 10);
    const limit = req.query.limit;
    const offset = req.query.offset;
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

module.exports = {
  getLiveFilters,
  getLiveEntries
};
