import { TextStyle } from 'react-native';

type FontWeight = TextStyle['fontWeight'];

export const Theme = {
  colors: {
    background: '#0D0D1A',
    surface: '#1A1A2E',
    elevated: '#242436',
    lime: '#C8FF00',
    purple: '#7C3AED',
    textPrimary: '#FFFFFF',
    textSecondary: '#888888',
    textMuted: '#555566',
    border: '#2A2A45',
  },
  typography: {
    logo: { weight: '900' as FontWeight, size: 20 },
    greeting: { weight: '800' as FontWeight, size: 28 },
    sectionTitle: { weight: '700' as FontWeight, size: 13 },
    viewAll: { weight: '600' as FontWeight, size: 11 },
    cardTitle: { weight: '700' as FontWeight, size: 11 },
    body: { weight: '400' as FontWeight, size: 12 },
  }
};
