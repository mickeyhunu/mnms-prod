# 🌐 익명 커뮤니티 게시판 (Node.js + MySQL)

Spring Boot 런타임 대신 **Node.js(Express) + MySQL** 기반으로 실행되도록 변경했습니다.

## 기술 스택
- Backend: Node.js, Express
- Database: MySQL 8+
- Frontend: 기존 정적 HTML/CSS/JS 그대로 사용

## 1) MySQL 준비 (root 계정)
아래 환경변수 기본값으로 서버가 동작합니다.
- `MYSQL_HOST=127.0.0.1`
- `MYSQL_PORT=3306`
- `MYSQL_USER=root`
- `MYSQL_PASSWORD=root` 
- `MYSQL_DATABASE=midnightmens`

서버 시작 시 DB/테이블을 자동 생성합니다.

## 2) 실행 방법
```bash
npm install
npm run start
```

실행 후 접속
- http://localhost:8080

## 3) 기본 관리자 계정
- email: `admin@company.com`
- password: `admin1234`

## 주요 API
- 인증: `/api/auth/register`, `/api/auth/login`, `/api/auth/me`, `/api/auth/logout`
- 게시글: `/api/posts`, `/api/posts/:id`, `/api/posts/:id/like`, `/api/posts/:id/bookmark`
- 댓글: `/api/posts/:postId/comments`, `/api/comments/:id`
- 북마크: `/api/bookmarks/my`, `/api/bookmarks/check/:postId`, `/api/bookmarks/:postId/toggle`
- 쪽지: `/api/posts/messages/*`
- 관리자: `/api/admin/*`

## 주의
- 현재 비밀번호는 평문 저장 방식입니다. 운영 전에는 반드시 해시 암호화(예: bcrypt)를 적용하세요.
