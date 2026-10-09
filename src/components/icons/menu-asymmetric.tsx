import Svg, { Path } from 'react-native-svg';

// Hamburger customizado: a de cima é meia linha à direita, a do meio é
// inteira, e a de baixo é meia linha à esquerda.
export function MenuAsymmetric({
  size = 24,
  color = 'currentColor',
  strokeWidth = 2.3,
}: {
  size?: number;
  color?: string;
  strokeWidth?: number;
}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M12 5h11" />
      <Path d="M1 12h22" />
      <Path d="M1 19h11" />
    </Svg>
  );
}
