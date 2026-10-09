import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ChevronLeft } from 'lucide-react-native';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { FONTS } from '@/theme/tokens';

// Plano de exemplo; vai ser gerado pelo backend a partir das respostas da home.
const FOCUS = 'Recuperação';
const QUOTE = '“Pequenas ações, grandes resultados.”';

const STEPS = [
  { time: '08:30', title: 'Hidratação', detail: '400 ml de água', color: '#ff8a3d' },
  { time: '10:30', title: 'Mobilidade', detail: '5 minutos', color: '#ff6a4a' },
  { time: '13:00', title: 'Caminhada', detail: '15 minutos', color: '#ff3d5a' },
  { time: '16:00', title: 'Respiração', detail: '4 minutos', color: '#ff3f74' },
  { time: '19:00', title: 'Desaceleração', detail: 'Rotina para dormir', color: '#ff2f8f' },
];

const DOT = 14;
const LINE_COLOR = '#FBE1E5';

export default function PlanScreen() {
  return (
    <View style={styles.screen}>
      <StatusBar style="dark" />
      <Pressable
        style={styles.back}
        onPress={() => router.back()}
        hitSlop={12}
        accessibilityRole="button"
        accessibilityLabel="Voltar">
        <ChevronLeft size={26} color="#1a1a1a" strokeWidth={2} />
      </Pressable>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Seu plano de hoje</Text>
        <Text style={styles.focus}>Foco: {FOCUS}</Text>

        <View style={styles.timeline}>
          {STEPS.map((step, index) => (
            <View key={step.time} style={styles.row}>
              <Text style={styles.time}>{step.time}</Text>

              <View style={styles.rail}>
                {index > 0 && <View style={[styles.line, styles.lineUp]} />}
                {index < STEPS.length - 1 && <View style={[styles.line, styles.lineDown]} />}
                <View style={[styles.dot, { backgroundColor: step.color }]} />
              </View>

              <View style={styles.text}>
                <Text style={styles.stepTitle}>{step.title}</Text>
                <Text style={styles.stepDetail}>{step.detail}</Text>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.quote}>
          <Text style={styles.quoteText}>{QUOTE}</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#FFFFFF' },
  back: { position: 'absolute', top: 64, left: 16, zIndex: 1 },
  content: { paddingHorizontal: 24, paddingTop: 70, paddingBottom: 60 },
  title: {
    fontFamily: FONTS.extraBold,
    fontSize: 26,
    lineHeight: 32,
    color: '#1a1a1a',
    letterSpacing: -0.4,
    textAlign: 'center',
  },
  focus: {
    fontFamily: FONTS.semiBold,
    fontSize: 17,
    color: '#3a3b42',
    textAlign: 'center',
    marginTop: 14,
    marginBottom: 36,
  },
  timeline: { marginBottom: 32 },
  row: { flexDirection: 'row', alignItems: 'flex-start', minHeight: 82 },
  time: { width: 64, fontFamily: FONTS.bold, fontSize: 16, lineHeight: 22, color: '#1a1a1a' },
  rail: { width: 40, alignItems: 'center', alignSelf: 'stretch' },
  line: { position: 'absolute', width: 2, backgroundColor: LINE_COLOR },
  lineUp: { top: 0, height: 11 },
  lineDown: { top: 11, bottom: 0 },
  dot: { width: DOT, height: DOT, borderRadius: DOT / 2, marginTop: 4 },
  text: { flex: 1, paddingLeft: 6 },
  stepTitle: { fontFamily: FONTS.bold, fontSize: 17, lineHeight: 22, color: '#1a1a1a' },
  stepDetail: { fontFamily: FONTS.regular, fontSize: 14, color: '#6b6e78', marginTop: 2 },
  quote: { backgroundColor: '#F3F4F7', borderRadius: 22, padding: 22 },
  quoteText: { fontFamily: FONTS.medium, fontSize: 18, lineHeight: 26, color: '#2a2b33' },
});
