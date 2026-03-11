# 🌐 익명 커뮤니티 게시판 (Node.js + MySQL + Vue 3)

Node.js(Express) + MySQL 백엔드와 Vue 3 기반 프론트엔드 구조로 정리된 프로젝트입니다.

## 기술 스택
- Backend: Node.js, Express
- Frontend: Vue 3 (ESM), Vue Router
- Database: MySQL 8+

## 프로젝트 구조
```text
src
├── backend
│   ├── config
│   ├── controllers
│   ├── middlewares
│   ├── models
│   ├── routes
│   └── utils
└── frontend
    ├── index.html
    └── src
        ├── assets
        ├── components
        ├── router
        ├── scripts
        └── views
```

## 실행 방법
```bash
npm install
npm run start
```

실행 후 접속
- http://localhost:8080

## MySQL 기본 환경변수
- `MYSQL_HOST=127.0.0.1`
- `MYSQL_PORT=3306`
- `MYSQL_USER=root`
- `MYSQL_PASSWORD=root`
- `MYSQL_DATABASE=midnightmens`

## 기본 관리자 계정
- email: `admin@company.com`
- password: `admin1234`
