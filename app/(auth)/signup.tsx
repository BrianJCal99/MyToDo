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

const TODO_ICON = require('@/assets/images/icon.png');
import { Link } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { ThemeColors } from '@/constants/theme';
import { useThemeColors } from '@/hooks/use-theme-colors';

export default function SignUpScreen() {
  const colors = useThemeColors();
  const styles = makeStyles(colors);

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
  );
}

function makeStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    inner: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 32,
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
    },
    subtitle: {
      fontSize: 16,
      color: colors.muted,
      textAlign: 'center',
      marginBottom: 40,
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
      color: colors.muted,
    },
    linkBold: {
      color: colors.yellow,
      fontWeight: '700',
    },
  });
}
