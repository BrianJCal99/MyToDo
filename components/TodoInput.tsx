import { useState } from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  KeyboardAvoidingView,
} from 'react-native';
import { useAppDispatch } from '@/store';
import { addTodo } from '@/features/todos/todosSlice';
import { ThemeColors } from '@/constants/theme';
import { useThemeColors } from '@/hooks/use-theme-colors';

export default function TodoInput() {
  const dispatch = useAppDispatch();
  const colors = useThemeColors();
  const styles = makeStyles(colors);

  const [title, setTitle] = useState('');

  const canAdd = title.trim().length > 0;

  function handleAdd() {
    if (!canAdd) return;
    dispatch(addTodo({ title }));
    setTitle('');
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
  });
}
