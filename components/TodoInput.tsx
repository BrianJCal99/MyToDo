import { useState } from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  KeyboardAvoidingView,
} from 'react-native';
import { useAppDispatch, useAppSelector } from '@/store';
import { addTodo, Priority } from '@/features/todos/todosSlice';
import { ThemeColors } from '@/constants/theme';
import { PRIORITY_COLORS } from '@/constants/theme';
import { useThemeColors } from '@/hooks/use-theme-colors';

const PRIORITIES: { label: string; value: Priority }[] = [
  { label: 'Low', value: 'low' },
  { label: 'Med', value: 'medium' },
  { label: 'High', value: 'high' },
];

export default function TodoInput() {
  const dispatch = useAppDispatch();
  const colors = useThemeColors();
  const styles = makeStyles(colors);

  const activeListId = useAppSelector((state) => state.lists.activeListId);

  const [title, setTitle] = useState('');
  const [priority, setPriority] = useState<Priority>('medium');

  const canAdd = title.trim().length > 0;

  function handleAdd() {
    if (!canAdd) return;
    dispatch(addTodo({ title, priority, listId: activeListId ?? undefined }));
    setTitle('');
    setPriority('medium');
  }

  return (
    <KeyboardAvoidingView behavior="padding" style={styles.wrapper}>
      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          placeholder="Add a new to-do..."
          placeholderTextColor={colors.placeholder}
          value={title}
          onChangeText={setTitle}
          onSubmitEditing={handleAdd}
          returnKeyType="done"
        />
        <TouchableOpacity
          style={[styles.addButton, !canAdd && styles.addButtonDisabled]}
          onPress={handleAdd}
          activeOpacity={0.8}
          disabled={!canAdd}
        >
          <Text style={[styles.addButtonText, !canAdd && styles.addButtonTextDisabled]}>Add</Text>
        </TouchableOpacity>
      </View>

      {/* Priority quick-select */}
      <View style={styles.priorityRow}>
        <Text style={styles.priorityLabel}>Priority:</Text>
        {PRIORITIES.map(({ label, value }) => (
          <TouchableOpacity
            key={value}
            style={[
              styles.priorityChip,
              priority === value && { backgroundColor: PRIORITY_COLORS[value] },
            ]}
            onPress={() => setPriority(value)}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.priorityChipText,
                priority === value && styles.priorityChipTextActive,
              ]}
            >
              {label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </KeyboardAvoidingView>
  );
}

function makeStyles(colors: ThemeColors) {
  return StyleSheet.create({
    wrapper: {
      paddingHorizontal: 24,
      marginBottom: 12,
    },
    inputRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      marginBottom: 8,
    },
    input: {
      flex: 1,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: 12,
      fontSize: 15,
      color: colors.text,
      backgroundColor: colors.surface,
    },
    addButton: {
      backgroundColor: colors.yellow,
      borderRadius: 12,
      paddingHorizontal: 18,
      paddingVertical: 12,
    },
    addButtonDisabled: {
      backgroundColor: colors.disabled,
    },
    addButtonText: {
      color: colors.black,
      fontWeight: '800',
      fontSize: 15,
    },
    addButtonTextDisabled: {
      color: colors.disabledText,
    },
    priorityRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    priorityLabel: {
      fontSize: 12,
      color: colors.muted,
      marginRight: 2,
    },
    priorityChip: {
      paddingHorizontal: 10,
      paddingVertical: 3,
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
      fontWeight: '700',
    },
  });
}
