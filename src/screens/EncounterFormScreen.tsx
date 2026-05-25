import { useState, useCallback, useRef } from "react";
import {
  Dimensions,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import type { RootStackScreenProps } from "../navigation/types";
import EncounterForm from "../components/EncounterForm";

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
  prefillDate?: string;
  prefillWhere?: string;
  prefillPersonId?: string;
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
    (cardId: string, saved: { date: Date; location: string }) => {
      setCards((prev) => {
        const updated = prev.map((c) =>
          c.id === cardId ? { ...c, saved: true } : c,
        );
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

      // Scroll to the new blank card after a short delay
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    },
    [],
  );

  const renderItem = useCallback(
    ({ item }: { item: CardState }) => (
      <View style={styles.cardContainer}>
        {item.saved ? (
          <View style={styles.savedCard}>
            <Text style={styles.savedIcon}>✓</Text>
            <Text style={styles.savedText}>Encounter saved</Text>
          </View>
        ) : (
          <ScrollView
            keyboardShouldPersistTaps="handled"
            automaticallyAdjustKeyboardInsets
          >
            <EncounterForm
              prefillDate={item.prefillDate}
              prefillWhere={item.prefillWhere}
              prefillPersonId={item.prefillPersonId}
              onSaved={(saved) => handleSaved(item.id, saved)}
            />
          </ScrollView>
        )}
      </View>
    ),
    [handleSaved],
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
        <View style={styles.dots}>
          {cards.map((card, i) => (
            <View
              key={card.id}
              style={[styles.dot, card.saved && styles.dotSaved]}
            />
          ))}
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  cardContainer: {
    width: SCREEN_WIDTH,
    flex: 1,
  },
  savedCard: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  savedIcon: {
    fontSize: 48,
    color: "#34C759",
    marginBottom: 12,
  },
  savedText: {
    fontSize: 18,
    color: "#666",
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
