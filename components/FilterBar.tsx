import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Filter } from '@/features/todos/todosSlice';
import { ThemeColors } from '@/constants/theme';
import { useThemeColors } from '@/hooks/use-theme-colors';

interface Props {
  filter: Filter;
  onSelect: (filter: Filter) => void;
}

const FILTERS: { label: string; value: Filter }[] = [
  { label: 'All', value: 'all' },
  { label: 'Active', value: 'active' },
  { label: 'Completed', value: 'completed' },
];

export default function FilterBar({ filter, onSelect }: Props) {
  const colors = useThemeColors();
  const styles = makeStyles(colors);

  return (
    <View style={styles.container}>
      {FILTERS.map(({ label, value }) => (
        <TouchableOpacity
          key={value}
          style={[styles.button, filter === value && styles.active]}
          onPress={() => onSelect(value)}
          activeOpacity={0.7}
        >
          <Text style={[styles.label, filter === value && styles.activeLabel]}>{label}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

function makeStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: {
      flexDirection: 'row',
      backgroundColor: colors.surface,
      borderRadius: 10,
      padding: 3,
      marginHorizontal: 24,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: colors.border,
    },
    button: {
      flex: 1,
      paddingVertical: 8,
      alignItems: 'center',
      borderRadius: 8,
    },
    active: {
      backgroundColor: colors.yellow,
    },
    label: {
      fontSize: 14,
      color: colors.muted,
      fontWeight: '500',
    },
    activeLabel: {
      color: colors.black,
      fontWeight: '800',
    },
  });
}
