import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableWithoutFeedback,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
} from 'react-native';
import { Poppins, icons } from '../assets';
import CustomHeader from './CustomHeader';
import CustomTextInput2 from './CustomTextInput2';
import CustomButton from './CustomButton';
import InfoBanner from './InfoBanner';
import { useToast } from './ToastContext';

const MoUESignDetailsScreen = ({ onBack, onProceed }) => {
    const [hasReadMOU, setHasReadMOU] = useState(false);
  const [hasReadGSTDeclaration, setHasReadGSTDeclaration] = useState(false);
  const [ownerNumber, setOwnerNumber] = useState('');
  const [otp, setOtp] = useState('');
  const [isOTPGenerated, setIsOTPGenerated] = useState(false);
  const [isOTPVerified, setIsOTPVerified] = useState(false);
  const [isDocumentSigned, setIsDocumentSigned] = useState(false);

  // Refs for all text inputs
  const ownerNumberRef = useRef(null);
  const otpRef = useRef(null);

  // Function to blur all inputs
  const blurAllInputs = () => {
    ownerNumberRef.current?.blur();
    otpRef.current?.blur();
    Keyboard.dismiss();
  };

  const handleGenerateOTP = () => {
    if (!ownerNumber || ownerNumber.length < 10) {
      return;
    }
    // Implement OTP generation logic here
    setIsOTPGenerated(true);
  };

  const handleVerifyOTP = () => {
    if (!otp) {
      return;
    }
    if (otp.length < 6) {
      return;
    }
    // Implement OTP verification logic here
    setIsOTPVerified(true);
    setIsDocumentSigned(true);
  };

  const handleViewMOU = () => {
    // Implement view MOU logic here
  };

  const handleViewGSTDeclaration = () => {
    // Implement view GST Declaration logic here
  };

  const handleViewBankDocuments = () => {
    // Implement view Bank Documents logic here
  };

  const handleViewSignedMOU = () => {
    // Implement view signed MOU logic here
  };

  const handleViewAllESignedDocuments = () => {
    // Implement view all e-signed documents logic here
  };

  const handleProceed = () => {
    if (!hasReadMOU) {
      return;
    }
    if (!isDocumentSigned) {
      return;
    }
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
          title="MoU/E-Sign Details"
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
              text="Kindly read carefully through the memorandum of understanding (MoU) and check details entered are correctly captured before ESigning. Generate OTP to your mobile number to Esign"
            />

            {/* Read the MOU Section */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Read the MOU</Text>
              <TouchableOpacity
                style={styles.viewButton}
                onPress={handleViewMOU}
                activeOpacity={0.7}
              >
                <Text style={styles.viewButtonText}>View MOU</Text>
              </TouchableOpacity>

              <View style={styles.checkboxContainer}>
                <TouchableOpacity
                  style={styles.checkbox}
                  onPress={() => setHasReadMOU(!hasReadMOU)}
                  activeOpacity={0.7}
                >
                  {hasReadMOU && (
                    <View style={styles.checkboxInner}>
                      <Text style={styles.checkmark}>✓</Text>
                    </View>
                  )}
                </TouchableOpacity>
                <Text style={styles.checkboxLabel}>I have read the MOU</Text>
              </View>
            </View>

            {/* Read the GST Declaration Section */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Read the GST Declaration</Text>
              <TouchableOpacity
                style={styles.viewButton}
                onPress={handleViewGSTDeclaration}
                activeOpacity={0.7}
              >
                <Text style={styles.viewButtonText}>View GST Declaration</Text>
              </TouchableOpacity>
            </View>

            {/* Read the Bank Documents Section */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Read the Bank Documents</Text>
              <TouchableOpacity
                style={styles.viewButton}
                onPress={handleViewBankDocuments}
                activeOpacity={0.7}
              >
                <Text style={styles.viewButtonText}>View Bank Documents</Text>
              </TouchableOpacity>
            </View>

            {/* Sign the Documents Section */}
            {!isDocumentSigned && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Sign the Documents</Text>
                <Text style={styles.sectionDescription}>
                  Click on "Generate OTP" to receive OTP on the owner number (visible below). Verify OTP to digitally sign the document
                </Text>

                {/* Owner Number Input */}
                <View style={styles.fieldContainer}>
                  <Text style={styles.label}>
                    Owner Number <Text style={styles.asterisk}>*</Text>
                  </Text>
                  <CustomTextInput2
                    ref={ownerNumberRef}
                    value={ownerNumber}
                    onChangeText={setOwnerNumber}
                    placeholder="Enter Owner Number"
                    keyboardType="phone-pad"
                    maxLength={10}
                    rightButton="Generate OTP"
                    onRightButtonPress={handleGenerateOTP}
                    editable={!isOTPGenerated}
                  />
                </View>

                {/* Verify OTP Input */}
                {isOTPGenerated && (
                  <View style={styles.fieldContainer}>
                    <Text style={styles.label}>
                      Verify OTP <Text style={styles.asterisk}>*</Text>
                    </Text>
                    <CustomTextInput2
                      ref={otpRef}
                      value={otp}
                      onChangeText={setOtp}
                      placeholder="Enter OTP"
                      keyboardType="number-pad"
                      maxLength={6}
                      rightButton="Verify OTP"
                      onRightButtonPress={handleVerifyOTP}
                      editable={!isOTPVerified}
                    />
                  </View>
                )}
              </View>
            )}

            {/* Success Confirmation Section */}
            {isDocumentSigned && (
              <View style={styles.successSection}>
                <View style={styles.successIconContainer}>
                  <Text style={styles.successCheckmark}>✓</Text>
                </View>
                <Text style={styles.successText}>
                  The document has been successfully signed
                </Text>
                <View style={styles.viewButtonsContainer}>
                  <TouchableOpacity
                    style={styles.viewSignedButton}
                    onPress={handleViewSignedMOU}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.viewSignedButtonText}>View Signed MOU</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.viewSignedButton}
                    onPress={handleViewAllESignedDocuments}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.viewSignedButtonText}>View All E-Signed Documents</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* Final Success Banner */}
            {isDocumentSigned && (
              <View style={styles.successBanner}>
                <View style={styles.successBannerIconContainer}>
                  <Text style={styles.successBannerCheckmark}>✓</Text>
                </View>
                <Text style={styles.successBannerText}>
                  Yay! Your Document have been signed successfully. Please provide a few more details like packaging charges, menu details, etc to complete registration process.
                </Text>
              </View>
            )}

            {/* Proceed Button */}
            <View style={styles.buttonContainer}>
              <CustomButton
                title="Proceed"
                onPress={handleProceed}
                disabled={!isDocumentSigned || !hasReadMOU}
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
  section: {
    marginBottom: 25,
  },
  sectionTitle: {
    fontFamily: Poppins.semiBold,
    fontSize: 18,
    color: '#000000',
    marginBottom: 12,
  },
  sectionDescription: {
    fontFamily: Poppins.regular,
    fontSize: 14,
    color: '#666666',
    marginBottom: 15,
    lineHeight: 20,
  },
  viewButton: {
    borderWidth: 1,
    borderColor: '#FF6E1A',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    marginBottom: 15,
  },
  viewButtonText: {
    fontFamily: Poppins.medium,
    fontSize: 14,
    color: '#FF6E1A',
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderColor: '#FF6E1A',
    borderRadius: 4,
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  checkboxInner: {
    width: '100%',
    height: '100%',
    backgroundColor: '#FF6E1A',
    borderRadius: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkmark: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  checkboxLabel: {
    fontFamily: Poppins.regular,
    fontSize: 14,
    color: '#000000',
    flex: 1,
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
  successSection: {
    marginBottom: 25,
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#F9F9F9',
    borderRadius: 12,
  },
  successIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
  },
  successCheckmark: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: 'bold',
  },
  successText: {
    fontFamily: Poppins.medium,
    fontSize: 16,
    color: '#000000',
    marginBottom: 20,
    textAlign: 'center',
  },
  viewButtonsContainer: {
    width: '100%',
    gap: 12,
  },
  viewSignedButton: {
    borderWidth: 1,
    borderColor: '#FFD700',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
  },
  viewSignedButtonText: {
    fontFamily: Poppins.medium,
    fontSize: 14,
    color: '#FFD700',
  },
  successBanner: {
    flexDirection: 'row',
    backgroundColor: '#4CAF50',
    borderRadius: 8,
    padding: 15,
    marginBottom: 25,
    alignItems: 'flex-start',
  },
  successBannerIconContainer: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
    marginTop: 2,
  },
  successBannerCheckmark: {
    color: '#4CAF50',
    fontSize: 16,
    fontWeight: 'bold',
  },
  successBannerText: {
    flex: 1,
    fontFamily: Poppins.regular,
    fontSize: 14,
    color: '#FFFFFF',
    lineHeight: 20,
  },
  buttonContainer: {
    marginTop: 10,
    marginBottom: 20,
  },
});

export default MoUESignDetailsScreen;
