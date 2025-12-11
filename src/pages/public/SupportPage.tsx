import React, { useEffect } from 'react';

const SupportPage: React.FC = () => {
  useEffect(() => {
    document.title = '지원 - 공무원맛집';
  }, []);

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-4">
            <span className="text-4xl">💬</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-900">
            지원 (Support)
          </h1>
          <p className="text-gray-600 mt-2">
            공무원맛집 서비스 이용에 관한 지원 안내입니다.
          </p>
        </div>
        
        <div className="prose prose-lg max-w-none">
          <article className="space-y-8">
            
            <section className="bg-blue-50 rounded-lg p-6 border border-blue-100">
              <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <span>📧</span> 고객지원 문의
              </h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                서비스 이용 중 문의사항이 있으시면 아래 이메일로 연락해 주세요.
              </p>
              <div className="bg-white rounded-lg p-4 border border-blue-200">
                <p className="text-gray-800 font-medium">
                  문의 이메일: <a href="mailto:kofficer-guide@naver.com" className="text-blue-600 hover:text-blue-800 underline">kofficer-guide@naver.com</a>
                </p>
              </div>
              <p className="text-gray-600 text-sm mt-3">
                영업일 기준 1-2일 내에 답변드리겠습니다.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <span>💡</span> 추가 지원이 필요하신가요?
              </h2>
              <p className="text-gray-700 leading-relaxed">
                추가 지원이 필요하시면 위의 문의 이메일을 통해 연락해 주세요. 최대한 빠르게 도움을 드리겠습니다.
              </p>
            </section>

            {/* <section>
              <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <span>👥</span> 개발자 커뮤니티
              </h2>
              <p className="text-gray-700 leading-relaxed mb-3">
                기술적인 문의나 개발 관련 논의가 필요하시면 Apple Developer Forums에서 동료 개발자 및 Apple 엔지니어와 상담하실 수 있습니다.
              </p>
              <a 
                href="https://developer.apple.com/forums/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-800 underline"
              >
                Apple Developer Forums 방문하기 →
              </a>
            </section> */}

            <section>
              <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <span>📝</span> 피드백
              </h2>
              <p className="text-gray-700 leading-relaxed">
                서비스 개선을 위한 피드백이나 제안사항이 있으시면 언제든지 이메일로 보내주세요. 
                여러분의 소중한 의견은 더 나은 서비스를 만드는 데 큰 도움이 됩니다.
              </p>
            </section>

            <section className="bg-gray-50 rounded-lg p-6 border border-gray-200">
              <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <span>📋</span> 자주 묻는 질문
              </h2>
              <div className="space-y-4">
                <div>
                  <h3 className="font-medium text-gray-800">Q. 계정 관련 문제가 있어요.</h3>
                  <p className="text-gray-600 mt-1">
                    계정 로그인, 회원가입, 탈퇴 등의 문제는 문의 이메일로 연락해 주세요.
                  </p>
                </div>
                <div>
                  <h3 className="font-medium text-gray-800">Q. 맛집 정보가 잘못되었어요.</h3>
                  <p className="text-gray-600 mt-1">
                    잘못된 정보를 발견하시면 문의 이메일로 제보해 주세요. 확인 후 수정하겠습니다.
                  </p>
                </div>
                <div>
                  <h3 className="font-medium text-gray-800">Q. 새로운 기능을 제안하고 싶어요.</h3>
                  <p className="text-gray-600 mt-1">
                    기능 제안은 언제나 환영합니다! 문의 이메일로 아이디어를 보내주세요.
                  </p>
                </div>
              </div>
            </section>

          </article>
        </div>

        <div className="mt-8 pt-6 border-t border-gray-200 text-center">
          <p className="text-gray-500 text-sm">
            © {new Date().getFullYear()} 공무원맛집. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
};

export default SupportPage;


