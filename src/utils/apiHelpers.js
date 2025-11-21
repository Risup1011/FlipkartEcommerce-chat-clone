import { getAccessToken } from './tokenStorage';
import { refreshAccessToken } from './tokenRefresh';

// Track if a token refresh is in progress to avoid multiple simultaneous refresh calls
let isRefreshing = false;
let refreshPromise = null;

/**
 * Wrapper for fetch that automatically handles token refresh on 401
 * Use this instead of regular fetch for authenticated API calls
 * @param {string} url - API endpoint URL
 * @param {Object} options - Fetch options (method, headers, body, etc.)
 * @param {boolean} includeAuth - Whether this is an authenticated request (default: true)
 * @returns {Promise<Response>} Fetch response
 */
export const fetchWithAuth = async (url, options = {}, includeAuth = true) => {
  // Detect if this is a FormData request (for file uploads)
  const isFormData = options.body instanceof FormData;
  
  // First, ensure we have auth headers if needed
  if (includeAuth) {
    const headers = await getApiHeaders(true);
    // For FormData requests, don't set Content-Type - React Native will set it automatically with boundary
    if (isFormData && headers['Content-Type']) {
      delete headers['Content-Type'];
    }
    options.headers = {
      ...headers,
      ...(options.headers || {}),
    };
  }
  
  
  let response = await fetch(url, options);
  
  // Handle 401 Unauthorized - token expired, try to refresh
  if (response.status === 401 && includeAuth) {
    console.warn('⚠️ [ApiHelpers] Received 401 Unauthorized - attempting token refresh...');
    
    // Prevent multiple simultaneous refresh calls
    if (!isRefreshing) {
      isRefreshing = true;
      refreshPromise = refreshAccessToken();
    }
    
    const refreshResult = await refreshPromise;
    isRefreshing = false;
    refreshPromise = null;
    
    if (refreshResult && refreshResult.accessToken) {
      // Retry the request with new token
      const newHeaders = await getApiHeaders(true);
      // For FormData requests, don't set Content-Type
      if (isFormData && newHeaders['Content-Type']) {
        delete newHeaders['Content-Type'];
      }
      const retryOptions = {
        ...options,
        headers: {
          ...newHeaders,
          // Preserve any custom headers (like Content-Type for multipart/form-data)
          ...(options.headers || {}),
        },
      };
      
      response = await fetch(url, retryOptions);
    } else {
      console.error('❌ [ApiHelpers] Failed to refresh token - user needs to re-authenticate');
      // Token refresh failed - tokens cleared, user needs to login again
      // You might want to trigger a logout/navigation to login screen here
    }
  }
  
  return response;
};

/**
 * Get headers for API requests with optional authorization
 * @param {boolean} includeAuth - Whether to include Authorization header (default: true)
 * @returns {Promise<Object>} Headers object
 */
export const getApiHeaders = async (includeAuth = true) => {
  const headers = {
    'Content-Type': 'application/json',
  };

  if (includeAuth) {
    const accessToken = await getAccessToken();
    if (accessToken) {
      headers['Authorization'] = `Bearer ${accessToken}`;
    } else {
      console.warn('⚠️ [ApiHelpers] No access token available, request will be unauthenticated');
    }
  }

  return headers;
};

/**
 * Make an authenticated API request with automatic token refresh on 401
 * @param {string} url - API endpoint URL
 * @param {Object} options - Fetch options (method, body, etc.)
 * @param {boolean} includeAuth - Whether to include Authorization header (default: true)
 * @param {boolean} retryOn401 - Whether to retry request after token refresh on 401 (default: true)
 * @returns {Promise<Response>} Fetch response
 */
export const authenticatedFetch = async (url, options = {}, includeAuth = true, retryOn401 = true) => {
  const headers = await getApiHeaders(includeAuth);
  
  const fetchOptions = {
    ...options,
    headers: {
      ...headers,
      ...(options.headers || {}), // Allow overriding headers if needed
    },
  };

  let response = await fetch(url, fetchOptions);
  
  // Handle 401 Unauthorized - token expired, try to refresh
  if (response.status === 401 && includeAuth && retryOn401) {
    console.warn('⚠️ [ApiHelpers] Received 401 Unauthorized - attempting token refresh...');
    
    const refreshResult = await refreshAccessToken();
    
    if (refreshResult && refreshResult.accessToken) {
      // Retry the request with new token
      const newHeaders = await getApiHeaders(includeAuth);
      const retryOptions = {
        ...options,
        headers: {
          ...newHeaders,
          ...(options.headers || {}),
        },
      };
      
      response = await fetch(url, retryOptions);
    } else {
      console.error('❌ [ApiHelpers] Failed to refresh token - user needs to re-authenticate');
      // Token refresh failed - tokens cleared, user needs to login again
    }
  }
  
  return response;
};
