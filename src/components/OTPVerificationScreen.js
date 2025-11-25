import React, { useState, useEffect, useMemo, useCallback } from 'react';
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

const OTPVerificationScreen = ({ onOpenPicker, countryCode, countryFlag, onCountrySelect, onNavigateToVerification }) => {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [screenData, setScreenData] = useState(null); // Store backend screen configuration
  
  // Fetch screen configuration from backend (non-blocking)
  useEffect(() => {
    // Don't block render - fetch in background
    fetchScreenConfig();
  }, []);

  const fetchScreenConfig = async () => {
    try {
      const endpoint = `${API_BASE_URL}v1/onboarding/sections`;
      console.log('🔍 [OTPVerificationScreen] Fetching screen config from:', endpoint);
      
      // Add timeout to prevent long waits
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000); // 3 second timeout
      
      const response = await fetch(endpoint, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);

      
      let data;
      try {
        data = await response.json();
      } catch (parseError) {
        console.error('❌ [OTPVerificationScreen] Failed to parse response as JSON');
        const textResponse = await response.text();
        console.error('❌ [OTPVerificationScreen] Raw Response:', textResponse);
        // Continue with fallback text if JSON parsing fails
        setScreenData(null);
        return;
      }
      

      // Handle 403 Forbidden - expected before authentication, use fallback silently
      if (response.status === 403) {
        console.log('ℹ️ [OTPVerificationScreen] Endpoint requires authentication (403) - Using fallback text');
        // Continue with fallback text - this is expected before user logs in
        setScreenData(null);
        return;
      }

      // Handle 500 errors (server errors) - continue with fallback
      if (response.status === 500) {
        console.warn('⚠️ [OTPVerificationScreen] Server Error (500) - Using fallback text');
        const errorMessage = data.message || data.error || 'Server error';
        console.warn('⚠️ [OTPVerificationScreen] Error Message:', errorMessage);
        // Continue with fallback text if API fails
        setScreenData(null);
        return;
      }

      if (response.ok && data.code === 200 && data.status === 'success') {
        
        // Find OTP_VERIFICATION section or use first section as fallback
        const otpSection = data.data?.sections?.find(
          section => section.section_id === 'OTP_VERIFICATION'
        ) || data.data?.sections?.[0];

        if (otpSection) {
          setScreenData(otpSection);
        } else {
          console.warn('⚠️ [OTPVerificationScreen] OTP_VERIFICATION section not found, using fallback');
          // Use fallback structure if section not found
          setScreenData(null);
        }
      } else {
        // Only log as warning if it's not a 403 (which is expected)
        if (response.status !== 403) {
          console.warn('⚠️ [OTPVerificationScreen] API Call Failed - Using fallback text');
          console.warn('⚠️ [OTPVerificationScreen] Response Status:', response.status);
          console.warn('⚠️ [OTPVerificationScreen] Error Code:', data.code || data.status);
          console.warn('⚠️ [OTPVerificationScreen] Error Message:', data.message || data.error);
        }
        // Continue with fallback text if API fails
        setScreenData(null);
      }
    } catch (error) {
      if (error.name === 'AbortError') {
        console.warn('⏱️ [OTPVerificationScreen] Request timeout - Using fallback text');
      } else {
        console.error('❌ [OTPVerificationScreen] ========================================');
        console.error('❌ [OTPVerificationScreen] NETWORK/API ERROR');
        console.error('❌ [OTPVerificationScreen] Error:', error);
        console.error('❌ [OTPVerificationScreen] Error Message:', error.message);
        console.error('❌ [OTPVerificationScreen] ========================================');
      }
      // Continue with fallback text if network error or timeout
      setScreenData(null);
    }
  };

  const handlePhoneNumberChange = useCallback((text) => {
    // Remove all non-numeric characters
    const numericText = text.replace(/[^0-9]/g, '');
    // Limit to 10 digits
    if (numericText.length <= 10) {
      setPhoneNumber(numericText);
      // Clear error when user starts typing
      setError(prevError => prevError ? '' : prevError);
    }
  }, []);

  const validatePhoneNumber = useCallback(() => {
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
  }, [phoneNumber, screenData]);

  // Memoize text values to prevent unnecessary re-renders
  const partnerHeading = useMemo(() => 
    screenData?.partner_heading || 'Partner With Kamai24', 
    [screenData?.partner_heading]
  );
  
  const partnerText = useMemo(() => 
    screenData?.partner_text || 'Earn. Grow. Connect', 
    [screenData?.partner_text]
  );
  
  const otpHeading = useMemo(() => 
    screenData?.title || 'OTP Verification', 
    [screenData?.title]
  );
  
  const otpInstruction = useMemo(() => 
    screenData?.description || screenData?.instruction || 'Enter phone number to send one time Password', 
    [screenData?.description, screenData?.instruction]
  );
  
  const phonePlaceholder = useMemo(() => 
    screenData?.phone_placeholder || 'Phone', 
    [screenData?.phone_placeholder]
  );
  
  const buttonText = useMemo(() => 
    screenData?.button_text || 'Send One Time Password', 
    [screenData?.button_text]
  );

  const handleSendOTP = useCallback(async () => {
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

      const endpoint = `${API_BASE_URL}v1/auth/send-otp`;
      console.log('🔍 [OTPVerificationScreen] Sending OTP request to:', endpoint);
      console.log('🔍 [OTPVerificationScreen] Request body:', JSON.stringify(requestBody));

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();
      
      // Log full response for debugging

      // Handle 429 Rate Limit - OTP already sent, but we can still proceed if otp_id exists
      if (response.status === 429 && data.code === 429 && data.error_code === 'OTP_ALREADY_ACTIVE') {
        console.log('ℹ️ [OTPVerificationScreen] OTP already active - User can use existing OTP');
        // If we have otp_id in the response, navigate to verification screen
        // Otherwise, show the message to the user
        if (data.data?.otp_id && onNavigateToVerification) {
          // Extract expires_in from message if available, or use default
          const expiresMatch = data.message?.match(/(\d+)\s+seconds/);
          const expiresIn = expiresMatch ? parseInt(expiresMatch[1]) : 1800; // Default 30 minutes
          
          onNavigateToVerification(fullPhoneNumber, {
            otp_id: data.data.otp_id,
            expires_in: expiresIn,
            sentAt: Date.now(),
          });
        } else {
          // Show info message instead of error
          const infoMessage = data.message || 'An OTP has already been sent. Please check your messages or wait before requesting a new one.';
          setError(infoMessage);
        }
        return;
      }

      if (response.ok && data.code === 200 && data.status === 'success') {
        
        // Show success message (use backend message or API response message)
        const successMessage = screenData?.messages?.success?.otp_sent || data.message || 'OTP sent successfully';
        
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
        } else {
        }
        
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
      }
    } catch (err) {
      // Handle network or other errors
      console.error('❌ [OTPVerificationScreen] Network/API Error:', err);
      console.error('❌ [OTPVerificationScreen] Error Details:', err.message);
      const errorMessage = screenData?.messages?.error?.network_error || 'Network error. Please check your connection and try again.';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [validatePhoneNumber, phoneNumber, countryCode, screenData, onNavigateToVerification]);

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
            {partnerHeading}
          </Text>
          <View style={styles.partnerRow}>
            <Text style={styles.partnerText}>
              {partnerText}
            </Text>
            {/* <View style={styles.partnerIcon}>
              <Text style={styles.partnerIconText}>P</Text>
            </View> */}
          </View>
        </View>

        {/* OTP Verification Section */}
        <View style={styles.otpSection}>
          <Text style={styles.otpHeading}>
            {otpHeading}
          </Text>
          <Text style={styles.otpInstruction}>
            {otpInstruction}
          </Text>

          {/* Phone Number Input */}
          <CustomTextInput
            value={phoneNumber}
            onChangeText={handlePhoneNumberChange}
            placeholder={phonePlaceholder}
            keyboardType="phone-pad"
            maxLength={10}
            error={error}
            showCountryCode={true}
            countryCode={countryCode}
            countryFlag={countryFlag}
            onCountryCodePress={() => {
              onOpenPicker()
            }}
          />

          {/* Send OTP Button */}
          <CustomButton
            title={buttonText}
            onPress={handleSendOTP}
            style={styles.sendButton}
            loading={loading}
            disabled={loading}
          />
     
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

// Memoize component to prevent unnecessary re-renders
export default React.memo(OTPVerificationScreen);