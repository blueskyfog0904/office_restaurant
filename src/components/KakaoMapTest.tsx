import React from 'react';
import KakaoMap from './KakaoMap';

const KakaoMapTest: React.FC = () => {
  return (
    <div style={{ padding: '20px' }}>
      <h1>카카오맵 API 테스트</h1>
      
      <div style={{ margin: '20px 0', padding: '15px', border: '1px solid #ccc', borderRadius: '5px' }}>
        <h3>환경변수 확인</h3>
        <p><strong>API 키:</strong> 
          <span style={{ 
            color: process.env.REACT_APP_KAKAO_MAP_API_KEY ? 'green' : 'red',
            marginLeft: '8px'
          }}>
            {process.env.REACT_APP_KAKAO_MAP_API_KEY ? 
              `${process.env.REACT_APP_KAKAO_MAP_API_KEY.substring(0, 8)}...` : 
              '❌ 환경변수 없음'
            }
          </span>
        </p>
        <p><strong>Base URL:</strong> {process.env.REACT_APP_BASE_URL || '환경변수 없음'}</p>
        <p><strong>Node 환경:</strong> {process.env.NODE_ENV}</p>
      </div>

      <div style={{ margin: '20px 0' }}>
        <h3>카카오맵 컴포넌트 테스트</h3>
        <div style={{ width: '100%', height: '400px', border: '1px solid #ccc' }}>
          <KakaoMap
            latitude={37.5501}
            longitude={127.1436}
            width="100%"
            height="400px"
            level={3}
            restaurantName="아마젤로"
          />
        </div>
      </div>

      <div style={{ margin: '20px 0', fontSize: '14px', color: '#666' }}>
        <p>✅ 지도가 표시되면 API 키가 올바르게 설정된 것입니다.</p>
        <p>❌ 로딩 메시지가 계속 나타나면 F12 → Console에서 에러를 확인하세요.</p>
      </div>
    </div>
  );
};

export default KakaoMapTest;