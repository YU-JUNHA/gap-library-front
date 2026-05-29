# GAP Library Frontend

React + TypeScript + Vite 기반 GAP Library 프론트엔드 골격입니다.

## 실행 방법

1. `npm install`
2. `npm run dev`
3. 브라우저에서 표시된 로컬 주소 접속

## 주요 기능

- 로그인/회원가입 mock 인증(localStorage)
- 보호 라우팅(`/`, `/documents`, `/mypage`, `/settings`)
- 대시보드/문서목록/문서편집/마이페이지/설정 화면
- BlockNote 에디터 렌더링 및 문서 JSON 저장/복원
- 문서 자동 저장(debounce) 및 저장 상태 표시
- AI 도구 mock 동작(요약/맞춤법/태그/RAG)
- mock API 레이어 분리(`src/lib/mock-api.ts`)
- storage 유틸 분리(`src/lib/storage.ts`)

## 데모 계정

- 이메일: `admin@gap.org`
- 비밀번호: `1234`
