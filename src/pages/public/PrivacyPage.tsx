import React, { useEffect } from 'react';

const PrivacyPage: React.FC = () => {
  // 페이지 제목 설정
  useEffect(() => {
    document.title = '개인정보처리방침 - 공무원맛집';
  }, []);

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-4">
            <span className="text-4xl">🔒</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-900">
            개인정보처리방침
          </h1>
        </div>
        
        <div className="prose prose-lg max-w-none">
          <article className="space-y-8">
            
            <section>
              <h2 className="text-xl font-semibold text-gray-800 mb-4">1. 개인정보 수집·이용 목적</h2>
              <p className="text-gray-700 leading-relaxed mb-3">
                공무원맛집은 다음의 목적을 위하여 개인정보를 처리합니다:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li className="text-gray-700">회원 식별 및 서비스 제공</li>
                <li className="text-gray-700">알림 서비스 제공</li>
                <li className="text-gray-700">서비스 개선 및 통계 분석</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-800 mb-4">2. 수집하는 개인정보 항목</h2>
              <p className="text-gray-700 leading-relaxed mb-3">
                공무원맛집은 최소한의 개인정보만을 수집합니다:
              </p>
              <div className="space-y-3">
                <p className="text-gray-700 leading-relaxed">
                  <strong>필수항목:</strong> 이메일 주소, 닉네임
                </p>
                <p className="text-gray-700 leading-relaxed">
                  <strong>선택항목:</strong> 위치정보 제공 동의
                </p>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-800 mb-4">3. 개인정보의 보유 및 이용기간</h2>
              <p className="text-gray-700 leading-relaxed">
                회원탈퇴 시 즉시 삭제되며, 관련 법령에 의해 보존이 필요한 경우를 제외하고는 개인정보를 보유하지 않습니다.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-800 mb-4">4. 개인정보의 제3자 제공</h2>
              <p className="text-gray-700 leading-relaxed mb-3">
                공무원맛집은 원칙적으로 이용자의 개인정보를 외부에 제공하지 않습니다. 다만, 다음의 경우에는 예외로 합니다:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li className="text-gray-700">이용자들이 사전에 동의한 경우</li>
                <li className="text-gray-700">법령의 규정에 의거하거나, 수사 목적으로 법령에 정해진 절차와 방법에 따라 수사기관의 요구가 있는 경우</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-800 mb-4">5. 개인정보 처리의 위탁</h2>
              <p className="text-gray-700 leading-relaxed mb-3">
                공무원맛집은 서비스 제공을 위해 다음과 같이 개인정보 처리업무를 위탁하고 있습니다:
              </p>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-gray-700 leading-relaxed">
                  <strong>Supabase:</strong> 회원정보 관리 및 인증
                </p>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-800 mb-4">6. 개인정보의 안전성 확보조치</h2>
              <p className="text-gray-700 leading-relaxed mb-3">
                공무원맛집은 개인정보의 안전성 확보를 위해 다음과 같은 조치를 취하고 있습니다:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li className="text-gray-700">관리적 조치: 개인정보 취급 직원의 최소화 및 교육</li>
                <li className="text-gray-700">기술적 조치: 개인정보처리시스템 등의 접근권한 관리, 접근통제시스템 설치, 고유식별정보 등의 암호화, 보안프로그램 설치</li>
                <li className="text-gray-700">물리적 조치: 전산실, 자료보관실 등의 접근통제</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-800 mb-4">7. 개인정보 보호책임자</h2>
              <p className="text-gray-700 leading-relaxed mb-3">
                공무원맛집은 개인정보 처리에 관한 업무를 총괄해서 책임지고, 개인정보 처리와 관련한 정보주체의 불만처리 및 피해구제 등을 위하여 아래와 같이 개인정보 보호책임자를 지정하고 있습니다:
              </p>
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="space-y-2">
                  <p className="text-gray-700">
                    <strong>개인정보 보호책임자</strong>
                  </p>
                  <p className="text-gray-700">
                    <strong>연락처:</strong> thenaum2030@naver.com
                  </p>
                  <p className="text-gray-700 text-sm">
                    ※ 개인정보 보호 관련 문의사항이 있으시면 위 연락처로 연락해 주시기 바랍니다.
                  </p>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-800 mb-4">8. 정보주체의 권리·의무 및 그 행사방법</h2>
              <p className="text-gray-700 leading-relaxed mb-3">
                이용자는 개인정보주체로서 다음과 같은 권리를 행사할 수 있습니다:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li className="text-gray-700">개인정보 처리현황 통지요구</li>
                <li className="text-gray-700">개인정보 처리정지 요구</li>
                <li className="text-gray-700">개인정보의 정정·삭제 요구</li>
                <li className="text-gray-700">손해배상 청구</li>
              </ul>
              <p className="text-gray-700 leading-relaxed mt-3">
                위의 권리 행사는 개인정보 보호법 시행령 제41조제1항에 따라 서면, 전자우편, 모사전송(FAX) 등을 통하여 하실 수 있으며 공무원맛집은 이에 대해 지체 없이 조치하겠습니다.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-800 mb-4">9. 개인정보의 파기</h2>
              <div className="space-y-3">
                <p className="text-gray-700 leading-relaxed">
                  공무원맛집은 원칙적으로 개인정보 처리목적이 달성된 경우에는 지체없이 해당 개인정보를 파기합니다.
                </p>
                <p className="text-gray-700 leading-relaxed">
                  <strong>파기절차:</strong> 이용자가 입력한 정보는 목적 달성 후 별도의 DB에 옮겨져(종이의 경우 별도의 서류) 내부 방침 및 기타 관련 법령에 따라 일정기간 저장된 후 혹은 즉시 파기됩니다.
                </p>
                <p className="text-gray-700 leading-relaxed">
                  <strong>파기방법:</strong> 전자적 파일 형태의 정보는 기록을 재생할 수 없는 기술적 방법을 사용합니다.
                </p>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-800 mb-4">10. 개인정보 처리방침 변경</h2>
              <div className="space-y-3">
                <p className="text-gray-700 leading-relaxed">
                  이 개인정보처리방침은 시행일로부터 적용되며, 법령 및 방침에 따른 변경내용의 추가, 삭제 및 정정이 있는 경우에는 변경사항의 시행 7일 전부터 공지사항을 통하여 고지할 것입니다.
                </p>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-800 mb-4">11. 개인정보의 열람청구</h2>
              <div className="space-y-3">
                <p className="text-gray-700 leading-relaxed">
                  정보주체는 개인정보 보호법 제35조에 따른 개인정보의 열람 청구를 아래의 부서에 할 수 있습니다.
                </p>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-gray-700">
                    <strong>개인정보 열람청구 접수·처리 부서</strong><br />
                    이메일: thenaum2030@naver.com
                    담당지: 김광현 (KWANGHYUN KIM)
                  </p>
                </div>
              </div>
            </section>

          </article>
        </div>

        <div className="mt-12 pt-8 border-t border-gray-200">
          <div className="text-center text-gray-500 text-sm space-y-2">
            <p>본 개인정보처리방침은 2025년 8월 21일부터 시행됩니다.</p>
            <p>공무원맛집 | 개인정보 보호 문의: thenaum2030@naver.com</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPage;
