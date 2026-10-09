import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';

import { useAuth } from '@/contexts/AuthContext';
import { photoSource } from '@/services/professional-service';
import { BRAND_GRADIENT, FONTS } from '@/theme/tokens';

const STATUS_LABEL = {
  draft: 'Rascunho',
  pending: 'Em análise',
  approved: 'Aprovado',
  rejected: 'Ajustes pedidos',
} as const;

function modes(online: boolean, inPerson: boolean) {
  if (online && inPerson) return 'Online e presencial';
  if (online) return 'Online';
  if (inPerson) return 'Presencial';
  return undefined;
}

function Row({ label, value, last }: { label: string; value?: string; last?: boolean }) {
  return (
    <View style={[styles.row, !last && styles.rowDivider]}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value || '—'}</Text>
    </View>
  );
}

export default function ProfessionalProfileTab() {
  const { user, token, professional, signOut } = useAuth();
  const status = professional?.status;

  const openForm = () => router.push('/professional-profile');

  // O perfil só sai do ar quando a pessoa realmente altera algo no formulário.
  const edit = openForm;

  const handleSignOut = async () => {
    await signOut();
    router.replace('/login');
  };

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Image source={photoSource(professional?.photo_url, token)} style={styles.avatar} />
        <View style={styles.headerText}>
          <Text style={styles.name}>{user?.name}</Text>
          {user?.email ? <Text style={styles.email}>{user.email}</Text> : null}
        </View>
      </View>
      {status && (
        <View style={styles.pill}>
          <Text style={styles.pillLabel}>{STATUS_LABEL[status]}</Text>
        </View>
      )}

      {professional && (
        <View style={styles.card}>
          <Row label="Especialidade" value={professional.category?.name} />
          <Row label="Cidade" value={professional.city} />
          <Row
            label="Valor da hora"
            value={
              professional.hourly_rate_cents > 0
                ? `R$ ${(professional.hourly_rate_cents / 100).toFixed(2).replace('.', ',')}`
                : undefined
            }
          />
          <Row label="Atendimento" value={modes(professional.online, professional.in_person)} last />
        </View>
      )}

      {professional && (
        <Pressable style={styles.button} onPress={edit} accessibilityRole="button">
          <LinearGradient
            colors={BRAND_GRADIENT}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          <Text style={styles.buttonLabel}>Editar perfil</Text>
        </Pressable>
      )}

      <Pressable style={styles.signOut} onPress={handleSignOut} hitSlop={12} accessibilityRole="button">
        <Text style={styles.signOutLabel}>Sair do aplicativo</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#FFFFFF' },
  content: { paddingHorizontal: 20, paddingTop: 70, paddingBottom: 120 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  avatar: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#E4E6EC' },
  headerText: { flex: 1 },
  name: { fontFamily: FONTS.extraBold, fontSize: 26, lineHeight: 32, color: '#1a1a1a', letterSpacing: -0.4 },
  email: { fontFamily: FONTS.regular, fontSize: 14, color: '#6b6e78', marginTop: 2 },
  pill: {
    alignSelf: 'flex-start',
    marginTop: 16,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: '#FFF1EC',
  },
  pillLabel: { fontFamily: FONTS.semiBold, fontSize: 13, color: '#1a1a1a' },
  card: { marginTop: 24, borderRadius: 18, backgroundColor: '#F3F4F7', paddingHorizontal: 16 },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 14, gap: 16 },
  rowDivider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#D8DAE0' },
  rowLabel: { fontFamily: FONTS.regular, fontSize: 15, color: '#6b6e78' },
  rowValue: { fontFamily: FONTS.semiBold, fontSize: 15, color: '#1a1a1a', flexShrink: 1, textAlign: 'right' },
  button: {
    marginTop: 32,
    height: 52,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  buttonLabel: { fontFamily: FONTS.bold, fontSize: 16, color: '#FFFFFF' },
  signOut: { alignSelf: 'center', marginTop: 28, paddingVertical: 8, paddingHorizontal: 16 },
  signOutLabel: { fontFamily: FONTS.semiBold, fontSize: 15, color: '#6b6e78' },
});
