import { router } from 'expo-router';
import React, { createContext, useContext, useEffect, useState } from 'react';

import api, { setUnauthorizedHandler } from '@/services/api';
import {
  signIn as signInRequest,
  signInWithProvider,
  type SocialProvider,
} from '@/services/auth-service';
import { fetchMyProfessional, type ProfessionalProfile } from '@/services/professional-service';
import { clearAuthData, getAuthToken, getUserData, saveAuthToken, saveUserData } from '@/utils/storage';

type SessionResult = {
  success: boolean;
  error?: string;
  user?: User;
  professional?: ProfessionalProfile | null;
};

export type OnboardingRole = 'client' | 'professional';

// Cada perfil tem a sua área. Quem escolheu ser profissional fica na área de profissional
// mesmo antes da aprovação (a conta só vira tipo 2 quando o admin aprova), por isso a
// decisão considera a existência do perfil profissional, e não só o tipo da conta.
export function homeRouteFor(user: User | null, professional: ProfessionalProfile | null) {
  if (!user) return '/login';
  if (user.onboarded === false) return '/onboarding';
  if (user.userType === 2 || professional) return '/(professional)';
  return '/(tabs)';
}

export interface User {
  id: number;
  name: string;
  mobile: string;
  email?: string;
  userType: number;
  // false até a pessoa escolher, no primeiro acesso, se é cliente ou profissional.
  onboarded?: boolean;
}

interface AuthContextData {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: User | null;
  token: string | null;
  // Perfil profissional da conta (qualquer etapa); null para quem não é profissional.
  professional: ProfessionalProfile | null;
  refreshProfessional: () => Promise<ProfessionalProfile | null>;
  signIn: (mobile: string, password: string) => Promise<SessionResult>;
  signInSocial: (
    provider: SocialProvider,
    idToken: string,
    name?: string,
  ) => Promise<SessionResult>;
  completeOnboarding: (role: OnboardingRole) => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextData | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [professional, setProfessional] = useState<ProfessionalProfile | null>(null);

  const refreshProfessional = async () => {
    try {
      const profile = await fetchMyProfessional();
      setProfessional(profile);
      return profile;
    } catch {
      return null;
    }
  };

  useEffect(() => {
    const loadStoredAuthData = async () => {
      try {
        const [storedToken, storedUser] = await Promise.all([getAuthToken(), getUserData<User>()]);
        if (storedToken && storedUser) {
          setToken(storedToken);
          setUser(storedUser);
          await refreshProfessional();
          setIsAuthenticated(true);
        }
      } catch {
        await clearAuthData();
      } finally {
        setIsLoading(false);
      }
    };

    loadStoredAuthData();
  }, []);

  const signIn = (mobile: string, password: string) => startSession(signInRequest(mobile, password));

  const signInSocial = (provider: SocialProvider, idToken: string, name?: string) =>
    startSession(signInWithProvider(provider, idToken, name));

  const startSession = async (request: ReturnType<typeof signInRequest>) => {
    const result = await request;
    if (!result.success) {
      return { success: false, error: result.error };
    }

    await Promise.all([saveAuthToken(result.token), saveUserData(result.user)]);
    setToken(result.token);
    setUser(result.user);
    const profile = await refreshProfessional();
    setIsAuthenticated(true);

    return { success: true, user: result.user, professional: profile };
  };

  const completeOnboarding = async (role: OnboardingRole) => {
    try {
      await api.post('/me/onboarding', { role });
    } catch {
      return { success: false, error: 'Não foi possível salvar sua escolha. Tente novamente.' };
    }
    if (user) {
      const updated = { ...user, onboarded: true };
      await saveUserData(updated);
      setUser(updated);
    }
    return { success: true };
  };

  const signOut = async () => {
    await clearAuthData();
    setToken(null);
    setUser(null);
    setProfessional(null);
    setIsAuthenticated(false);
  };

  // Sessão expirada: limpa o login guardado e volta para a tela de entrada.
  useEffect(() => {
    setUnauthorizedHandler(() => {
      void signOut().then(() => router.replace('/login'));
    });
    return () => setUnauthorizedHandler(null);
  }, []);

  // O React Compiler memoiza o objeto; sem useMemo manual.
  const value = {
    isAuthenticated,
    isLoading,
    user,
    token,
    professional,
    refreshProfessional,
    signIn, signInSocial,
    completeOnboarding,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
