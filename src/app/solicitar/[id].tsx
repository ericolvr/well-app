import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ChevronLeft } from 'lucide-react-native';

import { useAuth } from '@/contexts/AuthContext';
import { fetchProfessional, photoSource, type ProfessionalProfile } from '@/services/professional-service';
import { createServiceRequest, requestErrorMessage, type RequestMode, type RequestPeriod } from '@/services/request-service';
import { BRAND_ACCENT, BRAND_GRADIENT, FONTS } from '@/theme/tokens';

type Mode = RequestMode;
type Period = RequestPeriod;

const MAX_MESSAGE = 500;
const DAYS = [
  { key: 'mon', label: 'Seg' },
  { key: 'tue', label: 'Ter' },
  { key: 'wed', label: 'Qua' },
  { key: 'thu', label: 'Qui' },
  { key: 'fri', label: 'Sex' },
  { key: 'sat', label: 'Sáb' },
  { key: 'sun', label: 'Dom' },
];
const PERIODS: { key: Period; label: string }[] = [
  { key: 'morning', label: 'Manhã' },
  { key: 'afternoon', label: 'Tarde' },
  { key: 'evening', label: 'Noite' },
];

function money(cents: number) {
  return `R$ ${(cents / 100).toFixed(2).replace('.', ',')}`;
}

function Chip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      style={[styles.chip, selected && styles.chipSelected]}>
      <Text style={[styles.chipLabel, selected && styles.chipLabelSelected]}>{label}</Text>
    </Pressable>
  );
}

export default function RequestScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { token } = useAuth();
  const [professional, setProfessional] = useState<ProfessionalProfile | null>();
  const [chosenMode, setChosenMode] = useState<Mode>();
  const [message, setMessage] = useState('');
  const [days, setDays] = useState<string[]>([]);
  const [period, setPeriod] = useState<Period>();
  const [sending, setSending] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetchProfessional(Number(id))
      .then((p) => !cancelled && setProfessional(p))
      .catch(() => !cancelled && setProfessional(null));
    return () => {
      cancelled = true;
    };
  }, [id]);

  const back = () => (router.canGoBack() ? router.back() : router.replace('/(tabs)/profissionais'));

  const toggleDay = (day: string) =>
    setDays((current) => (current.includes(day) ? current.filter((d) => d !== day) : [...current, day]));

  // Se o profissional atende de um só jeito, a modalidade já vem escolhida.
  const options: { key: Mode; label: string }[] = [];
  if (professional?.online) options.push({ key: 'online', label: 'Online' });
  if (professional?.in_person) options.push({ key: 'in_person', label: 'Presencial' });
  const mode = chosenMode ?? (options.length === 1 ? options[0].key : undefined);

  const canSend = !!mode && message.trim().length > 0 && !sending;

  const send = async () => {
    if (!mode) return;
    setSending(true);
    try {
      await createServiceRequest({
        professional_id: Number(id),
        mode,
        message: message.trim(),
        preferred_days: DAYS.filter((d) => days.includes(d.key)).map((d) => d.key),
        preferred_period: period,
      });
      // Depois do OK, volta direto à lista de profissionais, sem passar pela página do profissional.
      Alert.alert('Solicitação enviada', 'Avisaremos quando o profissional responder.', [
        { text: 'OK', onPress: () => router.dismissTo('/(tabs)/profissionais') },
      ]);
    } catch (error) {
      Alert.alert('Não foi possível enviar', requestErrorMessage(error));
    } finally {
      setSending(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <StatusBar style="dark" />

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.top}>
          <Pressable onPress={back} hitSlop={12} accessibilityRole="button" accessibilityLabel="Voltar">
            <ChevronLeft size={28} color="#1a1a1a" />
          </Pressable>
        </View>

        {professional === undefined ? (
          <ActivityIndicator style={styles.loader} />
        ) : professional === null ? (
          <Text style={styles.empty}>Não foi possível carregar este profissional.</Text>
        ) : (
          <>
            <Image source={photoSource(professional.photo_url, token)} style={styles.avatar} />
            <Text style={styles.name}>{professional.name}</Text>
            {professional.category ? <Text style={styles.category}>{professional.category.name}</Text> : null}

            {options.length > 1 ? (
              <>
                <Text style={styles.label}>Como você prefere?</Text>
                <View style={styles.chips}>
                  {options.map((o) => (
                    <Chip key={o.key} label={o.label} selected={mode === o.key} onPress={() => setChosenMode(o.key)} />
                  ))}
                </View>
              </>
            ) : null}

            <Text style={styles.label}>Conte o que você procura</Text>
            <TextInput
              value={message}
              onChangeText={setMessage}
              placeholder="Qual é o seu objetivo? Tem alguma restrição ou experiência anterior?"
              placeholderTextColor="#9a9da6"
              multiline
              maxLength={MAX_MESSAGE}
              textAlignVertical="top"
              style={styles.input}
            />
            <Text style={styles.counter}>
              {message.length}/{MAX_MESSAGE}
            </Text>

            <Text style={styles.label}>Melhores dias</Text>
            <View style={styles.chips}>
              {DAYS.map((d) => (
                <Chip key={d.key} label={d.label} selected={days.includes(d.key)} onPress={() => toggleDay(d.key)} />
              ))}
            </View>

            <Text style={styles.label}>Melhor período</Text>
            <View style={styles.chips}>
              {PERIODS.map((p) => (
                <Chip
                  key={p.key}
                  label={p.label}
                  selected={period === p.key}
                  onPress={() => setPeriod(period === p.key ? undefined : p.key)}
                />
              ))}
            </View>
            <Text style={styles.hint}>O horário exato vocês combinam depois que o profissional aceitar.</Text>

            <View style={styles.summary}>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Valor da hora</Text>
                <Text style={styles.summaryValue}>{money(professional.hourly_rate_cents)}</Text>
              </View>
              {professional.first_class_free ? (
                <View style={styles.freeBadge}>
                  <Text style={styles.freeLabel}>1ª aula grátis incluída</Text>
                </View>
              ) : null}
              <Text style={styles.summaryNote}>Nada é cobrado agora. O pagamento é combinado com o profissional.</Text>
            </View>

            <Pressable
              style={[styles.button, !canSend && styles.buttonDisabled]}
              onPress={send}
              disabled={!canSend}
              accessibilityRole="button">
              <LinearGradient
                colors={BRAND_GRADIENT}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFill}
              />
              {sending ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.buttonLabel}>Enviar pedido</Text>}
            </Pressable>
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#FFFFFF' },
  content: { paddingHorizontal: 20, paddingBottom: 48 },
  top: { paddingTop: 52, paddingBottom: 18, alignSelf: 'flex-start' },
  loader: { marginTop: 60 },
  empty: { fontFamily: FONTS.regular, fontSize: 15, color: '#6b6e78', textAlign: 'center', marginTop: 60, paddingHorizontal: 20 },
  avatar: { width: 112, height: 112, borderRadius: 56, backgroundColor: '#E4E6EC', alignSelf: 'center' },
  name: {
    fontFamily: FONTS.extraBold,
    fontSize: 26,
    lineHeight: 32,
    color: '#1a1a1a',
    letterSpacing: -0.4,
    textAlign: 'center',
    marginTop: 16,
  },
  category: { fontFamily: FONTS.semiBold, fontSize: 15, color: BRAND_ACCENT, textAlign: 'center', marginTop: -4 },
  label: { fontFamily: FONTS.bold, fontSize: 16, color: '#1a1a1a', marginTop: 28, marginBottom: 10 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 999, backgroundColor: '#F3F4F7' },
  chipSelected: { backgroundColor: '#FFF1EC', borderWidth: 1, borderColor: BRAND_ACCENT, paddingHorizontal: 15, paddingVertical: 9 },
  chipLabel: { fontFamily: FONTS.semiBold, fontSize: 14, color: '#1a1a1a' },
  chipLabelSelected: { color: BRAND_ACCENT },
  input: {
    minHeight: 130,
    padding: 14,
    borderRadius: 18,
    backgroundColor: '#F3F4F7',
    fontFamily: FONTS.regular,
    fontSize: 15,
    lineHeight: 21,
    color: '#1a1a1a',
  },
  counter: { fontFamily: FONTS.regular, fontSize: 12, color: '#9a9da6', textAlign: 'right', marginTop: 6 },
  hint: { fontFamily: FONTS.regular, fontSize: 13, lineHeight: 18, color: '#6b6e78', marginTop: 10 },
  summary: { marginTop: 28, padding: 16, borderRadius: 18, backgroundColor: '#F3F4F7' },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between' },
  summaryLabel: { fontFamily: FONTS.regular, fontSize: 15, color: '#6b6e78' },
  summaryValue: { fontFamily: FONTS.extraBold, fontSize: 16, color: '#1a1a1a' },
  freeBadge: {
    alignSelf: 'flex-start',
    marginTop: 12,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: '#FFF1EC',
  },
  freeLabel: { fontFamily: FONTS.bold, fontSize: 13, color: BRAND_ACCENT },
  summaryNote: { fontFamily: FONTS.regular, fontSize: 13, lineHeight: 18, color: '#6b6e78', marginTop: 12 },
  button: { marginTop: 24, height: 52, borderRadius: 18, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  buttonDisabled: { opacity: 0.4 },
  buttonLabel: { fontFamily: FONTS.bold, fontSize: 16, color: '#FFFFFF' },
});
