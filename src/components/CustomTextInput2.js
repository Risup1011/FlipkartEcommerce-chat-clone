import React, { forwardRef } from 'react';
import {
  View,
  TextInput,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
} from 'react-native';
import { Poppins } from '../assets';

const CustomTextInput2 = forwardRef(({
  value,
  onChangeText,
  placeholder,
  keyboardType = 'default',
  maxLength,
  error,
  rightButton,
  onRightButtonPress,
  rightIcon,
  onRightIconPress,
  ...props
}, ref) => {
  return (
    <View>
      <View style={[
        styles.inputContainer, 
        error ? styles.inputContainerError : styles.inputContainerNormal
      ]}>
        <TextInput
          ref={ref}
          style={[
            styles.textInput,
            (rightButton || rightIcon) && styles.textInputWithRightButton
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
        {rightIcon && (
          <TouchableOpacity
            style={styles.rightIconButton}
            onPress={onRightIconPress}
            activeOpacity={0.7}
          >
            <Image
              source={rightIcon}
              style={styles.rightIcon}
              resizeMode="contain"
            />
          </TouchableOpacity>
        )}
      </View>
      {error && (
        <Text style={styles.errorText}>{error}</Text>
      )}
    </View>
  );
});

CustomTextInput2.displayName = 'CustomTextInput2';

const styles = StyleSheet.create({
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    minHeight: 50,
  },
  inputContainerNormal: {
    borderColor: '#E0E0E0',
    backgroundColor: '#FFFFFF',
  },
  inputContainerError: {
    borderColor: '#FF0000',
    backgroundColor: '#FFFFFF',
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
  rightIconButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rightIcon: {
    width: 20,
    height: 20,
    tintColor: '#666666',
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

export default CustomTextInput2;
