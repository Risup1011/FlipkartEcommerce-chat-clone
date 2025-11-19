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
  const { showToast } = useToast();

  // Fetch screen configuration from backend
  useEffect(() => {
    fetchScreenConfig();
  }, []);

  const fetchScreenConfig = async () => {
    try {
      setLoadingScreenData(true);
      const endpoint = `${API_BASE_URL}v1/onboarding/sections`;
      console.log('📤 [VerificationCodeScreen] ========================================');
      console.log('📤 [VerificationCodeScreen] FETCHING SCREEN CONFIG FROM API');
      console.log('📤 [VerificationCodeScreen] Endpoint:', endpoint);
      console.log('📤 [VerificationCodeScreen] Method: GET');
      console.log('📤 [VerificationCodeScreen] ========================================');
      
      const response = await fetch(endpoint, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      console.log('📥 [VerificationCodeScreen] ========================================');
      console.log('📥 [VerificationCodeScreen] API RESPONSE RECEIVED');
      console.log('📥 [VerificationCodeScreen] Response Status:', response.status);
      console.log('📥 [VerificationCodeScreen] Response OK:', response.ok);
      
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
      
      console.log('📥 [VerificationCodeScreen] Response Data:', JSON.stringify(data, null, 2));
      console.log('📥 [VerificationCodeScreen] ========================================');

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
        console.log('✅ [VerificationCodeScreen] API Call Successful');
        console.log('✅ [VerificationCodeScreen] Total Sections:', data.data?.sections?.length || 0);
        
        // Find VERIFICATION_CODE section or use first section as fallback
        const verificationSection = data.data?.sections?.find(
          section => section.section_id === 'VERIFICATION_CODE'
        ) || data.data?.sections?.[0];

        if (verificationSection) {
          console.log('✅ [VerificationCodeScreen] Section Found:', verificationSection.section_id);
          console.log('✅ [VerificationCodeScreen] Screen Config:', JSON.stringify(verificationSection, null, 2));
          setScreenData(verificationSection);
        } else {
          console.warn('⚠️ [VerificationCodeScreen] VERIFICATION_CODE section not found, using fallback');
          // Use fallback structure if section not found
          setScreenData(null);
        }
      } else {
        console.warn('⚠️ [VerificationCodeScreen] API Call Failed - Using fallback text');
        console.warn('⚠️ [VerificationCodeScreen] Response Status:', response.status);
        console.warn('⚠️ [VerificationCodeScreen] Error Code:', data.code || data.status);
        console.warn('⚠️ [VerificationCodeScreen] Error Message:', data.message || data.error);
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
      console.log('🏁 [VerificationCodeScreen] Screen config fetch completed');
    }
  };

  // Log OTP data for debugging
  React.useEffect(() => {
    console.log('VerificationCodeScreen - OTP Data:', otpData);
    if (otpData?.otp && typeof otpData.otp === 'string' && otpData.otp.length === 4) {
      console.log('OTP Value:', otpData.otp);
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
        
        console.log('⏱️ [VerificationCodeScreen] Backend timer calculation:');
        console.log('⏱️ [VerificationCodeScreen] Sent at:', new Date(sentAt).toISOString());
        console.log('⏱️ [VerificationCodeScreen] Expires in:', otpData.expires_in, 'seconds');
        console.log('⏱️ [VerificationCodeScreen] Elapsed:', Math.floor(elapsed / 1000), 'seconds');
        console.log('⏱️ [VerificationCodeScreen] Remaining:', remaining, 'seconds');
        console.log('⏱️ [VerificationCodeScreen] Backend timer duration:', otpData.expires_in, 'seconds =', Math.floor(otpData.expires_in / 60), 'minutes');
        
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
      console.log('🚀 [VerificationCodeScreen] ========================================');
      console.log('🚀 [VerificationCodeScreen] FRONTEND BYPASS ACTIVATED');
      console.log('🚀 [VerificationCodeScreen] OTP Code:', MOCK_OTP_CODE);
      console.log('🚀 [VerificationCodeScreen] Mock Partner Status:', MOCK_OTP_PARTNER_STATUS);
      console.log('🚀 [VerificationCodeScreen] Source: Frontend Config (NOT API)');
      console.log('🚀 [VerificationCodeScreen] ========================================');
      
      showToast(`OTP verified successfully (Mock - ${MOCK_OTP_PARTNER_STATUS})`, 'success');
      
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
      showToast(errorMsg, 'error');
      return;
    }

    setLoading(true);
    setError('');
    setOtpExpired(false);

    try {
      // Get device information
      const deviceInfo = await getDeviceInfo();
      console.log('📱 [VerificationCodeScreen] Device Info:', JSON.stringify(deviceInfo, null, 2));

      const requestBody = {
        otp_id: otpData.otp_id,
        otp: otpCode,
        device_id: deviceInfo.device_id,
        device_info: deviceInfo.device_info,
      };

      // Determine which endpoint to use
      // If USE_MOCK_OTP_ENDPOINTS is true, use different endpoints based on OTP code
      // Otherwise, use the default endpoint (you can change the response in mockachino)
      let endpoint = `${API_BASE_URL}v1/auth/verify-otp`;
      
      console.log('📤 [VerificationCodeScreen] ========================================');
      console.log('📤 [VerificationCodeScreen] MAKING API CALL TO VERIFY OTP');
      console.log('📤 [VerificationCodeScreen] OTP Code Entered:', otpCode);
      console.log('📤 [VerificationCodeScreen] OTP ID:', otpData.otp_id);
      
      if (USE_MOCK_OTP_ENDPOINTS && MOCK_OTP_ENDPOINTS[otpCode]) {
        endpoint = MOCK_OTP_ENDPOINTS[otpCode];
        console.log('🔀 [VerificationCodeScreen] Using Custom Endpoint Mapping');
        console.log(`🔀 [VerificationCodeScreen] OTP Code ${otpCode} → ${endpoint}`);
      } else {
        console.log('📡 [VerificationCodeScreen] Using Default Endpoint');
        console.log(`📡 [VerificationCodeScreen] Endpoint: ${endpoint}`);
      }
      
      console.log('📤 [VerificationCodeScreen] Request Body:', JSON.stringify(requestBody, null, 2));
      console.log('📤 [VerificationCodeScreen] ========================================');

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();
      
      console.log('📥 [VerificationCodeScreen] ========================================');
      console.log('📥 [VerificationCodeScreen] API RESPONSE RECEIVED');
      console.log('📥 [VerificationCodeScreen] Response Status:', response.status);
      console.log('📥 [VerificationCodeScreen] Response Data:', JSON.stringify(data, null, 2));

      if (response.ok && data.code === 200 && data.status === 'success') {
        // Success - handle different partner_status values
        const partnerStatus = data.data?.partner_status;
        const onboardingId = data.data?.onboarding_id; // Extract onboarding ID if available
        const partnerId = data.data?.partner_id; // Extract partner_id from API response
        const accessToken = data.data?.access_token; // Extract access_token
        const refreshToken = data.data?.refresh_token; // Extract refresh_token
        const tokenType = data.data?.token_type || 'Bearer'; // Extract token_type
        const expiresIn = data.data?.expires_in; // Extract expires_in
        
        console.log('✅ [VerificationCodeScreen] API CALL SUCCESSFUL');
        console.log('✅ [VerificationCodeScreen] Partner Status from API:', partnerStatus);
        console.log('✅ [VerificationCodeScreen] Partner ID from API:', partnerId);
        console.log('✅ [VerificationCodeScreen] Onboarding ID from API:', onboardingId);
        console.log('✅ [VerificationCodeScreen] Access Token received:', accessToken ? 'Yes' : 'No');
        console.log('✅ [VerificationCodeScreen] Refresh Token received:', refreshToken ? 'Yes' : 'No');
        console.log('✅ [VerificationCodeScreen] Token Type:', tokenType);
        console.log('✅ [VerificationCodeScreen] Token Expires In:', expiresIn, 'seconds');
        console.log('✅ [VerificationCodeScreen] Source: API Response (NOT Frontend Bypass)');
        console.log('📥 [VerificationCodeScreen] ========================================');
        
        // Store tokens in AsyncStorage
        if (accessToken && refreshToken) {
          const tokensStored = await storeTokens(accessToken, refreshToken);
          if (tokensStored) {
            console.log('💾 [VerificationCodeScreen] Both tokens stored successfully');
          } else {
            console.warn('⚠️ [VerificationCodeScreen] Failed to store one or both tokens');
          }
        } else {
          console.warn('⚠️ [VerificationCodeScreen] Missing tokens in API response');
        }
        
        // Show success message (use backend message)
        const successMessage = screenData?.messages?.success?.otp_verified || 'OTP verified successfully';
        showToast(successMessage, 'success');
        
        // Pass partner_status, partner_id, onboarding_id, access_token, and refresh_token to onConfirm callback
        if (onConfirm) {
          onConfirm(otpCode, partnerStatus, onboardingId, partnerId, accessToken, refreshToken);
        }
      } else {
        // Handle error cases
        console.log('❌ [VerificationCodeScreen] API CALL FAILED');
        console.log('❌ [VerificationCodeScreen] Response Status:', response.status);
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
        console.log('❌ [VerificationCodeScreen] Error Code:', errorCode);
        console.log('❌ [VerificationCodeScreen] Error Message:', errorMessage);
        console.log('📥 [VerificationCodeScreen] ========================================');

        if (response.status === 400 && errorCode === 'INVALID_OTP') {
          // Case 1: Invalid OTP
          const invalidOtpMsg = screenData?.messages?.error?.invalid_otp || 'Invalid OTP. Please try again.';
          setError(invalidOtpMsg);
          showToast(invalidOtpMsg, 'error');
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
          showToast(expiredToast, 'error');
        } else if (response.status === 429 && errorCode === 'OTP_ATTEMPTS_EXCEEDED') {
          // Case 3: Maximum attempts exceeded
          setError(errorMessage);
          showToast(errorMessage, 'error');
          // Disable the confirm button temporarily
          setCodes(['', '', '', '']);
        } else {
          // Other errors
          setError(errorMessage);
          showToast(errorMessage, 'error');
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
      showToast(errorMessage, 'error');
    } finally {
      setLoading(false);
      console.log('🏁 [VerificationCodeScreen] API call completed, loading set to false');
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
        showToast(resendSuccessMsg, 'success');
        // Focus on first input
        inputRefs.current[0]?.focus();
        // Timer will be reset by the useEffect when new otpData is received
      } catch (err) {
        const resendErrorMsg = screenData?.messages?.error?.otp_resend_failed || 'Failed to resend OTP. Please try again.';
        showToast(resendErrorMsg, 'error');
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
