import axios, { AxiosInstance, InternalAxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';
import * as SecureStore from 'expo-secure-store';
import { API_URL } from '../config';

const ACCESS_TOKEN_KEY = 'findme_access_token';
const REFRESH_TOKEN_KEY = 'findme_refresh_token';

type AuthEventCallback = () => void;
let authEventCallback: AuthEventCallback | null = null;

export const setAuthEventCallback = (cb: AuthEventCallback): void => {
  authEventCallback = cb;
};

const apiClient: AxiosInstance = axios.create({
  baseURL: API_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
    'bypass-tunnel-reminder': 'true', // Bypass localtunnel landing page warning
  },
});

// Request interceptor: attach access token to every request
apiClient.interceptors.request.use(
  async (config: InternalAxiosRequestConfig): Promise<InternalAxiosRequestConfig> => {
    try {
      const token = await SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch {
      // If SecureStore fails, proceed without token
    }
    return config;
  },
  (error: AxiosError) => Promise.reject(error)
);

// Response interceptor: handle 401 with token refresh
apiClient.interceptors.response.use(
  (response: AxiosResponse) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
        if (!refreshToken) {
          throw new Error('No refresh token available');
        }

        const refreshResponse = await axios.post(`${API_URL}/api/auth/refresh`, {
          refreshToken,
        }, {
          headers: {
            'bypass-tunnel-reminder': 'true',
          }
        });

        const { accessToken: newAccessToken, refreshToken: newRefreshToken } =
          refreshResponse.data;

        await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, newAccessToken);
        if (newRefreshToken) {
          await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, newRefreshToken);
        }

        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        }

        return apiClient(originalRequest);
      } catch {
        // Refresh failed — clear tokens and trigger auth expiry callback
        await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY).catch(() => {});
        await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY).catch(() => {});

        if (authEventCallback) {
          authEventCallback();
        }

        const authError: Error & { code?: string } = new Error('Authentication session expired');
        authError.code = 'AUTH_EXPIRED';
        return Promise.reject(authError);
      }
    }

    return Promise.reject(error);
  }
);

export default apiClient;
