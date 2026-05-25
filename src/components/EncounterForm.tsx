import { useState, useCallback, useRef, useEffect } from "react";
import {
  Modal,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  View,
  TouchableOpacity,
  Alert,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Timestamp } from "firebase/firestore";
import type { Person } from "../types";
import {
  createPerson,
  createEncounter,
  getPersonById,
  findCanonicalPersonByName,
  findPeopleByName,
} from "../services";
import { parseName } from "../utils/nameParser";
import PersonAutocomplete from "./PersonAutocomplete";

interface Props {
  prefillDate?: string;
  prefillWhere?: string;
  prefillPersonId?: string;
  onSaved: (saved: { date: Date; location: string }) => void;
}

export default function EncounterForm({
  prefillDate,
  prefillWhere,
  prefillPersonId,
  onSaved,
}: Props) {
  const initialDate = prefillDate ? parseLocalDate(prefillDate) : new Date();

  const [who, setWho] = useState("");
  const [nickname, setNickname] = useState("");
  const [date, setDate] = useState<Date>(initialDate);
  const [where, setWhere] = useState(prefillWhere ?? "");
  const [facts, setFacts] = useState<string[]>([""]);
  const [saving, setSaving] = useState(false);
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [matchCount, setMatchCount] = useState(0);
  // Holds the canonical match for the currently-typed Who name, plus the
  // nickname value the user started from. If, on save, the nickname field
  // is unchanged from this baseline, we attach to this existing person;
  // otherwise we create a new person (it's a different human).
  const matchedRef = useRef<{ person: Person; baselineNickname: string } | null>(
    null,
  );
  // Set when the user picks via the 🔍 search modal — overrides match logic.
  const selectedPersonRef = useRef<Person | null>(null);
  const factRefs = useRef<(TextInput | null)[]>([]);

  useEffect(() => {
    if (!prefillPersonId) return;
    let cancelled = false;
    getPersonById(prefillPersonId).then((person) => {
      if (cancelled || !person) return;
      const cleanName = person.lastName
        ? `${person.firstName} ${person.lastName}`
        : person.firstName;
      setWho(cleanName);
      setNickname(person.nickname ?? "");
      selectedPersonRef.current = person;
      matchedRef.current = {
        person,
        baselineNickname: person.nickname ?? "",
      };
    });
    return () => {
      cancelled = true;
    };
  }, [prefillPersonId]);

  // Debounced lookup as the user types Who: populate nickname from a canonical
  // match so they can either keep it (same person) or change it (different person).
  useEffect(() => {
    if (selectedPersonRef.current) return; // explicit pick overrides
    const trimmed = who.trim();
    if (!trimmed) {
      matchedRef.current = null;
      setMatchCount(0);
      setNickname("");
      return;
    }
    let cancelled = false;
    const handle = setTimeout(async () => {
      const all = await findPeopleByName(trimmed);
      if (cancelled) return;
      setMatchCount(all.length);
      const canonical =
        all.find((p) => !p.nickname) ?? all[0] ?? null;
      if (canonical) {
        matchedRef.current = {
          person: canonical,
          baselineNickname: canonical.nickname ?? "",
        };
        setNickname(canonical.nickname ?? "");
      } else {
        matchedRef.current = null;
        setNickname("");
      }
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(handle);
    };
  }, [who]);

  const updateFact = useCallback((index: number, value: string) => {
    setFacts((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  }, []);

  const handleFactSubmit = useCallback((index: number) => {
    setFacts((prev) => {
      const current = prev[index]?.trim() ?? "";
      if (!current) return prev;
      if (index < prev.length - 1) {
        // Jump to the next existing row.
        setTimeout(() => factRefs.current[index + 1]?.focus(), 0);
        return prev;
      }
      const next = [...prev, ""];
      setTimeout(() => factRefs.current[next.length - 1]?.focus(), 0);
      return next;
    });
  }, []);

  const removeFact = useCallback((index: number) => {
    setFacts((prev) => {
      if (prev.length === 1) return [""];
      return prev.filter((_, i) => i !== index);
    });
  }, []);

  const handleSave = useCallback(async () => {
    const trimmedWho = who.trim();
    if (!trimmedWho) {
      Alert.alert("Required", "Who did you encounter?");
      return;
    }
    const trimmedNickname = nickname.trim();

    setSaving(true);
    try {
      let person: Person;

      if (selectedPersonRef.current) {
        // Explicit pick from 🔍 modal wins.
        person = selectedPersonRef.current;
      } else if (
        matchedRef.current &&
        trimmedNickname === matchedRef.current.baselineNickname
      ) {
        // Name matches existing person and nickname is unchanged → same person.
        person = matchedRef.current.person;
      } else {
        // No match, OR nickname was changed → create a new person.
        const { firstName, lastName } = parseName(trimmedWho);
        const location = where.trim() || undefined;
        person = await createPerson({
          firstName,
          lastName,
          nickname: trimmedNickname || undefined,
          firstMetLocation: location,
        });
      }

      const cleanFacts = facts.map((f) => f.trim()).filter(Boolean);
      const savedLocation = where.trim();
      await createEncounter({
        personId: person.id,
        personName: trimmedWho,
        date: Timestamp.fromDate(date),
        location: savedLocation,
        facts: cleanFacts,
      });

      onSaved({ date, location: savedLocation });
    } catch (error) {
      console.error("[EncounterForm] save failed:", error);
      const message = error instanceof Error ? error.message : String(error);
      Alert.alert("Error", `Failed to save: ${message}`);
    } finally {
      setSaving(false);
    }
  }, [who, nickname, date, where, facts, onSaved]);

  return (
    <View style={styles.container}>
      <View style={styles.field}>
        <Text style={styles.label}>Who</Text>
        <PersonAutocomplete
          value={who}
          onChangeText={(text) => {
            setWho(text);
            selectedPersonRef.current = null;
          }}
          onSelectPerson={(person) => {
            selectedPersonRef.current = person;
            setNickname(person.nickname ?? "");
            matchedRef.current = {
              person,
              baselineNickname: person.nickname ?? "",
            };
          }}
        />
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>Nickname</Text>
        <TextInput
          style={styles.input}
          placeholder={
            matchedRef.current
              ? "Edit to mark as a different person"
              : "Optional"
          }
          value={nickname}
          onChangeText={setNickname}
          autoCapitalize="words"
        />
        {matchCount > 1 ? (
          <Text style={styles.hint}>
            {matchCount} people with this name — use 🔍 to pick the right one
          </Text>
        ) : null}
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>When</Text>
        <TouchableOpacity
          style={styles.input}
          onPress={() => setDatePickerOpen(true)}
        >
          <Text style={styles.dateText}>{formatDisplayDate(date)}</Text>
        </TouchableOpacity>
      </View>

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

      <View style={styles.field}>
        <Text style={styles.label}>Where</Text>
        <TextInput
          style={styles.input}
          placeholder="Location or context"
          value={where}
          onChangeText={setWhere}
          autoCapitalize="sentences"
        />
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>Facts</Text>
        {facts.map((fact, index) => (
          <View key={index} style={styles.factRow}>
            <TextInput
              ref={(r) => {
                factRefs.current[index] = r;
              }}
              style={[styles.input, styles.factInput]}
              placeholder={index === 0 ? "Add a fact" : "Add another fact"}
              value={fact}
              onChangeText={(text) => updateFact(index, text)}
              onSubmitEditing={() => handleFactSubmit(index)}
              returnKeyType="next"
              blurOnSubmit={false}
              autoCapitalize="sentences"
            />
            {facts.length > 1 && (
              <TouchableOpacity
                style={styles.factRemove}
                onPress={() => removeFact(index)}
                hitSlop={8}
                accessibilityLabel="Remove fact"
              >
                <Text style={styles.factRemoveText}>×</Text>
              </TouchableOpacity>
            )}
          </View>
        ))}
      </View>

      <TouchableOpacity
        style={[styles.button, saving && styles.buttonDisabled]}
        onPress={handleSave}
        disabled={saving}
      >
        <Text style={styles.buttonText}>
          {saving ? "Saving..." : "Save Encounter"}
        </Text>
      </TouchableOpacity>

    </View>
  );
}

function parseLocalDate(str: string): Date {
  const [y, m, d] = str.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function formatDisplayDate(d: Date): string {
  return d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    paddingBottom: 40,
  },
  field: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
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
  dateText: {
    fontSize: 16,
    color: "#1c1c1e",
  },
  hint: {
    fontSize: 12,
    color: "#8e8e93",
    marginTop: 6,
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
  factRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  factInput: {
    flex: 1,
  },
  factRemove: {
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  factRemoveText: {
    fontSize: 22,
    color: "#999",
    lineHeight: 24,
  },
  button: {
    backgroundColor: "#007AFF",
    borderRadius: 8,
    padding: 16,
    alignItems: "center",
    marginTop: 10,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});
