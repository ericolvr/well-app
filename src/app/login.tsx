import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SymbolView } from 'expo-symbols';
import { router } from 'expo-router';

import { GoogleLogo } from '@/components/google-logo';
import { homeRouteFor, useAuth } from '@/contexts/AuthContext';
import {
  isAppleSignInSupported,
  isGoogleSignInSupported,
  signInWithApple,
  signInWithGoogle,
  type SocialCredential,
} from '@/services/social-auth';
import { BRAND_ACCENT, FONTS } from '@/theme/tokens';

export default function LoginScreen() {
  const { signInSocial } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async (getCredential: () => Promise<SocialCredential>) => {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const credential = await getCredential();
      if (credential.status === 'cancelled') return;
      if (credential.status === 'error') {
        setError(credential.message);
        return;
      }
      const result = await signInSocial(credential.provider, credential.idToken, credential.name);
      if (!result.success) {
        setError(result.error ?? 'Não foi possível entrar. Tente novamente.');
        return;
      }
      router.replace(homeRouteFor(result.user ?? null, result.professional ?? null));
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <View style={styles.actions}>
        {isAppleSignInSupported && (
          <Pressable
            style={[styles.button, styles.apple]}
            onPress={() => run(signInWithApple)}
            disabled={busy}
            accessibilityRole="button">
            <SymbolView name="apple.logo" size={20} tintColor="#FFFFFF" />
            <Text style={[styles.label, styles.appleLabel]}>Continuar com Apple</Text>
          </Pressable>
        )}
        {isGoogleSignInSupported && (
          <Pressable
            style={[styles.button, styles.google]}
            onPress={() => run(signInWithGoogle)}
            disabled={busy}
            accessibilityRole="button">
            <GoogleLogo size={20} />
            <Text style={[styles.label, styles.googleLabel]}>Continuar com Google</Text>
          </Pressable>
        )}
        {!isAppleSignInSupported && !isGoogleSignInSupported && (
          <Text style={styles.hint}>O login com Apple ou Google só está disponível no iOS e no Android.</Text>
        )}

        {busy && <ActivityIndicator color={BRAND_ACCENT} />}
        {error && <Text style={styles.error}>{error}</Text>}

      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 24,
    paddingBottom: 48,
    justifyContent: 'flex-end',
  },
  actions: { gap: 12, alignItems: 'stretch' },
  button: {
    height: 52,
    borderRadius: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  apple: { backgroundColor: '#000000' },
  appleLabel: { color: '#FFFFFF' },
  google: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#DADCE0' },
  googleLabel: { color: '#1a1a1a' },
  label: { fontFamily: FONTS.bold, fontSize: 16 },
  hint: { fontFamily: FONTS.regular, fontSize: 14, color: '#6b6e78', textAlign: 'center' },
  error: { fontFamily: FONTS.semiBold, fontSize: 14, color: BRAND_ACCENT, textAlign: 'center' },
});
