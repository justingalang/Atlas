import { useState, useCallback, useRef } from "react";
import {
  Dimensions,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { RootStackScreenProps } from "../navigation/types";
import EncounterForm, {
  SavedEncounterData,
} from "../components/EncounterForm";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

function formatDateForPrefill(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

interface CardState {
  id: string;
  saved: boolean;
  // Prefills for fresh-card flow (forwarded from previous saved card)
  prefillDate?: string;
  prefillWhere?: string;
  prefillPersonId?: string;
  // Populated after the first save; lets us render the summary view AND
  // re-prefill the form when the user taps Edit.
  savedData?: SavedEncounterData;
}

export default function EncounterFormScreen({
  route,
}: RootStackScreenProps<"EncounterForm">) {
  const flatListRef = useRef<FlatList>(null);
  const [cards, setCards] = useState<CardState[]>([
    {
      id: "card-0",
      saved: false,
      prefillDate: route.params?.prefillDate,
      prefillPersonId: route.params?.prefillPersonId,
    },
  ]);

  const handleSaved = useCallback(
    (cardId: string, saved: SavedEncounterData) => {
      setCards((prev) => {
        const existing = prev.find((c) => c.id === cardId);
        const wasAlreadySaved = !!existing?.savedData;

        const updated = prev.map((c) =>
          c.id === cardId ? { ...c, saved: true, savedData: saved } : c,
        );

        if (wasAlreadySaved) {
          // This was an edit/update — no new card to append.
          return updated;
        }

        // Fresh save: append a new blank card with date/location prefilled.
        const newId = `card-${updated.length}`;
        return [
          ...updated,
          {
            id: newId,
            saved: false,
            prefillDate: formatDateForPrefill(saved.date),
            prefillWhere: saved.location || undefined,
          },
        ];
      });

      // Only scroll to the new blank card after the FIRST save of this card.
      setTimeout(() => {
        setCards((curr) => {
          if (curr.length > 1) {
            flatListRef.current?.scrollToEnd({ animated: true });
          }
          return curr;
        });
      }, 100);
    },
    [],
  );

  const handleEdit = useCallback((cardId: string) => {
    setCards((prev) =>
      prev.map((c) => (c.id === cardId ? { ...c, saved: false } : c)),
    );
  }, []);

  const renderItem = useCallback(
    ({ item }: { item: CardState }) => (
      <View style={styles.cardContainer}>
        {item.saved && item.savedData ? (
          <SavedCard
            data={item.savedData}
            onEdit={() => handleEdit(item.id)}
          />
        ) : (
          <ScrollView
            keyboardShouldPersistTaps="handled"
            automaticallyAdjustKeyboardInsets
          >
            <EncounterForm
              prefillDate={
                item.savedData
                  ? formatDateForPrefill(item.savedData.date)
                  : item.prefillDate
              }
              prefillWhere={item.savedData?.location ?? item.prefillWhere}
              prefillPersonId={item.prefillPersonId}
              prefillWho={item.savedData?.personName}
              prefillFacts={item.savedData?.facts}
              editEncounterId={item.savedData?.encounterId}
              onSaved={(saved) => handleSaved(item.id, saved)}
            />
          </ScrollView>
        )}
      </View>
    ),
    [handleSaved, handleEdit],
  );

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <FlatList
        ref={flatListRef}
        data={cards}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
      />

      {cards.length > 1 && (
        <SafeAreaView edges={["bottom"]}>
          <View style={styles.dots}>
            {cards.map((card) => (
              <View
                key={card.id}
                style={[styles.dot, card.saved && styles.dotSaved]}
              />
            ))}
          </View>
        </SafeAreaView>
      )}
    </KeyboardAvoidingView>
  );
}

function SavedCard({
  data,
  onEdit,
}: {
  data: SavedEncounterData;
  onEdit: () => void;
}) {
  return (
    <ScrollView contentContainerStyle={styles.savedScroll}>
      <Text style={styles.savedIcon}>✓</Text>
      <Text style={styles.savedHeader}>Encounter saved</Text>

      <View style={styles.savedBody}>
        <Text style={styles.savedPerson}>{data.personName}</Text>
        {data.location ? (
          <Text style={styles.savedLocation}>At {data.location}</Text>
        ) : null}
        {data.facts.length > 0 ? (
          <View style={styles.savedFacts}>
            {data.facts.map((f, i) => (
              <Text key={i} style={styles.savedFact}>
                {f.favorite ? "★ " : "• "}
                {f.text}
              </Text>
            ))}
          </View>
        ) : null}
      </View>

      <TouchableOpacity style={styles.editButton} onPress={onEdit}>
        <Text style={styles.editButtonText}>Edit</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  cardContainer: {
    width: SCREEN_WIDTH,
    flex: 1,
  },
  savedScroll: {
    paddingHorizontal: 24,
    paddingTop: 40,
    paddingBottom: 40,
    alignItems: "center",
  },
  savedIcon: {
    fontSize: 56,
    color: "#34C759",
    marginBottom: 4,
  },
  savedHeader: {
    fontSize: 18,
    color: "#666",
    marginBottom: 28,
  },
  savedBody: {
    width: "100%",
    backgroundColor: "#f9f9f9",
    borderRadius: 12,
    padding: 18,
    borderWidth: 1,
    borderColor: "#eee",
    marginBottom: 24,
  },
  savedPerson: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1c1c1e",
  },
  savedLocation: {
    fontSize: 14,
    color: "#666",
    marginTop: 4,
  },
  savedFacts: {
    marginTop: 12,
  },
  savedFact: {
    fontSize: 14,
    color: "#1c1c1e",
    lineHeight: 22,
  },
  editButton: {
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#007AFF",
    backgroundColor: "#fff",
  },
  editButtonText: {
    color: "#007AFF",
    fontSize: 16,
    fontWeight: "600",
  },
  dots: {
    flexDirection: "row",
    justifyContent: "center",
    paddingVertical: 10,
    gap: 6,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#007AFF",
  },
  dotSaved: {
    backgroundColor: "#34C759",
  },
});
