import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  FlatList,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
  ActivityIndicator,
} from 'react-native';
import ReadableBackground from '@/components/ReadableBackground';
import WallpaperCredit from '@/components/WallpaperCredit';
import { useDailyWallpaper } from '@/hooks/useDailyWallpaper';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { ThemeColors, PRIORITY_COLORS } from '@/constants/theme';
import { useThemeColors } from '@/hooks/use-theme-colors';
import { useAppDispatch, useAppSelector } from '@/store';
import { addTodo, hydrateTodos, fetchTodos, syncTodos, Priority } from '@/features/todos/todosSlice';
import { REMINDER_OPTIONS, getReminderLabel } from '@/services/notificationsService';
import {
  hydrateLists,
  fetchLists,
  syncLists,
  addList,
  deleteList,
  DEFAULT_LIST_ID,
} from '@/features/lists/listsSlice';
import TodoItem from '@/components/TodoItem';
import LniIcon from '@/components/LniIcon';

const SIDEBAR_WIDTH = 260;
const PRIORITIES: Priority[] = ['low', 'medium', 'high'];

function hasTimeSet(ts: number): boolean {
  const d = new Date(ts);
  return d.getHours() !== 0 || d.getMinutes() !== 0;
}

type HomeItem =
  | { type: 'sectionHeader'; label: string }
  | { type: 'todo'; id: string }
  | { type: 'inboxEmpty' }
  | { type: 'list'; id: string }
  | { type: 'listsEmpty' };

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

  const firstName = useAppSelector((state) => state.user.firstName);
  const userId = useAppSelector((state) => state.user.id);
  const allTodos = useAppSelector((state) => state.todos.todos);
  const allLists = useAppSelector((state) => state.lists.lists);
  const loading = useAppSelector((state) => state.todos.loading);

  // ── Wallpaper — must be above makeStyles so wallpaper state is available ────
  const { wallpaper } = useDailyWallpaper();

  const styles = makeStyles(colors, Boolean(wallpaper));

  // ── Sidebar ────────────────────────────────────────────────────────────────
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const translateX = useRef(new Animated.Value(SIDEBAR_WIDTH)).current;

  // ── Add Todo sheet ─────────────────────────────────────────────────────────
  const [addSheetOpen, setAddSheetOpen] = useState(false);
  const [addTitle, setAddTitle] = useState('');
  const [addDescription, setAddDescription] = useState('');
  const [addPriority, setAddPriority] = useState<Priority>('medium');
  const [addDueDate, setAddDueDate] = useState<number | null>(null);
  const [addListId, setAddListId] = useState<string>(DEFAULT_LIST_ID);
  const [addReminderOffset, setAddReminderOffset] = useState<number | null>(null);
  const [showListPicker, setShowListPicker] = useState(false);
  const [showReminderPicker, setShowReminderPicker] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  // ── Create List modal ──────────────────────────────────────────────────────
  const [createListModalVisible, setCreateListModalVisible] = useState(false);
  const [createListName, setCreateListName] = useState('');
  const [createListFromPicker, setCreateListFromPicker] = useState(false);

  useEffect(() => {
    if (!userId) return;
    dispatch(hydrateLists(userId));
    dispatch(hydrateTodos(userId)).then(() => {
      dispatch(fetchLists(userId));
      dispatch(fetchTodos(userId));
      dispatch(syncLists(userId));
      dispatch(syncTodos(userId));
    });
  }, [userId]);

  const inboxTodos = useMemo(
    () => allTodos.filter((t) => t.listId === DEFAULT_LIST_ID),
    [allTodos]
  );

  const customLists = useMemo(
    () => allLists.filter((l) => l.id !== DEFAULT_LIST_ID),
    [allLists]
  );

  const todoCountByList = useMemo(() => {
    const map: Record<string, number> = {};
    for (const t of allTodos) map[t.listId] = (map[t.listId] ?? 0) + 1;
    return map;
  }, [allTodos]);

  const listData: HomeItem[] = useMemo(() => {
    const items: HomeItem[] = [];
    items.push({ type: 'sectionHeader', label: 'Inbox' });
    if (inboxTodos.length === 0) items.push({ type: 'inboxEmpty' });
    else for (const t of inboxTodos) items.push({ type: 'todo', id: t.id });
    items.push({ type: 'sectionHeader', label: 'Lists' });
    if (customLists.length === 0) items.push({ type: 'listsEmpty' });
    else for (const l of customLists) items.push({ type: 'list', id: l.id });
    return items;
  }, [inboxTodos, customLists]);

  // ── Sidebar ────────────────────────────────────────────────────────────────
  function openSidebar() {
    setSidebarOpen(true);
    Animated.timing(translateX, { toValue: 0, duration: 250, useNativeDriver: true }).start();
  }

  function closeSidebar() {
    Animated.timing(translateX, { toValue: SIDEBAR_WIDTH, duration: 200, useNativeDriver: true }).start(
      () => setSidebarOpen(false)
    );
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

  // ── Add Todo ───────────────────────────────────────────────────────────────
  function openAddSheet() {
    setAddTitle('');
    setAddDescription('');
    setAddPriority('medium');
    setAddDueDate(null);
    setAddListId(DEFAULT_LIST_ID);
    setAddReminderOffset(null);
    setShowDatePicker(false);
    setShowTimePicker(false);
    setAddSheetOpen(true);
  }

  function handleAddTodo() {
    if (!addTitle.trim()) return;
    dispatch(addTodo({
      title: addTitle,
      description: addDescription || undefined,
      priority: addPriority,
      dueDate: addDueDate,
      listId: addListId,
      reminderOffset: addReminderOffset,
    }));
    setAddSheetOpen(false);
  }

  // ── Create List ────────────────────────────────────────────────────────────
  async function handleCreateList() {
    const name = createListName.trim();
    if (!name) return;
    const result = await dispatch(addList(name)).unwrap();
    if (createListFromPicker) {
      setAddListId(result.id);
      setCreateListFromPicker(false);
    }
    setCreateListName('');
    setCreateListModalVisible(false);
  }

  function handleDeleteList(id: string, name: string) {
    Alert.alert(`Delete "${name}"?`, 'Todos in this list will move to Inbox.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => dispatch(deleteList(id)) },
    ]);
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  function renderItem({ item }: { item: HomeItem }) {
    if (item.type === 'sectionHeader') {
      const icon = item.label === 'Inbox' ? 'lni-box-closed' : 'lni-folder-1';
      return (
        <View style={styles.sectionHeader}>
          <View style={styles.sectionLabelRow}>
            <LniIcon name={icon} size={14} color={colors.muted} />
            <Text style={styles.sectionLabel}>{item.label}</Text>
          </View>
          {item.label === 'Inbox' && (
            <TouchableOpacity onPress={openAddSheet} hitSlop={10}>
              <LniIcon name="lni-plus" size={18} color={colors.yellow} />
            </TouchableOpacity>
          )}
          {item.label === 'Lists' && (
            <TouchableOpacity onPress={() => setCreateListModalVisible(true)} hitSlop={10}>
              <LniIcon name="lni-plus" size={18} color={colors.yellow} />
            </TouchableOpacity>
          )}
        </View>
      );
    }
    if (item.type === 'inboxEmpty') {
      return <Text style={styles.emptyText}>No todos in Inbox</Text>;
    }
    if (item.type === 'listsEmpty') {
      return <Text style={styles.emptyText}>No lists yet. Tap + to create one.</Text>;
    }
    if (item.type === 'todo') {
      const todo = allTodos.find((t) => t.id === item.id);
      if (!todo) return null;
      return <TodoItem todo={todo} />;
    }
    if (item.type === 'list') {
      const list = allLists.find((l) => l.id === item.id);
      if (!list) return null;
      const count = todoCountByList[list.id] ?? 0;
      return (
        <TouchableOpacity
          style={styles.listCard}
          onPress={() => router.push(`/(tabs)/list/${list.id}`)}
          onLongPress={() => handleDeleteList(list.id, list.name)}
          activeOpacity={0.7}
        >
          <View style={styles.listIconWrap}>
            <LniIcon name="lni-folder-1" size={18} color={colors.yellow} />
          </View>
          <View style={styles.listCardText}>
            <Text style={styles.listCardName}>{list.name}</Text>
            <Text style={styles.listCardCount}>{count} {count === 1 ? 'todo' : 'todos'}</Text>
          </View>
          <LniIcon name="lni-chevron-right-circle" size={16} color={colors.muted} />
        </TouchableOpacity>
      );
    }
    return null;
  }

  return (
    <ReadableBackground imageUri={wallpaper?.imageUrl}>
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.topBar}>
        <View style={styles.greetingContainer}>
          <Text style={styles.name}>{getGreeting()}, {firstName} 👋</Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={() => router.push('/(tabs)/search')} hitSlop={12}>
            <LniIcon name="lni-search-1" size={22} color={colors.text} />
          </TouchableOpacity>
          <TouchableOpacity onPress={openSidebar} hitSlop={12}>
            <View style={styles.hamburger}>
              <View style={styles.bar} />
              <View style={styles.bar} />
              <View style={styles.bar} />
            </View>
          </TouchableOpacity>
        </View>
      </View>

      {/* List */}
      {loading && allTodos.length === 0 ? (
        <View style={styles.centered}>
          <ActivityIndicator color={colors.yellow} />
        </View>
      ) : (
        <FlatList
          data={listData}
          keyExtractor={(item, index) =>
            item.type === 'todo' || item.type === 'list'
              ? `${item.type}-${item.id}`
              : `${item.type}-${index}`
          }
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          keyboardShouldPersistTaps="handled"
        />
      )}

      {/* ── Add Todo modal ───────────────────────────────────────────────── */}
      <Modal
        visible={addSheetOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setAddSheetOpen(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setAddSheetOpen(false)}
        >
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>New Todo</Text>

            <TextInput
              style={styles.modalInput}
              value={addTitle}
              onChangeText={setAddTitle}
              autoFocus
              placeholder="What needs to be done?"
              placeholderTextColor={colors.placeholder}
              returnKeyType="next"
            />

            <TextInput
              style={[styles.modalInput, styles.modalInputMultiline]}
              value={addDescription}
              onChangeText={setAddDescription}
              placeholder="Description (optional)"
              placeholderTextColor={colors.placeholder}
              returnKeyType="done"
              multiline
            />

            {/* Priority */}
            <View style={styles.editRow}>
              <Text style={styles.editRowLabel}>Priority</Text>
              <View style={styles.priorityRow}>
                {PRIORITIES.map((p) => (
                  <TouchableOpacity
                    key={p}
                    style={[
                      styles.priorityChip,
                      addPriority === p && { backgroundColor: PRIORITY_COLORS[p], borderColor: PRIORITY_COLORS[p] },
                    ]}
                    onPress={() => setAddPriority(p)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.priorityChipText, addPriority === p && styles.priorityChipTextActive]}>
                      {p.charAt(0).toUpperCase() + p.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* List */}
            <View style={styles.editRow}>
              <Text style={styles.editRowLabel}>List</Text>
              <TouchableOpacity
                style={styles.dropdownButton}
                onPress={() => setShowListPicker(true)}
                activeOpacity={0.7}
              >
                <Text style={styles.dropdownButtonText}>
                  {allLists.find((l) => l.id === addListId)?.name ?? 'Inbox'}
                </Text>
                <LniIcon name="lni-chevron-down" size={13} color={colors.muted} />
              </TouchableOpacity>
            </View>

            {/* Due date */}
            <View style={styles.editRow}>
              <Text style={styles.editRowLabel}>Due Date</Text>
              <View style={styles.dueDateRow}>
                <TouchableOpacity style={styles.dueDateButton} onPress={() => setShowDatePicker(true)}>
                  <Text style={styles.dueDateButtonText}>
                    {addDueDate ? new Date(addDueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : 'Set date'}
                  </Text>
                </TouchableOpacity>
                {addDueDate !== null && (
                  <TouchableOpacity onPress={() => { setAddDueDate(null); setShowTimePicker(false); }} hitSlop={8}>
                    <LniIcon name="lni-xmark" size={15} color={colors.muted} />
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* Due time (only when date is set) */}
            {addDueDate !== null && (
              <View style={styles.editRow}>
                <Text style={styles.editRowLabel}>Due Time</Text>
                <View style={styles.dueDateRow}>
                  <TouchableOpacity style={styles.dueDateButton} onPress={() => setShowTimePicker(true)}>
                    <Text style={styles.dueDateButtonText}>
                      {hasTimeSet(addDueDate)
                        ? new Date(addDueDate).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
                        : 'Set time'}
                    </Text>
                  </TouchableOpacity>
                  {hasTimeSet(addDueDate) && (
                    <TouchableOpacity
                      onPress={() => {
                        const d = new Date(addDueDate);
                        d.setHours(0, 0, 0, 0);
                        setAddDueDate(d.getTime());
                      }}
                      hitSlop={8}
                    >
                      <LniIcon name="lni-xmark" size={15} color={colors.muted} />
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            )}

            {/* Reminder (only when due date is set) */}
            {addDueDate !== null && (
              <View style={styles.editRow}>
                <Text style={styles.editRowLabel}>Reminder</Text>
                <TouchableOpacity
                  style={styles.dropdownButton}
                  onPress={() => setShowReminderPicker(true)}
                  activeOpacity={0.7}
                >
                  <LniIcon name="lni-alarm-1" size={13} color={colors.muted} />
                  <Text style={styles.dropdownButtonText}>
                    {getReminderLabel(addReminderOffset)}
                  </Text>
                  <LniIcon name="lni-chevron-down" size={13} color={colors.muted} />
                </TouchableOpacity>
              </View>
            )}

            {showDatePicker && (
              <DateTimePicker
                value={addDueDate ? new Date(addDueDate) : new Date()}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={(_, date) => {
                  setShowDatePicker(Platform.OS === 'ios');
                  if (date) {
                    const newDate = new Date(date);
                    if (addDueDate && hasTimeSet(addDueDate)) {
                      const existing = new Date(addDueDate);
                      newDate.setHours(existing.getHours(), existing.getMinutes(), 0, 0);
                    } else {
                      newDate.setHours(0, 0, 0, 0);
                    }
                    setAddDueDate(newDate.getTime());
                  }
                }}
              />
            )}

            {showTimePicker && addDueDate !== null && (
              <DateTimePicker
                value={new Date(addDueDate)}
                mode="time"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={(_, time) => {
                  setShowTimePicker(Platform.OS === 'ios');
                  if (time) {
                    const d = new Date(addDueDate);
                    d.setHours(time.getHours(), time.getMinutes(), 0, 0);
                    setAddDueDate(d.getTime());
                  }
                }}
              />
            )}

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancel}
                onPress={() => setAddSheetOpen(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalCreate, !addTitle.trim() && styles.modalCreateDisabled]}
                onPress={handleAddTodo}
                disabled={!addTitle.trim()}
              >
                <Text style={styles.modalCreateText}>Add</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* ── List picker modal ────────────────────────────────────────────── */}
      <Modal
        visible={showListPicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowListPicker(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowListPicker(false)}
        >
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Select List</Text>
            {allLists.map((l) => {
              const selected = l.id === addListId;
              return (
                <TouchableOpacity
                  key={l.id}
                  style={styles.pickerOption}
                  onPress={() => { setAddListId(l.id); setShowListPicker(false); }}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.pickerOptionText, selected && styles.pickerOptionTextActive]}>
                    {l.name}
                  </Text>
                  {selected && <LniIcon name="lni-check" size={15} color={colors.yellow} />}
                </TouchableOpacity>
              );
            })}
            <TouchableOpacity
              style={styles.pickerNewList}
              onPress={() => { setShowListPicker(false); setCreateListFromPicker(true); setCreateListModalVisible(true); }}
              activeOpacity={0.7}
            >
              <LniIcon name="lni-plus" size={15} color={colors.yellow} />
              <Text style={styles.pickerNewListText}>New List</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* ── Reminder picker modal ───────────────────────────────────────── */}
      <Modal
        visible={showReminderPicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowReminderPicker(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowReminderPicker(false)}
        >
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Remind Me</Text>
            {REMINDER_OPTIONS.map((option) => {
              const selected = addReminderOffset === option.value;
              return (
                <TouchableOpacity
                  key={String(option.value)}
                  style={styles.pickerOption}
                  onPress={() => { setAddReminderOffset(option.value); setShowReminderPicker(false); }}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.pickerOptionText, selected && styles.pickerOptionTextActive]}>
                    {option.label}
                  </Text>
                  {selected && <LniIcon name="lni-check" size={15} color={colors.yellow} />}
                </TouchableOpacity>
              );
            })}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* ── Create List modal (from Lists header) ───────────────────────── */}
      <Modal
        visible={createListModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setCreateListModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setCreateListModalVisible(false)}
        >
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>New List</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="List name"
              placeholderTextColor={colors.placeholder}
              value={createListName}
              onChangeText={setCreateListName}
              autoFocus
              returnKeyType="done"
              onSubmitEditing={handleCreateList}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancel}
                onPress={() => { setCreateListName(''); setCreateListModalVisible(false); }}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalCreate, !createListName.trim() && styles.modalCreateDisabled]}
                onPress={handleCreateList}
                disabled={!createListName.trim()}
              >
                <Text style={styles.modalCreateText}>Create</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

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
        <TouchableOpacity
          style={styles.sidebarItem}
          onPress={() => { closeSidebar(); router.push('/(tabs)/settings'); }}
        >
          <Text style={styles.sidebarItemText}>Settings</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.sidebarItem} onPress={handleLogout}>
          <Text style={styles.sidebarItemText}>Log Out</Text>
        </TouchableOpacity>

        {/* Photographer credit — shown only when wallpaper is loaded */}
        {wallpaper && <WallpaperCredit wallpaper={wallpaper} />}
      </Animated.View>
    </View>
    </ReadableBackground>
  );
}

// Text shadow applied to labels that sit directly over the wallpaper
// (no card background beneath them). Improves legibility on bright images.
const WALLPAPER_TEXT_SHADOW = {
  textShadowColor: 'rgba(0,0,0,0.75)',
  textShadowOffset: { width: 0, height: 1 },
  textShadowRadius: 6,
} as const;

function makeStyles(colors: ThemeColors, hasWallpaper: boolean) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: 'transparent',
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
      // Always white over the wallpaper; theme text when no image is present
      color: hasWallpaper ? '#FFFFFF' : colors.text,
      flexShrink: 1,
      ...(hasWallpaper && WALLPAPER_TEXT_SHADOW),
    },
    headerActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 16,
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
      paddingBottom: 32,
    },
    centered: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 24,
      paddingTop: 20,
      paddingBottom: 10,
    },
    sectionLabelRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    sectionLabel: {
      fontSize: 12,
      fontWeight: '700',
      color: hasWallpaper ? 'rgba(255,255,255,0.75)' : colors.muted,
      textTransform: 'uppercase',
      letterSpacing: 0.8,
      ...(hasWallpaper && WALLPAPER_TEXT_SHADOW),
    },
    emptyText: {
      fontSize: 14,
      color: hasWallpaper ? 'rgba(255,255,255,0.80)' : colors.muted,
      paddingHorizontal: 24,
      paddingBottom: 4,
      ...(hasWallpaper && WALLPAPER_TEXT_SHADOW),
    },
    listCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: 14,
      marginHorizontal: 24,
      marginBottom: 10,
      borderWidth: 1,
      borderColor: colors.border,
      gap: 12,
    },
    listIconWrap: {
      width: 36,
      height: 36,
      borderRadius: 8,
      backgroundColor: colors.background,
      alignItems: 'center',
      justifyContent: 'center',
    },
    listCardText: { flex: 1 },
    listCardName: {
      fontSize: 15,
      fontWeight: '600',
      color: colors.text,
    },
    listCardCount: {
      fontSize: 12,
      color: colors.muted,
      marginTop: 1,
    },
    input: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontSize: 15,
      color: colors.text,
      backgroundColor: colors.background,
    },
    inputDescription: {
      fontSize: 13,
      minHeight: 60,
      textAlignVertical: 'top',
    },
    editRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      marginBottom: 12,
    },
    editRowLabel: {
      fontSize: 13,
      color: colors.muted,
      width: 68,
    },
    priorityRow: {
      flexDirection: 'row',
      gap: 6,
    },
    priorityChip: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border,
    },
    priorityChipText: {
      fontSize: 13,
      color: colors.muted,
      fontWeight: '600',
    },
    priorityChipTextActive: {
      color: '#fff',
      fontWeight: '700',
    },
    dropdownButton: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
      paddingHorizontal: 10,
      paddingVertical: 8,
      backgroundColor: colors.background,
    },
    dropdownButtonText: {
      flex: 1,
      fontSize: 13,
      color: colors.text,
    },
    dueDateRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    dueDateButton: {
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.background,
    },
    dueDateButtonText: {
      fontSize: 13,
      color: colors.text,
    },
    editActions: {
      flexDirection: 'row',
      gap: 10,
      marginTop: 6,
    },
    saveButton: {
      flex: 1,
      alignItems: 'center',
      backgroundColor: colors.yellow,
      borderRadius: 10,
      paddingVertical: 12,
    },
    saveButtonDisabled: {
      backgroundColor: colors.disabled,
    },
    saveButtonText: {
      color: colors.black,
      fontWeight: '800',
      fontSize: 15,
    },
    cancelButton: {
      flex: 1,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 10,
      paddingVertical: 12,
    },
    cancelButtonText: {
      color: colors.muted,
      fontSize: 15,
      fontWeight: '600',
    },
    // ── List picker ───────────────────────────────────────────────────────────
    pickerOption: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 14,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    pickerOptionText: {
      fontSize: 16,
      color: colors.text,
    },
    pickerOptionTextActive: {
      fontWeight: '700',
      color: colors.yellow,
    },
    pickerNewList: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingVertical: 16,
    },
    pickerNewListText: {
      fontSize: 15,
      color: colors.yellow,
      fontWeight: '600',
    },
    // ── Create List modal ─────────────────────────────────────────────────────
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'center',
      paddingHorizontal: 32,
    },
    modalCard: {
      backgroundColor: colors.surface,
      borderRadius: 16,
      padding: 24,
    },
    modalTitle: {
      fontSize: 17,
      fontWeight: '700',
      color: colors.text,
      marginBottom: 16,
    },
    modalInput: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontSize: 15,
      color: colors.text,
      backgroundColor: colors.background,
      marginBottom: 12,
    },
    modalInputMultiline: {
      minHeight: 56,
      textAlignVertical: 'top',
      fontSize: 13,
    },
    modalActions: {
      flexDirection: 'row',
      gap: 10,
      justifyContent: 'flex-end',
    },
    modalCancel: {
      paddingHorizontal: 16,
      paddingVertical: 9,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border,
    },
    modalCancelText: {
      color: colors.muted,
      fontSize: 14,
    },
    modalCreate: {
      paddingHorizontal: 16,
      paddingVertical: 9,
      borderRadius: 8,
      backgroundColor: colors.yellow,
    },
    modalCreateDisabled: {
      backgroundColor: colors.disabled,
    },
    modalCreateText: {
      color: colors.black,
      fontWeight: '800',
      fontSize: 14,
    },
    // ── Sidebar ───────────────────────────────────────────────────────────────
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
      paddingBottom: 32,
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
