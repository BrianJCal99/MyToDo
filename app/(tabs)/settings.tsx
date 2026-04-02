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
} from 'react-native';
import { useRouter } from 'expo-router';
import * as Notifications from 'expo-notifications';
import { ThemeColors } from '@/constants/theme';
import { useThemeColors } from '@/hooks/use-theme-colors';
import LniIcon from '@/components/LniIcon';

type PermissionStatus = 'granted' | 'denied' | 'undetermined';

async function fetchPermissionStatus(): Promise<PermissionStatus> {
  const { status } = await Notifications.getPermissionsAsync();
  return status as PermissionStatus;
}

export default function SettingsScreen() {
  const router = useRouter();
  const colors = useThemeColors();
  const styles = makeStyles(colors);

  const [permissionStatus, setPermissionStatus] = useState<PermissionStatus>('undetermined');

  async function checkPermission() {
    const status = await fetchPermissionStatus();
    setPermissionStatus(status);
  }

  // Check on mount
  useEffect(() => {
    checkPermission();
  }, []);

  // Re-check when the app comes back to the foreground (user may have changed settings)
  useEffect(() => {
    function handleAppStateChange(nextState: AppStateStatus) {
      if (nextState === 'active') {
        checkPermission();
      }
    }
    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription.remove();
  }, []);

  const granted = permissionStatus === 'granted';

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

        {/* Notifications section */}
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

function makeStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    scroll: {
      paddingTop: 60,
      paddingBottom: 48,
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

    // ── Badge ──
    badge: {
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 20,
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
    badgeTextGranted: {
      color: '#2E7D32',
    },
    badgeTextDenied: {
      color: '#C62828',
    },
  });
}
