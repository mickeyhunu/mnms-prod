/** 홈 포스터의 노출 상태와 순서를 관리한다. */
const { getPool } = require('../config/database');

function mapPoster(row) {
  return {
    id: Number(row.id),
    title: row.title,
    imageUrl: row.image_url,
    targetUrl: row.target_url || '',
    isActive: Boolean(row.is_active),
    displayOrder: Number(row.display_order),
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

async function list({ activeOnly = false } = {}) {
  const [rows] = await getPool().query(
    `SELECT * FROM home_posters ${activeOnly ? 'WHERE is_active = 1' : ''}
     ORDER BY display_order ASC, id ASC`
  );
  return rows.map(mapPoster);
}

async function findById(id) {
  const [rows] = await getPool().query('SELECT * FROM home_posters WHERE id = ? LIMIT 1', [id]);
  return rows[0] ? mapPoster(rows[0]) : null;
}

async function create({ title, imageUrl, targetUrl, isActive, displayOrder, createdBy }) {
  const [result] = await getPool().query(
    'INSERT INTO home_posters (title, image_url, target_url, is_active, display_order, created_by) VALUES (?, ?, ?, ?, ?, ?)',
    [title, imageUrl, targetUrl || null, isActive ? 1 : 0, displayOrder, createdBy || null]
  );
  return findById(result.insertId);
}

async function update(id, { title, imageUrl, targetUrl, isActive, displayOrder }) {
  await getPool().query(
    'UPDATE home_posters SET title = ?, image_url = ?, target_url = ?, is_active = ?, display_order = ? WHERE id = ?',
    [title, imageUrl, targetUrl || null, isActive ? 1 : 0, displayOrder, id]
  );
  return findById(id);
}

async function remove(id) {
  const [result] = await getPool().query('DELETE FROM home_posters WHERE id = ?', [id]);
  return result.affectedRows > 0;
}

module.exports = { list, findById, create, update, remove };
