import React, {useEffect, useRef, useState} from 'react';
import {
  View,
  TextInput,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';

const AutocompleteTextInput = ({
  value,
  onChangeText,
  placeholder = '',
  suggestions: propSuggestions,
  onSelectSuggestion,
  inputStyle,
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const [filteredSuggestions, setFilteredSuggestions] = useState([]);
  const isSelectingRef = useRef(false);
  const suggestions = propSuggestions ?? [];

  // Re-filter whenever the parent-controlled value changes
  useEffect(() => {
    if (value && value.trim().length > 0) {
      const lowered = value.trim().toLowerCase();
      setFilteredSuggestions(
        suggestions.filter((s) => s.toLowerCase().includes(lowered)),
      );
    } else {
      setFilteredSuggestions([]);
    }
  }, [value, propSuggestions]);

  const handleSelect = (suggestion) => {
    isSelectingRef.current = true;
    onChangeText?.(suggestion);
    onSelectSuggestion?.(suggestion);
    setFilteredSuggestions([]);
    setIsFocused(false);
    setTimeout(() => {
      isSelectingRef.current = false;
    }, 0);
  };

  const showDropdown = isFocused && filteredSuggestions.length > 0;

  return (
    <View style={styles.container}>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        style={[styles.input, inputStyle]}
        onFocus={() => setIsFocused(true)}
        onBlur={() => {
          if (!isSelectingRef.current) {
            setIsFocused(false);
            setFilteredSuggestions([]);
          }
        }}
      />

      {showDropdown && (
        <View style={styles.dropdown}>
          <ScrollView keyboardShouldPersistTaps="handled">
            {filteredSuggestions.map((item, index) => (
              <TouchableOpacity
                key={`${item}-${index}`}
                onPressIn={() => handleSelect(item)}
                style={styles.item}
                activeOpacity={0.7}
              >
                <Text style={styles.itemText}>{item}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: '#111827',
    backgroundColor: '#fff',
  },
  dropdown: {
    marginTop: 6,
    maxHeight: 220,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: {width: 0, height: 4},
    elevation: 3,
  },
  item: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  itemText: {
    fontSize: 16,
    color: '#111827',
  },
});

export default AutocompleteTextInput;
