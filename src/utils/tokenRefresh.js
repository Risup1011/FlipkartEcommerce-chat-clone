import { API_BASE_URL } from '../config';
import { getRefreshToken, storeTokens, clearTokens } from './tokenStorage';

/**
 * Refresh the access token using the refresh token
 * @returns {Promise<{accessToken: string, expiresIn: number} | null>} New access token and expiry, or null if failed
 */
export const refreshAccessToken = async () => {
  try {
    const refreshToken = await getRefreshToken();
    
    if (!refreshToken) {
      console.warn('⚠️ [TokenRefresh] No refresh token available');
      return null;
    }

    
    const response = await fetch(`${API_BASE_URL}v1/auth/refresh-token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        refresh_token: refreshToken,
      }),
    });

    const data = await response.json();
    

    if (response.ok && data.code === 200 && data.status === 'success') {
      const newAccessToken = data.data?.access_token;
      const expiresIn = data.data?.expires_in; // in seconds
      
      if (newAccessToken) {
        
        // Store the new access token (refresh token remains the same)
        await storeTokens(newAccessToken, refreshToken);
        
        return {
          accessToken: newAccessToken,
          expiresIn: expiresIn,
        };
      } else {
        console.error('❌ [TokenRefresh] No access token in refresh response');
        return null;
      }
    } else {
      // Refresh token expired or invalid
      console.error('❌ [TokenRefresh] Failed to refresh token');
      console.error('❌ [TokenRefresh] Response status:', response.status);
      console.error('❌ [TokenRefresh] Error:', data.message || data.error);
      
      // If refresh token is expired (401 or 403), clear all tokens
      if (response.status === 401 || response.status === 403) {
        console.warn('⚠️ [TokenRefresh] Refresh token expired or invalid - clearing tokens');
        await clearTokens();
      }
      
      return null;
    }
  } catch (error) {
    console.error('❌ [TokenRefresh] Network error while refreshing token:', error);
    return null;
  }
};

/**
 * Check if access token needs to be refreshed
 * This is a simple check - in production, you might want to decode JWT and check exp claim
 * @param {number} expiresIn - Token expiry time in seconds (from when it was issued)
 * @param {number} issuedAt - Timestamp when token was issued (in milliseconds)
 * @returns {boolean} True if token should be refreshed (within 5 minutes of expiry)
 */
export const shouldRefreshToken = (expiresIn, issuedAt) => {
  if (!expiresIn || !issuedAt) {
    return false;
  }
  
  const now = Date.now();
  const expiryTime = issuedAt + (expiresIn * 1000);
  const timeUntilExpiry = expiryTime - now;
  
  // Refresh if token expires in less than 5 minutes (300000 ms)
  const refreshThreshold = 5 * 60 * 1000; // 5 minutes
  
  return timeUntilExpiry < refreshThreshold;
};






