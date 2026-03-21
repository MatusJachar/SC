import React from 'react';
import { TouchableOpacity, Text, StyleSheet, View } from 'react-native';
import { Colors } from '../constants/colors';
import { Language } from '../types';

interface LanguageButtonProps {
  language: Language;
  isSelected?: boolean;
  onPress: () => void;
}

export const LanguageButton: React.FC<LanguageButtonProps> = ({
  language,
  isSelected = false,
  onPress,
}) => {
  return (
    <TouchableOpacity
      style={[styles.button, isSelected && styles.selectedButton]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <Text style={styles.flag}>{language.flag_emoji}</Text>
      <Text style={[styles.name, isSelected && styles.selectedName]}>
        {language.native_name}
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginVertical: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  selectedButton: {
    backgroundColor: Colors.accent,
    borderColor: Colors.accent,
  },
  flag: {
    fontSize: 24,
    marginRight: 12,
  },
  name: {
    fontSize: 18,
    fontWeight: '500',
    color: Colors.white,
  },
  selectedName: {
    color: Colors.stone[900],
  },
});
