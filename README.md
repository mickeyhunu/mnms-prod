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
- `MYSQL_DATABASE=mnms_DB`

## mnms_DB / chatBot_DB 분리
- 사이트에서 생성/수정되는 회원, 게시글, 댓글, 문의 등의 데이터는 `mnms_DB`에 저장됩니다.
- `chatBot_DB`는 룸, 웨이팅, 초이스톡, 엔트리 정보를 조회하는 읽기 전용 소스로만 사용합니다.

메인 사이트 DB 환경변수(우선 사용):
- `MNMS_MYSQL_HOST`
- `MNMS_MYSQL_PORT`
- `MNMS_MYSQL_USER`
- `MNMS_MYSQL_PASSWORD`
- `MNMS_MYSQL_DATABASE` (기본값: `mnms_DB`)

## chatBot_DB 동시 사용 (별도 DB 풀)
메인 사이트 DB와 별개로 `chatBot_DB`를 동시에 연결할 수 있습니다.

- 관리자 전용 API: `GET /api/chatbot/table?table=<테이블명>&limit=100`
- 응답: 지정한 `chatBot_DB` 테이블의 최신 행 목록

추가 환경변수(미지정 시 메인 DB 설정값 상속):
- `CHATBOT_MYSQL_HOST`
- `CHATBOT_MYSQL_PORT`
- `CHATBOT_MYSQL_USER`
- `CHATBOT_MYSQL_PASSWORD`
- `CHATBOT_MYSQL_DATABASE` (기본값: `chatBot_DB`)

## 기본 관리자 계정
- email: `admin@company.com`
- password: `admin1234`
