/**
 * API Configuration
 * Base URL for all API endpoints
 * 
 * To switch between URLs, comment/uncomment the desired URL below
 */

// Option 1: Mock API (for development/testing)
// export const API_BASE_URL = 'https://www.mockachino.com/ccff380f-7ee5-47/';

// Option 2: Staging API (production-like environment)
export const API_BASE_URL = 'http://kamai24-stage.eba-aejbahak.ap-south-1.elasticbeanstalk.com/partner/api/';

/**
 * Mock OTP Configuration (for development/testing)
 * 
 * Option 1: Frontend Bypass (enter "1234" as OTP)
 * - Uses MOCK_OTP_PARTNER_STATUS from config
 * 
 * Option 2: Use Mockachino API
 * - Configure the response in mockachino.com
 * - Change the partner_status in the API response body
 * - Or use different OTP codes to call different endpoints (see MOCK_OTP_ENDPOINTS)
 */
export const MOCK_OTP_PARTNER_STATUS = 'UNDER_REVIEW'; // For frontend bypass: 'NOT_STARTED', 'UNDER_REVIEW', or 'APPROVED'
export const MOCK_OTP_CODE = '1234'; // The OTP code that triggers the frontend bypass

/**
 * Mock OTP Endpoints Mapping
 * You can create separate endpoints on mockachino.com for different partner_status values
 * Or use the same endpoint and change the response body in mockachino
 * 
 * To use different endpoints based on OTP code:
 * - Create endpoints on mockachino.com with different partner_status values
 * - Map OTP codes to those endpoints here
 */
export const MOCK_OTP_ENDPOINTS = {
  // Use different OTP codes to test different statuses via API
  // Example: Enter "1111" → NOT_STARTED, "2222" → UNDER_REVIEW, "3333" → APPROVED
  // IMPORTANT: All verify-otp endpoints must be POST method in mockachino
  '1111': `${API_BASE_URL}v1/auth/verify-otp-not-started`, // NOT_STARTED endpoint
  '2222': `${API_BASE_URL}v1/auth/verify-otp-under-review`, // UNDER_REVIEW endpoint
  '3333': `${API_BASE_URL}v1/auth/verify-otp-approved`, // APPROVED endpoint
  // Add more mappings as needed
};

// Set to true to use different endpoints based on OTP code, false to use default endpoint
// When true: Enter 1111 → NOT_STARTED, 2222 → UNDER_REVIEW, 3333 → APPROVED
export const USE_MOCK_OTP_ENDPOINTS = true;

/**
 * API Configuration object
 * Can be extended with other API-related constants
 */
export const API_CONFIG = {
  BASE_URL: API_BASE_URL,
  MOCK_OTP_PARTNER_STATUS,
  MOCK_OTP_CODE,
  MOCK_OTP_ENDPOINTS,
  USE_MOCK_OTP_ENDPOINTS,
};

export default API_CONFIG;
