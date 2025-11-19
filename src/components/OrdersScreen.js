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

const OrdersScreen = ({ onBack, partnerStatus, newOrders = [], onNewOrderReceived, onLogout, initialTab }) => {
  const { showToast } = useToast();
  const [isOnline, setIsOnline] = useState(true);
  const [activeTab, setActiveTab] = useState(initialTab || 'preparing');
  const [activeBottomTab, setActiveBottomTab] = useState('orders');
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

  // Update activeTab when initialTab prop changes
  useEffect(() => {
    if (initialTab) {
      console.log('📡 [OrdersScreen] Setting initial tab to:', initialTab);
      setActiveTab(initialTab);
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
        console.log('🆕 New orders detected, opening NewOrdersScreen automatically');
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
        console.log('📡 Fetching config data from:', url);
        
        const response = await fetchWithAuth(url, {
          method: 'GET',
        });
        
        const responseData = await response.json();
        
        if (response.ok && responseData?.data) {
          console.log('✅ Config data loaded successfully');
          console.log('📋 Full config data:', JSON.stringify(responseData.data, null, 2));
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
    console.log('📋 ========================================');
    console.log('📋 HEADER DATA SOURCE CHECK');
    console.log('📋 ========================================');
    console.log('📋 configData exists:', !!configData);
    console.log('📋 partner_info exists:', !!configData?.partner_info);
    
    if (configData?.partner_info) {
      console.log('✅ USING BACKEND DATA for header');
      console.log('📋 Backend partner_info:', JSON.stringify(configData.partner_info, null, 2));
      
      const businessName = configData.partner_info.business_name;
      const onlineStatus = configData.partner_info.online_status;
      const closingInfo = configData.partner_info.closing_info;
      
      console.log('📋 Business Name:', businessName ? `✅ "${businessName}" - FROM BACKEND` : '⚠️  MISSING - Using fallback: "Restaurant Name"');
      console.log('📋 Online Status:', onlineStatus ? `✅ "${onlineStatus}" - FROM BACKEND` : '⚠️  MISSING - Using fallback: "Online"');
      console.log('📋 Closing Info:', closingInfo ? `✅ "${closingInfo}" - FROM BACKEND` : '⚠️  MISSING - Using fallback: "Closes at 12:00 am, Tomorrow"');
    } else {
      console.log('⚠️  USING FRONTEND FALLBACK DATA for header');
      console.log('📋 Business Name: "Restaurant Name" (FALLBACK)');
      console.log('📋 Online Status: "Online" (FALLBACK)');
      console.log('📋 Closing Info: "Closes at 12:00 am, Tomorrow" (FALLBACK)');
    }
    console.log('📋 ========================================');
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
    console.log('📋 Generating order tabs...');
    console.log('📋 configData exists:', !!configData);
    console.log('📋 order_status_labels exists:', !!configData?.order_status_labels);
    
    if (configData?.order_status_labels) {
      const labels = configData.order_status_labels;
      console.log('✅ USING BACKEND LABELS from API');
      console.log('📋 Backend labels received:', JSON.stringify(labels, null, 2));
      
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
          console.log(`  ✅ "${tab.label}" - FROM BACKEND`);
        } else {
          console.log(`  ⚠️  "${tab.label}" - FALLBACK (backend value missing)`);
        }
      });
      
      return tabs;
    }
    
    // Fallback to default values if config not loaded yet
    console.log('⚠️  USING FRONTEND FALLBACK LABELS (backend data not available)');
    const fallbackTabs = [
      { id: 'preparing', label: 'Preparing' },
      { id: 'ready', label: 'Ready' },
      { id: 'pickedUp', label: 'Picked Up' },
      { id: 'pastOrders', label: 'Past Orders' },
    ];
    console.log('📋 Frontend fallback labels:', fallbackTabs.map(t => t.label).join(', '));
    
    return fallbackTabs;
  }, [configData]);

  const bottomTabs = [
    { id: 'orders', label: 'Orders', icon: icons.orders },
    { id: 'menu', label: 'Menu', icon: icons.menu },
    { id: 'finance', label: 'Finance', icon: icons.finance },
    { id: 'more', label: 'More', icon: icons.more },
  ];

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
    console.log('Order accepted:', order);
    // Here you would make an API call to accept the order
    // For now, just update local state
    setPendingOrders(prevOrders => prevOrders.filter(o => o.id !== order.id));
    setOrderCount(prev => Math.max(0, prev - 1));
    showToast(`Order #${order.id} accepted`, 'success');
  };

  const handleDenyOrder = (order) => {
    console.log('Order denied:', order);
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
      console.log('🔍 Testing Catalog API:', url);
      
      const response = await fetchWithAuth(url, {
        method: 'GET',
      });
      
      const responseData = await response.json();
      
      console.log('📦 Catalog API Response Status:', response.status);
      console.log('📦 Catalog API Response Data:', JSON.stringify(responseData, null, 2));
      
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
      console.log('🔍 Testing Config API:', url);
      
      const response = await fetchWithAuth(url, {
        method: 'GET',
      });
      
      const responseData = await response.json();
      
      console.log('📦 Config API Response Status:', response.status);
      console.log('📦 Config API Response Data:', JSON.stringify(responseData, null, 2));
      
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

  // Render MenuScreen when menu tab is active
  if (activeBottomTab === 'menu') {
    return (
      <SafeAreaView style={styles.fullScreenContainer} edges={['top', 'left', 'right']}>
        <View style={styles.menuScreenWrapper}>
          <MenuScreen partnerStatus={partnerStatus} />
        </View>
        {/* Bottom Navigation Bar */}
        <View style={styles.bottomNav}>
          {bottomTabs.map((tab) => (
            <TouchableOpacity
              key={tab.id}
              style={styles.bottomNavItem}
              onPress={() => setActiveBottomTab(tab.id)}
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
            onNavigate={onNavigate}
            configData={configData}
          />
        </View>
        {/* Bottom Navigation Bar */}
        <View style={styles.bottomNav}>
          {bottomTabs.map((tab) => (
            <TouchableOpacity
              key={tab.id}
              style={styles.bottomNavItem}
              onPress={() => setActiveBottomTab(tab.id)}
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
            onPress={() => setActiveBottomTab(tab.id)}
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
