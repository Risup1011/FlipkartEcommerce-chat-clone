import React, { useState, useEffect } from 'react'
import { StatusBar, AppState, Alert } from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { Provider } from 'react-redux'
import { store } from './src/store'
import { clearMenuData, clearMenuDataFromStorage } from './src/store/menuSlice'
import { SplashScreen, OTPVerificationScreen, VerificationCodeScreen, RestaurantDetailsScreen, DynamicFormScreen, FSSAIDetailsScreen, OwnerAndLocationDetailsScreen, GSTINPANDetailsScreen, BankDetailsScreen, MoUESignDetailsScreen, PackagingDetailsScreen, OrdersScreen, ApplicationUnderReviewScreen, ToastProvider, SuccessBottomSheet, OutletTimingsScreen, HelpCenterScreen, PrepTimeScreen, AccountSettingsScreen, ComplianceScreen } from './src/components'
import { CountryPicker } from 'react-native-country-codes-picker'
import { API_BASE_URL } from './src/config'
import { getAccessToken, isAuthenticated, clearTokens } from './src/utils/tokenStorage'
import { fetchWithAuth } from './src/utils/apiHelpers'
import { initializeNotifications } from './src/utils/notificationService'

const OTP_STORAGE_KEY = '@Kamai24:otpData'
const PHONE_STORAGE_KEY = '@Kamai24:phoneNumber'

export default function App() {
  const [isSplashVisible, setIsSplashVisible] = useState(true)
  const [currentScreen, setCurrentScreen] = useState('otp') // 'otp', 'verification', 'restaurant', 'businessProof', 'ownerIdProof', 'addressProof', 'bankProof', 'fssai', 'ownerLocation', 'gstinPan', 'bank', 'mouESign', 'packaging', 'orders', 'underReview', 'outletTimings', 'prepTime', 'accountSettings', 'pastOrders', 'partnerFaqs', 'compliance', 'helpCenter'
  const [phoneNumber, setPhoneNumber] = useState('')
  const [otpData, setOtpData] = useState(null) // Store OTP response data (otp_id, expires_in)
  const [partnerStatus, setPartnerStatus] = useState(null) // Store partner_status: 'NOT_STARTED', 'UNDER_REVIEW', 'APPROVED'
  const [partnerId, setPartnerId] = useState(null) // Store partner_id from verify-otp response
  const [showPicker, setShowPicker] = useState(false)
  const [showSuccessBottomSheet, setShowSuccessBottomSheet] = useState(false)
  const [onboardingId, setOnboardingId] = useState('8925461') // Default onboarding ID
  const [countryCode, setCountryCode] = useState('+91')
  const [countryFlag, setCountryFlag] = useState('🇮🇳')
  const [configData, setConfigData] = useState(null) // Store config data for passing to screens
  const [ordersInitialTab, setOrdersInitialTab] = useState(null) // Store initial tab for OrdersScreen
  const [ordersInitialBottomTab, setOrdersInitialBottomTab] = useState(null) // Store initial bottom tab for OrdersScreen

  useEffect(() => {
    // Check session and onboarding status on app start
    checkSessionAndNavigate()
    
    // Hide splash screen after 3 seconds
    const timer = setTimeout(() => {
      setIsSplashVisible(false)
    }, 3000)

    // Initialize push notifications
    console.log('🔔 [App] Initializing push notifications...');
    const unsubscribeNotifications = initializeNotifications((remoteMessage) => {
      console.log('🔔 [App] Notification received:', remoteMessage);
      const notificationType = remoteMessage?.data?.notification_type || remoteMessage?.data?.type;
      if (notificationType === 'order' || notificationType === 'NEW_ORDER') {
        console.log('🔔 [App] New order notification - navigating to Orders screen');
        if (AppState.currentState === 'active') {
          Alert.alert(
            remoteMessage?.notification?.title || 'New Order',
            remoteMessage?.notification?.body || 'You have received a new order!',
            [
              { text: 'View', onPress: () => { setCurrentScreen('orders'); setOrdersInitialTab('new'); setOrdersInitialBottomTab('orders'); } },
              { text: 'Dismiss', style: 'cancel' }
            ]
          );
        } else {
          setCurrentScreen('orders'); setOrdersInitialTab('new'); setOrdersInitialBottomTab('orders');
        }
      }
    });

    // Listen for app state changes to clear Redux data when app closes
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'background' || nextAppState === 'inactive') {
        // App is going to background - clear Redux menu data (in-memory only)
        // Keep AsyncStorage cache so data can be restored on app reopen
        console.log('📱 [App] App going to background - clearing Redux menu data (keeping cache)');
        store.dispatch(clearMenuData());
        // Don't clear AsyncStorage - keep cache for app restart
        // clearMenuDataFromStorage();
      }
    });

    return () => {
      clearTimeout(timer);
      subscription?.remove();
      unsubscribeNotifications?.();
    }
  }, [])

  /**
   * Check session and onboarding status on app launch
   * Follows the flow: Check Local Session → Check Onboarding → Navigate
   */
  const checkSessionAndNavigate = async () => {
    try {
      console.log('🔍 [App] ========================================');
      console.log('🔍 [App] CHECKING SESSION ON APP LAUNCH');
      console.log('🔍 [App] ========================================');
      
      // Step 1: Check if user has a valid access token (Local Session)
      const hasValidSession = await isAuthenticated();
      
      if (hasValidSession) {
        console.log('✅ [App] Valid session found (access token exists)');
        
        // Step 2: Check onboarding status via partner status API
        const statusData = await checkPartnerStatus();
        
        if (statusData) {
          const { partner_status, partner_id, pending_sections } = statusData;
          
          console.log('📊 [App] Partner Status:', partner_status);
          console.log('📊 [App] Partner ID:', partner_id);
          console.log('📊 [App] Pending Sections:', pending_sections);
          
          // Store partner info
          if (partner_id) {
            setPartnerId(partner_id);
          }
          setPartnerStatus(partner_status);
          
          // Step 3: Navigate based on onboarding status
          if (partner_status === 'APPROVED') {
            // Case C: Onboarding Complete → Home Page (Orders)
            console.log('✅ [App] Onboarding complete - navigating to Orders (Home)');
            setCurrentScreen('orders');
          } else if (partner_status === 'UNDER_REVIEW') {
            // Case B: Form Submitted, KYC Under Review
            console.log('⏳ [App] Application under review - navigating to Under Review screen');
            setCurrentScreen('underReview');
          } else if (partner_status === 'NOT_STARTED' || pending_sections?.length > 0) {
            // Case A: Onboarding Not Complete → Resume Form
            // Find the first pending section or start from Restaurant Details
            if (pending_sections && pending_sections.length > 0) {
              const firstPendingSection = pending_sections[0];
              console.log('📝 [App] Onboarding incomplete - resuming from section:', firstPendingSection);
              // Map section_id to screen
              navigateToSection(firstPendingSection);
            } else {
              console.log('📝 [App] Onboarding not started - navigating to Restaurant Details');
              setCurrentScreen('restaurant');
            }
          } else {
            // Default: Start onboarding
            console.log('📝 [App] Starting onboarding - navigating to Restaurant Details');
            setCurrentScreen('restaurant');
          }
        } else {
          // Failed to get status - token might be invalid, go to login
          console.log('⚠️ [App] Failed to get partner status - token may be invalid');
          console.log('⚠️ [App] Navigating to OTP screen');
          setCurrentScreen('otp');
        }
      } else {
        // No valid session - check for OTP session (for OTP timer restoration)
        console.log('❌ [App] No valid session found');
        await checkPersistedOTPSession();
      }
      
      console.log('🔍 [App] ========================================');
    } catch (error) {
      console.error('❌ [App] Error checking session:', error);
      // On error, navigate to OTP screen
      setCurrentScreen('otp');
    }
  }

  /**
   * Check partner status via API
   * GET /v1/partners/status
   */
  const checkPartnerStatus = async () => {
    try {
      const endpoint = `${API_BASE_URL}v1/partners/status`;
      console.log('📡 [App] Calling partner status API:', endpoint);
      
      const response = await fetchWithAuth(endpoint, {
        method: 'GET',
      }, true);
      
      const data = await response.json();
      console.log('📥 [App] Partner Status API Response:', JSON.stringify(data, null, 2));
      
      // Handle 401 - token invalid/expired and refresh failed
      if (response.status === 401) {
        console.warn('⚠️ [App] Token invalid/expired - clearing tokens and navigating to login');
        await clearTokens();
        return null;
      }
      
      if (response.ok && data.code === 200 && data.status === 'success') {
        return data.data; // Return { partner_id, partner_status, phone, profile_completion, pending_sections }
      } else {
        console.error('❌ [App] Partner status API failed:', data.message);
        return null;
      }
    } catch (error) {
      console.error('❌ [App] Error calling partner status API:', error);
      return null;
    }
  }

  /**
   * Navigate to the appropriate section screen based on section_id
   */
  const navigateToSection = (sectionId) => {
    const sectionMap = {
      'RESTAURANT_DETAILS': 'restaurant',
      'BUSINESS_PROOF': 'businessProof',
      'OWNER_ID_PROOF': 'ownerIdProof',
      'ADDRESS_PROOF': 'addressProof',
      'BANK_PROOF': 'bankProof',
    };
    
    const screen = sectionMap[sectionId];
    if (screen) {
      setCurrentScreen(screen);
    } else {
      // Default to restaurant if section not found
      setCurrentScreen('restaurant');
    }
  }

  /**
   * Check for persisted OTP session (for OTP timer restoration)
   * This is a fallback when there's no valid access token
   */
  const checkPersistedOTPSession = async () => {
    try {
      const storedOtpData = await AsyncStorage.getItem(OTP_STORAGE_KEY)
      const storedPhoneNumber = await AsyncStorage.getItem(PHONE_STORAGE_KEY)
      
      if (storedOtpData && storedPhoneNumber) {
        const otpData = JSON.parse(storedOtpData)
        
        // Check if timer is still running
        if (otpData?.expires_in && otpData?.sentAt) {
          const now = Date.now()
          const sentAt = otpData.sentAt
          const expiresInMs = otpData.expires_in * 1000
          const elapsed = now - sentAt
          const remaining = Math.max(0, Math.floor((expiresInMs - elapsed) / 1000))
          
          console.log('🔄 [App] Restoring OTP session from storage')
          console.log('🔄 [App] Remaining time:', remaining, 'seconds')
          
          if (remaining > 0) {
            // Timer is still running - navigate to OTPVerificationScreen
            console.log('✅ [App] Timer still active - navigating to OTPVerificationScreen')
            await AsyncStorage.removeItem(OTP_STORAGE_KEY)
            await AsyncStorage.removeItem(PHONE_STORAGE_KEY)
            setOtpData(null)
            setCurrentScreen('verification')
          } else {
            // Timer expired - navigate to OTP screen to request new OTP
            console.log('⏱️ [App] Timer expired - navigating to OTP screen')
            await AsyncStorage.removeItem(OTP_STORAGE_KEY)
            await AsyncStorage.removeItem(PHONE_STORAGE_KEY)
            setOtpData(null)
            setCurrentScreen('otp')
          }
        } else {
          // Invalid OTP data - clear storage
          console.log('⚠️ [App] Invalid OTP data - clearing storage')
          await AsyncStorage.removeItem(OTP_STORAGE_KEY)
          await AsyncStorage.removeItem(PHONE_STORAGE_KEY)
          setCurrentScreen('otp')
        }
      } else {
        // No OTP session - go to OTP screen
        setCurrentScreen('otp')
      }
    } catch (error) {
      console.error('❌ [App] Error checking persisted OTP session:', error)
      setCurrentScreen('otp')
    }
  }

  const handleOpenPicker = () => {
    console.log('Opening country picker, setting showPicker to true')
    setShowPicker(true)
    console.log('showPicker state should now be true')
  }

  const handleCountrySelect = (item) => {
    console.log('Country selected:', item)
    setCountryCode(item.dial_code)
    setCountryFlag(item.flag)
    setShowPicker(false)
  }

  const handleNavigateToVerification = async (fullPhoneNumber, otpResponseData = null) => {
    setPhoneNumber(fullPhoneNumber)
    setOtpData(otpResponseData) // Store OTP data (otp_id, expires_in, sentAt)
    setCurrentScreen('verification')
    
    // Persist OTP data to AsyncStorage
    if (otpResponseData) {
      try {
        await AsyncStorage.setItem(OTP_STORAGE_KEY, JSON.stringify(otpResponseData))
        await AsyncStorage.setItem(PHONE_STORAGE_KEY, fullPhoneNumber)
        console.log('💾 [App] OTP data persisted to storage')
      } catch (error) {
        console.error('❌ [App] Error persisting OTP data:', error)
      }
    }
  }

  const handleBackToOTP = async () => {
    // Clear persisted OTP data when going back to OTP screen
    try {
      await AsyncStorage.removeItem(OTP_STORAGE_KEY)
      await AsyncStorage.removeItem(PHONE_STORAGE_KEY)
      setOtpData(null)
      console.log('🗑️ [App] OTP data cleared from storage when navigating back')
    } catch (error) {
      console.error('❌ [App] Error clearing OTP data:', error)
    }
    setCurrentScreen('otp')
  }

  const handleBackToVerification = () => {
    setCurrentScreen('verification')
  }

  const handleBackToRestaurant = () => {
    setCurrentScreen('restaurant')
  }

  const handleConfirmCode = async (code, status, onboardingIdFromAPI = null, partnerIdFromAPI = null, accessToken = null, refreshToken = null) => {
    console.log('Verification code entered:', code)
    console.log('Phone number:', phoneNumber)
    console.log('Partner status:', status)
    console.log('Partner ID:', partnerIdFromAPI)
    console.log('Onboarding ID:', onboardingIdFromAPI)
    console.log('Access Token received:', accessToken ? 'Yes (stored in AsyncStorage)' : 'No')
    console.log('Refresh Token received:', refreshToken ? 'Yes (stored in AsyncStorage)' : 'No')
    
    // Clear persisted OTP data since verification is complete
    try {
      await AsyncStorage.removeItem(OTP_STORAGE_KEY)
      await AsyncStorage.removeItem(PHONE_STORAGE_KEY)
      console.log('🗑️ [App] OTP data cleared from storage after successful verification')
    } catch (error) {
      console.error('❌ [App] Error clearing OTP data:', error)
    }
    
    // Store partner status and partner_id
    setPartnerStatus(status)
    if (partnerIdFromAPI) {
      setPartnerId(partnerIdFromAPI)
    }
    
    // Update onboarding ID if provided from API
    if (onboardingIdFromAPI) {
      setOnboardingId(onboardingIdFromAPI)
    }
    
    // Handle different partner_status values
    if (status === 'NOT_STARTED') {
      // Case A: New Partner (No Onboarding Started) - Start the onboarding flow
      // Navigate to Restaurant Details screen (first form)
      setCurrentScreen('restaurant')
    } else if (status === 'UNDER_REVIEW') {
      // Case B: Form Submitted, KYC Under Review
      // Navigate to Application Under Review screen
      setCurrentScreen('underReview')
    } else if (status === 'APPROVED') {
      // Case C: KYC Approved - All forms approved
      // Navigate directly to Orders screen
      setCurrentScreen('orders')
    } else {
      // Default: Navigate to Restaurant Details screen (treat as new user)
    setCurrentScreen('restaurant')
  }
  }

  const handleDismissSuccessBottomSheet = () => {
    setShowSuccessBottomSheet(false)
    // Stay on the same screen (VerificationCodeScreen) after dismissing
    // User can navigate to Orders screen manually if needed
  }

  const handleShowSuccessBottomSheet = () => {
    // For testing: Navigate to Application Under Review screen
    setPartnerStatus('UNDER_REVIEW')
    setCurrentScreen('underReview')
  }

  const handleDismissUnderReview = () => {
    // Navigate back to OTP screen or stay on current screen
    // You can customize this behavior
    setCurrentScreen('otp')
  }

  const handleResendOTP = async () => {
    if (!phoneNumber) {
      return
    }

    try {
      const requestBody = {
        phone: phoneNumber,
        channel: 'whatsapp',
      }

      const response = await fetch(`${API_BASE_URL}v1/auth/send-otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      })

      const data = await response.json()
      
      // Log full response for debugging
      console.log('Resend OTP API Response:', JSON.stringify(data, null, 2));

      if (response.ok && data.code === 200 && data.status === 'success') {
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
        
        // Update OTP data with new response (include timestamp)
        const newOtpData = {
          otp_id: data.data?.otp_id,
          expires_in: data.data?.expires_in,
          otp: otpValue, // Include OTP if available in response (for testing)
          sentAt: Date.now(), // Store timestamp when OTP was sent
        }
        setOtpData(newOtpData)
        
        // Persist updated OTP data to AsyncStorage
        try {
          await AsyncStorage.setItem(OTP_STORAGE_KEY, JSON.stringify(newOtpData))
          await AsyncStorage.setItem(PHONE_STORAGE_KEY, phoneNumber)
          console.log('💾 [App] Resent OTP data persisted to storage')
        } catch (error) {
          console.error('❌ [App] Error persisting resent OTP data:', error)
        }
        
        if (otpValue) {
          console.log('Resend OTP - OTP found:', otpValue);
        } else {
          console.log('Resend OTP - OTP not found in response');
        }
        // Note: Toast will be shown by the component that calls this
      } else {
        console.error('Failed to resend OTP:', data.message)
      }
    } catch (err) {
      console.error('Error resending OTP:', err)
    }
  }

  // Commented off - now using DynamicFormScreen for BUSINESS_PROOF
  // const handleProceedToFSSAI = () => {
  //   // Navigate to FSSAI Details screen
  //   setCurrentScreen('fssai')
  // }

  const handleProceedToBusinessProof = (formData) => {
    console.log('📤 [App] Restaurant Details submitted, navigating to Business Proof');
    console.log('📤 [App] Form Data:', JSON.stringify(formData, null, 2));
    // Navigate to Business Proof screen (DynamicFormScreen with BUSINESS_PROOF section)
    setCurrentScreen('businessProof')
  }

  const handleProceedFromBusinessProof = (formData) => {
    console.log('📤 [App] Business Proof submitted');
    console.log('📤 [App] Form Data:', JSON.stringify(formData, null, 2));
    // Navigate to Owner ID Proof screen (DynamicFormScreen with OWNER_ID_PROOF section)
    setCurrentScreen('ownerIdProof')
  }

  const handleProceedFromOwnerIdProof = (formData) => {
    console.log('📤 [App] Owner ID Proof submitted');
    console.log('📤 [App] Form Data:', JSON.stringify(formData, null, 2));
    // Navigate to Address Proof screen (DynamicFormScreen with ADDRESS_PROOF section)
    setCurrentScreen('addressProof')
  }

  const handleProceedFromAddressProof = (formData) => {
    console.log('📤 [App] ========================================');
    console.log('📤 [App] Address Proof submitted');
    console.log('📤 [App] Form Data:', JSON.stringify(formData, null, 2));
    console.log('📤 [App] Navigating to BANK_PROOF screen');
    console.log('📤 [App] Setting currentScreen to: bankProof');
    console.log('📤 [App] ========================================');
    // Navigate to Bank Proof screen (DynamicFormScreen with BANK_PROOF section)
    setCurrentScreen('bankProof')
  }

  const handleProceedFromBankProof = async (formData) => {
    console.log('📤 [App] ========================================');
    console.log('📤 [App] Bank Proof submitted');
    console.log('📤 [App] Form Data:', JSON.stringify(formData, null, 2));
    console.log('📤 [App] Checking partner status after form submission...');
    console.log('📤 [App] ========================================');
    
    // Check partner status after completing all forms
    const statusData = await checkPartnerStatus();
    
    if (statusData) {
      const { partner_status, partner_id, pending_sections } = statusData;
      
      console.log('📊 [App] Partner Status after form submission:', partner_status);
      console.log('📊 [App] Partner ID:', partner_id);
      console.log('📊 [App] Pending Sections:', pending_sections);
      
      // Update partner info
      if (partner_id) {
        setPartnerId(partner_id);
      }
      setPartnerStatus(partner_status);
      
      // Navigate based on onboarding status
      if (partner_status === 'APPROVED') {
        // Case: KYC Approved - All forms approved
        console.log('✅ [App] Onboarding complete - navigating to Orders (Home)');
        setCurrentScreen('orders');
      } else if (partner_status === 'UNDER_REVIEW') {
        // Case: Form Submitted, KYC Under Review
        console.log('⏳ [App] Application under review - navigating to Under Review screen');
        setCurrentScreen('underReview');
      } else if (partner_status === 'NOT_STARTED' || pending_sections?.length > 0) {
        // Case: Still have pending sections (shouldn't happen after all forms, but handle it)
        console.log('📝 [App] Still have pending sections - navigating to first pending section');
        if (pending_sections && pending_sections.length > 0) {
          navigateToSection(pending_sections[0]);
        } else {
          setCurrentScreen('orders');
        }
      } else {
        // Default: Navigate to Orders (fallback)
        console.log('📝 [App] Default navigation - navigating to Orders');
        setCurrentScreen('orders');
      }
    } else {
      // Failed to get status - navigate to orders as fallback
      console.log('⚠️ [App] Failed to get partner status - navigating to Orders as fallback');
      setCurrentScreen('orders');
    }
  }

  const handleBackToBusinessProof = () => {
    setCurrentScreen('businessProof')
  }

  const handleBackToOwnerIdProof = () => {
    setCurrentScreen('ownerIdProof')
  }

  const handleBackToAddressProof = () => {
    setCurrentScreen('addressProof')
  }

  const handleProceedToOwnerLocation = () => {
    // Navigate to Owner and Location Details screen
    setCurrentScreen('ownerLocation')
  }

  const handleBackToFSSAI = () => {
    setCurrentScreen('fssai')
  }

  const handleProceedToGSTINPAN = () => {
    // Navigate to GSTIN & PAN Details screen
    setCurrentScreen('gstinPan')
  }

  const handleBackToOwnerLocation = () => {
    setCurrentScreen('ownerLocation')
  }

  const handleProceedToBank = () => {
    console.log('handleProceedToBank called, navigating to bank screen');
    // Navigate to Bank Details screen
    setCurrentScreen('bank')
  }

  const handleBackToGSTINPAN = () => {
    setCurrentScreen('gstinPan')
  }

  const handleProceedToMoUESign = () => {
    // Navigate to MoU/E-Sign Details screen
    setCurrentScreen('mouESign')
  }

  const handleBackToBank = () => {
    setCurrentScreen('bank')
  }

  const handleProceedToPackaging = () => {
    // Navigate to Packaging Details screen
    setCurrentScreen('packaging')
  }

  const handleBackToMoUESign = () => {
    setCurrentScreen('mouESign')
  }

  const handleProceedToOrders = () => {
    // Navigate to Orders screen
    setCurrentScreen('orders')
  }

  const handleBackToPackaging = () => {
    setCurrentScreen('packaging')
  }

  /**
   * Handle navigation from MoreScreen and bottom tab navigation
   */
  const handleNavigateFromMore = (screen) => {
    console.log('📡 [App] ========================================');
    console.log('📡 [App] NAVIGATING');
    console.log('📡 [App] ========================================');
    console.log('📡 [App] Target Screen:', screen);
    
    // Handle bottom tab navigation (orders, menu, finance, more)
    const bottomTabs = ['orders', 'menu', 'finance', 'more'];
    if (bottomTabs.includes(screen)) {
      // Navigate to OrdersScreen with the specified bottom tab active
      console.log('📍 [App] Navigating to OrdersScreen with bottom tab:', screen);
      setOrdersInitialBottomTab(screen);
      setCurrentScreen('orders');
      console.log('✅ [App] Navigation set - Screen: orders, Initial Bottom Tab:', screen);
      // Reset initialBottomTab after navigation
      setTimeout(() => {
        console.log('🔄 [App] Resetting ordersInitialBottomTab');
        setOrdersInitialBottomTab(null);
      }, 1000);
    } else if (screen === 'pastOrders') {
      // Navigate to OrdersScreen with Past Orders tab active
      console.log('📍 [App] Navigating to OrdersScreen with Past Orders tab');
      setOrdersInitialTab('pastOrders');
      setCurrentScreen('orders');
      console.log('✅ [App] Navigation set - Screen: orders, Initial Tab: pastOrders');
      // Reset initialTab after navigation so it doesn't persist on next visit
      setTimeout(() => {
        console.log('🔄 [App] Resetting ordersInitialTab');
        setOrdersInitialTab(null);
      }, 1000); // Increased timeout to ensure tab is set
    } else {
      // Navigate to other screens
      console.log('📍 [App] Navigating to screen:', screen);
      setCurrentScreen(screen);
    }
    console.log('📡 [App] ========================================');
  };

  /**
   * Fetch config data for passing to screens
   */
  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const url = `${API_BASE_URL}v1/config`;
        const response = await fetchWithAuth(url, {
          method: 'GET',
        }, true);

        const data = await response.json();
        if (response.ok && data.code === 200 && data.status === 'success') {
          setConfigData(data.data);
        }
      } catch (error) {
        console.error('❌ [App] Error fetching config:', error);
      }
    };

    if (partnerStatus === 'APPROVED') {
      fetchConfig();
    }
  }, [partnerStatus]);

  /**
   * Handle logout - clear all data and navigate to OTP screen
   */
  const handleLogout = async () => {
    try {
      console.log('📡 [App] ========================================');
      console.log('📡 [App] LOGOUT INITIATED');
      console.log('📡 [App] ========================================');
      
      // Clear all tokens
      console.log('🗑️  [App] Clearing tokens...');
      await clearTokens();
      console.log('✅ [App] Tokens cleared');
      
      // Clear OTP data
      console.log('🗑️  [App] Clearing OTP data...');
      try {
        await AsyncStorage.removeItem(OTP_STORAGE_KEY);
        await AsyncStorage.removeItem(PHONE_STORAGE_KEY);
        console.log('✅ [App] OTP data cleared');
      } catch (error) {
        console.error('❌ [App] Error clearing OTP data:', error);
      }
      
      // Clear all AsyncStorage data (comprehensive cleanup)
      console.log('🗑️  [App] Performing comprehensive AsyncStorage cleanup...');
      try {
        const allKeys = await AsyncStorage.getAllKeys();
        const kamai24Keys = allKeys.filter(key => key.startsWith('@Kamai24:'));
        if (kamai24Keys.length > 0) {
          await AsyncStorage.multiRemove(kamai24Keys);
          console.log('✅ [App] All Kamai24 data cleared:', kamai24Keys);
        }
      } catch (error) {
        console.error('❌ [App] Error clearing AsyncStorage:', error);
      }
      
      // Reset app state
      console.log('🔄 [App] Resetting app state...');
      setPhoneNumber('');
      setOtpData(null);
      setPartnerStatus(null);
      setPartnerId(null);
      setOnboardingId('8925461');
      setCountryCode('+91');
      setCountryFlag('🇮🇳');
      
      // Navigate to OTP screen
      console.log('📍 [App] Navigating to OTP screen...');
      setCurrentScreen('otp');
      
      console.log('✅ [App] Logout completed successfully');
      console.log('📡 [App] ========================================');
    } catch (error) {
      console.error('❌ [App] Error during logout:', error);
      // Even if there's an error, navigate to OTP screen
      setCurrentScreen('otp');
    }
  }

  return (
    <Provider store={store}>
      <ToastProvider>
        <StatusBar
          barStyle="dark-content"
          backgroundColor="#FFFFFF"
          translucent={false}
        />
      {isSplashVisible ? (
        <SplashScreen />
      ) : currentScreen === 'verification' ? (
        <VerificationCodeScreen
          phoneNumber={phoneNumber}
            otpData={otpData}
          onBack={handleBackToOTP}
          onConfirm={handleConfirmCode}
            onResendOTP={handleResendOTP}
          />
      ) : currentScreen === 'underReview' ? (
        <ApplicationUnderReviewScreen
            onboardingId={onboardingId}
          />
      ) : currentScreen === 'restaurant' ? (
        <RestaurantDetailsScreen
          partnerId={partnerId}
          onBack={handleBackToVerification}
          onProceed={handleProceedToBusinessProof}
        />
      ) : currentScreen === 'businessProof' ? (
        <DynamicFormScreen
          sectionId="BUSINESS_PROOF"
          partnerId={partnerId}
          onBack={handleBackToRestaurant}
          onProceed={handleProceedFromBusinessProof}
        />
      ) : currentScreen === 'ownerIdProof' ? (
        <DynamicFormScreen
          sectionId="OWNER_ID_PROOF"
          partnerId={partnerId}
          onBack={handleBackToBusinessProof}
          onProceed={handleProceedFromOwnerIdProof}
        />
      ) : currentScreen === 'addressProof' ? (
        <DynamicFormScreen
          sectionId="ADDRESS_PROOF"
          partnerId={partnerId}
          onBack={handleBackToOwnerIdProof}
          onProceed={handleProceedFromAddressProof}
        />
      ) : currentScreen === 'bankProof' ? (
        <DynamicFormScreen
          sectionId="BANK_PROOF"
          partnerId={partnerId}
          onBack={handleBackToAddressProof}
          onProceed={handleProceedFromBankProof}
        />
      ) : currentScreen === 'orders' ? (
        <OrdersScreen
          partnerStatus={partnerStatus}
          onLogout={handleLogout}
          initialTab={ordersInitialTab}
          initialBottomTab={ordersInitialBottomTab}
          onNavigate={handleNavigateFromMore}
        />
      ) : currentScreen === 'outletTimings' ? (
        <OutletTimingsScreen
          onNavigate={handleNavigateFromMore}
          onBack={() => setCurrentScreen('orders')}
          configData={configData}
        />
      ) : currentScreen === 'prepTime' ? (
        <PrepTimeScreen
          onBack={() => setCurrentScreen('orders')}
          onNavigate={handleNavigateFromMore}
          configData={configData}
        />
      ) : currentScreen === 'accountSettings' ? (
        <AccountSettingsScreen
          onBack={() => setCurrentScreen('orders')}
          onNavigate={handleNavigateFromMore}
          configData={configData}
        />
      ) : currentScreen === 'partnerFaqs' ? (
        <HelpCenterScreen
          onBack={() => setCurrentScreen('orders')}
          onNavigate={handleNavigateFromMore}
          configData={configData}
          screenTitle="Partner FAQs"
          route="/partner-faqs"
        />
      ) : currentScreen === 'compliance' ? (
        <ComplianceScreen
          onBack={() => setCurrentScreen('orders')}
          onNavigate={handleNavigateFromMore}
          configData={configData}
        />
      ) : currentScreen === 'helpCenter' ? (
        <HelpCenterScreen
          onBack={() => setCurrentScreen('orders')}
          onNavigate={handleNavigateFromMore}
          configData={configData}
          screenTitle="Help Center"
          route="/help-center"
        />
      ) : (
        // FSSAI and other old screens commented off - no navigation to these screens
        // ) : currentScreen === 'fssai' ? (
        //   <FSSAIDetailsScreen
        //     onBack={handleBackToRestaurant}
        //     onProceed={handleProceedToOwnerLocation}
        //   />
        // ) : currentScreen === 'ownerLocation' ? (
        //   <OwnerAndLocationDetailsScreen
        //     onBack={handleBackToFSSAI}
        //     onProceed={handleProceedToGSTINPAN}
        //   />
        // ) : currentScreen === 'gstinPan' ? (
        //   <GSTINPANDetailsScreen
        //     onBack={handleBackToOwnerLocation}
        //     onProceed={handleProceedToBank}
        //   />
        // ) : currentScreen === 'bank' ? (
        //   <BankDetailsScreen
        //     onBack={handleBackToGSTINPAN}
        //     onProceed={handleProceedToMoUESign}
        //   />
        // ) : currentScreen === 'mouESign' ? (
        //   <MoUESignDetailsScreen
        //     onBack={handleBackToBank}
        //     onProceed={handleProceedToPackaging}
        //   />
        // ) : currentScreen === 'packaging' ? (
        //   <PackagingDetailsScreen
        //     onBack={handleBackToMoUESign}
        //     onProceed={handleProceedToOrders}
        //   />
        // ) : (
        <>
          <OTPVerificationScreen
            onOpenPicker={handleOpenPicker}
            countryCode={countryCode}
            countryFlag={countryFlag}
            onCountrySelect={handleCountrySelect}
            onNavigateToVerification={handleNavigateToVerification}
            onSkip={handleProceedToOrders}
          />
          <CountryPicker
            key={showPicker ? 'picker-open' : 'picker-closed'}
            show={showPicker}
            pickerButtonOnPress={(item) => {
              console.log('Country selected in picker:', item)
              handleCountrySelect(item)
            }}
            onBackdropPress={() => {
              console.log('Backdrop pressed, closing picker')
              setShowPicker(false)
            }}
            onRequestClose={() => {
              console.log('Request close, closing picker')
              setShowPicker(false)
            }}
            inputPlaceholder="Search country"
            enableModalAvoiding={false}
            androidWindowSoftInputMode="adjustResize"
            disableBackdrop={false}
            style={{
              modal: {
                height: '70%',
                backgroundColor: '#FFFFFF',
                borderTopLeftRadius: 20,
                borderTopRightRadius: 20,
              },
              textInput: {
                height: 50,
                borderRadius: 8,
              },
            }}
          />
        </>
      )}
      </ToastProvider>
    </Provider>
  )
}