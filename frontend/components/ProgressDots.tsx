import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Colors } from '../constants/colors';

interface ProgressDotsProps {
  total: number;
  current: number;
  onDotPress?: (index: number) => void;
}

export const ProgressDots: React.FC<ProgressDotsProps> = ({
  total,
  current,
  onDotPress,
}) => {
  return (
    <View style={styles.container}>
      {Array.from({ length: total }, (_, index) => (
        <TouchableOpacity
          key={index}
          style={[
            styles.dot,
            index === current && styles.activeDot,
          ]}
          onPress={() => onDotPress?.(index)}
          activeOpacity={0.7}
        />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.stone[300],
  },
  activeDot: {
    backgroundColor: Colors.accent,
    width: 12,
    height: 12,
    borderRadius: 6,
  },
});
