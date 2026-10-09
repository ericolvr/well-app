import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { type Href, router } from 'expo-router';

import { useAuth } from '@/contexts/AuthContext';
import {
  fetchCategories,
  listProfessionals,
  photoSource,
  type Category,
  type ProfessionalProfile,
} from '@/services/professional-service';
import { BRAND_ACCENT, BRAND_GRADIENT, FONTS } from '@/theme/tokens';

function modes(online: boolean, inPerson: boolean) {
  if (online && inPerson) return 'Online · Presencial';
  if (online) return 'Online';
  if (inPerson) return 'Presencial';
  return '';
}

function price(cents: number) {
  return `R$ ${(cents / 100).toFixed(2).replace('.', ',')}/h`;
}

function ProfessionalCard({ item, token }: { item: ProfessionalProfile; token: string | null }) {
  const place = [modes(item.online, item.in_person), item.in_person ? item.city : '']
    .filter(Boolean)
    .join(' · ');
  return (
    <Pressable
      style={styles.card}
      onPress={() => router.push(`/profissional/${item.id}` as Href)}
      accessibilityRole="button"
      accessibilityLabel={`Ver perfil de ${item.name}`}>
      <Image source={photoSource(item.photo_url, token)} style={styles.avatar} />
      <View style={styles.cardBody}>
        <Text style={styles.cardName} numberOfLines={1}>{item.name}</Text>
        {item.category ? <Text style={styles.cardCategory}>{item.category.name}</Text> : null}
        {item.headline ? <Text style={styles.cardHeadline} numberOfLines={2}>{item.headline}</Text> : null}
        <Text style={styles.cardMeta} numberOfLines={1}>{place}</Text>
        <View style={styles.cardFooter}>
          <Text style={styles.cardPrice}>{price(item.hourly_rate_cents)}</Text>
          {item.first_class_free ? (
            <View style={styles.badge}>
              <Text style={styles.badgeLabel}>1ª aula grátis</Text>
            </View>
          ) : null}
        </View>
      </View>
    </Pressable>
  );
}

export default function ProfessionalsScreen() {
  const { token } = useAuth();
  const [search, setSearch] = useState('');
  const [categoryId, setCategoryId] = useState(0);
  const [categories, setCategories] = useState<Category[]>([]);
  // O resultado guarda a consulta que o gerou; "carregando" é quando ele não é a consulta atual.
  const [result, setResult] = useState<{ key: string; items: ProfessionalProfile[]; failed: boolean }>();

  const query = search.trim();
  const key = `${query}|${categoryId}`;

  useEffect(() => {
    let cancelled = false;
    fetchCategories()
      .then((list) => !cancelled && setCategories(list))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(() => {
      listProfessionals({ q: query, categoryId })
        .then((items) => !cancelled && setResult({ key, items, failed: false }))
        .catch(() => !cancelled && setResult({ key, items: [], failed: true }));
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [key, query, categoryId]);

  const loading = result?.key !== key;
  const items = result?.items ?? [];
  const filtered = query !== '' || categoryId !== 0;

  const clear = () => {
    setSearch('');
    setCategoryId(0);
  };

  return (
    <ScrollView
      style={styles.screen}
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag">
      <Text style={styles.title}>Profissionais</Text>
      <TextInput
        value={search}
        onChangeText={setSearch}
        placeholder="Buscar por nome ou especialidade"
        placeholderTextColor="#9a9da6"
        style={styles.search}
        returnKeyType="search"
        autoCorrect={false}
        clearButtonMode="while-editing"
      />

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
        {[{ id: 0, name: 'Todas' }, ...categories].map((c) => {
          const active = categoryId === c.id;
          return (
            <Pressable
              key={c.id}
              onPress={() => setCategoryId(c.id)}
              style={styles.chip}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}>
              {active && (
                <LinearGradient
                  colors={BRAND_GRADIENT}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={StyleSheet.absoluteFill}
                />
              )}
              <Text style={[styles.chipLabel, active && styles.chipLabelActive]}>{c.name}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {loading && items.length === 0 ? (
        <ActivityIndicator style={styles.loader} />
      ) : result?.failed ? (
        <Text style={styles.empty}>Não foi possível carregar os profissionais. Tente novamente.</Text>
      ) : items.length === 0 ? (
        <View style={styles.emptyBox}>
          <Text style={styles.empty}>Nenhum profissional encontrado.</Text>
          {filtered ? (
            <Pressable onPress={clear} hitSlop={12} accessibilityRole="button">
              <Text style={styles.clear}>Limpar filtros</Text>
            </Pressable>
          ) : null}
        </View>
      ) : (
        <View style={[styles.list, loading && styles.listLoading]}>
          {items.map((item) => (
            <ProfessionalCard key={item.id} item={item} token={token} />
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#FFFFFF' },
  content: { paddingTop: 16, paddingBottom: 120 },
  title: {
    fontFamily: FONTS.extraBold,
    fontSize: 30,
    lineHeight: 36,
    color: '#1a1a1a',
    letterSpacing: -0.5,
    paddingHorizontal: 20,
  },
  search: {
    marginHorizontal: 20,
    marginTop: 16,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#F3F4F7',
    paddingHorizontal: 16,
    fontFamily: FONTS.regular,
    fontSize: 16,
    color: '#1a1a1a',
  },
  chips: { paddingHorizontal: 20, paddingVertical: 14, gap: 8 },
  chip: {
    paddingHorizontal: 14,
    height: 36,
    borderRadius: 999,
    backgroundColor: '#F3F4F7',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  chipLabel: { fontFamily: FONTS.semiBold, fontSize: 14, color: '#1a1a1a' },
  chipLabelActive: { color: '#FFFFFF' },
  loader: { marginTop: 40 },
  list: { paddingHorizontal: 20, gap: 14, marginTop: 4 },
  listLoading: { opacity: 0.5 },
  card: {
    flexDirection: 'row',
    gap: 14,
    padding: 14,
    borderRadius: 18,
    backgroundColor: '#F3F4F7',
  },
  avatar: { width: 76, height: 76, borderRadius: 38, backgroundColor: '#E4E6EC' },
  cardBody: { flex: 1, gap: 2 },
  cardName: { fontFamily: FONTS.bold, fontSize: 17, color: '#1a1a1a' },
  cardCategory: { fontFamily: FONTS.semiBold, fontSize: 13, color: BRAND_ACCENT },
  cardHeadline: { fontFamily: FONTS.regular, fontSize: 14, lineHeight: 19, color: '#1a1a1a', marginTop: 4 },
  cardMeta: { fontFamily: FONTS.regular, fontSize: 13, color: '#6b6e78', marginTop: 4 },
  cardFooter: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 },
  cardPrice: { fontFamily: FONTS.extraBold, fontSize: 16, color: '#1a1a1a' },
  badge: { paddingHorizontal: 9, paddingVertical: 3, borderRadius: 999, backgroundColor: '#FFF1EC' },
  badgeLabel: { fontFamily: FONTS.bold, fontSize: 12, color: BRAND_ACCENT },
  emptyBox: { alignItems: 'center', gap: 12, marginTop: 40 },
  empty: { fontFamily: FONTS.regular, fontSize: 15, color: '#6b6e78', textAlign: 'center', paddingHorizontal: 20 },
  clear: { fontFamily: FONTS.semiBold, fontSize: 15, color: BRAND_ACCENT },
});
