import React, { forwardRef } from 'react';
import {
  View,
  TextInput,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
} from 'react-native';
import { Poppins, icons } from '../assets';

const CustomTextInput = forwardRef(({
  value,
  onChangeText,
  placeholder,
  keyboardType = 'default',
  maxLength,
  error,
  countryCode,
  countryFlag,
  onCountryCodePress,
  showCountryCode = false,
  rightButton,
  onRightButtonPress,
  ...props
}, ref) => {
  return (
    <View>
      <View style={[
        styles.inputContainer, 
        error ? styles.inputContainerError : styles.inputContainerNormal
      ]}>
        {showCountryCode && (
          <TouchableOpacity
            style={styles.countryCodeButton}
            onPress={onCountryCodePress}
            activeOpacity={0.7}
          >
            <Text style={styles.flagEmoji}>{countryFlag}</Text>
            <Text style={styles.countryCode}>{countryCode}</Text>
            <Image
              source={icons.downArrow}
              style={styles.dropdownArrow}
              resizeMode="contain"
            />
          </TouchableOpacity>
        )}
        <TextInput
          ref={ref}
          style={[
            styles.textInput, 
            showCountryCode && styles.textInputWithCountryCode,
            rightButton && styles.textInputWithRightButton
          ]}
          placeholder={placeholder}
          placeholderTextColor="#999"
          keyboardType={keyboardType}
          value={value}
          onChangeText={onChangeText}
          maxLength={maxLength}
          {...props}
        />
        {rightButton && (
          <TouchableOpacity
            style={styles.rightButton}
            onPress={onRightButtonPress}
            activeOpacity={0.7}
          >
            <Text style={styles.rightButtonText}>{rightButton}</Text>
          </TouchableOpacity>
        )}
      </View>
      {error && (
        <Text style={styles.errorText}>{error}</Text>
      )}
    </View>
  );
});

CustomTextInput.displayName = 'CustomTextInput';

const styles = StyleSheet.create({
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  inputContainerNormal: {
    borderColor: 'transparent',
    backgroundColor: '#F5F5F5',
  },
  inputContainerError: {
    borderColor: '#FF0000',
    backgroundColor: '#F5F5F5',
  },
  countryCodeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 15,
    borderRightWidth: 1,
    borderRightColor: '#E0E0E0',
    minWidth: 80,
  },
  flagEmoji: {
    fontSize: 20,
    marginRight: 8,
  },
  countryCode: {
    fontFamily: Poppins.medium,
    fontSize: 16,
    color: '#000000',
    marginRight: 5,
  },
  dropdownArrow: {
    width: 12,
    height: 12,
    marginLeft: 5,
    tintColor: '#666666',
  },
  textInput: {
    flex: 1,
    paddingHorizontal: 15,
    paddingVertical: 15,
    fontFamily: Poppins.regular,
    fontSize: 16,
    color: '#000000',
    backgroundColor: 'transparent',
  },
  textInputWithCountryCode: {
    // Additional styles if needed when country code is shown
  },
  textInputWithRightButton: {
    paddingRight: 5,
  },
  rightButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
  },
  rightButtonText: {
    fontFamily: Poppins.medium,
    fontSize: 14,
    color: '#FF6E1A',
  },
  errorText: {
    fontFamily: Poppins.regular,
    fontSize: 12,
    color: '#FF0000',
    marginTop: 5,
    marginBottom: 5,
    paddingHorizontal: 5,
  },
});

export default CustomTextInput;
