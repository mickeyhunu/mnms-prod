# 외부 신호 수신 API 안내

이 문서는 외부 서버가 신호를 보내면 서버가 데이터를 조회해 JSON으로 반환하는 읽기 전용 API를 설명합니다.
데이터 생성/수정이 없으므로 HTTP 메서드는 `GET`만 사용합니다.

## 1. LIVE 카테고리 정보 조회

스토어 번호와 LIVE 정보 유형을 query string으로 전달하면 해당 카테고리 데이터를 반환합니다.

```http
GET /api/live/signal?storeNo=1&type=room
```

### Query parameters

| 이름 | 필수 | 설명 | 예시 |
| --- | --- | --- | --- |
| `storeNo` | 예 | 조회할 스토어 번호입니다. `store_no`, `storeNumber`도 허용합니다. | `1` |
| `type` | 예 | LIVE 정보 유형입니다. `category`, `infoType`, `info`도 허용합니다. | `room` |
| `limit` | 아니오 | 반환 개수입니다. 기본값은 기존 LIVE 목록 정책을 따릅니다. | `50` |
| `offset` | 아니오 | 페이지네이션 시작 위치입니다. | `0` |

### 지원하는 LIVE 정보 유형

| 요청 값 | 조회 카테고리 |
| --- | --- |
| `room`, `rooms`, `waiting`, `wait`, `룸`, `방`, `웨이팅` | 웨이팅/룸 |
| `entry`, `entries`, `엔트리`, `출근부` | 엔트리 |
| `choice`, `choices`, `choiceTalk`, `choicetalk`, `초이스톡`, `초톡` | 초이스톡 |
| `chojoong`, `초중` | 초중 |

### 요청 예시

```bash
curl 'https://nightmens.com/api/live/signal?storeNo=12&type=초이스톡&limit=20'
```

### 응답 예시

```json
{
  "storeNo": 12,
  "storeName": "예시 매장",
  "requestedInfoType": "초이스톡",
  "selectedCategory": {
    "key": "choice",
    "label": "초이스톡",
    "tableName": "LIVE_CHOICE_HISTORY",
    "sourceTableName": "INFO_CHOICE"
  },
  "totalElements": 25,
  "columns": ["id", "storeNo", "choiceMsg", "createdAt"],
  "content": [
    {
      "id": 101,
      "storeNo": 12,
      "choiceMsg": "예시 메시지",
      "createdAt": "2026-07-02 12:00:00"
    }
  ],
  "limit": 20,
  "offset": 0
}
```

## 2. 게시글 제목 검색

게시판과 검색어를 query string으로 전달하면 해당 게시판에서 제목에 검색어가 포함된 게시글 목록을 반환합니다.
예를 들어 수신 데이터가 `후기`, `ㄷㅌ`이면 후기 게시판에서 제목에 `ㄷㅌ`가 포함된 게시글을 검색합니다.

```http
GET /api/posts/search-signal?board=후기&keyword=ㄷㅌ
```

### Query parameters

| 이름 | 필수 | 설명 | 예시 |
| --- | --- | --- | --- |
| `board` | 아니오 | 조회할 게시판입니다. `boardType`, `category`도 허용합니다. 생략하면 자유 게시판으로 처리됩니다. | `후기` |
| `keyword` | 예 | 제목 검색어입니다. `title`도 허용합니다. | `ㄷㅌ` |
| `page` | 아니오 | 0부터 시작하는 페이지 번호입니다. 기본값은 `0`입니다. | `0` |
| `size` | 아니오 | 페이지 크기입니다. 기본값은 `10`, 최대값은 `100`입니다. | `10` |

### 지원하는 게시판 값

| 요청 값 | 게시판 타입 |
| --- | --- |
| `전체`, `all`, `ALL` | 전체 |
| `자유`, `자유게시판`, `FREE` | 자유 |
| `익명`, `익명게시판`, `ANON` | 익명 |
| `후기`, `후기게시판`, `REVIEW` | 후기 |
| `썰`, `썰게시판`, `STORY` | 썰 |
| `출석`, `출석게시판`, `ATTENDANCE` | 출석 |
| `질문`, `질문게시판`, `QUESTION` | 질문 |
| `이벤트`, `EVENT` | 이벤트 |
| `홍보`, `PROMOTION` | 홍보 |

### 요청 예시

```bash
curl 'https://nightmens.com/api/posts/search-signal?board=후기&keyword=ㄷㅌ&page=0&size=10'
```

### 응답 예시

```json
{
  "boardType": "REVIEW",
  "keyword": "ㄷㅌ",
  "content": [
    {
      "id": 123,
      "title": "ㄷㅌ 후기 예시",
      "content": "후기 본문 예시입니다.",
      "url": "http://localhost:8080/post-detail/%E1%84%83%E1%84%90-%ED%9B%84%EA%B8%B0-%EC%98%88%EC%8B%9C-123",
      "boardType": "REVIEW",
      "authorNickname": "작성자",
      "viewCount": 10,
      "createdAt": "2026-07-02T00:00:00.000Z"
    }
  ],
  "totalElements": 1,
  "page": 0,
  "size": 10,
  "totalPages": 1
}
```
