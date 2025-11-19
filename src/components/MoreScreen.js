import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Image,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Poppins, icons, images } from '../assets';
import { useToast } from './ToastContext';
import { fetchWithAuth } from '../utils/apiHelpers';
import { API_BASE_URL } from '../config';
import { clearTokens } from '../utils/tokenStorage';
import PowerToggle from './PowerToggle';

const MoreScreen = ({ partnerStatus, onLogout, navigation, onNavigate, configData: configDataProp }) => {
  const { showToast } = useToast();
  const [moreData, setMoreData] = useState(null);
  const [isLoadingMoreData, setIsLoadingMoreData] = useState(true);
  const [isTogglingOrders, setIsTogglingOrders] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [configData, setConfigData] = useState(configDataProp || null);
  const [isLoadingConfigData, setIsLoadingConfigData] = useState(!configDataProp);

  // Fetch config data for restaurant info (for header) - only if not provided as prop
  useEffect(() => {
    // If configData is provided as prop, use it and skip fetching
    if (configDataProp) {
      setConfigData(configDataProp);
      setIsLoadingConfigData(false);
      return;
    }

    // Otherwise, fetch it
    const fetchConfigData = async () => {
      try {
        setIsLoadingConfigData(true);
        const url = `${API_BASE_URL}v1/config`;
        console.log('📡 [MoreScreen] ========================================');
        console.log('📡 [MoreScreen] FETCHING CONFIG DATA');
        console.log('📡 [MoreScreen] ========================================');
        console.log('📡 [MoreScreen] URL:', url);
        
        const response = await fetchWithAuth(url, {
          method: 'GET',
        });

        const data = await response.json();
        console.log('📥 [MoreScreen] Config API Response Status:', response.status);
        console.log('📥 [MoreScreen] Config API Response:', JSON.stringify(data, null, 2));

        if (response.ok && data.code === 200 && data.status === 'success') {
          console.log('✅ [MoreScreen] Config data loaded successfully');
          console.log('📋 [MoreScreen] Partner Info:', JSON.stringify(data.data?.partner_info, null, 2));
          setConfigData(data.data);
        } else {
          console.error('❌ [MoreScreen] Failed to load config data:', data.message);
        }
      } catch (error) {
        console.error('❌ [MoreScreen] Error fetching config:', error);
      } finally {
        setIsLoadingConfigData(false);
        console.log('📡 [MoreScreen] Config data loading completed');
      }
    };

    fetchConfigData();
  }, [configDataProp]);

  // Fetch more screen data from backend
  useEffect(() => {
    const fetchMoreData = async () => {
      try {
        setIsLoadingMoreData(true);
        const url = `${API_BASE_URL}v1/more`;
        console.log('📡 [MoreScreen] ========================================');
        console.log('📡 [MoreScreen] FETCHING MORE SCREEN DATA');
        console.log('📡 [MoreScreen] ========================================');
        console.log('📡 [MoreScreen] URL:', url);
        
        const response = await fetchWithAuth(url, {
          method: 'GET',
        });

        const data = await response.json();
        console.log('📥 [MoreScreen] More API Response Status:', response.status);
        console.log('📥 [MoreScreen] More API Full Response:', JSON.stringify(data, null, 2));

        if (response.ok && data.code === 200 && data.status === 'success') {
          console.log('✅ [MoreScreen] More screen data loaded successfully');
          console.log('📋 [MoreScreen] Screen Title:', data.data?.screen_title);
          console.log('📋 [MoreScreen] Receiving Orders:', JSON.stringify(data.data?.receiving_orders, null, 2));
          console.log('📋 [MoreScreen] Menu Items Count:', data.data?.menu_items?.length || 0);
          console.log('📋 [MoreScreen] Menu Items:', JSON.stringify(data.data?.menu_items, null, 2));
          console.log('📋 [MoreScreen] Help Section Count:', data.data?.help_section?.length || 0);
          console.log('📋 [MoreScreen] Help Section:', JSON.stringify(data.data?.help_section, null, 2));
          console.log('📋 [MoreScreen] Logout Section Count:', data.data?.logout_section?.length || 0);
          console.log('📋 [MoreScreen] Logout Section:', JSON.stringify(data.data?.logout_section, null, 2));
          setMoreData(data.data);
        } else {
          console.error('❌ [MoreScreen] Failed to fetch more data:', data.message);
          showToast(data.message || 'Failed to load more screen data', 'error');
        }
      } catch (error) {
        console.error('❌ [MoreScreen] Error fetching more data:', error);
        showToast('Failed to load more screen data', 'error');
      } finally {
        setIsLoadingMoreData(false);
        console.log('📡 [MoreScreen] More screen data loading completed');
      }
    };

    fetchMoreData();
  }, []);

  // Fetch settings to get current receiving orders status (only once when moreData is loaded)
  useEffect(() => {
    if (!moreData || isLoadingMoreData) return;

    const fetchSettings = async () => {
      try {
        const url = `${API_BASE_URL}v1/settings`;
        console.log('📡 [MoreScreen] ========================================');
        console.log('📡 [MoreScreen] FETCHING SETTINGS DATA');
        console.log('📡 [MoreScreen] ========================================');
        console.log('📡 [MoreScreen] URL:', url);
        
        const response = await fetchWithAuth(url, {
          method: 'GET',
        });

        const data = await response.json();
        console.log('📥 [MoreScreen] Settings API Response Status:', response.status);
        console.log('📥 [MoreScreen] Settings API Response:', JSON.stringify(data, null, 2));

        if (response.ok && data.code === 200 && data.status === 'success') {
          console.log('✅ [MoreScreen] Settings data loaded successfully');
          console.log('📋 [MoreScreen] Receiving Orders Status:', data.data?.receiving_orders?.is_accepting);
          console.log('📋 [MoreScreen] Closing Info:', data.data?.receiving_orders?.closing_info);
          console.log('📋 [MoreScreen] Default Prep Time:', data.data?.default_prep_time_minutes);
          
          // Update moreData with current receiving orders status
          setMoreData(prev => {
            if (!prev) return prev;
            const newToggle = data.data?.receiving_orders?.is_accepting || false;
            const newSubtitle = data.data?.receiving_orders?.closing_info || prev.receiving_orders?.subtitle;
            
            console.log('🔄 [MoreScreen] Updating receiving orders state:');
            console.log('  - Old toggle_enabled:', prev.receiving_orders?.toggle_enabled);
            console.log('  - New toggle_enabled:', newToggle);
            console.log('  - Old subtitle:', prev.receiving_orders?.subtitle);
            console.log('  - New subtitle:', newSubtitle);
            
            return {
              ...prev,
              receiving_orders: {
                ...prev.receiving_orders,
                toggle_enabled: newToggle,
                subtitle: newSubtitle,
              },
            };
          });
        } else {
          console.error('❌ [MoreScreen] Failed to load settings:', data.message);
        }
      } catch (error) {
        console.error('❌ [MoreScreen] Error fetching settings:', error);
      } finally {
        console.log('📡 [MoreScreen] Settings data loading completed');
      }
    };

    fetchSettings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [moreData?.screen_title]); // Only run when moreData is first loaded (screen_title is stable)

  const handleReceivingOrdersToggle = async (value) => {
    try {
      setIsTogglingOrders(true);
      const url = `${API_BASE_URL}v1/settings/order-receiving`;
      console.log('📡 [MoreScreen] ========================================');
      console.log('📡 [MoreScreen] TOGGLING ORDER RECEIVING');
      console.log('📡 [MoreScreen] ========================================');
      console.log('📡 [MoreScreen] URL:', url);
      console.log('📡 [MoreScreen] New Value (is_accepting):', value);
      console.log('📡 [MoreScreen] Current State:', moreData?.receiving_orders);
      
      const requestBody = {
        is_accepting: value,
      };
      console.log('📤 [MoreScreen] Request Body:', JSON.stringify(requestBody, null, 2));
      
      const response = await fetchWithAuth(url, {
        method: 'PATCH',
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();
      console.log('📥 [MoreScreen] Toggle Order Receiving Response Status:', response.status);
      console.log('📥 [MoreScreen] Toggle Order Receiving Response:', JSON.stringify(data, null, 2));

      if (response.ok && data.code === 200 && data.status === 'success') {
        console.log('✅ [MoreScreen] Order receiving status updated successfully');
        console.log('📋 [MoreScreen] Updated is_accepting:', data.data?.is_accepting);
        console.log('📋 [MoreScreen] Updated closing_info:', data.data?.closing_info);
        console.log('📋 [MoreScreen] Paused at:', data.data?.paused_at);
        console.log('📋 [MoreScreen] Paused reason:', data.data?.paused_reason);
        
        // Update local state with new data
        setMoreData(prev => {
          const updated = {
            ...prev,
            receiving_orders: {
              ...prev?.receiving_orders,
              toggle_enabled: data.data?.is_accepting || value,
              subtitle: data.data?.closing_info || prev?.receiving_orders?.subtitle,
            },
          };
          console.log('🔄 [MoreScreen] Updated moreData state:', JSON.stringify(updated.receiving_orders, null, 2));
          return updated;
        });
        showToast(
          value ? 'Receiving orders enabled' : 'Receiving orders disabled',
          'success'
        );
      } else {
        console.error('❌ [MoreScreen] Failed to update order receiving status:', data.message);
        showToast(data.message || 'Failed to update order receiving status', 'error');
      }
    } catch (error) {
      console.error('❌ [MoreScreen] Error toggling order receiving:', error);
      showToast('Failed to update order receiving status', 'error');
    } finally {
      setIsTogglingOrders(false);
      console.log('📡 [MoreScreen] Toggle order receiving completed');
    }
  };

  const handleMenuItemPress = (menuItem) => {
    console.log('📡 [MoreScreen] ========================================');
    console.log('📡 [MoreScreen] MENU ITEM PRESSED');
    console.log('📡 [MoreScreen] ========================================');
    console.log('📋 [MoreScreen] Menu Item ID:', menuItem.id);
    console.log('📋 [MoreScreen] Menu Item Title:', menuItem.title);
    console.log('📋 [MoreScreen] Menu Item Icon:', menuItem.icon);
    console.log('📋 [MoreScreen] Menu Item Route:', menuItem.route);
    console.log('📋 [MoreScreen] Menu Item Show Arrow:', menuItem.show_arrow);
    console.log('📋 [MoreScreen] Full Menu Item Data:', JSON.stringify(menuItem, null, 2));
    
    // Handle navigation based on route
    if (menuItem.route) {
      // Extract route path (remove leading slash if present)
      const route = menuItem.route.startsWith('/') ? menuItem.route.substring(1) : menuItem.route;
      console.log('🔄 [MoreScreen] Extracted Route:', route);
      
      // Map routes to navigation actions
      if (onNavigate) {
        switch (route) {
          case 'outlet-timings':
            console.log('📍 [MoreScreen] Navigating to: Outlet Timings');
            onNavigate('outletTimings');
            break;
          case 'prep-time':
            console.log('📍 [MoreScreen] Navigating to: Prep Time');
            onNavigate('prepTime');
            break;
          case 'account-settings':
            console.log('📍 [MoreScreen] Navigating to: Account Settings');
            onNavigate('accountSettings');
            break;
          case 'past-orders':
            console.log('📍 [MoreScreen] Navigating to: Past Orders');
            onNavigate('pastOrders');
            break;
          case 'partner-faqs':
            console.log('📍 [MoreScreen] Navigating to: Partner FAQs');
            onNavigate('partnerFaqs');
            break;
          case 'compliance':
            console.log('📍 [MoreScreen] Navigating to: Compliance');
            onNavigate('compliance');
            break;
          case 'help-center':
            console.log('📍 [MoreScreen] Navigating to: Help Center');
            onNavigate('helpCenter');
            break;
          default:
            console.log('📍 [MoreScreen] Unknown route, showing toast:', route);
            showToast(`${menuItem.title} - Coming soon`, 'info');
        }
      } else {
        console.warn('⚠️  [MoreScreen] onNavigate callback not provided');
        showToast(`${menuItem.title} - Coming soon`, 'info');
      }
    } else {
      console.log('⚠️  [MoreScreen] No route specified for menu item');
      showToast(`${menuItem.title} - Coming soon`, 'info');
    }
  };

  // Get UI labels from config with fallbacks
  const getUILabel = (key, fallback) => {
    return configData?.logout_labels?.[key] || 
           configData?.ui_labels?.[key] || 
           fallback;
  };

  const handleLogout = () => {
    console.log('📡 [MoreScreen] ========================================');
    console.log('📡 [MoreScreen] LOGOUT BUTTON PRESSED');
    console.log('📡 [MoreScreen] ========================================');
    console.log('📋 [MoreScreen] Logout Section Data:', JSON.stringify(moreData?.logout_section?.[0], null, 2));
    console.log('📋 [MoreScreen] Config Data Available:', !!configData);
    console.log('📋 [MoreScreen] Logout Labels Available:', !!configData?.logout_labels);
    
    // Get dynamic labels with fallbacks
    const logoutTitle = getUILabel('logout_title', 'Logout');
    const logoutMessage = getUILabel('logout_confirmation_message', 'Are you sure you want to logout?');
    const cancelButton = getUILabel('cancel_button', 'Cancel');
    const logoutButton = getUILabel('logout_button', 'Logout');
    
    console.log('📋 [MoreScreen] Using Logout Title:', logoutTitle);
    console.log('📋 [MoreScreen] Using Logout Message:', logoutMessage);
    console.log('📋 [MoreScreen] Using Cancel Button:', cancelButton);
    console.log('📋 [MoreScreen] Using Logout Button:', logoutButton);
    console.log('📡 [MoreScreen] ========================================');
    
    // Show confirmation popup before logging out
    Alert.alert(
      logoutTitle,
      logoutMessage,
      [
        {
          text: cancelButton,
          style: 'cancel',
          onPress: () => {
            console.log('📡 [MoreScreen] Logout cancelled by user');
          },
        },
        {
          text: logoutButton,
          style: 'destructive',
          onPress: async () => {
            console.log('📡 [MoreScreen] User confirmed logout');
            await performLogout();
          },
        },
      ],
      { cancelable: true }
    );
  };

  const performLogout = async () => {
    try {
      setIsLoggingOut(true);
      
      console.log('📡 [MoreScreen] ========================================');
      console.log('📡 [MoreScreen] PERFORMING LOGOUT');
      console.log('📡 [MoreScreen] ========================================');
      console.log('📋 [MoreScreen] More Data Available:', !!moreData);
      console.log('📋 [MoreScreen] Logout Section Available:', !!moreData?.logout_section);
      console.log('📋 [MoreScreen] Logout Section Length:', moreData?.logout_section?.length || 0);
      
      // Call logout API
      const logoutUrl = moreData?.logout_section?.[0]?.route || `${API_BASE_URL}v1/auth/logout`;
      const isFullUrl = logoutUrl.startsWith('http');
      
      // Construct final URL - handle routes that may already include /partner/api/
      let url;
      if (isFullUrl) {
        url = logoutUrl;
      } else {
        // Remove leading slash if present
        let route = logoutUrl.startsWith('/') ? logoutUrl.substring(1) : logoutUrl;
        
        // Check if route already includes /partner/api/ - if so, remove it to avoid duplication
        if (route.startsWith('partner/api/')) {
          route = route.substring('partner/api/'.length);
          console.log('📋 [MoreScreen] Removed duplicate /partner/api/ prefix, route now:', route);
        }
        
        // Construct final URL
        url = `${API_BASE_URL}${route}`;
      }
      
      const method = moreData?.logout_section?.[0]?.method || 'POST';
      
      console.log('📋 [MoreScreen] Logout Section Data:', JSON.stringify(moreData?.logout_section?.[0], null, 2));
      console.log('📋 [MoreScreen] Original Logout URL:', logoutUrl);
      console.log('📋 [MoreScreen] URL Source:', moreData?.logout_section?.[0]?.route ? 'BACKEND' : 'FALLBACK');
      console.log('📋 [MoreScreen] Is Full URL:', isFullUrl);
      console.log('📋 [MoreScreen] API Base URL:', API_BASE_URL);
      console.log('📋 [MoreScreen] Final URL:', url);
      console.log('📋 [MoreScreen] Method:', method);
      console.log('📋 [MoreScreen] Method Source:', moreData?.logout_section?.[0]?.method ? 'BACKEND' : 'FALLBACK');
      
      try {
        console.log('📡 [MoreScreen] Making logout API call...');
        console.log('📡 [MoreScreen] Request URL:', url);
        console.log('📡 [MoreScreen] Request Method:', method);
        
        const response = await fetchWithAuth(url, {
          method: method,
        });

        const data = await response.json();
        console.log('📥 [MoreScreen] Logout Response Status:', response.status);
        console.log('📥 [MoreScreen] Logout Response Headers:', JSON.stringify(response.headers || {}, null, 2));
        console.log('📥 [MoreScreen] Logout Response Body:', JSON.stringify(data, null, 2));

        if (response.ok && (data.code === 200 || data.status === 'success')) {
          console.log('✅ [MoreScreen] Logout API call successful');
          console.log('📋 [MoreScreen] Response Code:', data.code);
          console.log('📋 [MoreScreen] Response Status:', data.status);
          console.log('📋 [MoreScreen] Response Message:', data.message);
        } else {
          console.log('⚠️  [MoreScreen] Logout API returned non-success status, but continuing with logout');
          console.log('📋 [MoreScreen] Response Code:', data.code);
          console.log('📋 [MoreScreen] Response Status:', data.status);
          console.log('📋 [MoreScreen] Response Message:', data.message);
        }
      } catch (apiError) {
        console.error('❌ [MoreScreen] Logout API error (continuing with logout):', apiError);
        console.error('❌ [MoreScreen] Error Type:', apiError?.constructor?.name);
        console.error('❌ [MoreScreen] Error Message:', apiError?.message);
        console.error('❌ [MoreScreen] Error Stack:', apiError?.stack);
        // Continue with logout even if API call fails
      }

      // Clear tokens regardless of API response
      console.log('🗑️  [MoreScreen] Clearing tokens...');
      await clearTokens();
      console.log('✅ [MoreScreen] Tokens cleared');
      
      // Get dynamic success message
      const successMessage = getUILabel('logout_success_message', 'Logged out successfully');
      console.log('📋 [MoreScreen] Using Success Message:', successMessage);
      console.log('📋 [MoreScreen] Success Message Source:', 
        configData?.logout_labels?.logout_success_message ? 'BACKEND' : 
        configData?.ui_labels?.logout_success_message ? 'UI_LABELS' : 'FALLBACK');
      
      // Show toast
      showToast(successMessage, 'success');
      
      // Call onLogout callback to navigate to OTP screen and clear all data
      if (onLogout) {
        console.log('🔄 [MoreScreen] Calling onLogout callback to navigate to OTP screen');
        onLogout();
      } else {
        console.warn('⚠️  [MoreScreen] onLogout callback not provided');
      }
    } catch (error) {
      console.error('❌ [MoreScreen] Error during logout process:', error);
      // Clear tokens even if there's an error
      try {
        await clearTokens();
        console.log('✅ [MoreScreen] Tokens cleared after error');
      } catch (clearError) {
        console.error('❌ [MoreScreen] Error clearing tokens:', clearError);
      }
      
      // Get dynamic success message
      const successMessage = getUILabel('logout_success_message', 'Logged out successfully');
      console.log('📋 [MoreScreen] Using Success Message (after error):', successMessage);
      showToast(successMessage, 'success');
      
      // Call onLogout callback even if there's an error
      if (onLogout) {
        console.log('🔄 [MoreScreen] Calling onLogout callback after error');
        onLogout();
      }
    } finally {
      setIsLoggingOut(false);
      console.log('📡 [MoreScreen] ========================================');
      console.log('📡 [MoreScreen] LOGOUT PROCESS COMPLETED');
      console.log('📡 [MoreScreen] ========================================');
      console.log('📋 [MoreScreen] Summary:');
      console.log('  - API Call: Completed (may have succeeded or failed)');
      console.log('  - Tokens: Cleared');
      console.log('  - Navigation: onLogout callback called');
      console.log('  - UI Labels: Dynamic from configData');
      console.log('  - Logout URL: ' + (moreData?.logout_section?.[0]?.route ? 'BACKEND' : 'FALLBACK'));
      console.log('  - Logout Method: ' + (moreData?.logout_section?.[0]?.method ? 'BACKEND' : 'FALLBACK'));
      console.log('📡 [MoreScreen] ========================================');
    }
  };

  // Check if backend provides actual icon URL/image (not just identifier)
  const hasBackendIcon = (item) => {
    // Only return true if backend provides actual icon URL/image
    // Check for URL patterns (http/https) or image data
    const iconUrl = item?.icon_url || item?.icon_image;
    if (iconUrl && (iconUrl.startsWith('http://') || iconUrl.startsWith('https://') || iconUrl.startsWith('data:'))) {
      return true;
    }
    // Don't show icons if backend only provides identifier strings like "outlet_timings"
    return false;
  };

  // Render icon only if backend provides icon URL/image
  const renderIcon = (item) => {
    // Only render if backend provides actual icon URL/image
    if (item?.icon_url) {
      return (
        <Image
          source={{ uri: item.icon_url }}
          style={styles.menuItemIconImage}
          resizeMode="contain"
        />
      );
    } else if (item?.icon_image) {
      return (
        <Image
          source={{ uri: item.icon_image }}
          style={styles.menuItemIconImage}
          resizeMode="contain"
        />
      );
    }
    // Don't render anything if backend doesn't provide icon
    return null;
  };

  // Render chevron arrow
  const renderChevron = () => {
    return <Text style={styles.chevron}>›</Text>;
  };

  // Log header data source whenever configData changes
  useEffect(() => {
    console.log('📋 [MoreScreen] ========================================');
    console.log('📋 [MoreScreen] HEADER DATA SOURCE CHECK');
    console.log('📋 [MoreScreen] ========================================');
    console.log('📋 [MoreScreen] configData exists:', !!configData);
    console.log('📋 [MoreScreen] partner_info exists:', !!configData?.partner_info);
    
    if (configData?.partner_info) {
      console.log('✅ [MoreScreen] USING BACKEND DATA for header');
      console.log('📋 [MoreScreen] Backend partner_info:', JSON.stringify(configData.partner_info, null, 2));
      
      const businessName = configData.partner_info.business_name;
      const onlineStatus = configData.partner_info.online_status;
      const closingInfo = configData.partner_info.closing_info;
      
      console.log('📋 [MoreScreen] Business Name:', businessName ? `✅ "${businessName}" - FROM BACKEND` : '⚠️  MISSING - Using fallback: "Restaurant Name"');
      console.log('📋 [MoreScreen] Online Status:', onlineStatus ? `✅ "${onlineStatus}" - FROM BACKEND` : '⚠️  MISSING - Using fallback: "Online"');
      console.log('📋 [MoreScreen] Closing Info:', closingInfo ? `✅ "${closingInfo}" - FROM BACKEND` : '⚠️  MISSING - Using fallback: "Closes at 12:00 am, Tomorrow"');
    } else {
      console.log('⚠️  [MoreScreen] USING FRONTEND FALLBACK DATA for header');
      console.log('📋 [MoreScreen] Business Name: "Restaurant Name" (FALLBACK)');
      console.log('📋 [MoreScreen] Online Status: "Online" (FALLBACK)');
      console.log('📋 [MoreScreen] Closing Info: "Closes at 12:00 am, Tomorrow" (FALLBACK)');
    }
    console.log('📋 [MoreScreen] ========================================');
  }, [configData]);

  // Log moreData structure when it changes
  useEffect(() => {
    if (moreData) {
      console.log('📋 [MoreScreen] ========================================');
      console.log('📋 [MoreScreen] MORE DATA STRUCTURE');
      console.log('📋 [MoreScreen] ========================================');
      console.log('📋 [MoreScreen] Screen Title:', moreData.screen_title);
      console.log('📋 [MoreScreen] Receiving Orders:', JSON.stringify(moreData.receiving_orders, null, 2));
      console.log('📋 [MoreScreen] Menu Items Count:', moreData.menu_items?.length || 0);
      if (moreData.menu_items && moreData.menu_items.length > 0) {
        console.log('📋 [MoreScreen] Menu Items:');
        moreData.menu_items.forEach((item, index) => {
          console.log(`  ${index + 1}. ${item.id} - ${item.title} (${item.icon}) -> ${item.route}`);
        });
      }
      console.log('📋 [MoreScreen] Help Section Count:', moreData.help_section?.length || 0);
      if (moreData.help_section && moreData.help_section.length > 0) {
        console.log('📋 [MoreScreen] Help Section:');
        moreData.help_section.forEach((item, index) => {
          console.log(`  ${index + 1}. ${item.id} - ${item.title} (${item.icon}) -> ${item.route}`);
        });
      }
      console.log('📋 [MoreScreen] Logout Section Count:', moreData.logout_section?.length || 0);
      if (moreData.logout_section && moreData.logout_section.length > 0) {
        console.log('📋 [MoreScreen] Logout Section:', JSON.stringify(moreData.logout_section[0], null, 2));
      }
      console.log('📋 [MoreScreen] ========================================');
    }
  }, [moreData]);

  // Show loading state
  if (isLoadingMoreData || isLoadingConfigData) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
        {/* Header Section with Restaurant Info - Same style as OrdersScreen/MenuScreen */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.paperPlaneIcon}>
              <Image
                source={icons.cooking}
                style={styles.cookingIcon}
                resizeMode="contain"
              />
            </View>
            <View style={styles.headerTextContainer}>
              <Text style={styles.restaurantName}>
                {configData?.partner_info?.business_name || (!isLoadingConfigData ? 'Restaurant Name' : '')}
              </Text>
              <View style={styles.statusContainer}>
                <Text style={styles.onlineText}>
                  {configData?.partner_info?.online_status || (!isLoadingConfigData ? 'Online' : '')}
                </Text>
                {!isLoadingConfigData && (
                  <>
                    <Text style={styles.statusDot}>•</Text>
                    <Text style={styles.closingText}>
                      {configData?.partner_info?.closing_info || 'Closes at 12:00 am, Tomorrow'}
                    </Text>
                  </>
                )}
              </View>
            </View>
          </View>
        </View>

        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF6E1A" />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      {/* Header Section - Same style as OrdersScreen/MenuScreen */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.paperPlaneIcon}>
            <Image
              source={icons.cooking}
              style={styles.cookingIcon}
              resizeMode="contain"
            />
          </View>
          <View style={styles.headerTextContainer}>
            <Text style={styles.restaurantName}>
              {configData?.partner_info?.business_name || 'Restaurant Name'}
            </Text>
            <View style={styles.statusContainer}>
              <Text style={styles.onlineText}>
                {configData?.partner_info?.online_status || 'Online'}
              </Text>
              <Text style={styles.statusDot}>•</Text>
              <Text style={styles.closingText}>
                {configData?.partner_info?.closing_info || 'Closes at 12:00 am, Tomorrow'}
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* Main Content */}
      <ScrollView
        style={styles.contentArea}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Receiving Orders Section - Backend Driven */}
        {moreData?.receiving_orders && (
          <View style={styles.receivingOrdersSection}>
            <View style={styles.receivingOrdersContent}>
              <View style={styles.receivingOrdersTextContainer}>
                <Text style={styles.receivingOrdersTitle}>
                  {moreData.receiving_orders.title || 'Receiving orders'}
                </Text>
                <Text style={styles.receivingOrdersSubtitle}>
                  {moreData.receiving_orders.subtitle || 'Closes at 12:00 AM, Tomorrow'}
                </Text>
              </View>
              {isTogglingOrders ? (
                <ActivityIndicator size="small" color="#FF6E1A" />
              ) : (
                <PowerToggle
                  value={moreData.receiving_orders.toggle_enabled || false}
                  onValueChange={handleReceivingOrdersToggle}
                  disabled={isTogglingOrders}
                />
              )}
            </View>
          </View>
        )}

        {/* Menu Items List - Backend Driven */}
        {moreData?.menu_items && moreData.menu_items.length > 0 && (
          <View style={styles.menuItemsContainer}>
            {moreData.menu_items.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={styles.menuItem}
                onPress={() => handleMenuItemPress(item)}
                activeOpacity={0.7}
              >
                <View style={styles.menuItemLeft}>
                  {hasBackendIcon(item) && (
                    <View style={styles.menuItemIcon}>
                      {renderIcon(item)}
                    </View>
                  )}
                  <Text style={styles.menuItemLabel}>{item.title}</Text>
                </View>
                {item.show_arrow !== false && (
                  renderChevron()
                )}
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Help Section - Backend Driven */}
        {moreData?.help_section && moreData.help_section.length > 0 && (
          <View style={styles.helpSectionContainer}>
            {moreData.help_section.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={styles.menuItem}
                onPress={() => handleMenuItemPress(item)}
                activeOpacity={0.7}
              >
                <View style={styles.menuItemLeft}>
                  {hasBackendIcon(item) && (
                    <View style={styles.menuItemIcon}>
                      {renderIcon(item)}
                    </View>
                  )}
                  <Text style={styles.menuItemLabel}>{item.title}</Text>
                </View>
                {item.show_arrow !== false && (
                  renderChevron()
                )}
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Logout Section - Backend Driven */}
        {moreData?.logout_section && moreData.logout_section.length > 0 && (
          <TouchableOpacity
            style={styles.logoutItem}
            onPress={handleLogout}
            activeOpacity={0.7}
            disabled={isLoggingOut}
          >
            <View style={styles.menuItemLeft}>
              {isLoggingOut ? (
                <View style={styles.menuItemIcon}>
                  <ActivityIndicator size="small" color="#000000" />
                </View>
              ) : hasBackendIcon(moreData.logout_section[0]) ? (
                <View style={styles.menuItemIcon}>
                  {renderIcon(moreData.logout_section[0])}
                </View>
              ) : null}
              <Text style={styles.logoutLabel}>
                {moreData.logout_section[0].title || 'Logout'}
              </Text>
            </View>
            {moreData.logout_section[0].show_arrow !== false && (
              renderChevron()
            )}
          </TouchableOpacity>
        )}

        {/* Branding Section */}
        <View style={styles.brandingSection}>
          <Image
            source={images.splashIcon}
            style={styles.brandingImage}
            resizeMode="contain"
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  // Header styles - matching OrdersScreen and MenuScreen
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 45,
    paddingBottom: 10,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  paperPlaneIcon: {
    width: 24,
    height: 24,
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cookingIcon: {
    width: 24,
    height: 24,
  },
  headerTextContainer: {
    flex: 1,
  },
  restaurantName: {
    fontFamily: Poppins.semiBold,
    fontSize: 18,
    color: '#000000',
    marginBottom: 4,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  onlineText: {
    fontFamily: Poppins.regular,
    fontSize: 12,
    color: '#4CAF50',
    marginRight: 4,
  },
  statusDot: {
    fontFamily: Poppins.regular,
    fontSize: 12,
    color: '#666666',
    marginHorizontal: 4,
  },
  closingText: {
    fontFamily: Poppins.regular,
    fontSize: 12,
    color: '#666666',
  },
  // Loading styles
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  loadingText: {
    fontFamily: Poppins.regular,
    fontSize: 14,
    color: '#666666',
    marginTop: 12,
  },
  // Content styles
  contentArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  contentContainer: {
    paddingBottom: 20,
  },
  receivingOrdersSection: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  receivingOrdersContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  receivingOrdersTextContainer: {
    flex: 1,
  },
  receivingOrdersTitle: {
    fontFamily: Poppins.bold,
    fontSize: 16,
    fontWeight: '700',
    color: '#000000',
    marginBottom: 4,
  },
  receivingOrdersSubtitle: {
    fontFamily: Poppins.regular,
    fontSize: 14,
    color: '#000000',
  },
  menuItemsContainer: {
    paddingTop: 8,
  },
  helpSectionContainer: {
    paddingTop: 0,
  },
  menuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  menuItemIcon: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  menuItemIconImage: {
    width: 24,
    height: 24,
  },
  menuItemLabel: {
    fontFamily: Poppins.regular,
    fontSize: 16,
    color: '#000000',
    flex: 1,
  },
  chevron: {
    fontSize: 20,
    color: '#666666',
    fontWeight: '300',
  },
  logoutItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    marginTop: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  logoutLabel: {
    fontFamily: Poppins.regular,
    fontSize: 16,
    color: '#FF6E1A',
  },
  brandingSection: {
    alignItems: 'flex-start',
    paddingTop: 20,
    paddingBottom: 20,
    // paddingHorizontal: 20,
  },
  brandingImage: {
    width: 150,
    height: 60,
  },
});

export default MoreScreen;
