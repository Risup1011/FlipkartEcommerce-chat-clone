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
  PermissionsAndroid,
  Keyboard,
} from 'react-native';
import { launchImageLibrary, launchCamera } from 'react-native-image-picker';
import DocumentPicker from 'react-native-document-picker';
import { Poppins } from '../assets';
import CustomHeader from './CustomHeader';
import CustomTextInput2 from './CustomTextInput2';
import CustomDropdown from './CustomDropdown';
import CustomButton from './CustomButton';
import CustomToggle from './CustomToggle';
import CustomUploadButton from './CustomUploadButton';
import UploadBottomSheet from './UploadBottomSheet';
import InfoBanner from './InfoBanner';
import { useToast } from './ToastContext';

const GSTINPANDetailsScreen = ({ onBack, onProceed }) => {
  const { showToast } = useToast();
  const [panNumber, setPanNumber] = useState('');
  const [panOwnerName, setPanOwnerName] = useState('');
  const [panDocUploadType, setPanDocUploadType] = useState('Image');
  const [panCardFile, setPanCardFile] = useState(null);
  const [hasGSTIN, setHasGSTIN] = useState(false);
  const [restaurantGSTIN, setRestaurantGSTIN] = useState('');
  const [gstCertificateUploadType, setGstCertificateUploadType] = useState('Image');
  const [gstCertificateFile, setGstCertificateFile] = useState(null);
  const [businessEntityName, setBusinessEntityName] = useState('');
  const [businessEntityAddress, setBusinessEntityAddress] = useState('');
  const [showUploadBottomSheet, setShowUploadBottomSheet] = useState(false);
  const [currentUploadType, setCurrentUploadType] = useState(null); // 'pan' or 'gst'
  const [fieldErrors, setFieldErrors] = useState({}); // Track validation errors for each field

  // Refs for all text inputs
  const panNumberRef = useRef(null);
  const panOwnerNameRef = useRef(null);
  const restaurantGSTINRef = useRef(null);
  const businessEntityNameRef = useRef(null);
  const businessEntityAddressRef = useRef(null);

  // Function to blur all inputs
  const blurAllInputs = () => {
    panNumberRef.current?.blur();
    panOwnerNameRef.current?.blur();
    restaurantGSTINRef.current?.blur();
    businessEntityNameRef.current?.blur();
    businessEntityAddressRef.current?.blur();
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

  // Upload type options
  const uploadTypeOptions = ['Image', 'PDF', 'Document'];

  const handleVerifyPAN = () => {
    if (!panNumber) {
      showToast('Please enter PAN number first', 'error');
      return;
    }
    // Implement PAN verification logic here
    showToast('PAN verified successfully', 'success');
  };

  const handleVerifyGSTIN = () => {
    if (!restaurantGSTIN) {
      showToast('Please enter GSTIN number first', 'error');
      return;
    }
    // Implement GSTIN verification logic here
    showToast('GSTIN verified successfully', 'success');
  };

  const handlePanCardUpload = () => {
    setCurrentUploadType('pan');
    setShowUploadBottomSheet(true);
  };

  const handleGstCertificateUpload = () => {
    setCurrentUploadType('gst');
    setShowUploadBottomSheet(true);
  };

  const requestStoragePermission = async () => {
    if (Platform.OS === 'android') {
      try {
        if (Platform.Version >= 33) {
          // Android 13+ uses granular permissions
          const granted = await PermissionsAndroid.requestMultiple([
            PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES,
            PermissionsAndroid.PERMISSIONS.READ_MEDIA_VIDEO,
          ]);
          return (
            granted['android.permission.READ_MEDIA_IMAGES'] === PermissionsAndroid.RESULTS.GRANTED ||
            granted['android.permission.READ_MEDIA_VIDEO'] === PermissionsAndroid.RESULTS.GRANTED
          );
        } else {
          const granted = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
          );
          return granted === PermissionsAndroid.RESULTS.GRANTED;
        }
      } catch (err) {
        console.warn(err);
        return false;
      }
    }
    return true;
  };

  const requestCameraPermission = async () => {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.CAMERA,
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      } catch (err) {
        console.warn(err);
        return false;
      }
    }
    return true;
  };

  const handleSelectGallery = async () => {
    const hasPermission = await requestStoragePermission();
    if (!hasPermission) {
      showToast('Storage permission is required', 'error');
      return;
    }

    launchImageLibrary(
      {
        mediaType: 'photo',
        quality: 0.8,
        maxWidth: 2000,
        maxHeight: 2000,
      },
      (response) => {
        if (response.didCancel) {
          return;
        }
        if (response.errorMessage) {
          showToast(response.errorMessage, 'error');
          return;
        }
        if (response.assets && response.assets[0]) {
          const asset = response.assets[0];
          const fileData = {
            name: asset.fileName || asset.uri?.split('/').pop() || 'image.jpg',
            uri: asset.uri,
            type: asset.type,
            size: asset.fileSize,
          };
          if (currentUploadType === 'pan') {
            setPanCardFile(fileData);
          } else {
            setGstCertificateFile(fileData);
          }
          showToast('File selected from gallery', 'success');
        }
      },
    );
  };

  const handleSelectCamera = async () => {
    const hasPermission = await requestCameraPermission();
    if (!hasPermission) {
      showToast('Camera permission is required', 'error');
      return;
    }

    launchCamera(
      {
        mediaType: 'photo',
        quality: 0.8,
        maxWidth: 2000,
        maxHeight: 2000,
      },
      (response) => {
        if (response.didCancel) {
          return;
        }
        if (response.errorMessage) {
          showToast(response.errorMessage, 'error');
          return;
        }
        if (response.assets && response.assets[0]) {
          const asset = response.assets[0];
          const fileData = {
            name: asset.fileName || asset.uri?.split('/').pop() || 'camera_image.jpg',
            uri: asset.uri,
            type: asset.type,
            size: asset.fileSize,
          };
          if (currentUploadType === 'pan') {
            setPanCardFile(fileData);
          } else {
            setGstCertificateFile(fileData);
          }
          showToast('File captured from camera', 'success');
        }
      },
    );
  };

  const handleSelectFiles = async () => {
    try {
      const hasPermission = await requestStoragePermission();
      if (!hasPermission) {
        showToast('Storage permission is required', 'error');
        return;
      }

      const result = await DocumentPicker.pick({
        type: [DocumentPicker.types.pdf, DocumentPicker.types.images],
        copyTo: 'cachesDirectory',
      });

      if (result && result[0]) {
        const file = result[0];
        const fileData = {
          name: file.name || 'document.pdf',
          uri: file.uri,
          type: file.type,
          size: file.size,
        };
        if (currentUploadType === 'pan') {
          setPanCardFile(fileData);
        } else {
          setGstCertificateFile(fileData);
        }
        showToast('File selected', 'success');
      }
    } catch (err) {
      if (DocumentPicker.isCancel(err)) {
        // User cancelled the picker
        return;
      } else {
        showToast('Error selecting file', 'error');
        console.error(err);
      }
    }
  };

  const handleProceed = () => {
    console.log('handleProceed called');
    const errors = {};
    
    // Validate all required fields
    if (!panNumber) {
      errors.panNumber = 'Please enter PAN number';
    }
    if (!panOwnerName) {
      errors.panOwnerName = 'Please enter PAN Owner Name';
    }
    if (!panDocUploadType) {
      errors.panDocUploadType = 'Please select PAN Doc Upload Type';
    }
    if (!panCardFile) {
      errors.panCardFile = 'Please upload PAN card';
    }
    if (hasGSTIN) {
      if (!restaurantGSTIN) {
        errors.restaurantGSTIN = 'Please enter Restaurant GSTIN';
      }
      if (!gstCertificateUploadType) {
        errors.gstCertificateUploadType = 'Please select GST Certificate Upload Type';
      }
      if (!gstCertificateFile) {
        errors.gstCertificateFile = 'Please upload GST Certificate';
      }
    }
    if (!businessEntityName) {
      errors.businessEntityName = 'Please enter Business Entity Name';
    }
    if (!businessEntityAddress) {
      errors.businessEntityAddress = 'Please enter Business Entity Address';
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      showToast('Please fill all required fields', 'error');
      return;
    }
    
    // Clear all errors if validation passes
    setFieldErrors({});

    console.log('All validations passed, calling onProceed');
    // Navigate to next screen
    if (onProceed) {
      console.log('onProceed exists, calling it');
      onProceed();
    } else {
      console.log('onProceed does not exist');
      showToast('GSTIN & PAN details submitted successfully', 'success');
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
          title="GSTIN & PAN Details"
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
          {/* Information Banners */}
          <InfoBanner
            text="Please provide valid GSTIN & PAN details. As per Govt. of India's guidelines if your annual business turnover is below Rs. 20 Lacs, only a GST declaration will be required."
          />
          <View style={styles.bannerSpacing}>
            <InfoBanner
              text="As per Govt. of India's guidelines only businesses holding a 'Regular Taxpayer/Scheme' GSTN can Operate on e-commerce platform"
            />
          </View>

          {/* Form Fields */}
          <View style={styles.formContainer}>
            {/* PAN Details Section */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>PAN Details</Text>
            </View>

            {/* Enter Pan Field */}
            <View style={styles.fieldContainer}>
              <Text style={styles.label}>
                Enter Pan Field <Text style={styles.asterisk}>*</Text>
              </Text>
              <CustomTextInput2
                ref={panNumberRef}
                value={panNumber}
                onChangeText={(text) => {
                  clearFieldError('panNumber');
                  setPanNumber(text);
                }}
                placeholder="Enter PAN Number"
                maxLength={10}
                autoCapitalize="characters"
                rightButton="Click to Verify PAN"
                onRightButtonPress={handleVerifyPAN}
                error={fieldErrors.panNumber}
              />
            </View>

            {/* PAN Owner Name */}
            <View style={styles.fieldContainer}>
              <Text style={styles.label}>
                PAN Owner Name <Text style={styles.asterisk}>*</Text>
              </Text>
              <CustomTextInput2
                ref={panOwnerNameRef}
                value={panOwnerName}
                onChangeText={(text) => {
                  clearFieldError('panOwnerName');
                  setPanOwnerName(text);
                }}
                placeholder="Enter PAN Owner Name"
                error={fieldErrors.panOwnerName}
              />
            </View>

            {/* PAN Doc Upload Type */}
            <View style={styles.fieldContainer}>
              <Text style={styles.label}>
                PAN Doc Upload Type <Text style={styles.asterisk}>*</Text>
              </Text>
              <CustomDropdown
                value={panDocUploadType}
                onSelect={(item) => {
                  clearFieldError('panDocUploadType');
                  setPanDocUploadType(typeof item === 'string' ? item : item.label || item.value);
                }}
                placeholder="Select Upload Type"
                options={uploadTypeOptions}
                showSearch={false}
                error={fieldErrors.panDocUploadType}
              />
            </View>

            {/* PAN card Upload */}
            <View style={styles.fieldContainer}>
              <Text style={styles.label}>
                PAN card Upload <Text style={styles.asterisk}>*</Text>
              </Text>
              <CustomUploadButton
                onPress={handlePanCardUpload}
                fileName={panCardFile?.name}
              />
            </View>

            {/* GSTIN Details Section */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>GSTIN Details</Text>
            </View>

            {/* Do you have a GSTIN? */}
            <View style={styles.fieldContainer}>
              <View style={styles.toggleRow}>
                <CustomToggle
                  value={hasGSTIN}
                  onValueChange={setHasGSTIN}
                />
                <Text style={styles.toggleLabel}>
                  Do you have a GSTIN? <Text style={styles.asterisk}>*</Text>
                </Text>
              </View>
            </View>

            {/* Restaurant GSTIN - only show if hasGSTIN is true */}
            {hasGSTIN && (
              <>
                <View style={styles.fieldContainer}>
                  <Text style={styles.label}>
                    Restaurant GSTIN <Text style={styles.asterisk}>*</Text>
                  </Text>
                  <CustomTextInput2
                    ref={restaurantGSTINRef}
                    value={restaurantGSTIN}
                    onChangeText={(text) => {
                      clearFieldError('restaurantGSTIN');
                      setRestaurantGSTIN(text);
                    }}
                    placeholder="Enter Restaurant GSTIN"
                    maxLength={15}
                    autoCapitalize="characters"
                    rightButton="Click to Verify GSTIN"
                    onRightButtonPress={handleVerifyGSTIN}
                    error={fieldErrors.restaurantGSTIN}
                  />
                </View>

                {/* GST Certificate Upload Type */}
                <View style={styles.fieldContainer}>
                  <Text style={styles.label}>
                    GST Certificate Upload Type <Text style={styles.asterisk}>*</Text>
                  </Text>
                  <CustomDropdown
                    value={gstCertificateUploadType}
                    onSelect={(item) => {
                      clearFieldError('gstCertificateUploadType');
                      setGstCertificateUploadType(typeof item === 'string' ? item : item.label || item.value);
                    }}
                    placeholder="Select Upload Type"
                    options={uploadTypeOptions}
                    showSearch={false}
                    error={fieldErrors.gstCertificateUploadType}
                  />
                </View>

                {/* GST Certificate Upload */}
                <View style={styles.fieldContainer}>
                  <Text style={styles.label}>
                    GST Certificate Upload <Text style={styles.asterisk}>*</Text>
                  </Text>
                  <CustomUploadButton
                    onPress={handleGstCertificateUpload}
                    fileName={gstCertificateFile?.name}
                  />
                </View>
              </>
            )}

            {/* Business Entity Details Section */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Business Entity Details</Text>
            </View>

            {/* Business Entity Name */}
            <View style={styles.fieldContainer}>
              <Text style={styles.label}>
                Business Entity Name <Text style={styles.asterisk}>*</Text>
              </Text>
              <CustomTextInput2
                ref={businessEntityNameRef}
                value={businessEntityName}
                onChangeText={(text) => {
                  clearFieldError('businessEntityName');
                  setBusinessEntityName(text);
                }}
                placeholder="Enter Business Entity Name"
                error={fieldErrors.businessEntityName}
              />
            </View>

            {/* Business Entity Address */}
            <View style={styles.fieldContainer}>
              <Text style={styles.label}>
                Business Entity Address <Text style={styles.asterisk}>*</Text>
              </Text>
              <CustomTextInput2
                ref={businessEntityAddressRef}
                value={businessEntityAddress}
                onChangeText={(text) => {
                  clearFieldError('businessEntityAddress');
                  setBusinessEntityAddress(text);
                }}
                placeholder="Enter Business Entity Address"
                multiline={true}
                numberOfLines={4}
                error={fieldErrors.businessEntityAddress}
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
      
      {/* Upload Bottom Sheet */}
      <UploadBottomSheet
        visible={showUploadBottomSheet}
        onClose={() => setShowUploadBottomSheet(false)}
        onSelectGallery={handleSelectGallery}
        onSelectCamera={handleSelectCamera}
        onSelectFiles={handleSelectFiles}
      />
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
    paddingTop: 10,
    paddingBottom: 10,
  },
  bannerSpacing: {
    marginTop: 5,
  },
  formContainer: {
    marginBottom: 5,
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
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  asterisk: {
    color: '#FF0000',
  },
  verifyLink: {
    fontFamily: Poppins.medium,
    fontSize: 14,
    color: '#FF6E1A',
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

export default GSTINPANDetailsScreen;
