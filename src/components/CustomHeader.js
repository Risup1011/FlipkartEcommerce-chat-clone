import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
} from 'react-native';
import { Poppins, icons } from '../assets';

const CustomHeader = ({ title, onBack, showBackButton = true }) => {
  return (
    <View style={styles.headerContainer}>
      {showBackButton && (
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Image
            source={icons.backArrow}
            style={styles.backArrow}
            resizeMode="contain"
          />
        </TouchableOpacity>
      )}
      {title && (
        <Text style={styles.headerTitle}>{title}</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 15,
    marginTop: 40,
    
  },
  backButton: {
    padding: 5,
    marginRight: 15,
  },
  backArrow: {
    width: 24,
    height: 24,
  },
  headerTitle: {
    fontFamily: Poppins.bold,
    fontSize: 24,
    fontWeight: '700',
    lineHeight: 24,
    letterSpacing: 0,
    color: '#000000',
    textTransform: 'capitalize',
    flex: 1,
  },
});

export default CustomHeader;
