import { useCallback, useEffect, useState } from "react";
import {
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import type { Encounter } from "../types";
import { getRecentEncounters } from "../services";
import { getEncounterFacts } from "../utils/encounterContent";

interface Props {
  onSelectPerson: (personId: string) => void;
  refreshSignal?: number;
}

export default function TimelinePane({ onSelectPerson, refreshSignal }: Props) {
  const [encounters, setEncounters] = useState<Encounter[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const data = await getRecentEncounters(50);
    setEncounters(data);
  }, []);

  useEffect(() => {
    load();
  }, [load, refreshSignal]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const renderItem = useCallback(
    ({ item }: { item: Encounter }) => {
      const factList = getEncounterFacts(item);
      return (
        <TouchableOpacity
          style={styles.card}
          onPress={() => onSelectPerson(item.personId)}
        >
          <View style={styles.cardHeader}>
            <Text style={styles.personName}>{item.personName}</Text>
            <Text style={styles.date}>{formatTimestamp(item.date)}</Text>
          </View>
          {item.location ? (
            <Text style={styles.location}>{item.location}</Text>
          ) : null}
          {factList.map((f, i) => (
            <Text key={i} style={styles.fact} numberOfLines={1}>
              {f.favorite ? "★ " : "• "}
              {f.text}
            </Text>
          ))}
        </TouchableOpacity>
      );
    },
    [onSelectPerson],
  );

  return (
    <FlatList
      data={encounters}
      keyExtractor={(item) => item.id}
      renderItem={renderItem}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
      contentContainerStyle={
        encounters.length === 0 ? styles.emptyContainer : styles.list
      }
      ListEmptyComponent={
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>No encounters yet</Text>
          <Text style={styles.emptySubtitle}>
            Tap + to log your first encounter
          </Text>
        </View>
      }
    />
  );
}

function formatTimestamp(ts: { toDate?: () => Date }): string {
  const d = ts.toDate ? ts.toDate() : new Date();
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

const styles = StyleSheet.create({
  list: { padding: 16 },
  card: {
    backgroundColor: "#f9f9f9",
    borderRadius: 10,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#eee",
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  personName: { fontSize: 16, fontWeight: "600", color: "#007AFF" },
  date: { fontSize: 13, color: "#999" },
  location: { fontSize: 13, color: "#666", marginBottom: 4 },
  fact: { fontSize: 14, color: "#333", lineHeight: 20 },
  emptyContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  empty: { alignItems: "center" },
  emptyTitle: { fontSize: 18, fontWeight: "600", color: "#999" },
  emptySubtitle: { fontSize: 14, color: "#bbb", marginTop: 6 },
});
