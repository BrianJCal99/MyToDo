import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '@/lib/supabase';
import { ThemeColors } from '@/constants/theme';
import { useThemeColors } from '@/hooks/use-theme-colors';
import { useAppSelector, useAppDispatch } from '@/store';
import { setUser } from '@/store/userSlice';
import LniIcon from '@/components/LniIcon';

const DANGER = '#E53838';

export default function AccountScreen() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const styles = makeStyles(colors, insets);

  const userId = useAppSelector((s) => s.user.id) ?? '';
  const firstName = useAppSelector((s) => s.user.firstName) ?? '';
  const email = useAppSelector((s) => s.user.email) ?? '';
  const todos = useAppSelector((s) => s.todos.todos);

  const totalCount = todos.length;
  const completedCount = todos.filter((t) => t.completed).length;
  const activeCount = totalCount - completedCount;

  const [editName, setEditName] = useState(firstName);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  const initial = (firstName?.[0] ?? '?').toUpperCase();

  async function handleSaveProfile() {
    if (!editName.trim()) return;
    setSavingProfile(true);
    const { error } = await supabase.auth.updateUser({
      data: { first_name: editName.trim() },
    });
    setSavingProfile(false);
    if (error) {
      Alert.alert('Error', error.message);
    } else {
      dispatch(setUser({ id: userId, firstName: editName.trim(), email }));
      Alert.alert('Saved', 'Profile updated successfully.');
    }
  }

  async function handleUpdatePassword() {
    if (!currentPassword || !newPassword) {
      Alert.alert('Error', 'Please fill in both password fields.');
      return;
    }
    setSavingPassword(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setSavingPassword(false);
    if (error) {
      Alert.alert('Error', error.message);
    } else {
      setCurrentPassword('');
      setNewPassword('');
      Alert.alert('Updated', 'Password changed successfully.');
    }
  }

  function handleDeleteAccount() {
    Alert.alert(
      'Delete Account',
      'This is permanent and cannot be undone. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => Alert.alert('Not available', 'Please contact support to delete your account.'),
        },
      ]
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} hitSlop={8}>
            <LniIcon name="lni-chevron-left" size={18} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Account</Text>
        </View>

        {/* Profile card */}
        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarInitial}>{initial}</Text>
          </View>
          <Text style={styles.name}>{firstName}</Text>
          <Text style={styles.email}>{email}</Text>
        </View>

        {/* Stats row */}
        <View style={styles.statsRow}>
          <View style={styles.statCell}>
            <Text style={styles.statValue}>{totalCount}</Text>
            <Text style={styles.statLabel}>Total</Text>
          </View>
          <View style={[styles.statCell, styles.statCellBorder]}>
            <Text style={styles.statValue}>{completedCount}</Text>
            <Text style={styles.statLabel}>Completed</Text>
          </View>
          <View style={[styles.statCell, styles.statCellBorder]}>
            <Text style={styles.statValue}>{activeCount}</Text>
            <Text style={styles.statLabel}>Active</Text>
          </View>
        </View>

        {/* Edit Profile */}
        <Text style={styles.sectionLabel}>EDIT PROFILE</Text>
        <View style={styles.card}>
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>First Name</Text>
            <TextInput
              style={styles.fieldInput}
              value={editName}
              onChangeText={setEditName}
              placeholderTextColor={colors.placeholder}
              returnKeyType="done"
            />
          </View>
          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={handleSaveProfile}
            disabled={savingProfile}
            activeOpacity={0.8}
          >
            {savingProfile ? (
              <ActivityIndicator color={colors.black} />
            ) : (
              <Text style={styles.primaryBtnText}>Save Changes</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Change Password */}
        <Text style={styles.sectionLabel}>CHANGE PASSWORD</Text>
        <View style={styles.card}>
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Current Password</Text>
            <TextInput
              style={styles.fieldInput}
              value={currentPassword}
              onChangeText={setCurrentPassword}
              placeholder="Current Password"
              placeholderTextColor={colors.placeholder}
              secureTextEntry
            />
          </View>
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>New Password</Text>
            <TextInput
              style={styles.fieldInput}
              value={newPassword}
              onChangeText={setNewPassword}
              placeholder="New Password"
              placeholderTextColor={colors.placeholder}
              secureTextEntry
            />
          </View>
          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={handleUpdatePassword}
            disabled={savingPassword}
            activeOpacity={0.8}
          >
            {savingPassword ? (
              <ActivityIndicator color={colors.black} />
            ) : (
              <Text style={styles.primaryBtnText}>Update Password</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Danger Zone */}
        <Text style={styles.sectionLabel}>DANGER ZONE</Text>
        <TouchableOpacity
          style={styles.deleteBtn}
          onPress={handleDeleteAccount}
          activeOpacity={0.8}
        >
          <Text style={styles.deleteBtnText}>Delete Account</Text>
        </TouchableOpacity>

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

    // ── Profile card ──
    profileCard: {
      marginHorizontal: 24,
      marginBottom: 16,
      backgroundColor: colors.surface,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      paddingTop: 28,
      paddingBottom: 24,
      paddingHorizontal: 20,
    },
    avatar: {
      width: 72,
      height: 72,
      borderRadius: 36,
      backgroundColor: colors.yellow,
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatarInitial: {
      fontSize: 28,
      fontWeight: '800',
      color: colors.black,
      lineHeight: 32,
    },
    name: {
      fontSize: 20,
      fontWeight: '700',
      color: colors.text,
      textAlign: 'center',
      marginTop: 12,
    },
    email: {
      fontSize: 14,
      color: colors.muted,
      textAlign: 'center',
      marginTop: 4,
    },

    // ── Stats ──
    statsRow: {
      flexDirection: 'row',
      marginHorizontal: 24,
      marginBottom: 28,
      backgroundColor: colors.surface,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
    },
    statCell: {
      flex: 1,
      alignItems: 'center',
      paddingVertical: 20,
      paddingHorizontal: 8,
      gap: 4,
    },
    statCellBorder: {
      borderLeftWidth: 1,
      borderLeftColor: colors.border,
    },
    statValue: {
      fontSize: 24,
      fontWeight: '800',
      color: colors.yellow,
      textAlign: 'center',
      width: '100%',
    },
    statLabel: {
      fontSize: 12,
      color: colors.muted,
      textAlign: 'center',
      width: '100%',
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
      padding: 20,
      gap: 14,
    },
    fieldGroup: {
      gap: 6,
    },
    fieldLabel: {
      fontSize: 12,
      fontWeight: '500',
      color: colors.muted,
    },
    fieldInput: {
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 10,
      paddingHorizontal: 14,
      paddingVertical: 12,
      fontSize: 15,
      color: colors.text,
    },

    // ── Buttons ──
    primaryBtn: {
      backgroundColor: colors.yellow,
      borderRadius: 10,
      paddingVertical: 13,
      alignItems: 'center',
    },
    primaryBtnText: {
      fontSize: 15,
      fontWeight: '800',
      color: colors.black,
    },
    deleteBtn: {
      marginHorizontal: 24,
      borderRadius: 10,
      borderWidth: 1.5,
      borderColor: DANGER,
      paddingVertical: 13,
      alignItems: 'center',
    },
    deleteBtnText: {
      fontSize: 15,
      fontWeight: '700',
      color: DANGER,
    },
  });
}
