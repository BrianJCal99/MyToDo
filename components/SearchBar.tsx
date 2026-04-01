import { StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import { useAppDispatch, useAppSelector } from '@/store';
import { setSearchQuery } from '@/features/todos/todosSlice';
import { ThemeColors } from '@/constants/theme';
import { useThemeColors } from '@/hooks/use-theme-colors';
import LniIcon from '@/components/LniIcon';

export default function SearchBar() {
  const dispatch = useAppDispatch();
  const colors = useThemeColors();
  const styles = makeStyles(colors);

  const searchQuery = useAppSelector((state) => state.todos.searchQuery);

  return (
    <View style={styles.container}>
      <LniIcon name="lni-search-1" size={16} color={colors.placeholder} style={styles.icon} />
      <TextInput
        style={styles.input}
        placeholder="Search todos..."
        placeholderTextColor={colors.placeholder}
        value={searchQuery}
        onChangeText={(text) => dispatch(setSearchQuery(text))}
        returnKeyType="search"
        clearButtonMode="never"
      />
      {searchQuery.length > 0 && (
        <TouchableOpacity onPress={() => dispatch(setSearchQuery(''))} hitSlop={8}>
          <LniIcon name="lni-xmark" size={16} color={colors.muted} />
        </TouchableOpacity>
      )}
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
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 12,
      marginHorizontal: 24,
      marginBottom: 12,
    },
    icon: {
      marginRight: 8,
    },
    input: {
      flex: 1,
      paddingVertical: 10,
      fontSize: 14,
      color: colors.text,
    },
  });
}
