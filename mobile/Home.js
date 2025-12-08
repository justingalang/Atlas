import {useMemo, useRef, useState, useEffect, useCallback} from 'react';
import {ScrollView, StyleSheet, Text, View, TextInput} from 'react-native';
import ListItem from './components/ListItem';
import {addDocument} from './services/firebaseService';

const formatToday = () =>
  new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  }).format(new Date());

export default function Home() {
  const [name, setName] = useState('');
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

  const savePerson = useCallback(async (docId, data) => {
    try {
      await addDocument('people', data, docId);
    } catch (error) {
      console.warn('Failed to save to Firestore:', error);
    }
  }, []);

  const writeName = useCallback(async () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    await savePerson(trimmed, {name: trimmed});
  }, [name, savePerson]);

  const writePlace = useCallback(async () => {
    const docId = name.trim();
    const trimmedPlace = place.trim();
    if (!docId || !trimmedPlace) return;
    await savePerson(docId, {place: trimmedPlace});
  }, [name, place, savePerson]);

  const writeItems = useCallback(async () => {
    const docId = name.trim();
    const validItems = items.map((item) => item.trim()).filter(Boolean);
    if (!docId || validItems.length === 0) return;
    await savePerson(docId, {items: validItems});
  }, [items, name, savePerson]);

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
