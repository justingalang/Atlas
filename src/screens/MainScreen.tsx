import { useCallback, useEffect, useRef, useState } from "react";
import {
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation/types";
import { Ionicons } from "@expo/vector-icons";
import CalendarView from "../components/CalendarView";
import TimelinePane from "../components/TimelinePane";

type Segment = "calendar" | "timeline";

const SEGMENTS: Segment[] = ["calendar", "timeline"];

export default function MainScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { width } = useWindowDimensions();
  const [segmentIndex, setSegmentIndex] = useState(0);
  const [refreshSignal, setRefreshSignal] = useState(0);
  const hasAutoPresented = useRef(false);
  const scrollRef = useRef<ScrollView>(null);

  // Auto-present the encounter form on first launch.
  useEffect(() => {
    if (!hasAutoPresented.current) {
      hasAutoPresented.current = true;
      navigation.navigate("EncounterForm");
    }
  }, [navigation]);

  // When the form closes, bump refreshSignal so panes re-fetch.
  useEffect(() => {
    const unsub = navigation.addListener("focus", () => {
      setRefreshSignal((n) => n + 1);
    });
    return unsub;
  }, [navigation]);

  const handleAddEncounter = useCallback(
    (date?: string) => {
      navigation.navigate(
        "EncounterForm",
        date ? { prefillDate: date } : undefined,
      );
    },
    [navigation],
  );

  const handleSelectPerson = useCallback(
    (personId: string) => {
      navigation.navigate("PersonProfile", { personId });
    },
    [navigation],
  );

  const goToSegment = useCallback(
    (index: number) => {
      setSegmentIndex(index);
      scrollRef.current?.scrollTo({ x: index * width, animated: true });
    },
    [width],
  );

  const onScrollEnd = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const offsetX = e.nativeEvent.contentOffset.x;
      const idx = Math.round(offsetX / width);
      if (idx !== segmentIndex) setSegmentIndex(idx);
    },
    [width, segmentIndex],
  );

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.segContainer}>
        <View style={styles.seg}>
          {SEGMENTS.map((s, i) => {
            const active = segmentIndex === i;
            return (
              <TouchableOpacity
                key={s}
                style={[styles.segItem, active && styles.segItemActive]}
                onPress={() => goToSegment(i)}
                activeOpacity={0.85}
              >
                <Text
                  style={[styles.segText, active && styles.segTextActive]}
                >
                  {labelFor(s)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onScrollEnd}
        style={styles.body}
      >
        <View style={{ width }}>
          <CalendarView onAddEncounter={handleAddEncounter} />
        </View>
        <View style={{ width }}>
          <TimelinePane
            onSelectPerson={handleSelectPerson}
            refreshSignal={refreshSignal}
          />
        </View>
      </ScrollView>

      <TouchableOpacity
        style={[styles.fab, styles.fabLeft]}
        onPress={() => navigation.navigate("People")}
        accessibilityLabel="People list"
      >
        <Ionicons name="people" size={26} color="#fff" />
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.fab}
        onPress={() => handleAddEncounter()}
        accessibilityLabel="Log new encounter"
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

function labelFor(s: Segment): string {
  if (s === "calendar") return "Calendar";
  return "Timeline";
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  segContainer: {
    paddingVertical: 12,
    alignItems: "center",
    backgroundColor: "#fff",
  },
  seg: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e5e5ea",
    borderRadius: 999,
    padding: 3,
  },
  segItem: {
    paddingVertical: 7,
    paddingHorizontal: 22,
    borderRadius: 999,
  },
  segItemActive: {
    backgroundColor: "#007AFF",
  },
  segText: {
    fontSize: 13,
    color: "#555",
    fontWeight: "500",
  },
  segTextActive: {
    color: "#fff",
    fontWeight: "600",
  },
  body: { flex: 1 },
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
  fabLeft: {
    left: 24,
    right: undefined,
  },
  fabText: { color: "#fff", fontSize: 28, lineHeight: 32 },
});
