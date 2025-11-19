import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableWithoutFeedback,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Poppins, icons } from '../assets';
import CustomHeader from './CustomHeader';
import CustomTextInput2 from './CustomTextInput2';
import CustomDropdown from './CustomDropdown';
import CustomButton from './CustomButton';
import CustomToggle from './CustomToggle';
import InfoBanner from './InfoBanner';
import { useToast } from './ToastContext';

const FSSAIDetailsScreen = ({ onBack, onProceed }) => {
  const { showToast } = useToast();
  const [hasValidFSSAI, setHasValidFSSAI] = useState(false);
  const [fssaiRegistrationNumber, setFssaiRegistrationNumber] = useState('');
  const [expirationDate, setExpirationDate] = useState('');
  const [licenseType, setLicenseType] = useState('');
  const [firmName, setFirmName] = useState('');
  const [address, setAddress] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());

  // Refs for all text inputs
  const fssaiRegistrationNumberRef = useRef(null);
  const expirationDateRef = useRef(null);
  const firmNameRef = useRef(null);
  const addressRef = useRef(null);

  // Function to blur all inputs
  const blurAllInputs = () => {
    fssaiRegistrationNumberRef.current?.blur();
    expirationDateRef.current?.blur();
    firmNameRef.current?.blur();
    addressRef.current?.blur();
    Keyboard.dismiss();
  };

  // FSSAI License Type options
  const licenseTypeOptions = [
    'Central License',
    'State License',
    'Registration',
  ];

  const formatDate = (date) => {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const formatDateInput = (text) => {
    // Remove all non-numeric characters
    const numbers = text.replace(/\D/g, '');
    
    // Limit to 8 digits (DDMMYYYY)
    const limitedNumbers = numbers.slice(0, 8);
    
    // Format as DD/MM/YYYY
    let formatted = '';
    if (limitedNumbers.length > 0) {
      formatted = limitedNumbers.slice(0, 2); // DD
      if (limitedNumbers.length > 2) {
        formatted += '/' + limitedNumbers.slice(2, 4); // MM
      }
      if (limitedNumbers.length > 4) {
        formatted += '/' + limitedNumbers.slice(4, 8); // YYYY
      }
    }
    
    return formatted;
  };

  const handleDateInputChange = (text) => {
    const formatted = formatDateInput(text);
    setExpirationDate(formatted);
  };

  const handleValidateFSSAI = () => {
    if (!fssaiRegistrationNumber) {
      showToast('Please enter FSSAI Registration Number first', 'error');
      return;
    }
    // Implement FSSAI validation logic here
    showToast('FSSAI Registration Number validated', 'success');
  };

  const handleDateIconPress = () => {
    setShowDatePicker(true);
  };

  const handleDateChange = (event, date) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }
    
    if (event.type === 'set' && date) {
      setSelectedDate(date);
      const formattedDate = formatDate(date);
      setExpirationDate(formattedDate);
      if (Platform.OS === 'ios') {
        setShowDatePicker(false);
      }
    } else if (event.type === 'dismissed') {
      setShowDatePicker(false);
    }
  };

  const handleProceed = () => {
    // Navigate to next screen without validation
    if (onProceed) {
      onProceed();
    } else {
      showToast('FSSAI details submitted successfully', 'success');
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <KeyboardAvoidingView
        style={styles.keyboardAvoidingView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <CustomHeader
          title="FSSAI Details"
          onBack={onBack}
          showBackButton={true}
        />
        <TouchableWithoutFeedback onPress={blurAllInputs} accessible={false}>
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            onScrollBeginDrag={blurAllInputs}
          >
          {/* Information Banner */}
          <InfoBanner
            text="At this stage kindly provide Valid FSSAI Details Acknowledgement Details if recently applied to proceed further."
          />

          {/* Form Fields */}
          <View style={styles.formContainer}>
            {/* FSSAI Registration/License Toggle */}
            <View style={styles.fieldContainer}>
              <View style={styles.toggleRow}>
                <CustomToggle
                  value={hasValidFSSAI}
                  onValueChange={setHasValidFSSAI}
                />
                <Text style={styles.toggleLabel}>
                  Do you have valid FSSAI Registration/ License? <Text style={styles.asterisk}>*</Text>
                </Text>
              </View>
            </View>

            {/* FSSAI Registration Number */}
            <View style={styles.fieldContainer}>
              <Text style={styles.label}>
                Enter FSSAI Registration Number <Text style={styles.asterisk}>*</Text>
              </Text>
              <CustomTextInput2
                ref={fssaiRegistrationNumberRef}
                value={fssaiRegistrationNumber}
                onChangeText={setFssaiRegistrationNumber}
                placeholder="Enter FSSAI Registration Number"
                keyboardType="number-pad"
                rightButton="Validate Fssai"
                onRightButtonPress={handleValidateFSSAI}
              />
            </View>

            {/* FSSAI Expiration Date */}
            <View style={styles.fieldContainer}>
              <Text style={styles.label}>
                FSSAI Expiration Date <Text style={styles.asterisk}>*</Text>
              </Text>
              <CustomTextInput2
                ref={expirationDateRef}
                value={expirationDate}
                onChangeText={handleDateInputChange}
                placeholder="DD/MM/YYYY"
                keyboardType="number-pad"
                maxLength={10}
                rightIcon={icons.calendar}
                onRightIconPress={handleDateIconPress}
                editable={true}
              />
              {showDatePicker && (
                <DateTimePicker
                  value={selectedDate}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={handleDateChange}
                  minimumDate={new Date()}
                />
              )}
            </View>

            {/* FSSAI License Type */}
            <View style={styles.fieldContainer}>
              <Text style={styles.label}>
                FSSAI License Type <Text style={styles.asterisk}>*</Text>
              </Text>
              <CustomDropdown
                value={licenseType}
                onSelect={(item) => setLicenseType(typeof item === 'string' ? item : item.label || item.value)}
                placeholder="Select License Type"
                options={licenseTypeOptions}
              />
            </View>

            {/* FSSAI Firm Name */}
            <View style={styles.fieldContainer}>
              <Text style={styles.label}>
                FSSAI Firm Name <Text style={styles.asterisk}>*</Text>
              </Text>
              <CustomTextInput2
                ref={firmNameRef}
                value={firmName}
                onChangeText={setFirmName}
                placeholder="Enter FSSAI Firm Name"
              />
            </View>

            {/* FSSAI Address */}
            <View style={styles.fieldContainer}>
              <Text style={styles.label}>
                FSSAI Address <Text style={styles.asterisk}>*</Text>
              </Text>
              <CustomTextInput2
                ref={addressRef}
                value={address}
                onChangeText={setAddress}
                placeholder="Enter FSSAI Address"
                multiline={true}
                numberOfLines={4}
              />
            </View>
          </View>

          {/* Proceed Button */}
          <View style={styles.buttonContainer}>
            <CustomButton
              title="Proceed"
              onPress={handleProceed}
            />
          </View>
          </ScrollView>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 30,
  },
  formContainer: {
    marginBottom: 20,
  },
  fieldContainer: {
    marginBottom: 20,
  },
  label: {
    fontFamily: Poppins.medium,
    fontSize: 14,
    color: '#000000',
    marginBottom: 8,
  },
  asterisk: {
    color: '#FF0000',
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  toggleLabel: {
    flex: 1,
    fontFamily: Poppins.medium,
    fontSize: 14,
    color: '#000000',
    marginLeft: 10,
  },
  buttonContainer: {
    marginTop: 10,
    marginBottom: 20,
  },
});

export default FSSAIDetailsScreen;
