import { useCallback, useEffect, useState } from "react";
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Calendar, DateData } from "react-native-calendars";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { Encounter } from "../types";
import type { RootStackParamList } from "../navigation/types";
import { getEncountersByDate, getRecentEncounters } from "../services";
import { getEncounterFacts } from "../utils/encounterContent";

interface Props {
  onAddEncounter: (date: string) => void;
}

export default function CalendarView({ onAddEncounter }: Props) {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [selectedDate, setSelectedDate] = useState<string>(formatToday());
  const [encounters, setEncounters] = useState<Encounter[]>([]);
  const [markedDates, setMarkedDates] = useState<Record<string, { marked: boolean }>>({});

  // Load dates that have encounters (from recent history)
  useEffect(() => {
    getRecentEncounters(200).then((data) => {
      const dates: Record<string, { marked: boolean }> = {};
      for (const enc of data) {
        const d = enc.date.toDate ? enc.date.toDate() : new Date();
        const key = formatDateKey(d);
        dates[key] = { marked: true };
      }
      setMarkedDates(dates);
    });
  }, []);

  // Load encounters for selected date
  useEffect(() => {
    const [y, m, d] = selectedDate.split("-").map(Number);
    getEncountersByDate(new Date(y, m - 1, d)).then(setEncounters);
  }, [selectedDate]);

  const handleDayPress = useCallback((day: DateData) => {
    setSelectedDate(day.dateString);
  }, []);

  return (
    <View style={styles.container}>
      <Calendar
        current={selectedDate}
        onDayPress={handleDayPress}
        markedDates={{
          ...markedDates,
          [selectedDate]: {
            ...markedDates[selectedDate],
            selected: true,
            selectedColor: "#007AFF",
          },
        }}
        theme={{
          todayTextColor: "#007AFF",
          arrowColor: "#007AFF",
        }}
      />

      <View style={styles.dateHeader}>
        <Text style={styles.dateTitle}>{formatDisplayDate(selectedDate)}</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => onAddEncounter(selectedDate)}
        >
          <Text style={styles.addButtonText}>+ Add</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={encounters}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => {
          const factList = getEncounterFacts(item);
          return (
            <TouchableOpacity
              style={styles.card}
              onPress={() =>
                navigation.navigate("PersonProfile", { personId: item.personId })
              }
            >
              <Text style={styles.personName}>{item.personName}</Text>
              {item.location ? (
                <Text style={styles.location}>{item.location}</Text>
              ) : null}
              {factList.map((f, i) => (
                <Text key={i} style={styles.fact} numberOfLines={1}>
                  • {f}
                </Text>
              ))}
            </TouchableOpacity>
          );
        }}
        contentContainerStyle={encounters.length === 0 ? styles.emptyContainer : styles.list}
        ListEmptyComponent={
          <Text style={styles.emptyText}>No encounters on this date</Text>
        }
      />
    </View>
  );
}

function formatToday(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function formatDateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function formatDisplayDate(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  dateHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  dateTitle: { fontSize: 15, fontWeight: "600", color: "#333" },
  addButton: {
    backgroundColor: "#007AFF",
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  addButtonText: { color: "#fff", fontSize: 14, fontWeight: "600" },
  list: { padding: 16 },
  card: {
    backgroundColor: "#f9f9f9",
    borderRadius: 10,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#eee",
  },
  personName: { fontSize: 16, fontWeight: "600", color: "#007AFF" },
  location: { fontSize: 13, color: "#666", marginTop: 2 },
  fact: { fontSize: 14, color: "#333", marginTop: 2, lineHeight: 20 },
  emptyContainer: { flex: 1, justifyContent: "center", alignItems: "center", paddingTop: 40 },
  emptyText: { fontSize: 15, color: "#999" },
});
