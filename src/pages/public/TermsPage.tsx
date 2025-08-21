import React, { useEffect } from 'react';

const TermsPage: React.FC = () => {
  // 페이지 제목 설정
  useEffect(() => {
    document.title = '이용약관 - 공공맛집';
  }, []);

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-8 text-center">
            공무원맛집 이용약관
          </h1>
          
          <div className="prose prose-lg max-w-none">
            <article className="space-y-8">
              
              <section>
                <h2 className="text-xl font-semibold text-gray-800 mb-4">제1조(목적)</h2>
                <p className="text-gray-700 leading-relaxed">
                  본 약관은 공공맛집(이하 "회사")이 제공하는 위치기반서비스(이하 "서비스")의 이용에 관한 회사와 이용자 간 권리·의무 및 책임사항을 규정함을 목적으로 합니다.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-gray-800 mb-4">제2조(정의)</h2>
                <div className="space-y-3">
                  <p className="text-gray-700 leading-relaxed">
                    <strong>"위치정보"</strong>란 개인위치정보 및 비식별 처리된 위치정보를 말합니다.
                  </p>
                  <p className="text-gray-700 leading-relaxed">
                    <strong>"개인위치정보"</strong>란 특정 개인을 식별할 수 있는 위치정보를 말합니다.
                  </p>
                  <p className="text-gray-700 leading-relaxed">
                    <strong>"이용자"</strong>란 본 약관에 동의하고 서비스를 이용하는 자를 말합니다.
                  </p>
                  <p className="text-gray-700 leading-relaxed">
                    <strong>"법정대리인"</strong>이란 미성년자 등 법정 대리권을 가진 자를 말합니다.
                  </p>
                  <p className="text-gray-700 leading-relaxed">
                    <strong>"단말기"</strong>란 서비스 이용을 위해 사용되는 모바일 기기, 태블릿, PC 등을 말합니다.
                  </p>
                </div>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-gray-800 mb-4">제3조(약관의 명시·개정)</h2>
                <div className="space-y-3">
                  <p className="text-gray-700 leading-relaxed">
                    회사는 본 약관을 서비스 화면에 게시합니다.
                  </p>
                  <p className="text-gray-700 leading-relaxed">
                    관련 법령의 제·개정 또는 서비스 변경 시 회사는 약관을 개정할 수 있습니다. 개정 시 시행일자 및 개정사유를 명시하여 시행일 7일 전(이용자에게 불리하거나 중요한 변경은 30일 전)부터 공지합니다.
                  </p>
                  <p className="text-gray-700 leading-relaxed">
                    이용자가 개정 약관 시행일까지 명시적으로 거부 의사를 표시하지 않거나 서비스를 계속 이용하는 경우 개정 약관에 동의한 것으로 봅니다.
                  </p>
                </div>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-gray-800 mb-4">제4조(서비스의 내용)</h2>
                <p className="text-gray-700 leading-relaxed mb-3">
                  회사가 제공하는 주요 위치기반 기능은 다음과 같습니다.
                </p>
                <p className="text-gray-700 leading-relaxed">
                  <strong>주변 정보 제공:</strong> 이용자 현재 위치 기준의 맛집/시설 추천, 검색 결과 정렬·필터링
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-gray-800 mb-4">제5조(개인위치정보의 수집·이용 항목 및 방법)</h2>
                <div className="space-y-3">
                  <p className="text-gray-700 leading-relaxed">
                    <strong>수집 항목:</strong> GPS 정보, 기지국/와이파이 기반 위치, IP 주소 기반 대략적 위치, 단말기 OS/앱 버전, 시간 정보 등
                  </p>
                  <p className="text-gray-700 leading-relaxed">
                    <strong>수집 방법:</strong> 단말기·브라우저 권한 허용, SDK/OS 제공 API, 서버 로그
                  </p>
                  <p className="text-gray-700 leading-relaxed">
                    <strong>이용 목적:</strong> 제4조 기재 기능 제공, 서비스 품질 개선, 이용자 문의 대응 및 분쟁 대비 증빙
                  </p>
                  <p className="text-gray-700 leading-relaxed">
                    <strong>동의:</strong> 개인위치정보 수집·이용은 이용자의 명시적 동의 후에만 이뤄집니다. 이용자는 단말기 설정에서 언제든 권한을 변경할 수 있습니다.
                  </p>
                </div>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-gray-800 mb-4">제6조(보유·이용기간 및 파기)</h2>
                <div className="space-y-3">
                  <p className="text-gray-700 leading-relaxed">
                    회사는 서비스 제공에 필요한 기간 동안 개인위치정보를 보유·이용하며, 목적 달성 후 지체 없이 파기합니다.
                  </p>
                  <p className="text-gray-700 leading-relaxed">
                    법령상 의무가 있는 경우 해당 기간 동안 보관하며, 그 기간 경과 시 지체 없이 파기합니다.
                  </p>
                  <p className="text-gray-700 leading-relaxed">
                    전항과 별도로, 개인위치정보 이용·제공 사실 확인자료는 관련 법령에서 정한 최소 기간 이상 보관합니다.
                  </p>
                </div>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-gray-800 mb-4">제7조(개인위치정보의 제3자 제공·공유)</h2>
                <div className="space-y-3">
                  <p className="text-gray-700 leading-relaxed">
                    회사는 원칙적으로 이용자의 동의 없이 개인위치정보를 제3자에게 제공하지 않습니다.
                  </p>
                  <p className="text-gray-700 leading-relaxed">
                    아래의 경우에 한하여 제공할 수 있으며, 회사는 제공받는 자·목적·항목·보유기간을 사전에 고지하고 별도 동의를 받습니다.
                  </p>
                  <ul className="list-disc list-inside space-y-2 ml-4">
                    <li className="text-gray-700">지도/내비게이션 등 연동 서비스 제공을 위한 필수 제공</li>
                    <li className="text-gray-700">법령에 의한 요구(수사기관 등 적법한 절차에 따른 요청)</li>
                  </ul>
                  <p className="text-gray-700 leading-relaxed">
                    이용자는 제3자 제공 동의를 언제든 철회할 수 있습니다.
                  </p>
                </div>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-gray-800 mb-4">제8조(이용자의 권리)</h2>
                <div className="space-y-3">
                  <p className="text-gray-700 leading-relaxed">
                    이용자는 언제든지 개인위치정보 수집·이용·제공에 대한 동의를 철회할 수 있으며, 일부 또는 전부에 대해 일시 중지를 요구할 수 있습니다.
                  </p>
                  <p className="text-gray-700 leading-relaxed">
                    이용자는 회사에 대하여 본인에 관한 이용·제공 사실 확인자료의 열람 또는 고지를 요구할 수 있고, 정정·삭제를 요구할 수 있습니다.
                  </p>
                  <p className="text-gray-700 leading-relaxed">
                    권리 행사는 고객센터/이메일 또는 앱 내 설정을 통해 할 수 있으며, 회사는 지체 없이 필요한 조치를 합니다.
                  </p>
                </div>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-gray-800 mb-4">제9조(법정대리인의 권리·8세 이하 아동 등)</h2>
                <div className="space-y-3">
                  <p className="text-gray-700 leading-relaxed">
                    14세 미만 아동의 개인위치정보 수집·이용·제공에는 법정대리인의 동의가 필요합니다.
                  </p>
                  <p className="text-gray-700 leading-relaxed">
                    8세 이하의 아동, 금치산자, 중증 지적장애인 등은 보호의무자가 본인 동의에 갈음하여 동의할 수 있으며, 이 경우 해당 보호의무자 본인임을 증명하는 서류를 요구할 수 있습니다.
                  </p>
                  <p className="text-gray-700 leading-relaxed">
                    법정대리인 및 보호의무자는 당사자의 권리(제10조)를 동일하게 행사할 수 있습니다.
                  </p>
                </div>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-gray-800 mb-4">제10조(서비스의 변경·중지)</h2>
                <div className="space-y-3">
                  <p className="text-gray-700 leading-relaxed">
                    회사는 서비스의 전부 또는 일부를 변경·중지할 수 있으며, 중요한 사항은 사전 고지합니다.
                  </p>
                  <p className="text-gray-700 leading-relaxed">
                    천재지변, 시스템 장애, 제휴사 사정 등 불가항력으로 인한 중지 시 회사는 즉시 사후 공지합니다.
                  </p>
                </div>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-gray-800 mb-4">제11조(기타)</h2>
                <div className="space-y-3">
                  <p className="text-gray-700 leading-relaxed">
                    본 약관에 명시되지 않은 사항은 관련 법령 및 회사의 개인정보 처리방침·개인위치정보 처리방침에 따릅니다.
                  </p>
                  <p className="text-gray-700 leading-relaxed">
                    본 약관의 일부가 무효·집행불능으로 판단되더라도 나머지 조항의 효력에는 영향을 미치지 않습니다.
                  </p>
                </div>
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
