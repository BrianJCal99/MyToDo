import { Linking, StyleSheet, Text, View } from 'react-native';
import { WallpaperData } from '@/services/wallpaperService';

interface Props {
  wallpaper: WallpaperData;
}

/**
 * Sidebar attribution block required by the Unsplash API guidelines.
 * Tapping the photographer name or "Unsplash" opens their profile page.
 */
export default function WallpaperCredit({ wallpaper }: Props) {
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

const styles = StyleSheet.create({
  container: {
    marginTop: 'auto',
    paddingTop: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.15)',
  },
  label: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    color: 'rgba(255,255,255,0.45)',
    marginBottom: 4,
  },
  credit: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.65)',
    lineHeight: 18,
  },
  link: {
    color: '#FFD600',
    fontWeight: '600',
  },
});
