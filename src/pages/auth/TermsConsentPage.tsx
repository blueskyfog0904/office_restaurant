import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { getPublicTerms, TermsVersion } from '../../services/api';

const TermsConsentPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as any)?.from || '/register';

  const [terms, setTerms] = useState<TermsVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const data = await getPublicTerms();
        setTerms(data);
        // 모든 약관을 기본적으로 펼쳐진 상태로 설정
        const expandedState: Record<string, boolean> = {};
        data.forEach(term => {
          expandedState[term.id] = true;
        });
        setExpanded(expandedState);
      } catch (e: any) {
        setError(e.message || '약관을 불러오지 못했습니다.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const allRequiredChecked = terms
    .filter(t => t.is_required)
    .every(t => checked[t.id]);

  const handleToggle = (id: string) => {
    setChecked(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleExpand = (id: string) => {
    setExpanded(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);
      setError('');
      
      // 약관 동의 정보를 세션 스토리지에 임시 저장
      const consentData = terms.map(t => ({
        terms_id: t.id,
        version: t.version,
        agreed: !!checked[t.id],
        code: t.code,
        title: t.title,
      }));
      
      sessionStorage.setItem('termsConsent', JSON.stringify(consentData));
      
      // 프로필 설정 페이지로 이동
      navigate(from, { replace: true });
    } catch (e: any) {
      setError(e.message || '동의 저장에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  if (loading && terms.length === 0) {
    return <div className="text-center text-gray-600">로딩 중...</div>;
  }

  return (
    <div className="w-full max-w-5xl mx-auto">
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold">회원가입 약관</h2>
          <span className="text-sm text-gray-500">마지막 업데이트: 2025-08-01</span>
        </div>

        {error && (
          <div className="mb-4 text-red-600 text-sm">{error}</div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Left: summaries */}
          <div className="space-y-4">
            {terms.map(t => (
              <div key={t.id} className="border rounded p-3">
                <div className="flex items-center justify-between">
                  <div className="font-medium">{t.title} {t.is_required ? <span className="text-red-500">(필수)</span> : <span className="text-gray-400">(선택)</span>}</div>
                  <button className="text-sm text-blue-600" onClick={() => handleExpand(t.id)}>
                    {expanded[t.id] ? '전문 닫기' : '전문 보기'}
                  </button>
                </div>
                <ul className="mt-2 list-disc pl-5 text-sm text-gray-700">
                  {/* <li>핵심 내용 요약 (서비스 조건/권리/책임 등)</li>
                  <li>필요 시 추가 2~3줄 요약</li> */}
                </ul>
                {expanded[t.id] && (
                  <div className="mt-2 text-sm text-gray-600 whitespace-pre-wrap max-h-48 overflow-auto border-t pt-2">
                    {t.content}
                    {t.pdf_url && (
                      <div className="mt-2">
                        <a href={t.pdf_url} className="text-blue-600 underline" target="_blank" rel="noreferrer">PDF 다운로드</a>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Right: checkboxes */}
          <div className="space-y-4">
            {terms.map(t => (
              <label key={t.id} className="flex items-start gap-3">
                <input type="checkbox" className="mt-1" checked={!!checked[t.id]} onChange={() => handleToggle(t.id)} />
                <div>
                  <div className="font-medium">
                    {t.title} {t.is_required ? <span className="text-red-500">(필수)</span> : <span className="text-gray-400">(선택)</span>}
                  </div>
                  <button type="button" className="text-sm text-blue-600" onClick={() => handleExpand(t.id)}>전문 보기</button>
                </div>
              </label>
            ))}
          </div>
        </div>

        <div className="mt-6 flex justify-between">
          <button onClick={() => navigate('/register')} className="px-4 py-2 border rounded">이전</button>
          <button onClick={handleSubmit} disabled={!allRequiredChecked || loading} className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50">
            동의하고 계속
          </button>
        </div>
      </div>
    </div>
  );
};

export default TermsConsentPage;


