import { useCallback, useEffect, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RootStackScreenProps, RootStackParamList } from "../navigation/types";
import EncounterForm from "../components/EncounterForm";
import type { Encounter } from "../types";
import { getEncounterById } from "../services";

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
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: "#fff" },
  centered: { flex: 1, alignItems: "center", justifyContent: "center" },
  loading: { fontSize: 16, color: "#999" },
});
