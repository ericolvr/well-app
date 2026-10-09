import { LinearGradient } from 'expo-linear-gradient';
import type { LucideIcon } from 'lucide-react-native';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';

import { BRAND_ACCENT, BRAND_GRADIENT, FONTS } from '@/theme/tokens';

type Props = {
  Icon?: LucideIcon; // opcional: sem ícone, o título fica só com o nome e a %
  label: string;
  colors?: readonly [string, string]; // gradiente próprio da barra; sem ele, usa o da marca
  value: number; // 0..1
  onChange: (value: number) => void;
};

const THUMB = 26;
const TOUCH_HEIGHT = 40;

const clamp = (n: number) => Math.min(1, Math.max(0, n));

// Título (ícone, nome e %) e, embaixo, a barra arrastável com o gradiente da marca.
export function MoodSlider({ Icon, label, colors, value, onChange }: Props) {
  const tone = colors ? colors[1] : BRAND_ACCENT;
  const [width, setWidth] = useState(0);
  const update = (x: number) => {
    if (width > 0) onChange(clamp(x / width));
  };

  const pan = Gesture.Pan()
    .runOnJS(true)
    .minDistance(0)
    .onBegin((e) => update(e.x))
    .onUpdate((e) => update(e.x));

  return (
    <View style={styles.block}>
      <View style={styles.header}>
        {Icon && (
          <View style={styles.iconTile}>
            <Icon size={22} color={tone} strokeWidth={2} />
          </View>
        )}
        <Text style={styles.label}>{label}</Text>
        <Text style={[styles.percent, { color: tone }]}>{Math.round(value * 100)}%</Text>
      </View>

      <GestureDetector gesture={pan}>
        <View
          style={styles.touch}
          onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
          accessibilityRole="adjustable"
          accessibilityLabel={label}
          accessibilityValue={{ min: 0, max: 100, now: Math.round(value * 100) }}>
          <View style={styles.track} pointerEvents="none">
            <View style={[styles.fill, { width: width * value }]}>
              <LinearGradient
                colors={colors ?? BRAND_GRADIENT}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={{ width, height: '100%' }}
              />
            </View>
          </View>
          <View
            pointerEvents="none"
            style={[styles.thumb, { borderColor: tone, left: Math.min(width, Math.max(0, width * value)) - THUMB / 2 }]}
          />
        </View>
      </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  block: { gap: 4 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  iconTile: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#FFF1EC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: { flex: 1, fontFamily: FONTS.bold, fontSize: 16, color: '#1a1a1a' },
  percent: { fontFamily: FONTS.bold, fontSize: 14, color: BRAND_ACCENT },
  touch: { height: TOUCH_HEIGHT, justifyContent: 'center' },
  track: { height: 7, borderRadius: 3.5, backgroundColor: '#EDEEF2', overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 3.5, overflow: 'hidden' },
  thumb: {
    position: 'absolute',
    top: (TOUCH_HEIGHT - THUMB) / 2,
    width: THUMB,
    height: THUMB,
    borderRadius: THUMB / 2,
    backgroundColor: '#FFFFFF',
    borderWidth: 3,
    borderColor: BRAND_ACCENT,
    shadowColor: '#000',
    shadowOpacity: 0.14,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
  },
});
