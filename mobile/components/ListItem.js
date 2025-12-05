import React, {forwardRef} from 'react';
import {Pressable, Text, TextInput} from 'react-native';
import Swipeable from 'react-native-gesture-handler/ReanimatedSwipeable';

const ListItem = forwardRef(
  ({value, placeholder, onChangeText, onDelete, inputStyle}, ref) => (
    <Swipeable
      ref={ref}
      renderRightActions={() => (
        <Pressable
          onPress={onDelete}
          style={({pressed}) => ({
            backgroundColor: '#ef4444',
            justifyContent: 'center',
            alignItems: 'center',
            width: 72,
            marginTop: 12,
            borderRadius: 10,
            opacity: pressed ? 0.9 : 1,
          })}
        >
          <Text style={{color: '#fff', fontWeight: '700'}}>Delete</Text>
        </Pressable>
      )}
    >
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        style={inputStyle}
        placeholderTextColor="#6b7280"
      />
    </Swipeable>
  ),
);

export default ListItem;
