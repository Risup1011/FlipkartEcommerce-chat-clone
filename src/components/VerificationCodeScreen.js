import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Image,
  Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Poppins } from '../assets';
import CustomButton from './CustomButton';
import CustomHeader from './CustomHeader';
import { useToast } from './ToastContext';
import { API_BASE_URL, MOCK_OTP_PARTNER_STATUS, MOCK_OTP_CODE, MOCK_OTP_ENDPOINTS, USE_MOCK_OTP_ENDPOINTS } from '../config';
import { getDeviceInfo } from '../utils/deviceInfo';
import { storeTokens } from '../utils/tokenStorage';
import { getFCMToken } from '../utils/notificationService';

const VerificationCodeScreen = ({ phoneNumber, otpData, onBack, onConfirm, onResendOTP }) => {
  const [codes, setCodes] = useState(['', '', '', '']);
  const [error, setError] = useState('');
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const [loading, setLoading] = useState(false);
  const [otpExpired, setOtpExpired] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(0); // Time remaining in seconds
  const [screenData, setScreenData] = useState(null); // Store backend screen configuration
  const [loadingScreenData, setLoadingScreenData] = useState(true); // Loading state for screen config
  const inputRefs = useRef([]);
  
  // Fetch screen configuration from backend
  useEffect(() => {
    fetchScreenConfig();
  }, []);

  const fetchScreenConfig = async () => {
    try {
      setLoadingScreenData(true);
      const endpoint = `${API_BASE_URL}v1/onboarding/sections`;
      
      const response = await fetch(endpoint, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      
      let data;
      try {
        data = await response.json();
      } catch (parseError) {
        console.error('❌ [VerificationCodeScreen] Failed to parse response as JSON');
        const textResponse = await response.text();
        console.error('❌ [VerificationCodeScreen] Raw Response:', textResponse);
        // Continue with fallback text if JSON parsing fails
        setScreenData(null);
        setLoadingScreenData(false);
        return;
      }
      

      // Handle 403 Forbidden - expected before authentication, use fallback silently
      if (response.status === 403) {
        console.log('ℹ️ [VerificationCodeScreen] Endpoint requires authentication (403) - Using fallback text');
        // Continue with fallback text - this is expected before user logs in
        setScreenData(null);
        setLoadingScreenData(false);
        return;
      }

      // Handle 500 errors (server errors) - continue with fallback
      if (response.status === 500) {
        console.warn('⚠️ [VerificationCodeScreen] Server Error (500) - Using fallback text');
        const errorMessage = data.message || data.error || 'Server error';
        console.warn('⚠️ [VerificationCodeScreen] Error Message:', errorMessage);
        // Continue with fallback text if API fails
        setScreenData(null);
        setLoadingScreenData(false);
        return;
      }

      if (response.ok && data.code === 200 && data.status === 'success') {
        
        // Find VERIFICATION_CODE section or use first section as fallback
        const verificationSection = data.data?.sections?.find(
          section => section.section_id === 'VERIFICATION_CODE'
        ) || data.data?.sections?.[0];

        if (verificationSection) {
          setScreenData(verificationSection);
        } else {
          console.warn('⚠️ [VerificationCodeScreen] VERIFICATION_CODE section not found, using fallback');
          // Use fallback structure if section not found
          setScreenData(null);
        }
      } else {
        // Only log as warning if it's not a 403 (which is expected)
        if (response.status !== 403) {
          console.warn('⚠️ [VerificationCodeScreen] API Call Failed - Using fallback text');
          console.warn('⚠️ [VerificationCodeScreen] Response Status:', response.status);
          console.warn('⚠️ [VerificationCodeScreen] Error Code:', data.code || data.status);
          console.warn('⚠️ [VerificationCodeScreen] Error Message:', data.message || data.error);
        }
        // Continue with fallback text if API fails
        setScreenData(null);
      }
    } catch (error) {
      console.error('❌ [VerificationCodeScreen] ========================================');
      console.error('❌ [VerificationCodeScreen] NETWORK/API ERROR');
      console.error('❌ [VerificationCodeScreen] Error:', error);
      console.error('❌ [VerificationCodeScreen] Error Message:', error.message);
      console.error('❌ [VerificationCodeScreen] ========================================');
      // Continue with fallback text if network error
      setScreenData(null);
    } finally {
      setLoadingScreenData(false);
    }
  };

  // Log OTP data for debugging
  React.useEffect(() => {
    if (otpData?.otp && typeof otpData.otp === 'string' && otpData.otp.length === 4) {
    }
  }, [otpData]);

  // Calculate remaining time from backend timer (using timestamp)
  // expires_in is in seconds (e.g., 300 = 5 minutes)
  React.useEffect(() => {
    const calculateRemainingTime = () => {
      if (otpData?.expires_in && otpData?.sentAt) {
        const now = Date.now();
        const sentAt = otpData.sentAt;
        const expiresInMs = otpData.expires_in * 1000; // Convert to milliseconds
        const elapsed = now - sentAt;
        const remaining = Math.max(0, Math.floor((expiresInMs - elapsed) / 1000)); // Convert back to seconds
        
        
        setTimeRemaining(remaining);
        setOtpExpired(remaining === 0);
      } else if (otpData === null || !otpData?.sentAt) {
        // Reset timer if OTP data is cleared or missing sentAt
        setTimeRemaining(0);
        setOtpExpired(false);
      }
    };

    // Calculate immediately
    calculateRemainingTime();

    // Update every second to show accurate remaining time
    const timer = setInterval(() => {
      calculateRemainingTime();
    }, 1000);

    return () => clearInterval(timer);
  }, [otpData?.expires_in, otpData?.sentAt, otpData]);

  // Format time as MM:SS (converts seconds to minutes:seconds)
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleCodeChange = (text, index) => {
    // Only allow numbers
    const numericText = text.replace(/[^0-9]/g, '');
    
    if (numericText.length <= 1) {
      const newCodes = [...codes];
      newCodes[index] = numericText;
      setCodes(newCodes);

      // Clear error when user starts typing
      if (error) {
        setError('');
      }

      // Auto-focus next input
      if (numericText.length === 1 && index < 3) {
        inputRefs.current[index + 1]?.focus();
      }
    }
  };

  const handleKeyPress = (e, index) => {
    // Handle backspace to move to previous input
    if (e.nativeEvent.key === 'Backspace' && codes[index] === '' && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const validateOTP = () => {
    const code = codes.join('');
    if (!code || code.length === 0) {
      const errorMsg = screenData?.messages?.validation?.code_required || 'Verification code is required';
      setError(errorMsg);
      return false;
    }
    if (code.length !== 4) {
      const errorMsg = screenData?.messages?.validation?.invalid_code || 'Please enter a complete 4-digit verification code';
      setError(errorMsg);
      return false;
    }
    return true;
  };

  const handleConfirm = async () => {
    if (!validateOTP()) {
      return;
    }

    const otpCode = codes.join('');
    
    // Bypass for mock OTP (development/testing only)
    if (otpCode === MOCK_OTP_CODE) {
      
      
      // Use partner_status from config file
      const mockPartnerStatus = MOCK_OTP_PARTNER_STATUS;
      const mockOnboardingId = '8925461'; // Default test onboarding ID
      
      // For mock bypass, we don't have tokens, so pass null
      if (onConfirm) {
        onConfirm(otpCode, mockPartnerStatus, mockOnboardingId, null, null, null);
      }
      return;
    }

    if (!otpData || !otpData.otp_id) {
      const errorMsg = screenData?.messages?.error?.otp_session_expired || 'OTP session expired. Please request a new OTP.';
      return;
    }

    setLoading(true);
    setError('');
    setOtpExpired(false);

    try {
      // Get device information
      const deviceInfo = await getDeviceInfo();
      
      // Get FCM token for push notifications (temporarily disabled until google-services.json is added)
      let fcmToken = null;
      try {
        fcmToken = await getFCMToken();
        if (fcmToken) {
          console.log('🔔 [VerificationCodeScreen] FCM Token obtained: YES');
          console.log('📋 [VerificationCodeScreen] FCM TOKEN FOR POSTMAN:');
          console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
          console.log(fcmToken);
          console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
          console.log('💡 Copy the token above and use it in Postman for testing');
          
          // Show Alert with FCM token for easy copying
          Alert.alert(
            '✅ FCM Token Obtained',
            `Token copied to logs. Check Metro bundler to copy token for Postman.\n\nToken: ${fcmToken.substring(0, 50)}...`,
            [{ text: 'OK' }]
          );
        } else {
          console.log('🔔 [VerificationCodeScreen] FCM Token obtained: NO');
        }
      } catch (error) {
        console.log('🔔 [VerificationCodeScreen] FCM not configured yet - push notifications disabled');
      }

      const requestBody = {
        otp_id: otpData.otp_id,
        otp: otpCode,
        device_id: deviceInfo.device_id,
        fcm_token: fcmToken, // Add FCM token to request (null if Firebase not configured)
        device_info: deviceInfo.device_info,
      };

      // Determine which endpoint to use
      // If USE_MOCK_OTP_ENDPOINTS is true, use different endpoints based on OTP code
      // Otherwise, use the default endpoint (you can change the response in mockachino)
      let endpoint = `${API_BASE_URL}v1/auth/verify-otp`;
      
      
      if (USE_MOCK_OTP_ENDPOINTS && MOCK_OTP_ENDPOINTS[otpCode]) {
        endpoint = MOCK_OTP_ENDPOINTS[otpCode];
      } else {
      }
      

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();
      

      if (response.ok && data.code === 200 && data.status === 'success') {
        // Success - handle different partner_status values
        const partnerStatus = data.data?.partner_status;
        const onboardingId = data.data?.onboarding_id; // Extract onboarding ID if available
        const partnerId = data.data?.partner_id; // Extract partner_id from API response
        const accessToken = data.data?.access_token; // Extract access_token
        const refreshToken = data.data?.refresh_token; // Extract refresh_token
        const tokenType = data.data?.token_type || 'Bearer'; // Extract token_type
        const expiresIn = data.data?.expires_in; // Extract expires_in
        
        
        // Store tokens in AsyncStorage
        if (accessToken && refreshToken) {
          const tokensStored = await storeTokens(accessToken, refreshToken);
          if (tokensStored) {
          } else {
            console.warn('⚠️ [VerificationCodeScreen] Failed to store one or both tokens');
          }
        } else {
          console.warn('⚠️ [VerificationCodeScreen] Missing tokens in API response');
        }
        
        // Show success message (use backend message)
        const successMessage = screenData?.messages?.success?.otp_verified || 'OTP verified successfully';
        
        // Pass partner_status, partner_id, onboarding_id, access_token, and refresh_token to onConfirm callback
        if (onConfirm) {
          onConfirm(otpCode, partnerStatus, onboardingId, partnerId, accessToken, refreshToken);
        }
      } else {
        // Handle error cases
        const errorCode = data.error_code;
        // Use backend error messages based on error code, with fallbacks
        let errorMessage = data.message;
        if (!errorMessage) {
          if (errorCode === 'INVALID_OTP') {
            errorMessage = screenData?.messages?.error?.invalid_otp || 'Invalid OTP. Please try again.';
          } else if (errorCode === 'OTP_EXPIRED') {
            errorMessage = screenData?.messages?.error?.otp_expired || 'OTP has expired. Please request a new one.';
          } else if (errorCode === 'OTP_ATTEMPTS_EXCEEDED') {
            errorMessage = screenData?.messages?.error?.otp_attempts_exceeded || 'Maximum attempts exceeded. Please try again later.';
          } else {
            errorMessage = screenData?.messages?.error?.verify_failed || 'Failed to verify OTP. Please try again.';
          }
        }

        if (response.status === 400 && errorCode === 'INVALID_OTP') {
          // Case 1: Invalid OTP
          const invalidOtpMsg = screenData?.messages?.error?.invalid_otp || 'Invalid OTP. Please try again.';
          setError(invalidOtpMsg);
          // Clear the codes to allow re-entry
          setCodes(['', '', '', '']);
          inputRefs.current[0]?.focus();
        } else if (response.status === 410 && errorCode === 'OTP_EXPIRED') {
          // Case 2: Expired OTP
          setOtpExpired(true);
          setTimeRemaining(0); // Enable "Resend OTP" button immediately
          const expiredTitle = screenData?.messages?.alert?.otp_expired_title || 'OTP Expired';
          const expiredMessage = screenData?.messages?.alert?.otp_expired_message || 'Your OTP has expired. Please request a new OTP.';
          const expiredToast = screenData?.messages?.error?.otp_expired || 'OTP has expired. Please request a new one.';
          Alert.alert(
            expiredTitle,
            expiredMessage,
            [
              {
                text: screenData?.messages?.alert?.ok_button || 'OK',
                onPress: () => {
                  setCodes(['', '', '', '']);
                },
              },
            ]
          );
        } else if (response.status === 429 && errorCode === 'OTP_ATTEMPTS_EXCEEDED') {
          // Case 3: Maximum attempts exceeded
          setError(errorMessage);
          // Disable the confirm button temporarily
          setCodes(['', '', '', '']);
        } else {
          // Other errors
          setError(errorMessage);
        }
      }
    } catch (err) {
      // Handle network or other errors
      console.error('❌ [VerificationCodeScreen] ========================================');
      console.error('❌ [VerificationCodeScreen] NETWORK/API ERROR');
      console.error('❌ [VerificationCodeScreen] Error:', err);
      console.error('❌ [VerificationCodeScreen] Error Message:', err.message);
      console.error('❌ [VerificationCodeScreen] ========================================');
      const errorMessage = screenData?.messages?.error?.network_error || 'Network error. Please check your connection and try again.';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleResendOTP = async () => {
    // Allow resend when timer has expired (timeRemaining === 0) or OTP is expired
    if (onResendOTP && (timeRemaining === 0 || otpExpired)) {
      try {
        await onResendOTP();
        // Reset expired state and clear codes
        setOtpExpired(false);
        setCodes(['', '', '', '']);
        setError('');
        const resendSuccessMsg = screenData?.messages?.success?.otp_resent || 'OTP sent successfully';
        // Focus on first input
        inputRefs.current[0]?.focus();
        // Timer will be reset by the useEffect when new otpData is received
      } catch (err) {
        const resendErrorMsg = screenData?.messages?.error?.otp_resend_failed || 'Failed to resend OTP. Please try again.';
      }
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.keyboardAvoidingView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Header */}
        <CustomHeader
          title=""
          onBack={onBack}
          showBackButton={!(otpData?.sentAt && timeRemaining > 0)}
        />

        {/* Title Section */}
        <View style={styles.titleSection}>
          <Text style={styles.title}>
            {screenData?.title || 'Verification Code'}
          </Text>
          {otpData?.otp && typeof otpData.otp === 'string' && /^\d{4}$/.test(otpData.otp) ? (
            <View style={styles.otpContainer}>
              <Text style={styles.otpLabel}>
                {screenData?.otp_label || 'Your OTP:'}
              </Text>
              <Text style={styles.otpDisplay}>{otpData.otp}</Text>
            </View>
          ) : null}
          <Text style={styles.instruction}>
            {screenData?.description || screenData?.instruction || 'We have sent the verification code to your email address'}
          </Text>
        </View>

         {/* Code Input Fields */}
         <View style={styles.codeInputWrapper}>
           <View style={styles.codeContainer}>
             {codes.map((code, index) => (
               <TextInput
                 key={index}
                 ref={(ref) => (inputRefs.current[index] = ref)}
                 style={[
                   styles.codeInput,
                   code && styles.codeInputFilled,
                  focusedIndex === index && styles.codeInputFocused,
                 ]}
                 value={code}
                 onChangeText={(text) => handleCodeChange(text, index)}
                 onKeyPress={(e) => handleKeyPress(e, index)}
                 keyboardType="number-pad"
                 maxLength={1}
                onFocus={() => setFocusedIndex(index)}
                onBlur={() => setFocusedIndex(-1)}
                 selectTextOnFocus
               />
             ))}
           </View>

           {/* Error Message */}
           {error ? (
             <Text style={styles.errorText}>{error}</Text>
           ) : null}
         </View>

         {/* Confirm Button */}
        <View style={styles.buttonContainer}>
          <CustomButton
            title={screenData?.button_text || 'Confirm'}
            onPress={handleConfirm}
            style={styles.confirmButton}
            loading={loading}
            disabled={loading || otpExpired}
          />
        </View>

        {/* Resend OTP Button with Timer */}
        {otpData?.expires_in !== undefined && (
          <View style={styles.resendContainer}>
            {timeRemaining > 0 ? (
              <View style={styles.timerContainer}>
                <Text style={styles.timerText}>
                  {screenData?.resend_timer_text || 'Resend OTP in'} {formatTime(timeRemaining)}
                </Text>
              </View>
            ) : (
              <TouchableOpacity
                onPress={handleResendOTP}
                style={styles.resendButton}
                activeOpacity={0.7}
                disabled={false}
              >
                <Text style={styles.resendButtonText}>
                  {screenData?.resend_button_text || 'Resend OTP'}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}
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
  titleSection: {
    paddingHorizontal: 20,
    marginTop: 20,
    alignItems: 'center',
  },
  title: {
    fontFamily: Poppins.bold,
    fontSize: 24,
    fontWeight: '700',
    lineHeight: 24,
    letterSpacing: 0,
    color: '#000000',
    marginBottom: 8,
  },
  otpContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF3E0',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#FF6E1A',
    marginBottom: 8,
    gap: 8,
  },
  otpLabel: {
    fontFamily: Poppins.medium,
    fontSize: 16,
    color: '#000000',
  },
  otpDisplay: {
    fontFamily: Poppins.bold,
    fontSize: 20,
    color: '#FF6E1A',
    letterSpacing: 2,
  },
  otpDebug: {
    fontFamily: Poppins.regular,
    fontSize: 12,
    color: '#999999',
    fontStyle: 'italic',
    marginBottom: 8,
  },
  instruction: {
    fontFamily: Poppins.medium,
    fontSize: 16,
    fontWeight: '500',
    lineHeight: 16,
    letterSpacing: 0,
    color: '#B6B6B6',
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  codeInputWrapper: {
    paddingHorizontal: 20,
    marginTop: 40,
  },
  codeContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 15,
  },
  codeInput: {
    width: 60,
    height: 60,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    backgroundColor: 'transparent',
    textAlign: 'center',
    fontFamily: Poppins.bold,
    fontSize: 24,
    color: '#000000',
  },
  codeInputFilled: {
    backgroundColor: 'transparent',
    borderColor: '#E0E0E0',
  },
  codeInputFocused: {
    borderColor: 'rgba(255, 110, 26, 1)',
  },
  buttonContainer: {
    width: '100%',
    paddingHorizontal: 20,
    marginTop: 20,
  },
  confirmButton: {

    // CustomButton styles will be applied
  },
  errorText: {
    fontFamily: Poppins.regular,
    fontSize: 12,
    color: '#FF0000',
    marginTop: 10,
    marginBottom: 10,
    textAlign: 'center',
  },
  resendContainer: {
    paddingHorizontal: 20,
    marginTop: 20,
    alignItems: 'center',
  },
  timerContainer: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timerText: {
    fontFamily: Poppins.medium,
    fontSize: 16,
    color: '#999999',
  },
  resendButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  resendButtonText: {
    fontFamily: Poppins.medium,
    fontSize: 16,
    color: '#000000',
    textDecorationLine: 'underline',
  },
});

export default VerificationCodeScreen;
