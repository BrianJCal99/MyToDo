import LniIcon from "@/components/LniIcon";
import { PRIORITY_COLORS, ThemeColors } from "@/constants/theme";
import {
  Filter,
  PriorityFilter,
  setFilter,
  setPriorityFilter,
  setSortBy,
  setSortOrder,
  SortBy,
} from "@/features/todos/todosSlice";
import { useThemeColors } from "@/hooks/use-theme-colors";
import { useAppDispatch, useAppSelector } from "@/store";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";

interface Props {
  visible: boolean;
  onClose: () => void;
}

// ─── Config ───────────────────────────────────────────────────────────────────

const STATUS_OPTIONS: { label: string; value: Filter; icon: string }[] = [
  { label: "All", value: "all", icon: "lni-layout-9" },
  { label: "Active", value: "active", icon: "lni-tower-broadcast-1" },
  { label: "Completed", value: "completed", icon: "lni-check-circle-1" },
  { label: "Due Today", value: "due_today", icon: "lni-calendar-days" },
  { label: "Overdue", value: "overdue", icon: "lni-alarm-1" },
];

const PRIORITY_OPTIONS: {
  label: string;
  value: PriorityFilter;
  icon: string;
}[] = [
  { label: "All", value: "all", icon: "lni-layout-9" },
  { label: "Low", value: "low", icon: "lni-arrow-downward" },
  { label: "Medium", value: "medium", icon: "lni-minus" },
  { label: "High", value: "high", icon: "lni-arrow-upward" },
];

const SORT_OPTIONS: { label: string; value: SortBy; icon: string }[] = [
  { label: "Date Added", value: "createdAt", icon: "lni-calendar-days" },
  { label: "Updated", value: "updatedAt", icon: "lni-pencil-1" },
  { label: "Priority", value: "priority", icon: "lni-sort-high-to-low" },
  { label: "Title", value: "title", icon: "lni-sort-alphabetical" },
  { label: "Due Date", value: "dueDate", icon: "lni-alarm-1" },
];

// ─── Component ────────────────────────────────────────────────────────────────

export default function FilterSortModal({ visible, onClose }: Props) {
  const dispatch = useAppDispatch();
  const colors = useThemeColors();
  const { bottom } = useSafeAreaInsets();
  const styles = makeStyles(colors, bottom);

  const filter = useAppSelector((s) => s.todos.filter);
  const priorityFilter = useAppSelector((s) => s.todos.priorityFilter);
  const sortBy = useAppSelector((s) => s.todos.sortBy);
  const sortOrder = useAppSelector((s) => s.todos.sortOrder);

  function handleSortPress(value: SortBy) {
    if (sortBy === value) {
      dispatch(setSortOrder(sortOrder === "asc" ? "desc" : "asc"));
    } else {
      dispatch(setSortBy(value));
    }
  }

  function handleReset() {
    dispatch(setFilter("all"));
    dispatch(setPriorityFilter("all"));
    dispatch(setSortBy("createdAt"));
    dispatch(setSortOrder("desc"));
  }

  function priorityChipColor(value: PriorityFilter): string {
    if (value === "all") return colors.yellow;
    return PRIORITY_COLORS[value];
  }

  function priorityTextColor(value: PriorityFilter): string {
    return value === "all" ? colors.black : "#FFFFFF";
  }

  const isDefault =
    filter === "all" &&
    priorityFilter === "all" &&
    sortBy === "createdAt" &&
    sortOrder === "desc";

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.backdrop} />
      </TouchableWithoutFeedback>

      <View style={styles.sheet}>
        {/* Drag handle */}
        <View style={styles.handle} />

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Filters & Sort</Text>
          <TouchableOpacity
            onPress={onClose}
            hitSlop={12}
            style={styles.closeBtn}
          >
            <LniIcon name="lni-xmark" size={18} color={colors.muted} />
          </TouchableOpacity>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          bounces={false}
        >
          {/* ── Status ─────────────────────────────────────────────────── */}
          <Text style={styles.sectionLabel}>Status</Text>
          <View style={styles.chipRow}>
            {STATUS_OPTIONS.map(({ label, value, icon }) => {
              const active = filter === value;
              return (
                <TouchableOpacity
                  key={value}
                  style={[styles.chip, active && styles.chipActiveYellow]}
                  onPress={() => dispatch(setFilter(value))}
                  activeOpacity={0.7}
                >
                  <LniIcon
                    name={icon}
                    size={13}
                    color={active ? colors.black : colors.muted}
                  />
                  <Text
                    style={[styles.chipText, active && styles.chipTextOnYellow]}
                  >
                    {label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* ── Priority ────────────────────────────────────────────────── */}
          <Text style={[styles.sectionLabel, styles.sectionLabelSpaced]}>
            Priority
          </Text>
          <View style={styles.chipRow}>
            {PRIORITY_OPTIONS.map(({ label, value, icon }) => {
              const active = priorityFilter === value;
              const bg = priorityChipColor(value);
              const textCol = priorityTextColor(value);
              return (
                <TouchableOpacity
                  key={value}
                  style={[
                    styles.chip,
                    active && { backgroundColor: bg, borderColor: bg },
                  ]}
                  onPress={() => dispatch(setPriorityFilter(value))}
                  activeOpacity={0.7}
                >
                  <LniIcon
                    name={icon}
                    size={13}
                    color={active ? textCol : colors.muted}
                  />
                  <Text
                    style={[
                      styles.chipText,
                      active && { color: textCol, fontWeight: "700" },
                    ]}
                  >
                    {label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* ── Sort by ─────────────────────────────────────────────────── */}
          <Text style={[styles.sectionLabel, styles.sectionLabelSpaced]}>
            Sort by
          </Text>
          <View style={styles.chipRow}>
            {SORT_OPTIONS.map(({ label, value, icon }) => {
              const active = sortBy === value;
              return (
                <TouchableOpacity
                  key={value}
                  style={[styles.chip, active && styles.chipActiveYellow]}
                  onPress={() => handleSortPress(value)}
                  activeOpacity={0.7}
                >
                  <LniIcon
                    name={icon}
                    size={13}
                    color={active ? colors.black : colors.muted}
                  />
                  <Text
                    style={[styles.chipText, active && styles.chipTextOnYellow]}
                  >
                    {label}
                  </Text>
                  {active && (
                    <LniIcon
                      name={
                        sortOrder === "asc"
                          ? "lni-arrow-upward"
                          : "lni-arrow-downward"
                      }
                      size={11}
                      color={colors.black}
                    />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>

        {/* Footer */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.resetBtn, isDefault && styles.resetBtnDisabled]}
            onPress={handleReset}
            disabled={isDefault}
            activeOpacity={0.7}
          >
            <Text
              style={[styles.resetText, isDefault && styles.resetTextDisabled]}
            >
              Reset all
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.doneBtn}
            onPress={onClose}
            activeOpacity={0.8}
          >
            <Text style={styles.doneText}>Done</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

function makeStyles(colors: ThemeColors, bottomInset: number) {
  return StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.45)",
    },
    sheet: {
      backgroundColor: colors.surface,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      paddingBottom: 16 + bottomInset,
      maxHeight: "80%",
    },
    handle: {
      width: 36,
      height: 4,
      borderRadius: 2,
      backgroundColor: colors.border,
      alignSelf: "center",
      marginTop: 12,
      marginBottom: 4,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 24,
      paddingVertical: 16,
    },
    title: {
      fontSize: 17,
      fontWeight: "700",
      color: colors.text,
    },
    closeBtn: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: colors.background,
      alignItems: "center",
      justifyContent: "center",
    },
    scrollContent: {
      paddingHorizontal: 24,
      paddingBottom: 8,
    },
    sectionLabel: {
      fontSize: 11,
      fontWeight: "700",
      color: colors.muted,
      textTransform: "uppercase",
      letterSpacing: 0.8,
      marginBottom: 10,
    },
    sectionLabelSpaced: {
      marginTop: 20,
    },
    chipRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
    },
    chip: {
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.background,
    },
    chipActiveYellow: {
      backgroundColor: colors.yellow,
      borderColor: colors.yellow,
    },
    chipText: {
      fontSize: 13,
      color: colors.muted,
      fontWeight: "500",
    },
    chipTextOnYellow: {
      color: colors.black,
      fontWeight: "700",
    },
    footer: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 24,
      paddingTop: 20,
      gap: 12,
    },
    resetBtn: {
      flex: 1,
      paddingVertical: 13,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: "center",
    },
    resetBtnDisabled: {
      opacity: 0.4,
    },
    resetText: {
      fontSize: 14,
      fontWeight: "600",
      color: colors.text,
    },
    resetTextDisabled: {
      color: colors.muted,
    },
    doneBtn: {
      flex: 2,
      paddingVertical: 13,
      borderRadius: 14,
      backgroundColor: colors.yellow,
      alignItems: "center",
    },
    doneText: {
      fontSize: 14,
      fontWeight: "700",
      color: colors.black,
    },
  });
}
