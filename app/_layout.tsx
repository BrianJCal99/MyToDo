import { useEffect, useState } from 'react';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import { Provider } from 'react-redux';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { SplashScreen } from '@/components/SplashScreen';
import { store } from '@/store';
import { useAppDispatch, useAppSelector } from '@/store';
import { setUser, clearUser } from '@/store/userSlice';
import { clearTodos } from '@/features/todos/todosSlice';
import { clearTodosFromStorage } from '@/services/storage';
import { supabase } from '@/lib/supabase';

function RootLayoutNav() {
  const colorScheme = useColorScheme();
  const dispatch = useAppDispatch();
  const isLoggedIn = useAppSelector((state) => state.user.isLoggedIn);
  const [isReady, setIsReady] = useState(false);
  const [splashVisible, setSplashVisible] = useState(true);
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        const meta = session.user.user_metadata;
        dispatch(
          setUser({
            id: session.user.id,
            firstName: meta.first_name ?? '',
            email: session.user.email ?? '',
          })
        );
      }
      setIsReady(true);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        const meta = session.user.user_metadata;
        dispatch(
          setUser({
            id: session.user.id,
            firstName: meta.first_name ?? '',
            email: session.user.email ?? '',
          })
        );
      } else {
        // Capture userId before wiping user state so we can clear the right storage key
        const userId = store.getState().user.id;
        if (userId) {
          clearTodosFromStorage(userId);
        }
        dispatch(clearTodos());
        dispatch(clearUser());
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // TODO: remove this timer before production — for testing splash screen duration only
  useEffect(() => {
    const timer = setTimeout(() => setSplashVisible(false), 5000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!isReady) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (!isLoggedIn && !inAuthGroup) {
      router.replace('/(auth)/login');
    } else if (isLoggedIn && inAuthGroup) {
      router.replace('/(tabs)');
    }
  }, [isLoggedIn, segments, isReady]);

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      {(!isReady || splashVisible) ? (
        <SplashScreen />
      ) : (
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        </Stack>
      )}
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <Provider store={store}>
      <RootLayoutNav />
    </Provider>
  );
}
