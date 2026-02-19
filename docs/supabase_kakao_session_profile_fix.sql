-- 목적:
-- 1) 카카오 OAuth 재인증/세션 복귀 시 profiles.nickname 이 카카오 메타데이터로 덮어써지는 문제 방지
-- 2) 현재 profiles RLS 정책/트리거 상태 점검

-- =========================================================
-- A. 진단 쿼리
-- =========================================================

-- profiles RLS 정책 확인
select schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
from pg_policies
where schemaname = 'public' and tablename = 'profiles'
order by policyname;

-- 카카오 프로필 동기화 트리거 확인
select
  t.tgname as trigger_name,
  n.nspname as schema_name,
  c.relname as table_name,
  pg_get_triggerdef(t.oid) as trigger_def
from pg_trigger t
join pg_class c on c.oid = t.tgrelid
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'auth'
  and c.relname = 'users'
  and t.tgname = 'on_auth_user_created_kakao';

-- handle_kakao_user 함수 정의 확인
select pg_get_functiondef(p.oid)
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname = 'handle_kakao_user';

-- =========================================================
-- B. 수정 쿼리
-- 핵심: ON CONFLICT UPDATE 시 기존 profiles.nickname 우선 유지
-- =========================================================

create or replace function public.handle_kakao_user()
returns trigger as $$
begin
  insert into public.profiles (
    user_id,
    email,
    nickname,
    kakao_id,
    profile_image_url,
    provider,
    role
  )
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'name', new.raw_user_meta_data->>'nickname', 'Unknown'),
    new.raw_user_meta_data->>'sub',
    new.raw_user_meta_data->>'avatar_url',
    'kakao',
    'user'
  )
  on conflict (user_id)
  do update set
    email = coalesce(excluded.email, profiles.email),
    -- 중요: 사용자 커스텀 닉네임 우선 유지
    nickname = coalesce(nullif(profiles.nickname, ''), excluded.nickname),
    kakao_id = coalesce(excluded.kakao_id, profiles.kakao_id),
    profile_image_url = coalesce(excluded.profile_image_url, profiles.profile_image_url),
    provider = coalesce(profiles.provider, excluded.provider, 'kakao'),
    updated_at = now();

  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created_kakao on auth.users;
create trigger on_auth_user_created_kakao
  after insert or update on auth.users
  for each row
  when (new.raw_app_meta_data->>'provider' = 'kakao')
  execute function public.handle_kakao_user();

-- =========================================================
-- C. (선택) 기존에 덮어써진 닉네임 복구
-- 운영 정책에 맞게 직접 조정 필요.
-- =========================================================
-- update public.profiles
-- set nickname = mob_nickname
-- where coalesce(mob_nickname, '') <> '' and (nickname is null or nickname = '');

