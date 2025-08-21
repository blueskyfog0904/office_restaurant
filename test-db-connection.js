const { createClient } = require('@supabase/supabase-js');

// 환경변수 로드
require('dotenv').config();

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

console.log('🔍 DB 연결 테스트 시작...');
console.log('URL:', supabaseUrl);
console.log('Anon Key:', supabaseAnonKey ? `${supabaseAnonKey.substring(0, 20)}...` : 'Not found');

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ 환경변수가 설정되지 않았습니다.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testConnection() {
  try {
    console.log('\n1. 기본 연결 테스트...');
    
    // 테이블 존재 여부 확인
    console.log('\n2. 테이블 존재 여부 확인...');
    
    // restaurants 테이블 확인
    const { data: restaurants, error: restaurantsError } = await supabase
      .from('restaurants')
      .select('count', { count: 'exact', head: true });
    
    if (restaurantsError) {
      console.log('❌ restaurants 테이블:', restaurantsError.message);
    } else {
      console.log('✅ restaurants 테이블: 존재함');
    }

    // v_region_stats 뷰 확인
    const { data: regionStats, error: regionStatsError } = await supabase
      .from('v_region_stats')
      .select('*')
      .limit(1);
    
    if (regionStatsError) {
      console.log('❌ v_region_stats 뷰:', regionStatsError.message);
    } else {
      console.log('✅ v_region_stats 뷰: 존재함');
      console.log('   샘플 데이터:', regionStats);
    }

    // getHomePageStats와 동일한 쿼리 테스트
    console.log('\n4. getHomePageStats 함수 쿼리 테스트...');
    
    // 지역 통계 쿼리
    const { data: regionData, error: regionError } = await supabase
      .from('v_region_stats')
      .select('region, sub_region');
    
    if (regionError) {
      console.log('❌ 지역 통계 쿼리 실패:', regionError.message);
    } else {
      console.log('✅ 지역 통계 쿼리 성공:', regionData?.length || 0, '개 지역');
    }

    // 음식점 수 쿼리
    const { count: restaurantCount, error: restaurantError } = await supabase
      .from('restaurants')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true);
    
    if (restaurantError) {
      console.log('❌ 음식점 수 쿼리 실패:', restaurantError.message);
    } else {
      console.log('✅ 음식점 수 쿼리 성공:', restaurantCount, '개 음식점');
    }

    // 방문 통계 쿼리
    const { data: visitsData, error: visitsError } = await supabase
      .from('v_region_stats')
      .select('total_visits');
    
    if (visitsError) {
      console.log('❌ 방문 통계 쿼리 실패:', visitsError.message);
    } else {
      const totalVisits = visitsData?.reduce((sum, row) => sum + (row.total_visits || 0), 0) || 0;
      console.log('✅ 방문 통계 쿼리 성공:', totalVisits, '총 방문');
    }

    // profiles 테이블 확인
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('count', { count: 'exact', head: true });
    
    if (profilesError) {
      console.log('❌ profiles 테이블:', profilesError.message);
    } else {
      console.log('✅ profiles 테이블: 존재함');
    }

    // posts 테이블 확인
    const { data: posts, error: postsError } = await supabase
      .from('posts')
      .select('count', { count: 'exact', head: true });
    
    if (postsError) {
      console.log('❌ posts 테이블:', postsError.message);
    } else {
      console.log('✅ posts 테이블: 존재함');
    }

    console.log('\n3. 실제 데이터 샘플 조회...');
    
    // restaurants 데이터 샘플
    const { data: sampleRestaurants, error: sampleError } = await supabase
      .from('restaurants')
      .select('id, name, region, sub_region')
      .limit(3);
    
    if (sampleError) {
      console.log('❌ restaurants 샘플 데이터 조회 실패:', sampleError.message);
    } else {
      console.log('✅ restaurants 샘플 데이터:', sampleRestaurants?.length || 0, '개');
      if (sampleRestaurants && sampleRestaurants.length > 0) {
        console.log('   예시:', sampleRestaurants[0]);
      }
    }

  } catch (error) {
    console.error('❌ 연결 테스트 실패:', error);
  }
}

testConnection().then(() => {
  console.log('\n🔍 DB 연결 테스트 완료');
  process.exit(0);
});
