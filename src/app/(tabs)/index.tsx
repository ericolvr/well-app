import { useState } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useNavigation } from 'expo-router';
import type { DrawerNavigationProp } from 'expo-router/drawer';
// Ícones desativados por enquanto; para reativar, descomente aqui e em METRICS.
// import { Flame, MapPin, Moon, Smile, Zap } from 'lucide-react-native';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MenuAsymmetric } from '@/components/icons/menu-asymmetric';
import { MoodSlider } from '@/components/mood-slider';
import { BRAND_GRADIENT, FONTS } from '@/theme/tokens';

// Uma cor por barra, escolhida pelo que o nome lembra: sono (azul), energia (amarelo), estresse (vermelho), humor (verde), dor (rosa), cada uma em degradê.
const METRICS = [
  { key: 'sleep', label: 'Sono', colors: ['#6FA8FF', '#6C5CE7'] /* Icon: Moon */ },
  { key: 'energy', label: 'Energia', colors: ['#FFD54A', '#FF9F1C'] /* Icon: Zap */ },
  { key: 'stress', label: 'Estresse', colors: ['#ff8a3d', '#ff3d5a'] /* Icon: Flame */ },
  { key: 'mood', label: 'Humor', colors: ['#7BE0A8', '#1FB5A0'] /* Icon: Smile */ },
  { key: 'pain', label: 'Dor / tensão', colors: ['#ff6aa8', '#ff2f8f'] /* Icon: MapPin */ },
] as const;

const DURATIONS = [
  { key: 20, label: '20 min' },
  { key: 40, label: '40 min' },
  { key: 60, label: '1 hora' },
] as const;

type MetricKey = (typeof METRICS)[number]['key'];

export default function HomeScreen() {
  const [values, setValues] = useState<Record<MetricKey, number>>({
    sleep: 0.6,
    energy: 0.4,
    stress: 0.6,
    mood: 0.45,
    pain: 0.4,
  });
  const navigation = useNavigation<DrawerNavigationProp<Record<string, undefined>>>();
  const [duration, setDuration] = useState<number>(40);
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.screen, { paddingTop: insets.top + 16 }]}>
      <View style={styles.header}>
        <Text style={styles.title}>Como está o dia?</Text>
        <Pressable
          style={styles.menu}
          onPress={() => navigation.openDrawer()}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Abrir menu">
          <MenuAsymmetric size={23} color="#1a1a1a" strokeWidth={2.8} />
        </Pressable>
      </View>

      {/* O conteúdo desce para o rodapé; em telas pequenas ele rola. */}
      <ScrollView
        style={styles.body}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 8 }]}
        showsVerticalScrollIndicator={false}>
        <View style={styles.metrics}>
          {METRICS.map(({ key, label, colors }) => (
            <MoodSlider
              key={key}
              // Icon={Icon}
              label={label}
              colors={colors}
              value={values[key]}
              onChange={(value) => setValues((current) => ({ ...current, [key]: value }))}
            />
          ))}
        </View>

        <Text style={styles.sectionTitle}>Tempo disponível</Text>
        <View style={styles.durations}>
          {DURATIONS.map(({ key, label }) => {
            const selected = duration === key;
            return (
              <Pressable
                key={key}
                style={styles.chip}
                onPress={() => setDuration(key)}
                accessibilityRole="button"
                accessibilityState={{ selected }}>
                {selected && (
                  <LinearGradient
                    colors={BRAND_GRADIENT}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={StyleSheet.absoluteFill}
                  />
                )}
                <Text style={[styles.chipLabel, selected && styles.chipLabelSelected]}>{label}</Text>
              </Pressable>
            );
          })}
        </View>

        <Pressable style={styles.button} onPress={() => router.push('/plan')} accessibilityRole="button">
          <LinearGradient
            colors={BRAND_GRADIENT}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          <Text style={styles.buttonLabel}>Criar meu dia</Text>
        </Pressable>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#FFFFFF', paddingHorizontal: 20 },
  body: { flex: 1 },
  content: { flexGrow: 1, justifyContent: 'flex-end' },
  title: {
    fontFamily: FONTS.extraBold,
    fontSize: 25,
    color: '#1a1a1a',
    letterSpacing: -0.4,
    lineHeight: 31,
    flex: 1,
  },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 28 },
  menu: { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  metrics: { gap: 14 },
  sectionTitle: {
    fontFamily: FONTS.bold,
    fontSize: 18,
    color: '#1a1a1a',
    marginTop: 32,
    marginBottom: 14,
  },
  durations: { flexDirection: 'row', gap: 12 },
  chip: {
    flex: 1,
    height: 52,
    borderRadius: 18,
    backgroundColor: '#F3F4F7',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  chipLabel: { fontFamily: FONTS.bold, fontSize: 16, color: '#6b6e78' },
  chipLabelSelected: { color: '#FFFFFF' },
  button: {
    marginTop: 40,
    height: 52,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  buttonLabel: { fontFamily: FONTS.bold, fontSize: 16, color: '#FFFFFF' },
});
