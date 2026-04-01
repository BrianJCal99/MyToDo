import { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { ThemeColors } from '@/constants/theme';
import { useThemeColors } from '@/hooks/use-theme-colors';
import { useAppDispatch, useAppSelector } from '@/store';
import {
  hydrateTodos,
  fetchTodos,
  syncTodos,
  setFilter,
} from '@/features/todos/todosSlice';
import {
  hydrateLists,
  fetchLists,
  syncLists,
} from '@/features/lists/listsSlice';
import { selectFilteredSortedTodos } from '@/features/todos/todosSelectors';
import FilterBar from '@/components/FilterBar';
import TodoInput from '@/components/TodoInput';
import TodoItem from '@/components/TodoItem';
import ListSelector from '@/components/ListSelector';
import SearchBar from '@/components/SearchBar';
import SortControls from '@/components/SortControls';

const SIDEBAR_WIDTH = 260;

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good Morning';
  if (hour < 18) return 'Good Afternoon';
  return 'Good Evening';
}

export default function HomeScreen() {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const colors = useThemeColors();
  const styles = makeStyles(colors);

  const firstName = useAppSelector((state) => state.user.firstName);
  const userId = useAppSelector((state) => state.user.id);
  const todos = useAppSelector((state) => state.todos.todos);
  const filter = useAppSelector((state) => state.todos.filter);
  const loading = useAppSelector((state) => state.todos.loading);

  // Use the memoized composed selector for rendering
  const visibleTodos = useAppSelector(selectFilteredSortedTodos);

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const translateX = useRef(new Animated.Value(SIDEBAR_WIDTH)).current;

  useEffect(() => {
    if (!userId) return;
    // Startup sequence: local first, then remote
    dispatch(hydrateLists(userId));
    dispatch(hydrateTodos(userId)).then(() => {
      dispatch(fetchLists(userId));
      dispatch(fetchTodos(userId));
      dispatch(syncLists(userId));
      dispatch(syncTodos(userId));
    });
  }, [userId]);

  function openSidebar() {
    setSidebarOpen(true);
    Animated.timing(translateX, {
      toValue: 0,
      duration: 250,
      useNativeDriver: true,
    }).start();
  }

  function closeSidebar() {
    Animated.timing(translateX, {
      toValue: SIDEBAR_WIDTH,
      duration: 200,
      useNativeDriver: true,
    }).start(() => setSidebarOpen(false));
  }

  async function handleLogout() {
    closeSidebar();
    if (userId) {
      await dispatch(syncTodos(userId));
      await dispatch(syncLists(userId));
    }
    const { error } = await supabase.auth.signOut();
    if (error) Alert.alert('Error', error.message);
  }

  const completedCount = todos.filter((t) => t.completed).length;
  const totalCount = todos.length;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.topBar}>
        <View style={styles.greetingContainer}>
          <Text style={styles.name}>
            {getGreeting()}, {firstName} 👋
          </Text>
          {totalCount > 0 && (
            <Text style={styles.progress}>
              {completedCount}/{totalCount} completed
            </Text>
          )}
        </View>
        <TouchableOpacity onPress={openSidebar} hitSlop={12}>
          <View style={styles.hamburger}>
            <View style={styles.bar} />
            <View style={styles.bar} />
            <View style={styles.bar} />
          </View>
        </TouchableOpacity>
      </View>

      {/* List selector */}
      <ListSelector />

      {/* Add input */}
      <TodoInput />

      {/* Search */}
      <SearchBar />

      {/* Filter bar */}
      <FilterBar filter={filter} onSelect={(f) => dispatch(setFilter(f))} />

      {/* Sort controls */}
      <SortControls />

      {/* Todo list */}
      {loading && todos.length === 0 ? (
        <View style={styles.centered}>
          <ActivityIndicator color={colors.yellow} />
        </View>
      ) : (
        <FlatList
          data={visibleTodos}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <TodoItem todo={item} />}
          contentContainerStyle={visibleTodos.length === 0 ? styles.emptyList : styles.list}
          ListEmptyComponent={
            <View style={styles.centered}>
              <Text style={styles.emptyText}>
                {filter === 'all' ? 'No to-dos yet. Add one above!' : `No ${filter.replace('_', ' ')} to-dos.`}
              </Text>
            </View>
          }
        />
      )}

      {/* Sidebar overlay */}
      {sidebarOpen && (
        <TouchableWithoutFeedback onPress={closeSidebar}>
          <View style={styles.overlay} />
        </TouchableWithoutFeedback>
      )}

      {/* Sidebar */}
      <Animated.View style={[styles.sidebar, { transform: [{ translateX }] }]}>
        <Text style={styles.sidebarTitle}>Menu</Text>
        <TouchableOpacity
          style={styles.sidebarItem}
          onPress={() => { closeSidebar(); router.push('/(tabs)/account'); }}
        >
          <Text style={styles.sidebarItemText}>Account</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.sidebarItem} onPress={handleLogout}>
          <Text style={styles.sidebarItemText}>Log Out</Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

function makeStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
      paddingTop: 60,
    },
    topBar: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 24,
      marginBottom: 16,
    },
    greetingContainer: {
      flex: 1,
      marginRight: 16,
    },
    name: {
      fontSize: 22,
      fontWeight: '700',
      color: colors.text,
      flexShrink: 1,
    },
    progress: {
      fontSize: 13,
      color: colors.muted,
      marginTop: 2,
    },
    hamburger: {
      gap: 5,
      padding: 4,
    },
    bar: {
      width: 24,
      height: 2,
      backgroundColor: colors.yellow,
      borderRadius: 2,
    },
    list: {
      paddingBottom: 24,
    },
    emptyList: {
      flex: 1,
    },
    centered: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    emptyText: {
      fontSize: 15,
      color: colors.muted,
    },
    overlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(0,0,0,0.4)',
    },
    sidebar: {
      position: 'absolute',
      top: 0,
      right: 0,
      bottom: 0,
      width: SIDEBAR_WIDTH,
      backgroundColor: colors.surface,
      paddingTop: 72,
      paddingHorizontal: 24,
      borderLeftWidth: 1,
      borderLeftColor: colors.border,
      shadowColor: '#000',
      shadowOffset: { width: -4, height: 0 },
      shadowOpacity: 0.2,
      shadowRadius: 12,
      elevation: 10,
    },
    sidebarTitle: {
      fontSize: 20,
      fontWeight: '800',
      color: colors.yellow,
      marginBottom: 32,
    },
    sidebarItem: {
      paddingVertical: 14,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    sidebarItemText: {
      fontSize: 16,
      color: colors.text,
    },
  });
}
