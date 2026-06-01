# GAP Library 백엔드 API/기능 명세서 (FastAPI 연동용)

작성일: 2026-06-01
대상 프론트엔드: `gap-library` (React + TypeScript)

## 1. 목표

이 문서는 현재 프론트엔드(Mock/localStorage 기반)를 실제 FastAPI 백엔드와 연결하기 위한 **확정 구현 지시서**입니다.

백엔드는 아래를 만족해야 합니다.
- 인증/인가
- 사용자/권한 관리(관리자 기능 포함)
- 회원가입 요청 승인 플로우
- 문서 CRUD 및 문서 본문(BlockNote JSON) 저장
- 카테고리 트리 CRUD + 드래그앤드롭 이동
- 서식(템플릿) 관리
- 댓글/공감(문서 보기)
- 통계/그래프용 집계 API

---

## 2. 기술/아키텍처 요구사항

- 프레임워크: FastAPI
- DB: PostgreSQL (권장) + SQLAlchemy 2.x + Alembic
- 인증: JWT (Access + Refresh)
- 비밀번호: bcrypt 해시
- 시간: UTC 저장, 응답은 ISO 8601 (`YYYY-MM-DDTHH:mm:ss.sssZ`)
- API Prefix: `/api/v1`
- OpenAPI 문서: `/docs` 활성화
- CORS: 프론트 도메인 허용 (`http://localhost:5173` 등)

필수 원칙:
- 프론트에서 쓰는 ID는 문자열이므로 백엔드도 문자열 반환
- soft delete 여부는 기능별로 명시
- 에러 응답 포맷 통일

---

## 3. 공통 응답 규격

### 3.1 성공
- 일반: `{ "data": ... }`
- 리스트: `{ "data": [...], "meta": { ... } }`

### 3.2 실패
```json
{
  "error": {
    "code": "STRING_CODE",
    "message": "사용자에게 보여줄 메시지",
    "details": {}
  }
}
```

### 3.3 대표 에러 코드
- `UNAUTHORIZED`
- `FORBIDDEN`
- `NOT_FOUND`
- `VALIDATION_ERROR`
- `CONFLICT`
- `INTERNAL_ERROR`

---

## 4. 인증/인가

## 4.1 역할
- `admin`
- `member`

## 4.2 토큰 정책
- Access Token: 30분
- Refresh Token: 14일
- Refresh 회전(rotate) 권장

## 4.3 엔드포인트

### POST `/api/v1/auth/login`
요청:
```json
{ "email": "admin@gap.org", "password": "string" }
```
응답:
```json
{
  "data": {
    "accessToken": "jwt",
    "refreshToken": "jwt",
    "user": {
      "id": "user-1",
      "name": "GAP 관리자",
      "email": "admin@gap.org",
      "role": "admin",
      "organization": "GAP",
      "avatarUrl": "https://...",
      "createdAt": "2026-01-01T00:00:00.000Z"
    }
  }
}
```

### POST `/api/v1/auth/refresh`
요청:
```json
{ "refreshToken": "jwt" }
```
응답: 새 access/refresh

### POST `/api/v1/auth/logout`
- refresh token 무효화

### GET `/api/v1/auth/me`
- 현재 로그인 사용자 반환

---

## 5. 사용자/관리자 기능

## 5.1 사용자 조회/수정

### GET `/api/v1/users/me`
### PATCH `/api/v1/users/me`
요청(선택 필드):
```json
{
  "name": "새 이름",
  "avatarUrl": "https://...",
  "organization": "GAP"
}
```

### POST `/api/v1/users/me/avatar`
- `multipart/form-data`
- 필드: `file`
- 응답: 업로드된 `avatarUrl`

## 5.2 관리자: 사용자 목록/역할 변경

### GET `/api/v1/admin/users`
- admin만
- 쿼리: `q`, `role`, `page`, `pageSize`

### PATCH `/api/v1/admin/users/{userId}/role`
요청:
```json
{ "role": "admin" }
```

권한 규칙:
- admin만 가능
- 마지막 admin 강등 금지

---

## 6. 회원가입 요청 승인 플로우

현재 프론트 요구사항:
- 회원가입 즉시 계정 생성 X
- 관리자 승인 후 로그인 가능

### POST `/api/v1/signup-requests`
요청:
```json
{
  "name": "홍길동",
  "email": "user@gap.org",
  "password": "plain",
  "inviteCode": "INVITE-2026"
}
```
동작:
- 비밀번호 해시 저장
- 상태: `pending`

### GET `/api/v1/admin/signup-requests`
- pending 목록

### POST `/api/v1/admin/signup-requests/{requestId}/approve`
동작:
- users 테이블에 member 생성
- 요청 상태 `approved`

### POST `/api/v1/admin/signup-requests/{requestId}/reject`
동작:
- 요청 상태 `rejected`

### 상태 값
- `pending | approved | rejected`

---

## 7. 문서(Document) 도메인

## 7.1 문서 타입 계약
```ts
type Document = {
  id: string;
  title: string;
  content: any[];          // BlockNote blocks JSON
  contentText: string;     // 검색용 텍스트
  summary?: string;
  category?: string;
  ownerId: string;
  ownerName: string;
  createdAt: string;
  updatedAt: string;
  status: "draft" | "published";
};
```

## 7.2 엔드포인트

### GET `/api/v1/documents`
쿼리:
- `q`
- `categoryId`
- `ownerId`
- `status`
- `page`, `pageSize`
- `sort` (`updatedAt:desc` 기본)

### POST `/api/v1/documents`
요청:
```json
{
  "title": "새 문서",
  "content": [],
  "categoryId": "folder-1",
  "status": "draft"
}
```
서버 동작:
- `contentText` 자동 추출/저장
- owner 정보 현재 사용자 기준 세팅

### GET `/api/v1/documents/{documentId}`
- 문서 보기용

### PATCH `/api/v1/documents/{documentId}`
요청 예:
```json
{
  "title": "수정 제목",
  "content": [ ... ],
  "categoryId": "folder-2",
  "summary": "요약",
  "status": "published"
}
```
서버 동작:
- `content` 변경 시 `contentText` 재생성

### DELETE `/api/v1/documents/{documentId}`
- 작성자 또는 admin만

### POST `/api/v1/documents/{documentId}/open`
- 문서 열람 시 `lastOpenedAt` 업데이트

---

## 8. 카테고리(폴더 트리) 관리

목표:
- 윈도우 탐색기식 트리
- 드래그앤드롭 이동

### 폴더 타입
```ts
type FolderNode = {
  id: string;
  name: string;
  parentId: string | null;
  order: number;
  createdAt: string;
  updatedAt: string;
};
```

### GET `/api/v1/categories/tree`
- 전체 트리 반환

### POST `/api/v1/categories`
요청:
```json
{ "name": "운영", "parentId": "root" }
```

### PATCH `/api/v1/categories/{categoryId}`
요청:
```json
{ "name": "새 이름" }
```

### DELETE `/api/v1/categories/{categoryId}`
하위 포함 전체 삭제

### POST `/api/v1/categories/{categoryId}/move`
요청:
```json
{
  "newParentId": "folder-2",
  "newOrder": 3,
  "includeChildren": true
}
```
- 프론트의 확인 모달 이후 호출

---

## 9. 서식(Template) 관리

서식은 현재 markdown 원문 + BlockNote 렌더링 사용.

### 타입
```ts
type Template = {
  id: string;
  name: string;
  content: string;      // markdown
  createdBy: string;
  createdAt: string;
  updatedAt: string;
};
```

### GET `/api/v1/templates`
### POST `/api/v1/templates`
### GET `/api/v1/templates/{templateId}`
### PATCH `/api/v1/templates/{templateId}`
### DELETE `/api/v1/templates/{templateId}`

요구사항:
- 수정 모드/저장 UX와 맞게 PATCH 원자성 보장
- 이름 중복 허용 여부 정책 결정(권장: 허용)

### POST `/api/v1/templates/{templateId}/apply`
요청:
```json
{ "documentId": "doc-1" }
```
동작:
- 템플릿 markdown을 BlockNote blocks로 변환(서버 또는 프론트)
- 문서 content 갱신

---

## 10. 문서 보기 기능: 댓글/공감

### 공감(Like)

### POST `/api/v1/documents/{documentId}/reactions`
요청:
```json
{ "type": "like" }
```

### DELETE `/api/v1/documents/{documentId}/reactions`

### GET `/api/v1/documents/{documentId}/reactions`
응답:
```json
{ "data": { "likeCount": 10, "likedByMe": true } }
```

### 댓글(Comment)

### GET `/api/v1/documents/{documentId}/comments`
### POST `/api/v1/documents/{documentId}/comments`
요청:
```json
{ "content": "좋은 문서입니다." }
```

### PATCH `/api/v1/comments/{commentId}`
### DELETE `/api/v1/comments/{commentId}`

댓글 응답 필드에 포함:
- 작성자 `name`
- 작성자 `avatarUrl`

---

## 11. 대시보드/마이페이지 통계 API

프론트 화면 요구와 정확히 맞출 것.

### GET `/api/v1/stats/dashboard`
응답:
```json
{
  "data": {
    "totalDocuments": 120,
    "myDocuments": 18,
    "recentEditedDocuments": [
      { "id": "doc-1", "title": "...", "updatedAt": "...", "ownerName": "..." }
    ],
    "uploadTrend": {
      "unit": "week",
      "points": [
        { "label": "2026-W20", "userName": "GAP 관리자", "count": 5 },
        { "label": "2026-W20", "userName": "홍길동", "count": 2 }
      ]
    }
  }
}
```

### GET `/api/v1/stats/mypage`
응답:
```json
{
  "data": {
    "uploadedFileCount": 24,
    "recentUploads": [
      { "documentId": "doc-3", "title": "...", "updatedAt": "..." }
    ],
    "myUploadTrend": {
      "unit": "month",
      "points": [
        { "label": "2026-01", "count": 3 },
        { "label": "2026-02", "count": 6 }
      ]
    }
  }
}
```

---

## 12. 권한 매트릭스

- `member`
  - 본인 프로필 수정
  - 문서 생성/조회/수정/삭제(본인 문서)
  - 댓글/공감
  - 카테고리/서식 조회
- `admin`
  - 위 기능 전체
  - 사용자 역할 변경
  - 가입 요청 승인/거절
  - 카테고리 전체 관리/서식 관리

---

## 13. DB 스키마 최소안

테이블:
- `users`
- `signup_requests`
- `documents`
- `categories`
- `templates`
- `document_reactions`
- `comments`
- `refresh_tokens`

권장 인덱스:
- `users(email unique)`
- `documents(owner_id)`
- `documents(updated_at desc)`
- `documents(content_text gin_trgm_ops)` (검색)
- `categories(parent_id, order)`
- `signup_requests(status, requested_at)`

---

## 14. 프론트 연동 단계 지시

1. `src/lib/mock-api.ts` 인터페이스와 동일한 `apiClient` 작성
2. 인증부터 교체
   - login / me / logout / refresh
3. 문서 API 교체
   - 목록, 상세, 생성, 수정, 삭제
4. 카테고리 API 교체
5. 서식 API 교체
6. 댓글/공감 API 교체
7. 관리자 API 교체

주의:
- 프론트의 날짜 렌더링은 `toLocaleString()` 기반이라 ISO 문자열 유지 필수
- 기존 타입(`User`, `Document`) 필드 누락 금지
- `content`는 반드시 JSON 그대로 왕복되어야 함

---

## 15. 수용 기준(Definition of Done)

- 관리자 승인 전 계정 로그인 불가
- 승인 후 로그인 가능
- 관리자 페이지에서 역할 변경 즉시 반영
- 문서 편집 후 새로고침해도 내용 복원
- 폴더 이동/이름 변경 결과 즉시 반영
- 서식 수정/저장/삭제 정상
- 문서 보기에서 댓글/공감 정상
- 대시보드/마이페이지 그래프 API 데이터 정상 표시
- 모든 보호 라우트에서 401/403 처리 일관

---

## 16. 확장 예정(선택)

- 문서 버전 히스토리
- 첨부파일 업로드(S3/MinIO)
- RAG 등록 비동기 큐
- 감사 로그(audit log)
- 조직/팀 단위 권한

