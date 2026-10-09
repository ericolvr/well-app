import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams, type Href } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ChevronLeft } from 'lucide-react-native';

import { useAuth } from '@/contexts/AuthContext';
import { fetchProfessional, photoSource, type ProfessionalProfile } from '@/services/professional-service';
import { BRAND_ACCENT, BRAND_GRADIENT, FONTS } from '@/theme/tokens';

function money(cents: number) {
  return `R$ ${(cents / 100).toFixed(2).replace('.', ',')}`;
}

function modes(p: ProfessionalProfile) {
  if (p.online && p.in_person) return 'Online e presencial';
  if (p.online) return 'Online';
  if (p.in_person) return 'Presencial';
  return '—';
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function Section({ title, children }: { title: string; children: string }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <Text style={styles.sectionText}>{children}</Text>
    </View>
  );
}

function Row({ label, value, last }: { label: string; value: string; last?: boolean }) {
  return (
    <View style={[styles.row, !last && styles.rowDivider]}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

export default function ProfessionalDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { token } = useAuth();
  const [professional, setProfessional] = useState<ProfessionalProfile | null>();

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

  const request = () => router.push(`/solicitar/${id}` as Href);

  return (
    <View style={styles.screen}>
      <StatusBar style="dark" />

      <ScrollView contentContainerStyle={styles.content}>
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
            {professional.headline ? <Text style={styles.headline}>{professional.headline}</Text> : null}

            <View style={styles.stats}>
              <Stat value={money(professional.hourly_rate_cents)} label="por hora" />
              <View style={styles.statDivider} />
              <Stat
                value={professional.years_experience > 0 ? `${professional.years_experience}` : '—'}
                label={professional.years_experience === 1 ? 'ano de experiência' : 'anos de experiência'}
              />
              {(professional.rating_count ?? 0) > 0 ? (
                <>
                  <View style={styles.statDivider} />
                  <Stat value={(professional.rating_avg ?? 0).toFixed(1).replace('.', ',')} label={`${professional.rating_count} avaliações`} />
                </>
              ) : null}
            </View>

            {professional.first_class_free ? (
              <View style={styles.badge}>
                <Text style={styles.badgeLabel}>1ª aula grátis</Text>
              </View>
            ) : null}

            {professional.bio ? <Section title="Sobre">{professional.bio}</Section> : null}
            {professional.education ? <Section title="Formação">{professional.education}</Section> : null}

            <Text style={styles.sectionTitle}>Atendimento</Text>
            <View style={styles.card}>
              <Row label="Modalidade" value={modes(professional)} last={!professional.in_person} />
              {professional.in_person ? <Row label="Cidade" value={professional.city || '—'} /> : null}
              {professional.in_person ? (
                <Row
                  label="Raio de deslocamento"
                  value={professional.service_radius_km > 0 ? `${professional.service_radius_km} km` : 'Não se desloca'}
                  last
                />
              ) : null}
            </View>

            <Pressable style={styles.button} onPress={request} accessibilityRole="button">
              <LinearGradient
                colors={BRAND_GRADIENT}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFill}
              />
              <Text style={styles.buttonLabel}>Consultar profissional</Text>
            </Pressable>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#FFFFFF' },
  top: { paddingTop: 52, paddingBottom: 28, alignSelf: 'flex-start' },
  loader: { marginTop: 60 },
  empty: { fontFamily: FONTS.regular, fontSize: 15, color: '#6b6e78', textAlign: 'center', marginTop: 60, paddingHorizontal: 20 },
  content: { paddingHorizontal: 20, paddingBottom: 48 },
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
  category: { fontFamily: FONTS.semiBold, fontSize: 15, color: BRAND_ACCENT, textAlign: 'center', marginTop: 2 },
  headline: { fontFamily: FONTS.regular, fontSize: 16, lineHeight: 22, color: '#1a1a1a', textAlign: 'center', marginTop: 10 },
  stats: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 24,
    paddingVertical: 16,
    borderRadius: 18,
    backgroundColor: '#F3F4F7',
  },
  stat: { flex: 1, alignItems: 'center', paddingHorizontal: 6 },
  statValue: { fontFamily: FONTS.extraBold, fontSize: 18, color: '#1a1a1a' },
  statLabel: { fontFamily: FONTS.regular, fontSize: 12, color: '#6b6e78', marginTop: 2, textAlign: 'center' },
  statDivider: { width: StyleSheet.hairlineWidth, alignSelf: 'stretch', backgroundColor: '#D8DAE0' },
  badge: {
    alignSelf: 'center',
    marginTop: 14,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: '#FFF1EC',
  },
  badgeLabel: { fontFamily: FONTS.bold, fontSize: 13, color: BRAND_ACCENT },
  section: { marginTop: 8 },
  sectionTitle: { fontFamily: FONTS.bold, fontSize: 18, color: '#1a1a1a', marginTop: 24, marginBottom: 8 },
  sectionText: { fontFamily: FONTS.regular, fontSize: 15, lineHeight: 22, color: '#3a3d46' },
  card: { borderRadius: 18, backgroundColor: '#F3F4F7', paddingHorizontal: 16 },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 14, gap: 16 },
  rowDivider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#D8DAE0' },
  rowLabel: { fontFamily: FONTS.regular, fontSize: 15, color: '#6b6e78' },
  rowValue: { fontFamily: FONTS.semiBold, fontSize: 15, color: '#1a1a1a', flexShrink: 1, textAlign: 'right' },
  button: { marginTop: 32, height: 52, borderRadius: 18, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  buttonLabel: { fontFamily: FONTS.bold, fontSize: 16, color: '#FFFFFF' },
});
