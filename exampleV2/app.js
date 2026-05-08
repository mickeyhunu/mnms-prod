const express = require('express');
const session = require('express-session');
const path    = require('path');

const app = express();
// 본 샘플은 reg_cert_key, ordr_idxx 전달에 세션을 사용하지만,
// 실제 운영 환경에서는 세션 대신 DB 또는 별도 저장소 사용을 권장합니다.
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(session({
    secret: 'kcp_sample_secret',
    resave: false,
    saveUninitialized: true,
}));

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

const indexRouter = require('./routes/index');
app.use('/', indexRouter);

app.listen(3000, () => {
    console.log('start! express server on http://localhost:3000');
});
