import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Image,
  ScrollView,
  Switch,
} from 'react-native';
import { Poppins, icons } from '../assets';
import NewOrdersScreen from './NewOrdersScreen';
import MenuScreen from './MenuScreen';
import MoreScreen from './MoreScreen';
import { useToast } from './ToastContext';
import { fetchWithAuth } from '../utils/apiHelpers';
import { API_BASE_URL } from '../config';

const OrdersScreen = ({ onBack, partnerStatus, newOrders = [], onNewOrderReceived, onLogout, initialTab, initialBottomTab, onNavigate }) => {
  const { showToast } = useToast();
  const [isOnline, setIsOnline] = useState(true);
  const [activeTab, setActiveTab] = useState(initialTab || 'preparing');
  const [activeBottomTab, setActiveBottomTab] = useState(initialBottomTab || 'orders');
  const [orderCount, setOrderCount] = useState(5); // Example order count
  const [showNewOrdersModal, setShowNewOrdersModal] = useState(false);
  const [pendingOrders, setPendingOrders] = useState([]);
  const previousOrdersLengthRef = useRef(0);
  const [isLoadingCatalog, setIsLoadingCatalog] = useState(false);
  const [isLoadingConfig, setIsLoadingConfig] = useState(false);
  const [configData, setConfigData] = useState(null);
  const [isLoadingConfigData, setIsLoadingConfigData] = useState(true);
  const tabsScrollViewRef = useRef(null);
  const tabPositions = useRef({});
  const [menuResetTrigger, setMenuResetTrigger] = useState(0); // Trigger to reset MenuScreen navigation

  // Update activeBottomTab when initialBottomTab prop changes
  useEffect(() => {
    if (initialBottomTab) {
      
      setActiveBottomTab(initialBottomTab);
    }
  }, [initialBottomTab]);

  // Update activeTab when initialTab prop changes
  useEffect(() => {
    if (initialTab) {
      
      // Reset bottom tab to 'orders' if we're coming from MoreScreen (unless initialBottomTab is set)
      if (activeBottomTab !== 'orders' && !initialBottomTab) {
        setActiveBottomTab('orders');
      }
      
      setActiveTab(initialTab);
      
      // Scroll to the selected tab after a delay to ensure layout is complete
      // Try multiple times with increasing delays in case layout isn't ready
      const scrollToTab = (attempt = 1) => {
        setTimeout(() => {
          if (tabsScrollViewRef.current && tabPositions.current[initialTab] !== undefined) {
            const scrollX = tabPositions.current[initialTab] - 20;
            tabsScrollViewRef.current.scrollTo({
              x: scrollX,
              animated: true,
            });
          } else {
            // Retry up to 3 times with increasing delays
            if (attempt < 3) {
              scrollToTab(attempt + 1);
            }
          }
        }, attempt * 200); // 200ms, 400ms, 600ms
      };
      
      scrollToTab();
    }
  }, [initialTab]);

  // Watch for new orders and automatically open the modal
  useEffect(() => {
    if (newOrders && newOrders.length > 0) {
      // Check if there are actually new orders (not just initial load)
      // Also open if this is the first time we see orders (initial load with orders)
      const isNewOrder = newOrders.length > previousOrdersLengthRef.current;
      const isFirstLoad = previousOrdersLengthRef.current === 0 && newOrders.length > 0;
      
      if (isNewOrder || isFirstLoad) {
        setPendingOrders(newOrders);
        setShowNewOrdersModal(true);
        if (onNewOrderReceived) {
          onNewOrderReceived(newOrders);
        }
      }
      previousOrdersLengthRef.current = newOrders.length;
    }
  }, [newOrders, onNewOrderReceived]);

  // Fetch config data on component mount
  useEffect(() => {
    const fetchConfigData = async () => {
      setIsLoadingConfigData(true);
      try {
        const url = `${API_BASE_URL}v1/config`;
        
        const response = await fetchWithAuth(url, {
          method: 'GET',
        });
        
        const responseData = await response.json();
        
        if (response.ok && responseData?.data) {
          setConfigData(responseData.data);
          // Sync online status from API if available
          if (responseData.data.partner_info?.online_status) {
            const onlineStatus = responseData.data.partner_info.online_status.toLowerCase();
            setIsOnline(onlineStatus === 'online');
          }
        } else {
          console.error('❌ Failed to load config data:', response.status);
          // Use fallback/default values if API fails
          setConfigData(null);
        }
      } catch (error) {
        console.error('❌ Error fetching config data:', error);
        // Use fallback/default values if API fails
        setConfigData(null);
      } finally {
        setIsLoadingConfigData(false);
      }
    };

    fetchConfigData();
  }, []);

  // Log header data source whenever configData changes
  useEffect(() => {
    
    if (configData?.partner_info) {
      
      const businessName = configData.partner_info.business_name;
      const onlineStatus = configData.partner_info.online_status;
      const closingInfo = configData.partner_info.closing_info;
      
    } else {
    }
  }, [configData]);

  // Simulate receiving new orders (for testing - remove in production)
  useEffect(() => {
    // This is just for demonstration - in production, you'd get orders from an API/WebSocket
    // Uncomment the code below to test the new orders screen
    /*
    const testOrderTimer = setTimeout(() => {
      const testOrders = [
        {
          id: 'ORD001',
          customerName: 'John Doe',
          amount: 450,
          time: 'Just now',
          items: [
            { name: 'Pizza Margherita', quantity: 2 },
            { name: 'Coca Cola', quantity: 1 },
          ],
          deliveryAddress: '123 Main Street, City, State 12345',
          estimatedTime: 30,
        },
      ];
      setPendingOrders(testOrders);
      setShowNewOrdersModal(true);
    }, 5000); // Show test order after 5 seconds

    return () => clearTimeout(testOrderTimer);
    */
  }, []);

  // Dynamically generate order tabs from config API
  const orderTabs = React.useMemo(() => {
    
    if (configData?.order_status_labels) {
      const labels = configData.order_status_labels;
      
      // Map API keys to tab structure
      // API uses: preparing, ready, picked_up, past_order
      // Frontend uses: preparing, ready, pickedUp, pastOrders
      const tabs = [
        { id: 'preparing', label: labels.preparing || 'Preparing' },
        { id: 'ready', label: labels.ready || 'Ready' },
        { id: 'pickedUp', label: labels.picked_up || 'Picked Up' },
        { id: 'pastOrders', label: labels.past_order || 'Past Orders' },
      ];
      
      // Log which labels used backend vs fallback
      tabs.forEach(tab => {
        const backendValue = labels[tab.id === 'pickedUp' ? 'picked_up' : tab.id === 'pastOrders' ? 'past_order' : tab.id];
        if (backendValue) {
        } else {
        }
      });
      
      return tabs;
    }
    
    // Fallback to default values if config not loaded yet
    const fallbackTabs = [
      { id: 'preparing', label: 'Preparing' },
      { id: 'ready', label: 'Ready' },
      { id: 'pickedUp', label: 'Picked Up' },
      { id: 'pastOrders', label: 'Past Orders' },
    ];
    
    return fallbackTabs;
  }, [configData]);

  // Get bottom tabs from config or use defaults (same pattern as OutletTimingsScreen)
  const bottomTabs = React.useMemo(() => {
    if (configData?.bottom_navigation_tabs && Array.isArray(configData.bottom_navigation_tabs)) {
      return configData.bottom_navigation_tabs.map(tab => ({
        id: tab.id || tab.route?.replace('/', '') || '',
        label: tab.label || tab.title || '',
        icon: tab.icon ? icons[tab.icon] : icons.menu,
        route: tab.route || '',
      }));
    }
    // Default bottom tabs (fallback)
    return [
      { id: 'orders', label: 'Orders', icon: icons.orders },
      { id: 'menu', label: 'Menu', icon: icons.menu },
      { id: 'finance', label: 'Finance', icon: icons.finance },
      { id: 'more', label: 'More', icon: icons.more },
    ];
  }, [configData]);

  const handleTabPress = (tabId) => {
    setActiveTab(tabId);
    
    // Scroll to the selected tab
    if (tabsScrollViewRef.current && tabPositions.current[tabId] !== undefined) {
      tabsScrollViewRef.current.scrollTo({
        x: tabPositions.current[tabId] - 20, // Subtract padding to show tab properly
        animated: true,
      });
    }
  };

  const handleAcceptOrder = (order) => {
    // Here you would make an API call to accept the order
    // For now, just update local state
    setPendingOrders(prevOrders => prevOrders.filter(o => o.id !== order.id));
    setOrderCount(prev => Math.max(0, prev - 1));
    showToast(`Order #${order.id} accepted`, 'success');
  };

  const handleDenyOrder = (order) => {
    // Here you would make an API call to deny the order
    // For now, just update local state
    setPendingOrders(prevOrders => prevOrders.filter(o => o.id !== order.id));
    setOrderCount(prev => Math.max(0, prev - 1));
    showToast(`Order #${order.id} denied`, 'info');
  };

  const handleCloseNewOrdersModal = () => {
    setShowNewOrdersModal(false);
  };

  const handleTestCatalogAPI = async () => {
    setIsLoadingCatalog(true);
    try {
      const url = `${API_BASE_URL}v1/catalog/orchestrator/complete-catalog`;
      
      const response = await fetchWithAuth(url, {
        method: 'GET',
      });
      
      const responseData = await response.json();
      
      
      if (response.ok) {
        showToast(
          `Catalog API Success! Check console for details. Items: ${responseData?.data?.length || 0}`,
          'success'
        );
      } else {
        showToast(
          `Catalog API Error: ${response.status} - ${responseData?.message || 'Unknown error'}`,
          'error'
        );
      }
    } catch (error) {
      console.error('❌ Catalog API Error:', error);
      showToast(`Catalog API Error: ${error.message}`, 'error');
    } finally {
      setIsLoadingCatalog(false);
    }
  };

  const handleTestConfigAPI = async () => {
    setIsLoadingConfig(true);
    try {
      const url = `${API_BASE_URL}v1/config`;
      
      const response = await fetchWithAuth(url, {
        method: 'GET',
      });
      
      const responseData = await response.json();
      
      
      if (response.ok && responseData?.data) {
        // Update config data if test is successful
        setConfigData(responseData.data);
        showToast(
          `Config API Success! Data updated. Check console for details.`,
          'success'
        );
      } else {
        showToast(
          `Config API Error: ${response.status} - ${responseData?.message || 'Unknown error'}`,
          'error'
        );
      }
    } catch (error) {
      console.error('❌ Config API Error:', error);
      showToast(`Config API Error: ${error.message}`, 'error');
    } finally {
      setIsLoadingConfig(false);
    }
  };

  const handleTestNewOrder = () => {
    // Generate test orders with detailed data matching the design
    const testOrders = [
      {
        id: `ORD${Math.floor(Math.random() * 10000)}`,
        customerName: 'Rahul',
        amount: 500,
        time: 'Just now',
        contactNumber: '8822478931',
        deliveryAddress: 'K-110, Basement, Hauz Khas Enclave, New Delhi, Delhi 110016, India',
        estimatedTime: 30,
        items: [
          {
            name: 'Chocolate Shake',
            category: 'Milk Shakes',
            quantity: 1,
            price: 160,
            type: 'veg',
            isVeg: true,
          },
          {
            name: 'Chicken Butter Masala',
            category: 'Curry',
            quantity: 1,
            price: 320,
            type: 'non-veg',
            isVeg: false,
          },
        ],
        packagingCharge: 20,
        gst: 0,
      },
      {
        id: `ORD${Math.floor(Math.random() * 10000)}`,
        customerName: 'Priya Sharma',
        amount: 750,
        time: 'Just now',
        contactNumber: '9876543210',
        deliveryAddress: 'A-45, Sector 15, Noida, Uttar Pradesh 201301, India',
        estimatedTime: 25,
        items: [
          {
            name: 'Veg Biryani',
            category: 'Rice',
            quantity: 2,
            price: 180,
            type: 'veg',
            isVeg: true,
          },
          {
            name: 'Butter Naan',
            category: 'Bread',
            quantity: 3,
            price: 50,
            type: 'veg',
            isVeg: true,
          },
        ],
        packagingCharge: 20,
        gst: 0,
      },
    ];
    
    setPendingOrders(testOrders);
    setShowNewOrdersModal(true);
    setOrderCount(prev => prev + testOrders.length);
    showToast(`${testOrders.length} new order(s) received!`, 'info');
  };

  // Handle bottom tab press - reset MenuScreen navigation when menu tab is clicked
  // Uses same pattern as OutletTimingsScreen for consistency
  const handleBottomTabPress = (tabId) => {
    
    // Find the tab to get route if available (for backend dynamic routes)
    const tab = bottomTabs.find(t => t.id === tabId);
    
    // If clicking a different tab, switch to it
    if (tabId !== activeBottomTab) {
      setActiveBottomTab(tabId);
      
      // If switching to menu tab, trigger reset to ensure we show main MenuScreen
      if (tabId === 'menu') {
        setMenuResetTrigger(prev => prev + 1);
      }
      
      // Handle navigation using onNavigate if available (for external navigation)
      if (onNavigate && tab?.route) {
        onNavigate(tab.route);
      }
    } else if (tabId === 'menu') {
      // Already on menu tab - clicking it again should reset navigation to main MenuScreen
      // This handles cases where user is on ItemVariantsAndAddonsScreen, AddQuantityScreen, etc.
      setMenuResetTrigger(prev => prev + 1);
    }
  };

  // Render MenuScreen when menu tab is active
  if (activeBottomTab === 'menu') {
    return (
      <SafeAreaView style={styles.fullScreenContainer} edges={['top', 'left', 'right']}>
        <View style={styles.menuScreenWrapper}>
          <MenuScreen 
            partnerStatus={partnerStatus} 
            onNavigateToOrders={() => setActiveBottomTab('orders')}
            resetNavigationTrigger={menuResetTrigger}
          />
        </View>
        {/* Bottom Navigation Bar */}
        <View style={styles.bottomNav}>
          {bottomTabs.map((tab) => (
            <TouchableOpacity
              key={tab.id}
              style={styles.bottomNavItem}
              onPress={() => handleBottomTabPress(tab.id)}
              activeOpacity={0.7}
            >
              <Image
                source={tab.icon}
                style={[
                  styles.bottomNavIcon,
                  activeBottomTab === tab.id && styles.bottomNavIconActive,
                ]}
                resizeMode="contain"
              />
            </TouchableOpacity>
          ))}
        </View>
      </SafeAreaView>
    );
  }

  // Render MoreScreen when more tab is active
  if (activeBottomTab === 'more') {
    return (
      <SafeAreaView style={styles.fullScreenContainer} edges={['top', 'left', 'right']}>
        <View style={styles.menuScreenWrapper}>
          <MoreScreen 
            partnerStatus={partnerStatus} 
            onLogout={onLogout}
            onNavigate={(screen) => {
              // If navigating to pastOrders, reset bottom tab to orders first
              if (screen === 'pastOrders') {
                setActiveBottomTab('orders');
              }
              // Then call the parent's onNavigate
              if (onNavigate) {
                onNavigate(screen);
              }
            }}
            configData={configData}
          />
        </View>
        {/* Bottom Navigation Bar */}
        <View style={styles.bottomNav}>
          {bottomTabs.map((tab) => (
            <TouchableOpacity
              key={tab.id}
              style={styles.bottomNavItem}
              onPress={() => handleBottomTabPress(tab.id)}
              activeOpacity={0.7}
            >
              <Image
                source={tab.icon}
                style={[
                  styles.bottomNavIcon,
                  activeBottomTab === tab.id && styles.bottomNavIconActive,
                ]}
                resizeMode="contain"
              />
            </TouchableOpacity>
          ))}
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      {/* Top Header */}
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
        <View style={styles.headerRight}>
      
          {/* <TouchableOpacity 
            style={[styles.testButton, isLoadingCatalog && styles.testButtonDisabled]} 
            onPress={handleTestCatalogAPI}
            activeOpacity={0.7}
            disabled={isLoadingCatalog}
          >
            <Text style={styles.testButtonText}>
              {isLoadingCatalog ? 'Loading...' : 'Test Catalog'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.testButton} 
            onPress={handleTestNewOrder}
            activeOpacity={0.7}
          >
            <Text style={styles.testButtonText}>Test Order</Text>
          </TouchableOpacity> */}
          {/* <TouchableOpacity style={styles.searchButton} activeOpacity={0.7}>
            <Image
              source={icons.search}
              style={styles.searchIcon}
              resizeMode="contain"
            />
          </TouchableOpacity> */}
        </View>
      </View>

      {/* Partner Status Banner - Show when UNDER_REVIEW */}
      {partnerStatus === 'UNDER_REVIEW' && (
        <View style={styles.statusBanner}>
          <Text style={styles.statusBannerText}>
            Your application is under review. We'll notify you once it's approved.
          </Text>
        </View>
      )}

      {/* Online Status Bar */}
      <View style={[styles.onlineBar, isOnline ? styles.onlineBarActive : styles.onlineBarInactive]}>
        <View style={styles.onlineBarContent}>
          <Switch
            value={isOnline}
            onValueChange={setIsOnline}
            trackColor={{ false: '#767577', true: '#FFFFFF' }}
            thumbColor="#000000"
            ios_backgroundColor="#767577"
          />
          <Text style={styles.onlineBarText}>
            {isOnline ? 'You are online' : 'You are offline'}
          </Text>
        </View>
      </View>

      {/* Order Status Tabs */}
      <View style={styles.tabsContainer}>
        <ScrollView
          ref={tabsScrollViewRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabsContentContainer}
          style={styles.tabsScrollView}
        >
          {orderTabs.map((tab) => (
            <TouchableOpacity
              key={tab.id}
              style={[
                styles.tab,
                activeTab === tab.id && styles.activeTab,
              ]}
              onPress={() => handleTabPress(tab.id)}
              onLayout={(event) => {
                const { x } = event.nativeEvent.layout;
                tabPositions.current[tab.id] = x;
              }}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.tabText,
                  activeTab === tab.id && styles.activeTabText,
                ]}
              >
                {tab.label}
              </Text>
              {activeTab === tab.id && <View style={styles.tabUnderline} />}
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Main Content Area */}
      <ScrollView
        style={styles.contentArea}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.emptyStateContainer}>
          <Image
            source={icons.pan}
            style={styles.panImage}
            resizeMode="contain"
          />
          <Text style={styles.noOrdersText}>No Orders!</Text>
        </View>

        {/* Order Count Icon - Right Bottom Corner */}
        <View style={styles.orderCountContainer}>
          <Image
            source={icons.orderCount}
            style={styles.orderCountIcon}
            resizeMode="contain"
          />
          {orderCount > 0 && (
            <View style={styles.orderCountBadge}>
              <Text style={styles.orderCountText}>
                {orderCount > 99 ? '99+' : orderCount}
            </Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Bottom Navigation Bar */}
      <View style={styles.bottomNav}>
        {bottomTabs.map((tab) => (
          <TouchableOpacity
            key={tab.id}
            style={styles.bottomNavItem}
            onPress={() => handleBottomTabPress(tab.id)}
            activeOpacity={0.7}
          >
            <Image
              source={tab.icon}
              style={[
                styles.bottomNavIcon,
                activeBottomTab === tab.id && styles.bottomNavIconActive,
              ]}
              resizeMode="contain"
            />
          </TouchableOpacity>
        ))}
      </View>

      {/* New Orders Modal - Automatically opens when new orders arrive */}
      <NewOrdersScreen
        visible={showNewOrdersModal}
        onClose={handleCloseNewOrdersModal}
        orders={pendingOrders}
        onAcceptOrder={handleAcceptOrder}
        onDenyOrder={handleDenyOrder}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  fullScreenContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  menuScreenWrapper: {
    flex: 1,
    marginBottom: 0,
  },
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
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
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  testButton: {
    backgroundColor: '#FF6E1A',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    marginRight: 4,
  },
  testButtonDisabled: {
    backgroundColor: '#CCCCCC',
    opacity: 0.6,
  },
  testButtonText: {
    fontFamily: Poppins.semiBold,
    fontSize: 12,
    color: '#FFFFFF',
  },
  searchButton: {
    padding: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchIcon: {
    width: 24,
    height: 24,
  },
  onlineBar: {
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  onlineBarActive: {
    backgroundColor: '#4CAF50',
  },
  onlineBarInactive: {
    backgroundColor: '#F44336',
  },
  onlineBarContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  onlineBarText: {
    fontFamily: Poppins.medium,
    fontSize: 14,
    color: '#FFFFFF',
    marginLeft: 12,
  },
  tabsContainer: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  tabsScrollView: {
    flexGrow: 0,
    flexShrink: 0,
  },
  tabsContentContainer: {
    flexDirection: 'row',
    paddingLeft: 20,
    paddingRight: 0,
  },
  tab: {
    paddingVertical: 15,
    marginRight: 30,
    position: 'relative',
  },
  activeTab: {
    // Active tab styling
  },
  tabText: {
    fontFamily: Poppins.regular,
    fontSize: 14,
    color: '#000000',
  },
  activeTabText: {
    fontFamily: Poppins.semiBold,
    color: '#FF6E1A',
  },
  tabUnderline: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: '#FF6E1A',
    borderRadius: 2,
  },
  contentArea: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  contentContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
    paddingBottom: 100,
    position: 'relative',
  },
  emptyStateContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  panImage: {
    width: 200,
    height: 200,
    // marginBottom: 10,
  },
  noOrdersText: {
    fontFamily: Poppins.semiBold,
    fontSize: 20,
    color: '#000000',
  },
  orderCountContainer: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    zIndex: 10,
  },
  orderCountIcon: {
    width: 50,
    height: 50,
  },
  orderCountBadge: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: '#FF6E1A',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  orderCountText: {
    fontFamily: Poppins.semiBold,
    fontSize: 12,
    color: '#FFFFFF',
    textAlign: 'center',
  },
  bottomNav: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    paddingTop: 10,
    paddingHorizontal: 10,
    paddingBottom: 10,
    justifyContent: 'space-around',
    alignItems: 'center',
    marginTop: 0,
  },
  bottomNavItem: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    paddingVertical: 8,
  },
  bottomNavIcon: {
    width: 48,
    height: 48,
    tintColor: '#666666',
    marginBottom: 10,
  },
  bottomNavIconActive: {
    tintColor: '#FF6E1A',
  },
  statusBanner: {
    backgroundColor: '#FFF3E0',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#FFE0B2',
  },
  statusBannerText: {
    fontFamily: Poppins.medium,
    fontSize: 14,
    color: '#E65100',
    textAlign: 'center',
  },
});

export default OrdersScreen;
