import AsyncStorage from '@react-native-async-storage/async-storage';

// Storage keys for tokens
export const ACCESS_TOKEN_KEY = '@Kamai24:accessToken';
export const REFRESH_TOKEN_KEY = '@Kamai24:refreshToken';

/**
 * Store access token in AsyncStorage
 */
export const storeAccessToken = async (token) => {
  try {
    await AsyncStorage.setItem(ACCESS_TOKEN_KEY, token);
    return true;
  } catch (error) {
    console.error('❌ [TokenStorage] Error storing access token:', error);
    return false;
  }
};

/**
 * Store refresh token in AsyncStorage
 */
export const storeRefreshToken = async (token) => {
  try {
    await AsyncStorage.setItem(REFRESH_TOKEN_KEY, token);
    return true;
  } catch (error) {
    console.error('❌ [TokenStorage] Error storing refresh token:', error);
    return false;
  }
};

/**
 * Store both tokens in AsyncStorage
 */
export const storeTokens = async (accessToken, refreshToken) => {
  const accessStored = await storeAccessToken(accessToken);
  const refreshStored = await storeRefreshToken(refreshToken);
  return accessStored && refreshStored;
};

/**
 * Get access token from AsyncStorage
 */
export const getAccessToken = async () => {
  try {
    const token = await AsyncStorage.getItem(ACCESS_TOKEN_KEY);
    return token;
  } catch (error) {
    console.error('❌ [TokenStorage] Error getting access token:', error);
    return null;
  }
};

/**
 * Get refresh token from AsyncStorage
 */
export const getRefreshToken = async () => {
  try {
    const token = await AsyncStorage.getItem(REFRESH_TOKEN_KEY);
    return token;
  } catch (error) {
    console.error('❌ [TokenStorage] Error getting refresh token:', error);
    return null;
  }
};

/**
 * Get both tokens from AsyncStorage
 */
export const getTokens = async () => {
  const accessToken = await getAccessToken();
  const refreshToken = await getRefreshToken();
  return { accessToken, refreshToken };
};

/**
 * Remove access token from AsyncStorage
 */
export const removeAccessToken = async () => {
  try {
    await AsyncStorage.removeItem(ACCESS_TOKEN_KEY);
    return true;
  } catch (error) {
    console.error('❌ [TokenStorage] Error removing access token:', error);
    return false;
  }
};

/**
 * Remove refresh token from AsyncStorage
 */
export const removeRefreshToken = async () => {
  try {
    await AsyncStorage.removeItem(REFRESH_TOKEN_KEY);
    return true;
  } catch (error) {
    console.error('❌ [TokenStorage] Error removing refresh token:', error);
    return false;
  }
};

/**
 * Remove both tokens from AsyncStorage (logout)
 */
export const clearTokens = async () => {
  const accessRemoved = await removeAccessToken();
  const refreshRemoved = await removeRefreshToken();
  return accessRemoved && refreshRemoved;
};

/**
 * Check if user is authenticated (has access token)
 */
export const isAuthenticated = async () => {
  const token = await getAccessToken();
  return token !== null;
};











