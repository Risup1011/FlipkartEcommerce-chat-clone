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
    outputRange: [0, 34], // circle movement (70 - 40 + 4)
  });

  return (
    <TouchableOpacity 
      activeOpacity={0.9} 
      onPress={toggle}
      disabled={disabled}
      style={styles.container}
    >
      <View style={[styles.track, value ? styles.trackOn : styles.trackOff]}>
        <Animated.View style={[styles.circle, { transform: [{ translateX: circleTranslate }] }]}>
          <Image 
            source={icons.powerOnOff} 
            style={styles.icon}
            resizeMode="contain"
            tintColor={value ? '#29b32e' : '#EF5350'}
          />
        </Animated.View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: 'visible',
  },
  track: {
    width: 70,
    height: 36,
    borderRadius: 20,
    padding: 0,
    justifyContent: 'center',
    overflow: 'visible',
  },
  trackOff: {
    backgroundColor: '#f57f7d',   // red for off state
  },
  trackOn: {
    backgroundColor: '#81C784',   // light green for on state
  },
  circle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',  // white circle
    justifyContent: 'center',
    alignItems: 'center',
    position: 'absolute',
    left: -4,
  },
  icon: {
    width: 32,
    height: 32,
  },
});
