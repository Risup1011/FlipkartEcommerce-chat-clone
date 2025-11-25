import messaging from '@react-native-firebase/messaging';
import { Platform, PermissionsAndroid } from 'react-native';

/**
 * Request notification permissions (Android 13+)
 */
export const requestNotificationPermission = async () => {
  try {
    if (Platform.OS === 'android') {
      // Android 13+ requires POST_NOTIFICATIONS permission
      if (Platform.Version >= 33) {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
        );
        
        if (granted === PermissionsAndroid.RESULTS.GRANTED) {
          console.log('✅ [NotificationService] Notification permission granted');
          return true;
        } else {
          console.warn('⚠️ [NotificationService] Notification permission denied');
          return false;
        }
      } else {
        // Android 12 and below - no permission needed
        console.log('✅ [NotificationService] No permission needed for Android < 13');
        return true;
      }
    }
    
    // iOS would go here in future
    return true;
  } catch (error) {
    console.error('❌ [NotificationService] Error requesting notification permission:', error);
    return false;
  }
};

/**
 * Get FCM token
 */
export const getFCMToken = async () => {
  try {
    // Request permission first
    const hasPermission = await requestNotificationPermission();
    
    if (!hasPermission) {
      console.warn('⚠️ [NotificationService] Cannot get FCM token - permission denied');
      return null;
    }

    // Get FCM token
    const token = await messaging().getToken();
    
    if (token) {
      console.log('✅ [NotificationService] FCM Token obtained');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('📋 FCM TOKEN (Copy for Postman):');
      console.log(token);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      return token;
    } else {
      console.warn('⚠️ [NotificationService] No FCM token available');
      return null;
    }
  } catch (error) {
    console.error('❌ [NotificationService] Error getting FCM token:', error);
    return null;
  }
};

/**
 * Initialize notification listeners
 */
export const initializeNotifications = (onNotificationReceived) => {
  try {
    console.log('🔔 [NotificationService] Initializing notification listeners...');

    // Handle foreground notifications (when app is open)
    const unsubscribeForeground = messaging().onMessage(async remoteMessage => {
      console.log('🔔 [NotificationService] Foreground notification received:', remoteMessage);
      
      if (onNotificationReceived) {
        onNotificationReceived(remoteMessage);
      }
    });

    // Handle notification opened app (when app is in background/quit and user taps notification)
    messaging().onNotificationOpenedApp(remoteMessage => {
      console.log('🔔 [NotificationService] Notification opened app (background):', remoteMessage);
      
      if (onNotificationReceived) {
        onNotificationReceived(remoteMessage);
      }
    });

    // Check if app was opened by a notification (when app was quit)
    messaging()
      .getInitialNotification()
      .then(remoteMessage => {
        if (remoteMessage) {
          console.log('🔔 [NotificationService] Notification opened app (quit state):', remoteMessage);
          
          if (onNotificationReceived) {
            onNotificationReceived(remoteMessage);
          }
        }
      });

    // Handle token refresh
    const unsubscribeTokenRefresh = messaging().onTokenRefresh(token => {
      console.log('🔄 [NotificationService] FCM token refreshed:', token);
      // TODO: Send updated token to backend
    });

    console.log('✅ [NotificationService] Notification listeners initialized');

    // Return cleanup function
    return () => {
      unsubscribeForeground();
      unsubscribeTokenRefresh();
    };
  } catch (error) {
    console.error('❌ [NotificationService] Error initializing notifications:', error);
    return () => {};
  }
};

/**
 * Check if notification permission is granted
 */
export const checkNotificationPermission = async () => {
  try {
    const authStatus = await messaging().hasPermission();
    const enabled =
      authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
      authStatus === messaging.AuthorizationStatus.PROVISIONAL;

    console.log('🔍 [NotificationService] Notification permission status:', enabled ? 'Granted' : 'Denied');
    return enabled;
  } catch (error) {
    console.error('❌ [NotificationService] Error checking notification permission:', error);
    return false;
  }
};
