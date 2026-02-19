import { supabase } from './supabaseClient';

type HttpMethod = 'GET' | 'POST';

export interface GoogleAdsConnectionStatus {
  connected: boolean;
  connectedAt?: string;
  customerId?: string;
  managerCustomerId?: string;
  loginCustomerId?: string;
  customerCount?: number;
  requestId?: string;
  message?: string;
}

export interface GoogleAdsCustomer {
  resourceName: string;
  id: string;
  descriptiveName?: string;
  currencyCode?: string;
  timeZone?: string;
}

export interface GoogleAdsConnectionTest {
  success: boolean;
  message: string;
  requestId?: string;
}

const getGoogleAdsApiBaseUrl = (): string => {
  const customBaseUrl = process.env.REACT_APP_GOOGLE_ADS_API_BASE_URL?.trim();
  if (customBaseUrl) {
    return customBaseUrl.replace(/\/+$/, '');
  }

  const supabaseUrl = process.env.REACT_APP_SUPABASE_URL?.trim();
  if (!supabaseUrl) {
    throw new Error('REACT_APP_SUPABASE_URL 설정이 필요합니다.');
  }

  return `${supabaseUrl}/functions/v1`;
};

const parseResponseJson = async (response: Response): Promise<any> => {
  try {
    return await response.json();
  } catch {
    return {};
  }
};

const callGoogleAdsApi = async <T>(
  endpoint: string,
  method: HttpMethod,
  payload?: Record<string, unknown>,
): Promise<T> => {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) {
    throw new Error('관리자 로그인이 필요합니다.');
  }

  const url = `${getGoogleAdsApiBaseUrl()}/${endpoint.replace(/^\/+/, '')}`;
  const response = await fetch(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
    },
    body: method === 'POST' ? JSON.stringify(payload ?? {}) : undefined,
  });

  const data = await parseResponseJson(response);
  if (!response.ok) {
    throw new Error(data?.error || data?.message || 'Google Ads API 요청에 실패했습니다.');
  }

  return data as T;
};

export const getGoogleAdsConnectionStatus = async (params?: {
  customerId?: string;
  loginCustomerId?: string;
}): Promise<GoogleAdsConnectionStatus> => {
  return callGoogleAdsApi<GoogleAdsConnectionStatus>('google-ads-connection-status', 'POST', params);
};

export const createGoogleAdsAuthUrl = async (params: {
  redirectUri: string;
  state?: string;
  scope?: string;
}): Promise<{ authUrl: string }> => {
  return callGoogleAdsApi<{ authUrl: string }>('google-ads-auth-url', 'POST', {
    ...params,
    scope: params.scope ?? 'https://www.googleapis.com/auth/adwords',
  });
};

export const exchangeGoogleAdsCode = async (params: {
  code: string;
  redirectUri: string;
}): Promise<GoogleAdsConnectionStatus> => {
  return callGoogleAdsApi<GoogleAdsConnectionStatus>('google-ads-exchange-code', 'POST', params);
};

export const getGoogleAdsAccessibleCustomers = async (): Promise<{ customers: GoogleAdsCustomer[] }> => {
  return callGoogleAdsApi<{ customers: GoogleAdsCustomer[] }>('google-ads-accessible-customers', 'POST');
};

export const testGoogleAdsConnection = async (params?: {
  customerId?: string;
}): Promise<GoogleAdsConnectionTest> => {
  return callGoogleAdsApi<GoogleAdsConnectionTest>('google-ads-test-connection', 'POST', params);
};
