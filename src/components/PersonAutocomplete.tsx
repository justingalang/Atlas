import { useEffect, useMemo, useState } from "react";
import {
  FlatList,
  Modal,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { Person } from "../types";
import { getAllPeople } from "../services";
import { resolveAllDisplayNames } from "../utils/displayName";
import { normalizeName } from "../utils/normalizeName";

interface Props {
  value: string;
  onChangeText: (text: string) => void;
  onSelectPerson: (person: Person) => void;
  /** Bump to force a re-fetch of the people list (e.g. after creating someone). */
  refreshSignal?: number;
}

export default function PersonAutocomplete({
  value,
  onChangeText,
  onSelectPerson,
  refreshSignal,
}: Props) {
  const [people, setPeople] = useState<Person[]>([]);
  const [displayNames, setDisplayNames] = useState<Map<string, string>>(
    new Map(),
  );
  const [pickerOpen, setPickerOpen] = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => {
    getAllPeople().then((data) => {
      setPeople(data);
      setDisplayNames(resolveAllDisplayNames(data));
    });
  }, [refreshSignal]);

  const filtered = useMemo(() => {
    const norm = normalizeName(search);
    if (!norm) return people;
    return people.filter((p) => p.normalizedName.includes(norm));
  }, [people, search]);

  const openPicker = () => {
    setSearch(value);
    setPickerOpen(true);
  };

  const pickPerson = (person: Person) => {
    const cleanName = person.lastName
      ? `${person.firstName} ${person.lastName}`
      : person.firstName;
    onChangeText(cleanName);
    onSelectPerson(person);
    setPickerOpen(false);
  };

  return (
    <View>
      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          placeholder="First name (last name optional)"
          value={value}
          onChangeText={onChangeText}
          autoCapitalize="words"
          autoFocus
        />
        <TouchableOpacity
          style={styles.pickButton}
          onPress={openPicker}
          accessibilityLabel="Search existing people"
        >
          <Ionicons name="search" size={20} color="#007AFF" />
        </TouchableOpacity>
      </View>

      <Modal
        visible={pickerOpen}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setPickerOpen(false)}
      >
        <SafeAreaView style={styles.modal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Search Existing</Text>
            <TouchableOpacity
              onPress={() => setPickerOpen(false)}
              hitSlop={10}
            >
              <Text style={styles.modalCancel}>Cancel</Text>
            </TouchableOpacity>
          </View>

          <TextInput
            style={styles.search}
            placeholder="Search by name"
            value={search}
            onChangeText={setSearch}
            autoCapitalize="words"
            autoFocus
          />

          <FlatList
            data={filtered}
            keyExtractor={(p) => p.id}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => (
              <Pressable
                style={({ pressed }) => [
                  styles.row,
                  pressed && styles.rowPressed,
                ]}
                onPress={() => pickPerson(item)}
              >
                <Text style={styles.rowText}>
                  {displayNames.get(item.id) ?? item.firstName}
                </Text>
                {item.firstMetLocation ? (
                  <Text style={styles.rowMeta}>
                    Met at {item.firstMetLocation}
                  </Text>
                ) : null}
              </Pressable>
            )}
            ListEmptyComponent={
              <Text style={styles.empty}>
                {search ? "No matches" : "No people yet"}
              </Text>
            }
          />
        </SafeAreaView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: "#fafafa",
  },
  pickButton: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#eef3fa",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#cdd9ec",
  },
  modal: {
    flex: 1,
    backgroundColor: "#fff",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#e5e5ea",
  },
  modalTitle: { fontSize: 20, fontWeight: "700", color: "#1c1c1e" },
  modalCancel: { fontSize: 17, color: "#007AFF" },
  search: {
    margin: 16,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: "#fafafa",
  },
  row: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#eee",
  },
  rowPressed: { backgroundColor: "#eef3fa" },
  rowText: { fontSize: 17, color: "#333" },
  rowMeta: { fontSize: 13, color: "#999", marginTop: 2 },
  empty: {
    textAlign: "center",
    color: "#999",
    paddingVertical: 40,
    fontSize: 15,
  },
});
