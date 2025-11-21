import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  TouchableWithoutFeedback,
  KeyboardAvoidingView,
  Platform,
  Image,
  Keyboard,
  ActivityIndicator,
} from 'react-native';
import { Poppins, icons } from '../assets';
import CustomHeader from './CustomHeader';
import CustomTextInput from './CustomTextInput';
import CustomTextInput2 from './CustomTextInput2';
import CustomDropdown from './CustomDropdown';
import CustomButton from './CustomButton';
import CustomToggle from './CustomToggle';
import InfoBanner from './InfoBanner';
import { useToast } from './ToastContext';
import { API_BASE_URL } from '../config';
import { getApiHeaders, fetchWithAuth } from '../utils/apiHelpers';

const RestaurantDetailsScreen = ({ partnerId, onBack, onProceed }) => {
  const { showToast } = useToast();
  
  // Dynamic form state
  const [sectionData, setSectionData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({});
  const [fieldOptions, setFieldOptions] = useState({}); // Store dropdown options for each field
  const [otpData, setOtpData] = useState({}); // Store OTP data for phone fields that need verification
  const [loadingOptions, setLoadingOptions] = useState({}); // Track loading state for dropdown options
  const [fieldErrors, setFieldErrors] = useState({}); // Track validation errors for each field
  const [submitting, setSubmitting] = useState(false); // Track form submission state
  const inputRefs = useRef({});

  // Function to blur all inputs
  const blurAllInputs = () => {
    Object.values(inputRefs.current).forEach(ref => ref?.blur());
    Keyboard.dismiss();
  };

  // Fetch form sections from API
  useEffect(() => {
    fetchSections();
  }, []);

  const fetchSections = async () => {
    try {
      setLoading(true);
      // Build endpoint with partnerId query parameter
      let endpoint = `${API_BASE_URL}v1/onboarding/sections`;
      if (partnerId) {
        endpoint += `?partnerId=${encodeURIComponent(partnerId)}`;
      }
      
      const headers = await getApiHeaders(true); // Include authorization
      
      const response = await fetchWithAuth(endpoint, {
        method: 'GET',
        headers: headers,
      }, true);

      
      let data;
      try {
        data = await response.json();
      } catch (parseError) {
        console.error('❌ [RestaurantDetailsScreen] Failed to parse response as JSON');
        const textResponse = await response.text();
        console.error('❌ [RestaurantDetailsScreen] Raw Response:', textResponse);
        throw new Error('Invalid response format from API');
      }
      

      // Handle 500 errors (server errors)
      if (response.status === 500) {
        console.error('❌ [RestaurantDetailsScreen] Server Error (500)');
        const errorMessage = data.message || data.error || 'Server error. Please try again later.';
        console.error('❌ [RestaurantDetailsScreen] Error Message:', errorMessage);
        
        // Check if it's the "No static resource" error (endpoint doesn't exist)
        if (errorMessage.includes('No static resource')) {
          const friendlyMessage = 'Form configuration endpoint not available. Please contact support.';
          showToast(friendlyMessage, 'error');
        } else {
          showToast(errorMessage, 'error');
        }
        setLoading(false);
        return;
      }

      if (response.ok && data.code === 200 && data.status === 'success') {
        
        // Find RESTAURANT_DETAILS section or use first section
        const restaurantSection = data.data?.sections?.find(
          section => section.section_id === 'RESTAURANT_DETAILS'
        ) || data.data?.sections?.[0];

        if (restaurantSection) {
          
          setSectionData(restaurantSection);
          
          // Initialize form data with values from backend (if previously submitted) or defaults
          const initialFormData = {};
          restaurantSection.fields?.forEach(field => {
            // Check if backend has a saved value for this field (previously submitted data)
            if (field.value !== undefined && field.value !== null) {
              // Use saved value from backend
              if (field.type === 'toggle') {
                initialFormData[field.key] = Boolean(field.value);
              } else {
                initialFormData[field.key] = field.value;
              }
            } else {
              // No saved value, use defaults
              if (field.type === 'toggle') {
                // Use backend default value, fallback to false if not provided
                initialFormData[field.key] = field.default !== undefined ? field.default : false;
              } else {
                initialFormData[field.key] = '';
              }
            }
          });
          setFormData(initialFormData);

          // Fetch initial dropdown options (states)
          const dropdownFields = restaurantSection.fields?.filter(
            field => field.type === 'dropdown' && field.options_source && !field.options_source.includes('{')
          ) || [];
          
          dropdownFields.forEach(field => {
            fetchDropdownOptions(field.key, field.options_source);
          });
          
          // Fetch dependent dropdown options if saved values exist
          // If state has a saved value, fetch cities for that state
          const stateField = restaurantSection.fields?.find(f => f.key === 'state');
          if (stateField?.value && stateField?.options_source) {
            const cityField = restaurantSection.fields?.find(f => f.key === 'city');
            if (cityField?.options_source) {
              fetchDropdownOptions('city', cityField.options_source, { state: stateField.value });
            }
          }
          
          // If city has a saved value, fetch areas for that city
          const cityField = restaurantSection.fields?.find(f => f.key === 'city');
          if (cityField?.value && cityField?.options_source) {
            const areaField = restaurantSection.fields?.find(f => f.key === 'area');
            if (areaField?.options_source) {
              fetchDropdownOptions('area', areaField.options_source, { city: cityField.value });
            }
          }
        } else {
          console.error('❌ [RestaurantDetailsScreen] Section not found in response');
          showToast('Form configuration not found', 'error');
        }
      } else {
        console.error('❌ [RestaurantDetailsScreen] API Call Failed');
        console.error('❌ [RestaurantDetailsScreen] Response Status:', response.status);
        console.error('❌ [RestaurantDetailsScreen] Error Code:', data.code || data.status);
        console.error('❌ [RestaurantDetailsScreen] Error Message:', data.message || data.error);
        
        // Handle different error response formats
        const errorMessage = data.message || data.error || 'Failed to load form configuration';
        showToast(errorMessage, 'error');
      }
    } catch (error) {
      console.error('❌ [RestaurantDetailsScreen] ========================================');
      console.error('❌ [RestaurantDetailsScreen] NETWORK/API ERROR');
      console.error('❌ [RestaurantDetailsScreen] Error:', error);
      console.error('❌ [RestaurantDetailsScreen] Error Message:', error.message);
      console.error('❌ [RestaurantDetailsScreen] Error Stack:', error.stack);
      console.error('❌ [RestaurantDetailsScreen] ========================================');
      showToast('Network error. Please check your connection.', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Fetch dropdown options from API
  const fetchDropdownOptions = async (fieldKey, optionsSource, params = {}) => {
    try {
      setLoadingOptions(prev => ({ ...prev, [fieldKey]: true }));
      
      // Replace placeholders in options_source with actual values
      let url = optionsSource;
      Object.keys(params).forEach(key => {
        url = url.replace(`{${key}}`, params[key]);
      });

      // Build full URL
      // Check if URL already contains the base path to avoid duplication
      let fullUrl;
      if (url.startsWith('http')) {
        // Already a full URL
        fullUrl = url;
      } else {
        // Remove leading slash if present
        const originalUrl = url;
        url = url.replace(/^\//, '');
        
        try {
          // Extract the path part from API_BASE_URL (e.g., "partner/api" from "http://domain.com/partner/api/")
          const baseUrlObj = new URL(API_BASE_URL);
          const basePath = baseUrlObj.pathname.replace(/^\/|\/$/g, ''); // Remove leading/trailing slashes
          
          
          // Check if the URL already starts with the base path
          if (basePath && url.startsWith(basePath)) {
            // URL already contains base path, just prepend the domain and protocol
            fullUrl = `${baseUrlObj.protocol}//${baseUrlObj.host}/${url}`;
          } else {
            // Normal case: prepend base URL (which already ends with /)
            fullUrl = `${API_BASE_URL.replace(/\/$/, '')}/${url}`;
          }
        } catch (urlError) {
          // Fallback if URL constructor fails (shouldn't happen in React Native)
          console.warn(`⚠️ [RestaurantDetailsScreen] URL constructor failed, using fallback:`, urlError);
          fullUrl = `${API_BASE_URL.replace(/\/$/, '')}/${url}`;
        }
      }
      
      const requestHeaders = await getApiHeaders(true); // Include authorization
      
      
      const response = await fetchWithAuth(fullUrl, {
        method: 'GET',
        headers: requestHeaders,
      }, true);

      // Log response headers
      const responseHeaders = {};
      response.headers.forEach((value, key) => {
        responseHeaders[key] = value;
      });
      
      
      let data;
      let rawResponseText = null;
      try {
        rawResponseText = await response.text();
        
        try {
          data = JSON.parse(rawResponseText);
        } catch (parseError) {
          console.error(`❌ [RestaurantDetailsScreen] Failed to parse response as JSON for ${fieldKey}`);
          console.error(`❌ [RestaurantDetailsScreen] Parse Error:`, parseError);
          console.error(`❌ [RestaurantDetailsScreen] Full Raw Response:`, rawResponseText);
          throw new Error(`Invalid response format from ${fieldKey} API`);
        }
      } catch (textError) {
        console.error(`❌ [RestaurantDetailsScreen] Failed to read response text for ${fieldKey}`);
        console.error(`❌ [RestaurantDetailsScreen] Text Error:`, textError);
        throw new Error(`Failed to read response from ${fieldKey} API`);
      }
      

      if (response.ok && data.code === 200 && data.status === 'success') {
        // Detailed data structure analysis
        
        if (data.data) {
        } else {
          console.warn(`⚠️ [RestaurantDetailsScreen] Data.data is missing or null`);
        }
        
        // Handle different response formats
        const options = data.data?.states || data.data?.cities || data.data?.areas || data.data || [];
        
        if (options.length > 0) {
          // Better preview logging that handles different object formats
          const preview = options.slice(0, 5).map(o => {
            if (typeof o === 'string') return o;
            return o?.name || o?.label || o?.value || o?.id || JSON.stringify(o);
          }).join(', ');
          if (typeof options[0] === 'object' && options[0] !== null) {
          }
        } else {
          console.warn(`⚠️ [RestaurantDetailsScreen] Options array is empty - no options to display`);
        }
        setFieldOptions(prev => ({ ...prev, [fieldKey]: options }));
      } else {
        // Detailed error analysis
        console.error('🔍 [RestaurantDetailsScreen] ========================================');
        console.error(`🔍 [RestaurantDetailsScreen] ERROR ANALYSIS FOR: ${fieldKey}`);
        console.error(`🔍 [RestaurantDetailsScreen] Response Status: ${response.status}`);
        console.error(`🔍 [RestaurantDetailsScreen] Response OK: ${response.ok}`);
        console.error(`🔍 [RestaurantDetailsScreen] Data exists: ${data !== null && data !== undefined}`);
        
        if (data) {
          console.error(`🔍 [RestaurantDetailsScreen] Data keys:`, Object.keys(data));
          console.error(`🔍 [RestaurantDetailsScreen] Data.code: ${data.code} (expected: 200)`);
          console.error(`🔍 [RestaurantDetailsScreen] Data.status: ${data.status} (expected: 'success')`);
          console.error(`🔍 [RestaurantDetailsScreen] Data.message exists: ${data.message !== undefined}`);
          console.error(`🔍 [RestaurantDetailsScreen] Data.error exists: ${data.error !== undefined}`);
          console.error(`🔍 [RestaurantDetailsScreen] Data.data exists: ${data.data !== undefined}`);
          console.error(`🔍 [RestaurantDetailsScreen] Data.message value: ${data.message}`);
          console.error(`🔍 [RestaurantDetailsScreen] Data.error value: ${data.error}`);
          console.error(`🔍 [RestaurantDetailsScreen] Data.error_code: ${data.error_code}`);
          console.error(`🔍 [RestaurantDetailsScreen] Data.error_message: ${data.error_message}`);
        } else {
          console.error(`🔍 [RestaurantDetailsScreen] Data is null or undefined`);
        }
        console.error('🔍 [RestaurantDetailsScreen] ========================================');
        
        // Handle different error response formats
        const errorCode = data?.code || data?.error_code || response.status;
        const errorMessage = data?.message || data?.error || data?.error_message || `Failed to load ${fieldKey} options (Status: ${response.status})`;
        
        console.error(`❌ [RestaurantDetailsScreen] Failed to load options for ${fieldKey}`);
        console.error(`❌ [RestaurantDetailsScreen] Response Status: ${response.status}`);
        console.error(`❌ [RestaurantDetailsScreen] Error Code: ${errorCode}`);
        console.error(`❌ [RestaurantDetailsScreen] Error Message: ${errorMessage}`);
        console.error(`❌ [RestaurantDetailsScreen] Full Error Response:`, JSON.stringify(data, null, 2));
        
        // Handle different error status codes gracefully
        if (response.status === 404) {
          // Don't show toast for 404 errors (endpoint not configured in mock API)
          console.warn(`⚠️ [RestaurantDetailsScreen] Endpoint not found (404) - This is expected if the endpoint is not configured in the mock API`);
          console.warn(`⚠️ [RestaurantDetailsScreen] Please configure the endpoint: ${fullUrl}`);
        } else if (response.status === 500) {
          // Handle 500 errors gracefully - log but don't show intrusive toast
          console.warn(`⚠️ [RestaurantDetailsScreen] Server Error (500) - Options endpoint returned server error`);
          console.warn(`⚠️ [RestaurantDetailsScreen] Error Message: ${errorMessage}`);
          console.warn(`⚠️ [RestaurantDetailsScreen] Error Code: ${errorCode}`);
          console.warn(`⚠️ [RestaurantDetailsScreen] Full Error Data:`, JSON.stringify(data, null, 2));
          console.warn(`⚠️ [RestaurantDetailsScreen] This may be a temporary server issue. The field will remain functional but options may not load.`);
          console.warn(`⚠️ [RestaurantDetailsScreen] Missing Data Analysis:`);
          console.warn(`⚠️ [RestaurantDetailsScreen] - Expected: { code: 200, status: 'success', data: { states: [...] } }`);
          console.warn(`⚠️ [RestaurantDetailsScreen] - Received:`, JSON.stringify(data, null, 2));
          // Set empty options array so the field doesn't break
          setFieldOptions(prev => ({ ...prev, [fieldKey]: [] }));
        } else {
          // Show toast for other errors (400, 401, 403, etc.)
          showToast(errorMessage, 'error');
        }
      }
    } catch (error) {
      console.error('❌ [RestaurantDetailsScreen] ========================================');
      console.error(`❌ [RestaurantDetailsScreen] NETWORK/API ERROR FOR: ${fieldKey}`);
      console.error(`❌ [RestaurantDetailsScreen] Error Type: ${error.constructor.name}`);
      console.error(`❌ [RestaurantDetailsScreen] Error:`, error);
      console.error(`❌ [RestaurantDetailsScreen] Error Message:`, error.message);
      console.error(`❌ [RestaurantDetailsScreen] Error Stack:`, error.stack);
      console.error(`❌ [RestaurantDetailsScreen] Field Key: ${fieldKey}`);
      console.error(`❌ [RestaurantDetailsScreen] Options Source: ${optionsSource}`);
      console.error(`❌ [RestaurantDetailsScreen] Parameters:`, JSON.stringify(params, null, 2));
      console.error('❌ [RestaurantDetailsScreen] ========================================');
      showToast(`Failed to load ${fieldKey} options`, 'error');
    } finally {
      setLoadingOptions(prev => ({ ...prev, [fieldKey]: false }));
    }
  };

  // Handle field value change
  const handleFieldChange = (fieldKey, value) => {
    
    // Clear error for this field when user starts typing/selecting
    if (fieldErrors[fieldKey]) {
      setFieldErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[fieldKey];
        return newErrors;
      });
    }
    
    // Validate prerequisites for dependent dropdowns
    if (fieldKey === 'city' && value) {
      // Check if state is selected before allowing city selection
      if (!formData.state || formData.state.toString().trim() === '') {
        console.warn('⚠️ [RestaurantDetailsScreen] City selected without state');
        const stateMessage = sectionData?.messages?.validation?.select_state_first || 'Please select state first';
        showToast(stateMessage, 'error');
        return;
      }
    } else if (fieldKey === 'area' && value) {
      // Check if city is selected before allowing area selection
      if (!formData.city || formData.city.toString().trim() === '') {
        console.warn('⚠️ [RestaurantDetailsScreen] Area selected without city');
        const cityMessage = sectionData?.messages?.validation?.select_city_first || 'Please select state & city first';
        showToast(cityMessage, 'error');
        return;
      }
    }
    
    setFormData(prev => {
      const newData = { ...prev, [fieldKey]: value };
      
      // Handle dependent dropdowns
      if (fieldKey === 'state' && value) {
        // Reset city and area when state changes
        newData.city = '';
        newData.area = '';
        setFieldOptions(prev => ({ ...prev, city: [], area: [] }));
        
        // Fetch cities for selected state
        const cityField = sectionData?.fields?.find(f => f.key === 'city');
        if (cityField?.options_source) {
          fetchDropdownOptions('city', cityField.options_source, { state: value });
        }
      } else if (fieldKey === 'city' && value) {
        // Reset area when city changes
        newData.area = '';
        setFieldOptions(prev => ({ ...prev, area: [] }));
        
        // Fetch areas for selected city
        const areaField = sectionData?.fields?.find(f => f.key === 'area');
        if (areaField?.options_source) {
          fetchDropdownOptions('area', areaField.options_source, { city: value });
        }
      }
      
      return newData;
    });
  };

  // Handle OTP generation for phone fields
  const handleGenerateOTP = async (fieldKey) => {
    const phoneNumber = formData[fieldKey];
    if (!phoneNumber || phoneNumber.length < 10) {
      console.warn('⚠️ [RestaurantDetailsScreen] Invalid phone number for OTP generation:', phoneNumber);
      // Use backend message if available, otherwise fallback
      const validationMessage = sectionData?.messages?.validation?.invalid_phone || 'Please enter a valid phone number';
      showToast(validationMessage, 'error');
      return;
    }

    try {
      const endpoint = `${API_BASE_URL}v1/auth/send-otp`;
      const requestBody = {
        phone: phoneNumber,
        channel: 'whatsapp',
      };
      
      
      const headers = await getApiHeaders(true); // Include authorization
      
      const response = await fetchWithAuth(endpoint, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(requestBody),
      }, true);

      
      const data = await response.json();

      if (response.ok && data.code === 200 && data.status === 'success') {
        
        setOtpData(prev => ({
          ...prev,
          [fieldKey]: {
            otp_id: data.data?.otp_id,
            expires_in: data.data?.expires_in,
          },
        }));
        // Use backend message if available, otherwise fallback
        const otpSentMessage = sectionData?.messages?.otp?.sent || 'OTP has been sent to your number';
        showToast(otpSentMessage, 'success');
      } else {
        console.error(`❌ [RestaurantDetailsScreen] OTP generation failed for ${fieldKey}`);
        console.error(`❌ [RestaurantDetailsScreen] Error Code: ${data.code}`);
        console.error(`❌ [RestaurantDetailsScreen] Error Message: ${data.message}`);
        showToast(data.message || 'Failed to send OTP', 'error');
      }
    } catch (error) {
      console.error('❌ [RestaurantDetailsScreen] ========================================');
      console.error(`❌ [RestaurantDetailsScreen] NETWORK/API ERROR FOR OTP GENERATION: ${fieldKey}`);
      console.error(`❌ [RestaurantDetailsScreen] Error:`, error);
      console.error(`❌ [RestaurantDetailsScreen] Error Message:`, error.message);
      console.error('❌ [RestaurantDetailsScreen] ========================================');
      showToast('Network error. Please try again.', 'error');
    }
  };

  // Handle OTP verification
  const handleVerifyOTP = async (fieldKey) => {
    const otpCode = formData[`${fieldKey}_otp`] || formData.otp_code;
    if (!otpCode) {
      console.warn('⚠️ [RestaurantDetailsScreen] OTP code is empty');
      // Use backend message if available, otherwise fallback
      const enterOtpMessage = sectionData?.messages?.validation?.enter_otp || 'Please enter OTP';
      showToast(enterOtpMessage, 'error');
      return;
    }

    if (!otpData[fieldKey]?.otp_id) {
      console.warn('⚠️ [RestaurantDetailsScreen] OTP ID not found, please generate OTP first');
      // Use backend message if available, otherwise fallback
      const generateOtpMessage = sectionData?.messages?.validation?.generate_otp_first || 'Please generate OTP first';
      showToast(generateOtpMessage, 'error');
      return;
    }

    try {
      const endpoint = `${API_BASE_URL}v1/auth/verify-otp`;
      const requestBody = {
        otp_id: otpData[fieldKey].otp_id,
        otp: otpCode,
      };
      
      
      const headers = await getApiHeaders(true); // Include authorization
      
      const response = await fetchWithAuth(endpoint, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(requestBody),
      }, true);

      
      let data;
      try {
        data = await response.json();
      } catch (parseError) {
        console.error(`❌ [RestaurantDetailsScreen] Failed to parse OTP verification response as JSON`);
        console.error(`❌ [RestaurantDetailsScreen] Parse Error:`, parseError);
        const textResponse = await response.text();
        console.error(`❌ [RestaurantDetailsScreen] Raw Response:`, textResponse);
        throw new Error(`Invalid response format from OTP verification API`);
      }
      

      if (response.ok && data.code === 200 && data.status === 'success') {
        // Use backend message if available, otherwise fallback
        const otpVerifiedMessage = sectionData?.messages?.otp?.verified || 'OTP verified successfully';
        showToast(otpVerifiedMessage, 'success');
        // Mark OTP as verified
        setOtpData(prev => ({
          ...prev,
          [fieldKey]: { ...prev[fieldKey], verified: true },
        }));
      } else {
        // Handle different error response formats
        const errorCode = data.code || data.error_code || response.status;
        const errorMessage = data.message || data.error || `OTP verification failed (Status: ${response.status})`;
        
        console.error(`❌ [RestaurantDetailsScreen] OTP verification failed for ${fieldKey}`);
        console.error(`❌ [RestaurantDetailsScreen] Response Status: ${response.status}`);
        console.error(`❌ [RestaurantDetailsScreen] Error Code: ${errorCode}`);
        console.error(`❌ [RestaurantDetailsScreen] Error Message: ${errorMessage}`);
        
        // Handle specific error cases - use backend messages if available
        if (response.status === 404) {
          console.warn(`⚠️ [RestaurantDetailsScreen] OTP verification endpoint not found (404) - This is expected if the endpoint is not configured in the mock API`);
          console.warn(`⚠️ [RestaurantDetailsScreen] Please configure the endpoint: ${endpoint}`);
          const endpointError = sectionData?.messages?.error?.endpoint_not_configured || 'OTP verification endpoint not configured. Please check API setup.';
          showToast(endpointError, 'error');
        } else if (response.status === 400 && (data.error_code === 'INVALID_OTP' || errorCode === 400)) {
          const invalidOtpMessage = sectionData?.messages?.otp?.invalid || 'Invalid OTP. Please try again.';
          showToast(invalidOtpMessage, 'error');
        } else if (response.status === 410 && (data.error_code === 'OTP_EXPIRED' || errorCode === 410)) {
          const expiredOtpMessage = sectionData?.messages?.otp?.expired || 'OTP has expired. Please request a new one.';
          showToast(expiredOtpMessage, 'error');
        } else if (response.status === 429 && (data.error_code === 'OTP_ATTEMPTS_EXCEEDED' || errorCode === 429)) {
          const maxAttemptsMessage = sectionData?.messages?.otp?.max_attempts || 'Maximum attempts exceeded. Please try again later.';
          showToast(maxAttemptsMessage, 'error');
        } else {
          showToast(errorMessage, 'error');
        }
      }
    } catch (error) {
      console.error('❌ [RestaurantDetailsScreen] ========================================');
      console.error(`❌ [RestaurantDetailsScreen] NETWORK/API ERROR FOR OTP VERIFICATION: ${fieldKey}`);
      console.error(`❌ [RestaurantDetailsScreen] Error:`, error);
      console.error(`❌ [RestaurantDetailsScreen] Error Message:`, error.message);
      console.error('❌ [RestaurantDetailsScreen] ========================================');
      showToast('Network error. Please try again.', 'error');
    }
  };

  // Render field based on type
  const renderField = (field) => {
    const fieldValue = formData[field.key] || '';
    const fieldError = fieldErrors[field.key] || null; // Get validation error for this field
    const isRequired = field.required;
    const isLoading = loadingOptions[field.key];

    switch (field.type) {
      case 'dropdown':
        // Find matching option object if fieldValue is a string (id) and options are objects
        const dropdownOptions = fieldOptions[field.key] || [];
        let dropdownValue = fieldValue;
        if (fieldValue && typeof fieldValue === 'string' && dropdownOptions.length > 0 && typeof dropdownOptions[0] === 'object') {
          // Try to find matching option by id, value, or name
          const matchingOption = dropdownOptions.find(opt => 
            opt?.id === fieldValue || opt?.value === fieldValue || opt?.name === fieldValue
          );
          if (matchingOption) {
            dropdownValue = matchingOption;
          }
        }
        
        // Validation function for dropdown opening
        const handleDropdownOpen = () => {
          if (field.key === 'city') {
            // Check if state is selected before allowing city dropdown to open
            if (!formData.state || formData.state.toString().trim() === '') {
              console.warn('⚠️ [RestaurantDetailsScreen] Attempted to open city dropdown without state');
              const stateMessage = sectionData?.messages?.validation?.select_state_first || 'Please select state first';
              showToast(stateMessage, 'error');
              return false; // Prevent dropdown from opening
            }
          } else if (field.key === 'area') {
            // Check if city is selected before allowing area dropdown to open
            if (!formData.city || formData.city.toString().trim() === '') {
              console.warn('⚠️ [RestaurantDetailsScreen] Attempted to open area dropdown without city');
              const cityMessage = sectionData?.messages?.validation?.select_city_first || 'Please select city first';
              showToast(cityMessage, 'error');
              return false; // Prevent dropdown from opening
            }
          }
          return true; // Allow dropdown to open
        };
        
        return (
          <View key={field.key} style={styles.fieldContainer}>
            <Text style={styles.label}>
              {field.label} {isRequired && <Text style={styles.asterisk}>*</Text>}
            </Text>
            <CustomDropdown
              value={dropdownValue}
              onSelect={(item) => {
                // Handle different object formats from API
                let value;
                if (typeof item === 'string') {
                  value = item;
                } else if (item?.id) {
                  // API returns objects with id and name (e.g., {id: "DL", name: "Delhi"})
                  // Store the id for dependent dropdowns and API submission
                  value = item.id;
                } else {
                  // Fallback to other formats
                  value = item?.label || item?.value || item?.name || '';
                }
                handleFieldChange(field.key, value);
              }}
              onOpen={handleDropdownOpen}
              placeholder={`Select ${field.label}`}
              options={dropdownOptions}
              error={fieldError}
            />
            {isLoading && (
              <View style={styles.dropdownLoadingContainer}>
                <ActivityIndicator size="small" color="#FF6E1A" />
                {/* <Text style={styles.dropdownLoadingText}>Loading options...</Text> */}
                {/* Loading text removed - use backend text only */}
              </View>
            )}
          </View>
        );

      case 'text':
        return (
          <View key={field.key} style={styles.fieldContainer}>
            <Text style={styles.label}>
              {field.label} {isRequired && <Text style={styles.asterisk}>*</Text>}
            </Text>
            <CustomTextInput2
              ref={(ref) => (inputRefs.current[field.key] = ref)}
              value={fieldValue}
              onChangeText={(text) => handleFieldChange(field.key, text)}
              placeholder={`Enter ${field.label}`}
              error={fieldError}
            />
          </View>
        );

      case 'phone':
        const needsOTP = field.verify_otp === true;
        // Check if there's a separate OTP field in the fields array (to avoid duplication)
        const separateOtpField = sectionData?.fields?.find(f => f.type === 'otp');
        const shouldCreateOtpField = needsOTP && !separateOtpField;
        const otpFieldKey = `${field.key}_otp`;
        const otpValue = formData[otpFieldKey] || '';
        
        return (
          <React.Fragment key={field.key}>
            <View style={styles.fieldContainer}>
              <Text style={styles.label}>
                {field.label} {isRequired && <Text style={styles.asterisk}>*</Text>}
              </Text>
              <CustomTextInput2
                ref={(ref) => (inputRefs.current[field.key] = ref)}
                value={fieldValue}
                onChangeText={(text) => handleFieldChange(field.key, text)}
              placeholder={`Enter ${field.label}`}
              keyboardType="phone-pad"
              maxLength={10}
              rightButton={needsOTP ? (field.generate_otp_button || "Generate OTP") : undefined}
              onRightButtonPress={needsOTP ? () => handleGenerateOTP(field.key) : undefined}
                error={fieldError}
              />
            </View>
            {shouldCreateOtpField && (
              <View style={styles.fieldContainer}>
                <Text style={styles.label}>
                  {field.otp_label || "Verify OTP"} {isRequired && <Text style={styles.asterisk}>*</Text>}
                </Text>
                <CustomTextInput2
                  ref={(ref) => (inputRefs.current[otpFieldKey] = ref)}
                  value={otpValue}
                  onChangeText={(text) => handleFieldChange(otpFieldKey, text)}
                  placeholder={field.otp_placeholder || "Enter OTP"}
                  keyboardType="number-pad"
                  maxLength={6}
                  rightButton={field.verify_button_text || "Verify OTP"}
                  onRightButtonPress={() => handleVerifyOTP(field.key)}
                  error={fieldError}
                />
              </View>
            )}
          </React.Fragment>
        );

      case 'otp':
        // Find the phone field that needs OTP verification
        const phoneFieldForOtp = sectionData?.fields?.find(f => f.type === 'phone' && f.verify_otp);
        const otpPlaceholder = field.placeholder || "Enter OTP";
        const verifyButtonText = field.verify_button_text || "Verify OTP";
        
        return (
          <View key={field.key} style={styles.fieldContainer}>
            <Text style={styles.label}>
              {field.label} {isRequired && <Text style={styles.asterisk}>*</Text>}
            </Text>
            <CustomTextInput2
              ref={(ref) => (inputRefs.current[field.key] = ref)}
              value={fieldValue}
              onChangeText={(text) => handleFieldChange(field.key, text)}
              placeholder={otpPlaceholder}
              keyboardType="number-pad"
              maxLength={6}
              rightButton={verifyButtonText}
              onRightButtonPress={() => {
                if (phoneFieldForOtp) {
                  handleVerifyOTP(phoneFieldForOtp.key);
                }
              }}
              error={fieldError}
            />
          </View>
        );

      case 'toggle':
        // Toggle field - fully controlled by backend
        // field.label: Label text from backend
        // field.default: Default value from backend (true/false)
        // field.required: Required flag from backend
        return (
          <View key={field.key} style={styles.fieldContainer}>
            <View style={styles.toggleRow}>
              <CustomToggle
                value={fieldValue}
                onValueChange={(value) => {
                  handleFieldChange(field.key, value);
                }}
              />
              <Text style={styles.toggleLabel}>
                {field.label} {isRequired && <Text style={styles.asterisk}>*</Text>}
              </Text>
            </View>
          </View>
        );

      default:
        return null;
    }
  };

  const handleProceed = async () => {
    
    // Validate all required fields
    const missingFields = sectionData?.fields?.filter(field => {
      if (!field.required) return false;
      const value = formData[field.key];
      if (field.type === 'toggle') {
        return value === undefined || value === null;
      }
      return !value || value.toString().trim() === '';
    });

    if (missingFields && missingFields.length > 0) {
      console.error('❌ [RestaurantDetailsScreen] Validation failed - Missing required fields:');
      console.error('❌ [RestaurantDetailsScreen] Missing Fields:', missingFields.map(f => f.key).join(', '));
      
      // Set errors for missing fields
      const errors = {};
      missingFields.forEach(field => {
        errors[field.key] = sectionData?.messages?.validation?.required_field || 'This field is required';
      });
      setFieldErrors(errors);
      
      // Use backend message if available, otherwise fallback
      const validationMessage = sectionData?.messages?.validation?.required_fields || 'Please fill all required fields';
      showToast(validationMessage, 'error');
      return;
    }
    
    // Clear all errors if validation passes
    if (Object.keys(fieldErrors).length > 0) {
      setFieldErrors({});
    }

    // Build submission data (exclude OTP fields)
    const submissionData = {};
    Object.keys(formData).forEach(key => {
      // Exclude OTP fields (keys ending with _otp or the otp_code field)
      if (!key.endsWith('_otp') && key !== 'otp_code') {
        submissionData[key] = formData[key];
      }
    });

    // Submit to API
    if (!partnerId) {
      console.error('❌ [RestaurantDetailsScreen] Partner ID is missing');
      showToast('Partner ID is required. Please login again.', 'error');
      return;
    }

    try {
      setSubmitting(true);
      const endpoint = `${API_BASE_URL}v1/onboarding/submit-section?partner_id=${encodeURIComponent(partnerId)}`;
      const requestBody = {
        section_id: 'RESTAURANT_DETAILS',
        ...submissionData,
      };


      const headers = await getApiHeaders(true); // Include authorization

      const response = await fetchWithAuth(endpoint, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(requestBody),
      }, true);

      const data = await response.json();

      if (response.ok && data.code === 200 && data.status === 'success') {
        const successMessage = sectionData?.messages?.success?.form_submitted || data.message || 'Restaurant details submitted successfully';
        showToast(successMessage, 'success');
        
        // Navigate to next screen
        if (onProceed) {
          onProceed(submissionData);
        }
      } else {
        console.error('❌ [RestaurantDetailsScreen] Form submission failed');
        const errorMessage = data.message || 'Failed to submit form. Please try again.';
        showToast(errorMessage, 'error');
      }
    } catch (error) {
      console.error('❌ [RestaurantDetailsScreen] Network error:', error);
      showToast('Network error. Please check your connection and try again.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
        <CustomHeader
          title={sectionData?.title || "Restaurant Details"}
          onBack={onBack}
          showBackButton={true}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF6E1A" />
          {/* <Text style={styles.loadingText}>Loading form...</Text> */}
          {/* Loading text removed - use backend text only */}
        </View>
      </SafeAreaView>
    );
  }

  if (!sectionData) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
        <CustomHeader
          title="Restaurant Details"
          onBack={onBack}
          showBackButton={true}
        />
        <View style={styles.errorContainer}>
          {/* <Text style={styles.errorText}>Failed to load form. Please try again.</Text> */}
          {/* Error text removed - use backend text only */}
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <KeyboardAvoidingView
        style={styles.keyboardAvoidingView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <CustomHeader
          title={sectionData.title || "Restaurant Details"}
          onBack={onBack}
          showBackButton={true}
        />
        <TouchableWithoutFeedback onPress={blurAllInputs} accessible={false}>
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            onScrollBeginDrag={blurAllInputs}
            removeClippedSubviews={false}
          >
        {/* Information Banner */}
            {sectionData.description && (
              <InfoBanner text={sectionData.description} />
            )}

            {/* Form Fields - Dynamically Rendered */}
        <View style={styles.formContainer}>
              {sectionData.fields?.map(field => renderField(field))}
        </View>

        {/* Proceed Button */}
        <View style={styles.buttonContainer}>
          <CustomButton
                title={sectionData.button_text || "Proceed"}
            onPress={handleProceed}
            disabled={submitting}
            loading={submitting}
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
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
  },
  infoBanner: {
    flexDirection: 'row',
    backgroundColor: '#405375',
    borderRadius: 8,
    padding: 15,
    marginBottom: 25,
    alignItems: 'flex-start',
  },
  infoIcon: {
    width: 24,
    height: 24,
    marginRight: 12,
    marginTop: 2,
    tintColor: '#FFFFFF',
  },
  infoText: {
    flex: 1,
    fontFamily: Poppins.regular,
    fontSize: 12,
    color: '#FFFFFF',
    lineHeight: 20,
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
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  actionLink: {
    fontFamily: Poppins.medium,
    fontSize: 14,
    color: '#FF6E1A',
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 10,
    fontFamily: Poppins.regular,
    fontSize: 14,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  errorText: {
    fontFamily: Poppins.regular,
    fontSize: 14,
    color: '#FF0000',
    textAlign: 'center',
  },
  dropdownLoadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 5,
    paddingHorizontal: 5,
  },
  dropdownLoadingText: {
    marginLeft: 8,
    fontFamily: Poppins.regular,
    fontSize: 12,
    color: '#666',
  },
});

export default RestaurantDetailsScreen;
