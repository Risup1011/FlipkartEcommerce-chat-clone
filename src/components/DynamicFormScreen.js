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
import DateTimePicker from '@react-native-community/datetimepicker';
import { launchImageLibrary, launchCamera } from 'react-native-image-picker';
import DocumentPicker from 'react-native-document-picker';
import { Poppins, icons } from '../assets';
import CustomHeader from './CustomHeader';
import CustomTextInput2 from './CustomTextInput2';
import CustomDropdown from './CustomDropdown';
import CustomButton from './CustomButton';
import CustomToggle from './CustomToggle';
import CustomUploadButton from './CustomUploadButton';
import UploadBottomSheet from './UploadBottomSheet';
import InfoBanner from './InfoBanner';
import { useToast } from './ToastContext';
import { API_BASE_URL } from '../config';
import { getApiHeaders, fetchWithAuth } from '../utils/apiHelpers';

const DynamicFormScreen = ({ sectionId, partnerId, onBack, onProceed }) => {
  const { showToast } = useToast();
  
  // Dynamic form state
  const [sectionData, setSectionData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({});
  const [fieldOptions, setFieldOptions] = useState({}); // Store dropdown options for each field
  const [otpData, setOtpData] = useState({}); // Store OTP data for phone fields that need verification
  const [loadingOptions, setLoadingOptions] = useState({}); // Track loading state for dropdown options
  const [datePickers, setDatePickers] = useState({}); // Track date picker visibility for each field
  const [selectedDates, setSelectedDates] = useState({}); // Store selected dates
  const [showUploadBottomSheet, setShowUploadBottomSheet] = useState(false);
  const [currentUploadField, setCurrentUploadField] = useState(null); // Track which field is uploading
  const [fieldErrors, setFieldErrors] = useState({}); // Track validation errors for each field
  const [submitting, setSubmitting] = useState(false); // Track form submission state
  const [uploading, setUploading] = useState(false); // Track file upload state
  const inputRefs = useRef({});

  // Function to blur all inputs
  const blurAllInputs = () => {
    Object.values(inputRefs.current).forEach(ref => ref?.blur());
    Keyboard.dismiss();
  };

  // Fetch form sections from API
  useEffect(() => {
    fetchSections();
  }, [sectionId]);

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
        console.error('❌ [DynamicFormScreen] Failed to parse response as JSON');
        const textResponse = await response.text();
        console.error('❌ [DynamicFormScreen] Raw Response:', textResponse);
        throw new Error('Invalid response format from API');
      }
      

      // Handle 500 errors (server errors)
      if (response.status === 500) {
        console.error('❌ [DynamicFormScreen] Server Error (500)');
        const errorMessage = data.message || data.error || 'Server error. Please try again later.';
        console.error('❌ [DynamicFormScreen] Error Message:', errorMessage);
        
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
        
        // Find the requested section by section_id
        const targetSection = data.data?.sections?.find(
          section => section.section_id === sectionId
        );

        if (targetSection) {
          
          setSectionData(targetSection);
          
          // Initialize form data with values from backend (if previously submitted) or defaults
          const initialFormData = {};
          targetSection.fields?.forEach(field => {
            // Check if backend has a saved value for this field (previously submitted data)
            if (field.value !== undefined && field.value !== null) {
              // Use saved value from backend
              if (field.type === 'toggle') {
                initialFormData[field.key] = Boolean(field.value);
              } else if (field.type === 'date') {
                initialFormData[field.key] = field.value;
                // Parse date if needed for date picker
                setSelectedDates(prev => ({ ...prev, [field.key]: field.value || null }));
              } else if (field.type === 'file') {
                // If value is a URL string, it means file was already uploaded
                initialFormData[field.key] = typeof field.value === 'string' ? field.value : null;
              } else {
                initialFormData[field.key] = field.value;
              }
            } else {
              // No saved value, use defaults
              if (field.type === 'toggle') {
                initialFormData[field.key] = field.default !== undefined ? field.default : false;
              } else if (field.type === 'date') {
                initialFormData[field.key] = '';
                setSelectedDates(prev => ({ ...prev, [field.key]: null }));
              } else if (field.type === 'file') {
                initialFormData[field.key] = null; // Store file object
              } else {
                initialFormData[field.key] = '';
              }
            }
          });
          setFormData(initialFormData);

          // Handle dropdown options - check for inline options or options_source
          targetSection.fields?.forEach(field => {
            if (field.type === 'dropdown') {
              if (field.options && Array.isArray(field.options)) {
                // Inline options (e.g., for document_type)
                setFieldOptions(prev => ({ ...prev, [field.key]: field.options }));
              } else if (field.options_source && !field.options_source.includes('{')) {
                // Options from API (no parameters needed)
                fetchDropdownOptions(field.key, field.options_source);
              }
            }
          });
        } else {
          console.error('❌ [DynamicFormScreen] Section not found in response');
          showToast('Form configuration not found', 'error');
        }
      } else {
        console.error('❌ [DynamicFormScreen] API Call Failed');
        console.error('❌ [DynamicFormScreen] Response Status:', response.status);
        console.error('❌ [DynamicFormScreen] Error Code:', data.code || data.status);
        console.error('❌ [DynamicFormScreen] Error Message:', data.message || data.error);
        
        // Handle different error response formats
        const errorMessage = data.message || data.error || 'Failed to load form configuration';
        showToast(errorMessage, 'error');
      }
    } catch (error) {
      console.error('❌ [DynamicFormScreen] ========================================');
      console.error('❌ [DynamicFormScreen] NETWORK/API ERROR');
      console.error('❌ [DynamicFormScreen] Error:', error);
      console.error('❌ [DynamicFormScreen] Error Message:', error.message);
      console.error('❌ [DynamicFormScreen] Error Stack:', error.stack);
      console.error('❌ [DynamicFormScreen] ========================================');
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
          console.warn(`⚠️ [DynamicFormScreen] URL constructor failed, using fallback:`, urlError);
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
          console.error(`❌ [DynamicFormScreen] Failed to parse response as JSON for ${fieldKey}`);
          console.error(`❌ [DynamicFormScreen] Parse Error:`, parseError);
          console.error(`❌ [DynamicFormScreen] Full Raw Response:`, rawResponseText);
          throw new Error(`Invalid response format from ${fieldKey} API`);
        }
      } catch (textError) {
        console.error(`❌ [DynamicFormScreen] Failed to read response text for ${fieldKey}`);
        console.error(`❌ [DynamicFormScreen] Text Error:`, textError);
        throw new Error(`Failed to read response from ${fieldKey} API`);
      }
      

      if (response.ok && data.code === 200 && data.status === 'success') {
        // Detailed data structure analysis
        
        if (data.data) {
        } else {
          console.warn(`⚠️ [DynamicFormScreen] Data.data is missing or null`);
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
          console.warn(`⚠️ [DynamicFormScreen] Options array is empty - no options to display`);
        }
        setFieldOptions(prev => ({ ...prev, [fieldKey]: options }));
      } else {
        // Detailed error analysis
        console.error('🔍 [DynamicFormScreen] ========================================');
        console.error(`🔍 [DynamicFormScreen] ERROR ANALYSIS FOR: ${fieldKey}`);
        console.error(`🔍 [DynamicFormScreen] Response Status: ${response.status}`);
        console.error(`🔍 [DynamicFormScreen] Response OK: ${response.ok}`);
        console.error(`🔍 [DynamicFormScreen] Data exists: ${data !== null && data !== undefined}`);
        
        if (data) {
          console.error(`🔍 [DynamicFormScreen] Data keys:`, Object.keys(data));
          console.error(`🔍 [DynamicFormScreen] Data.code: ${data.code} (expected: 200)`);
          console.error(`🔍 [DynamicFormScreen] Data.status: ${data.status} (expected: 'success')`);
          console.error(`🔍 [DynamicFormScreen] Data.message exists: ${data.message !== undefined}`);
          console.error(`🔍 [DynamicFormScreen] Data.error exists: ${data.error !== undefined}`);
          console.error(`🔍 [DynamicFormScreen] Data.data exists: ${data.data !== undefined}`);
          console.error(`🔍 [DynamicFormScreen] Data.message value: ${data.message}`);
          console.error(`🔍 [DynamicFormScreen] Data.error value: ${data.error}`);
          console.error(`🔍 [DynamicFormScreen] Data.error_code: ${data.error_code}`);
          console.error(`🔍 [DynamicFormScreen] Data.error_message: ${data.error_message}`);
        } else {
          console.error(`🔍 [DynamicFormScreen] Data is null or undefined`);
        }
        console.error('🔍 [DynamicFormScreen] ========================================');
        
        // Handle different error response formats
        const errorCode = data?.code || data?.error_code || response.status;
        const errorMessage = data?.message || data?.error || data?.error_message || `Failed to load ${fieldKey} options (Status: ${response.status})`;
        
        console.error(`❌ [DynamicFormScreen] Failed to load options for ${fieldKey}`);
        console.error(`❌ [DynamicFormScreen] Response Status: ${response.status}`);
        console.error(`❌ [DynamicFormScreen] Error Code: ${errorCode}`);
        console.error(`❌ [DynamicFormScreen] Error Message: ${errorMessage}`);
        console.error(`❌ [DynamicFormScreen] Full Error Response:`, JSON.stringify(data, null, 2));
        
        // Handle different error status codes gracefully
        if (response.status === 404) {
          console.warn(`⚠️ [DynamicFormScreen] Endpoint not found (404) - This is expected if the endpoint is not configured in the mock API`);
          console.warn(`⚠️ [DynamicFormScreen] Please configure the endpoint: ${fullUrl}`);
        } else if (response.status === 500) {
          console.warn(`⚠️ [DynamicFormScreen] Server Error (500) - Options endpoint returned server error`);
          console.warn(`⚠️ [DynamicFormScreen] Error Message: ${errorMessage}`);
          console.warn(`⚠️ [DynamicFormScreen] Error Code: ${errorCode}`);
          console.warn(`⚠️ [DynamicFormScreen] Full Error Data:`, JSON.stringify(data, null, 2));
          console.warn(`⚠️ [DynamicFormScreen] Missing Data Analysis:`);
          console.warn(`⚠️ [DynamicFormScreen] - Expected: { code: 200, status: 'success', data: { states: [...] } }`);
          console.warn(`⚠️ [DynamicFormScreen] - Received:`, JSON.stringify(data, null, 2));
          setFieldOptions(prev => ({ ...prev, [fieldKey]: [] }));
        } else {
          showToast(errorMessage, 'error');
        }
      }
    } catch (error) {
      console.error('❌ [DynamicFormScreen] ========================================');
      console.error(`❌ [DynamicFormScreen] NETWORK/API ERROR FOR: ${fieldKey}`);
      console.error(`❌ [DynamicFormScreen] Error Type: ${error.constructor.name}`);
      console.error(`❌ [DynamicFormScreen] Error:`, error);
      console.error(`❌ [DynamicFormScreen] Error Message:`, error.message);
      console.error(`❌ [DynamicFormScreen] Error Stack:`, error.stack);
      console.error(`❌ [DynamicFormScreen] Field Key: ${fieldKey}`);
      console.error(`❌ [DynamicFormScreen] Options Source: ${optionsSource}`);
      console.error(`❌ [DynamicFormScreen] Parameters:`, JSON.stringify(params, null, 2));
      console.error('❌ [DynamicFormScreen] ========================================');
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
    
    setFormData(prev => {
      const newData = { ...prev, [fieldKey]: value };
      
      // Handle dependent dropdowns
      if (fieldKey === 'state' && value) {
        newData.city = '';
        newData.area = '';
        setFieldOptions(prev => ({ ...prev, city: [], area: [] }));
        
        const cityField = sectionData?.fields?.find(f => f.key === 'city');
        if (cityField?.options_source) {
          fetchDropdownOptions('city', cityField.options_source, { state: value });
        }
      } else if (fieldKey === 'city' && value) {
        newData.area = '';
        setFieldOptions(prev => ({ ...prev, area: [] }));
        
        const areaField = sectionData?.fields?.find(f => f.key === 'area');
        if (areaField?.options_source) {
          fetchDropdownOptions('area', areaField.options_source, { city: value });
        }
      }
      
      return newData;
    });
  };

  // Handle date picker
  const handleDateChange = (fieldKey, event, selectedDate) => {
    if (Platform.OS === 'android') {
      setDatePickers(prev => ({ ...prev, [fieldKey]: false }));
    }
    
    if (selectedDate) {
      const formattedDate = formatDate(selectedDate);
      setSelectedDates(prev => ({ ...prev, [fieldKey]: selectedDate }));
      handleFieldChange(fieldKey, formattedDate);
    }
  };

  const formatDate = (date) => {
    if (!date) return '';
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  // Handle file upload
  const handleFileUpload = (fieldKey) => {
    setCurrentUploadField(fieldKey);
    setShowUploadBottomSheet(true);
  };

  const handleSelectGallery = async () => {
    try {
      const field = sectionData?.fields?.find(f => f.key === currentUploadField);
      const options = {
        mediaType: 'photo',
        quality: 0.8,
        selectionLimit: 1,
      };

      const result = await launchImageLibrary(options);
      if (result.assets && result.assets[0]) {
        const file = result.assets[0];
        validateAndSetFile(currentUploadField, file, field);
      }
    } catch (error) {
      console.error('Error selecting from gallery:', error);
      showToast('Failed to select image from gallery', 'error');
    }
  };

  const handleSelectCamera = async () => {
    try {
      const field = sectionData?.fields?.find(f => f.key === currentUploadField);
      const options = {
        mediaType: 'photo',
        quality: 0.8,
        saveToPhotos: true,
      };

      const result = await launchCamera(options);
      if (result.assets && result.assets[0]) {
        const file = result.assets[0];
        validateAndSetFile(currentUploadField, file, field);
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      showToast('Failed to take photo', 'error');
    }
  };

  const handleSelectFiles = async () => {
    try {
      const field = sectionData?.fields?.find(f => f.key === currentUploadField);
      const result = await DocumentPicker.pick({
        type: [DocumentPicker.types.pdf, DocumentPicker.types.images],
        copyTo: 'cachesDirectory',
      });

      if (result && result[0]) {
        const file = {
          uri: result[0].uri,
          name: result[0].name,
          type: result[0].type,
          size: result[0].size,
        };
        validateAndSetFile(currentUploadField, file, field);
      }
    } catch (error) {
      if (DocumentPicker.isCancel(error)) {
      } else {
        console.error('Error selecting file:', error);
        showToast('Failed to select file', 'error');
      }
    }
  };

  // Upload file to media upload API
  const uploadFile = async (file, fieldKey) => {
    if (!partnerId) {
      console.error('❌ [DynamicFormScreen] Partner ID is missing for file upload');
      showToast('Partner ID is required. Please login again.', 'error');
      return null;
    }

    try {
      setUploading(true);
      // Endpoint doesn't include partnerId - it's extracted from the JWT token
      const endpoint = `${API_BASE_URL}v1/partners/media/upload`;
      
      // Normalize file object - handle different formats from image picker
      const fileName = file.name || file.fileName || `file_${Date.now()}.jpg`;
      const fileType = file.type || file.mime || 'image/jpeg';
      const fileSize = file.size || file.fileSize || 0;
      
      // Create FormData for file upload
      const formData = new FormData();
      const fileObject = {
        uri: file.uri,
        name: fileName,
        type: fileType,
      };
      formData.append('file', fileObject);

      // Get headers with authorization
      // Note: fetchWithAuth will automatically detect FormData and not set Content-Type
      const authHeaders = await getApiHeaders(true);
      const authToken = authHeaders['Authorization'] || '';
      // Remove Content-Type so React Native can set it automatically with boundary for multipart/form-data
      // (This is a safety measure, fetchWithAuth also handles this)
      delete authHeaders['Content-Type'];

      if (authToken) {
      }

      // Generate curl-equivalent command for debugging (matches backend expected format)

      const response = await fetchWithAuth(endpoint, {
        method: 'POST',
        headers: authHeaders,
        // Don't set Content-Type header - React Native will set it automatically with boundary for multipart/form-data
        body: formData,
      }, true);

      // Check if response is ok before trying to parse JSON
      if (!response.ok && response.status !== 200 && response.status !== 201) {
        const errorText = await response.text();
        console.error('❌ [DynamicFormScreen] ========================================');
        console.error(`❌ [DynamicFormScreen] HTTP ERROR: ${response.status} ${response.statusText}`);
        console.error(`❌ [DynamicFormScreen] Response Text:`, errorText);
        console.error('❌ [DynamicFormScreen] ========================================');
        showToast(`Upload failed: ${response.status} ${response.statusText}`, 'error');
        return null;
      }

      const data = await response.json();
      if (data.data) {
      }

      // Accept both 200 (OK) and 201 (Created) as success codes for file uploads
      const isSuccess = response.ok && (data.code === 200 || data.code === 201) && data.status === 'success';
      
      if (isSuccess) {
        const fileUrl = data.data?.file_url || data.data?.url;
        if (fileUrl) {
          return fileUrl;
        } else {
          console.error('❌ [DynamicFormScreen] File URL not found in response');
          console.error('❌ [DynamicFormScreen] Response data:', JSON.stringify(data, null, 2));
          showToast('File uploaded but URL not received', 'error');
          return null;
        }
      } else {
        console.error('❌ [DynamicFormScreen] File upload failed');
        console.error(`❌ [DynamicFormScreen] Response Status: ${response.status}`);
        console.error(`❌ [DynamicFormScreen] Response OK: ${response.ok}`);
        console.error(`❌ [DynamicFormScreen] Data Code: ${data.code} (expected: 200 or 201)`);
        console.error(`❌ [DynamicFormScreen] Data Status: ${data.status} (expected: 'success')`);
        const errorMessage = data.message || 'Failed to upload file. Please try again.';
        showToast(errorMessage, 'error');
        return null;
      }
    } catch (error) {
      console.error('❌ [DynamicFormScreen] ========================================');
      console.error(`❌ [DynamicFormScreen] NETWORK/API ERROR FOR FILE UPLOAD: ${fieldKey}`);
      console.error(`❌ [DynamicFormScreen] Error Type: ${error.constructor.name}`);
      console.error(`❌ [DynamicFormScreen] Error:`, error);
      console.error(`❌ [DynamicFormScreen] Error Message:`, error.message);
      console.error(`❌ [DynamicFormScreen] Error Stack:`, error.stack);
      
      // Additional debugging for network errors
      if (error.message === 'Network request failed' || error.message.includes('Network')) {
        console.error('❌ [DynamicFormScreen] NETWORK DIAGNOSTICS:');
        console.error(`❌ [DynamicFormScreen] - Check if device/emulator has internet connection`);
        console.error(`❌ [DynamicFormScreen] - Check if API endpoint is reachable: ${API_BASE_URL}`);
        console.error(`❌ [DynamicFormScreen] - Check if SSL certificate is valid (if using HTTPS)`);
        console.error(`❌ [DynamicFormScreen] - Check if CORS is configured on backend`);
        console.error(`❌ [DynamicFormScreen] - Check if file URI is accessible: ${file?.uri}`);
      }
      
      console.error('❌ [DynamicFormScreen] ========================================');
      showToast('Network error. Please try again.', 'error');
      return null;
    } finally {
      setUploading(false);
    }
  };

  const validateAndSetFile = async (fieldKey, file, field) => {
    // Normalize file properties - handle different formats from image picker
    const fileName = file.name || file.fileName || '';
    const fileType = file.type || file.mime || '';
    const fileSize = file.size || file.fileSize || 0;
    
    // Validate file type
    const allowedTypes = field.file_types || ['jpg', 'jpeg', 'png', 'pdf'];
    const fileExtension = fileName?.split('.').pop()?.toLowerCase() || 
                         fileType?.split('/').pop()?.toLowerCase() || '';
    
    
    if (!allowedTypes.includes(fileExtension)) {
      showToast(`File type not allowed. Allowed types: ${allowedTypes.join(', ')}`, 'error');
      return;
    }

    // Validate file size
    const maxSizeMB = field.max_size_mb || 5;
    const fileSizeMB = fileSize / (1024 * 1024);
    
    
    if (fileSizeMB > maxSizeMB) {
      showToast(`File size exceeds ${maxSizeMB}MB limit`, 'error');
      return;
    }

    // Upload file and get file_url
    showToast('Uploading file...', 'info');
    const fileUrl = await uploadFile(file, fieldKey);
    
    if (fileUrl) {
      // Store file_url instead of file object
      handleFieldChange(fieldKey, fileUrl);
      showToast('File uploaded successfully', 'success');
    } else {
      showToast('Failed to upload file', 'error');
    }
  };

  // Handle OTP generation for phone fields
  const handleGenerateOTP = async (fieldKey) => {
    const phoneNumber = formData[fieldKey];
    if (!phoneNumber || phoneNumber.length < 10) {
      console.warn('⚠️ [DynamicFormScreen] Invalid phone number for OTP generation:', phoneNumber);
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
        const otpSentMessage = sectionData?.messages?.otp?.sent || 'OTP has been sent to your number';
        showToast(otpSentMessage, 'success');
      } else {
        console.error(`❌ [DynamicFormScreen] OTP generation failed for ${fieldKey}`);
        console.error(`❌ [DynamicFormScreen] Error Code: ${data.code}`);
        console.error(`❌ [DynamicFormScreen] Error Message: ${data.message}`);
        showToast(data.message || 'Failed to send OTP', 'error');
      }
    } catch (error) {
      console.error('❌ [DynamicFormScreen] ========================================');
      console.error(`❌ [DynamicFormScreen] NETWORK/API ERROR FOR OTP GENERATION: ${fieldKey}`);
      console.error(`❌ [DynamicFormScreen] Error:`, error);
      console.error(`❌ [DynamicFormScreen] Error Message:`, error.message);
      console.error('❌ [DynamicFormScreen] ========================================');
      showToast('Network error. Please try again.', 'error');
    }
  };

  // Handle OTP verification
  const handleVerifyOTP = async (fieldKey) => {
    const otpCode = formData[`${fieldKey}_otp`] || formData.otp_code;
    if (!otpCode) {
      console.warn('⚠️ [DynamicFormScreen] OTP code is empty');
      const enterOtpMessage = sectionData?.messages?.validation?.enter_otp || 'Please enter OTP';
      showToast(enterOtpMessage, 'error');
      return;
    }

    if (!otpData[fieldKey]?.otp_id) {
      console.warn('⚠️ [DynamicFormScreen] OTP ID not found, please generate OTP first');
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
        console.error(`❌ [DynamicFormScreen] Failed to parse OTP verification response as JSON`);
        console.error(`❌ [DynamicFormScreen] Parse Error:`, parseError);
        const textResponse = await response.text();
        console.error(`❌ [DynamicFormScreen] Raw Response:`, textResponse);
        throw new Error(`Invalid response format from OTP verification API`);
      }
      

      if (response.ok && data.code === 200 && data.status === 'success') {
        const otpVerifiedMessage = sectionData?.messages?.otp?.verified || 'OTP verified successfully';
        showToast(otpVerifiedMessage, 'success');
        setOtpData(prev => ({
          ...prev,
          [fieldKey]: { ...prev[fieldKey], verified: true },
        }));
      } else {
        const errorCode = data.code || data.error_code || response.status;
        const errorMessage = data.message || data.error || `OTP verification failed (Status: ${response.status})`;
        
        console.error(`❌ [DynamicFormScreen] OTP verification failed for ${fieldKey}`);
        console.error(`❌ [DynamicFormScreen] Response Status: ${response.status}`);
        console.error(`❌ [DynamicFormScreen] Error Code: ${errorCode}`);
        console.error(`❌ [DynamicFormScreen] Error Message: ${errorMessage}`);
        
        if (response.status === 404) {
          console.warn(`⚠️ [DynamicFormScreen] OTP verification endpoint not found (404) - This is expected if the endpoint is not configured in the mock API`);
          console.warn(`⚠️ [DynamicFormScreen] Please configure the endpoint: ${endpoint}`);
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
      console.error('❌ [DynamicFormScreen] ========================================');
      console.error(`❌ [DynamicFormScreen] NETWORK/API ERROR FOR OTP VERIFICATION: ${fieldKey}`);
      console.error(`❌ [DynamicFormScreen] Error:`, error);
      console.error(`❌ [DynamicFormScreen] Error Message:`, error.message);
      console.error('❌ [DynamicFormScreen] ========================================');
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
        // Handle inline options or API options
        const dropdownOptions = field.options || fieldOptions[field.key] || [];
        let dropdownValue = fieldValue;
        if (fieldValue && typeof fieldValue === 'string' && dropdownOptions.length > 0 && typeof dropdownOptions[0] === 'object') {
          const matchingOption = dropdownOptions.find(opt => 
            opt?.id === fieldValue || opt?.value === fieldValue || opt?.name === fieldValue
          );
          if (matchingOption) {
            dropdownValue = matchingOption;
          }
        }
        
        return (
          <View key={field.key} style={styles.fieldContainer}>
            <Text style={styles.label}>
              {field.label} {isRequired && <Text style={styles.asterisk}>*</Text>}
            </Text>
            <CustomDropdown
              value={dropdownValue}
              onSelect={(item) => {
                let value;
                if (typeof item === 'string') {
                  value = item;
                } else if (item?.id) {
                  value = item.id;
                } else {
                  value = item?.label || item?.value || item?.name || '';
                }
                handleFieldChange(field.key, value);
              }}
              placeholder={`Select ${field.label}`}
              options={dropdownOptions}
              error={fieldError}
            />
            {isLoading && (
              <View style={styles.dropdownLoadingContainer}>
                <ActivityIndicator size="small" color="#FF6E1A" />
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

      case 'date':
        const selectedDate = selectedDates[field.key];
        const showDatePicker = datePickers[field.key] || false;
        
        return (
          <View key={field.key} style={styles.fieldContainer}>
            <Text style={styles.label}>
              {field.label} {isRequired && <Text style={styles.asterisk}>*</Text>}
            </Text>
            <TouchableOpacity
              onPress={() => {
                setDatePickers(prev => ({ ...prev, [field.key]: true }));
              }}
              activeOpacity={0.7}
            >
              <CustomTextInput2
                ref={(ref) => (inputRefs.current[field.key] = ref)}
                value={fieldValue}
                placeholder={field.placeholder || "DD/MM/YYYY"}
                editable={false}
                rightIcon={icons.calendar}
                onRightIconPress={() => {
                  setDatePickers(prev => ({ ...prev, [field.key]: true }));
                }}
                error={fieldError}
              />
            </TouchableOpacity>
            {showDatePicker && (
              <DateTimePicker
                value={selectedDate || new Date()}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={(event, date) => handleDateChange(field.key, event, date)}
                minimumDate={field.min_date ? new Date(field.min_date) : undefined}
                maximumDate={field.max_date ? new Date(field.max_date) : undefined}
              />
            )}
          </View>
        );

      case 'file':
        const fileValue = formData[field.key];
        // File value can be either a URL string (after upload) or a file object (before upload)
        const fileName = typeof fileValue === 'string' 
          ? fileValue.split('/').pop() // Extract filename from URL
          : (fileValue?.name || fileValue?.fileName || null);
        const isFileUploaded = typeof fileValue === 'string' && fileValue.trim() !== '';
        const fileTypes = field.file_types || ['jpg', 'jpeg', 'png', 'pdf'];
        const maxSizeMB = field.max_size_mb || 5;
        const fileSubtext = `[Max: ${maxSizeMB}MB] (${fileTypes.join('/')})`;
        
        return (
          <View key={field.key} style={styles.fieldContainer}>
            <Text style={styles.label}>
              {field.label} {isRequired && <Text style={styles.asterisk}>*</Text>}
            </Text>
            <CustomUploadButton
              fileName={fileName}
              label={field.upload_label || 'Drag and drop or browse files to upload'}
              subtext={fileSubtext}
              onPress={() => handleFileUpload(field.key)}
              uploaded={isFileUploaded}
            />
          </View>
        );

      case 'phone':
        const needsOTP = field.verify_otp === true;
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
      } else if (field.type === 'file') {
        // For file fields, check if value is a string (URL) or valid file object
        // Empty string, null, undefined, or empty object means file is missing
        if (!value || value === null || value === undefined) {
          return true; // Missing
        }
        // If it's a string (URL), it's valid
        if (typeof value === 'string' && value.trim() !== '') {
          return false; // Has file URL
        }
        // If it's an object but has no URI, it's invalid
        if (typeof value === 'object' && !value.uri) {
          return true; // Missing
        }
        return false; // Has file
      }
      return !value || value.toString().trim() === '';
    });

    if (missingFields && missingFields.length > 0) {
      console.error('❌ [DynamicFormScreen] Validation failed - Missing required fields:');
      console.error('❌ [DynamicFormScreen] Missing Fields:', missingFields.map(f => `${f.key} (${f.type})`).join(', '));
      console.error('❌ [DynamicFormScreen] Current Form Data:', JSON.stringify(formData, null, 2));
      
      // Set errors for missing fields
      const errors = {};
      missingFields.forEach(field => {
        if (field.type === 'file') {
          errors[field.key] = sectionData?.messages?.validation?.file_required || 'Please upload the required document';
        } else {
          errors[field.key] = sectionData?.messages?.validation?.required_field || 'This field is required';
        }
      });
      setFieldErrors(errors);
      
      // Create a more specific error message
      const fileFields = missingFields.filter(f => f.type === 'file');
      const otherFields = missingFields.filter(f => f.type !== 'file');
      
      let validationMessage = '';
      if (fileFields.length > 0 && otherFields.length > 0) {
        validationMessage = `Please upload ${fileFields.length} document(s) and fill ${otherFields.length} field(s)`;
      } else if (fileFields.length > 0) {
        validationMessage = `Please upload ${fileFields.length} required document(s)`;
      } else {
        validationMessage = sectionData?.messages?.validation?.required_fields || 'Please fill all required fields';
      }
      
      showToast(validationMessage, 'error');
      return;
    }
    
    // Clear all errors if validation passes
    if (Object.keys(fieldErrors).length > 0) {
      setFieldErrors({});
    }

    // Build submission data (exclude OTP fields, file_urls are already stored)
    const submissionData = {};
    Object.keys(formData).forEach(key => {
      // Exclude OTP fields (keys ending with _otp or the otp_code field)
      if (!key.endsWith('_otp') && key !== 'otp_code') {
        submissionData[key] = formData[key];
      }
    });

    // Submit to API
    if (!partnerId) {
      console.error('❌ [DynamicFormScreen] Partner ID is missing');
      showToast('Partner ID is required. Please login again.', 'error');
      return;
    }

    try {
      setSubmitting(true);
      const endpoint = `${API_BASE_URL}v1/onboarding/submit-section?partner_id=${encodeURIComponent(partnerId)}`;
      const requestBody = {
        section_id: sectionId,
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
        const successMessage = sectionData?.messages?.success?.form_submitted || data.message || 'Form submitted successfully';
        showToast(successMessage, 'success');
        
        // Navigate to next screen
        if (onProceed) {
          onProceed(submissionData);
        }
      } else {
        console.error('❌ [DynamicFormScreen] Form submission failed');
        const errorMessage = data.message || 'Failed to submit form. Please try again.';
        showToast(errorMessage, 'error');
      }
    } catch (error) {
      console.error('❌ [DynamicFormScreen] Network error:', error);
      showToast('Network error. Please check your connection and try again.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
        <CustomHeader
          title={sectionData?.title || "Loading..."}
          onBack={onBack}
          showBackButton={true}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF6E1A" />
        </View>
      </SafeAreaView>
    );
  }

  if (!sectionData) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
        <CustomHeader
          title="Error"
          onBack={onBack}
          showBackButton={true}
        />
        <View style={styles.errorContainer}>
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
          title={sectionData.title || "Form"}
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
            {sectionData.description && (
              <InfoBanner text={sectionData.description} />
            )}

            <View style={styles.formContainer}>
              {sectionData.fields?.map(field => renderField(field))}
            </View>

            <View style={styles.buttonContainer}>
              <CustomButton
                title={sectionData.button_text || "Proceed"}
                onPress={handleProceed}
                disabled={submitting || uploading}
                loading={submitting || uploading}
              />
            </View>
          </ScrollView>
        </TouchableWithoutFeedback>

        <UploadBottomSheet
          visible={showUploadBottomSheet}
          onClose={() => setShowUploadBottomSheet(false)}
          onSelectGallery={handleSelectGallery}
          onSelectCamera={handleSelectCamera}
          onSelectFiles={handleSelectFiles}
        />
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  dropdownLoadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 5,
    paddingHorizontal: 5,
  },
});

export default DynamicFormScreen;
