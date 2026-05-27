import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  FlatList,
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RootStackScreenProps, RootStackParamList } from "../navigation/types";
import type { Person, Encounter, Reminder } from "../types";
import {
  getPersonById,
  getEncountersForPerson,
  updateEncounter,
  getRemindersForPerson,
} from "../services";
import { getEncounterFacts } from "../utils/encounterContent";

interface FactRow {
  text: string;
  date: { toDate?: () => Date };
  location: string;
  encounterId: string;
  factIndex: number;
  favorite: boolean;
}

export default function PersonProfileScreen({
  route,
}: RootStackScreenProps<"PersonProfile">) {
  const { personId } = route.params;
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { width } = useWindowDimensions();
  const scrollRef = useRef<ScrollView>(null);

  const [person, setPerson] = useState<Person | null>(null);
  const [encounters, setEncounters] = useState<Encounter[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  // Tab order: 0 = Core, 1 = Facts (default), 2 = Encounters, 3 = Reminders.
  const [tabIndex, setTabIndex] = useState(1);

  const goToTab = useCallback(
    (index: number) => {
      setTabIndex(index);
      scrollRef.current?.scrollTo({ x: index * width, animated: true });
    },
    [width],
  );

  const onScrollEnd = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const offsetX = e.nativeEvent.contentOffset.x;
      const idx = Math.round(offsetX / width);
      if (idx !== tabIndex) setTabIndex(idx);
    },
    [width, tabIndex],
  );

  const load = useCallback(async () => {
    try {
      const [p, enc, rem] = await Promise.all([
        getPersonById(personId),
        getEncountersForPerson(personId),
        getRemindersForPerson(personId),
      ]);
      setPerson(p);
      setEncounters(enc);
      setReminders(rem);
    } catch (error) {
      console.error("[PersonProfile] load failed:", error);
    }
  }, [personId]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const unsub = navigation.addListener("focus", load);
    return unsub;
  }, [navigation, load]);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity
          onPress={() => navigation.navigate("EditPerson", { personId })}
          hitSlop={10}
          accessibilityLabel="Edit profile"
          style={styles.headerIconButton}
        >
          <Ionicons name="pencil" size={20} color="#007AFF" />
        </TouchableOpacity>
      ),
    });
  }, [navigation, personId]);

  const stats = useMemo(() => computeStats(encounters), [encounters]);

  const factRows = useMemo<FactRow[]>(() => {
    const rows: FactRow[] = [];
    for (const enc of encounters) {
      const facts = getEncounterFacts(enc);
      facts.forEach((f, i) => {
        rows.push({
          text: f.text,
          date: enc.date,
          location: enc.location,
          encounterId: enc.id,
          factIndex: i,
          favorite: !!f.favorite,
        });
      });
    }
    return rows;
  }, [encounters]);

  const favoriteRows = useMemo<FactRow[]>(
    () => factRows.filter((r) => r.favorite),
    [factRows],
  );

  const toggleFavorite = useCallback(
    async (encounterId: string, factIndex: number) => {
      const enc = encounters.find((e) => e.id === encounterId);
      if (!enc) return;
      const facts = getEncounterFacts(enc);
      const nextFacts = facts.map((f, i) =>
        i === factIndex ? { ...f, favorite: !f.favorite } : f,
      );
      try {
        await updateEncounter(encounterId, { facts: nextFacts });
        await load();
      } catch (error) {
        console.error("[PersonProfile] toggle favorite failed:", error);
      }
    },
    [encounters, load],
  );

  if (!person) {
    return (
      <View style={styles.centered}>
        <Text style={styles.loading}>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.profileHeader}>
        <Text style={styles.name}>{fullName(person)}</Text>
        {person.nickname ? (
          <Text style={styles.nickname}>{person.nickname}</Text>
        ) : null}
        {person.profession ? (
          <Text style={styles.metAt}>{person.profession}</Text>
        ) : null}
        {person.firstMetLocation ? (
          <Text style={styles.metAt}>
            First met at {person.firstMetLocation}
          </Text>
        ) : null}
        {person.birthday ? (
          <Text style={styles.metAt}>
            🎂 {formatBirthday(person.birthday)}
          </Text>
        ) : null}

        <View style={styles.statsRow}>
          <Stat label="Encounters" value={String(encounters.length)} />
          {stats.lastSeen ? (
            <Stat label="Last seen" value={stats.lastSeen} />
          ) : null}
        </View>
      </View>

      <View style={styles.tabBar}>
        <TabButton
          label={`Core${favoriteRows.length ? ` · ${favoriteRows.length}` : ""}`}
          active={tabIndex === 0}
          onPress={() => goToTab(0)}
        />
        <TabButton
          label={`Facts${factRows.length ? ` · ${factRows.length}` : ""}`}
          active={tabIndex === 1}
          onPress={() => goToTab(1)}
        />
        <TabButton
          label={`Encounters${
            encounters.length ? ` · ${encounters.length}` : ""
          }`}
          active={tabIndex === 2}
          onPress={() => goToTab(2)}
        />
        <TabButton
          label={`Reminders${
            reminders.length ? ` · ${reminders.length}` : ""
          }`}
          active={tabIndex === 3}
          onPress={() => goToTab(3)}
        />
      </View>

      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onScrollEnd}
        // Start on Facts (page index 1) — middle pane is the default view.
        contentOffset={{ x: width, y: 0 }}
        style={styles.pager}
      >
        <View style={{ width, height: "100%" }}>
          <FlatList
            data={favoriteRows}
            keyExtractor={(_, i) => `core-${i}`}
            renderItem={({ item }) => (
              <FactListItem
                row={item}
                onLongPress={() =>
                  toggleFavorite(item.encounterId, item.factIndex)
                }
              />
            )}
            contentContainerStyle={
              favoriteRows.length === 0 ? styles.emptyContainer : styles.list
            }
            ListEmptyComponent={
              <Text style={styles.emptyText}>
                No core facts yet — long-press a fact to mark it core
              </Text>
            }
          />
        </View>

        <View style={{ width, height: "100%" }}>
          <FlatList
            data={factRows}
            keyExtractor={(_, i) => `fact-${i}`}
            renderItem={({ item }) => (
              <FactListItem
                row={item}
                onLongPress={() =>
                  toggleFavorite(item.encounterId, item.factIndex)
                }
              />
            )}
            contentContainerStyle={
              factRows.length === 0 ? styles.emptyContainer : styles.list
            }
            ListEmptyComponent={
              <Text style={styles.emptyText}>No facts captured yet</Text>
            }
          />
        </View>

        <View style={{ width, height: "100%" }}>
          <FlatList
            data={encounters}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => {
              const factList = getEncounterFacts(item);
              const visibleFacts = factList.slice(0, 2);
              return (
                <TouchableOpacity
                  style={styles.encounterCard}
                  onPress={() =>
                    navigation.navigate("EditEncounter", {
                      encounterId: item.id,
                    })
                  }
                >
                  <View style={styles.encounterHeader}>
                    <Text style={styles.encounterDate}>
                      {formatTimestamp(item.date)}
                    </Text>
                    {item.location ? (
                      <Text style={styles.encounterLocation}>
                        {item.location}
                      </Text>
                    ) : null}
                  </View>
                  {visibleFacts.map((f, i) => (
                    <Text key={i} style={styles.encounterFact}>
                      {f.favorite ? "★ " : "• "}
                      {f.text}
                    </Text>
                  ))}
                  {factList.length > visibleFacts.length ? (
                    <Text style={styles.encounterMore}>
                      +{factList.length - visibleFacts.length} more
                    </Text>
                  ) : null}
                </TouchableOpacity>
              );
            }}
            contentContainerStyle={
              encounters.length === 0 ? styles.emptyContainer : styles.list
            }
            ListEmptyComponent={
              <Text style={styles.emptyText}>No encounters recorded</Text>
            }
          />
        </View>

        <View style={{ width, height: "100%" }}>
          <FlatList
            data={reminders}
            keyExtractor={(item) => item.id}
            ListHeaderComponent={
              <TouchableOpacity
                style={styles.addReminderButton}
                onPress={() =>
                  navigation.navigate("EditReminder", { personId })
                }
              >
                <Text style={styles.addReminderButtonText}>+ Add reminder</Text>
              </TouchableOpacity>
            }
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.reminderRow}
                onPress={() =>
                  navigation.navigate("EditReminder", {
                    personId,
                    reminderId: item.id,
                  })
                }
              >
                <Text style={styles.reminderMessage}>{item.message}</Text>
                <Text style={styles.reminderDate}>
                  {formatTimestamp(item.date)}
                </Text>
              </TouchableOpacity>
            )}
            contentContainerStyle={styles.list}
            ListEmptyComponent={
              <Text style={styles.emptyText}>No reminders yet</Text>
            }
          />
        </View>
      </ScrollView>

      <TouchableOpacity
        style={styles.fab}
        onPress={() =>
          navigation.navigate("EncounterForm", { prefillPersonId: personId })
        }
        accessibilityLabel="Log encounter with this person"
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
    </View>
  );
}

function FactListItem({
  row,
  onLongPress,
}: {
  row: FactRow;
  onLongPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={styles.factRow}
      onLongPress={onLongPress}
      delayLongPress={300}
      activeOpacity={0.65}
    >
      <View style={styles.factHeader}>
        <Text style={styles.factText}>{row.text}</Text>
        {row.favorite ? (
          <Ionicons name="star" size={16} color="#FFB300" />
        ) : null}
      </View>
      <Text style={styles.factMeta}>
        {formatTimestamp(row.date)}
        {row.location ? ` · ${row.location}` : ""}
      </Text>
    </TouchableOpacity>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function TabButton({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity style={styles.tabButton} onPress={onPress}>
      <Text style={[styles.tabText, active && styles.tabTextActive]}>
        {label}
      </Text>
      {active ? <View style={styles.tabUnderline} /> : null}
    </TouchableOpacity>
  );
}

function computeStats(encounters: Encounter[]): { lastSeen: string | null } {
  if (encounters.length === 0) return { lastSeen: null };
  const dates = encounters
    .map((e) => (e.date.toDate ? e.date.toDate() : null))
    .filter((d): d is Date => d !== null)
    .sort((a, b) => b.getTime() - a.getTime());
  return { lastSeen: dates.length ? relativeDays(dates[0]) : null };
}

function relativeDays(d: Date): string {
  const now = new Date();
  const dayMs = 24 * 60 * 60 * 1000;
  const diffDays = Math.floor((now.getTime() - d.getTime()) / dayMs);
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)}mo ago`;
  return `${Math.floor(diffDays / 365)}y ago`;
}

function formatTimestamp(ts: { toDate?: () => Date }): string {
  const d = ts.toDate ? ts.toDate() : new Date();
  return d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function fullName(person: Person): string {
  return person.lastName
    ? `${person.firstName} ${person.lastName}`
    : person.firstName;
}

function formatBirthday(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  centered: { flex: 1, alignItems: "center", justifyContent: "center" },
  loading: { fontSize: 16, color: "#999" },
  headerIconButton: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  profileHeader: {
    padding: 20,
    paddingBottom: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#e5e5ea",
  },
  name: { fontSize: 26, fontWeight: "700", color: "#1c1c1e" },
  nickname: { fontSize: 18, fontWeight: "500", color: "#555", marginTop: 2 },
  metAt: { fontSize: 14, color: "#666", marginTop: 4 },
  statsRow: {
    flexDirection: "row",
    marginTop: 16,
    gap: 24,
  },
  stat: {
    alignItems: "flex-start",
  },
  statValue: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1c1c1e",
  },
  statLabel: {
    fontSize: 11,
    color: "#8e8e93",
    marginTop: 2,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  tabBar: {
    flexDirection: "row",
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#e5e5ea",
  },
  tabButton: {
    paddingVertical: 12,
    marginRight: 24,
    alignItems: "center",
  },
  tabText: {
    fontSize: 14,
    color: "#8e8e93",
    fontWeight: "500",
  },
  tabTextActive: {
    color: "#1c1c1e",
    fontWeight: "600",
  },
  tabUnderline: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: -1,
    height: 2,
    borderRadius: 2,
    backgroundColor: "#007AFF",
  },
  pager: { flex: 1 },
  list: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 96 },
  factRow: {
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#eee",
  },
  factHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  factText: { fontSize: 15, color: "#1c1c1e", lineHeight: 21, flex: 1 },
  factMeta: { fontSize: 12, color: "#8e8e93", marginTop: 4 },
  encounterCard: {
    backgroundColor: "#f9f9f9",
    borderRadius: 10,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#eee",
  },
  encounterHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  encounterDate: { fontSize: 14, fontWeight: "600", color: "#333" },
  encounterLocation: { fontSize: 13, color: "#666" },
  encounterFact: { fontSize: 14, color: "#444", lineHeight: 20 },
  encounterMore: { fontSize: 12, color: "#999", marginTop: 4 },
  emptyContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  emptyText: { fontSize: 16, color: "#999" },
  fab: {
    position: "absolute",
    bottom: 28,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#007AFF",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  fabText: { color: "#fff", fontSize: 28, lineHeight: 32 },
  addReminderButton: {
    paddingVertical: 14,
    alignItems: "center",
    borderRadius: 8,
    backgroundColor: "#eef3fa",
    borderWidth: 1,
    borderColor: "#cdd9ec",
    marginBottom: 12,
  },
  addReminderButtonText: {
    color: "#007AFF",
    fontSize: 15,
    fontWeight: "600",
  },
  reminderRow: {
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#eee",
  },
  reminderMessage: { fontSize: 15, color: "#1c1c1e", lineHeight: 21 },
  reminderDate: { fontSize: 12, color: "#8e8e93", marginTop: 4 },
});
