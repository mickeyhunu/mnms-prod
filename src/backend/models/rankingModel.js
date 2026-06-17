/**
 * 파일 역할: 월간 일반회원 랭킹 데이터 조회 쿼리를 담당하는 모델 파일.
 */
const { getPool } = require('../config/database');

const DEFAULT_LIMIT = 5;
const MAX_LIMIT = 5;

function normalizeLimit(limit) {
  const parsed = Number.parseInt(limit, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return DEFAULT_LIMIT;
  return Math.min(parsed, MAX_LIMIT);
}

function toDateOnly(value) {
  return value instanceof Date ? value.toISOString().slice(0, 10) : String(value).slice(0, 10);
}

async function getMonthlyRankings(options = {}) {
  const pool = getPool();
  const limit = normalizeLimit(options.limit);

  const [periodRows] = await pool.query(
    `SELECT DATE_FORMAT(CURRENT_DATE(), '%Y-%m-01') AS monthStart,
            DATE_ADD(DATE_FORMAT(CURRENT_DATE(), '%Y-%m-01'), INTERVAL 1 MONTH) AS nextMonthStart,
            YEAR(CURRENT_DATE()) AS year,
            MONTH(CURRENT_DATE()) AS month`
  );
  const period = periodRows[0];
  const params = [period.monthStart, period.nextMonthStart, limit];

  const memberWhere = `COALESCE(u.member_type, 'MEMBER') = 'MEMBER' AND COALESCE(u.role, 'MEMBER') <> 'ADMIN'`;

  const [pointsRows, attendanceRows, recommendedRows] = await Promise.all([
    pool.query(
      `SELECT u.id AS userId,
              u.nickname,
              u.total_points AS totalPoints,
              SUM(ph.points) AS score
         FROM point_histories ph
         INNER JOIN users u ON u.id = ph.user_id
        WHERE ${memberWhere}
          AND ph.created_at >= ?
          AND ph.created_at < ?
        GROUP BY u.id, u.nickname, u.total_points
       HAVING score > 0
        ORDER BY score DESC, u.total_points DESC, u.id ASC
        LIMIT ?`,
      params
    ),
    pool.query(
      `SELECT u.id AS userId,
              u.nickname,
              u.total_points AS totalPoints,
              COUNT(*) AS score
         FROM posts p
         INNER JOIN users u ON u.id = p.user_id
        WHERE ${memberWhere}
          AND p.board_type = 'ATTENDANCE'
          AND p.is_deleted = 0
          AND p.created_at >= ?
          AND p.created_at < ?
        GROUP BY u.id, u.nickname, u.total_points
        ORDER BY score DESC, u.total_points DESC, u.id ASC
        LIMIT ?`,
      params
    ),
    pool.query(
      `SELECT u.id AS userId,
              u.nickname,
              u.total_points AS totalPoints,
              COUNT(*) AS score
         FROM post_likes pl
         INNER JOIN posts p ON p.id = pl.post_id
         INNER JOIN users u ON u.id = p.user_id
        WHERE ${memberWhere}
          AND p.is_deleted = 0
          AND pl.created_at >= ?
          AND pl.created_at < ?
        GROUP BY u.id, u.nickname, u.total_points
        ORDER BY score DESC, u.total_points DESC, u.id ASC
        LIMIT ?`,
      params
    )
  ]);

  const mapRows = (rows) => rows.map((row, index) => ({
    rank: index + 1,
    userId: Number(row.userId),
    nickname: row.nickname || '익명회원',
    totalPoints: Number(row.totalPoints || 0),
    score: Number(row.score || 0)
  }));

  return {
    period: {
      year: Number(period.year),
      month: Number(period.month),
      monthStart: toDateOnly(period.monthStart),
      nextMonthStart: toDateOnly(period.nextMonthStart)
    },
    rankings: {
      points: mapRows(pointsRows[0]),
      attendancePosts: mapRows(attendanceRows[0]),
      receivedLikes: mapRows(recommendedRows[0])
    }
  };
}

module.exports = { getMonthlyRankings };
