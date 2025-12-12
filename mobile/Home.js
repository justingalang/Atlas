/**
 * Person saving rules:
 * - When a user enters a name without a last name, memo field is required
 * - When a user enters a name with a last name, memo field is optional
 * - Person identifier is stored as "Name-Memo" if no last name, else "Name"
 * - Entries are saved and retrieved using the unique identifier
 */
import {useMemo, useRef, useState, useEffect, useCallback} from 'react';
import {ScrollView, StyleSheet, Text, View, TextInput} from 'react-native';
import ListItem from './components/ListItem';
import {createPersonHandlers} from './utils/personHandlers';
import {
  addDocument,
  addSubcollectionDocument,
  getDocumentsByField,
} from './services/firebaseService';

const formatToday = () =>
  new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  }).format(new Date());

export default function Home() {
  const [name, setName] = useState('');
  const [memo, setMemo] = useState('');
  const [place, setPlace] = useState('');
  const [items, setItems] = useState(['']);
  const swipeableRefs = useRef([]);
  const today = useMemo(formatToday, []);

  const addBlankItem = useCallback(() => {
    setItems((prev) => [...prev, '']);
  }, []);

  const updateItem = useCallback((text, index) => {
    setItems((prev) => prev.map((item, i) => (i === index ? text : item)));
  }, []);

  const ensureAtLeastTwoItems = useCallback(() => {
    setItems((prev) => (prev.length < 2 ? [...prev, ''] : prev));
  }, []);

  useEffect(ensureAtLeastTwoItems, [items.length, ensureAtLeastTwoItems]);

  const closeAllSwipeables = useCallback(() => {
    swipeableRefs.current.forEach((ref) => ref?.close?.());
  }, []);

  const handleDeleteItem = useCallback(
    (index) => {
      closeAllSwipeables();
      swipeableRefs.current = swipeableRefs.current.filter((_, i) => i !== index);
      setItems((prev) => prev.filter((_, i) => i !== index));
    },
    [closeAllSwipeables],
  );

  const personHandlers = useMemo(
    () =>
      createPersonHandlers({
        addDocument,
        addSubcollectionDocument,
        getDocumentsByField,
        now: () => new Date().toISOString(),
      }),
    [],
  );

  const buildPersonPayload = useCallback(
    (data = {}) => {
      const normalizedName = name.trim();
      const normalizedMemo = memo.trim();
      const base = {};
      if (normalizedName) base.name = normalizedName;
      if (normalizedMemo) base.memo = normalizedMemo;
      return {...base, ...data};
    },
    [name, memo],
  );

  const saveEntry = useCallback(
    async (data) => {
      const payload = buildPersonPayload(data);
      if (!payload.name && !payload.memo) {
        return null;
      }
      return personHandlers.saveEntry(payload);
    },
    [buildPersonPayload, personHandlers],
  );

  const writeName = useCallback(async () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    await saveEntry({name: trimmed});
  }, [name, saveEntry]);

  const writeMemo = useCallback(async () => {
    const trimmedMemo = memo.trim();
    if (!trimmedMemo) return;
    await saveEntry({memo: trimmedMemo});
  }, [memo, saveEntry]);

  const writePlace = useCallback(async () => {
    const trimmedPlace = place.trim();
    if (!trimmedPlace) return;
    await saveEntry({place: trimmedPlace});
  }, [place, saveEntry]);

  const writeItems = useCallback(async () => {
    const validItems = items.map((item) => item.trim()).filter(Boolean);
    if (validItems.length === 0) return;
    await saveEntry({items: validItems});
  }, [items, saveEntry]);

  useEffect(() => {
    const timeoutId = setTimeout(writeItems, 1000);
    return () => clearTimeout(timeoutId);
  }, [writeItems]);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.date}>{today}</Text>
      <View style={styles.card} data-testid="person-card">
        <View style={styles.infoSection}>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Name"
            style={styles.input}
            onEndEditing={writeName}
          />
          <TextInput
            value={memo}
            onChangeText={setMemo}
            placeholder="Add a way to identify this person"
            style={styles.input}
            onEndEditing={writeMemo}
          />
          <TextInput
            value={place}
            onChangeText={setPlace}
            placeholder="Where"
            style={styles.input}
            onEndEditing={writePlace}
          />
        </View>
        <View style={styles.learntSection}>
          <Text style={styles.label}>News</Text>
          {items.map((item, index) => (
            <ListItem
              ref={(ref) => {
                swipeableRefs.current[index] = ref;
              }}
              key={`item-${index}`}
              value={item}
              placeholder={`Item ${index + 1}`}
              inputStyle={styles.listInput}
              onChangeText={(text) => {
                updateItem(text, index);
                if (index === items.length - 1 && text.trim()) {
                  addBlankItem();
                }
              }}
              onDelete={() => handleDeleteItem(index)}
              onEndEditing={writeItems}
            />
          ))}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: '#f6f7fb'},
  content: {paddingHorizontal: 20, paddingTop: 24, paddingBottom: 48},
  date: {fontSize: 28, fontWeight: '700', color: '#0f172a', marginBottom: 24},
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 18,
    shadowColor: '#1d1d1d',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: {width: 0, height: 6},
    elevation: 3,
  },
  infoSection: {
    paddingBottom: 14,
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  learntSection: {paddingTop: 4},
  label: {fontSize: 14, fontWeight: '600', color: '#1f2937', marginBottom: 8},
  input: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: '#111827',
    backgroundColor: '#fff',
    marginBottom: 18,
  },
  listHeader: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'},
  addButton: {paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, backgroundColor: '#0f7ae5'},
  addButtonPressed: {opacity: 0.9},
  addButtonLabel: {color: '#f8fafc', fontWeight: '600', fontSize: 14},
  listInput: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: '#111827',
    backgroundColor: '#fff',
    marginTop: 12,
  },
});
