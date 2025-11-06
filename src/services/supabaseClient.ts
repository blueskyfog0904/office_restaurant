import { createClient, SupabaseClient } from '@supabase/supabase-js';

const url = process.env.REACT_APP_SUPABASE_URL as string;
const anonKey = process.env.REACT_APP_SUPABASE_ANON_KEY as string;
const serviceRoleKey = process.env.REACT_APP_SUPABASE_SERVICE_ROLE_KEY as string;

if (!url || !anonKey) {
  console.warn('Missing REACT_APP_SUPABASE_URL or REACT_APP_SUPABASE_ANON_KEY');
  console.warn('현재 url:', url);
  console.warn('현재 anonKey:', anonKey ? '설정됨' : '설정되지 않음');
}

// 임시로 더미 클라이언트 생성 (환경 변수가 없을 때)
const dummyUrl = url || 'https://dummy.supabase.co';
const dummyKey = anonKey || 'dummy-key';

// 일반 사용자용 클라이언트 (anon key 사용)
// 모든 Auth 작업에 이 클라이언트만 사용
export const supabase: SupabaseClient = createClient(dummyUrl, dummyKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
});

// 관리자용 클라이언트 - Lazy 초기화로 필요할 때만 생성
// Auth는 사용하지 않고 DB 작업(Admin API)에만 사용
let _supabaseAdmin: SupabaseClient | null = null;

export const getSupabaseAdmin = (): SupabaseClient => {
  if (!serviceRoleKey) {
    console.warn('Service Role Key가 없습니다. 일반 클라이언트를 반환합니다.');
    return supabase;
  }
  
  if (!_supabaseAdmin) {
    console.log('Admin client 초기화 중...');
    // Auth 기능을 완전히 제거한 클라이언트
    _supabaseAdmin = createClient(dummyUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false,
      },
      db: {
        schema: 'public'
      },
    });
  }
  
  return _supabaseAdmin;
};

// supabaseAdmin은 일반 supabase와 동일하게 사용 (Auth는 공유)
// Admin API 작업이 필요한 경우에만 getSupabaseAdmin() 사용
export const supabaseAdmin: SupabaseClient = supabase;