import { useEffect, useState } from 'react';
import { View, Text, TextInput, Keyboard, KeyboardAvoidingView, TouchableOpacity, Alert, StyleSheet } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { ChevronRight, Eye, EyeOff } from 'lucide-react-native';
import { StatusBar } from 'expo-status-bar';
import { router, useLocalSearchParams } from 'expo-router';

import { useAuth } from '@/contexts/AuthContext';
import { FONTS, RADII } from '@/theme/tokens';
import { useTheme } from '@/contexts/ThemeContext';

export default function PasswordScreen() {
  const { isDark, colors } = useTheme();
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { signIn } = useAuth();
  const { mobile } = useLocalSearchParams<{ mobile: string }>();

  const titleOpacity = useSharedValue(0);
  const titleY = useSharedValue(-220);
  const inputOpacity = useSharedValue(0);
  const inputY = useSharedValue(-220);
  const buttonOpacity = useSharedValue(0);
  const buttonY = useSharedValue(220);

  useEffect(() => {
    titleOpacity.value = withTiming(1, { duration: 550 });
    titleY.value = withTiming(0, { duration: 550 });
    inputOpacity.value = withTiming(1, { duration: 500 });
    inputY.value = withTiming(0, { duration: 500 });
    buttonOpacity.value = withTiming(1, { duration: 550 });
    buttonY.value = withTiming(0, { duration: 550 });
  }, []);

  const titleAnimatedStyle = useAnimatedStyle(() => ({
    opacity: titleOpacity.value,
    transform: [{ translateY: titleY.value }],
  }));

  const inputAnimatedStyle = useAnimatedStyle(() => ({
    opacity: inputOpacity.value,
    transform: [{ translateY: inputY.value }],
  }));

  const buttonAnimatedStyle = useAnimatedStyle(() => ({
    opacity: buttonOpacity.value,
    transform: [{ translateY: buttonY.value }],
  }));

  const handleChange = (text: string) => {
    const numbers = text.replace(/\D/g, '');
    if (numbers.length <= 6) {
      setPassword(numbers);
      if (numbers.length === 6) {
        setTimeout(() => Keyboard.dismiss(), 100);
      }
    }
  };

  const handleContinue = async () => {
    if (password.length !== 6 || !/^\d{6}$/.test(password)) {
      Alert.alert('Erro', 'Por favor, informe um código de 6 dígitos');
      return;
    }

    setLoading(true);
    try {
      const result = await signIn(mobile, password);
      if (result.success) {
        router.replace('/(tabs)');
      } else {
        Alert.alert('Erro de Autenticação', result.error || 'Credenciais inválidas');
      }
    } catch {
      Alert.alert('Erro de Autenticação', 'Não foi possível fazer login. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={[styles.container, { backgroundColor: colors.page }]}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <View style={styles.top}>
        <Animated.View style={titleAnimatedStyle}>
          <Text style={[styles.title, { color: colors.text }]}>Seu código</Text>
          <Text style={[styles.callText, { color: colors.textSecondary }]}>Código de 6 dígitos recebido por SMS</Text>
        </Animated.View>
      </View>

      <View style={styles.bottom}>
        <Animated.View style={inputAnimatedStyle}>
          <View style={styles.inputContainer}>
            <TextInput
              placeholder="******"
              style={[styles.input, { backgroundColor: colors.input, borderColor: colors.border, color: colors.text }]}
              placeholderTextColor={colors.textMuted}
              value={password}
              onChangeText={handleChange}
              keyboardType="number-pad"
              returnKeyType="done"
              secureTextEntry={!showPassword}
              maxLength={6}
            />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeButton}>
              {showPassword ? (
                <EyeOff color={colors.textMuted} size={20} />
              ) : (
                <Eye color={colors.textMuted} size={20} />
              )}
            </TouchableOpacity>
          </View>
        </Animated.View>

        <Animated.View style={buttonAnimatedStyle}>
          <TouchableOpacity
            onPress={handleContinue}
            disabled={loading}
            activeOpacity={0.85}
            style={[styles.nextButton, { backgroundColor: colors.accent }, loading && { opacity: 0.7 }]}>
            <Text style={[styles.textButton, { color: colors.accentText }]}>{loading ? 'Aguarde...' : 'Próximo'}</Text>
            <ChevronRight color={colors.accentText} size={23} strokeWidth={2.5} />
          </TouchableOpacity>
        </Animated.View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'column',
    justifyContent: 'space-between',
  },
  top: {
    marginHorizontal: 24,
    flex: 1,
    justifyContent: 'flex-end',
  },
  bottom: {
    flex: 1,
    justifyContent: 'space-between',
    marginHorizontal: 24,
    marginBottom: 32,
  },
  title: {
    fontFamily: FONTS.regular,
    fontSize: 28,
    fontWeight: '400',
    lineHeight: 35,
    letterSpacing: -0.3,
    marginBottom: 6,
  },
  callText: {
    fontSize: 14,
    fontFamily: FONTS.regular,
    marginBottom: 10,
  },
  inputContainer: {
    position: 'relative',
  },
  input: {
    height: 58,
    borderRadius: RADII.pill,
    borderWidth: 0.5,
    paddingLeft: 26,
    paddingRight: 60,
    fontSize: 16,
    fontFamily: FONTS.medium,
    letterSpacing: 3,
  },
  eyeButton: {
    position: 'absolute',
    right: 20,
    top: 17,
    padding: 5,
  },
  nextButton: {
    height: 58,
    borderRadius: RADII.pill,
    paddingLeft: 26,
    paddingRight: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  textButton: {
    fontSize: 15,
    fontFamily: FONTS.bold,
    fontWeight: '700',
  },
});
