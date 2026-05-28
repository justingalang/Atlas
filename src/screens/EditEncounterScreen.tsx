import { useCallback, useEffect, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RootStackScreenProps, RootStackParamList } from "../navigation/types";
import EncounterForm from "../components/EncounterForm";
import type { Encounter } from "../types";
import { getEncounterById, deleteEncounter } from "../services";

function formatDateForPrefill(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export default function EditEncounterScreen({
  route,
}: RootStackScreenProps<"EditEncounter">) {
  const { encounterId } = route.params;
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [encounter, setEncounter] = useState<Encounter | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getEncounterById(encounterId).then((enc) => {
      if (cancelled) return;
      setEncounter(enc);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [encounterId]);

  const handleSaved = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleDelete = useCallback(() => {
    Alert.alert(
      "Delete encounter?",
      "This permanently removes this encounter and its facts. The person record stays.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            setDeleting(true);
            try {
              await deleteEncounter(encounterId);
              navigation.goBack();
            } catch (error) {
              console.error("[EditEncounter] delete failed:", error);
              const msg = error instanceof Error ? error.message : String(error);
              Alert.alert("Error", `Failed to delete: ${msg}`);
            } finally {
              setDeleting(false);
            }
          },
        },
      ],
    );
  }, [encounterId, navigation]);

  if (loading) {
    return (
      <View style={styles.centered}>
        <Text style={styles.loading}>Loading...</Text>
      </View>
    );
  }

  if (!encounter) {
    return (
      <View style={styles.centered}>
        <Text style={styles.loading}>Encounter not found</Text>
      </View>
    );
  }

  const date = encounter.date.toDate
    ? encounter.date.toDate()
    : new Date();
  const facts = encounter.facts ?? [];

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets
      >
        <EncounterForm
          editEncounterId={encounterId}
          prefillWho={encounter.personName}
          prefillDate={formatDateForPrefill(date)}
          prefillWhere={encounter.location}
          prefillFacts={facts}
          onSaved={handleSaved}
        />

        <TouchableOpacity
          style={styles.deleteButton}
          onPress={handleDelete}
          disabled={deleting}
        >
          <Text style={styles.deleteButtonText}>
            {deleting ? "Deleting..." : "Delete encounter"}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: "#fff" },
  centered: { flex: 1, alignItems: "center", justifyContent: "center" },
  loading: { fontSize: 16, color: "#999" },
  deleteButton: {
    marginHorizontal: 20,
    marginTop: 8,
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
