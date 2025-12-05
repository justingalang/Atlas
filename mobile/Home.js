import {useMemo, useRef, useState, useEffect} from 'react';
import {ScrollView, StyleSheet, Text, View} from 'react-native';
import NameField from './components/NameField';
import ListItem from './components/ListItem';

const formatToday = () => {
  const formatter = new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
  return formatter.format(new Date());
};

export default function Home() {
  const [name, setName] = useState('');
  const [items, setItems] = useState(['']);
  const swipeableRefs = useRef([]);

  const today = useMemo(() => formatToday(), []);

  const addBlankItem = () => {
    setItems((prev) => [...prev, '']);
  };

  const updateItem = (text, index) => {
    setItems((prev) => prev.map((item, i) => (i === index ? text : item)));
  };

  const nameOptions = useMemo(
    () => [
      'Alice Johnson',
      'Brandon Lee',
      'Carla Mendes',
      'Daniel Wu',
      'Emily Thompson',
      'Felix Ortega',
      'Grace Kim',
      'Hector Alvarez',
    ],
    [],
  );

  useEffect(() => {
    if (items.length < 2) {
      setItems((prev) => (prev.length < 2 ? [...prev, ''] : prev));
    }
  }, [items.length]);

  const closeAllSwipeables = () => {
    swipeableRefs.current.forEach((ref) => {
      if (ref?.close) {
        ref.close();
      }
    });
  };

  const handleDeleteItem = (index) => {
    closeAllSwipeables();
    swipeableRefs.current = swipeableRefs.current.filter((_, i) => i !== index);
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.date}>{today}</Text>

      <View style={styles.card}>
        <View style={{marginBottom: 18}}>
          <Text style={styles.label}>Name</Text>
          <NameField
            value={name}
            onChange={setName}
            options={nameOptions}
            inputStyle={styles.input}
          />
        </View>

        <Text style={styles.label}>What did you learn today?</Text>

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
              if (index === items.length - 1 && text.trim().length > 0) {
                addBlankItem();
              }
            }}
            onDelete={() => handleDeleteItem(index)}
          />
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f6f7fb',
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 48,
  },
  date: {
    fontSize: 28,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 24,
  },
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
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 8,
  },
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
  listHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  addButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#0f7ae5',
  },
  addButtonPressed: {
    opacity: 0.9,
  },
  addButtonLabel: {
    color: '#f8fafc',
    fontWeight: '600',
    fontSize: 14,
  },
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
