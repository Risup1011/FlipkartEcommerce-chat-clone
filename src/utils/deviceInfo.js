import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const DEVICE_ID_KEY = '@Kamai24:deviceId';

/**
 * Get or generate a unique device ID
 * Stores the device ID in AsyncStorage for persistence
 */
export const getDeviceId = async () => {
  try {
    // Try to get existing device ID from storage
    let deviceId = await AsyncStorage.getItem(DEVICE_ID_KEY);
    
    if (!deviceId) {
      // Generate a new device ID if not exists
      // Format: device-{platform}-{timestamp}-{random}
      const timestamp = Date.now();
      const random = Math.random().toString(36).substring(2, 9);
      deviceId = `device-${Platform.OS.toLowerCase()}-${timestamp}-${random}`;
      
      // Store it for future use
      await AsyncStorage.setItem(DEVICE_ID_KEY, deviceId);
      console.log('📱 [DeviceInfo] Generated new device ID:', deviceId);
    } else {
      console.log('📱 [DeviceInfo] Using existing device ID:', deviceId);
    }
    
    return deviceId;
  } catch (error) {
    console.error('❌ [DeviceInfo] Error getting device ID:', error);
    // Fallback device ID
    const fallbackId = `device-${Platform.OS.toLowerCase()}-${Date.now()}`;
    return fallbackId;
  }
};

/**
 * Get device model information
 */
export const getDeviceModel = () => {
  // React Native Platform doesn't provide device model directly
  // You can install react-native-device-info for more detailed info
  // For now, we'll use a generic approach
  if (Platform.OS === 'ios') {
    return Platform.constants.systemName || 'iOS Device';
  } else if (Platform.OS === 'android') {
    return Platform.constants.Brand || 'Android Device';
  }
  return 'Unknown Device';
};

/**
 * Get app version from package.json
 */
export const getAppVersion = () => {
  // You can get this from app.json or package.json
  // For now, using a constant - you can make this dynamic
  return '1.0.0';
};

/**
 * Get device type (ANDROID or IOS)
 */
export const getDeviceType = () => {
  return Platform.OS === 'ios' ? 'IOS' : 'ANDROID';
};

/**
 * Get complete device information object
 * Returns: { device_id, device_info: { device_model, app_version, device_type } }
 */
export const getDeviceInfo = async () => {
  const deviceId = await getDeviceId();
  const deviceModel = getDeviceModel();
  const appVersion = getAppVersion();
  const deviceType = getDeviceType();

  return {
    device_id: deviceId,
    device_info: {
      device_model: deviceModel,
      app_version: appVersion,
      device_type: deviceType,
    },
  };
};

