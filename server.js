const express = require('express');
const cors = require('cors');
const path = require('path');

const { initDatabase, dbConfig } = require('./src/backend/config/database');
const authRoutes = require('./src/backend/routes/authRoutes');
const postRoutes = require('./src/backend/routes/postRoutes');

const app = express();
const PORT = Number(process.env.PORT || 8080);
const FRONTEND_DIR = path.join(__dirname, 'src/frontend');
const LEGACY_STATIC_DIR = path.join(__dirname, 'src/main/resources/static');

app.use(cors());
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true }));

app.use(express.static(FRONTEND_DIR));
app.use(express.static(LEGACY_STATIC_DIR));

app.use('/api/auth', authRoutes);
app.use('/api/posts', postRoutes);

app.get('*', (req, res) => {
  if (req.path.startsWith('/api/')) return res.status(404).json({ message: 'Not Found' });
  res.sendFile(path.join(FRONTEND_DIR, 'index.html'));
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ message: '서버 오류가 발생했습니다.', detail: err.message });
});

initDatabase()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Express MVC server running on http://localhost:${PORT}`);
      console.log(`MySQL: ${dbConfig.user}@${dbConfig.host}:${dbConfig.port}/${dbConfig.database}`);
    });
  })
  .catch((error) => {
    console.error('DB 초기화 실패:', error.message);
    process.exit(1);
  });
