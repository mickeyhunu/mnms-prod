/**
 * 파일 역할: chatbotdb 조회 요청을 처리하는 컨트롤러 파일.
 */
const chatbotModel = require('../models/chatbotModel');

function handleChatbotError(error, res, next) {
  if (error.message.includes('유효하지 않은 테이블 이름')) {
    return res.status(400).json({ message: error.message });
  }
  if (error.code === 'ER_NO_SUCH_TABLE') {
    return res.status(404).json({ message: '요청한 테이블을 찾을 수 없습니다.' });
  }
  return next(error);
}

async function listAvailableTables(_req, res, next) {
  try {
    const tables = await chatbotModel.listTables();
    return res.json({
      content: tables,
      totalElements: tables.length
    });
  } catch (error) {
    return handleChatbotError(error, res, next);
  }
}

async function listTableRows(req, res, next) {
  try {
    const tableName = req.query.table;
    if (!tableName) {
      return res.status(400).json({ message: '조회할 테이블 이름(table)이 필요합니다.' });
    }

    const limit = req.query.limit;
    const rows = await chatbotModel.listTableRows(tableName, limit);
    const columns = await chatbotModel.getTableColumns(tableName);
    const sortColumn = await chatbotModel.resolveSortColumn(tableName);

    return res.json({
      table: String(tableName).trim(),
      columns: columns.map((column) => ({
        name: column.Field,
        type: column.Type,
        nullable: column.Null === 'YES',
        key: column.Key,
        defaultValue: column.Default,
        extra: column.Extra
      })),
      sortColumn,
      content: rows,
      totalElements: rows.length,
      fetchedAt: new Date().toISOString()
    });
  } catch (error) {
    return handleChatbotError(error, res, next);
  }
}

module.exports = {
  listAvailableTables,
  listTableRows
};
