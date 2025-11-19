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
} from 'react-native';
import { launchImageLibrary, launchCamera } from 'react-native-image-picker';
import DocumentPicker from 'react-native-document-picker';
import { Poppins } from '../assets';
import CustomHeader from './CustomHeader';
import CustomTextInput2 from './CustomTextInput2';
import CustomDropdown from './CustomDropdown';
import CustomButton from './CustomButton';
import CustomUploadButton from './CustomUploadButton';
import UploadBottomSheet from './UploadBottomSheet';
import InfoBanner from './InfoBanner';
import { useToast } from './ToastContext';
import { Keyboard } from 'react-native';

const BankDetailsScreen = ({ onBack, onProceed }) => {
  const { showToast } = useToast();
  const [accountNumber, setAccountNumber] = useState('');
  const [ifscCode, setIfscCode] = useState('');
  const [beneficiaryName, setBeneficiaryName] = useState('');
  const [bankCity, setBankCity] = useState('');
  const [bankState, setBankState] = useState('');
  const [bankName, setBankName] = useState('');
  const [bankBranch, setBankBranch] = useState('');
  const [chequeUploadType, setChequeUploadType] = useState('Image');
  const [chequeFile, setChequeFile] = useState(null);
  const [kycUploadType, setKycUploadType] = useState('Image');
  const [kycFile, setKycFile] = useState(null);
  const [showUploadBottomSheet, setShowUploadBottomSheet] = useState(false);
  const [currentUploadType, setCurrentUploadType] = useState(null); // 'cheque' or 'kyc'
  const [fieldErrors, setFieldErrors] = useState({}); // Track validation errors for each field

  // Refs for all text inputs
  const accountNumberRef = useRef(null);
  const ifscCodeRef = useRef(null);
  const beneficiaryNameRef = useRef(null);
  const bankCityRef = useRef(null);
  const bankStateRef = useRef(null);
  const bankNameRef = useRef(null);
  const bankBranchRef = useRef(null);

  // Function to blur all inputs
  const blurAllInputs = () => {
    accountNumberRef.current?.blur();
    ifscCodeRef.current?.blur();
    beneficiaryNameRef.current?.blur();
    bankCityRef.current?.blur();
    bankStateRef.current?.blur();
    bankNameRef.current?.blur();
    bankBranchRef.current?.blur();
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

  const handleChequeUpload = () => {
    setCurrentUploadType('cheque');
    setShowUploadBottomSheet(true);
  };

  const handleKycUpload = () => {
    setCurrentUploadType('kyc');
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

    if (currentUploadType === 'cheque') {
      if (chequeUploadType === 'Image') {
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
              setChequeFile(fileData);
              showToast('File selected from gallery', 'success');
            }
          },
        );
      } else {
        // PDF or Document
        DocumentPicker.pick({
          type: [DocumentPicker.types.pdf, DocumentPicker.types.images],
          copyTo: 'cachesDirectory',
        })
          .then((response) => {
            if (response && response[0]) {
              const fileData = {
                name: response[0].name,
                uri: response[0].uri,
                type: response[0].type,
                size: response[0].size,
              };
              setChequeFile(fileData);
              showToast('File selected', 'success');
            }
          })
          .catch((err) => {
            if (DocumentPicker.isCancel(err)) {
              // User cancelled
            } else {
              showToast('Error selecting file', 'error');
            }
          });
      }
    } else {
      // KYC upload
      if (kycUploadType === 'Image') {
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
              setKycFile(fileData);
              showToast('File selected from gallery', 'success');
            }
          },
        );
      } else {
        // PDF or Document
        DocumentPicker.pick({
          type: [DocumentPicker.types.pdf, DocumentPicker.types.images],
          copyTo: 'cachesDirectory',
        })
          .then((response) => {
            if (response && response[0]) {
              const fileData = {
                name: response[0].name,
                uri: response[0].uri,
                type: response[0].type,
                size: response[0].size,
              };
              setKycFile(fileData);
              showToast('File selected', 'success');
            }
          })
          .catch((err) => {
            if (DocumentPicker.isCancel(err)) {
              // User cancelled
            } else {
              showToast('Error selecting file', 'error');
            }
          });
      }
    }
    setShowUploadBottomSheet(false);
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
            name: asset.fileName || asset.uri?.split('/').pop() || 'image.jpg',
            uri: asset.uri,
            type: asset.type,
            size: asset.fileSize,
          };
          if (currentUploadType === 'cheque') {
            setChequeFile(fileData);
          } else {
            setKycFile(fileData);
          }
          showToast('Photo captured', 'success');
        }
      },
    );
    setShowUploadBottomSheet(false);
  };

  const handleSelectFiles = async () => {
    const hasPermission = await requestStoragePermission();
    if (!hasPermission) {
      showToast('Storage permission is required', 'error');
      return;
    }

    DocumentPicker.pick({
      type: [DocumentPicker.types.pdf, DocumentPicker.types.images],
      copyTo: 'cachesDirectory',
    })
      .then((response) => {
        if (response && response[0]) {
          const fileData = {
            name: response[0].name,
            uri: response[0].uri,
            type: response[0].type,
            size: response[0].size,
          };
          if (currentUploadType === 'cheque') {
            setChequeFile(fileData);
          } else {
            setKycFile(fileData);
          }
          showToast('File selected', 'success');
        }
      })
      .catch((err) => {
        if (DocumentPicker.isCancel(err)) {
          // User cancelled
        } else {
          showToast('Error selecting file', 'error');
        }
      });
    setShowUploadBottomSheet(false);
  };

  const handleProceed = () => {
    const errors = {};
    
    // Validate all required fields
    if (!accountNumber) {
      errors.accountNumber = 'Please enter Account Number';
    }
    if (!ifscCode) {
      errors.ifscCode = 'Please enter IFSC Code';
    }
    if (!beneficiaryName) {
      errors.beneficiaryName = 'Please enter Beneficiary Name';
    }
    if (!bankCity) {
      errors.bankCity = 'Please enter Bank City';
    }
    if (!bankState) {
      errors.bankState = 'Please enter Bank State';
    }
    if (!bankName) {
      errors.bankName = 'Please enter Bank Name';
    }
    if (!bankBranch) {
      errors.bankBranch = 'Please enter Bank Branch';
    }
    if (!chequeUploadType) {
      errors.chequeUploadType = 'Please select Cheque Upload Type';
    }
    if (!chequeFile) {
      errors.chequeFile = 'Please upload Cancelled Cheque/Bank Passbook/Bank Statement';
    }
    if (!kycUploadType) {
      errors.kycUploadType = 'Please select KYC Document Upload Type';
    }
    if (!kycFile) {
      errors.kycFile = 'Please upload KYC Document';
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      showToast('Please fill all required fields', 'error');
      return;
    }
    
    // Clear all errors if validation passes
    setFieldErrors({});

    // Navigate to next screen
    if (onProceed) {
      onProceed();
    } else {
      showToast('Bank details submitted successfully', 'success');
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
          title="Bank Details"
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
              text="Please enter a valid bank account details. This will be considered as the registered bank account where your Kamai payouts will credited."
            />

            {/* Form Fields */}
            <View style={styles.formContainer}>
              {/* Account Number */}
              <View style={styles.fieldContainer}>
                <Text style={styles.label}>
                  Enter Account Number <Text style={styles.asterisk}>*</Text>
                </Text>
                <CustomTextInput2
                  ref={accountNumberRef}
                  value={accountNumber}
                  onChangeText={(text) => {
                    clearFieldError('accountNumber');
                    setAccountNumber(text);
                  }}
                  placeholder="Enter Account Number"
                  keyboardType="number-pad"
                  error={fieldErrors.accountNumber}
                />
              </View>

              {/* IFSC Code */}
              <View style={styles.fieldContainer}>
                <Text style={styles.label}>
                  IFSC Code <Text style={styles.asterisk}>*</Text>
                </Text>
                <CustomTextInput2
                  ref={ifscCodeRef}
                  value={ifscCode}
                  onChangeText={(text) => {
                    clearFieldError('ifscCode');
                    setIfscCode(text);
                  }}
                  placeholder="Enter IFSC Code"
                  autoCapitalize="characters"
                  maxLength={11}
                  error={fieldErrors.ifscCode}
                />
              </View>

              {/* Beneficiary Name */}
              <View style={styles.fieldContainer}>
                <Text style={styles.label}>
                  Beneficiary Name <Text style={styles.asterisk}>*</Text>
                </Text>
                <CustomTextInput2
                  ref={beneficiaryNameRef}
                  value={beneficiaryName}
                  onChangeText={(text) => {
                    clearFieldError('beneficiaryName');
                    setBeneficiaryName(text);
                  }}
                  placeholder="Enter Beneficiary Name"
                  error={fieldErrors.beneficiaryName}
                />
              </View>

              {/* Bank City */}
              <View style={styles.fieldContainer}>
                <Text style={styles.label}>
                  Bank City <Text style={styles.asterisk}>*</Text>
                </Text>
                <CustomTextInput2
                  ref={bankCityRef}
                  value={bankCity}
                  onChangeText={(text) => {
                    clearFieldError('bankCity');
                    setBankCity(text);
                  }}
                  placeholder="Enter Bank City"
                  error={fieldErrors.bankCity}
                />
              </View>

              {/* Bank State */}
              <View style={styles.fieldContainer}>
                <Text style={styles.label}>
                  Bank State <Text style={styles.asterisk}>*</Text>
                </Text>
                <CustomDropdown
                  value={bankState}
                  onSelect={(item) => {
                    clearFieldError('bankState');
                    setBankState(typeof item === 'string' ? item : item.label || item.value);
                  }}
                  placeholder="Select Bank State"
                  options={stateOptions}
                  error={fieldErrors.bankState}
                />
              </View>

              {/* Bank Name */}
              <View style={styles.fieldContainer}>
                <Text style={styles.label}>
                  Bank Name <Text style={styles.asterisk}>*</Text>
                </Text>
                <CustomTextInput2
                  ref={bankNameRef}
                  value={bankName}
                  onChangeText={(text) => {
                    clearFieldError('bankName');
                    setBankName(text);
                  }}
                  placeholder="Enter Bank Name"
                  error={fieldErrors.bankName}
                />
              </View>

              {/* Bank Branch */}
              <View style={styles.fieldContainer}>
                <Text style={styles.label}>
                  Bank Branch <Text style={styles.asterisk}>*</Text>
                </Text>
                <CustomTextInput2
                  ref={bankBranchRef}
                  value={bankBranch}
                  onChangeText={(text) => {
                    clearFieldError('bankBranch');
                    setBankBranch(text);
                  }}
                  placeholder="Enter Bank Branch"
                  error={fieldErrors.bankBranch}
                />
              </View>

              {/* Cheque Upload Type */}
              <View style={styles.fieldContainer}>
                <Text style={styles.label}>
                  Upload Cancelled Cheque/Bank Passbook first page/ Bank Statement with bank details Type <Text style={styles.asterisk}>*</Text>
                </Text>
                <CustomDropdown
                  value={chequeUploadType}
                  onSelect={(item) => {
                    clearFieldError('chequeUploadType');
                    setChequeUploadType(typeof item === 'string' ? item : item.label || item.value);
                  }}
                  placeholder="Select Upload Type"
                  options={uploadTypeOptions}
                  showSearch={false}
                  error={fieldErrors.chequeUploadType}
                />
              </View>

              {/* Cheque Upload */}
              <View style={styles.fieldContainer}>
                <Text style={styles.label}>
                  Upload Cancelled Cheque/Bank Passbook first page/ Bank Statement with bank details Image <Text style={styles.asterisk}>*</Text>
                </Text>
                <CustomUploadButton
                  onPress={handleChequeUpload}
                  fileName={chequeFile?.name}
                  label="Drag and drop or browse files to upload"
                  subtext="[Max: 5MB] (jpg/jpeg/png/only)"
                />
              </View>

              {/* KYC Upload Type */}
              <View style={styles.fieldContainer}>
                <Text style={styles.label}>
                  Upload KYC Document Aadhar Card, Driving License, Passport in PDF/JPG/JPEG/PNG/ type <Text style={styles.asterisk}>*</Text>
                </Text>
                <CustomDropdown
                  value={kycUploadType}
                  onSelect={(item) => {
                    clearFieldError('kycUploadType');
                    setKycUploadType(typeof item === 'string' ? item : item.label || item.value);
                  }}
                  placeholder="Select Upload Type"
                  options={uploadTypeOptions}
                  showSearch={false}
                  error={fieldErrors.kycUploadType}
                />
              </View>

              {/* KYC Upload */}
              <View style={styles.fieldContainer}>
                <Text style={styles.label}>
                  Upload KYC Document Aadhar Card, Driving License, Passport in PDF/JPG/JPEG/PNG/ <Text style={styles.asterisk}>*</Text>
                </Text>
                <CustomUploadButton
                  onPress={handleKycUpload}
                  fileName={kycFile?.name}
                  label="Drag and drop or browse files to upload"
                  subtext="[Max: 5MB] (jpg/jpeg/png/only)"
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
    fontSize: 12,
    color: '#000000',
    marginBottom: 8,
  },
  asterisk: {
    color: '#FF0000',
  },
  buttonContainer: {
    marginTop: 10,
    marginBottom: 20,
  },
});

export default BankDetailsScreen;
