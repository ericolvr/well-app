import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { router } from 'expo-router';

import { type OnboardingRole, useAuth } from '@/contexts/AuthContext';
import { BRAND_ACCENT, BRAND_GRADIENT, FONTS } from '@/theme/tokens';

const OPTIONS: { role: OnboardingRole; title: string; description: string }[] = [
  { role: 'client', title: 'Sou cliente', description: 'Quero cuidar do meu bem-estar e encontrar profissionais.' },
  {
    role: 'professional',
    title: 'Sou profissional',
    description: 'Quero atender clientes. Seu perfil é conferido pela nossa equipe antes de aparecer.',
  },
];

export default function OnboardingScreen() {
  const { completeOnboarding } = useAuth();
  const [role, setRole] = useState<OnboardingRole | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const confirm = async () => {
    if (!role || busy) return;
    setBusy(true);
    setError(null);
    const result = await completeOnboarding(role);
    setBusy(false);
    if (!result.success) {
      setError(result.error ?? 'Não foi possível continuar.');
      return;
    }
    // Quem escolheu profissional segue direto para preencher o perfil.
    router.replace(role === 'professional' ? '/professional-profile' : '/(tabs)');
  };

  return (
    <View style={styles.screen}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Como você vai usar o bemvivo?</Text>
        <Text style={styles.subtitle}>Você só escolhe uma vez.</Text>

        <View style={styles.options}>
          {OPTIONS.map((option) => {
            const selected = role === option.role;
            return (
              <Pressable
                key={option.role}
                style={styles.card}
                onPress={() => setRole(option.role)}
                accessibilityRole="radio"
                accessibilityState={{ selected }}>
                {selected && (
                  <LinearGradient
                    colors={BRAND_GRADIENT}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={StyleSheet.absoluteFill}
                  />
                )}
                <Text style={[styles.cardTitle, selected && styles.onGradient]}>{option.title}</Text>
                <Text style={[styles.cardDescription, selected && styles.onGradient]}>
                  {option.description}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {error && <Text style={styles.error}>{error}</Text>}
      </ScrollView>

      <View style={styles.footer}>
        <Pressable
          style={[styles.button, !role && styles.buttonDisabled]}
          onPress={confirm}
          disabled={!role || busy}
          accessibilityRole="button">
          <LinearGradient
            colors={BRAND_GRADIENT}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          {busy ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.buttonLabel}>Continuar</Text>}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#FFFFFF' },
  content: { paddingHorizontal: 20, paddingTop: 90, paddingBottom: 24 },
  title: {
    fontFamily: FONTS.extraBold,
    fontSize: 26,
    lineHeight: 32,
    color: '#1a1a1a',
    letterSpacing: -0.4,
  },
  subtitle: { fontFamily: FONTS.regular, fontSize: 15, color: '#6b6e78', marginTop: 6, marginBottom: 28 },
  options: { gap: 14 },
  card: {
    borderRadius: 22,
    backgroundColor: '#F3F4F7',
    padding: 22,
    gap: 6,
    overflow: 'hidden',
  },
  cardTitle: { fontFamily: FONTS.bold, fontSize: 18, color: '#1a1a1a' },
  cardDescription: { fontFamily: FONTS.regular, fontSize: 14, lineHeight: 20, color: '#6b6e78' },
  onGradient: { color: '#FFFFFF' },
  error: { fontFamily: FONTS.semiBold, fontSize: 14, color: BRAND_ACCENT, marginTop: 18, textAlign: 'center' },
  footer: { paddingHorizontal: 20, paddingBottom: 48 },
  button: {
    height: 52,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  buttonDisabled: { opacity: 0.4 },
  buttonLabel: { fontFamily: FONTS.bold, fontSize: 16, color: '#FFFFFF' },
});
