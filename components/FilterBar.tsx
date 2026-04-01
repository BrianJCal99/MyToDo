import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Filter } from '@/features/todos/todosSlice';
import {
  selectOverdueCount,
  selectHighPriorityActiveCount,
} from '@/features/todos/todosSelectors';
import { ThemeColors } from '@/constants/theme';
import { useThemeColors } from '@/hooks/use-theme-colors';
import { useAppSelector } from '@/store';

interface Props {
  filter: Filter;
  onSelect: (filter: Filter) => void;
}

const BASE_FILTERS: { label: string; value: Filter }[] = [
  { label: 'All', value: 'all' },
  { label: 'Active', value: 'active' },
  { label: 'Completed', value: 'completed' },
];

export default function FilterBar({ filter, onSelect }: Props) {
  const colors = useThemeColors();
  const styles = makeStyles(colors);

  const overdueCount = useAppSelector(selectOverdueCount);
  const highPriorityCount = useAppSelector(selectHighPriorityActiveCount);

  const smartFilters: { label: string; value: Filter; badge?: number }[] = [
    { label: 'Overdue', value: 'overdue', badge: overdueCount },
    { label: 'High Priority', value: 'high_priority', badge: highPriorityCount },
  ];

  const allFilters = [
    ...BASE_FILTERS.map((f) => ({ ...f, badge: undefined as number | undefined })),
    ...smartFilters,
  ];

  return (
    <View style={styles.wrapper}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {allFilters.map(({ label, value, badge }) => {
          const isActive = filter === value;
          const hasBadge = badge !== undefined && badge > 0;
          return (
            <TouchableOpacity
              key={value}
              style={[styles.button, isActive && styles.active]}
              onPress={() => onSelect(value)}
              activeOpacity={0.7}
            >
              <Text style={[styles.label, isActive && styles.activeLabel]}>{label}</Text>
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
    button: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      gap: 6,
    },
    active: {
      backgroundColor: colors.yellow,
      borderColor: colors.yellow,
    },
    label: {
      fontSize: 13,
      color: colors.muted,
      fontWeight: '500',
    },
    activeLabel: {
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
