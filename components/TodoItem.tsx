import { useState } from 'react';
import { Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useAppDispatch, useAppSelector } from '@/store';
import { Todo, Priority, toggleTodo, updateTodo, deleteTodo } from '@/features/todos/todosSlice';
import { ThemeColors } from '@/constants/theme';
import { PRIORITY_COLORS } from '@/constants/theme';
import { useThemeColors } from '@/hooks/use-theme-colors';
import LniIcon from '@/components/LniIcon';

interface Props {
  todo: Todo;
}

const PRIORITY_LABELS: Record<Priority, string> = { low: 'L', medium: 'M', high: 'H' };
const PRIORITIES: Priority[] = ['low', 'medium', 'high'];

function formatDate(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export default function TodoItem({ todo }: Props) {
  const dispatch = useAppDispatch();
  const colors = useThemeColors();
  const styles = makeStyles(colors);

  const lists = useAppSelector((state) => state.lists.lists);

  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(todo.title);
  const [editDescription, setEditDescription] = useState(todo.description ?? '');
  const [editPriority, setEditPriority] = useState<Priority>(todo.priority);
  const [editDueDate, setEditDueDate] = useState<number | null>(todo.dueDate);
  const [editListId, setEditListId] = useState(todo.listId);
  const [showDatePicker, setShowDatePicker] = useState(false);

  const isOverdue =
    !todo.completed && todo.dueDate !== null && todo.dueDate < Date.now();

  const listName = lists.find((l) => l.id === todo.listId)?.name;

  function handleSave() {
    if (!editTitle.trim()) return;
    dispatch(
      updateTodo({
        id: todo.id,
        title: editTitle,
        description: editDescription || undefined,
        priority: editPriority,
        dueDate: editDueDate,
        listId: editListId,
      })
    );
    setIsEditing(false);
  }

  function handleCancel() {
    setEditTitle(todo.title);
    setEditDescription(todo.description ?? '');
    setEditPriority(todo.priority);
    setEditDueDate(todo.dueDate);
    setEditListId(todo.listId);
    setIsEditing(false);
  }

  if (isEditing) {
    return (
      <View style={styles.editContainer}>
        <TextInput
          style={styles.editInput}
          value={editTitle}
          onChangeText={setEditTitle}
          autoFocus
          returnKeyType="next"
          placeholder="Title"
          placeholderTextColor={colors.placeholder}
        />
        <TextInput
          style={[styles.editInput, styles.editDescriptionInput]}
          value={editDescription}
          onChangeText={setEditDescription}
          placeholder="Description (optional)"
          placeholderTextColor={colors.placeholder}
          returnKeyType="done"
        />

        {/* Priority selector */}
        <View style={styles.editRow}>
          <Text style={styles.editRowLabel}>Priority</Text>
          <View style={styles.priorityRow}>
            {PRIORITIES.map((p) => (
              <TouchableOpacity
                key={p}
                style={[
                  styles.priorityChip,
                  editPriority === p && { backgroundColor: PRIORITY_COLORS[p] },
                ]}
                onPress={() => setEditPriority(p)}
              >
                <Text
                  style={[
                    styles.priorityChipText,
                    editPriority === p && styles.priorityChipTextActive,
                  ]}
                >
                  {p.charAt(0).toUpperCase() + p.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* List selector */}
        <View style={styles.editRow}>
          <Text style={styles.editRowLabel}>List</Text>
          <View style={styles.listChipRow}>
            {lists.map((l) => (
              <TouchableOpacity
                key={l.id}
                style={[styles.priorityChip, editListId === l.id && styles.listChipActive]}
                onPress={() => setEditListId(l.id)}
              >
                <Text
                  style={[
                    styles.priorityChipText,
                    editListId === l.id && styles.priorityChipTextActive,
                  ]}
                >
                  {l.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Due date selector */}
        <View style={styles.editRow}>
          <Text style={styles.editRowLabel}>Due Date</Text>
          <View style={styles.dueDateRow}>
            <TouchableOpacity
              style={styles.dueDateButton}
              onPress={() => setShowDatePicker(true)}
            >
              <Text style={styles.dueDateButtonText}>
                {editDueDate ? formatDate(editDueDate) : 'Set date'}
              </Text>
            </TouchableOpacity>
            {editDueDate !== null && (
              <TouchableOpacity onPress={() => setEditDueDate(null)} hitSlop={8}>
                <LniIcon name="lni-xmark" size={15} color={colors.muted} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {showDatePicker && (
          <DateTimePicker
            value={editDueDate ? new Date(editDueDate) : new Date()}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={(_, date) => {
              setShowDatePicker(Platform.OS === 'ios');
              if (date) setEditDueDate(date.getTime());
            }}
          />
        )}

        <View style={styles.editActions}>
          <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
            <Text style={styles.saveButtonText}>Save</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.cancelButton} onPress={handleCancel}>
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, isOverdue && styles.containerOverdue]}>
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
          <Text style={styles.description} numberOfLines={1}>
            {todo.description}
          </Text>
        ) : null}

        <View style={styles.metaRow}>
          {listName ? (
            <View style={styles.metaTag}>
              <Text style={styles.metaTagText}>{listName}</Text>
            </View>
          ) : null}
          {todo.dueDate !== null ? (
            <View style={[styles.metaTag, styles.metaTagRow, isOverdue && styles.metaTagOverdue]}>
              {isOverdue && (
                <LniIcon name="lni-bolt-2" size={10} color="#F44336" style={styles.overdueIcon} />
              )}
              <Text style={[styles.metaTagText, isOverdue && styles.metaTagTextOverdue]}>
                {formatDate(todo.dueDate)}
              </Text>
            </View>
          ) : null}
        </View>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity style={styles.actionButton} onPress={() => setIsEditing(true)} hitSlop={8}>
          <LniIcon name="lni-pen-to-square" size={18} color={colors.muted} />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => dispatch(deleteTodo(todo.id))}
          hitSlop={8}
        >
          <LniIcon name="lni-trash-3" size={18} color={colors.muted} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

function makeStyles(colors: ThemeColors) {
  return StyleSheet.create({
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
    containerOverdue: {
      borderColor: '#F44336',
      borderWidth: 1.5,
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
    overdueIcon: {
      // ensures the bolt icon sits inline with the text
    },
    actions: {
      flexDirection: 'row',
      gap: 4,
    },
    actionButton: {
      padding: 4,
    },
    // ─── Edit mode ──────────────────────────────────────────────────────────
    editContainer: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: 14,
      marginHorizontal: 24,
      marginBottom: 10,
      borderWidth: 1,
      borderColor: colors.yellow,
    },
    editInput: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
      paddingHorizontal: 10,
      paddingVertical: 8,
      fontSize: 15,
      color: colors.text,
      backgroundColor: colors.background,
      marginBottom: 8,
    },
    editDescriptionInput: {
      fontSize: 13,
      color: colors.muted,
    },
    editRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 10,
      gap: 10,
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
    listChipRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 6,
      flex: 1,
    },
    listChipActive: {
      backgroundColor: colors.yellow,
      borderColor: colors.yellow,
    },
    priorityChip: {
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border,
    },
    priorityChipText: {
      fontSize: 12,
      color: colors.muted,
      fontWeight: '600',
    },
    priorityChipTextActive: {
      color: '#fff',
    },
    dueDateRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    dueDateButton: {
      paddingHorizontal: 10,
      paddingVertical: 4,
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
      gap: 8,
      justifyContent: 'flex-end',
      marginTop: 4,
    },
    saveButton: {
      backgroundColor: colors.yellow,
      borderRadius: 8,
      paddingHorizontal: 16,
      paddingVertical: 8,
    },
    saveButtonText: {
      color: colors.black,
      fontWeight: '800',
      fontSize: 14,
    },
    cancelButton: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
      paddingHorizontal: 16,
      paddingVertical: 8,
    },
    cancelButtonText: {
      color: colors.muted,
      fontSize: 14,
    },
  });
}
