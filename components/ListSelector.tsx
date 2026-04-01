import { useRef, useState } from 'react';
import {
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Modal,
} from 'react-native';
import LniIcon from '@/components/LniIcon';
import { useAppDispatch, useAppSelector } from '@/store';
import { setActiveListId, addList, deleteList, DEFAULT_LIST_ID } from '@/features/lists/listsSlice';
import { ThemeColors } from '@/constants/theme';
import { useThemeColors } from '@/hooks/use-theme-colors';

export default function ListSelector() {
  const dispatch = useAppDispatch();
  const colors = useThemeColors();
  const styles = makeStyles(colors);

  const lists = useAppSelector((state) => state.lists.lists);
  const activeListId = useAppSelector((state) => state.lists.activeListId);

  const [addModalVisible, setAddModalVisible] = useState(false);
  const [newListName, setNewListName] = useState('');

  function handleSelect(id: string | null) {
    dispatch(setActiveListId(id));
  }

  function handleAdd() {
    const name = newListName.trim();
    if (!name) return;
    dispatch(addList(name));
    setNewListName('');
    setAddModalVisible(false);
  }

  function handleLongPress(id: string, name: string) {
    if (id === DEFAULT_LIST_ID) return;
    Alert.alert(`Delete "${name}"?`, 'Todos in this list will move to All Todos view.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          dispatch(deleteList(id));
        },
      },
    ]);
  }

  const allItem = { id: null as null, name: 'All' };

  return (
    <View style={styles.wrapper}>
      <FlatList
        horizontal
        showsHorizontalScrollIndicator={false}
        data={[allItem, ...lists]}
        keyExtractor={(item) => item.id ?? '__all__'}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => {
          const isActive = item.id === null ? activeListId === null : activeListId === item.id;
          return (
            <TouchableOpacity
              style={[styles.pill, isActive && styles.pillActive]}
              onPress={() => handleSelect(item.id)}
              onLongPress={() => item.id && handleLongPress(item.id, item.name)}
              activeOpacity={0.7}
            >
              <Text style={[styles.pillText, isActive && styles.pillTextActive]}>
                {item.name}
              </Text>
            </TouchableOpacity>
          );
        }}
      />

      <TouchableOpacity style={styles.addButton} onPress={() => setAddModalVisible(true)} hitSlop={8}>
        <LniIcon name="lni-plus" size={18} color={colors.yellow} />
      </TouchableOpacity>

      <Modal
        visible={addModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setAddModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setAddModalVisible(false)}
        >
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>New List</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="List name"
              placeholderTextColor={colors.placeholder}
              value={newListName}
              onChangeText={setNewListName}
              autoFocus
              returnKeyType="done"
              onSubmitEditing={handleAdd}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancel}
                onPress={() => { setNewListName(''); setAddModalVisible(false); }}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalCreate, !newListName.trim() && styles.modalCreateDisabled]}
                onPress={handleAdd}
                disabled={!newListName.trim()}
              >
                <Text style={styles.modalCreateText}>Create</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

function makeStyles(colors: ThemeColors) {
  return StyleSheet.create({
    wrapper: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingLeft: 24,
      marginBottom: 12,
    },
    listContent: {
      paddingRight: 8,
      gap: 8,
    },
    pill: {
      paddingHorizontal: 14,
      paddingVertical: 6,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
    },
    pillActive: {
      backgroundColor: colors.yellow,
      borderColor: colors.yellow,
    },
    pillText: {
      fontSize: 13,
      color: colors.muted,
      fontWeight: '500',
    },
    pillTextActive: {
      color: colors.black,
      fontWeight: '700',
    },
    addButton: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
      marginHorizontal: 8,
    },
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
      marginBottom: 16,
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
  });
}
