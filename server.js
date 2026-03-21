/**
 * 파일 역할: Node/Express 서버를 초기화하고 백엔드 라우트를 연결하는 진입점 파일.
 */
const express = require('express');
const cors = require('cors');
const path = require('path');

require('./src/backend/config/loadEnv');

const { initDatabase, dbConfig } = require('./src/backend/config/database');
const authRoutes = require('./src/backend/routes/authRoutes');
const postRoutes = require('./src/backend/routes/postRoutes');
const userRoutes = require('./src/backend/routes/userRoutes');
const adminRoutes = require('./src/backend/routes/adminRoutes');
const supportRoutes = require('./src/backend/routes/supportRoutes');
const chatbotRoutes = require('./src/backend/routes/chatbotRoutes');
const liveRoutes = require('./src/backend/routes/liveRoutes');
const { startLiveHistoryScheduler } = require('./src/backend/utils/liveHistoryScheduler');

const app = express();
const PORT = Number(process.env.PORT || 8080);
const FRONTEND_DIR = path.join(__dirname, 'src/frontend');
let isDatabaseReady = false;

app.use(cors());
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true }));

app.use(express.static(FRONTEND_DIR));

app.use('/api', (req, res, next) => {
  if (req.path.startsWith('/live')) {
    return next();
  }

  if (!isDatabaseReady) {
    return res.status(503).json({ message: '데이터베이스 연결이 준비되지 않았습니다.' });
  }
  next();
});

app.use('/api/auth', authRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/users', userRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/support', supportRoutes);
app.use('/api/chatbot', chatbotRoutes);
app.use('/api/live', liveRoutes);

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
    isDatabaseReady = true;
    return startLiveHistoryScheduler()
      .catch((error) => {
        console.error('LIVE history scheduler start failed:', error.message);
      })
      .then(() => {
        app.listen(PORT, () => {
          console.log(`Express MVC server running on http://localhost:${PORT}`);
          console.log(`MySQL: ${dbConfig.user}@${dbConfig.host}:${dbConfig.port}/${dbConfig.database}`);
        });
      });
  })
  .catch((error) => {
    console.error('DB 초기화 실패:', error.message);
    startLiveHistoryScheduler()
      .catch((schedulerError) => {
        console.error('LIVE history scheduler start failed:', schedulerError.message);
      })
      .finally(() => {
        app.listen(PORT, () => {
          console.log(`Express MVC server running on http://localhost:${PORT}`);
          console.log('DB 연결 실패 상태로 실행 중입니다. API 요청은 503을 반환합니다.');
        });
      });
  });
