import { useEffect, useState } from 'react';
import { View, Text, TextInput, Keyboard, KeyboardAvoidingView, TouchableOpacity, StyleSheet } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { ChevronRight } from 'lucide-react-native';
import { StatusBar } from 'expo-status-bar';
import { router } from 'expo-router';

import { FONTS, RADII } from '@/theme/tokens';
import { formatPhone, validatePhone } from '@/utils/mobile';
import { useTheme } from '@/contexts/ThemeContext';

export default function MobileScreen() {
  const { isDark, colors } = useTheme();
  const [mobile, setMobile] = useState('');

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
    const formatted = formatPhone(text);
    setMobile(formatted);
    const numbers = text.replace(/\D/g, '');
    if (numbers.length === 11) {
      setTimeout(() => Keyboard.dismiss(), 100);
    }
  };

  const handleContinue = () => {
    const numbers = mobile.replace(/\D/g, '');
    if (validatePhone(numbers)) {
      router.push({ pathname: '/password', params: { mobile: numbers } });
    }
  };

  return (
    <KeyboardAvoidingView style={[styles.container, { backgroundColor: colors.page }]}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <View style={styles.top}>
        <Animated.View style={titleAnimatedStyle}>
          <Text style={[styles.title, { color: colors.text }]}>Seu telefone</Text>
          <Text style={[styles.callText, { color: colors.textSecondary }]}>Informe o número com DDD</Text>
        </Animated.View>
      </View>

      <View style={styles.bottom}>
        <Animated.View style={inputAnimatedStyle}>
          <TextInput
            placeholder="(00) 00000-0000"
            style={[styles.input, { backgroundColor: colors.input, borderColor: colors.border, color: colors.text }]}
            placeholderTextColor={colors.textMuted}
            value={mobile}
            onChangeText={handleChange}
            keyboardType="number-pad"
            returnKeyType="done"
          />
        </Animated.View>

        <Animated.View style={buttonAnimatedStyle}>
          <TouchableOpacity onPress={handleContinue} activeOpacity={0.85} style={[styles.nextButton, { backgroundColor: colors.accent }]}>
            <Text style={[styles.textButton, { color: colors.accentText }]}>Próximo</Text>
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
  input: {
    height: 58,
    borderRadius: RADII.pill,
    borderWidth: 0.5,
    paddingLeft: 26,
    fontSize: 16,
    fontFamily: FONTS.medium,
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
