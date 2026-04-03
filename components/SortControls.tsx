import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useAppDispatch, useAppSelector } from '@/store';
import { setSortBy, setSortOrder, SortBy, SortOrder } from '@/features/todos/todosSlice';
import { ThemeColors } from '@/constants/theme';
import { useThemeColors } from '@/hooks/use-theme-colors';
import LniIcon from '@/components/LniIcon';

const SORT_OPTIONS: { label: string; value: SortBy }[] = [
  { label: 'Date Added', value: 'createdAt' },
  { label: 'Updated', value: 'updatedAt' },
  { label: 'Priority', value: 'priority' },
  { label: 'Title', value: 'title' },
  { label: 'Due Date', value: 'dueDate' },
];

export default function SortControls() {
  const dispatch = useAppDispatch();
  const colors = useThemeColors();
  const styles = makeStyles(colors);

  const sortBy = useAppSelector((state) => state.todos.sortBy);
  const sortOrder = useAppSelector((state) => state.todos.sortOrder);

  function handleSortByPress(value: SortBy) {
    if (sortBy === value) {
      // Toggle direction when tapping the already-active sort
      dispatch(setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc'));
    } else {
      dispatch(setSortBy(value));
    }
  }

  return (
    <View style={styles.wrapper}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {SORT_OPTIONS.map(({ label, value }) => {
          const isActive = sortBy === value;
          return (
            <TouchableOpacity
              key={value}
              style={[styles.chip, isActive && styles.chipActive]}
              onPress={() => handleSortByPress(value)}
              activeOpacity={0.7}
            >
              <Text style={[styles.chipText, isActive && styles.chipTextActive]}>{label}</Text>
              {isActive && (
                <LniIcon
                  name={sortOrder === 'desc' ? 'lni-arrow-downward' : 'lni-arrow-upward'}
                  size={11}
                  color={isActive ? colors.black : colors.muted}
                />
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

function makeStyles(colors: ThemeColors) {
  return StyleSheet.create({
    wrapper: {
      marginBottom: 12,
    },
    scrollContent: {
      paddingHorizontal: 24,
      gap: 8,
    },
    chip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 12,
      paddingVertical: 5,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
    },
    chipActive: {
      borderColor: colors.yellow,
      backgroundColor: colors.yellow,
    },
    chipText: {
      fontSize: 12,
      color: colors.muted,
      fontWeight: '500',
    },
    chipTextActive: {
      color: colors.black,
      fontWeight: '700',
    },
  });
}
