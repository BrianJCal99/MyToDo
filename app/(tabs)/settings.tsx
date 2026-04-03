import { useEffect, useState } from 'react';
import {
  AppState,
  AppStateStatus,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Notifications from 'expo-notifications';
import { ThemeColors } from '@/constants/theme';
import { useThemeColors } from '@/hooks/use-theme-colors';
import LniIcon from '@/components/LniIcon';
import { getRefreshesRemaining, MAX_MANUAL_REFRESHES, refreshWallpaper } from '@/services/wallpaperService';

type PermissionStatus = 'granted' | 'denied' | 'undetermined';

async function fetchPermissionStatus(): Promise<PermissionStatus> {
  const { status } = await Notifications.getPermissionsAsync();
  return status as PermissionStatus;
}

export default function SettingsScreen() {
  const router = useRouter();
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const styles = makeStyles(colors, insets);

  const [permissionStatus, setPermissionStatus] = useState<PermissionStatus>('undetermined');

  // ── Wallpaper ──────────────────────────────────────────────────────────────
  const [refreshesRemaining, setRefreshesRemaining] = useState(MAX_MANUAL_REFRESHES);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshError, setRefreshError] = useState<string | null>(null);
  const [refreshSuccess, setRefreshSuccess] = useState(false);

  async function loadQuota() {
    const remaining = await getRefreshesRemaining();
    setRefreshesRemaining(remaining);
  }

  async function handleRefreshWallpaper() {
    if (isRefreshing || refreshesRemaining <= 0) return;
    setIsRefreshing(true);
    setRefreshError(null);
    setRefreshSuccess(false);
    try {
      const { remaining } = await refreshWallpaper();
      setRefreshesRemaining(remaining);
      setRefreshSuccess(true);
    } catch {
      setRefreshError('Could not fetch a new wallpaper. Check your connection.');
    } finally {
      setIsRefreshing(false);
    }
  }

  // ── Notifications ──────────────────────────────────────────────────────────
  async function checkPermission() {
    const status = await fetchPermissionStatus();
    setPermissionStatus(status);
  }

  useEffect(() => {
    checkPermission();
    loadQuota();
  }, []);

  useEffect(() => {
    function handleAppStateChange(nextState: AppStateStatus) {
      if (nextState === 'active') checkPermission();
    }
    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription.remove();
  }, []);

  const granted = permissionStatus === 'granted';
  const exhausted = refreshesRemaining <= 0;
  const buttonDisabled = isRefreshing || exhausted;

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} hitSlop={8}>
            <LniIcon name="lni-chevron-left" size={18} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Settings</Text>
        </View>

        {/* ── Wallpaper section ─────────────────────────────────────────────── */}
        <Text style={styles.sectionLabel}>WALLPAPER</Text>
        <View style={styles.card}>
          <View style={styles.row}>
            <View style={[styles.iconWrap, { backgroundColor: '#E8F0FE' }]}>
              <LniIcon name="lni-gallery" size={18} color="#1A73E8" />
            </View>

            <View style={styles.rowText}>
              <Text style={styles.rowTitle}>Daily Nature Wallpaper</Text>
              <Text style={styles.rowSubtitle}>
                {exhausted
                  ? "You've used all 3 changes today. Resets tomorrow."
                  : `${refreshesRemaining} of ${MAX_MANUAL_REFRESHES} changes left today`}
              </Text>
              {refreshError && (
                <Text style={styles.errorText}>{refreshError}</Text>
              )}
              {refreshSuccess && !refreshError && (
                <Text style={styles.successText}>Wallpaper updated!</Text>
              )}
            </View>

            {/* Quota badge */}
            <View style={[styles.badge, exhausted ? styles.badgeExhausted : styles.badgeAvailable]}>
              <Text style={[styles.badgeText, exhausted ? styles.badgeTextExhausted : styles.badgeTextAvailable]}>
                {exhausted ? 'Limit reached' : `${refreshesRemaining} left`}
              </Text>
            </View>
          </View>

          {/* Divider */}
          <View style={styles.divider} />

          {/* Change button */}
          <TouchableOpacity
            style={[styles.changeButton, buttonDisabled && styles.changeButtonDisabled]}
            onPress={handleRefreshWallpaper}
            disabled={buttonDisabled}
            activeOpacity={0.7}
          >
            {isRefreshing ? (
              <ActivityIndicator size="small" color={colors.black} />
            ) : (
              <LniIcon
                name="lni-refresh-circle-1-clockwise"
                size={15}
                color={buttonDisabled ? colors.disabledText : colors.black}
              />
            )}
            <Text style={[styles.changeButtonText, buttonDisabled && styles.changeButtonTextDisabled]}>
              {isRefreshing ? 'Fetching…' : 'Change Wallpaper'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* ── Notifications section ─────────────────────────────────────────── */}
        <Text style={styles.sectionLabel}>NOTIFICATIONS</Text>
        <View style={styles.card}>
          <TouchableOpacity
            style={styles.row}
            onPress={() => Linking.openSettings()}
            activeOpacity={0.7}
          >
            <View style={[styles.iconWrap, { backgroundColor: granted ? '#E8F5E9' : '#FDECEA' }]}>
              <LniIcon
                name="lni-alarm-1"
                size={18}
                color={granted ? '#2E7D32' : '#C62828'}
              />
            </View>
            <View style={styles.rowText}>
              <Text style={styles.rowTitle}>Notifications</Text>
              <Text style={styles.rowSubtitle}>Tap to manage in Settings</Text>
            </View>
            <View style={[styles.badge, granted ? styles.badgeGranted : styles.badgeDenied]}>
              <Text style={[styles.badgeText, granted ? styles.badgeTextGranted : styles.badgeTextDenied]}>
                {granted ? 'Allowed' : 'Not Allowed'}
              </Text>
            </View>
          </TouchableOpacity>
        </View>

      </ScrollView>
    </View>
  );
}

function makeStyles(colors: ThemeColors, insets: { top: number; bottom: number }) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    scroll: {
      paddingTop: insets.top + 16,
      paddingBottom: 48 + insets.bottom,
    },

    // ── Header ──
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingHorizontal: 24,
      paddingBottom: 28,
    },
    backBtn: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerTitle: {
      fontSize: 22,
      fontWeight: '800',
      color: colors.text,
    },

    // ── Section label ──
    sectionLabel: {
      fontSize: 11,
      fontWeight: '700',
      color: colors.muted,
      letterSpacing: 1,
      paddingHorizontal: 24,
      paddingBottom: 8,
    },

    // ── Card ──
    card: {
      marginHorizontal: 24,
      marginBottom: 28,
      backgroundColor: colors.surface,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      overflow: 'hidden',
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 16,
      gap: 14,
    },
    divider: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: colors.border,
      marginHorizontal: 16,
    },
    iconWrap: {
      width: 38,
      height: 38,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
    },
    rowText: {
      flex: 1,
      gap: 2,
    },
    rowTitle: {
      fontSize: 15,
      fontWeight: '600',
      color: colors.text,
    },
    rowSubtitle: {
      fontSize: 12,
      color: colors.muted,
    },
    errorText: {
      fontSize: 12,
      color: '#C62828',
      marginTop: 2,
    },
    successText: {
      fontSize: 12,
      color: '#2E7D32',
      marginTop: 2,
    },

    // ── Change wallpaper button ──
    changeButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      margin: 12,
      paddingVertical: 12,
      borderRadius: 10,
      backgroundColor: colors.yellow,
    },
    changeButtonDisabled: {
      backgroundColor: colors.disabled,
    },
    changeButtonText: {
      fontSize: 14,
      fontWeight: '700',
      color: colors.black,
    },
    changeButtonTextDisabled: {
      color: colors.disabledText,
    },

    // ── Badge ──
    badge: {
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 20,
    },
    badgeAvailable: {
      backgroundColor: '#E8F0FE',
    },
    badgeExhausted: {
      backgroundColor: '#FDECEA',
    },
    badgeGranted: {
      backgroundColor: '#E8F5E9',
    },
    badgeDenied: {
      backgroundColor: '#FDECEA',
    },
    badgeText: {
      fontSize: 12,
      fontWeight: '700',
    },
    badgeTextAvailable: {
      color: '#1A73E8',
    },
    badgeTextExhausted: {
      color: '#C62828',
    },
    badgeTextGranted: {
      color: '#2E7D32',
    },
    badgeTextDenied: {
      color: '#C62828',
    },
  });
}
