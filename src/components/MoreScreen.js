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
} from 'react-native';
import { Poppins, icons } from '../assets';
import { useToast } from './ToastContext';
import { fetchWithAuth } from '../utils/apiHelpers';
import { API_BASE_URL } from '../config';
import { clearTokens } from '../utils/tokenStorage';
import PowerToggle from './PowerToggle';

const MoreScreen = ({ partnerStatus, onLogout, navigation }) => {
  const { showToast } = useToast();
  const [moreData, setMoreData] = useState(null);
  const [isLoadingMoreData, setIsLoadingMoreData] = useState(true);
  const [isTogglingOrders, setIsTogglingOrders] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [configData, setConfigData] = useState(null);
  const [isLoadingConfigData, setIsLoadingConfigData] = useState(true);

  // Fetch config data for restaurant info (for header)
  useEffect(() => {
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
  }, []);

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
      switch (route) {
        case 'outlet-timings':
          console.log('📍 [MoreScreen] Navigating to: Outlet Timings');
          showToast('Outlet timings - Coming soon', 'info');
          // TODO: Navigate to outlet timings screen
          break;
        case 'prep-time':
          console.log('📍 [MoreScreen] Navigating to: Prep Time');
          showToast('Prep time - Coming soon', 'info');
          // TODO: Navigate to prep time screen
          break;
        case 'account-settings':
          console.log('📍 [MoreScreen] Navigating to: Account Settings');
          showToast('Account settings - Coming soon', 'info');
          // TODO: Navigate to account settings screen
          break;
        case 'past-orders':
          console.log('📍 [MoreScreen] Navigating to: Past Orders');
          showToast('Past orders - Coming soon', 'info');
          // TODO: Navigate to past orders screen
          break;
        case 'partner-faqs':
          console.log('📍 [MoreScreen] Navigating to: Partner FAQs');
          showToast('Partner FAQs - Coming soon', 'info');
          // TODO: Navigate to partner FAQs screen
          break;
        case 'compliance':
          console.log('📍 [MoreScreen] Navigating to: Compliance');
          showToast('Compliance - Coming soon', 'info');
          // TODO: Navigate to compliance screen
          break;
        case 'help-center':
          console.log('📍 [MoreScreen] Navigating to: Help Center');
          showToast('Help center - Coming soon', 'info');
          // TODO: Navigate to help center screen
          break;
        default:
          console.log('📍 [MoreScreen] Unknown route, showing toast:', route);
          showToast(`${menuItem.title} - Coming soon`, 'info');
      }
    } else {
      console.log('⚠️  [MoreScreen] No route specified for menu item');
      showToast(`${menuItem.title} - Coming soon`, 'info');
    }
  };

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);
      
      // Call logout API
      const logoutUrl = moreData?.logout_section?.[0]?.route || `${API_BASE_URL}v1/auth/logout`;
      const isFullUrl = logoutUrl.startsWith('http');
      const url = isFullUrl ? logoutUrl : `${API_BASE_URL}${logoutUrl.startsWith('/') ? logoutUrl.substring(1) : logoutUrl}`;
      const method = moreData?.logout_section?.[0]?.method || 'POST';
      
      console.log('📡 [MoreScreen] ========================================');
      console.log('📡 [MoreScreen] LOGGING OUT');
      console.log('📡 [MoreScreen] ========================================');
      console.log('📋 [MoreScreen] Logout Section Data:', JSON.stringify(moreData?.logout_section?.[0], null, 2));
      console.log('📋 [MoreScreen] Original Logout URL:', logoutUrl);
      console.log('📋 [MoreScreen] Is Full URL:', isFullUrl);
      console.log('📋 [MoreScreen] Final URL:', url);
      console.log('📋 [MoreScreen] Method:', method);
      
      const response = await fetchWithAuth(url, {
        method: method,
      });

      const data = await response.json();
      console.log('📥 [MoreScreen] Logout Response Status:', response.status);
      console.log('📥 [MoreScreen] Logout Response:', JSON.stringify(data, null, 2));

      // Clear tokens regardless of API response
      console.log('🗑️  [MoreScreen] Clearing tokens...');
      await clearTokens();
      console.log('✅ [MoreScreen] Tokens cleared');
      
      if (response.ok && (data.code === 200 || data.status === 'success')) {
        console.log('✅ [MoreScreen] Logout successful');
        showToast('Logged out successfully', 'success');
        if (onLogout) {
          console.log('🔄 [MoreScreen] Calling onLogout callback');
          onLogout();
        }
      } else {
        // Even if API fails, clear tokens and logout
        console.log('⚠️  [MoreScreen] Logout API failed but tokens cleared');
        showToast('Logged out successfully', 'success');
        if (onLogout) {
          console.log('🔄 [MoreScreen] Calling onLogout callback');
          onLogout();
        }
      }
    } catch (error) {
      console.error('❌ [MoreScreen] Error logging out:', error);
      // Clear tokens even if API call fails
      console.log('🗑️  [MoreScreen] Clearing tokens after error...');
      await clearTokens();
      console.log('✅ [MoreScreen] Tokens cleared');
      showToast('Logged out successfully', 'success');
      if (onLogout) {
        console.log('🔄 [MoreScreen] Calling onLogout callback');
        onLogout();
      }
    } finally {
      setIsLoggingOut(false);
      console.log('📡 [MoreScreen] Logout process completed');
    }
  };

  // Simple icon renderer - using text/emoji as placeholders since we don't have all icons
  const renderIcon = (iconType) => {
    const iconMap = {
      outlet_timings: '🕐',
      prep_time: '⏱️',
      settings: '⚙️',
      past_orders: '📋',
      faqs: '❓',
      compliance: '📄',
      help: '🎧',
      logout: '🚪',
      chevron: '›',
    };
    return (
      <Text style={styles.iconText}>{iconMap[iconType] || '•'}</Text>
    );
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
                  <View style={styles.menuItemIcon}>
                    {renderIcon(item.icon)}
                  </View>
                  <Text style={styles.menuItemLabel}>{item.title}</Text>
                </View>
                {item.show_arrow !== false && (
                  <Text style={styles.chevron}>{renderIcon('chevron')}</Text>
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
                  <View style={styles.menuItemIcon}>
                    {renderIcon(item.icon)}
                  </View>
                  <Text style={styles.menuItemLabel}>{item.title}</Text>
                </View>
                {item.show_arrow !== false && (
                  <Text style={styles.chevron}>{renderIcon('chevron')}</Text>
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
              <View style={styles.menuItemIcon}>
                {isLoggingOut ? (
                  <ActivityIndicator size="small" color="#000000" />
                ) : (
                  renderIcon(moreData.logout_section[0].icon || 'logout')
                )}
              </View>
              <Text style={styles.logoutLabel}>
                {moreData.logout_section[0].title || 'Logout'}
              </Text>
            </View>
            {moreData.logout_section[0].show_arrow !== false && (
              <Text style={styles.chevron}>{renderIcon('chevron')}</Text>
            )}
          </TouchableOpacity>
        )}

        {/* Branding Section */}
        <View style={styles.brandingSection}>
          <View style={styles.brandingContent}>
            <Text style={styles.brandingIcon}>🏪</Text>
            <Text style={styles.brandingText}>Kamai24</Text>
          </View>
          <Text style={styles.brandingTagline}>Apni Dukaan.</Text>
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
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    marginTop: 8,
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
  iconText: {
    fontSize: 20,
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
    color: '#000000',
  },
  brandingSection: {
    alignItems: 'center',
    paddingTop: 40,
    paddingBottom: 20,
  },
  brandingContent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  brandingIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  brandingText: {
    fontFamily: Poppins.bold,
    fontSize: 18,
    fontWeight: '700',
    color: '#000000',
  },
  brandingTagline: {
    fontFamily: Poppins.regular,
    fontSize: 14,
    color: '#666666',
  },
});

export default MoreScreen;
