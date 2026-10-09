import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { type Href, router, useFocusEffect } from 'expo-router';

import {
  acceptRequest,
  completeRequest,
  declineRequest,
  listReceivedRequests,
  type RequestStatus,
  type ServiceRequest,
} from '@/services/request-service';
import { BRAND_ACCENT, BRAND_GRADIENT, FONTS } from '@/theme/tokens';

type Filter = 'pending' | 'accepted' | 'all';

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all', label: 'Todas' },
  { key: 'pending', label: 'Novas' },
  { key: 'accepted', label: 'Aceitas' },
];

const DAY_LABEL: Record<string, string> = {
  mon: 'Seg', tue: 'Ter', wed: 'Qua', thu: 'Qui', fri: 'Sex', sat: 'Sáb', sun: 'Dom',
};
const PERIOD_LABEL: Record<string, string> = { morning: 'manhã', afternoon: 'tarde', evening: 'noite' };

const STATUS_LABEL: Record<RequestStatus, string> = {
  pending: 'Nova',
  accepted: 'Aceita',
  declined: 'Recusada',
  cancelled: 'Cancelada',
  completed: 'Concluída',
  expired: 'Expirada',
};

function when(r: ServiceRequest) {
  const days = r.preferred_days.map((d) => DAY_LABEL[d] ?? d).join(', ');
  const period = r.preferred_period ? PERIOD_LABEL[r.preferred_period] : '';
  if (days && period) return `${days} · ${period}`;
  return days || period || 'Sem preferência de horário';
}

function ago(iso: string) {
  const minutes = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (minutes < 60) return `há ${Math.max(minutes, 1)} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `há ${hours} h`;
  const days = Math.round(hours / 24);
  return days === 1 ? 'há 1 dia' : `há ${days} dias`;
}

function RequestCard({
  item,
  busy,
  onAccept,
  onDecline,
  onComplete,
}: {
  item: ServiceRequest;
  busy: boolean;
  onAccept: () => void;
  onDecline: () => void;
  onComplete: () => void;
}) {
  return (
    <View style={styles.card}>
      <View style={styles.cardHead}>
        <Text style={styles.cardName} numberOfLines={1}>{item.client_name}</Text>
        <View style={[styles.pill, item.status === 'pending' && styles.pillNew]}>
          <Text style={[styles.pillLabel, item.status === 'pending' && styles.pillLabelNew]}>
            {STATUS_LABEL[item.status]}
          </Text>
        </View>
      </View>
      <Text style={styles.cardMeta}>
        {item.mode === 'online' ? 'Online' : 'Presencial'} · {ago(item.created_at)}
      </Text>

      <Text style={styles.message}>{item.message}</Text>

      <Text style={styles.when}>{when(item)}</Text>
      {item.first_class_free ? (
        <View style={styles.badge}>
          <Text style={styles.badgeLabel}>1ª aula grátis</Text>
        </View>
      ) : null}

      {item.status === 'pending' ? (
        <View style={styles.actions}>
          <Pressable style={[styles.decline, busy && styles.disabled]} onPress={onDecline} disabled={busy} accessibilityRole="button">
            <Text style={styles.declineLabel}>Recusar</Text>
          </Pressable>
          <Pressable style={[styles.accept, busy && styles.disabled]} onPress={onAccept} disabled={busy} accessibilityRole="button">
            <LinearGradient
              colors={BRAND_GRADIENT}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            <Text style={styles.acceptLabel}>Aceitar</Text>
          </Pressable>
        </View>
      ) : null}

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
          <Text style={styles.acceptLabel}>Conversar</Text>
        </Pressable>
      ) : null}

      {item.status === 'accepted' ? (
        <Pressable style={[styles.complete, busy && styles.disabled]} onPress={onComplete} disabled={busy} accessibilityRole="button">
          <Text style={styles.completeLabel}>Marcar como concluída</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export default function RequestsScreen() {
  const [filter, setFilter] = useState<Filter>('all');
  const [items, setItems] = useState<ServiceRequest[]>();
  const [failed, setFailed] = useState(false);
  const [busyId, setBusyId] = useState<number>();

  const load = useCallback(async (which: Filter) => {
    try {
      const list = await listReceivedRequests(which === 'all' ? undefined : which);
      setItems(list);
      setFailed(false);
    } catch {
      setFailed(true);
    }
  }, []);

  // Pedidos novos chegam enquanto o app está aberto; recarrega sempre que a aba ou o filtro mudam.
  useFocusEffect(
    useCallback(() => {
      void load(filter);
    }, [filter, load]),
  );

  const changeFilter = (next: Filter) => {
    if (next === filter) return;
    setItems(undefined);
    setFilter(next);
  };

  const run = async (id: number, action: () => Promise<ServiceRequest>) => {
    setBusyId(id);
    try {
      await action();
    } catch {
      Alert.alert('Não foi possível concluir', 'O pedido pode ter mudado. A lista foi atualizada.');
    } finally {
      setBusyId(undefined);
      await load(filter);
    }
  };

  const confirmDecline = (item: ServiceRequest) =>
    Alert.alert('Recusar pedido?', `${item.client_name} será avisado de que você não vai atender.`, [
      { text: 'Voltar', style: 'cancel' },
      { text: 'Recusar', style: 'destructive', onPress: () => run(item.id, () => declineRequest(item.id)) },
    ]);

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      contentInsetAdjustmentBehavior="automatic">
      <Text style={styles.title}>Solicitações</Text>

      <View style={styles.chips}>
        {FILTERS.map((f) => {
          const selected = f.key === filter;
          return (
            <Pressable
              key={f.key}
              onPress={() => changeFilter(f.key)}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              style={[styles.chip, selected && styles.chipSelected]}>
              <Text style={[styles.chipLabel, selected && styles.chipLabelSelected]}>{f.label}</Text>
            </Pressable>
          );
        })}
      </View>

      {failed && items === undefined ? (
        <Text style={styles.empty}>Não foi possível carregar os pedidos.</Text>
      ) : items === undefined ? (
        <ActivityIndicator style={styles.loader} />
      ) : items.length === 0 ? (
        <Text style={styles.empty}>
          {filter === 'pending' ? 'Nenhum pedido novo por enquanto.' : 'Nada por aqui ainda.'}
        </Text>
      ) : (
        items.map((item) => (
          <RequestCard
            key={item.id}
            item={item}
            busy={busyId === item.id}
            onAccept={() => run(item.id, () => acceptRequest(item.id))}
            onDecline={() => confirmDecline(item)}
            onComplete={() => run(item.id, () => completeRequest(item.id))}
          />
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#FFFFFF' },
  content: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 120 },
  title: { fontFamily: FONTS.extraBold, fontSize: 28, lineHeight: 34, color: '#1a1a1a', letterSpacing: -0.5 },
  chips: { flexDirection: 'row', gap: 8, marginTop: 16, marginBottom: 8 },
  chip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 999, backgroundColor: '#F3F4F7' },
  chipSelected: { backgroundColor: '#FFF1EC', borderWidth: 1, borderColor: BRAND_ACCENT, paddingHorizontal: 15, paddingVertical: 9 },
  chipLabel: { fontFamily: FONTS.semiBold, fontSize: 14, color: '#1a1a1a' },
  chipLabelSelected: { color: BRAND_ACCENT },
  loader: { marginTop: 48 },
  empty: { fontFamily: FONTS.regular, fontSize: 15, color: '#6b6e78', textAlign: 'center', marginTop: 48 },
  card: { marginTop: 12, padding: 16, borderRadius: 18, backgroundColor: '#F3F4F7' },
  cardHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  cardName: { flex: 1, fontFamily: FONTS.bold, fontSize: 17, color: '#1a1a1a' },
  cardMeta: { fontFamily: FONTS.regular, fontSize: 13, color: '#6b6e78', marginTop: 2 },
  pill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, backgroundColor: '#E4E6EC' },
  pillNew: { backgroundColor: '#FFF1EC' },
  pillLabel: { fontFamily: FONTS.semiBold, fontSize: 12, color: '#3a3d46' },
  pillLabelNew: { color: BRAND_ACCENT },
  message: { fontFamily: FONTS.regular, fontSize: 15, lineHeight: 21, color: '#1a1a1a', marginTop: 12 },
  when: { fontFamily: FONTS.semiBold, fontSize: 14, color: '#3a3d46', marginTop: 12 },
  badge: {
    alignSelf: 'flex-start',
    marginTop: 10,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: '#FFF1EC',
  },
  badgeLabel: { fontFamily: FONTS.bold, fontSize: 13, color: BRAND_ACCENT },
  actions: { flexDirection: 'row', gap: 10, marginTop: 16 },
  decline: { flex: 1, height: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF' },
  declineLabel: { fontFamily: FONTS.bold, fontSize: 15, color: '#1a1a1a' },
  accept: { flex: 1, height: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  acceptLabel: { fontFamily: FONTS.bold, fontSize: 15, color: '#FFFFFF' },
  chat: { height: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', marginTop: 16 },
  complete: { height: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF', marginTop: 10 },
  completeLabel: { fontFamily: FONTS.bold, fontSize: 15, color: '#1a1a1a' },
  disabled: { opacity: 0.5 },
});
