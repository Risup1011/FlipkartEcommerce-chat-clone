import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
  ScrollView,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Poppins, images, icons } from '../assets';
import CustomButton from './CustomButton';
import CustomTextInput from './CustomTextInput';
import { useToast } from './ToastContext';
import { API_BASE_URL } from '../config';

const OTPVerificationScreen = ({ onOpenPicker, countryCode, countryFlag, onCountrySelect, onNavigateToVerification, onSkip }) => {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [screenData, setScreenData] = useState(null); // Store backend screen configuration
  const [loadingScreenData, setLoadingScreenData] = useState(true); // Loading state for screen config
  const { showToast } = useToast();

  // Fetch screen configuration from backend
  useEffect(() => {
    fetchScreenConfig();
  }, []);

  const fetchScreenConfig = async () => {
    try {
      setLoadingScreenData(true);
      const endpoint = `${API_BASE_URL}v1/onboarding/sections`;
      console.log('📤 [OTPVerificationScreen] ========================================');
      console.log('📤 [OTPVerificationScreen] FETCHING SCREEN CONFIG FROM API');
      console.log('📤 [OTPVerificationScreen] Endpoint:', endpoint);
      console.log('📤 [OTPVerificationScreen] Method: GET');
      console.log('📤 [OTPVerificationScreen] ========================================');
      
      const response = await fetch(endpoint, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      console.log('📥 [OTPVerificationScreen] ========================================');
      console.log('📥 [OTPVerificationScreen] API RESPONSE RECEIVED');
      console.log('📥 [OTPVerificationScreen] Response Status:', response.status);
      console.log('📥 [OTPVerificationScreen] Response OK:', response.ok);
      
      let data;
      try {
        data = await response.json();
      } catch (parseError) {
        console.error('❌ [OTPVerificationScreen] Failed to parse response as JSON');
        const textResponse = await response.text();
        console.error('❌ [OTPVerificationScreen] Raw Response:', textResponse);
        // Continue with fallback text if JSON parsing fails
        setScreenData(null);
        setLoadingScreenData(false);
        return;
      }
      
      console.log('📥 [OTPVerificationScreen] Response Data:', JSON.stringify(data, null, 2));
      console.log('📥 [OTPVerificationScreen] ========================================');

      // Handle 500 errors (server errors) - continue with fallback
      if (response.status === 500) {
        console.warn('⚠️ [OTPVerificationScreen] Server Error (500) - Using fallback text');
        const errorMessage = data.message || data.error || 'Server error';
        console.warn('⚠️ [OTPVerificationScreen] Error Message:', errorMessage);
        // Continue with fallback text if API fails
        setScreenData(null);
        setLoadingScreenData(false);
        return;
      }

      if (response.ok && data.code === 200 && data.status === 'success') {
        console.log('✅ [OTPVerificationScreen] API Call Successful');
        console.log('✅ [OTPVerificationScreen] Total Sections:', data.data?.sections?.length || 0);
        
        // Find OTP_VERIFICATION section or use first section as fallback
        const otpSection = data.data?.sections?.find(
          section => section.section_id === 'OTP_VERIFICATION'
        ) || data.data?.sections?.[0];

        if (otpSection) {
          console.log('✅ [OTPVerificationScreen] Section Found:', otpSection.section_id);
          console.log('✅ [OTPVerificationScreen] Screen Config:', JSON.stringify(otpSection, null, 2));
          setScreenData(otpSection);
        } else {
          console.warn('⚠️ [OTPVerificationScreen] OTP_VERIFICATION section not found, using fallback');
          // Use fallback structure if section not found
          setScreenData(null);
        }
      } else {
        console.warn('⚠️ [OTPVerificationScreen] API Call Failed - Using fallback text');
        console.warn('⚠️ [OTPVerificationScreen] Response Status:', response.status);
        console.warn('⚠️ [OTPVerificationScreen] Error Code:', data.code || data.status);
        console.warn('⚠️ [OTPVerificationScreen] Error Message:', data.message || data.error);
        // Continue with fallback text if API fails
        setScreenData(null);
      }
    } catch (error) {
      console.error('❌ [OTPVerificationScreen] ========================================');
      console.error('❌ [OTPVerificationScreen] NETWORK/API ERROR');
      console.error('❌ [OTPVerificationScreen] Error:', error);
      console.error('❌ [OTPVerificationScreen] Error Message:', error.message);
      console.error('❌ [OTPVerificationScreen] ========================================');
      // Continue with fallback text if network error
      setScreenData(null);
    } finally {
      setLoadingScreenData(false);
      console.log('🏁 [OTPVerificationScreen] Screen config fetch completed');
    }
  };

  const handlePhoneNumberChange = (text) => {
    // Remove all non-numeric characters
    const numericText = text.replace(/[^0-9]/g, '');
    // Limit to 10 digits
    if (numericText.length <= 10) {
      setPhoneNumber(numericText);
      // Clear error when user starts typing
      if (error) {
        setError('');
      }
    }
  };

  const validatePhoneNumber = () => {
    if (!phoneNumber || phoneNumber.trim() === '') {
      const errorMsg = screenData?.messages?.validation?.phone_required || 'Phone number is required';
      setError(errorMsg);
      return false;
    }
    if (phoneNumber.length !== 10) {
      const errorMsg = screenData?.messages?.validation?.invalid_phone || 'Please enter a valid 10-digit phone number';
      setError(errorMsg);
      return false;
    }
    return true;
  };

  const handleSendOTP = async () => {
    if (!validatePhoneNumber()) {
      return;
    }

    setLoading(true);
    setError('');

    try {
      const fullPhoneNumber = countryCode + phoneNumber;
      const requestBody = {
        phone: fullPhoneNumber,
        channel: 'whatsapp',
      };

      console.log('📤 [OTPVerificationScreen] Making API call to send OTP');
      console.log('📤 [OTPVerificationScreen] Endpoint:', `${API_BASE_URL}v1/auth/send-otp`);
      console.log('📤 [OTPVerificationScreen] Request Body:', JSON.stringify(requestBody, null, 2));

      const response = await fetch(`${API_BASE_URL}v1/auth/send-otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();
      
      // Log full response for debugging
      console.log('📥 [OTPVerificationScreen] API Response:', JSON.stringify(data, null, 2));
      console.log('📥 [OTPVerificationScreen] Response Status:', response.status);

      if (response.ok && data.code === 200 && data.status === 'success') {
        console.log('✅ [OTPVerificationScreen] API Call Successful - OTP sent via API');
        
        // Show success message (use backend message or API response message)
        const successMessage = screenData?.messages?.success?.otp_sent || data.message || 'OTP sent successfully';
        showToast(successMessage, 'success');
        
        // Try to find OTP in various possible locations in the response
        // Only check string values that look like OTPs (4 digits), not status codes
        let otpValue = null;
        if (data.data?.otp && typeof data.data.otp === 'string' && /^\d{4}$/.test(data.data.otp)) {
          otpValue = data.data.otp;
        } else if (data.data?.code && typeof data.data.code === 'string' && /^\d{4}$/.test(data.data.code)) {
          otpValue = data.data.code;
        } else if (data.otp && typeof data.otp === 'string' && /^\d{4}$/.test(data.otp)) {
          otpValue = data.otp;
        }
        
        // Log OTP if found
        if (otpValue) {
          console.log('🔑 [OTPVerificationScreen] OTP found in API response:', otpValue);
        } else {
          console.log('ℹ️ [OTPVerificationScreen] OTP not in API response (normal - sent via WhatsApp/SMS)');
        }
        
        console.log('📋 [OTPVerificationScreen] OTP Data to pass:', {
          otp_id: data.data?.otp_id,
          expires_in: data.data?.expires_in,
          otp: otpValue,
        });
        
        // Navigate to verification code screen with OTP data
      if (onNavigateToVerification) {
          onNavigateToVerification(fullPhoneNumber, {
            otp_id: data.data?.otp_id,
            expires_in: data.data?.expires_in,
            otp: otpValue, // Include OTP if available in response (for testing)
            sentAt: Date.now(), // Store timestamp when OTP was sent
          });
        }
      } else {
        // Handle API error response
        console.error('❌ [OTPVerificationScreen] API Call Failed');
        console.error('❌ [OTPVerificationScreen] Error Response:', JSON.stringify(data, null, 2));
        const errorMessage = data.message || screenData?.messages?.error?.otp_send_failed || 'Failed to send OTP. Please try again.';
        setError(errorMessage);
        showToast(errorMessage, 'error');
      }
    } catch (err) {
      // Handle network or other errors
      console.error('❌ [OTPVerificationScreen] Network/API Error:', err);
      console.error('❌ [OTPVerificationScreen] Error Details:', err.message);
      const errorMessage = screenData?.messages?.error?.network_error || 'Network error. Please check your connection and try again.';
      setError(errorMessage);
      showToast(errorMessage, 'error');
    } finally {
      setLoading(false);
      console.log('🏁 [OTPVerificationScreen] API call completed, loading set to false');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.keyboardAvoidingView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
        {/* Logo Section */}
        <View style={styles.logoContainer}>
          <Image
            source={images.splashIcon}
            style={styles.logo}
            resizeMode="contain"
          />
        </View>

        {/* Partner Section */}
        <View style={styles.partnerSection}>
          <Text style={styles.partnerHeading}>
            {screenData?.partner_heading || 'Partner With Kamai24'}
          </Text>
          <View style={styles.partnerRow}>
            <Text style={styles.partnerText}>
              {screenData?.partner_text || 'Earn. Grow. Conn'}
            </Text>
            {/* <View style={styles.partnerIcon}>
              <Text style={styles.partnerIconText}>P</Text>
            </View> */}
          </View>
        </View>

        {/* OTP Verification Section */}
        <View style={styles.otpSection}>
          <Text style={styles.otpHeading}>
            {screenData?.title || 'OTP Verification'}
          </Text>
          <Text style={styles.otpInstruction}>
            {screenData?.description || screenData?.instruction || 'Enter phone number to send one time Password'}
          </Text>

          {/* Phone Number Input */}
          <CustomTextInput
            value={phoneNumber}
            onChangeText={handlePhoneNumberChange}
            placeholder={screenData?.phone_placeholder || 'Phone'}
            keyboardType="phone-pad"
            maxLength={10}
            error={error}
            showCountryCode={true}
            countryCode={countryCode}
            countryFlag={countryFlag}
            onCountryCodePress={() => {
              console.log('Country code button pressed!')
              onOpenPicker()
            }}
          />

          {/* Send OTP Button */}
          <CustomButton
            title={screenData?.button_text || 'Send One Time Password'}
            onPress={handleSendOTP}
            style={styles.sendButton}
            loading={loading}
            disabled={loading}
          />

          {/* Skip Button - Navigate to Orders Screen */}
          {onSkip && (
            <TouchableOpacity
              onPress={onSkip}
              style={styles.skipButton}
            >
              <Text style={styles.skipButtonText}>Skip</Text>
            </TouchableOpacity>
          )}
     
        </View>

        {/* Version Number */}
        <View style={styles.versionContainer}>
          <Text style={styles.versionText}>App v.0.0.1</Text>
        </View>
      </ScrollView>
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
    paddingTop: 40,
    paddingBottom: 100,
  },
  logoContainer: {
    alignItems: 'center',
    marginTop: 30,
    // marginBottom: 20,
  },
  logo: {
    width: 296,
    height: 132,
  },
  partnerSection: {
    marginBottom: 10,
    alignSelf:"center"
  },
  partnerHeading: {
    fontFamily: Poppins.bold,
    fontSize: 29,
    color: '#000000',
    // marginBottom: 5,
  },
  partnerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  partnerText: {
    fontFamily: Poppins.medium,
    fontSize: 16,
    color: '#4CAF50',
    textAlign: 'center',
  },
  partnerIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#424242',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
  },
  partnerIconText: {
    fontFamily: Poppins.bold,
    fontSize: 18,
    color: '#4CAF50',
  },
  otpSection: {
    marginTop: 20,
  },
  otpHeading: {
    fontFamily: Poppins.semiBold,
    fontSize:20,
    marginTop:20,
    color: '#000000',
    // marginBottom: 10,
  },
  otpInstruction: {
    fontFamily: Poppins.regular,
    fontSize: 14,
    color: '#666666',
    marginBottom: 30,
  },
  sendButton: {
    marginTop: 10,
  },
  skipButton: {
    marginTop: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  skipButtonText: {
    fontFamily: Poppins.medium,
    fontSize: 16,
    color: '#666666',
    textDecorationLine: 'underline',
  },
  versionContainer: {
    alignItems: 'center',
    marginTop: 30,
    marginBottom: 20,
  },
  versionText: {
    fontFamily: Poppins.regular,
    fontSize: 12,
    color: '#999999',
  },
});

export default OTPVerificationScreen;