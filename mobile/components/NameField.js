import {useEffect, useMemo, useRef, useState} from 'react';
import {Pressable, ScrollView, Text, TextInput, View} from 'react-native';

export default function NameField({
  value,
  onChange,
  options,
  inputStyle,
  placeholder = 'Name',
}) {
  const [nameSuggestionsVisible, setNameSuggestionsVisible] = useState(false);
  const [selectedSuggestion, setSelectedSuggestion] = useState(null);
  const blurTimeoutRef = useRef(null);

  useEffect(() => {
    return () => {
      if (blurTimeoutRef.current) {
        clearTimeout(blurTimeoutRef.current);
      }
    };
  }, []);

  const filteredOptions = useMemo(() => {
    const query = value.trim().toLowerCase();
    if (!query) {
      return options.slice(0, 5);
    }
    return options.filter((option) =>
      option.toLowerCase().includes(query),
    );
  }, [options, value]);

  const handleChangeText = (text) => {
    setSelectedSuggestion(null);
    setNameSuggestionsVisible(true);
    onChange(text);
  };

  const handleSelect = (option) => {
    setSelectedSuggestion(option);
    onChange(option);
    setNameSuggestionsVisible(false);
  };

  const handleBlur = () => {
    blurTimeoutRef.current = setTimeout(() => {
      setNameSuggestionsVisible(false);
    }, 150);
  };

  return (
    <>
      <TextInput
        value={value}
        onChangeText={handleChangeText}
        onFocus={() => setNameSuggestionsVisible(true)}
        onBlur={handleBlur}
        placeholder={placeholder}
        placeholderTextColor="#6b7280"
        style={inputStyle}
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
          {filteredOptions.length === 0 ? (
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
              {filteredOptions.map((option) => {
                const isSelected = option === selectedSuggestion;
                return (
                  <Pressable
                    key={option}
                    onPress={() => handleSelect(option)}
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
    </>
  );
}
