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
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RootStackScreenProps, RootStackParamList } from "../navigation/types";
import {
  getPersonById,
  updatePerson,
  deletePerson,
  deleteEncountersForPerson,
} from "../services";

export default function EditPersonScreen({
  route,
}: RootStackScreenProps<"EditPerson">) {
  const { personId } = route.params;
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [nickname, setNickname] = useState("");
  const [firstMetLocation, setFirstMetLocation] = useState("");
  const [profession, setProfession] = useState("");
  const [birthday, setBirthday] = useState<Date | null>(null);
  const [datePickerOpen, setDatePickerOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getPersonById(personId).then((person) => {
      if (cancelled || !person) {
        setLoading(false);
        return;
      }
      setFirstName(person.firstName);
      setLastName(person.lastName ?? "");
      setNickname(person.nickname ?? "");
      setFirstMetLocation(person.firstMetLocation ?? "");
      setProfession(person.profession ?? "");
      setBirthday(person.birthday ? parseLocalDate(person.birthday) : null);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [personId]);

  const handleSave = useCallback(async () => {
    const trimmedFirst = firstName.trim();
    if (!trimmedFirst) {
      Alert.alert("Required", "First name can't be empty.");
      return;
    }
    setSaving(true);
    try {
      await updatePerson(personId, {
        firstName: trimmedFirst,
        lastName: lastName.trim() || undefined,
        nickname: nickname.trim() || undefined,
        firstMetLocation: firstMetLocation.trim() || undefined,
        profession: profession.trim() || undefined,
        birthday: birthday ? formatDateKey(birthday) : undefined,
      });
      navigation.goBack();
    } catch (error) {
      console.error("[EditPerson] save failed:", error);
      const message = error instanceof Error ? error.message : String(error);
      Alert.alert("Error", `Failed to save: ${message}`);
    } finally {
      setSaving(false);
    }
  }, [
    firstName,
    lastName,
    nickname,
    firstMetLocation,
    profession,
    birthday,
    personId,
    navigation,
  ]);

  const handleDelete = useCallback(() => {
    const displayName = [firstName.trim(), lastName.trim()]
      .filter(Boolean)
      .join(" ");
    Alert.alert(
      `Delete ${displayName || "this person"}?`,
      "This permanently deletes the person and all their encounters. This can't be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            setDeleting(true);
            try {
              await deleteEncountersForPerson(personId);
              await deletePerson(personId);
              // Pop the modal AND the now-stale profile screen behind it.
              navigation.pop(2);
            } catch (error) {
              console.error("[EditPerson] delete failed:", error);
              const message =
                error instanceof Error ? error.message : String(error);
              Alert.alert("Error", `Failed to delete: ${message}`);
            } finally {
              setDeleting(false);
            }
          },
        },
      ],
    );
  }, [personId, firstName, lastName, navigation]);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity onPress={handleSave} disabled={saving} hitSlop={10}>
          <Text style={[styles.headerSave, saving && styles.headerSaveDisabled]}>
            {saving ? "Saving..." : "Save"}
          </Text>
        </TouchableOpacity>
      ),
    });
  }, [navigation, handleSave, saving]);

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
      <Field label="First name">
        <TextInput
          style={styles.input}
          value={firstName}
          onChangeText={setFirstName}
          autoCapitalize="words"
        />
      </Field>

      <Field label="Last name">
        <TextInput
          style={styles.input}
          value={lastName}
          onChangeText={setLastName}
          autoCapitalize="words"
          placeholder="Optional"
        />
      </Field>

      <Field label="Nickname">
        <TextInput
          style={styles.input}
          value={nickname}
          onChangeText={setNickname}
          autoCapitalize="words"
          placeholder="Optional"
        />
      </Field>

      <Field label="First met at">
        <TextInput
          style={styles.input}
          value={firstMetLocation}
          onChangeText={setFirstMetLocation}
          autoCapitalize="sentences"
          placeholder="Optional"
        />
      </Field>

      <Field label="Profession">
        <TextInput
          style={styles.input}
          value={profession}
          onChangeText={setProfession}
          autoCapitalize="sentences"
          placeholder="Optional"
        />
      </Field>

      <Field label="Birthday">
        <View style={styles.birthdayRow}>
          <TouchableOpacity
            style={[styles.input, styles.birthdayInput]}
            onPress={() => setDatePickerOpen(true)}
          >
            <Text
              style={[
                styles.birthdayText,
                !birthday && styles.birthdayPlaceholder,
              ]}
            >
              {birthday ? formatDisplayDate(birthday) : "Tap to set"}
            </Text>
          </TouchableOpacity>
          {birthday ? (
            <TouchableOpacity
              style={styles.birthdayClear}
              onPress={() => setBirthday(null)}
              hitSlop={8}
              accessibilityLabel="Clear birthday"
            >
              <Text style={styles.birthdayClearText}>×</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </Field>

      <TouchableOpacity
        style={styles.deleteButton}
        onPress={handleDelete}
        disabled={deleting}
      >
        <Text style={styles.deleteButtonText}>
          {deleting ? "Deleting..." : "Delete person"}
        </Text>
      </TouchableOpacity>

      <Modal
        visible={datePickerOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setDatePickerOpen(false)}
      >
        <View style={styles.datePickerBackdrop}>
          <SafeAreaView style={styles.datePickerSheet}>
            <View style={styles.datePickerHeader}>
              <Text style={styles.datePickerTitle}>Birthday</Text>
              <TouchableOpacity
                onPress={() => setDatePickerOpen(false)}
                hitSlop={10}
              >
                <Text style={styles.datePickerDone}>Done</Text>
              </TouchableOpacity>
            </View>
            <DateTimePicker
              value={birthday ?? new Date(1990, 0, 1)}
              mode="date"
              display="spinner"
              onChange={(_, selected) => {
                if (selected) setBirthday(selected);
              }}
            />
          </SafeAreaView>
        </View>
      </Modal>
    </ScrollView>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      {children}
    </View>
  );
}

function parseLocalDate(str: string): Date {
  const [y, m, d] = str.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function formatDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function formatDisplayDate(d: Date): string {
  return d.toLocaleDateString("en-US", {
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
  birthdayRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  birthdayInput: {
    flex: 1,
  },
  birthdayText: {
    fontSize: 16,
    color: "#1c1c1e",
  },
  birthdayPlaceholder: {
    color: "#bbb",
  },
  birthdayClear: {
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  birthdayClearText: {
    fontSize: 22,
    color: "#999",
    lineHeight: 24,
  },
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
    marginTop: 24,
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
