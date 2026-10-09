import axios from 'axios';

import type { User } from '@/contexts/AuthContext';

const BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8082';

type LoginResponse = {
  token: string;
  user: {
    id: number;
    name: string;
    mobile: string;
    email?: string;
    type: number;
    onboarded?: boolean;
  };
};

type SignInResult = { success: true; token: string; user: User } | { success: false; error: string };

export type SocialProvider = 'apple' | 'google';

export function signIn(mobile: string, password: string): Promise<SignInResult> {
  return requestLogin('/auth', { mobile, password });
}

// Troca o token de identidade do Apple/Google por uma sessão do well.
// `name` é opcional: o Apple só entrega o nome ao app, na primeira vez.
export function signInWithProvider(
  provider: SocialProvider,
  idToken: string,
  name?: string,
): Promise<SignInResult> {
  return requestLogin('/auth/social', { provider, id_token: idToken, name });
}

async function requestLogin(path: string, body: Record<string, unknown>): Promise<SignInResult> {
  try {
    const response = await axios.post<LoginResponse>(`${BASE_URL}${path}`, body);

    if (!response.data?.token) {
      return { success: false, error: 'Resposta inválida do servidor' };
    }

    const { token, user } = response.data;

    return {
      success: true,
      token,
      user: {
        id: user.id,
        name: user.name,
        mobile: user.mobile,
        email: user.email,
        userType: user.type,
        // Sessões e servidores antigos não mandam o campo: nesse caso não há o que perguntar.
        onboarded: user.onboarded ?? true,
      },
    };
  } catch (error) {
    if (axios.isAxiosError(error)) {
      if (!error.response) {
        return { success: false, error: 'Erro de conexão. Verifique sua internet.' };
      }
      if (error.response.status === 401) {
        return { success: false, error: 'Credenciais inválidas' };
      }
      if (error.response.status === 404) {
        return { success: false, error: 'Usuário não encontrado' };
      }
      return { success: false, error: error.response.data?.error || 'Erro no servidor' };
    }
    return { success: false, error: 'Erro inesperado. Tente novamente.' };
  }
}
