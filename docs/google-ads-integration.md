# Google Ads API Integration (Web)

## 목적
- 프론트엔드에서 Google Ads 인증/조회 요청을 직접 Google API로 보내지 않고,
  백엔드 프록시(예: Supabase Edge Function)를 통해 안전하게 처리한다.
- 관리자 화면에서 연결 상태를 빠르게 점검할 수 있게 한다.

## 아키텍처
1. **Web(Admin)**
   - `src/services/googleAdsService.ts` 를 통해 요청 생성
   - Supabase 세션 토큰을 `Authorization` 헤더로 전달
   - 고객 ID/MCC ID를 요청 헤더로 전달
2. **Google Ads Proxy (Server)**
   - OAuth 토큰 교환/갱신
   - Developer Token, Client Secret 등 민감정보 보관
   - Google Ads API 호출 및 응답 정규화
3. **Google Ads API**
   - 계정 연결 상태 조회
   - 캠페인 목록 등 광고 데이터 조회

## 환경변수
- `REACT_APP_GOOGLE_ADS_API_BASE_URL` (선택)
  - 예: `https://<project>.supabase.co/functions/v1`
- `REACT_APP_SUPABASE_URL` (필수)
  - `REACT_APP_GOOGLE_ADS_API_BASE_URL` 미지정 시 `${REACT_APP_SUPABASE_URL}/functions/v1` 사용

## 프록시/함수 엔드포인트 계약(현재 프론트 기준)
- `POST /google-ads-auth-url`
  - OAuth 인증 URL 발급
- `POST /google-ads-exchange-code`
  - Authorization code 교환
- `POST /google-ads-connection-status`
  - 연결 여부/계정 정보 반환
- `POST /google-ads-accessible-customers`
  - 접근 가능한 광고 계정 목록 반환
- `POST /google-ads-test-connection`
  - 지정 고객 ID 기준 연결 테스트

## 관리자 점검 UI
- 파일: `src/pages/admin/SettingsPage.tsx`
- 기능:
  - 고객 ID/MCC ID 입력
  - 연결 점검 버튼으로 `POST /google-ads-connection-status` 호출
  - 연결 상태/요청 ID/점검 시각 출력

## 보안 주의사항
- Web 코드에 아래 값 저장 금지:
  - Google Ads Developer Token
  - OAuth Client Secret
  - Refresh Token 원문
- 토큰/비밀값은 반드시 서버에서만 관리
