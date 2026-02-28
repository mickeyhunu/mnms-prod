# 🌐 익명 커뮤니티 게시판 (Node.js 버전)

기존 Spring Boot 기반 프로젝트를 **Node.js(Express)** 로 전환했습니다.

## 기술 스택
- Backend: Node.js + Express
- Frontend: 기존 정적 자원(HTML/CSS/JS) 재사용
- DB: 파일 기반 JSON(`data.json`)

## 실행 방법
```bash
npm install
npm run start
```

실행 후 접속:
- http://localhost:8080

## 기본 관리자 계정
- email: `admin@company.com`
- password: `admin1234`

## 주요 API
- 인증: `/api/auth/register`, `/api/auth/login`, `/api/auth/me`, `/api/auth/logout`
- 게시글: `/api/posts` (목록/상세/작성/수정/삭제), `/api/posts/:id/like`, `/api/posts/:id/bookmark`
- 댓글: `/api/posts/:postId/comments`, `/api/comments/:id`
- 쪽지: `/api/posts/messages/*`
- 관리자: `/api/admin/*`

## 참고
- 데이터는 `data.json`에 저장됩니다.
- 기존 Java/Spring 소스는 레포에 보존되어 있으며, 런타임은 `server.js` 기준으로 동작합니다.
