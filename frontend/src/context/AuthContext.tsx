import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from 'react';
import * as SecureStore from 'expo-secure-store';
import apiClient, { setAuthEventCallback } from '../api/client';
import { connectSocket, disconnectSocket } from '../api/socket';
import { UserProfile } from '../types';

const ACCESS_TOKEN_KEY = 'findme_access_token';
const REFRESH_TOKEN_KEY = 'findme_refresh_token';

interface AuthState {
  user: UserProfile | null;
  accessToken: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

interface RegisterData {
  name: string;
  email: string;
  password: string;
  career?: string;
  age?: number;
}

interface AuthContextValue extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (updatedUser: UserProfile) => void;
  needsOnboarding: boolean;
}

const hasCompletedProfile = (user: UserProfile | null): boolean => {
  if (!user) return false;

  return Boolean(user.profile_photo && user.semester !== null && user.semester !== undefined);
};

const AuthContext = createContext<AuthContextValue | null>(null);

export const AuthProvider = ({ children }: { children: ReactNode }): JSX.Element => {
  const [state, setState] = useState<AuthState>({
    user: null,
    accessToken: null,
    isLoading: true,
    isAuthenticated: false,
  });

  // Handle auth expiry from the axios interceptor
  const handleAuthExpiry = useCallback(() => {
    setState({
      user: null,
      accessToken: null,
      isLoading: false,
      isAuthenticated: false,
    });
    disconnectSocket();
  }, []);

  useEffect(() => {
    setAuthEventCallback(handleAuthExpiry);
  }, [handleAuthExpiry]);

  // Validate existing tokens on mount
  useEffect(() => {
    const initAuth = async () => {
      try {
        const token = await SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
        if (!token) {
          setState(prev => ({ ...prev, isLoading: false }));
          return;
        }

        const response = await apiClient.get('/api/users/me');
        const user: UserProfile = response.data;

        connectSocket(token);

        setState({
          user,
          accessToken: token,
          isLoading: false,
          isAuthenticated: true,
        });
      } catch {
        // Token invalid or network error
        await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY).catch(() => {});
        await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY).catch(() => {});
        setState({ user: null, accessToken: null, isLoading: false, isAuthenticated: false });
      }
    };

    initAuth();
  }, []);

  const login = async (email: string, password: string): Promise<void> => {
    const response = await apiClient.post('/api/auth/login', { email, password });
    const { accessToken, refreshToken, user } = response.data;

    await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, accessToken);
    await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refreshToken);

    connectSocket(accessToken);

    setState({
      user,
      accessToken,
      isLoading: false,
      isAuthenticated: true,
    });
  };

  const register = async (data: RegisterData): Promise<void> => {
    const response = await apiClient.post('/api/auth/register', data);
    const { accessToken, refreshToken, user } = response.data;

    await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, accessToken);
    await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refreshToken);

    connectSocket(accessToken);

    setState({
      user,
      accessToken,
      isLoading: false,
      isAuthenticated: true,
    });
  };

  const logout = async (): Promise<void> => {
    try {
      await apiClient.post('/api/auth/logout');
    } catch {
      // Continue logout even if server call fails
    }

    await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY).catch(() => {});
    await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY).catch(() => {});

    disconnectSocket();

    setState({
      user: null,
      accessToken: null,
      isLoading: false,
      isAuthenticated: false,
    });
  };

  const updateUser = (updatedUser: UserProfile): void => {
    setState(prev => ({ ...prev, user: updatedUser }));
  };

  const needsOnboarding = state.isAuthenticated && !hasCompletedProfile(state.user);

  return (
    <AuthContext.Provider
      value={{
        ...state,
        login,
        register,
        logout,
        updateUser,
        needsOnboarding,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextValue => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
};
