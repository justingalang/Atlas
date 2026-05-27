import { useCallback, useEffect, useRef, useState } from "react";
import {
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import type { Person } from "../types";
import { getAllPeople, getAllEncounters } from "../services";
import { normalizeName } from "../utils/normalizeName";

type SortMode = "alpha" | "recent";

interface Props {
  onSelectPerson: (personId: string, peopleIds?: string[]) => void;
  refreshSignal?: number;
}

export default function PeopleScreen({ onSelectPerson, refreshSignal }: Props) {
  const [people, setPeople] = useState<Person[]>([]);
  const [lastEncounterAt, setLastEncounterAt] = useState<Map<string, number>>(
    new Map(),
  );
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortMode>("alpha");
  // Holds the current sort order so taps in renderItem pass the same list
  // (read inside onPress, not closed over at render time).
  const sortedIdsRef = useRef<string[]>([]);

  const load = useCallback(async () => {
    const [data, encounters] = await Promise.all([
      getAllPeople(),
      getAllEncounters(),
    ]);
    setPeople(data);

    const map = new Map<string, number>();
    for (const enc of encounters) {
      const ms = enc.date.toDate ? enc.date.toDate().getTime() : 0;
      const prev = map.get(enc.personId) ?? 0;
      if (ms > prev) map.set(enc.personId, ms);
    }
    setLastEncounterAt(map);
  }, []);

  useEffect(() => {
    load();
  }, [load, refreshSignal]);

  const filtered = people.filter((p) => {
    if (!search.trim()) return true;
    const normalized = normalizeName(search);
    return p.normalizedName.includes(normalized);
  });

  const sorted = [...filtered].sort((a, b) => {
    if (sort === "alpha") {
      return a.firstName.localeCompare(b.firstName);
    }
    // "Recent" → sort by most recent encounter date; people with no encounters
    // fall to the bottom.
    const aMs = lastEncounterAt.get(a.id) ?? 0;
    const bMs = lastEncounterAt.get(b.id) ?? 0;
    return bMs - aMs;
  });

  sortedIdsRef.current = sorted.map((p) => p.id);

  const renderItem = useCallback(
    ({ item }: { item: Person }) => (
      <TouchableOpacity
        style={styles.row}
        onPress={() => onSelectPerson(item.id, sortedIdsRef.current)}
      >
        <Text style={styles.name}>
          {item.lastName ? `${item.firstName} ${item.lastName}` : item.firstName}
        </Text>
        {item.nickname ? (
          <Text style={styles.nickname}>{item.nickname}</Text>
        ) : null}
        {item.firstMetLocation ? (
          <Text style={styles.meta}>Met at {item.firstMetLocation}</Text>
        ) : null}
      </TouchableOpacity>
    ),
    [onSelectPerson],
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search by name..."
          value={search}
          onChangeText={setSearch}
          autoCapitalize="none"
          autoCorrect={false}
        />
        <TouchableOpacity
          style={styles.sortButton}
          onPress={() => setSort((s) => (s === "alpha" ? "recent" : "alpha"))}
        >
          <Text style={styles.sortText}>
            {sort === "alpha" ? "A-Z" : "Recent"}
          </Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={sorted}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={
          sorted.length === 0 ? styles.emptyContainer : undefined
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>
              {search ? "No matches" : "No people yet"}
            </Text>
          </View>
        }
      />

      {people.length > 0 && (
        <Text style={styles.count}>{people.length} people</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  header: {
    flexDirection: "row",
    padding: 12,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  searchInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 10,
    fontSize: 16,
    backgroundColor: "#fafafa",
  },
  sortButton: {
    justifyContent: "center",
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    backgroundColor: "#fafafa",
  },
  sortText: { fontSize: 14, fontWeight: "600", color: "#007AFF" },
  row: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  name: { fontSize: 16, fontWeight: "500", color: "#333" },
  nickname: { fontSize: 14, fontWeight: "500", color: "#555", marginTop: 2 },
  meta: { fontSize: 13, color: "#999", marginTop: 2 },
  emptyContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  empty: { alignItems: "center" },
  emptyText: { fontSize: 16, color: "#999" },
  count: {
    textAlign: "center",
    padding: 8,
    fontSize: 13,
    color: "#bbb",
    borderTopWidth: 1,
    borderTopColor: "#eee",
  },
});
