/**
 * Korea calendar expressions for databases that persist and serve timestamps in UTC.
 * Instant-based comparisons should continue to use UTC_TIMESTAMP(); these helpers are
 * for rules and reports whose meaning depends on a Korean calendar date.
 */
const KOREA_UTC_OFFSET_HOURS = 9;
const KOREA_CURRENT_DATE_SQL = `DATE(UTC_TIMESTAMP() + INTERVAL ${KOREA_UTC_OFFSET_HOURS} HOUR)`;
const KOREA_CURRENT_DAY_START_UTC_SQL = `(${KOREA_CURRENT_DATE_SQL} - INTERVAL ${KOREA_UTC_OFFSET_HOURS} HOUR)`;
const KOREA_NEXT_DAY_START_UTC_SQL = `(${KOREA_CURRENT_DATE_SQL} + INTERVAL 1 DAY - INTERVAL ${KOREA_UTC_OFFSET_HOURS} HOUR)`;

function koreaDateOfUtcColumnSql(column) {
  if (!/^[a-zA-Z_][a-zA-Z0-9_.]*$/.test(column)) {
    throw new Error('A trusted SQL column identifier is required');
  }
  return `DATE(${column} + INTERVAL ${KOREA_UTC_OFFSET_HOURS} HOUR)`;
}

module.exports = {
  KOREA_CURRENT_DATE_SQL,
  KOREA_CURRENT_DAY_START_UTC_SQL,
  KOREA_NEXT_DAY_START_UTC_SQL,
  koreaDateOfUtcColumnSql
};
