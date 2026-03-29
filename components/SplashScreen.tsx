import { View, Text, Image, StyleSheet } from 'react-native';
import { useThemeColors } from '@/hooks/use-theme-colors';
import { ThemeColors } from '@/constants/theme';

const APP_ICON = require('@/assets/images/icon.png');

export function SplashScreen() {
  const colors = useThemeColors();
  const styles = makeStyles(colors);

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Image source={APP_ICON} style={styles.icon} />
        <Text style={styles.appName}>MY TO-DO LIST</Text>
        <Text style={styles.tagline}>Get things done.</Text>
      </View>

      <View style={styles.dotsRow}>
        <View style={[styles.dot, { opacity: 0.3 }]} />
        <View style={[styles.dot, { opacity: 0.85 }]} />
        <View style={[styles.dot, { opacity: 0.3 }]} />
      </View>
    </View>
  );
}

function makeStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
      alignItems: 'center',
      justifyContent: 'center',
    },
    content: {
      alignItems: 'center',
      marginTop: -80,
    },
    icon: {
      width: 120,
      height: 120,
      marginBottom: 36,
    },
    appName: {
      fontSize: 26,
      fontWeight: '700',
      letterSpacing: 2.6,
      color: colors.text,
      marginBottom: 12,
    },
    tagline: {
      fontSize: 15,
      letterSpacing: 0.5,
      color: colors.muted,
    },
    dotsRow: {
      position: 'absolute',
      bottom: 64,
      flexDirection: 'row',
      gap: 9,
    },
    dot: {
      width: 7,
      height: 7,
      borderRadius: 3.5,
      backgroundColor: colors.text,
    },
  });
}
