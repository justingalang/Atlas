import {useMemo, useState, useEffect} from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

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

  const today = useMemo(() => formatToday(), []);

  const addBlankItem = () => {
    setItems((prev) => [...prev, '']);
  };

  const updateItem = (text, index) => {
    setItems((prev) => prev.map((item, i) => (i === index ? text : item)));
  };

  const [nameSuggestionsVisible, setNameSuggestionsVisible] = useState(false);
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

  const filteredNameOptions = useMemo(() => {
    const query = name.trim().toLowerCase();
    if (!query) {
      return nameOptions.slice(0, 5);
    }
    return nameOptions.filter((option) =>
      option.toLowerCase().includes(query),
    );
  }, [nameOptions, name]);

  const handleSelectName = (option) => {
    setName(option);
    setNameSuggestionsVisible(false);
  };

  const [selectedSuggestion, setSelectedSuggestion] = useState(null);

  const handleSuggestionPress = (option) => {
    setSelectedSuggestion(option);
    handleSelectName(option);
  };

  useEffect(() => {
    if (items.length < 2) {
      setItems((prev) => (prev.length < 2 ? [...prev, ''] : prev));
    }
  }, [items.length]);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.date}>{today}</Text>

      <View style={styles.card}>
        <View style={{marginBottom: 18}}>
          <Text style={styles.label}>Name</Text>
          <TextInput
            value={name}
            onChangeText={(text) => {
              setName(text);
              setSelectedSuggestion(null);
              setNameSuggestionsVisible(true);
            }}
            onFocus={() => setNameSuggestionsVisible(true)}
            onBlur={() => {
              setTimeout(() => setNameSuggestionsVisible(false), 150);
            }}
            placeholder="Name"
            placeholderTextColor="#6b7280"
            style={styles.input}
            autoCorrect={false}
          />

          {nameSuggestionsVisible && (
            <View
              style={{
                borderWidth: 1,
                borderColor: '#e5e7eb',
                borderRadius: 10,
                marginTop: 8,
                backgroundColor: '#fff',
                overflow: 'hidden',
              }}
            >
              {filteredNameOptions.length === 0 ? (
                <Text
                  style={{
                    paddingHorizontal: 12,
                    paddingVertical: 10,
                    color: '#9ca3af',
                  }}
                  selectable
                >
                  No matches found
                </Text>
              ) : (
                <ScrollView
                  style={{maxHeight: 180}}
                  keyboardShouldPersistTaps="handled"
                >
                  {filteredNameOptions.map((option) => {
                    const isSelected = option === selectedSuggestion;
                    return (
                      <Pressable
                        key={option}
                        onPress={() => handleSuggestionPress(option)}
                        style={({pressed}) => ({
                          paddingHorizontal: 12,
                          paddingVertical: 10,
                          borderBottomWidth: 1,
                          borderBottomColor: '#f1f5f9',
                          backgroundColor: isSelected
                            ? '#e0f2fe'
                            : pressed
                              ? '#f8fafc'
                              : '#fff',
                        })}
                      >
                        <Text
                          style={{
                            color: isSelected ? '#0f172a' : '#111827',
                            fontWeight: isSelected ? '700' : '400',
                          }}
                          selectable
                        >
                          {option}
                        </Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>
              )}
            </View>
          )}
        </View>

        <Text style={styles.label}>List</Text>

        {items.map((item, index) => (
          <TextInput
            key={`item-${index}`}
            value={item}
            onChangeText={(text) => {
              updateItem(text, index);
              if (index === items.length - 1 && text.trim().length > 0) {
                addBlankItem();
              }
            }}
            placeholder={`Item ${index + 1}`}
            style={styles.listInput}
            placeholderTextColor="#6b7280"
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
