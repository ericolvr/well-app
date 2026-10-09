export const RADII = {
  xs: 6,
  sm: 10,
  md: 12,
  lg: 14,
  xl: 16,
  '2xl': 18,
  '3xl': 22,
  '4xl': 26,
  pill: 9999,
} as const;

export const FONTS = {
  extraLight: 'Manrope_200ExtraLight',
  light: 'Manrope_300Light',
  regular: 'Manrope_400Regular',
  medium: 'Manrope_500Medium',
  semiBold: 'Manrope_600SemiBold',
  bold: 'Manrope_700Bold',
  extraBold: 'Manrope_800ExtraBold',
} as const;

// Cor de destaque da marca: rosa da parte inferior da gota, puxado para o vermelho.
export const BRAND_ACCENT = '#ff3d5a';

// Gradiente das barras e chips: tons da parte inferior da gota (laranja -> vermelho -> rosa).
export const BRAND_GRADIENT = ['#ff8a3d', '#ff3d5a', '#ff2f8f'] as const;
