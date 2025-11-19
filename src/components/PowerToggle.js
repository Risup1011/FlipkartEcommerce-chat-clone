import React, { useRef, useEffect } from 'react';
import { TouchableOpacity, View, StyleSheet, Animated, Image } from 'react-native';
import { icons } from '../assets';

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
          <Image 
            source={icons.powerOnOff} 
            style={styles.icon}
            resizeMode="contain"
          />
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
    backgroundColor: '#f44336',   // red for off state
  },
  trackOn: {
    backgroundColor: '#4CAF50',   // green for on state
  },
  circle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',  // white circle
    justifyContent: 'center',
    alignItems: 'center',
  },
  icon: {
    width: 18,
    height: 18,
  },
});
