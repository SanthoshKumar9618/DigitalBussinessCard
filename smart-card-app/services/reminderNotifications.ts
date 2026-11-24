import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";

/**
 * Local (on-device) notifications for follow-up reminders. No push server needed:
 * the phone fires the reminder at the chosen time even if the app is closed.
 * Requires a native build that includes expo-notifications (not Expo Go on Android).
 */
const KEY = "reminder_notifications"; // { [contactId]: notificationId }

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

async function getMap(): Promise<Record<string, string>> {
  try {
    return JSON.parse((await AsyncStorage.getItem(KEY)) || "{}");
  } catch {
    return {};
  }
}

async function ensurePermission(): Promise<boolean> {
  if (Platform.OS === "web") return false;
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  const asked = await Notifications.requestPermissionsAsync();
  return asked.granted;
}

export async function cancelReminder(contactId: string) {
  try {
    const map = await getMap();
    if (map[contactId]) {
      await Notifications.cancelScheduledNotificationAsync(map[contactId]);
      delete map[contactId];
      await AsyncStorage.setItem(KEY, JSON.stringify(map));
    }
  } catch {
    // notifications unavailable on this build: the in-app reminder still works
  }
}

/** Schedule (or reschedule) the phone notification for a contact's follow-up. */
export async function scheduleReminder(contactId: string, name: string, isoDate: string | null) {
  await cancelReminder(contactId);
  if (!isoDate) return;
  const when = new Date(isoDate);
  if (when.getTime() <= Date.now()) return;
  try {
    if (!(await ensurePermission())) return;
    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: `Follow up with ${name.split(" ")[0] || "your contact"}`,
        body: "Tap to open your network and write a quick follow-up.",
        data: { contactId, url: "/(tabs)/network" },
      },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: when },
    });
    const map = await getMap();
    map[contactId] = id;
    await AsyncStorage.setItem(KEY, JSON.stringify(map));
  } catch {
    // notifications unavailable on this build: the in-app reminder still works
  }
}

/** Open the Network tab when a reminder notification is tapped. */
export function listenForReminderTaps(navigate: (path: string) => void) {
  const sub = Notifications.addNotificationResponseReceivedListener((response) => {
    const url = response.notification.request.content.data?.url;
    if (typeof url === "string") navigate(url);
  });
  return () => sub.remove();
}
