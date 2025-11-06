import { createClient, SupabaseClient } from '@supabase/supabase-js';

const url = process.env.REACT_APP_SUPABASE_URL as string;
const anonKey = process.env.REACT_APP_SUPABASE_ANON_KEY as string;
const serviceRoleKey = process.env.REACT_APP_SUPABASE_SERVICE_ROLE_KEY as string;

if (!url || !anonKey) {
  console.warn('Missing REACT_APP_SUPABASE_URL or REACT_APP_SUPABASE_ANON_KEY');
  console.warn('현재 url:', url);
  console.warn('현재 anonKey:', anonKey ? '설정됨' : '설정되지 않음');
}

if (!serviceRoleKey) {
  console.warn('Missing REACT_APP_SUPABASE_SERVICE_ROLE_KEY - Admin functions will be limited');
} else {
  console.log('Service Role Key found - Admin functions enabled');
  console.log('Service Role Key prefix:', serviceRoleKey.substring(0, 20) + '...');
}

// 임시로 더미 클라이언트 생성 (환경 변수가 없을 때)
const dummyUrl = url || 'https://dummy.supabase.co';
const dummyKey = anonKey || 'dummy-key';

// 일반 사용자용 클라이언트 (anon key 사용)
export const supabase: SupabaseClient = createClient(dummyUrl, dummyKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    storageKey: 'supabase.auth.token', // 명시적 storage key
  },
});

// 관리자용 클라이언트 (service role key 사용) - Admin API 접근 가능
// auth를 비활성화하여 Multiple GoTrueClient 경고 방지
export const supabaseAdmin: SupabaseClient = createClient(
  dummyUrl, 
  serviceRoleKey || dummyKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
      storage: undefined, // storage 완전히 비활성화
    },
    db: {
      schema: 'public'
    },
    global: {
      headers: {
        'Authorization': `Bearer ${serviceRoleKey || dummyKey}`
      }
    }
  }
);