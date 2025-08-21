import React, { useEffect } from 'react';

const TermsPage: React.FC = () => {
  // 페이지 제목 설정
  useEffect(() => {
    document.title = '이용약관 - 공무원 맛집';
  }, []);

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-8 text-center">
            📋 이용약관
          </h1>
          
          <div className="prose prose-lg max-w-none">
            <article className="space-y-8">
              
              <section>
                <h2 className="text-xl font-semibold text-gray-800 mb-4">제1조 (목적)</h2>
                <p className="text-gray-700 leading-relaxed">
                  이 약관은 더나움마켓(이하 "회사")가 제공하는 서비스의 이용과 관련하여 회사와 회원 간의 권리, 의무 및 책임사항을 규정함을 목적으로 합니다.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-gray-800 mb-4">제2조 (정의)</h2>
                <p className="text-gray-700 leading-relaxed mb-3">
                  본 약관에서 사용하는 용어의 정의는 다음과 같습니다:
                </p>
                <div className="space-y-3">
                  <p className="text-gray-700 leading-relaxed">
                    1. "서비스"란 회사가 제공하는 공무원 맛집 정보 제공 서비스를 의미합니다.
                  </p>
                  <p className="text-gray-700 leading-relaxed">
                    2. "회원"이란 서비스에 접속하여 이 약관에 따라 회사와 이용계약을 체결하고 회사가 제공하는 서비스를 이용하는 자를 의미합니다.
                  </p>
                </div>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-gray-800 mb-4">제3조 (서비스의 제공)</h2>
                <p className="text-gray-700 leading-relaxed mb-3">
                  회사는 다음과 같은 서비스를 제공합니다:
                </p>
                <div className="space-y-3">
                  <p className="text-gray-700 leading-relaxed">
                    1. 업무추진비 기준 음식점 정보
                  </p>
                  <p className="text-gray-700 leading-relaxed">
                    2. 커뮤니티 게시판 서비스
                  </p>
                  <p className="text-gray-700 leading-relaxed">
                    3. 기타 회사가 정하는 서비스
                  </p>
                </div>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-gray-800 mb-4">제4조 (회원가입)</h2>
                <p className="text-gray-700 leading-relaxed">
                  서비스 이용을 위해서는 소셜 로그인을 통한 회원가입이 필요하며, 본 약관에 동의한 자에 한하여 회원가입이 가능합니다.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-gray-800 mb-4">제5조 (서비스 이용)</h2>
                <p className="text-gray-700 leading-relaxed mb-3">
                  회원은 서비스를 건전하고 올바른 목적으로 이용해야 하며, 다음 행위를 하여서는 안 됩니다:
                </p>
                <div className="space-y-3">
                  <p className="text-gray-700 leading-relaxed">
                    1. 타인의 정보 도용
                  </p>
                  <p className="text-gray-700 leading-relaxed">
                    2. 회사의 서비스 정보를 이용하여 얻은 정보를 회사의 사전 승낙 없이 복제, 송신, 출판, 배포, 방송 기타 방법에 의하여 영리목적으로 이용하거나 제3자에게 이용하게 하는 행위
                  </p>
                  <p className="text-gray-700 leading-relaxed">
                    3. 스팸성 광고 게시 및 욕설, 비방 등 부적절한 콘텐츠 게시
                  </p>
                </div>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-gray-800 mb-4">제6조 (금지행위 및 제재)</h2>
                <p className="text-gray-700 leading-relaxed mb-3">
                  회원은 다음과 같은 행위를 절대 해서는 안 되며, 회사는 이에 대해 무관용 정책을 적용합니다:
                </p>
                <div className="space-y-3">
                  <p className="text-gray-700 leading-relaxed">
                    1. 음란물, 폭력적, 차별적, 혐오 표현이 포함된 콘텐츠 게시
                  </p>
                  <p className="text-gray-700 leading-relaxed">
                    2. 타인을 괴롭히거나 위협하는 행위
                  </p>
                  <p className="text-gray-700 leading-relaxed">
                    3. 허위정보 유포 및 스팸 게시
                  </p>
                  <p className="text-gray-700 leading-relaxed">
                    4. 기타 법령에 위반되거나 사회질서를 해치는 행위
                  </p>
                </div>
                <p className="text-gray-700 leading-relaxed mt-4">
                  위반 시 즉시 게시물 삭제, 계정 정지 또는 영구 제명 조치가 가능합니다.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-gray-800 mb-4">제7조 (신고 및 모니터링)</h2>
                <p className="text-gray-700 leading-relaxed">
                  부적절한 콘텐츠 발견 시 즉시 신고할 수 있으며, 회사는 24시간 내 검토 후 조치합니다.
                </p>
              </section>

            </article>
          </div>

          <div className="mt-12 pt-8 border-t border-gray-200">
            <div className="text-center text-gray-500 text-sm space-y-2">
              <p>본 약관은 2025년 8월 21일부터 시행됩니다.</p>
            </div>
          </div>
        </div>
      </div>
  );
};

export default TermsPage;
