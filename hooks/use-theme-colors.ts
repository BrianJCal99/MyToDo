import { useColorScheme } from 'react-native';
import { lightColors, darkColors, ThemeColors } from '@/constants/theme';

export function useThemeColors(): ThemeColors {
  const scheme = useColorScheme();
  return scheme === 'dark' ? darkColors : lightColors;
}
