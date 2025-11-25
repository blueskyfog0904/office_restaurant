# Supabase JWT 수명 설정 가이드

## 왜 JWT 수명을 연장해야 하나요?

모바일 브라우저는 백그라운드에서 JavaScript 타이머/이벤트를 강하게 제한합니다.
기본 JWT 수명(1시간)이면 30분 백그라운드 후 복귀 시 토큰이 이미 만료되어 있을 수 있습니다.

JWT 수명을 7일로 연장하면:
- 일반적인 사용 패턴(30분~몇 시간 백그라운드)에서 토큰이 살아있음
- 포그라운드 복귀 시 갱신 실패 확률 감소
- 사용자 경험 개선 (불필요한 재로그인 감소)

## 설정 방법

### 1. Supabase 대시보드 접속
- https://supabase.com/dashboard 로그인
- 해당 프로젝트 선택

### 2. JWT Expiry 설정 변경
1. 좌측 메뉴에서 **Authentication** 클릭
2. **Providers** 탭 → **Settings** 섹션으로 이동
3. **JWT expiry** 항목 찾기
4. 기본값 `3600` (1시간) → `604800` (7일)로 변경
5. **Save** 클릭

### 3. Refresh Token 수명 확인
- 같은 Settings 페이지에서 **Refresh Token Rotation** 섹션 확인
- **Refresh Token Reuse Interval**: 기본값 유지 권장
- refresh_token 수명은 보통 JWT expiry보다 길게 설정되어 있음 (기본 7일 이상)

## 권장 설정값

| 항목 | 권장값 | 설명 |
|------|--------|------|
| JWT expiry | 604800 (7일) | access_token 유효 기간 |
| Refresh Token Reuse Interval | 10 (기본값) | 동일 refresh_token 재사용 허용 시간(초) |

## 보안 고려사항

### JWT 수명 연장의 위험성
- 토큰 탈취 시 공격자가 더 오래 사용 가능
- 민감한 서비스에서는 짧은 수명 권장

### 이 프로젝트에서 7일이 적절한 이유
1. 음식점 정보 조회 서비스로 민감도가 낮음
2. 결제, 개인정보 수정 등 민감한 작업은 추가 인증 요구 가능
3. 사용자 편의성이 보안보다 우선되는 서비스 특성

### 추가 보안 조치 (선택사항)
- 민감한 API 호출 시 `supabase.auth.getUser()`로 서버 사이드 검증
- 비밀번호 변경, 계정 삭제 등은 재인증 요구
- 의심스러운 활동 감지 시 강제 로그아웃

## 변경 후 확인사항

1. 기존 로그인 사용자는 다음 로그인 시 새 수명 적용
2. 이미 발급된 토큰은 기존 수명 유지
3. 변경 즉시 새로 발급되는 토큰부터 적용

## 관련 코드

포그라운드 복귀 시 세션 갱신 로직:
- `web/src/contexts/AuthContext.tsx` - `triggerSessionResume()`

카카오 로그인 전 세션 정리:
- `web/src/services/kakaoAuthService.ts` - `loginWithKakao()`

세션 만료 감지 및 처리:
- `web/src/services/sessionManager.ts` - `executeWithSession()`

