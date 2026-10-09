import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { router } from 'expo-router';

import { DropLogo } from '@/components/drop-logo';
import { homeRouteFor, useAuth } from '@/contexts/AuthContext';
import { BRAND_ACCENT, FONTS } from '@/theme/tokens';

// Tempo mínimo de exibição, para a splash não piscar quando a sessão carrega rápido.
const MIN_SPLASH_MS = 1500;

export default function Splash() {
  const { isAuthenticated, isLoading, user, professional } = useAuth();
  const [minTimePassed, setMinTimePassed] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setMinTimePassed(true), MIN_SPLASH_MS);
    return () => clearTimeout(timer);
  }, []);

  // A splash cobre o carregamento: passado o tempo mínimo e lida a sessão salva,
  // abre a home para quem já tem sessão e o login (Apple/Google) para os demais.
  useEffect(() => {
    if (isLoading || !minTimePassed) return;
    router.replace(isAuthenticated ? homeRouteFor(user, professional) : '/login');
  }, [isLoading, minTimePassed, isAuthenticated, user, professional]);

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <DropLogo width={242} />
      <Text style={styles.name}>bemvivo</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 28,
  },
  name: {
    fontFamily: FONTS.extraBold,
    fontSize: 29,
    color: BRAND_ACCENT,
    letterSpacing: -0.5,
  },
});
