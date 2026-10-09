import { useEffect } from 'react';
import { Alert, Platform, StyleSheet, View } from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import { router } from 'expo-router';

import { useAuth } from '@/contexts/AuthContext';

// Gate de biometria após splash com token válido: confirma que quem está com
// o celular em mãos é o dono da sessão antes de abrir o app.
export default function Facial() {
  const { isAuthenticated, signOut } = useAuth();

  const goToHome = () => {
    router.replace('/(tabs)');
  };

  const goToLogin = async () => {
    await signOut();
    router.replace('/mobile');
  };

  const handleAuthentication = async () => {
    const auth = await LocalAuthentication.authenticateAsync({
      promptMessage:
        Platform.OS === 'ios' ? 'Use Face ID para autenticar' : 'Use sua biometria para autenticar',
      cancelLabel: 'Cancelar',
      disableDeviceFallback: true,
    });

    if (auth.success) {
      goToHome();
    } else {
      Alert.alert(
        'Autenticação falhou',
        Platform.OS === 'ios' ? 'Não foi possível autenticar com Face ID.' : 'Não foi possível autenticar com biometria.',
        [
          { text: 'Tentar novamente', onPress: handleAuthentication },
          { text: 'Usar login', onPress: goToLogin },
        ],
      );
    }
  };

  const verifyAvailableAuthentication = async () => {
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      if (!hasHardware) {
        goToHome();
        return;
      }

      const isBiometricEnrolled = await LocalAuthentication.isEnrolledAsync();
      if (!isBiometricEnrolled) {
        goToHome();
        return;
      }

      handleAuthentication();
    } catch {
      goToHome();
    }
  };

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace('/mobile');
      return;
    }
    verifyAvailableAuthentication();
  }, [isAuthenticated]);

  return <View style={styles.container} />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
