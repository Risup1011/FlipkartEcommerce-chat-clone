import React, { useState, useEffect, useRef } from 'react';
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

// Module-level variable to persist across component unmounts
let hasLoadedMoreDataOnce = false;
let cachedMoreData = null;

const MoreScreen = ({ partnerStatus, onLogout, navigation, onNavigate, configData: configDataProp }) => {
    const [moreData, setMoreData] = useState(() => {
    // Initialize with cached data if available
    return cachedMoreData;
  });
  const hasLoadedOnceRef = useRef(hasLoadedMoreDataOnce); // Track if we've loaded data at least once
  const [isLoadingMoreData, setIsLoadingMoreData] = useState(() => {
    // Only show loading if we don't have data yet (first time)
    return false; // Will be set to true only if needed
  });
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

    // If configData already exists in state, skip fetching
    if (configData) {
      setIsLoadingConfigData(false);
      return;
    }

    // Otherwise, fetch it
    const fetchConfigData = async () => {
      try {
        setIsLoadingConfigData(true);
        const url = `${API_BASE_URL}v1/config`;
        
        const response = await fetchWithAuth(url, {
          method: 'GET',
        });

        const data = await response.json();

        if (response.ok && data.code === 200 && data.status === 'success') {
          setConfigData(data.data);
        } else {
          console.error('❌ [MoreScreen] Failed to load config data:', data.message);
        }
      } catch (error) {
        console.error('❌ [MoreScreen] Error fetching config:', error);
      } finally {
        setIsLoadingConfigData(false);
      }
    };

    fetchConfigData();
  }, [configDataProp, configData]);

  // Fetch more screen data from backend
  useEffect(() => {
    // Check if we already have cached data (from previous navigation)
    if (cachedMoreData) {
      setMoreData(cachedMoreData);
      setIsLoadingMoreData(false);
      hasLoadedOnceRef.current = true;
      hasLoadedMoreDataOnce = true;
      return;
    }

    // If we've already loaded once, don't show loader or fetch again
    if (hasLoadedMoreDataOnce || hasLoadedOnceRef.current) {
      setIsLoadingMoreData(false);
      return;
    }

    // Set loading to true only if we don't have data yet (first time)
    setIsLoadingMoreData(true);

    const fetchMoreData = async () => {
      try {
        const url = `${API_BASE_URL}v1/more`;
        
        const response = await fetchWithAuth(url, {
          method: 'GET',
        });

        const data = await response.json();

        if (response.ok && data.code === 200 && data.status === 'success') {
          // Cache the data at module level
          cachedMoreData = data.data;
          hasLoadedMoreDataOnce = true;
          setMoreData(data.data);
          hasLoadedOnceRef.current = true;
        } else {
          console.error('❌ [MoreScreen] Failed to fetch more data:', data.message);
        }
      } catch (error) {
        console.error('❌ [MoreScreen] Error fetching more data:', error);
      } finally {
        setIsLoadingMoreData(false);
      }
    };

    fetchMoreData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run on mount

  // Fetch settings to get current receiving orders status (only once when moreData is loaded)
  useEffect(() => {
    if (!moreData || isLoadingMoreData) return;

    const fetchSettings = async () => {
      try {
        const url = `${API_BASE_URL}v1/settings`;
        
        const response = await fetchWithAuth(url, {
          method: 'GET',
        });

        const data = await response.json();

        if (response.ok && data.code === 200 && data.status === 'success') {
          
          // Update moreData with current receiving orders status
          setMoreData(prev => {
            if (!prev) return prev;
            const newToggle = data.data?.receiving_orders?.is_accepting || false;
            const newSubtitle = data.data?.receiving_orders?.closing_info || prev.receiving_orders?.subtitle;
            
            
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
      }
    };

    fetchSettings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [moreData?.screen_title]); // Only run when moreData is first loaded (screen_title is stable)

  const handleReceivingOrdersToggle = async (value) => {
    try {
      setIsTogglingOrders(true);
      const url = `${API_BASE_URL}v1/settings/order-receiving`;
      
      const requestBody = {
        is_accepting: value,
      };
      
      const response = await fetchWithAuth(url, {
        method: 'PATCH',
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();

      if (response.ok && data.code === 200 && data.status === 'success') {
        
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
          return updated;
        });
      } else {
        console.error('❌ [MoreScreen] Failed to update order receiving status:', data.message);
      }
    } catch (error) {
      console.error('❌ [MoreScreen] Error toggling order receiving:', error);
    } finally {
      setIsTogglingOrders(false);
    }
  };

  const handleMenuItemPress = (menuItem) => {
    
    // Handle navigation based on route
    if (menuItem.route) {
      // Extract route path (remove leading slash if present)
      const route = menuItem.route.startsWith('/') ? menuItem.route.substring(1) : menuItem.route;
      
      // Map routes to navigation actions
      if (onNavigate) {
        switch (route) {
          case 'outlet-timings':
            onNavigate('outletTimings');
            break;
          case 'prep-time':
            onNavigate('prepTime');
            break;
          case 'account-settings':
            onNavigate('accountSettings');
            break;
          case 'past-orders':
            onNavigate('pastOrders');
            break;
          case 'partner-faqs':
            onNavigate('partnerFaqs');
            break;
          case 'compliance':
            onNavigate('compliance');
            break;
          case 'help-center':
            onNavigate('helpCenter');
            break;
          default:
        }
      } else {
        console.warn('⚠️  [MoreScreen] onNavigate callback not provided');
      }
    } else {
    }
  };

  // Get UI labels from config with fallbacks
  const getUILabel = (key, fallback) => {
    return configData?.logout_labels?.[key] || 
           configData?.ui_labels?.[key] || 
           fallback;
  };

  const handleLogout = () => {
    
    // Get dynamic labels with fallbacks
    const logoutTitle = getUILabel('logout_title', 'Logout');
    const logoutMessage = getUILabel('logout_confirmation_message', 'Are you sure you want to logout?');
    const cancelButton = getUILabel('cancel_button', 'Cancel');
    const logoutButton = getUILabel('logout_button', 'Logout');
    
    
    // Show confirmation popup before logging out
    Alert.alert(
      logoutTitle,
      logoutMessage,
      [
        {
          text: cancelButton,
          style: 'cancel',
          onPress: () => {
          },
        },
        {
          text: logoutButton,
          style: 'destructive',
          onPress: async () => {
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
        }
        
        // Construct final URL
        url = `${API_BASE_URL}${route}`;
      }
      
      const method = moreData?.logout_section?.[0]?.method || 'POST';
      
      
      try {
        
        const response = await fetchWithAuth(url, {
          method: method,
        });

        const data = await response.json();

        if (response.ok && (data.code === 200 || data.status === 'success')) {
        } else {
        }
      } catch (apiError) {
        console.error('❌ [MoreScreen] Logout API error (continuing with logout):', apiError);
        console.error('❌ [MoreScreen] Error Type:', apiError?.constructor?.name);
        console.error('❌ [MoreScreen] Error Message:', apiError?.message);
        console.error('❌ [MoreScreen] Error Stack:', apiError?.stack);
        // Continue with logout even if API call fails
      }

      // Clear tokens regardless of API response
      await clearTokens();
      
      // Get dynamic success message
      const successMessage = getUILabel('logout_success_message', 'Logged out successfully');
      
      // Show toast
      
      // Call onLogout callback to navigate to OTP screen and clear all data
      if (onLogout) {
        onLogout();
      } else {
        console.warn('⚠️  [MoreScreen] onLogout callback not provided');
      }
    } catch (error) {
      console.error('❌ [MoreScreen] Error during logout process:', error);
      // Clear tokens even if there's an error
      try {
        await clearTokens();
      } catch (clearError) {
        console.error('❌ [MoreScreen] Error clearing tokens:', clearError);
      }
      
      // Get dynamic success message
      const successMessage = getUILabel('logout_success_message', 'Logged out successfully');
      
      // Call onLogout callback even if there's an error
      if (onLogout) {
        onLogout();
      }
    } finally {
      setIsLoggingOut(false);
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
    
    if (configData?.partner_info) {
      
      const businessName = configData.partner_info.business_name;
      const onlineStatus = configData.partner_info.online_status;
      const closingInfo = configData.partner_info.closing_info;
      
    } else {
    }
  }, [configData]);

  // Log moreData structure when it changes
  useEffect(() => {
    if (moreData) {
      if (moreData.menu_items && moreData.menu_items.length > 0) {
        moreData.menu_items.forEach((item, index) => {
        });
      }
      if (moreData.help_section && moreData.help_section.length > 0) {
        moreData.help_section.forEach((item, index) => {
        });
      }
      if (moreData.logout_section && moreData.logout_section.length > 0) {
      }
    }
  }, [moreData]);

  console.log('-----', moreData)

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
                {configData?.partner_info?.business_name || ''}
              </Text>
              {configData?.partner_info && (
                <View style={styles.statusContainer}>
                  <Text style={styles.onlineText}>
                    {configData.partner_info.online_status || ''}
                  </Text>
                  {configData.partner_info.online_status && configData.partner_info.closing_info && (
                    <>
                      <Text style={styles.statusDot}>•</Text>
                      <Text style={styles.closingText}>
                        {configData.partner_info.closing_info}
                      </Text>
                    </>
                  )}
                </View>
              )}
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
              {configData?.partner_info?.business_name || ''}
            </Text>
            {configData?.partner_info && (
              <View style={styles.statusContainer}>
                <Text style={styles.onlineText}>
                  {configData.partner_info.online_status || ''}
                </Text>
                {configData.partner_info.online_status && configData.partner_info.closing_info && (
                  <>
                    <Text style={styles.statusDot}>•</Text>
                    <Text style={styles.closingText}>
                      {configData.partner_info.closing_info}
                    </Text>
                  </>
                )}
              </View>
            )}
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
