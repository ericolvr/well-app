import { Platform } from 'react-native';

import type { SocialProvider } from '@/services/auth-service';

export type SocialCredential =
  | { status: 'success'; provider: SocialProvider; idToken: string; name?: string }
  | { status: 'cancelled' }
  | { status: 'error'; message: string };

const GOOGLE_WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
const GOOGLE_IOS_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;

export const isAppleSignInSupported = Platform.OS === 'ios';
export const isGoogleSignInSupported = Platform.OS === 'ios' || Platform.OS === 'android';

export async function signInWithApple(): Promise<SocialCredential> {
  try {
    // Import tardio: o módulo nativo não existe no web e quebraria o carregamento do app.
    const AppleAuthentication = await import('expo-apple-authentication');
    const credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
    });
    if (!credential.identityToken) {
      return { status: 'error', message: 'A Apple não devolveu o token de identidade.' };
    }
    const { givenName, familyName } = credential.fullName ?? {};
    const name = [givenName, familyName].filter(Boolean).join(' ') || undefined;
    return { status: 'success', provider: 'apple', idToken: credential.identityToken, name };
  } catch (error) {
    const { code, message } = error as { code?: string; message?: string };
    if (code === 'ERR_REQUEST_CANCELED') return { status: 'cancelled' };
    console.warn('Apple sign-in failed', error);
    return { status: 'error', message: withDetail('Não foi possível entrar com a Apple.', code, message) };
  }
}

export async function signInWithGoogle(): Promise<SocialCredential> {
  if (!GOOGLE_WEB_CLIENT_ID) {
    return { status: 'error', message: 'Login com Google não configurado (EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID).' };
  }
  try {
    const { GoogleSignin } = await import('@react-native-google-signin/google-signin');
    // webClientId faz o Google emitir um idToken cujo "aud" é o client id que o backend aceita.
    GoogleSignin.configure({ webClientId: GOOGLE_WEB_CLIENT_ID, iosClientId: GOOGLE_IOS_CLIENT_ID });
    if (Platform.OS === 'android') await GoogleSignin.hasPlayServices();

    const response = await GoogleSignin.signIn();
    if (response.type === 'cancelled') return { status: 'cancelled' };
    const { idToken, user } = response.data;
    if (!idToken) return { status: 'error', message: 'O Google não devolveu o token de identidade.' };
    return { status: 'success', provider: 'google', idToken, name: user.name ?? undefined };
  } catch (error) {
    const { code, message } = error as { code?: string; message?: string };
    console.warn('Google sign-in failed', error);
    return { status: 'error', message: withDetail('Não foi possível entrar com o Google.', code, message) };
  }
}

// Em desenvolvimento o erro nativo aparece na tela para facilitar o diagnóstico.
function withDetail(base: string, code?: string, message?: string) {
  return __DEV__ ? `${base} [${code ?? 'sem código'}] ${message ?? ''}`.trim() : base;
}
