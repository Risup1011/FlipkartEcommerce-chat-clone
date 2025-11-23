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
import { Poppins } from '../assets';
import CustomHeader from './CustomHeader';
import CustomTextInput2 from './CustomTextInput2';
import CustomDropdown from './CustomDropdown';
import CustomButton from './CustomButton';
import CustomToggle from './CustomToggle';
import InfoBanner from './InfoBanner';
import { useToast } from './ToastContext';

const OwnerAndLocationDetailsScreen = ({ onBack, onProceed }) => {
    const [ownerOrManager, setOwnerOrManager] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [ownerMobileNumber, setOwnerMobileNumber] = useState('');
  const [ownerEmail, setOwnerEmail] = useState('');
  const [isOwnerManagerSame, setIsOwnerManagerSame] = useState(false);
  const [managerName, setManagerName] = useState('');
  const [managerMobileNumber, setManagerMobileNumber] = useState('');
  const [managerOTP, setManagerOTP] = useState('');
  const [managerEmail, setManagerEmail] = useState('');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [address, setAddress] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [state, setState] = useState('');
  const [fieldErrors, setFieldErrors] = useState({}); 

  const ownerNameRef = useRef(null);
  const ownerMobileNumberRef = useRef(null);
  const ownerEmailRef = useRef(null);
  const managerNameRef = useRef(null);
  const managerMobileNumberRef = useRef(null);
  const managerOTPRef = useRef(null);
  const managerEmailRef = useRef(null);
  const latitudeRef = useRef(null);
  const longitudeRef = useRef(null);
  const addressRef = useRef(null);
  const postalCodeRef = useRef(null);

  // Function to blur all inputs
  const blurAllInputs = () => {
    ownerNameRef.current?.blur();
    ownerMobileNumberRef.current?.blur();
    ownerEmailRef.current?.blur();
    managerNameRef.current?.blur();
    managerMobileNumberRef.current?.blur();
    managerOTPRef.current?.blur();
    managerEmailRef.current?.blur();
    latitudeRef.current?.blur();
    longitudeRef.current?.blur();
    addressRef.current?.blur();
    postalCodeRef.current?.blur();
    Keyboard.dismiss();
  };

  // Helper function to clear error for a field
  const clearFieldError = (fieldKey) => {
    if (fieldErrors[fieldKey]) {
      setFieldErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[fieldKey];
        return newErrors;
      });
    }
  };

  // Options for owner/manager dropdown
  const ownerOrManagerOptions = ['Owner', 'Manager'];

  // Sample state options - replace with actual data
  const stateOptions = [
    'Maharashtra',
    'Delhi',
    'Karnataka',
    'Telangana',
    'Tamil Nadu',
    'West Bengal',
    'Gujarat',
    'Rajasthan',
    'Uttar Pradesh',
    'Punjab',
  ];

  const handleGenerateOTP = () => {
    if (!managerMobileNumber || managerMobileNumber.length < 10) {
      return;
    }
    // Implement OTP generation logic here
  };

  const handleVerifyOTP = () => {
    if (!managerOTP) {
      return;
    }
    // Implement OTP verification logic here
  };

  const handleProceed = () => {
    const errors = {};
    
    // Validate all required fields
    if (!ownerOrManager) {
      errors.ownerOrManager = 'Please select if you are owner or manager';
    }
    if (!ownerName) {
      errors.ownerName = 'Please enter owner name';
    }
    if (!ownerMobileNumber || ownerMobileNumber.length < 10) {
      errors.ownerMobileNumber = 'Please enter a valid owner mobile number';
    }
    if (!ownerEmail) {
      errors.ownerEmail = 'Please enter owner email';
    }
    if (!isOwnerManagerSame) {
      if (!managerName) {
        errors.managerName = 'Please enter manager name';
      }
      if (!managerMobileNumber || managerMobileNumber.length < 10) {
        errors.managerMobileNumber = 'Please enter a valid manager mobile number';
      }
      if (!managerOTP) {
        errors.managerOTP = 'Please verify manager OTP';
      }
      if (!managerEmail) {
        errors.managerEmail = 'Please enter manager email';
      }
    }
    if (!latitude || !longitude) {
      if (!latitude) errors.latitude = 'Please enter latitude';
      if (!longitude) errors.longitude = 'Please enter longitude';
    }
    if (!address) {
      errors.address = 'Please enter address';
    }
    if (!postalCode) {
      errors.postalCode = 'Please enter postal code';
    }
    if (!state) {
      errors.state = 'Please select state';
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }
    
    // Clear all errors if validation passes
    setFieldErrors({});

    // Navigate to next screen
    if (onProceed) {
      onProceed();
    } else {
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
          title="Owner and Location Details"
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
          {/* Form Fields */}
          <View style={styles.formContainer}>
            {/* Owner or Manager */}
            <View style={styles.fieldContainer}>
              <Text style={styles.label}>
                Are you owner or the manager? <Text style={styles.asterisk}>*</Text>
              </Text>
              <CustomDropdown
                value={ownerOrManager}
                onSelect={(item) => {
                  clearFieldError('ownerOrManager');
                  setOwnerOrManager(typeof item === 'string' ? item : item.label || item.value);
                }}
                placeholder="Select"
                options={ownerOrManagerOptions}
                showSearch={false}
                error={fieldErrors.ownerOrManager}
              />
            </View>

            {/* Owner Name */}
            <View style={styles.fieldContainer}>
              <Text style={styles.label}>
                Owner Name <Text style={styles.asterisk}>*</Text>
              </Text>
              <CustomTextInput2
                ref={ownerNameRef}
                value={ownerName}
                onChangeText={(text) => {
                  clearFieldError('ownerName');
                  setOwnerName(text);
                }}
                placeholder="Enter Owner Name"
                error={fieldErrors.ownerName}
              />
            </View>

            {/* Owner Mobile Number */}
            <View style={styles.fieldContainer}>
              <Text style={styles.label}>
                Owner Mobile Number <Text style={styles.asterisk}>*</Text>
              </Text>
              <CustomTextInput2
                ref={ownerMobileNumberRef}
                value={ownerMobileNumber}
                onChangeText={(text) => {
                  clearFieldError('ownerMobileNumber');
                  setOwnerMobileNumber(text);
                }}
                placeholder="Enter Owner Mobile Number"
                keyboardType="phone-pad"
                maxLength={10}
                error={fieldErrors.ownerMobileNumber}
              />
            </View>

            {/* Owner Email */}
            <View style={styles.fieldContainer}>
              <Text style={styles.label}>
                Owner Email <Text style={styles.asterisk}>*</Text>
              </Text>
              <CustomTextInput2
                ref={ownerEmailRef}
                value={ownerEmail}
                onChangeText={(text) => {
                  clearFieldError('ownerEmail');
                  setOwnerEmail(text);
                }}
                placeholder="Enter Owner Email"
                keyboardType="email-address"
                autoCapitalize="none"
                error={fieldErrors.ownerEmail}
              />
            </View>

            {/* Is Owner and Manager the same */}
            <View style={styles.fieldContainer}>
              <View style={styles.toggleRow}>
                <CustomToggle
                  value={isOwnerManagerSame}
                  onValueChange={setIsOwnerManagerSame}
                />
                <Text style={styles.toggleLabel}>
                  Is Owner and Manager the same <Text style={styles.asterisk}>*</Text>
                </Text>
              </View>
            </View>

            {/* Manager Name - only show if owner and manager are not the same */}
            {!isOwnerManagerSame && (
              <>
                <View style={styles.fieldContainer}>
                  <Text style={styles.label}>
                    Manager Name <Text style={styles.asterisk}>*</Text>
                  </Text>
                  <CustomTextInput2
                    ref={managerNameRef}
                    value={managerName}
                    onChangeText={(text) => {
                      clearFieldError('managerName');
                      setManagerName(text);
                    }}
                    placeholder="Enter Manager Name"
                    error={fieldErrors.managerName}
                  />
                </View>

                {/* Manager Mobile Number */}
                <View style={styles.fieldContainer}>
                  <Text style={styles.label}>
                    Manager Mobile Number <Text style={styles.asterisk}>*</Text>
                  </Text>
                  <CustomTextInput2
                    ref={managerMobileNumberRef}
                    value={managerMobileNumber}
                    onChangeText={(text) => {
                      clearFieldError('managerMobileNumber');
                      setManagerMobileNumber(text);
                    }}
                    placeholder="Enter Manager Mobile Number"
                    keyboardType="phone-pad"
                    maxLength={10}
                    rightButton="Generate OTP"
                    onRightButtonPress={handleGenerateOTP}
                    error={fieldErrors.managerMobileNumber}
                  />
                </View>

                {/* Manager OTP */}
                <View style={styles.fieldContainer}>
                  <Text style={styles.label}>
                    OTP <Text style={styles.asterisk}>*</Text>
                  </Text>
                  <CustomTextInput2
                    ref={managerOTPRef}
                    value={managerOTP}
                    onChangeText={(text) => {
                      clearFieldError('managerOTP');
                      setManagerOTP(text);
                    }}
                    placeholder="Enter OTP"
                    keyboardType="number-pad"
                    maxLength={6}
                    rightButton="Verify"
                    onRightButtonPress={handleVerifyOTP}
                    error={fieldErrors.managerOTP}
                  />
                </View>

                {/* Manager Email */}
                <View style={styles.fieldContainer}>
                  <Text style={styles.label}>
                    Manager Email <Text style={styles.asterisk}>*</Text>
                  </Text>
                  <CustomTextInput2
                    ref={managerEmailRef}
                    value={managerEmail}
                    onChangeText={(text) => {
                      clearFieldError('managerEmail');
                      setManagerEmail(text);
                    }}
                    placeholder="Enter Manager Email"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    error={fieldErrors.managerEmail}
                  />
                </View>
              </>
            )}

            {/* Information Banner */}
            {/* <View style={styles.fieldContainer}>
              <InfoBanner
                text="If you can't find your outlet on the map, search for a landmark nearest to your outlet, and then drag the location pin to the accurate location of your outlet."
              />
            </View> */}

            {/* Location Details Section */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Location Details</Text>
            </View>

            {/* Latitude */}
            <View style={styles.fieldContainer}>
              <Text style={styles.label}>Latitude</Text>
              <CustomTextInput2
                ref={latitudeRef}
                value={latitude}
                onChangeText={(text) => {
                  clearFieldError('latitude');
                  setLatitude(text);
                }}
                placeholder="Enter Latitude"
                keyboardType="decimal-pad"
                error={fieldErrors.latitude}
              />
            </View>

            {/* Longitude */}
            <View style={styles.fieldContainer}>
              <Text style={styles.label}>Longitude</Text>
              <CustomTextInput2
                ref={longitudeRef}
                value={longitude}
                onChangeText={(text) => {
                  clearFieldError('longitude');
                  setLongitude(text);
                }}
                placeholder="Enter Longitude"
                keyboardType="decimal-pad"
                error={fieldErrors.longitude}
              />
            </View>

            {/* Address */}
            <View style={styles.fieldContainer}>
              <Text style={styles.label}>Address</Text>
              <CustomTextInput2
                ref={addressRef}
                value={address}
                onChangeText={(text) => {
                  clearFieldError('address');
                  setAddress(text);
                }}
                placeholder="Enter Address"
                multiline={true}
                numberOfLines={4}
                error={fieldErrors.address}
              />
            </View>

            {/* Postal Code */}
            <View style={styles.fieldContainer}>
              <Text style={styles.label}>Postal Code</Text>
              <CustomTextInput2
                ref={postalCodeRef}
                value={postalCode}
                onChangeText={(text) => {
                  clearFieldError('postalCode');
                  setPostalCode(text);
                }}
                placeholder="Enter Postal Code"
                keyboardType="number-pad"
                maxLength={6}
                error={fieldErrors.postalCode}
              />
            </View>

            {/* State */}
            <View style={styles.fieldContainer}>
              <Text style={styles.label}>State</Text>
              <CustomDropdown
                value={state}
                onSelect={(item) => {
                  clearFieldError('state');
                  setState(typeof item === 'string' ? item : item.label || item.value);
                }}
                placeholder="Select State"
                options={stateOptions}
                error={fieldErrors.state}
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
    fontSize: 15,
    color: '#000000',
    marginLeft: 10,
  },
  sectionHeader: {
    marginTop: 10,
    marginBottom: 15,
  },
  sectionTitle: {
    fontFamily: Poppins.semiBold,
    fontSize: 18,
    color: '#000000',
  },
  buttonContainer: {
    marginTop: 10,
    marginBottom: 20,
  },
});

export default OwnerAndLocationDetailsScreen;
