import { Linking, StyleSheet, Text, View } from 'react-native';
import { WallpaperData } from '@/services/wallpaperService';
import { useThemeColors } from '@/hooks/use-theme-colors';
import { ThemeColors } from '@/constants/theme';

interface Props {
  wallpaper: WallpaperData;
}

/**
 * Sidebar attribution block required by the Unsplash API guidelines.
 * Tapping the photographer name or "Unsplash" opens their profile page.
 */
export default function WallpaperCredit({ wallpaper }: Props) {
  const colors = useThemeColors();
  const styles = makeStyles(colors);

  function openProfile() {
    Linking.openURL(wallpaper.photographerProfileUrl).catch(() => {
      // Ignore — URL couldn't be opened
    });
  }

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Today's wallpaper</Text>
      <Text style={styles.credit}>
        {'Photo by '}
        <Text style={styles.link} onPress={openProfile}>
          {wallpaper.photographerName}
        </Text>
        {' on '}
        <Text style={styles.link} onPress={openProfile}>
          Unsplash
        </Text>
      </Text>
    </View>
  );
}

function makeStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: {
      marginTop: 'auto',
      paddingTop: 16,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.border,
    },
    label: {
      fontSize: 10,
      fontWeight: '600',
      textTransform: 'uppercase',
      letterSpacing: 0.8,
      color: colors.muted,
      marginBottom: 4,
    },
    credit: {
      fontSize: 12,
      color: colors.muted,
      lineHeight: 18,
    },
    link: {
      color: colors.yellow,
      fontWeight: '600',
    },
  });
}
