import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { type Href, router, useFocusEffect } from 'expo-router';

import { useAuth } from '@/contexts/AuthContext';
import { photoSource } from '@/services/professional-service';
import {
  cancelRequest,
  listMyRequests,
  setRequestActive,
  type RequestStatus,
  type ServiceRequest,
} from '@/services/request-service';
import { BRAND_ACCENT, BRAND_GRADIENT, FONTS } from '@/theme/tokens';

const STATUS_LABEL: Record<RequestStatus, string> = {
  pending: 'Aguardando',
  accepted: 'Aceito',
  declined: 'Recusado',
  cancelled: 'Cancelado',
  completed: 'Concluído',
  expired: 'Expirado',
};

const STATUS_HINT: Partial<Record<RequestStatus, string>> = {
  pending: 'O profissional ainda não respondeu.',
  accepted: 'Pedido aceito. Combinem os detalhes pela conversa.',
  expired: 'O profissional não respondeu a tempo. Você pode fazer um novo pedido.',
};

function date(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
}

function RequestCard({
  item,
  token,
  busy,
  onCancel,
  onRemove,
}: {
  item: ServiceRequest;
  token: string | null;
  busy: boolean;
  onCancel: () => void;
  onRemove: () => void;
}) {
  const hint = item.status === 'declined' && item.decline_reason ? `Motivo: ${item.decline_reason}` : STATUS_HINT[item.status];
  const highlight = item.status === 'pending' || item.status === 'accepted';
  const closed = !highlight;
  return (
    <View style={styles.card}>
      <Pressable
        style={styles.head}
        onPress={() => router.push(`/profissional/${item.professional_id}` as Href)}
        accessibilityRole="button"
        accessibilityLabel={`Ver perfil de ${item.professional_name}`}>
        <Image source={photoSource(item.professional_photo_url, token)} style={styles.avatar} />
        <View style={styles.headText}>
          <Text style={styles.name} numberOfLines={1}>{item.professional_name}</Text>
          {item.professional_category ? <Text style={styles.category}>{item.professional_category}</Text> : null}
        </View>
        <View style={[styles.pill, highlight ? styles.pillHighlight : styles.pillClosed]}>
          <Text style={[styles.pillLabel, highlight ? styles.pillLabelHighlight : styles.pillLabelClosed]}>
            {STATUS_LABEL[item.status]}
          </Text>
        </View>
      </Pressable>

      <Text style={styles.meta}>
        {item.mode === 'online' ? 'Online' : 'Presencial'} · enviado em {date(item.created_at)}
      </Text>
      <Text style={styles.message} numberOfLines={3}>{item.message}</Text>
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}

      {item.status === 'accepted' ? (
        <Pressable
          style={styles.chat}
          onPress={() => router.push(`/conversa/${item.id}` as Href)}
          accessibilityRole="button">
          <LinearGradient
            colors={BRAND_GRADIENT}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          <Text style={styles.chatLabel}>Conversar</Text>
        </Pressable>
      ) : null}

      {item.status === 'pending' ? (
        <Pressable style={[styles.cancel, busy && styles.disabled]} onPress={onCancel} disabled={busy} accessibilityRole="button">
          <Text style={styles.cancelLabel}>Cancelar pedido</Text>
        </Pressable>
      ) : null}

      {closed ? (
        <Pressable style={[styles.remove, busy && styles.disabled]} onPress={onRemove} disabled={busy} accessibilityRole="button">
          <Text style={styles.removeLabel}>Remover da lista</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export default function AppointmentsScreen() {
  const { token } = useAuth();
  const [items, setItems] = useState<ServiceRequest[]>();
  const [failed, setFailed] = useState(false);
  const [busyId, setBusyId] = useState<number>();

  const load = useCallback(async () => {
    try {
      setItems(await listMyRequests());
      setFailed(false);
    } catch {
      setFailed(true);
    }
  }, []);

  // A resposta do profissional chega enquanto o app está aberto; recarrega ao voltar para a aba.
  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const cancel = async (id: number) => {
    setBusyId(id);
    try {
      await cancelRequest(id);
    } catch {
      Alert.alert('Não foi possível cancelar', 'O pedido pode ter mudado. A lista foi atualizada.');
    } finally {
      setBusyId(undefined);
      await load();
    }
  };

  const confirmCancel = (item: ServiceRequest) =>
    Alert.alert('Cancelar pedido?', `O pedido para ${item.professional_name} será cancelado.`, [
      { text: 'Voltar', style: 'cancel' },
      { text: 'Cancelar pedido', style: 'destructive', onPress: () => cancel(item.id) },
    ]);

  const remove = async (id: number) => {
    setBusyId(id);
    try {
      await setRequestActive(id, false);
    } catch {
      Alert.alert('Não foi possível remover', 'Tente novamente.');
    } finally {
      setBusyId(undefined);
      await load();
    }
  };

  const confirmRemove = (item: ServiceRequest) =>
    Alert.alert('Remover da lista?', 'O pedido deixa de aparecer aqui. O profissional continua com o registro dele.', [
      { text: 'Voltar', style: 'cancel' },
      { text: 'Remover', style: 'destructive', onPress: () => remove(item.id) },
    ]);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content} contentInsetAdjustmentBehavior="automatic">
      <Text style={styles.title}>Atendimentos</Text>

      {failed && items === undefined ? (
        <Text style={styles.empty}>Não foi possível carregar os seus pedidos.</Text>
      ) : items === undefined ? (
        <ActivityIndicator style={styles.loader} />
      ) : items.length === 0 ? (
        <View style={styles.emptyBox}>
          <Text style={styles.emptyTitle}>Nenhum pedido ainda</Text>
          <Text style={styles.empty}>Escolha um profissional e toque em &quot;Consultar profissional&quot;.</Text>
          <Pressable onPress={() => router.navigate('/(tabs)/profissionais')} accessibilityRole="button" style={styles.browse}>
            <Text style={styles.browseLabel}>Ver profissionais</Text>
          </Pressable>
        </View>
      ) : (
        items.map((item) => (
          <RequestCard key={item.id} item={item} token={token} busy={busyId === item.id} onCancel={() => confirmCancel(item)}
            onRemove={() => confirmRemove(item)}
          />
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#FFFFFF' },
  content: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 120 },
  title: { fontFamily: FONTS.extraBold, fontSize: 28, lineHeight: 34, color: '#1a1a1a', letterSpacing: -0.5, marginBottom: 4 },
  loader: { marginTop: 48 },
  emptyBox: { alignItems: 'center', marginTop: 48, paddingHorizontal: 20 },
  emptyTitle: { fontFamily: FONTS.bold, fontSize: 18, color: '#1a1a1a', marginBottom: 6 },
  empty: { fontFamily: FONTS.regular, fontSize: 15, lineHeight: 21, color: '#6b6e78', textAlign: 'center' },
  browse: { marginTop: 18, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 999, backgroundColor: '#FFF1EC' },
  browseLabel: { fontFamily: FONTS.bold, fontSize: 14, color: BRAND_ACCENT },
  card: { marginTop: 12, padding: 16, borderRadius: 18, backgroundColor: '#F3F4F7' },
  head: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#E4E6EC' },
  headText: { flex: 1 },
  name: { fontFamily: FONTS.bold, fontSize: 16, color: '#1a1a1a' },
  category: { fontFamily: FONTS.semiBold, fontSize: 13, color: BRAND_ACCENT, marginTop: 1 },
  pill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, backgroundColor: '#E4E6EC' },
  pillHighlight: { backgroundColor: '#FFF1EC' },
  pillLabel: { fontFamily: FONTS.semiBold, fontSize: 12, color: '#3a3d46' },
  pillLabelHighlight: { color: BRAND_ACCENT },
  pillClosed: { backgroundColor: '#FFFFFF' },
  pillLabelClosed: { color: '#6b6e78' },
  meta: { fontFamily: FONTS.regular, fontSize: 13, color: '#6b6e78', marginTop: 12 },
  message: { fontFamily: FONTS.regular, fontSize: 15, lineHeight: 21, color: '#1a1a1a', marginTop: 8 },
  hint: { fontFamily: FONTS.regular, fontSize: 13, lineHeight: 18, color: '#6b6e78', marginTop: 10 },
  chat: { height: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', marginTop: 16 },
  chatLabel: { fontFamily: FONTS.bold, fontSize: 15, color: '#FFFFFF' },
  cancel: { height: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF', marginTop: 16 },
  cancelLabel: { fontFamily: FONTS.bold, fontSize: 15, color: '#1a1a1a' },
  remove: { alignSelf: 'flex-start', marginTop: 16, paddingHorizontal: 12, paddingVertical: 5, borderRadius: 999, backgroundColor: BRAND_ACCENT },
  removeLabel: { fontFamily: FONTS.semiBold, fontSize: 12, color: '#FFFFFF' },
  disabled: { opacity: 0.5 },
});
