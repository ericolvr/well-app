import { useCallback, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useFocusEffect } from 'expo-router';
import { Check } from 'lucide-react-native';

import { useAuth } from '@/contexts/AuthContext';
import {
  photoSource,
  type ProfessionalProfile,
  setMyProfessionalVisible,
  submitMyProfessional,
} from '@/services/professional-service';
import { BRAND_ACCENT, BRAND_GRADIENT, FONTS } from '@/theme/tokens';

// O que o perfil precisa ter para ir à aprovação; espelha ValidateForReview do backend.
function checklist(p: ProfessionalProfile) {
  return [
    { label: 'Foto de perfil', done: !!p.photo_url },
    { label: 'Título do anúncio', done: !!p.headline?.trim() },
    { label: 'Área de atuação', done: !!p.category_id },
    { label: 'Sobre você', done: !!p.bio?.trim() },
    { label: 'Formação', done: !!p.education?.trim() },
    {
      label: 'Forma de atendimento',
      done: (p.online || p.in_person) && (!p.in_person || !!p.city?.trim()),
    },
    { label: 'Valor da hora', done: p.hourly_rate_cents > 0 },
  ];
}

export default function ProfessionalHome() {
  const { user, professional, refreshProfessional } = useAuth();

  // O admin pode ter decidido enquanto o app estava aberto; confere ao voltar para a tela.
  useFocusEffect(
    useCallback(() => {
      void refreshProfessional();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []),
  );

  const status = professional?.status ?? 'draft';

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}>
      <Text style={styles.name}>{user?.name?.trim().split(/\s+/)[0]}</Text>

      {!professional && (
        <Section
          title="Perfil não encontrado"
          text="Não encontramos o seu perfil profissional. Tente abrir o app de novo."
        />
      )}

      {professional && status === 'draft' && <DraftState profile={professional} />}
      {professional && status === 'pending' && <PendingState profile={professional} />}
      {professional && status === 'rejected' && <RejectedState profile={professional} />}
      {professional && status === 'approved' && <ApprovedState profile={professional} />}
    </ScrollView>
  );
}

function DraftState({ profile }: { profile: ProfessionalProfile }) {
  const items = checklist(profile);
  const done = items.filter((item) => item.done).length;
  const complete = done === items.length;
  const { refreshProfessional } = useAuth();

  const submit = async () => {
    try {
      await submitMyProfessional();
      await refreshProfessional();
    } catch {
      Alert.alert('Não foi possível enviar', 'Verifique a conexão e tente de novo.');
    }
  };

  return (
    <>
      <Section
        badge="Rascunho"
        title={complete ? 'Tudo pronto para enviar' : 'Complete seu perfil'}
        text={
          complete
            ? 'Seu perfil está completo. Envie para a nossa equipe conferir e começar a receber clientes.'
            : 'Preencha tudo para enviar à nossa equipe e começar a receber clientes.'
        }
      />

      <View style={styles.progressRow}>
        <View style={styles.progressTrack}>
          <LinearGradient
            colors={BRAND_GRADIENT}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[styles.progressFill, { width: `${(done / items.length) * 100}%` }]}
          />
        </View>
        <Text style={styles.progressText}>
          {done} de {items.length}
        </Text>
      </View>

      <View style={styles.card}>
        {items.map((item) => (
          <View key={item.label} style={styles.checkRow}>
            <View style={[styles.checkDot, !item.done && styles.checkDotEmpty]}>
              {item.done && (
                <LinearGradient
                  colors={BRAND_GRADIENT}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={StyleSheet.absoluteFill}
                />
              )}
              {item.done && <Check size={14} color="#FFFFFF" strokeWidth={3} />}
            </View>
            <Text style={[styles.checkLabel, !item.done && styles.checkLabelPending]}>{item.label}</Text>
          </View>
        ))}
      </View>

      {complete ? (
        <>
          <PrimaryButton label="Enviar para análise" onPress={submit} />
          <Pressable
            style={styles.secondary}
            onPress={() => router.push('/professional-profile')}
            accessibilityRole="button">
            <Text style={styles.secondaryLabel}>Revisar informações</Text>
          </Pressable>
        </>
      ) : (
        <PrimaryButton label="Continuar preenchimento" onPress={() => router.push('/professional-profile')} />
      )}
    </>
  );
}

function PendingState({ profile }: { profile: ProfessionalProfile }) {
  return (
    <>
      <Section
        badge="Em análise"
        title="Seu perfil está em análise"
        text="Nossa equipe confere as informações antes de você aparecer para os clientes. Avisaremos quando terminar."
      />
      <Summary profile={profile} />
      <Text style={styles.note}>Durante a análise o perfil não pode ser editado.</Text>
    </>
  );
}

function RejectedState({ profile }: { profile: ProfessionalProfile }) {
  return (
    <>
      <Section badge="Ajustes pedidos" title="Precisamos de alguns ajustes" text="Corrija o que pedimos e envie de novo para análise." />
      <View style={styles.rejection}>
        <Text style={styles.rejectionTitle}>Ajustes pedidos pela equipe</Text>
        <Text style={styles.rejectionText}>{profile.rejection_reason || 'Revise as informações do perfil.'}</Text>
      </View>
      <PrimaryButton label="Corrigir e reenviar" onPress={() => router.push('/professional-profile')} />
    </>
  );
}

function ApprovedState({ profile }: { profile: ProfessionalProfile }) {
  const { refreshProfessional } = useAuth();
  const [busy, setBusy] = useState(false);

  const toggleVisible = async (active: boolean) => {
    setBusy(true);
    try {
      await setMyProfessionalVisible(active);
      await refreshProfessional();
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Section
        badge="Aprovado"
        title="Seu perfil está aprovado"
        text={profile.active ? 'Você já aparece para os clientes.' : 'Seu perfil está pausado e não aparece para os clientes.'}
      />
      <Summary profile={profile} />
      <View style={styles.visibility}>
        <View style={styles.visibilityText}>
          <Text style={styles.visibilityTitle}>Aparecer para novos clientes</Text>
          <Text style={styles.visibilityHint}>Desligue para pausar, por exemplo nas férias.</Text>
        </View>
        <Switch
          value={profile.active}
          onValueChange={toggleVisible}
          disabled={busy}
          trackColor={{ true: BRAND_ACCENT }}
        />
      </View>
    </>
  );
}

function Summary({ profile }: { profile: ProfessionalProfile }) {
  const { token } = useAuth();
  const modes = [profile.online && 'Online', profile.in_person && `Presencial em ${profile.city}`]
    .filter(Boolean)
    .join(' · ');

  return (
    <View style={[styles.card, styles.summary]}>
      <View style={styles.summaryTop}>
        <Image source={photoSource(profile.photo_url, token)} style={styles.avatar} />
        <View style={styles.summaryText}>
          <Text style={styles.summaryName}>{profile.category?.name}</Text>
          <Text style={styles.summaryMuted}>
            {profile.years_experience > 0 ? `${profile.years_experience} anos de experiência` : 'Profissional'}
          </Text>
        </View>
      </View>
      <Text style={styles.summaryHeadline}>{profile.headline}</Text>
      <Text style={styles.summaryMuted}>{modes}</Text>
      <Text style={styles.summaryRate}>
        R$ {Math.round(profile.hourly_rate_cents / 100)}/h{profile.first_class_free ? ' · 1ª aula grátis' : ''}
      </Text>
    </View>
  );
}

function Section({ title, text, badge }: { title: string; text: string; badge?: string }) {
  return (
    <View style={styles.section}>
      {badge && (
        <View style={styles.badge}>
          <LinearGradient
            colors={BRAND_GRADIENT}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.badgeDot}
          />
          <Text style={styles.badgeLabel}>{badge}</Text>
        </View>
      )}
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.text}>{text}</Text>
    </View>
  );
}

function PrimaryButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable style={styles.button} onPress={onPress} accessibilityRole="button">
      <LinearGradient
        colors={BRAND_GRADIENT}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <Text style={styles.buttonLabel}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  secondary: { alignSelf: 'center', marginTop: 20, paddingVertical: 8, paddingHorizontal: 16 },
  secondaryLabel: { fontFamily: FONTS.semiBold, fontSize: 15, color: '#6b6e78' },
  screen: { flex: 1, backgroundColor: '#FFFFFF' },
  content: { paddingHorizontal: 20, paddingTop: 70, paddingBottom: 120 },
  name: {
    fontFamily: FONTS.extraBold,
    fontSize: 26,
    lineHeight: 32,
    color: '#1a1a1a',
    letterSpacing: -0.4,
    marginBottom: 2,
  },
  section: { marginTop: 4, marginBottom: 24 },
  badge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFF1EC',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 7,
    marginBottom: 26,
  },
  badgeDot: { width: 8, height: 8, borderRadius: 4 },
  badgeLabel: { fontFamily: FONTS.bold, fontSize: 13, color: BRAND_ACCENT },
  title: { fontFamily: FONTS.extraBold, fontSize: 26, lineHeight: 32, color: '#1a1a1a', letterSpacing: -0.4 },
  text: { fontFamily: FONTS.regular, fontSize: 15, lineHeight: 22, color: '#6b6e78', marginTop: -4 },
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 18 },
  progressTrack: { flex: 1, height: 7, borderRadius: 3.5, backgroundColor: '#EDEEF2', overflow: 'hidden' },
  progressFill: { height: 7 },
  progressText: { fontFamily: FONTS.bold, fontSize: 14, color: BRAND_ACCENT },
  card: { backgroundColor: '#F3F4F7', borderRadius: 22, padding: 20, gap: 14 },
  checkRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  checkDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  checkDotEmpty: { borderWidth: 2, borderColor: '#D5D7DE' },
  checkLabel: { fontFamily: FONTS.semiBold, fontSize: 16, color: '#1a1a1a' },
  checkLabelPending: { color: '#9a9ca6' },
  button: {
    marginTop: 28,
    height: 52,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  buttonLabel: { fontFamily: FONTS.bold, fontSize: 16, color: '#FFFFFF' },
  note: { fontFamily: FONTS.regular, fontSize: 13, color: '#6b6e78', textAlign: 'center', marginTop: 18 },
  rejection: { backgroundColor: '#FFF1EC', borderRadius: 22, padding: 20, gap: 6 },
  rejectionTitle: { fontFamily: FONTS.bold, fontSize: 14, color: BRAND_ACCENT },
  rejectionText: { fontFamily: FONTS.regular, fontSize: 15, lineHeight: 22, color: '#1a1a1a' },
  summary: { gap: 8 },
  summaryTop: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 6 },
  avatar: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#E4E6EC' },
  summaryText: { flex: 1, gap: 2 },
  summaryName: { fontFamily: FONTS.bold, fontSize: 18, color: '#1a1a1a' },
  summaryHeadline: { fontFamily: FONTS.semiBold, fontSize: 16, lineHeight: 22, color: '#1a1a1a' },
  summaryMuted: { fontFamily: FONTS.regular, fontSize: 14, color: '#6b6e78' },
  summaryRate: { fontFamily: FONTS.bold, fontSize: 16, color: BRAND_ACCENT, marginTop: 4 },
  visibility: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 24 },
  visibilityText: { flex: 1, gap: 2 },
  visibilityTitle: { fontFamily: FONTS.bold, fontSize: 16, color: '#1a1a1a' },
  visibilityHint: { fontFamily: FONTS.regular, fontSize: 13, color: '#6b6e78' },
});
