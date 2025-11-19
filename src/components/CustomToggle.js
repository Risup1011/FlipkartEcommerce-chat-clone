import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

const CustomToggle = ({ value, onValueChange }) => {
  return (
    <TouchableOpacity
      style={styles.toggleContainer}
      onPress={() => onValueChange(!value)}
      activeOpacity={0.8}
    >
      {/* White thumb that slides */}
      <View
        style={[
          styles.innerCircle,
          value ? styles.circleLeft : styles.circleRight,
        ]}
      >
        <Text style={[styles.text, value ? styles.textActive : styles.textInactive]}>
          {value ? 'Yes' : 'No'}
        </Text>
      </View>
      {/* Background labels - always visible in gray areas */}
      <View style={styles.backgroundLabels}>
        <Text style={[styles.labelText, styles.labelLeft]}>
          Yes
        </Text>
        <Text style={[styles.labelText, styles.labelRight]}>
          No
        </Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  toggleContainer: {
    width: 90,
    height: 35,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 3,
    backgroundColor: '#aaa',
    position: 'relative',
  },
  innerCircle: {
    width: '50%',
    height: '100%',
    borderRadius: 14.5,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'absolute',
    zIndex: 2,
  },
  circleLeft: {
    left: 3,
  },
  circleRight: {
    right: 3,
  },
  text: {
    fontSize: 14,
    fontWeight: '600',
  },
  textActive: {
    color: '#FF6E1A', // orange text when Yes is selected
  },
  textInactive: {
    color: '#000', // black text when No is selected
  },
  backgroundLabels: {
    flexDirection: 'row',
    width: '100%',
    height: '100%',
    position: 'absolute',
    zIndex: 1,
  },
  labelText: {
    width: '50%',
    textAlign: 'center',
    color: '#000',
    fontWeight: '600',
    fontSize: 14,
    lineHeight: 29,
  },
  labelLeft: {
    paddingLeft: 3,
  },
  labelRight: {
    paddingRight: 3,
  },
  labelInactive: {
    color: '#000', // black text for inactive label
  },
});

export default CustomToggle;
