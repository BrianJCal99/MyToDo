import { useState } from 'react';
import {
  Alert,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useAppDispatch, useAppSelector } from '@/store';
import { Todo, Priority, toggleTodo, updateTodo, deleteTodo } from '@/features/todos/todosSlice';
import { addList } from '@/features/lists/listsSlice';
import { ThemeColors, PRIORITY_COLORS } from '@/constants/theme';
import { useThemeColors } from '@/hooks/use-theme-colors';
import LniIcon from '@/components/LniIcon';
import { REMINDER_OPTIONS, getReminderLabel } from '@/services/notificationsService';

interface Props {
  todo: Todo;
}

const PRIORITIES: Priority[] = ['low', 'medium', 'high'];

function hasTimeSet(ts: number): boolean {
  const d = new Date(ts);
  return d.getHours() !== 0 || d.getMinutes() !== 0;
}

function formatDueDisplay(ts: number): string {
  const date = new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  if (hasTimeSet(ts)) {
    const time = new Date(ts).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
    return `${date}, ${time}`;
  }
  return date;
}

export default function TodoItem({ todo }: Props) {
  const dispatch = useAppDispatch();
  const colors = useThemeColors();
  const styles = makeStyles(colors);

  const lists = useAppSelector((state) => state.lists.lists);

  const [editOpen, setEditOpen] = useState(false);
  const [editTitle, setEditTitle] = useState(todo.title);
  const [editDescription, setEditDescription] = useState(todo.description ?? '');
  const [editPriority, setEditPriority] = useState<Priority>(todo.priority);
  const [editDueDate, setEditDueDate] = useState<number | null>(todo.dueDate);
  const [editListId, setEditListId] = useState(todo.listId);
  const [editReminderOffset, setEditReminderOffset] = useState<number | null>(todo.reminderOffset);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [showListPicker, setShowListPicker] = useState(false);
  const [showReminderPicker, setShowReminderPicker] = useState(false);
  const [showNewListModal, setShowNewListModal] = useState(false);
  const [newListName, setNewListName] = useState('');

  const isOverdue = !todo.completed && todo.dueDate !== null && todo.dueDate < Date.now();
  const listName = lists.find((l) => l.id === todo.listId)?.name;

  function openEdit() {
    setEditTitle(todo.title);
    setEditDescription(todo.description ?? '');
    setEditPriority(todo.priority);
    setEditDueDate(todo.dueDate);
    setEditListId(todo.listId);
    setEditReminderOffset(todo.reminderOffset);
    setShowDatePicker(false);
    setShowTimePicker(false);
    setEditOpen(true);
  }

  function handleSave() {
    if (!editTitle.trim()) return;
    dispatch(updateTodo({
      id: todo.id,
      title: editTitle,
      description: editDescription || undefined,
      priority: editPriority,
      dueDate: editDueDate,
      listId: editListId,
      reminderOffset: editReminderOffset,
    }));
    setEditOpen(false);
  }

  return (
    <>
      {/* ── Todo card ──────────────────────────────────────────────────────── */}
      <View style={styles.container}>
        <TouchableOpacity
          style={[styles.checkbox, todo.completed && styles.checkboxChecked]}
          onPress={() => dispatch(toggleTodo(todo.id))}
          activeOpacity={0.7}
        >
          {todo.completed && <LniIcon name="lni-check" size={13} color={colors.black} />}
        </TouchableOpacity>

        <View style={styles.textContainer}>
          <View style={styles.titleRow}>
            <View style={[styles.priorityDot, { backgroundColor: PRIORITY_COLORS[todo.priority] }]} />
            <Text style={[styles.title, todo.completed && styles.titleCompleted]} numberOfLines={2}>
              {todo.title}
            </Text>
          </View>

          {todo.description ? (
            <Text style={styles.description} numberOfLines={1}>{todo.description}</Text>
          ) : null}

          <View style={styles.metaRow}>
            {listName ? (
              <View style={styles.metaTag}>
                <Text style={styles.metaTagText}>{listName}</Text>
              </View>
            ) : null}
            {todo.dueDate !== null ? (
              <View style={[styles.metaTag, styles.metaTagRow, isOverdue && styles.metaTagOverdue]}>
                {isOverdue && <LniIcon name="lni-bolt-2" size={10} color="#F44336" />}
                <Text style={[styles.metaTagText, isOverdue && styles.metaTagTextOverdue]}>
                  {formatDueDisplay(todo.dueDate)}
                </Text>
              </View>
            ) : null}
            {todo.reminderOffset !== null && todo.dueDate !== null ? (
              <View style={[styles.metaTag, styles.metaTagRow]}>
                <LniIcon name="lni-alarm-1" size={10} color="#888" />
                <Text style={styles.metaTagText}>{getReminderLabel(todo.reminderOffset)}</Text>
              </View>
            ) : null}
          </View>
        </View>

        <View style={styles.actions}>
          <TouchableOpacity style={styles.actionButton} onPress={openEdit} hitSlop={8}>
            <LniIcon name="lni-pen-to-square" size={18} color={colors.muted} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() =>
              Alert.alert('Delete Task', `Delete "${todo.title}"?`, [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Delete', style: 'destructive', onPress: () => dispatch(deleteTodo(todo.id)) },
              ])
            }
            hitSlop={8}
          >
            <LniIcon name="lni-trash-3" size={18} color={colors.muted} />
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Edit modal ─────────────────────────────────────────────────────── */}
      <Modal
        visible={editOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setEditOpen(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setEditOpen(false)}
        >
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Edit Todo</Text>

            <TextInput
              style={styles.modalInput}
              value={editTitle}
              onChangeText={setEditTitle}
              autoFocus
              returnKeyType="next"
              placeholder="Title"
              placeholderTextColor={colors.placeholder}
            />

            <TextInput
              style={[styles.modalInput, styles.modalInputMultiline]}
              value={editDescription}
              onChangeText={setEditDescription}
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
                      editPriority === p && { backgroundColor: PRIORITY_COLORS[p], borderColor: PRIORITY_COLORS[p] },
                    ]}
                    onPress={() => setEditPriority(p)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.priorityChipText, editPriority === p && styles.priorityChipTextActive]}>
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
                  {lists.find((l) => l.id === editListId)?.name ?? 'Inbox'}
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
                    {editDueDate ? new Date(editDueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : 'Set date'}
                  </Text>
                </TouchableOpacity>
                {editDueDate !== null && (
                  <TouchableOpacity onPress={() => { setEditDueDate(null); setShowTimePicker(false); }} hitSlop={8}>
                    <LniIcon name="lni-xmark" size={15} color={colors.muted} />
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* Due time (only when date is set) */}
            {editDueDate !== null && (
              <View style={styles.editRow}>
                <Text style={styles.editRowLabel}>Due Time</Text>
                <View style={styles.dueDateRow}>
                  <TouchableOpacity style={styles.dueDateButton} onPress={() => setShowTimePicker(true)}>
                    <Text style={styles.dueDateButtonText}>
                      {hasTimeSet(editDueDate)
                        ? new Date(editDueDate).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
                        : 'Set time'}
                    </Text>
                  </TouchableOpacity>
                  {hasTimeSet(editDueDate) && (
                    <TouchableOpacity
                      onPress={() => {
                        const d = new Date(editDueDate);
                        d.setHours(0, 0, 0, 0);
                        setEditDueDate(d.getTime());
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
            {editDueDate !== null && (
              <View style={styles.editRow}>
                <Text style={styles.editRowLabel}>Reminder</Text>
                <TouchableOpacity
                  style={styles.dropdownButton}
                  onPress={() => setShowReminderPicker(true)}
                  activeOpacity={0.7}
                >
                  <LniIcon name="lni-alarm-1" size={13} color={colors.muted} />
                  <Text style={styles.dropdownButtonText}>
                    {getReminderLabel(editReminderOffset)}
                  </Text>
                  <LniIcon name="lni-chevron-down" size={13} color={colors.muted} />
                </TouchableOpacity>
              </View>
            )}

            {showDatePicker && (
              <DateTimePicker
                value={editDueDate ? new Date(editDueDate) : new Date()}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={(_, date) => {
                  setShowDatePicker(Platform.OS === 'ios');
                  if (date) {
                    const newDate = new Date(date);
                    if (editDueDate && hasTimeSet(editDueDate)) {
                      const existing = new Date(editDueDate);
                      newDate.setHours(existing.getHours(), existing.getMinutes(), 0, 0);
                    } else {
                      newDate.setHours(0, 0, 0, 0);
                    }
                    setEditDueDate(newDate.getTime());
                  }
                }}
              />
            )}

            {showTimePicker && editDueDate !== null && (
              <DateTimePicker
                value={new Date(editDueDate)}
                mode="time"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={(_, time) => {
                  setShowTimePicker(Platform.OS === 'ios');
                  if (time) {
                    const d = new Date(editDueDate);
                    d.setHours(time.getHours(), time.getMinutes(), 0, 0);
                    setEditDueDate(d.getTime());
                  }
                }}
              />
            )}

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => setEditOpen(false)}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalSave, !editTitle.trim() && styles.modalSaveDisabled]}
                onPress={handleSave}
                disabled={!editTitle.trim()}
              >
                <Text style={styles.modalSaveText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* ── Reminder picker ────────────────────────────────────────────────── */}
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
              const selected = editReminderOffset === option.value;
              return (
                <TouchableOpacity
                  key={String(option.value)}
                  style={styles.pickerOption}
                  onPress={() => { setEditReminderOffset(option.value); setShowReminderPicker(false); }}
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

      {/* ── List picker ────────────────────────────────────────────────────── */}
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
            <Text style={styles.modalTitle}>Move to List</Text>
            {lists.map((l) => {
              const selected = l.id === editListId;
              return (
                <TouchableOpacity
                  key={l.id}
                  style={styles.pickerOption}
                  onPress={() => { setEditListId(l.id); setShowListPicker(false); }}
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
              style={styles.newListButton}
              onPress={() => { setShowListPicker(false); setShowNewListModal(true); }}
              activeOpacity={0.7}
            >
              <LniIcon name="lni-plus" size={15} color={colors.yellow} />
              <Text style={styles.newListButtonText}>New List</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
      {/* ── New List modal ─────────────────────────────────────────────────── */}
      <Modal
        visible={showNewListModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowNewListModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowNewListModal(false)}
        >
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>New List</Text>
            <TextInput
              style={styles.modalInput}
              value={newListName}
              onChangeText={setNewListName}
              placeholder="List name"
              placeholderTextColor={colors.placeholder}
              autoFocus
              returnKeyType="done"
              onSubmitEditing={async () => {
                const name = newListName.trim();
                if (!name) return;
                const result = await dispatch(addList(name)).unwrap();
                setEditListId(result.id);
                setNewListName('');
                setShowNewListModal(false);
              }}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancel}
                onPress={() => { setNewListName(''); setShowNewListModal(false); }}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalSave, !newListName.trim() && styles.modalSaveDisabled]}
                disabled={!newListName.trim()}
                onPress={async () => {
                  const name = newListName.trim();
                  if (!name) return;
                  const result = await dispatch(addList(name)).unwrap();
                  setEditListId(result.id);
                  setNewListName('');
                  setShowNewListModal(false);
                }}
              >
                <Text style={styles.modalSaveText}>Create</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

function makeStyles(colors: ThemeColors) {
  return StyleSheet.create({
    // ── Card ──────────────────────────────────────────────────────────────────
    container: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: 14,
      marginHorizontal: 24,
      marginBottom: 10,
      borderWidth: 1,
      borderColor: colors.border,
    },
    checkbox: {
      width: 24,
      height: 24,
      borderRadius: 6,
      borderWidth: 2,
      borderColor: colors.yellow,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
      flexShrink: 0,
    },
    checkboxChecked: {
      backgroundColor: colors.yellow,
    },
    textContainer: {
      flex: 1,
      marginRight: 8,
    },
    titleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    title: {
      flex: 1,
      fontSize: 15,
      color: colors.text,
      fontWeight: '500',
    },
    titleCompleted: {
      textDecorationLine: 'line-through',
      color: colors.placeholder,
    },
    priorityDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      flexShrink: 0,
    },
    description: {
      fontSize: 13,
      color: colors.muted,
      marginTop: 2,
    },
    metaRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 6,
      marginTop: 4,
    },
    metaTag: {
      backgroundColor: colors.background,
      borderRadius: 4,
      paddingHorizontal: 5,
      paddingVertical: 1,
    },
    metaTagRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 3,
    },
    metaTagText: {
      fontSize: 11,
      color: colors.muted,
    },
    metaTagTextOverdue: {
      color: '#F44336',
    },
    metaTagOverdue: {
      backgroundColor: 'rgba(244,67,54,0.1)',
    },
    actions: {
      flexDirection: 'row',
      gap: 4,
    },
    actionButton: {
      padding: 4,
    },
    // ── Modal ─────────────────────────────────────────────────────────────────
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
      marginTop: 4,
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
    modalSave: {
      paddingHorizontal: 16,
      paddingVertical: 9,
      borderRadius: 8,
      backgroundColor: colors.yellow,
    },
    modalSaveDisabled: {
      backgroundColor: colors.disabled,
    },
    modalSaveText: {
      color: colors.black,
      fontWeight: '800',
      fontSize: 14,
    },
    // ── Edit fields ───────────────────────────────────────────────────────────
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
    newListButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingVertical: 14,
    },
    newListButtonText: {
      fontSize: 15,
      color: colors.yellow,
      fontWeight: '600',
    },
  });
}
