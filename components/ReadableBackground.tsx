import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ImageBackground,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from 'react-native';
import { useThemeColors } from '@/hooks/use-theme-colors';

interface Props {
  /** Remote URI for the background photo. Omit to render a plain background. */
  imageUri?: string;
  /**
   * expo-blur intensity, 0–100.
   * Kept low (default 14) so the photo remains recognisable while softening
   * sharp edges that would compete with foreground text.
   */
  blurIntensity?: number;
  /**
   * Opacity of the solid dark fallback overlay, 0–1.
   * This layer is always rendered — it guarantees a minimum contrast floor
   * even if BlurView or LinearGradient fail to load.
   */
  overlayOpacity?: number;
  /**
   * Toggle the LinearGradient layer.
   * The gradient darkens the top (header) and bottom (list) regions more
   * than the centre, mimicking a natural vignette.
   */
  gradientEnabled?: boolean;
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
}

export default function ReadableBackground({
  imageUri,
  blurIntensity = 14,
  overlayOpacity = 0.38,
  gradientEnabled = true,
  style,
  children,
}: Props) {
  const colors = useThemeColors();
  const hasImage = Boolean(imageUri);

  return (
    <ImageBackground
      source={hasImage ? { uri: imageUri } : undefined}
      // Fallback: theme background color when no photo is available.
      // This covers API errors, first launch before the fetch completes,
      // and any offline scenario.
      style={[styles.root, { backgroundColor: colors.background }, style]}
      resizeMode="cover"
      fadeDuration={400}
    >
      {hasImage && (
        <>
          {/*
           * Layer 1 — Blur
           * Softens fine detail in the photo (grass, leaves, bark) so text
           * doesn't compete visually. tint="dark" adds a slight dark cast on
           * top of the blur, reducing effective brightness of bright skies.
           */}
          <BlurView
            style={StyleSheet.absoluteFill}
            intensity={blurIntensity}
            tint="dark"
          />

          {/*
           * Layer 2 — Gradient vignette
           * Dark at the very top (greeting + nav) and the lower third (list),
           * nearly transparent in the middle so the photo is still visible.
           */}
          {gradientEnabled && (
            <LinearGradient
              style={StyleSheet.absoluteFill}
              colors={[
                'rgba(0,0,0,0.72)',
                'rgba(0,0,0,0.08)',
                'rgba(0,0,0,0.08)',
                'rgba(0,0,0,0.60)',
              ]}
              locations={[0, 0.30, 0.65, 1]}
            />
          )}

          {/*
           * Layer 3 — Flat dark overlay
           * Only rendered when a photo is present. Without a photo the theme
           * background is already the correct color and needs no tinting.
           */}
          <View
            style={[
              StyleSheet.absoluteFill,
              { backgroundColor: `rgba(0,0,0,${overlayOpacity})` },
            ]}
            pointerEvents="none"
          />
        </>
      )}

      {children}
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});
