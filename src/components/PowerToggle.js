import React, { useRef, useEffect } from 'react';
import { TouchableOpacity, View, StyleSheet, Animated, Text } from 'react-native';

export default function PowerToggle({ value = false, onValueChange, disabled = false }) {
  const anim = useRef(new Animated.Value(value ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(anim, {
      toValue: value ? 1 : 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [value, anim]);

  const toggle = () => {
    if (!disabled && onValueChange) {
      onValueChange(!value);
    }
  };

  const circleTranslate = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 30], // circle movement
  });

  return (
    <TouchableOpacity 
      activeOpacity={0.9} 
      onPress={toggle}
      disabled={disabled}
    >
      <View style={[styles.track, value ? styles.trackOn : styles.trackOff]}>
        <Animated.View style={[styles.circle, { transform: [{ translateX: circleTranslate }] }]}>
          <Text style={styles.circleText}>
            {value ? '拔' : '坡'}
          </Text>
        </Animated.View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  track: {
    width: 70,
    height: 32,
    borderRadius: 20,
    padding: 2,
    justifyContent: 'center',
  },
  trackOff: {
    backgroundColor: '#e5e5e5',   // light gray like your image
  },
  trackOn: {
    backgroundColor: '#FF6E1A',   // orange color matching app theme
  },
  circle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#8a8a8a',  // dark gray circle like image
    justifyContent: 'center',
    alignItems: 'center',
  },
  circleText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
