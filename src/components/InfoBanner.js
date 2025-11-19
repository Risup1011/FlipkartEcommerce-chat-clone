import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { Poppins, icons } from '../assets';

const InfoBanner = ({ text, style, textStyle, iconStyle }) => {
  return (
    <View style={[styles.container, style]}>
      <Image
        source={icons.exclamation}
        style={[styles.icon, iconStyle]}
        resizeMode="center"
      />
      <Text style={[styles.message, textStyle]}>{text}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: '#405375',
    borderRadius: 8,
    padding: 15,
    marginBottom: 25,
    alignItems: 'flex-start',
  },
  icon: {
    width: 24,
    height: 24,
    marginRight: 10,
    marginTop: 2,
    tintColor: '#FFFFFF',
  },
  message: {
    flex: 1,
    fontFamily: Poppins.regular,
    fontSize: 14,
    color: '#FFFFFF',
    lineHeight: 20,
  },
});

export default InfoBanner;
