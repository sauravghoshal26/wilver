export const colors = {
  ink: '#251A3D',
  inkMuted: '#716A83',
  inkSoft: '#A49DB3',
  cream: '#FFF9FC',
  canvas: '#F8F7FF',
  white: '#FFFFFF',
  green: '#6C4DFF',
  greenDark: '#4932C8',
  greenBright: '#8B73FF',
  greenSoft: '#EEE9FF',
  mint: '#BDF7EF',
  coral: '#FF5C7A',
  coralDark: '#D93D61',
  coralSoft: '#FFE7ED',
  yellow: '#F4B928',
  yellowSoft: '#FFF3C7',
  blue: '#36A8F5',
  blueSoft: '#E2F4FF',
  lilac: '#8B5CF6',
  lilacSoft: '#F0E9FF',
  line: '#ECE9F5',
  lineStrong: '#DCD6EA',
  danger: '#E33D59',
  dangerSoft: '#FFE7EC',
  success: '#16A981',
  aqua: '#2ED6C5',
  aquaSoft: '#DDFBF7',
  overlay: 'rgba(37, 26, 61, 0.48)',
} as const;

export const gradients = {
  brand: ['#7758FF', '#A855F7', '#FF5C7A'] as const,
  sunset: ['#FF5C7A', '#FF8A65', '#FFCC4D'] as const,
  hero: ['#FFF0F5', '#F1EDFF', '#E4FCF8'] as const,
  night: ['rgba(119,88,255,0.03)', 'rgba(37,26,61,0.92)'] as const,
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 40,
} as const;

export const radii = {
  xs: 8,
  sm: 12,
  md: 18,
  lg: 26,
  xl: 34,
  pill: 999,
} as const;

export const shadows = {
  card: {
    shadowColor: '#5B43A8',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 3,
  },
  floating: {
    shadowColor: '#7758FF',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.18,
    shadowRadius: 22,
    elevation: 8,
  },
} as const;

export const typography = {
  display: { fontSize: 38, lineHeight: 42, fontWeight: '800' as const, letterSpacing: -1.4 },
  title: { fontSize: 29, lineHeight: 34, fontWeight: '800' as const, letterSpacing: -0.9 },
  section: { fontSize: 20, lineHeight: 25, fontWeight: '800' as const, letterSpacing: -0.35 },
  body: { fontSize: 15, lineHeight: 22 },
  label: { fontSize: 12, lineHeight: 16, fontWeight: '800' as const },
} as const;
