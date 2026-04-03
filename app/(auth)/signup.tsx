import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  ActivityIndicator,
  Alert,
  Image,
} from 'react-native';

const TODO_ICON = require('@/assets/images/icons/icon.png');
import { Link } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { ThemeColors } from '@/constants/theme';
import { useThemeColors } from '@/hooks/use-theme-colors';
import ReadableBackground from '@/components/ReadableBackground';
import { useDailyWallpaper } from '@/hooks/useDailyWallpaper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function SignUpScreen() {
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const { wallpaper } = useDailyWallpaper();
  const styles = makeStyles(colors, Boolean(wallpaper), insets);

  const [firstName, setFirstName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSignUp() {
    if (!firstName || !email || !password) {
      Alert.alert('Error', 'Please fill in all fields.');
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { first_name: firstName.trim() } },
    });
    setLoading(false);
    if (error) Alert.alert('Sign up failed', error.message);
  }

  return (
    <ReadableBackground imageUri={wallpaper?.imageUrl}>
      <KeyboardAvoidingView style={styles.container} behavior="padding">
        <View style={styles.inner}>
          <Image source={TODO_ICON} style={styles.icon} />
          <Text style={styles.appName}>My To-Do List</Text>
          <Text style={styles.subtitle}>Create your account</Text>

          <TextInput
            style={styles.input}
            placeholder="First Name"
            placeholderTextColor={colors.placeholder}
            autoCapitalize="words"
            value={firstName}
            onChangeText={setFirstName}
          />
          <TextInput
            style={styles.input}
            placeholder="Email"
            placeholderTextColor={colors.placeholder}
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
          />
          <TextInput
            style={styles.input}
            placeholder="Password"
            placeholderTextColor={colors.placeholder}
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />

          <TouchableOpacity style={styles.button} onPress={handleSignUp} disabled={loading}>
            {loading ? (
              <ActivityIndicator color={colors.black} />
            ) : (
              <Text style={styles.buttonText}>Sign Up</Text>
            )}
          </TouchableOpacity>

          <Link href="/(auth)/login" asChild>
            <TouchableOpacity style={styles.linkContainer}>
              <Text style={styles.linkText}>
                Already have an account? <Text style={styles.linkBold}>Log In</Text>
              </Text>
            </TouchableOpacity>
          </Link>
        </View>
      </KeyboardAvoidingView>
    </ReadableBackground>
  );
}

function makeStyles(colors: ThemeColors, hasWallpaper: boolean, insets: { bottom: number }) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: 'transparent',
    },
    inner: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 32,
      paddingBottom: insets.bottom + 16,
    },
    icon: {
      width: 144,
      height: 144,
      marginBottom: 16,
    },
    appName: {
      fontSize: 36,
      fontWeight: '800',
      color: colors.yellow,
      textAlign: 'center',
      marginBottom: 8,
      letterSpacing: 0.5,
      ...(hasWallpaper && {
        textShadowColor: 'rgba(0,0,0,0.8)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 8,
      }),
    },
    subtitle: {
      fontSize: 16,
      color: hasWallpaper ? 'rgba(255,255,255,0.85)' : colors.muted,
      textAlign: 'center',
      marginBottom: 40,
      ...(hasWallpaper && {
        textShadowColor: 'rgba(0,0,0,0.7)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 5,
      }),
    },
    input: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      paddingHorizontal: 16,
      paddingVertical: 14,
      fontSize: 16,
      color: colors.text,
      marginBottom: 16,
      backgroundColor: colors.surface,
      alignSelf: 'stretch',
    },
    button: {
      backgroundColor: colors.yellow,
      borderRadius: 12,
      paddingVertical: 16,
      alignItems: 'center',
      marginTop: 8,
      marginBottom: 24,
      alignSelf: 'stretch',
    },
    buttonText: {
      color: colors.black,
      fontSize: 16,
      fontWeight: '800',
    },
    linkContainer: {
      alignItems: 'center',
    },
    linkText: {
      fontSize: 14,
      color: hasWallpaper ? 'rgba(255,255,255,0.80)' : colors.muted,
      ...(hasWallpaper && {
        textShadowColor: 'rgba(0,0,0,0.6)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 4,
      }),
    },
    linkBold: {
      color: colors.yellow,
      fontWeight: '700',
    },
  });
}
