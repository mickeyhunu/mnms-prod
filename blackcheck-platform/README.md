# 블랙체크 독립 플랫폼

밤치트 페이지의 핵심 기능(접근 코드, 번호 검색, 지역별 코멘트 작성, 추천, 관리자 삭제)을 독립적인 최상단 폴더로 복제한 정적 프론트엔드입니다.

## 실행/배포

- `blackcheck-platform/index.html`을 같은 도메인에서 열면 기존 `/api/bamcheat/*` API를 그대로 호출합니다.
- 다른 API 도메인을 써야 하면 `index.html`에서 `app.js`보다 먼저 아래 전역값을 선언하세요.

```html
<script>window.BLACKCHECK_API_PREFIX = 'https://example.com/api';</script>
```

## 접근 정책

- 기존 밤치트와 동일하게 접근 코드는 `blackcode`입니다.
- 로그인한 기업회원/관리자는 접근 코드 없이 이용할 수 있습니다.
- 코멘트 등록, 추천, 삭제 권한은 기존 API 권한을 그대로 따릅니다.
