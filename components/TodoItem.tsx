import { useState } from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useAppDispatch } from '@/store';
import { Todo, toggleTodo, updateTodo, deleteTodo } from '@/features/todos/todosSlice';
import { ThemeColors } from '@/constants/theme';
import { useThemeColors } from '@/hooks/use-theme-colors';

interface Props {
  todo: Todo;
}

export default function TodoItem({ todo }: Props) {
  const dispatch = useAppDispatch();
  const colors = useThemeColors();
  const styles = makeStyles(colors);

  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(todo.title);
  const [editDescription, setEditDescription] = useState(todo.description ?? '');

  function handleSave() {
    if (!editTitle.trim()) return;
    dispatch(updateTodo({ id: todo.id, title: editTitle, description: editDescription || undefined }));
    setIsEditing(false);
  }

  function handleCancel() {
    setEditTitle(todo.title);
    setEditDescription(todo.description ?? '');
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
          onSubmitEditing={handleSave}
        />
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
    <View style={styles.container}>
      <TouchableOpacity
        style={[styles.checkbox, todo.completed && styles.checkboxChecked]}
        onPress={() => dispatch(toggleTodo(todo.id))}
        activeOpacity={0.7}
      >
        {todo.completed && <Text style={styles.checkmark}>✓</Text>}
      </TouchableOpacity>

      <View style={styles.textContainer}>
        <Text style={[styles.title, todo.completed && styles.titleCompleted]} numberOfLines={2}>
          {todo.title}
        </Text>
        {todo.description ? (
          <Text style={styles.description} numberOfLines={1}>{todo.description}</Text>
        ) : null}
      </View>

      <View style={styles.actions}>
        <TouchableOpacity style={styles.actionButton} onPress={() => setIsEditing(true)} hitSlop={8}>
          <Text style={styles.actionIcon}>✏️</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton} onPress={() => dispatch(deleteTodo(todo.id))} hitSlop={8}>
          <Text style={styles.actionIcon}>🗑️</Text>
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
    checkmark: {
      color: colors.black,
      fontSize: 13,
      fontWeight: '900',
    },
    textContainer: {
      flex: 1,
      marginRight: 8,
    },
    title: {
      fontSize: 15,
      color: colors.text,
      fontWeight: '500',
    },
    titleCompleted: {
      textDecorationLine: 'line-through',
      color: colors.placeholder,
    },
    description: {
      fontSize: 13,
      color: colors.muted,
      marginTop: 2,
    },
    actions: {
      flexDirection: 'row',
      gap: 4,
    },
    actionButton: {
      padding: 4,
    },
    actionIcon: {
      fontSize: 16,
    },
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
    editActions: {
      flexDirection: 'row',
      gap: 8,
      justifyContent: 'flex-end',
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
