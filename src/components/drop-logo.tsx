import { useEffect } from 'react';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Defs, LinearGradient, Path, Stop } from 'react-native-svg';

// Gota vazada da marca. Cores e offsets do gradiente são a paleta oficial do app.
export const BRAND_GRADIENT_STOPS = [
  { offset: '0%', color: '#3ddc84' },
  { offset: '26%', color: '#4a9bf0' },
  { offset: '52%', color: '#ffd23f' },
  { offset: '70%', color: '#ff8a3d' },
  { offset: '88%', color: '#ff5577' },
  { offset: '100%', color: '#ff2f8f' },
] as const;

const DROP_PATH =
  'M150 10 C150 10 260 150 260 230 C260 291 211 340 150 340 C89 340 40 291 40 230 C40 150 150 10 150 10 Z';

type Props = { width?: number; floating?: boolean };

export function DropLogo({ width = 220, floating = true }: Props) {
  const progress = useSharedValue(0);

  useEffect(() => {
    if (!floating) return;
    // Flutuação suave: 4s por ciclo (2s subindo + 2s descendo).
    progress.value = withRepeat(withTiming(1, { duration: 2000, easing: Easing.inOut(Easing.ease) }), -1, true);
  }, [floating, progress]);

  const style = useAnimatedStyle(() => ({
    transform: [{ translateY: -6 * progress.value }, { scale: 1 + 0.02 * progress.value }],
  }));

  return (
    <Animated.View style={style}>
      <Svg width={width} height={(width * 360) / 300} viewBox="0 0 300 360">
        <Defs>
          <LinearGradient id="dropGrad" x1="60" y1="20" x2="240" y2="340" gradientUnits="userSpaceOnUse">
            {BRAND_GRADIENT_STOPS.map((stop) => (
              <Stop key={stop.offset} offset={stop.offset} stopColor={stop.color} />
            ))}
          </LinearGradient>
        </Defs>
        <Path d={DROP_PATH} fill="none" stroke="url(#dropGrad)" strokeWidth={10} strokeLinejoin="round" />
      </Svg>
    </Animated.View>
  );
}
