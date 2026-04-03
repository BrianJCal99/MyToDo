import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Filter, PriorityFilter } from '@/features/todos/todosSlice';
import {
  selectFilter,
  selectPriorityFilter,
  selectOverdueCount,
} from '@/features/todos/todosSelectors';
import { ThemeColors, PRIORITY_COLORS } from '@/constants/theme';
import { useThemeColors } from '@/hooks/use-theme-colors';
import { useAppDispatch, useAppSelector } from '@/store';
import { setFilter, setPriorityFilter } from '@/features/todos/todosSlice';

const STATUS_FILTERS: { label: string; value: Filter }[] = [
  { label: 'All', value: 'all' },
  { label: 'Active', value: 'active' },
  { label: 'Completed', value: 'completed' },
];

const PRIORITY_FILTERS: { label: string; value: PriorityFilter }[] = [
  { label: 'All Priorities', value: 'all' },
  { label: 'Low', value: 'low' },
  { label: 'Medium', value: 'medium' },
  { label: 'High', value: 'high' },
];

export default function FilterBar() {
  const dispatch = useAppDispatch();
  const colors = useThemeColors();
  const styles = makeStyles(colors);

  const filter = useAppSelector(selectFilter);
  const priorityFilter = useAppSelector(selectPriorityFilter);
  const overdueCount = useAppSelector(selectOverdueCount);

  const smartFilters: { label: string; value: Filter; badge?: number }[] = [
    { label: 'Overdue', value: 'overdue', badge: overdueCount },
  ];

  const allStatusFilters = [
    ...STATUS_FILTERS.map((f) => ({ ...f, badge: undefined as number | undefined })),
    ...smartFilters,
  ];

  function priorityActiveColor(value: PriorityFilter): string {
    if (value === 'all') return colors.yellow;
    return PRIORITY_COLORS[value];
  }

  return (
    <View style={styles.container}>
      {/* Status filter row */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {allStatusFilters.map(({ label, value, badge }) => {
          const isActive = filter === value;
          const hasBadge = badge !== undefined && badge > 0;
          return (
            <TouchableOpacity
              key={value}
              style={[styles.chip, isActive && styles.chipActiveYellow]}
              onPress={() => dispatch(setFilter(value))}
              activeOpacity={0.7}
            >
              <Text style={[styles.chipText, isActive && styles.chipTextActiveOnYellow]}>
                {label}
              </Text>
              {hasBadge && (
                <View style={[styles.badge, isActive && styles.badgeActive]}>
                  <Text style={[styles.badgeText, isActive && styles.badgeTextActive]}>
                    {badge}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Priority filter row */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, styles.priorityRow]}
      >
        {PRIORITY_FILTERS.map(({ label, value }) => {
          const isActive = priorityFilter === value;
          const activeColor = priorityActiveColor(value);
          return (
            <TouchableOpacity
              key={value}
              style={[
                styles.chip,
                isActive && { backgroundColor: activeColor, borderColor: activeColor },
              ]}
              onPress={() => dispatch(setPriorityFilter(value))}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.chipText,
                  isActive && { color: value === 'all' ? colors.black : '#FFFFFF', fontWeight: '700' },
                ]}
              >
                {label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

function makeStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: {
      marginBottom: 4,
    },
    scrollContent: {
      paddingHorizontal: 24,
      gap: 8,
    },
    priorityRow: {
      marginTop: 8,
    },
    chip: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 14,
      paddingVertical: 7,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      gap: 6,
    },
    chipActiveYellow: {
      backgroundColor: colors.yellow,
      borderColor: colors.yellow,
    },
    chipText: {
      fontSize: 13,
      color: colors.muted,
      fontWeight: '500',
    },
    chipTextActiveOnYellow: {
      color: colors.black,
      fontWeight: '800',
    },
    badge: {
      backgroundColor: colors.border,
      borderRadius: 10,
      paddingHorizontal: 6,
      paddingVertical: 1,
      minWidth: 18,
      alignItems: 'center',
    },
    badgeActive: {
      backgroundColor: colors.black,
    },
    badgeText: {
      fontSize: 11,
      color: colors.muted,
      fontWeight: '700',
    },
    badgeTextActive: {
      color: colors.yellow,
    },
  });
}
