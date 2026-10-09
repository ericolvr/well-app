import { router } from 'expo-router';
import { Drawer } from 'expo-router/drawer';
import { DrawerContentScrollView, DrawerToggleButton, type DrawerContentComponentProps } from 'expo-router/drawer';
import { CalendarDays, Home, LogOut, Users, type LucideIcon } from 'lucide-react-native';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { DropLogo } from '@/components/drop-logo';
import { useAuth } from '@/contexts/AuthContext';
import { BRAND_ACCENT, FONTS } from '@/theme/tokens';

// Área do cliente: o menu lateral no lugar da barra de abas, que não comporta mais itens.
const ITEMS: { route: string; label: string; Icon: LucideIcon }[] = [
  { route: 'index', label: 'Início', Icon: Home },
  { route: 'profissionais', label: 'Profissionais', Icon: Users },
  { route: 'atendimentos', label: 'Atendimentos', Icon: CalendarDays },
];

function DrawerContent(props: DrawerContentComponentProps) {
  const { signOut } = useAuth();
  const active = props.state.routes[props.state.index].name;

  const handleSignOut = async () => {
    await signOut();
    router.replace('/login');
  };

  return (
    <DrawerContentScrollView {...props} contentContainerStyle={styles.content}>
      <View style={styles.brand}>
        <DropLogo width={34} floating={false} />
        <Text style={styles.brandName}>Well</Text>
      </View>
      <View style={styles.divider} />

      {ITEMS.map(({ route, label, Icon }) => {
        const selected = active === route;
        return (
          <Pressable
            key={route}
            style={[styles.item, selected && styles.itemSelected]}
            onPress={() => props.navigation.navigate(route)}
            accessibilityRole="button"
            accessibilityState={{ selected }}>
            <Icon size={21} color={selected ? BRAND_ACCENT : '#1a1a1a'} strokeWidth={2} />
            <Text style={[styles.itemLabel, selected && styles.itemLabelSelected]}>{label}</Text>
          </Pressable>
        );
      })}

      <View style={styles.spacer} />

      <View style={styles.divider} />
      <Pressable style={styles.item} onPress={handleSignOut} accessibilityRole="button">
        <LogOut size={21} color="#1a1a1a" strokeWidth={2} />
        <Text style={styles.itemLabel}>Sair</Text>
      </Pressable>
    </DrawerContentScrollView>
  );
}

export default function TabsLayout() {
  return (
    <Drawer
      drawerContent={(props) => <DrawerContent {...props} />}
      screenOptions={{
        drawerType: 'front',
        drawerStyle: { width: 280, backgroundColor: '#FFFFFF' },
        overlayColor: 'rgba(20,20,24,0.35)',
        headerTitle: '',
        headerShadowVisible: false,
        headerStyle: { backgroundColor: '#FFFFFF' },
        headerLeft: () => <DrawerToggleButton tintColor="#1a1a1a" />,
      }}>
      <Drawer.Screen name="index" options={{ headerShown: false }} />
      <Drawer.Screen name="profissionais" />
      <Drawer.Screen name="atendimentos" />
    </Drawer>
  );
}

const styles = StyleSheet.create({
  content: { flexGrow: 1, paddingTop: 24, paddingBottom: 28 },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 12, marginHorizontal: 20, marginBottom: 20 },
  brandName: { fontFamily: FONTS.extraBold, fontSize: 22, color: '#1a1a1a', letterSpacing: -0.4 },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: '#E4E6EC', marginHorizontal: 16, marginBottom: 14 },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 14,
    marginHorizontal: 16,
    marginBottom: 4,
  },
  itemSelected: { backgroundColor: '#FFF1EC' },
  itemLabel: { fontFamily: FONTS.semiBold, fontSize: 15, color: '#1a1a1a' },
  itemLabelSelected: { fontFamily: FONTS.bold, color: BRAND_ACCENT },
  spacer: { flex: 1 },
});
