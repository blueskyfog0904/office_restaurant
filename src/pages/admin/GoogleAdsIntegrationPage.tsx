import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowPathIcon, CheckCircleIcon, LinkIcon, SignalIcon, XCircleIcon } from '@heroicons/react/24/outline';
import AdminLayout from '../../components/layout/AdminLayout';
import {
  createGoogleAdsAuthUrl,
  exchangeGoogleAdsCode,
  getGoogleAdsAccessibleCustomers,
  getGoogleAdsConnectionStatus,
  GoogleAdsConnectionStatus,
  GoogleAdsCustomer,
  testGoogleAdsConnection,
} from '../../services/googleAdsService';

const GoogleAdsIntegrationPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [status, setStatus] = useState<GoogleAdsConnectionStatus | null>(null);
  const [customers, setCustomers] = useState<GoogleAdsCustomer[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [connectionMessage, setConnectionMessage] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState('');

  const redirectUri = useMemo(() => `${window.location.origin}/admin/google-ads`, []);

  const loadStatus = useCallback(async () => {
    try {
      setError('');
      const response = await getGoogleAdsConnectionStatus();
      setStatus(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Google Ads 연결 상태를 불러오지 못했습니다.');
    }
  }, []);

  useEffect(() => {
    const initialize = async () => {
      setLoading(true);
      await loadStatus();
      setLoading(false);
    };
    void initialize();
  }, [loadStatus]);

  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const code = searchParams.get('code');
    const oauthError = searchParams.get('error');

    if (oauthError) {
      setError(`Google OAuth 오류: ${oauthError}`);
      navigate('/admin/google-ads', { replace: true });
      return;
    }

    if (!code) {
      return;
    }

    const finalizeOAuth = async () => {
      try {
        setWorking(true);
        setError('');
        const response = await exchangeGoogleAdsCode({ code, redirectUri });
        setStatus(response);
        setConnectionMessage('Google Ads OAuth 인증이 완료되었습니다.');
        navigate('/admin/google-ads', { replace: true });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'OAuth 코드 교환에 실패했습니다.');
      } finally {
        setWorking(false);
      }
    };

    void finalizeOAuth();
  }, [location.search, navigate, redirectUri]);

  const handleStartOAuth = async () => {
    try {
      setWorking(true);
      setError('');
      const { authUrl } = await createGoogleAdsAuthUrl({
        redirectUri,
        state: `admin-google-ads-${Date.now()}`,
      });
      window.location.assign(authUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Google Ads 인증 URL 생성에 실패했습니다.');
      setWorking(false);
    }
  };

  const handleLoadCustomers = async () => {
    try {
      setWorking(true);
      setError('');
      const response = await getGoogleAdsAccessibleCustomers();
      setCustomers(response.customers || []);
      if (response.customers?.length && !selectedCustomerId) {
        setSelectedCustomerId(response.customers[0].id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Google Ads 계정 목록 조회에 실패했습니다.');
    } finally {
      setWorking(false);
    }
  };

  const handleConnectionTest = async () => {
    try {
      setWorking(true);
      setError('');
      const response = await testGoogleAdsConnection({
        customerId: selectedCustomerId || undefined,
      });
      setConnectionMessage(response.message || 'Google Ads API 연결 테스트가 완료되었습니다.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Google Ads 연결 테스트에 실패했습니다.');
    } finally {
      setWorking(false);
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Google Ads 연동</h1>
          <p className="text-sm text-gray-600 mt-1">
            OAuth 인증 후 Google Ads API 연결 상태를 확인하고 계정 접근을 테스트합니다.
          </p>
        </div>

        {error && (
          <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {connectionMessage && (
          <div className="rounded-md border border-green-200 bg-green-50 p-4 text-sm text-green-700">
            {connectionMessage}
          </div>
        )}

        <div className="bg-white rounded-lg shadow p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">연결 상태</h2>
            <button
              onClick={() => void loadStatus()}
              disabled={loading || working}
              className="inline-flex items-center px-3 py-2 text-sm rounded-md border border-gray-300 hover:bg-gray-50 disabled:opacity-50"
            >
              <ArrowPathIcon className="h-4 w-4 mr-2" />
              새로고침
            </button>
          </div>

          {loading ? (
            <p className="text-sm text-gray-500">상태 확인 중...</p>
          ) : (
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                {status?.connected ? (
                  <>
                    <CheckCircleIcon className="h-5 w-5 text-green-600" />
                    <span className="text-green-700 font-medium">연결됨</span>
                  </>
                ) : (
                  <>
                    <XCircleIcon className="h-5 w-5 text-red-600" />
                    <span className="text-red-700 font-medium">미연결</span>
                  </>
                )}
              </div>
              <p className="text-gray-600">연결 시각: {status?.connectedAt || '-'}</p>
              <p className="text-gray-600">로그인 고객 ID: {status?.loginCustomerId || '-'}</p>
              <p className="text-gray-600">접근 계정 수: {status?.customerCount ?? 0}</p>
            </div>
          )}

          <div className="pt-2">
            <button
              onClick={() => void handleStartOAuth()}
              disabled={working}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              <LinkIcon className="h-5 w-5 mr-2" />
              Google OAuth 시작
            </button>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">접근 가능한 광고 계정</h2>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => void handleLoadCustomers()}
              disabled={working}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
            >
              <SignalIcon className="h-5 w-5 mr-2" />
              계정 목록 조회
            </button>

            <button
              onClick={() => void handleConnectionTest()}
              disabled={working || (!selectedCustomerId && customers.length > 0)}
              className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
            >
              연결 테스트
            </button>
          </div>

          {customers.length > 0 && (
            <div className="space-y-2">
              <label htmlFor="google-ads-customer" className="block text-sm font-medium text-gray-700">
                테스트 대상 고객 ID
              </label>
              <select
                id="google-ads-customer"
                value={selectedCustomerId}
                onChange={(event) => setSelectedCustomerId(event.target.value)}
                className="w-full md:w-96 px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              >
                {customers.map((customer) => (
                  <option key={customer.id} value={customer.id}>
                    {customer.id} {customer.descriptiveName ? `- ${customer.descriptiveName}` : ''}
                  </option>
                ))}
              </select>
            </div>
          )}

          {customers.length === 0 && (
            <p className="text-sm text-gray-500">조회된 광고 계정이 없습니다.</p>
          )}
        </div>
      </div>
    </AdminLayout>
  );
};

export default GoogleAdsIntegrationPage;
