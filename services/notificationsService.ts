import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

export interface ReminderOption {
  label: string;
  value: number | null;
}

export const REMINDER_OPTIONS: ReminderOption[] = [
  { label: 'None', value: null },
  { label: '5 min before', value: 5 },
  { label: '15 min before', value: 15 },
  { label: '30 min before', value: 30 },
  { label: '1 hour before', value: 60 },
  { label: '2 hours before', value: 120 },
  { label: '1 day before', value: 1440 },
  { label: '2 days before', value: 2880 },
];

export function getReminderLabel(offsetMinutes: number | null): string {
  const option = REMINDER_OPTIONS.find((o) => o.value === offsetMinutes);
  return option?.label ?? 'None';
}

const CHANNEL_ID = 'reminders';

// Create the Android channel at module load time so it exists before any notification fires,
// including when the app is in the background or has been killed.
if (Platform.OS === 'android') {
  Notifications.setNotificationChannelAsync(CHANNEL_ID, {
    name: 'Reminders',
    importance: Notifications.AndroidImportance.HIGH,
    enableVibrate: true,
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
  });
}

// Controls how notifications are presented when the app is in the foreground.
// Background/killed delivery is handled entirely by the OS — this handler has no effect then.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function requestNotificationPermissions(): Promise<boolean> {
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

// Schedule a notification at (dueDate - offsetMinutes). Returns identifier or null if trigger is past.
export async function scheduleReminder(
  todoId: string,
  title: string,
  dueDate: number,
  offsetMinutes: number,
): Promise<string | null> {
  try {
    const triggerTime = dueDate - offsetMinutes * 60 * 1000;
    if (triggerTime <= Date.now()) return null;
    const identifier = await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Reminder',
        body: title,
        data: { todoId },
        autoDismiss: false, // stays in the bar until the user manually dismisses it
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: new Date(triggerTime),
        // channelId is required on Android for the notification to fire when the app is killed
        ...(Platform.OS === 'android' && { channelId: CHANNEL_ID }),
      },
    });
    return identifier;
  } catch {
    return null;
  }
}

export async function cancelReminder(reminderId: string): Promise<void> {
  try {
    await Notifications.cancelScheduledNotificationAsync(reminderId);
  } catch {
    // Silently ignore — notification may have already fired or been removed
  }
}

// Schedule a "task is due" notification at the due date/time.
// For date-only tasks (no specific time set), fires at 9 AM on the due date.
export async function scheduleDueNotification(
  todoId: string,
  title: string,
  dueDate: number,
): Promise<string | null> {
  try {
    const d = new Date(dueDate);
    // If no time was set the timestamp lands on midnight — shift to 9 AM instead
    if (d.getHours() === 0 && d.getMinutes() === 0) {
      d.setHours(9, 0, 0, 0);
    }
    const triggerTime = d.getTime();
    if (triggerTime <= Date.now()) return null;
    const identifier = await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Task Due',
        body: title,
        data: { todoId },
        autoDismiss: false,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: d,
        ...(Platform.OS === 'android' && { channelId: CHANNEL_ID }),
      },
    });
    return identifier;
  } catch {
    return null;
  }
}
