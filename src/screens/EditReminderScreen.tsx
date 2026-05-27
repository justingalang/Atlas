import { useCallback, useEffect, useLayoutEffect, useState } from "react";
import {
  Alert,
  Modal,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Timestamp } from "firebase/firestore";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RootStackScreenProps, RootStackParamList } from "../navigation/types";
import {
  createReminder,
  getReminderById,
  updateReminder,
  deleteReminder,
} from "../services";

export default function EditReminderScreen({
  route,
}: RootStackScreenProps<"EditReminder">) {
  const { personId, reminderId } = route.params;
  const isEditing = !!reminderId;
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const [loading, setLoading] = useState(isEditing);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [date, setDate] = useState<Date>(defaultDate());
  const [datePickerOpen, setDatePickerOpen] = useState(false);

  useEffect(() => {
    if (!reminderId) return;
    let cancelled = false;
    getReminderById(reminderId).then((rem) => {
      if (cancelled) return;
      if (rem) {
        setMessage(rem.message);
        setDate(rem.date.toDate ? rem.date.toDate() : new Date());
      }
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [reminderId]);

  const handleSave = useCallback(async () => {
    const trimmed = message.trim();
    if (!trimmed) {
      Alert.alert("Required", "Reminder message can't be empty.");
      return;
    }
    setSaving(true);
    try {
      if (reminderId) {
        await updateReminder(reminderId, {
          message: trimmed,
          date: Timestamp.fromDate(date),
        });
      } else {
        await createReminder({
          personId,
          message: trimmed,
          date: Timestamp.fromDate(date),
        });
      }
      navigation.goBack();
    } catch (error) {
      console.error("[EditReminder] save failed:", error);
      const msg = error instanceof Error ? error.message : String(error);
      Alert.alert("Error", `Failed to save: ${msg}`);
    } finally {
      setSaving(false);
    }
  }, [reminderId, personId, message, date, navigation]);

  const handleDelete = useCallback(() => {
    if (!reminderId) return;
    Alert.alert("Delete reminder?", undefined, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteReminder(reminderId);
            navigation.goBack();
          } catch (error) {
            console.error("[EditReminder] delete failed:", error);
            const msg = error instanceof Error ? error.message : String(error);
            Alert.alert("Error", `Failed to delete: ${msg}`);
          }
        },
      },
    ]);
  }, [reminderId, navigation]);

  useLayoutEffect(() => {
    navigation.setOptions({
      title: isEditing ? "Edit Reminder" : "New Reminder",
      headerRight: () => (
        <TouchableOpacity onPress={handleSave} disabled={saving} hitSlop={10}>
          <Text style={[styles.headerSave, saving && styles.headerSaveDisabled]}>
            {saving ? "Saving..." : "Save"}
          </Text>
        </TouchableOpacity>
      ),
    });
  }, [navigation, handleSave, saving, isEditing]);

  if (loading) {
    return (
      <View style={styles.centered}>
        <Text style={styles.loading}>Loading...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      keyboardShouldPersistTaps="handled"
      automaticallyAdjustKeyboardInsets
    >
      <View style={styles.field}>
        <Text style={styles.label}>Message</Text>
        <TextInput
          style={styles.input}
          value={message}
          onChangeText={setMessage}
          autoCapitalize="sentences"
          autoFocus={!isEditing}
          placeholder="e.g. Tomas finishes with Military"
        />
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>When</Text>
        <TouchableOpacity
          style={styles.input}
          onPress={() => setDatePickerOpen(true)}
        >
          <Text style={styles.dateText}>{formatDate(date)}</Text>
        </TouchableOpacity>
      </View>

      {isEditing ? (
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={handleDelete}
        >
          <Text style={styles.deleteButtonText}>Delete reminder</Text>
        </TouchableOpacity>
      ) : null}

      <Modal
        visible={datePickerOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setDatePickerOpen(false)}
      >
        <View style={styles.datePickerBackdrop}>
          <SafeAreaView style={styles.datePickerSheet}>
            <View style={styles.datePickerHeader}>
              <Text style={styles.datePickerTitle}>When</Text>
              <TouchableOpacity
                onPress={() => setDatePickerOpen(false)}
                hitSlop={10}
              >
                <Text style={styles.datePickerDone}>Done</Text>
              </TouchableOpacity>
            </View>
            <DateTimePicker
              value={date}
              mode="date"
              display="spinner"
              onChange={(_, selected) => {
                if (selected) setDate(selected);
              }}
            />
          </SafeAreaView>
        </View>
      </Modal>
    </ScrollView>
  );
}

function defaultDate(): Date {
  const d = new Date();
  d.setDate(d.getDate() + 7); // a week from today
  return d;
}

function formatDate(d: Date): string {
  return d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff", padding: 20 },
  centered: { flex: 1, alignItems: "center", justifyContent: "center" },
  loading: { fontSize: 16, color: "#999" },
  field: { marginBottom: 20 },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: "#8e8e93",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: "#fafafa",
  },
  dateText: { fontSize: 16, color: "#1c1c1e" },
  datePickerBackdrop: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  datePickerSheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 14,
    borderTopRightRadius: 14,
  },
  datePickerHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#e5e5ea",
  },
  datePickerTitle: { fontSize: 17, fontWeight: "600", color: "#1c1c1e" },
  datePickerDone: { fontSize: 17, color: "#007AFF", fontWeight: "600" },
  headerSave: {
    fontSize: 16,
    color: "#007AFF",
    fontWeight: "600",
    paddingHorizontal: 4,
  },
  headerSaveDisabled: { color: "#aaa" },
  deleteButton: {
    marginTop: 16,
    marginBottom: 40,
    paddingVertical: 14,
    alignItems: "center",
    borderRadius: 8,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#ff3b30",
  },
  deleteButtonText: {
    color: "#ff3b30",
    fontSize: 16,
    fontWeight: "600",
  },
});
