import React, { useRef, useEffect } from 'react';
import { TouchableOpacity, View, StyleSheet, Animated, Image } from 'react-native';
import { icons } from '../assets';

export default function PowerToggle({ value = false, onValueChange, disabled = false }) {
  const anim = useRef(new Animated.Value(value ? 1 : 0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Slide animation
    Animated.spring(anim, {
      toValue: value ? 1 : 0,
      friction: 5,
      tension: 40,
      useNativeDriver: true,
    }).start();

    // Scale bounce animation
    Animated.sequence([
      Animated.spring(scaleAnim, {
        toValue: 1.3,
        friction: 3,
        tension: 40,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 3,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();

    // Rotation animation
    Animated.sequence([
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(rotateAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start();

    // Pulse animation for track
    Animated.sequence([
      Animated.timing(pulseAnim, {
        toValue: 1.05,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(pulseAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();
  }, [value]);

  const toggle = () => {
    if (!disabled && onValueChange) {
      onValueChange(!value);
    }
  };

  const circleTranslate = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 34], // circle movement (70 - 40 + 4)
  });

  const iconRotate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <TouchableOpacity 
      activeOpacity={0.9} 
      onPress={toggle}
      disabled={disabled}
      style={styles.container}
    >
      <Animated.View 
        style={[
          styles.track, 
          value ? styles.trackOn : styles.trackOff,
          { transform: [{ scale: pulseAnim }] }
        ]}
      >
        <Animated.View 
          style={[
            styles.circle, 
            { 
              transform: [
                { translateX: circleTranslate },
                { scale: scaleAnim },
              ] 
            }
          ]}
        >
          <Animated.Image 
            source={icons.powerOnOff} 
            style={[
              styles.icon,
              { transform: [{ rotate: iconRotate }] }
            ]}
            resizeMode="contain"
            tintColor={value ? '#29b32e' : '#EF5350'}
          />
        </Animated.View>
      </Animated.View>
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
