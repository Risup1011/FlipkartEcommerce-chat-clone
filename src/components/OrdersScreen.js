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
  FlatList,
  ActivityIndicator,
  RefreshControl,
  Modal,
  Platform,
  Vibration,
  Dimensions,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Poppins, icons, images } from '../assets';
import NewOrdersScreen from './NewOrdersScreen';
import MenuScreen from './MenuScreen';
import MoreScreen from './MoreScreen';
import { useToast } from './ToastContext';
import { fetchWithAuth } from '../utils/apiHelpers';
import { API_BASE_URL } from '../config';

// Try to import react-native-sound, but handle gracefully if not available
let Sound = null;
try {
  Sound = require('react-native-sound').default;
} catch (e) {
  // Sound library not available
}

const OrdersScreen = ({ onBack, partnerStatus, newOrders = [], onNewOrderReceived, onLogout, initialTab, initialBottomTab, onNavigate }) => {
  const { showToast } = useToast();
  const [isOnline, setIsOnline] = useState(true);
  const [activeTab, setActiveTab] = useState(initialTab || 'preparing');
  const [activeBottomTab, setActiveBottomTab] = useState(initialBottomTab || 'orders');
  const [orderCount, setOrderCount] = useState(0);
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
  
  // Orders state by status
  const [ordersByStatus, setOrdersByStatus] = useState({
    NEW: [],
    PREPARING: [],
    READY: [],
    PICKED_UP: [],
    DELIVERED: [],
    CANCELLED: [],
  });
  const [isLoadingOrders, setIsLoadingOrders] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastNewOrdersCount, setLastNewOrdersCount] = useState(0);
  const pollingIntervalRef = useRef(null);
  const [showTimePickerModal, setShowTimePickerModal] = useState(false);
  const [selectedOrderForTimeUpdate, setSelectedOrderForTimeUpdate] = useState(null);
  const [preparationTime, setPreparationTime] = useState(15);
  const [isMarkingReady, setIsMarkingReady] = useState(false);
  const [isUpdatingTime, setIsUpdatingTime] = useState(false);
  const [isMarkingPickedUp, setIsMarkingPickedUp] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());

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

  // Map API status to tab ID
  const mapStatusToTabId = (status) => {
    const statusMap = {
      'NEW': 'new',
      'PREPARING': 'preparing',
      'READY': 'ready',
      'PICKED_UP': 'pickedUp',
      'DELIVERED': 'pastOrders',
      'COMPLETED': 'pastOrders', // Keep for backward compatibility
      'CANCELLED': 'pastOrders',
    };
    return statusMap[status] || 'preparing';
  };

  // Map tab ID to API status(es)
  const mapTabIdToStatus = (tabId) => {
    const tabMap = {
      'new': 'NEW',
      'preparing': 'PREPARING',
      'ready': 'READY',
      'pickedUp': 'PICKED_UP',
      'pastOrders': ['DELIVERED', 'COMPLETED', 'CANCELLED'], // Multiple statuses for past orders (DELIVERED is primary)
    };
    return tabMap[tabId];
  };

  // Format time from created_at (relative)
  const formatTime = (dateString) => {
    if (!dateString) return 'Just now';
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffMs = now - date;
      const diffMins = Math.floor(diffMs / 60000);
      
      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins} min${diffMins > 1 ? 's' : ''} ago`;
      const diffHours = Math.floor(diffMins / 60);
      if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
      const diffDays = Math.floor(diffHours / 24);
      return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    } catch (e) {
      return 'Just now';
    }
  };

  // Format time for display (HH:MM AM/PM)
  const formatTimeDisplay = (dateString) => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      const hours = date.getHours();
      const minutes = date.getMinutes();
      const ampm = hours >= 12 ? 'PM' : 'AM';
      const displayHours = hours % 12 || 12;
      const displayMinutes = minutes.toString().padStart(2, '0');
      return `${displayHours}:${displayMinutes} ${ampm}`;
    } catch (e) {
      return '';
    }
  };

  // Format date (DD/MM/YY)
  const formatDate = (dateString) => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      const day = date.getDate().toString().padStart(2, '0');
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const year = date.getFullYear().toString().slice(-2);
      return `${day}/${month}/${year}`;
    } catch (e) {
      return '';
    }
  };

  // Calculate remaining time for countdown (MM:SS)
  const calculateRemainingTime = (estimatedReadyTime) => {
    if (!estimatedReadyTime) return null;
    try {
      const target = new Date(estimatedReadyTime);
      const now = new Date();
      const diffMs = target - now;
      
      if (diffMs <= 0) return '00:00';
      
      const totalSeconds = Math.floor(diffMs / 1000);
      const minutes = Math.floor(totalSeconds / 60);
      const seconds = totalSeconds % 60;
      
      return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    } catch (e) {
      return null;
    }
  };

  // Transform API order to UI format
  const transformOrder = (apiOrder) => {

    // Parse items from items_preview
    const parseItems = (itemsPreview) => {
      if (!itemsPreview) return [];
      try {
        // Format: "BBQ Chicken Pizza x 1, Chicken Wings x 1..."
        return itemsPreview.split(',').map(item => {
          const trimmed = item.trim();
          const match = trimmed.match(/^(.+?)\s+x\s+(\d+)$/);
          if (match) {
            return {
              name: match[1].trim(),
              quantity: parseInt(match[2], 10),
              price: 0, // API doesn't provide individual prices in preview
            };
          }
          return {
            name: trimmed,
            quantity: 1,
            price: 0,
          };
        });
      } catch (e) {
        return [];
      }
    };

    return {
      // Always use the MongoDB ObjectId (id), never fallback to order_number for API calls
      id: apiOrder.id,
      orderNumber: apiOrder.order_number,
      customerName: apiOrder.customer_name || 'Customer',
      customerPhone: apiOrder.customer_phone,
      amount: apiOrder.total_amount || 0,
      time: formatTime(apiOrder.created_at),
      timeDisplay: formatTimeDisplay(apiOrder.created_at),
      dateDisplay: formatDate(apiOrder.created_at),
      items: parseItems(apiOrder.items_preview),
      itemCount: apiOrder.item_count || 0,
      itemsPreview: apiOrder.items_preview,
      deliveryAddress: apiOrder.delivery_address || 'Address not available',
      estimatedTime: apiOrder.preparation_time_minutes || null,
      estimatedReadyTime: apiOrder.estimated_ready_time,
      status: apiOrder.status,
      statusDisplay: apiOrder.status_display,
      paymentMethod: apiOrder.payment_method,
      isAssignedToRider: apiOrder.is_assigned_to_rider || false,
      createdAt: apiOrder.created_at,
      acceptedAt: apiOrder.accepted_at,
      readyAt: apiOrder.ready_at,
      pickedUpAt: apiOrder.picked_up_at,
      // Rider information (if available in API)
      riderName: apiOrder.rider_name || null,
      riderPhone: apiOrder.rider_phone || null,
      riderImage: apiOrder.rider_image || null,
      // Additional fields for OrderDetailsScreen
      contactNumber: apiOrder.customer_phone,
      packagingCharge: apiOrder.packaging_charge || apiOrder.packagingCharge || 0,
      gst: apiOrder.gst || apiOrder.tax || 0,
      // Delivery tracking information (if available in API)
      deliveryTime: apiOrder.delivery_time || null,
      deliveryDistance: apiOrder.delivery_distance || null,
      deliveryRating: apiOrder.delivery_rating || apiOrder.rating || null,
      estimatedArrivalTime: apiOrder.estimated_arrival_time || apiOrder.arrival_time || null,
    };
  };

  // Fetch orders by status
  const fetchOrdersByStatus = async (status) => {
    try {
      const url = `${API_BASE_URL}v1/orders/by-status?status=${status}`;
      console.log(`📡 [OrdersScreen] ========================================`);
      console.log(`📡 [OrdersScreen] FETCHING ORDERS BY STATUS`);
      console.log(`📡 [OrdersScreen] URL: ${url}`);
      console.log(`📡 [OrdersScreen] Status: ${status}`);
      console.log(`📡 [OrdersScreen] ========================================`);
      
      const response = await fetchWithAuth(url, {
        method: 'GET',
      });
      
      console.log(`📡 [OrdersScreen] HTTP Response Status: ${response.status}`);
      console.log(`📡 [OrdersScreen] HTTP Response OK: ${response.ok}`);
      
      const responseData = await response.json();
      
      console.log(`📡 [OrdersScreen] ========================================`);
      console.log(`📡 [OrdersScreen] RAW API RESPONSE`);
      console.log(`📡 [OrdersScreen] ========================================`);
      console.log(`📡 [OrdersScreen] Response Code: ${responseData?.code}`);
      console.log(`📡 [OrdersScreen] Response Status: ${responseData?.status}`);
      console.log(`📡 [OrdersScreen] Response Message: ${responseData?.message || 'N/A'}`);
      console.log(`📡 [OrdersScreen] Is Data Array: ${Array.isArray(responseData?.data)}`);
      console.log(`📡 [OrdersScreen] Data Length: ${responseData?.data?.length || 0}`);
      
      if (status === 'NEW') {
        console.log(`📡 [OrdersScreen] ========================================`);
        console.log(`📡 [OrdersScreen] NEW ORDERS RAW API DATA`);
        console.log(`📡 [OrdersScreen] ========================================`);
        if (Array.isArray(responseData?.data) && responseData.data.length > 0) {
          console.log(`📡 [OrdersScreen] Full API Response Data:`, JSON.stringify(responseData.data, null, 2));
          responseData.data.forEach((order, index) => {
            console.log(`📡 [OrdersScreen] Raw Order ${index + 1}:`, JSON.stringify(order, null, 2));
          });
        } else {
          console.log(`📡 [OrdersScreen] No NEW orders in API response`);
          console.log(`📡 [OrdersScreen] Response Data:`, JSON.stringify(responseData, null, 2));
        }
        console.log(`📡 [OrdersScreen] ========================================`);
      }
      
      if (response.ok && responseData?.code === 200 && Array.isArray(responseData.data)) {
        console.log(`✅ [OrdersScreen] ========================================`);
        console.log(`✅ [OrdersScreen] API RESPONSE SUCCESS`);
        console.log(`✅ [OrdersScreen] ========================================`);
        console.log(`✅ [OrdersScreen] Code: ${responseData.code}, Status: ${responseData.status}`);
        console.log(`✅ [OrdersScreen] Received ${responseData.data.length} orders from API`);
        
        const transformedOrders = responseData.data.map((apiOrder, index) => {
          console.log(`🔄 [OrdersScreen] Transforming order ${index + 1}/${responseData.data.length}`);
          console.log(`🔄 [OrdersScreen] Raw API Order:`, JSON.stringify(apiOrder, null, 2));
          const transformed = transformOrder(apiOrder);
          console.log(`🔄 [OrdersScreen] Transformed Order:`, JSON.stringify(transformed, null, 2));
          return transformed;
        });
        
        console.log(`✅ [OrdersScreen] ========================================`);
        console.log(`✅ [OrdersScreen] TRANSFORMATION COMPLETE`);
        console.log(`✅ [OrdersScreen] ========================================`);
        console.log(`✅ [OrdersScreen] Transformed ${transformedOrders.length} orders for status: ${status}`);
        
        // Log NEW order details for debugging
        if (status === 'NEW' && transformedOrders.length > 0) {
          console.log(`📋 [OrdersScreen] ========================================`);
          console.log(`📋 [OrdersScreen] NEW ORDER DETAILS (TRANSFORMED)`);
          console.log(`📋 [OrdersScreen] ========================================`);
          transformedOrders.forEach((order, index) => {
            console.log(`  📦 Order ${index + 1}:`);
            console.log(`    - ID: ${order.id}`);
            console.log(`    - Order Number: ${order.orderNumber}`);
            console.log(`    - Customer: ${order.customerName}`);
            console.log(`    - Phone: ${order.customerPhone}`);
            console.log(`    - Amount: ₹${order.amount}`);
            console.log(`    - Items: ${order.itemCount} (${order.itemsPreview})`);
            console.log(`    - Payment Method: ${order.paymentMethod}`);
            console.log(`    - Status: ${order.status}`);
            console.log(`    - Status Display: ${order.statusDisplay}`);
            console.log(`    - Created At: ${order.createdAt}`);
            console.log(`    - Time Display: ${order.timeDisplay}`);
          });
          console.log(`📋 [OrdersScreen] ========================================`);
        }
        
        // Log PREPARING order details for debugging
        if (status === 'PREPARING' && transformedOrders.length > 0) {
          console.log(`📋 [OrdersScreen] ========================================`);
          console.log(`📋 [OrdersScreen] PREPARING ORDER DETAILS`);
          console.log(`📋 [OrdersScreen] ========================================`);
          transformedOrders.forEach((order, index) => {
            console.log(`  📦 Order ${index + 1}:`);
            console.log(`    - ID: ${order.id}`);
            console.log(`    - Order Number: ${order.orderNumber}`);
            console.log(`    - Customer: ${order.customerName}`);
            console.log(`    - Phone: ${order.customerPhone}`);
            console.log(`    - Amount: ₹${order.amount}`);
            console.log(`    - Items: ${order.itemCount} (${order.itemsPreview})`);
            console.log(`    - Payment Method: ${order.paymentMethod}`);
            console.log(`    - Status Display: ${order.statusDisplay}`);
            console.log(`    - Preparation Time: ${order.estimatedTime} minutes`);
            console.log(`    - Estimated Ready Time: ${order.estimatedReadyTime}`);
            console.log(`    - Accepted At: ${order.acceptedAt}`);
            console.log(`    - Created At: ${order.createdAt}`);
            console.log(`    - Is Assigned to Rider: ${order.isAssignedToRider}`);
          });
          console.log(`📋 [OrdersScreen] ========================================`);
        }
        
        // Log order IDs to help debug ID format issues
        transformedOrders.forEach((order, index) => {
          if (!order.id || typeof order.id !== 'string' || !/^[0-9a-fA-F]{24}$/.test(order.id)) {
            console.warn(`⚠️ [OrdersScreen] Order ${index} has invalid ID format:`, order.id);
            console.warn(`⚠️ [OrdersScreen] Order number:`, order.orderNumber);
            console.warn(`⚠️ [OrdersScreen] Full order:`, JSON.stringify(order, null, 2));
          }
        });
        
        console.log(`✅ [OrdersScreen] ========================================`);
        console.log(`✅ [OrdersScreen] RETURNING TRANSFORMED ORDERS`);
        console.log(`✅ [OrdersScreen] ========================================`);
        console.log(`✅ [OrdersScreen] Returning ${transformedOrders.length} orders for status: ${status}`);
        return transformedOrders;
      } else {
        // For COMPLETED and CANCELLED statuses, log as warning instead of error
        // since these endpoints might not be fully implemented on backend
        const isNonCriticalStatus = status === 'COMPLETED' || status === 'CANCELLED';
        const logMethod = isNonCriticalStatus ? console.warn : console.error;
        const logPrefix = isNonCriticalStatus ? '⚠️' : '❌';
        
        logMethod(`${logPrefix} [OrdersScreen] ========================================`);
        logMethod(`${logPrefix} [OrdersScreen] API RESPONSE FAILED${isNonCriticalStatus ? ' (Non-critical)' : ''}`);
        logMethod(`${logPrefix} [OrdersScreen] ========================================`);
        logMethod(`${logPrefix} [OrdersScreen] HTTP Status: ${response.status}`);
        logMethod(`${logPrefix} [OrdersScreen] Response OK: ${response.ok}`);
        logMethod(`${logPrefix} [OrdersScreen] Response Code: ${responseData?.code}`);
        logMethod(`${logPrefix} [OrdersScreen] Response Status: ${responseData?.status}`);
        logMethod(`${logPrefix} [OrdersScreen] Response Message: ${responseData?.message || 'N/A'}`);
        if (!isNonCriticalStatus) {
          logMethod(`${logPrefix} [OrdersScreen] Is Data Array: ${Array.isArray(responseData?.data)}`);
          logMethod(`${logPrefix} [OrdersScreen] Full Response Data:`, JSON.stringify(responseData, null, 2));
        }
        // Return empty array - this is expected for non-implemented statuses
        return [];
      }
    } catch (error) {
      console.error(`❌ [OrdersScreen] ========================================`);
      console.error(`❌ [OrdersScreen] EXCEPTION FETCHING ORDERS`);
      console.error(`❌ [OrdersScreen] ========================================`);
      console.error(`❌ [OrdersScreen] Status: ${status}`);
      console.error(`❌ [OrdersScreen] Error Type: ${error?.constructor?.name || 'Unknown'}`);
      console.error(`❌ [OrdersScreen] Error Message: ${error?.message || 'Unknown error'}`);
      console.error(`❌ [OrdersScreen] Error Stack:`, error?.stack);
      console.error(`❌ [OrdersScreen] Full Error:`, JSON.stringify(error, Object.getOwnPropertyNames(error), 2));
      return [];
    }
  };

  // Fetch all orders for current tab
  const fetchOrdersForTab = async (tabId) => {
    const statusOrStatuses = mapTabIdToStatus(tabId);
    if (!statusOrStatuses) {
      console.warn(`⚠️ [OrdersScreen] No status mapping for tab: ${tabId}`);
      return;
    }
    
    console.log(`📡 [OrdersScreen] Fetching orders for tab: ${tabId}, status: ${JSON.stringify(statusOrStatuses)}`);
    setIsLoadingOrders(true);
    try {
      // Handle multiple statuses (for pastOrders)
      if (Array.isArray(statusOrStatuses)) {
        const allOrders = [];
        const statusOrdersMap = {}; // Store orders by individual status
        
        for (const status of statusOrStatuses) {
          try {
            console.log(`📡 [OrdersScreen] Fetching orders with status: ${status}`);
            const orders = await fetchOrdersByStatus(status);
            statusOrdersMap[status] = orders; // Store in individual status key
            allOrders.push(...orders);
            console.log(`✅ [OrdersScreen] Successfully fetched ${orders.length} orders for status: ${status}`);
          } catch (error) {
            console.warn(`⚠️ [OrdersScreen] Failed to fetch orders for status ${status}, continuing with other statuses...`);
            console.warn(`⚠️ [OrdersScreen] Error:`, error?.message || error);
            // Store empty array for failed status to prevent undefined errors
            statusOrdersMap[status] = [];
          }
        }
        
        console.log(`✅ [OrdersScreen] Fetched ${allOrders.length} total orders for tab: ${tabId}`);
        console.log(`📋 [OrdersScreen] Orders by status:`, Object.keys(statusOrdersMap).map(s => `${s}: ${statusOrdersMap[s].length}`).join(', '));
        
        // Store orders in their individual status keys AND combine in first status for backward compatibility
        setOrdersByStatus(prev => {
          const updated = { ...prev };
          // Store in individual status keys
          Object.keys(statusOrdersMap).forEach(status => {
            updated[status] = statusOrdersMap[status];
          });
          // Also store combined in first status for display (backward compatibility)
          updated[statusOrStatuses[0]] = allOrders;
          return updated;
        });
      } else {
        console.log(`📡 [OrdersScreen] Fetching orders with status: ${statusOrStatuses}`);
        const orders = await fetchOrdersByStatus(statusOrStatuses);
        console.log(`✅ [OrdersScreen] Fetched ${orders.length} orders for tab: ${tabId} (status: ${statusOrStatuses})`);
        setOrdersByStatus(prev => ({
          ...prev,
          [statusOrStatuses]: orders,
        }));
      }
    } catch (error) {
      console.error(`❌ [OrdersScreen] Error fetching orders for tab ${tabId}:`, error);
    } finally {
      setIsLoadingOrders(false);
    }
  };

  // Fetch new orders and check for updates
  const fetchNewOrders = async () => {
    try {
      console.log('📡 [OrdersScreen] ========================================');
      console.log('📡 [OrdersScreen] FETCHING NEW ORDERS FROM API');
      console.log('📡 [OrdersScreen] Endpoint: /v1/orders/by-status?status=NEW');
      console.log('📡 [OrdersScreen] ========================================');
      
      const newOrders = await fetchOrdersByStatus('NEW');
      
      console.log(`✅ [OrdersScreen] Successfully fetched ${newOrders.length} new orders`);
      
      // Log order details for debugging
      if (newOrders.length > 0) {
        console.log('📋 [OrdersScreen] New Orders Details:');
        newOrders.forEach((order, index) => {
          console.log(`  Order ${index + 1}:`);
          console.log(`    - ID: ${order.id}`);
          console.log(`    - Order Number: ${order.orderNumber}`);
          console.log(`    - Customer: ${order.customerName}`);
          console.log(`    - Phone: ${order.customerPhone}`);
          console.log(`    - Amount: ₹${order.amount}`);
          console.log(`    - Items: ${order.itemCount} (${order.itemsPreview})`);
          console.log(`    - Payment: ${order.paymentMethod}`);
          console.log(`    - Status: ${order.statusDisplay || order.status}`);
        });
      }
      
      // Update orders state
      console.log(`🔄 [OrdersScreen] ========================================`);
      console.log(`🔄 [OrdersScreen] UPDATING STATE`);
      console.log(`🔄 [OrdersScreen] ========================================`);
      console.log(`🔄 [OrdersScreen] Previous ordersByStatus.NEW:`, ordersByStatus.NEW?.length || 0);
      console.log(`🔄 [OrdersScreen] New orders to set:`, newOrders.length);
      console.log(`🔄 [OrdersScreen] New orders data:`, JSON.stringify(newOrders, null, 2));
      
      setOrdersByStatus(prev => {
        const updated = {
          ...prev,
          NEW: newOrders,
        };
        console.log(`🔄 [OrdersScreen] Updated ordersByStatus:`, {
          NEW: updated.NEW?.length || 0,
          PREPARING: updated.PREPARING?.length || 0,
          READY: updated.READY?.length || 0,
          PICKED_UP: updated.PICKED_UP?.length || 0,
          DELIVERED: updated.DELIVERED?.length || 0,
        });
        return updated;
      });
      
      // Update order count for banner
      const previousCount = orderCount;
      setOrderCount(newOrders.length);
      console.log(`🟢 [OrdersScreen] ========================================`);
      console.log(`🟢 [OrdersScreen] BANNER COUNT UPDATE`);
      console.log(`🟢 [OrdersScreen] ========================================`);
      console.log(`🟢 [OrdersScreen] Previous count: ${previousCount}`);
      console.log(`🟢 [OrdersScreen] New count: ${newOrders.length}`);
      console.log(`🟢 [OrdersScreen] Banner count updated: ${previousCount} → ${newOrders.length}`);
      
      // Check if there are new orders that weren't there before (auto-open modal only for new arrivals)
      if (newOrders.length > lastNewOrdersCount && lastNewOrdersCount > 0) {
        // New orders arrived - show modal automatically
        const newlyArrived = newOrders.slice(lastNewOrdersCount);
        console.log(`🆕 [OrdersScreen] ${newlyArrived.length} new order(s) arrived - auto-opening modal`);
        setPendingOrders(newlyArrived);
        setShowNewOrdersModal(true);
        if (onNewOrderReceived) {
          onNewOrderReceived(newlyArrived);
        }
      } else if (newOrders.length > 0 && lastNewOrdersCount === 0) {
        // First load with orders - show modal automatically
        console.log(`🆕 [OrdersScreen] First load with ${newOrders.length} order(s) - auto-opening modal`);
        setPendingOrders(newOrders);
        setShowNewOrdersModal(true);
        if (onNewOrderReceived) {
          onNewOrderReceived(newOrders);
        }
      }
      
      setLastNewOrdersCount(newOrders.length);
      
      console.log('✅ [OrdersScreen] ========================================');
      console.log('✅ [OrdersScreen] NEW ORDERS FETCH COMPLETE');
      console.log('✅ [OrdersScreen] ========================================');
      
      // Return orders for use by banner click handler
      return newOrders;
    } catch (error) {
      console.error('❌ [OrdersScreen] ========================================');
      console.error('❌ [OrdersScreen] ERROR FETCHING NEW ORDERS');
      console.error('❌ [OrdersScreen] Error:', error);
      console.error('❌ [OrdersScreen] ========================================');
      setOrderCount(0);
      return [];
    }
  };

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
        console.log('📡 [OrdersScreen] Fetching backend configuration from:', url);
        
        const response = await fetchWithAuth(url, {
          method: 'GET',
        });
        
        const responseData = await response.json();
        console.log('✅ [OrdersScreen] Backend config received:', {
          hasOrderStatusLabels: !!responseData.data?.order_status_labels,
          hasPartnerInfo: !!responseData.data?.partner_info,
          hasBottomNavTabs: !!responseData.data?.bottom_navigation_tabs,
        });
        
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

  // Fetch orders when component mounts and when tab changes
  useEffect(() => {
    if (!isLoadingConfigData) {
      // Fetch orders for current tab
      fetchOrdersForTab(activeTab);
      
      // Fetch new orders
      fetchNewOrders();
    }
  }, [activeTab, isLoadingConfigData]);

  // Set up polling for new orders (every 30 seconds)
  useEffect(() => {
    if (isOnline) {
      // Initial fetch on mount
      console.log('🔄 [OrdersScreen] Setting up new orders polling...');
      fetchNewOrders();
      
      // Set up polling interval to fetch new orders every 30 seconds
      pollingIntervalRef.current = setInterval(() => {
        console.log('🔄 [OrdersScreen] Polling for new orders...');
        fetchNewOrders();
      }, 30000); // Poll every 30 seconds
      
      return () => {
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current);
        }
      };
    } else {
      // Clear polling when offline
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
      // Reset order count when offline
      setOrderCount(0);
    }
  }, [isOnline]);

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
    console.log('🔄 [OrdersScreen] Generating order tabs from config...');
    
    if (configData?.order_status_labels) {
      const labels = configData.order_status_labels;
      console.log('✅ [OrdersScreen] Using BACKEND labels from config:', labels);
      
      // Map API keys to tab structure
      // API uses: preparing, ready, picked_up, past_order
      // Frontend uses: preparing, ready, pickedUp, pastOrders
      // Note: NEW orders are accessed via green banner only, not in tabs
      const tabs = [
        { id: 'preparing', label: labels.preparing || 'Preparing' },
        { id: 'ready', label: labels.ready || 'Ready' },
        { id: 'pickedUp', label: labels.picked_up || 'Picked Up' },
        { id: 'pastOrders', label: labels.past_order || 'Past Orders' },
      ];
      
      console.log('📋 [OrdersScreen] Generated tabs from backend:', tabs.map(t => `${t.id}: "${t.label}"`).join(', '));
      
      // Log which labels used backend vs fallback
      tabs.forEach(tab => {
        const backendValue = labels[tab.id === 'pickedUp' ? 'picked_up' : tab.id === 'pastOrders' ? 'past_order' : tab.id];
        if (backendValue) {
          console.log(`  ✅ ${tab.id}: Using backend label "${backendValue}"`);
        } else {
          console.log(`  ⚠️ ${tab.id}: Using fallback label "${tab.label}"`);
        }
      });
      
      return tabs;
    }
    
    // Fallback to default values if config not loaded yet
    console.log('⚠️ [OrdersScreen] Config not loaded yet, using FALLBACK tabs');
    // Note: NEW orders are accessed via green banner only, not in tabs
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
    
    // Fetch orders for the selected tab
    fetchOrdersForTab(tabId);
    
    // Scroll to the selected tab
    if (tabsScrollViewRef.current && tabPositions.current[tabId] !== undefined) {
      tabsScrollViewRef.current.scrollTo({
        x: tabPositions.current[tabId] - 20, // Subtract padding to show tab properly
        animated: true,
      });
    }
  };

  const handleAcceptOrder = async (order) => {
    // Order acceptance is now handled in OrderDetailsScreen via API
    // This function is called after successful acceptance
    try {
      // Update local state
      setPendingOrders(prevOrders => prevOrders.filter(o => o.id !== order.id));
      setOrdersByStatus(prev => ({
        ...prev,
        NEW: prev.NEW.filter(o => o.id !== order.id),
      }));
      setOrderCount(prev => Math.max(0, prev - 1));
      setLastNewOrdersCount(prev => Math.max(0, prev - 1));
      
      showToast(`Order ${order.orderNumber || order.id} accepted`, 'success');
      
      // Refresh orders after accepting
      setTimeout(() => {
        fetchNewOrders();
        fetchOrdersForTab(activeTab);
      }, 1000);
    } catch (error) {
      console.error('❌ Error updating order state:', error);
    }
  };

  const handleDenyOrder = async (order) => {
    try {
      // TODO: Make API call to deny order
      // const url = `${API_BASE_URL}v1/orders/${order.id}/deny`;
      // const response = await fetchWithAuth(url, { method: 'POST' });
      
      // Update local state
      setPendingOrders(prevOrders => prevOrders.filter(o => o.id !== order.id));
      setOrdersByStatus(prev => ({
        ...prev,
        NEW: prev.NEW.filter(o => o.id !== order.id),
      }));
      setOrderCount(prev => Math.max(0, prev - 1));
      setLastNewOrdersCount(prev => Math.max(0, prev - 1));
      
      showToast(`Order ${order.orderNumber || order.id} denied`, 'info');
      
      // Refresh orders after denying
      setTimeout(() => {
        fetchNewOrders();
        fetchOrdersForTab(activeTab);
      }, 1000);
    } catch (error) {
      console.error('❌ Error denying order:', error);
      showToast('Failed to deny order', 'error');
    }
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

  // Countdown timer component for preparing orders
  const PreparingCountdown = ({ estimatedReadyTime }) => {
    const [countdown, setCountdown] = useState(() => {
      if (!estimatedReadyTime) return null;
      const remaining = calculateRemainingTime(estimatedReadyTime);
      if (!remaining) return null;
      const [minutes, seconds] = remaining.split(':');
      return { minutes: parseInt(minutes, 10), seconds: parseInt(seconds, 10) };
    });
    
    useEffect(() => {
      if (!estimatedReadyTime) return;
      
      const interval = setInterval(() => {
        const remaining = calculateRemainingTime(estimatedReadyTime);
        if (!remaining || remaining === '00:00') {
          setCountdown(null);
          clearInterval(interval);
          return;
        }
        const [minutes, seconds] = remaining.split(':');
        setCountdown({ minutes: parseInt(minutes, 10), seconds: parseInt(seconds, 10) });
      }, 1000);
      
      return () => clearInterval(interval);
    }, [estimatedReadyTime]);
    
    if (!countdown) return <Text style={styles.markReadyButtonText}>Mark ready</Text>;
    
    return (
      <Text style={styles.markReadyButtonText}>
        Mark ready in {countdown.minutes}:{countdown.seconds.toString().padStart(2, '0')} min
      </Text>
    );
  };

  // Mark order as ready API
  const handleMarkOrderReady = async (order) => {
    if (!order || !order.id) {
      showToast('Order ID not available', 'error');
      return;
    }

    setIsMarkingReady(true);
    try {
      const url = `${API_BASE_URL}v1/orders/${order.id}/mark-ready`;
      console.log(`📡 [OrdersScreen] Marking order as ready: ${order.id}`);

      const response = await fetchWithAuth(url, {
        method: 'PUT',
      });

      const responseData = await response.json();

      if (response.ok && responseData?.code === 200) {
        console.log(`✅ [OrdersScreen] Order marked as ready successfully`);
        showToast('Order marked as ready', 'success');
        
        // Remove order from PREPARING list immediately
        setOrdersByStatus(prev => ({
          ...prev,
          PREPARING: prev.PREPARING.filter(o => o.id !== order.id),
        }));
        
        // Switch to Ready tab to show the order
        if (activeTab === 'preparing') {
          setActiveTab('ready');
          
          // Scroll to ready tab
          setTimeout(() => {
            if (tabsScrollViewRef.current && tabPositions.current['ready'] !== undefined) {
              tabsScrollViewRef.current.scrollTo({
                x: tabPositions.current['ready'] - 20,
                animated: true,
              });
            }
          }, 100);
        }
        
        // Refresh orders after marking ready
        setTimeout(() => {
          fetchOrdersForTab('ready');
          fetchNewOrders();
        }, 500);
      } else {
        console.error(`❌ [OrdersScreen] Failed to mark order as ready:`, response.status, responseData);
        const errorMessage = responseData?.message || 'Failed to mark order as ready';
        showToast(errorMessage, 'error');
      }
    } catch (error) {
      console.error(`❌ [OrdersScreen] Error marking order as ready:`, error);
      showToast('Error marking order as ready. Please try again.', 'error');
    } finally {
      setIsMarkingReady(false);
    }
  };

  // Update preparation time API
  const handleUpdatePreparationTime = async (orderId, minutes) => {
    if (!orderId) {
      showToast('Order ID not available', 'error');
      return;
    }

    setIsUpdatingTime(true);
    try {
      const url = `${API_BASE_URL}v1/orders/${orderId}/preparation-time`;
      console.log(`📡 [OrdersScreen] Updating preparation time: ${orderId} to ${minutes} minutes`);

      const response = await fetchWithAuth(url, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          preparation_time_minutes: minutes,
        }),
      });

      const responseData = await response.json();

      if (response.ok && responseData?.code === 200) {
        console.log(`✅ [OrdersScreen] Preparation time updated successfully`);
        showToast('Preparation time updated successfully', 'success');
        
        // Close modal
        setShowTimePickerModal(false);
        setSelectedOrderForTimeUpdate(null);
        
        // Refresh orders after updating time
        setTimeout(() => {
          fetchOrdersForTab(activeTab);
        }, 1000);
      } else {
        console.error(`❌ [OrdersScreen] Failed to update preparation time:`, response.status, responseData);
        const errorMessage = responseData?.message || 'Failed to update preparation time';
        showToast(errorMessage, 'error');
      }
    } catch (error) {
      console.error(`❌ [OrdersScreen] Error updating preparation time:`, error);
      showToast('Error updating preparation time. Please try again.', 'error');
    } finally {
      setIsUpdatingTime(false);
    }
  };

  // Open time picker modal
  const openTimePicker = (order) => {
    setSelectedOrderForTimeUpdate(order);
    setPreparationTime(order.preparationTimeMinutes || order.estimatedTime || 15);
    setShowTimePickerModal(true);
  };

  // Handle time picker preset selection
  const handlePresetTimeSelect = (minutes) => {
    setPreparationTime(minutes);
  };

  // Handle time increment/decrement
  const handleTimeIncrement = () => {
    if (preparationTime < 300) {
      setPreparationTime(preparationTime + 1);
    }
  };

  const handleTimeDecrement = () => {
    if (preparationTime > 1) {
      setPreparationTime(preparationTime - 1);
    }
  };

  // Handle time picker done
  const handleTimePickerDone = () => {
    if (selectedOrderForTimeUpdate) {
      handleUpdatePreparationTime(selectedOrderForTimeUpdate.id, preparationTime);
    }
  };

  // Mark order as picked up API
  const handleMarkOrderPickedUp = async (order) => {
    if (!order || !order.id) {
      showToast('Order ID not available', 'error');
      return;
    }

    setIsMarkingPickedUp(true);
    try {
      console.log('📡 [OrdersScreen] ========================================');
      console.log('📡 [OrdersScreen] MARKING ORDER AS PICKED UP');
      console.log('📡 [OrdersScreen] ========================================');
      console.log(`📡 [OrdersScreen] Order ID: ${order.id}`);
      console.log(`📡 [OrdersScreen] Order Number: ${order.orderNumber}`);
      
      // Use partner API endpoint
      // Note: The API documentation shows this endpoint is for rider app
      // If backend doesn't have partner endpoint, this will return 500 error
      // Backend needs to implement: PUT /partner/api/v1/orders/{orderId}/mark-picked-up
      const url = `${API_BASE_URL}v1/orders/${order.id}/mark-picked-up`;
      console.log(`📡 [OrdersScreen] Endpoint: ${url}`);
      console.log(`📡 [OrdersScreen] Note: This endpoint may need to be implemented on backend for partner app`);

      const response = await fetchWithAuth(url, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const responseData = await response.json();
      
      console.log(`📡 [OrdersScreen] Response Status: ${response.status}`);
      console.log(`📡 [OrdersScreen] Response Code: ${responseData?.code}`);
      console.log(`📡 [OrdersScreen] Response Message: ${responseData?.message || 'N/A'}`);

      if (response.ok && responseData?.code === 200) {
        console.log('✅ [OrdersScreen] ========================================');
        console.log('✅ [OrdersScreen] ORDER MARKED AS PICKED UP SUCCESSFULLY');
        console.log('✅ [OrdersScreen] ========================================');
        console.log('📋 [OrdersScreen] Updated Order Data:', JSON.stringify(responseData.data, null, 2));
        
        showToast('Order marked as picked up', 'success');
        
        // Remove order from READY list immediately
        setOrdersByStatus(prev => ({
          ...prev,
          READY: prev.READY.filter(o => o.id !== order.id),
        }));
        
        // Switch to Picked Up tab to show the order
        if (activeTab === 'ready') {
          setActiveTab('pickedUp');
          
          // Scroll to picked up tab
          setTimeout(() => {
            if (tabsScrollViewRef.current && tabPositions.current['pickedUp'] !== undefined) {
              tabsScrollViewRef.current.scrollTo({
                x: tabPositions.current['pickedUp'] - 20,
                animated: true,
              });
            }
          }, 100);
        }
        
        // Refresh orders after marking picked up
        setTimeout(() => {
          fetchOrdersForTab('pickedUp');
          fetchNewOrders();
        }, 500);
      } else {
        console.error('❌ [OrdersScreen] ========================================');
        console.error(`❌ [OrdersScreen] FAILED TO MARK ORDER AS PICKED UP`);
        console.error('❌ [OrdersScreen] ========================================');
        console.error(`❌ [OrdersScreen] HTTP Status: ${response.status}`);
        console.error(`❌ [OrdersScreen] Response Code: ${responseData?.code}`);
        console.error(`❌ [OrdersScreen] Response Message: ${responseData?.message || 'N/A'}`);
        console.error(`❌ [OrdersScreen] Full Response:`, JSON.stringify(responseData, null, 2));
        
        const errorMessage = responseData?.message || 'Failed to mark order as picked up';
        showToast(errorMessage, 'error');
      }
    } catch (error) {
      console.error('❌ [OrdersScreen] ========================================');
      console.error(`❌ [OrdersScreen] EXCEPTION MARKING ORDER AS PICKED UP`);
      console.error('❌ [OrdersScreen] ========================================');
      console.error(`❌ [OrdersScreen] Error:`, error);
      console.error(`❌ [OrdersScreen] Error Message:`, error?.message);
      console.error(`❌ [OrdersScreen] Error Stack:`, error?.stack);
      
      showToast('Error marking order as picked up. Please try again.', 'error');
    } finally {
      setIsMarkingPickedUp(false);
    }
  };

  // Generate dummy order data for styling PREPARING card
  const getDummyPreparingOrder = () => {
    const now = new Date();
    const readyTime = new Date(now.getTime() + 25 * 60000); // 25 minutes from now
    
    return {
      id: 'dummy-preparing-order',
      orderNumber: '#1234',
      customerName: 'John Doe',
      customerPhone: '+919876543210',
      amount: 1250.75,
      time: '5 mins ago',
      timeDisplay: '02:30 PM',
      dateDisplay: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: '2-digit' }),
      items: [
        { name: 'Chicken Biryani', quantity: 2, price: 0 },
        { name: 'Naan Bread x 2', quantity: 1, price: 0 },
      ],
      itemCount: 3,
      itemsPreview: 'Chicken Biryani x 2, Naan Bread x 2',
      deliveryAddress: '123 Main Street, City, State 12345',
      estimatedTime: 30,
      estimatedReadyTime: readyTime.toISOString(),
      status: 'PREPARING',
      statusDisplay: 'Preparing',
      paymentMethod: 'ONLINE',
      isAssignedToRider: false,
      createdAt: new Date(now.getTime() - 5 * 60000).toISOString(),
      acceptedAt: new Date(now.getTime() - 5 * 60000).toISOString(),
      readyAt: null,
      pickedUpAt: null,
      riderName: null,
      riderPhone: null,
      riderImage: null,
      contactNumber: '+919876543210',
      packagingCharge: 0,
      gst: 0,
      deliveryTime: null,
      deliveryDistance: null,
      deliveryRating: null,
      estimatedArrivalTime: null,
      isDummy: true, // Flag to identify dummy data
    };
  };

  // Generate dummy order data for styling PICKED_UP card
  const getDummyPickedUpOrder = () => {
    const now = new Date();
    const pickedUpTime = new Date(now.getTime() - 5 * 60000); // 5 minutes ago
    
    return {
      id: 'dummy-picked-up-order',
      orderNumber: '#5678',
      customerName: 'Jane Smith',
      customerPhone: '+919876543211',
      amount: 890.50,
      time: '10 mins ago',
      timeDisplay: '03:45 PM',
      dateDisplay: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: '2-digit' }),
      items: [
        { name: 'Veg Pizza', quantity: 1, price: 0 },
        { name: 'Garlic Bread x 2', quantity: 1, price: 0 },
      ],
      itemCount: 2,
      itemsPreview: 'Veg Pizza x 1, Garlic Bread x 2',
      deliveryAddress: '456 Park Avenue, City, State 12345',
      status: 'PICKED_UP',
      statusDisplay: 'On the Way',
      paymentMethod: 'ONLINE',
      isAssignedToRider: true,
      riderName: 'Raj Kumar',
      riderPhone: '+919876543212',
      riderImage: null,
      createdAt: new Date(now.getTime() - 30 * 60000).toISOString(),
      acceptedAt: new Date(now.getTime() - 25 * 60000).toISOString(),
      readyAt: new Date(now.getTime() - 10 * 60000).toISOString(),
      pickedUpAt: pickedUpTime.toISOString(),
      deliveredAt: null,
      contactNumber: '+919876543211',
      packagingCharge: 0,
      gst: 0,
      deliveryTime: null,
      deliveryDistance: null,
      deliveryRating: null,
      estimatedArrivalTime: new Date(now.getTime() + 10 * 60000).toISOString(), // 10 minutes from now
      isDummy: true, // Flag to identify dummy data
    };
  };

  // Render PREPARING order card
  const renderPreparingCard = (order) => {
    const isDummy = order.isDummy;
    
    // Log order details for debugging
    console.log('🎨 [OrdersScreen] Rendering PREPARING card:', {
      orderNumber: order.orderNumber,
      customerName: order.customerName,
      amount: order.amount,
      estimatedTime: order.estimatedTime,
      estimatedReadyTime: order.estimatedReadyTime,
      acceptedAt: order.acceptedAt,
      isDummy: isDummy,
    });
    
    return (
      <View style={[styles.preparingCard, isDummy && { opacity: 0.9 }]}>
        {/* PREPARING Banner - Similar to READY/DELIVERED banner */}
        <View style={styles.preparingBanner}>
          <Text style={styles.preparingBannerText}>
            {order.statusDisplay || 'PREPARING'}
          </Text>
        </View>
        
        <View style={styles.preparingCardHeader}>
          <Text style={styles.preparingOrderNumber}>
            {order.orderNumber || `#${order.id?.slice(-6) || 'N/A'}`}
          </Text>
        </View>
        
        <Text style={styles.preparingOrderDetails}>
          {order.timeDisplay || order.time || 'Just now'} | ₹{order.amount?.toFixed(2) || '0.00'} | {order.itemsPreview || `${order.itemCount || 0} items`}
        </Text>
        
        {/* Show preparation time if available */}
        {order.estimatedTime && (
          <Text style={styles.preparingTimeInfo}>
            Preparation Time: {order.estimatedTime} minutes
          </Text>
        )}
        
        <View style={styles.dashedLine} />
        
        <View style={styles.deAssignmentSection}>
          <Text style={styles.deAssignmentText}>DE will be assigned as prep time</Text>
          <Image
            source={icons.de}
            style={styles.deIcon}
            resizeMode="contain"
          />
        </View>
        
        <View style={styles.dashedLine} />
        
        <View style={styles.preparingActions}>
          <TouchableOpacity
            style={[styles.markReadyButton, (isMarkingReady || isDummy) && styles.markReadyButtonDisabled]}
            onPress={() => {
              if (!isDummy) {
                handleMarkOrderReady(order);
              }
            }}
            activeOpacity={isDummy ? 1 : 0.7}
            disabled={isMarkingReady || isDummy}
          >
            {isMarkingReady ? (
              <ActivityIndicator size="small" color="#FF6E1A" />
            ) : (
              <PreparingCountdown estimatedReadyTime={order.estimatedReadyTime} />
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.addButton, { marginLeft: 12 }, isDummy && styles.addButtonDisabled]}
            onPress={() => {
              if (!isDummy) {
                openTimePicker(order);
              }
            }}
            activeOpacity={isDummy ? 1 : 0.7}
            disabled={isDummy}
          >
            <Text style={styles.addButtonText}>+</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  // Render READY order card
  const renderReadyCard = (order) => {
    // Calculate time elapsed since ready or accepted
    const timeElapsed = order.readyAt 
      ? Math.floor((new Date() - new Date(order.readyAt)) / 60000)
      : order.acceptedAt
      ? Math.floor((new Date() - new Date(order.acceptedAt)) / 60000)
      : Math.floor((new Date() - new Date(order.createdAt)) / 60000);
    
    // Truncate items preview to match design
    const itemsPreview = order.itemsPreview || 'Items';
    const truncatedItems = itemsPreview.length > 30 ? itemsPreview.substring(0, 30) + '...' : itemsPreview;
    
    return (
      <View style={styles.readyCard}>
        {/* Top Left - Circular Countdown Timer */}
        <View style={styles.readyCountdownContainer}>
          <View style={styles.readyCountdownCircle}>
            <Text style={styles.readyCountdownNumber}>{timeElapsed}</Text>
            <Text style={styles.readyCountdownLabel}>Mins</Text>
          </View>
        </View>
        
        {/* Top Right - READY Tag with rounded right edge */}
        <View style={styles.readyBanner}>
          <Text style={styles.readyBannerText}>READY</Text>
        </View>
        
        {/* Order Number */}
        <Text style={styles.readyOrderNumber}>
          {order.orderNumber || `#${order.id?.slice(-4) || 'N/A'}`}
        </Text>
        
        {/* Order Summary Line */}
        <View style={styles.readyOrderInfo}>
          <Text style={styles.readyOrderDetails} numberOfLines={1}>
            {order.timeDisplay || '12:55'} | {truncatedItems}
          </Text>
          <Text style={styles.readyOrderAmount}>₹{order.amount.toFixed(2)}</Text>
        </View>
        
        {/* Bottom Actions */}
        <View style={styles.readyActions}>
          <TouchableOpacity
            style={styles.foodReadyContainer}
            onPress={() => handleMarkOrderPickedUp(order)}
            activeOpacity={0.7}
            disabled={isMarkingPickedUp}
          >

            <Text style={styles.foodReadyText}>Food Ready</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => {
              // TODO: Track delivery
              showToast('Track delivery', 'info');
            }}
            activeOpacity={0.7}
          >
            <Text style={styles.trackDeliveryText}>Track Delivery</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  // Format arrival time from estimated arrival time or calculate from picked up time
  const formatArrivalTime = (order) => {
    if (order.estimatedArrivalTime) {
      try {
        const arrival = new Date(order.estimatedArrivalTime);
        const now = new Date();
        const diffMs = arrival - now;
        if (diffMs > 0) {
          const diffMins = Math.floor(diffMs / 60000);
          const diffSecs = Math.floor((diffMs % 60000) / 1000);
          return `${diffMins}:${diffSecs.toString().padStart(2, '0')}`;
        }
      } catch (e) {
        // Fallback if date parsing fails
      }
    }
    // Fallback: calculate from picked up time if available
    if (order.pickedUpAt) {
      try {
        const pickedUp = new Date(order.pickedUpAt);
        const now = new Date();
        const diffMs = now - pickedUp;
        const diffMins = Math.floor(diffMs / 60000);
        // Estimate 10-15 minutes delivery time
        return `${diffMins + 10}:00`;
      } catch (e) {
        // Fallback
      }
    }
    return '10:00'; // Default fallback
  };

  // Render PICKED_UP order card
  const renderPickedUpCard = (order) => {
    const isDummy = order.isDummy;
    const isDelivered = order.status === 'DELIVERED' || order.status === 'COMPLETED' || order.deliveredAt;
    const statusText = isDelivered ? 'Delivered' : 'On the Way';
    
    // Format delivery stats from backend data
    const deliveryTime = order.deliveryTime 
      ? (typeof order.deliveryTime === 'number' ? `${order.deliveryTime}min` : order.deliveryTime)
      : null;
    const deliveryDistance = order.deliveryDistance 
      ? (typeof order.deliveryDistance === 'number' ? `${order.deliveryDistance}km` : order.deliveryDistance)
      : null;
    const deliveryRating = order.deliveryRating 
      ? (typeof order.deliveryRating === 'number' ? order.deliveryRating.toFixed(1) : order.deliveryRating)
      : null;
    
    return (
      <View style={[styles.pickedUpCard, isDelivered && styles.pickedUpCardDelivered, isDummy && { opacity: 0.9 }]}>
        {/* DELIVERED Banner - Similar to READY banner */}
        {isDelivered && (
          <View style={styles.deliveredBanner}>
            <Text style={styles.deliveredBannerText}>DELIVERED</Text>
          </View>
        )}
        
        {/* On the Way Banner - Similar to READY banner */}
        {!isDelivered && (
          <View style={styles.pickedUpBanner}>
            <Text style={styles.pickedUpBannerText}>{statusText.toUpperCase()}</Text>
          </View>
        )}
        
        <View style={styles.pickedUpHeader}>
          <Text style={styles.pickedUpDate}>{order.dateDisplay}</Text>
        </View>
        
        {/* Order Number */}
        <Text style={styles.pickedUpOrderNumber}>
          {order.orderNumber || `#${order.id?.slice(-4) || 'N/A'}`}
        </Text>
        
        {/* Order Summary Line */}
        <View style={styles.pickedUpOrderInfo}>
          <Text style={styles.pickedUpOrderDetails} numberOfLines={1}>
            {order.timeDisplay || '12:55'} | {order.itemsPreview || 'Items'}
          </Text>
          <Text style={styles.pickedUpOrderAmount}>₹{order.amount.toFixed(2)}</Text>
        </View>
        
        {order.isAssignedToRider && (order.riderName || order.riderPhone) && (
          <View style={styles.riderSection}>
            <View style={styles.riderAvatar}>
              {order.riderImage ? (
                <Image
                  source={{ uri: order.riderImage }}
                  style={styles.riderAvatarImage}
                  resizeMode="cover"
                />
              ) : (
                <Text style={styles.riderAvatarText}>
                  {(order.riderName || 'R').charAt(0).toUpperCase()}
                </Text>
              )}
            </View>
            <View style={styles.riderInfo}>
              <Text style={styles.riderName}>{order.riderName || 'Rider'}</Text>
              <Text style={styles.riderPhone}>{order.riderPhone || ''}</Text>
            </View>
          </View>
        )}
        
        <View style={styles.pickedUpActions}>
          {!isDelivered ? (
            <>
              <TouchableOpacity
                style={styles.arrivingButton}
                onPress={() => {
                  if (!isDummy) {
                    // TODO: Show arrival info
                    showToast('DE Arriving info', 'info');
                  }
                }}
                activeOpacity={isDummy ? 1 : 0.7}
                disabled={isDummy}
              >
                <Text style={styles.arrivingButtonText}>
                  DE Arriving in {formatArrivalTime(order)} min
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.trackDeliveryButton}
                onPress={() => {
                  if (!isDummy) {
                    // TODO: Track delivery
                    showToast('Track delivery', 'info');
                  }
                }}
                activeOpacity={isDummy ? 1 : 0.7}
                disabled={isDummy}
              >
                <Text style={styles.trackDeliveryButtonText}>Track Delivery</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <TouchableOpacity
                style={styles.viewInvoiceButton}
                onPress={() => {
                  if (!isDummy) {
                    // TODO: View invoice
                    showToast('View invoice', 'info');
                  }
                }}
                activeOpacity={isDummy ? 1 : 0.7}
                disabled={isDummy}
              >
                <Text style={styles.viewInvoiceButtonText}>View Invoice</Text>
              </TouchableOpacity>
              {(deliveryTime || deliveryDistance || deliveryRating) && (
                <View style={[styles.deliveryStats, { marginLeft: 12 }]}>
                  {deliveryTime && (
                    <View style={styles.deliveryStatItem}>
                      <Text style={styles.deliveryStatIcon}>⏱</Text>
                      <Text style={styles.deliveryStatText}>{deliveryTime}</Text>
                    </View>
                  )}
                  {deliveryDistance && (
                    <View style={[styles.deliveryStatItem, { marginLeft: 16 }]}>
                      <Text style={styles.deliveryStatIcon}>📍</Text>
                      <Text style={styles.deliveryStatText}>{deliveryDistance}</Text>
                    </View>
                  )}
                  {deliveryRating && (
                    <View style={[styles.deliveryStatItem, { marginLeft: 16 }]}>
                      <Text style={styles.deliveryStatIcon}>⭐</Text>
                      <Text style={styles.deliveryStatText}>{deliveryRating}</Text>
                    </View>
                  )}
                </View>
              )}
            </>
          )}
        </View>
      </View>
    );
  };

  // Render default card (fallback)
  const renderDefaultCard = (order) => {
    return (
      <View style={styles.orderCard}>
        <View style={styles.orderCardHeader}>
          <View style={styles.orderCardHeaderLeft}>
            <Text style={styles.orderCardId}>
              {order.orderNumber || `Order #${order.id}`}
            </Text>
            <Text style={styles.orderCardTime}>{order.time}</Text>
          </View>
          <View style={styles.orderCardAmountContainer}>
            <Text style={styles.orderCardAmount}>₹{order.amount.toFixed(2)}</Text>
          </View>
        </View>
        <View style={styles.orderCardDetails}>
          <View style={styles.orderCardDetailRow}>
            <Text style={styles.orderCardDetailLabel}>Customer:</Text>
            <Text style={styles.orderCardDetailValue}>{order.customerName}</Text>
          </View>
          <View style={styles.orderCardDetailRow}>
            <Text style={styles.orderCardDetailLabel}>Items:</Text>
            <Text style={styles.orderCardDetailValue}>
              {order.itemCount || order.items?.length || 0} item(s)
            </Text>
          </View>
          {order.itemsPreview && (
            <View style={styles.orderCardDetailRow}>
              <Text style={styles.orderCardDetailLabel}>Items:</Text>
              <Text style={styles.orderCardDetailValue} numberOfLines={2}>
                {order.itemsPreview}
              </Text>
            </View>
          )}
          {order.statusDisplay && (
            <View style={styles.orderCardDetailRow}>
              <Text style={styles.orderCardDetailLabel}>Status:</Text>
              <Text style={styles.orderCardDetailValue}>{order.statusDisplay}</Text>
            </View>
          )}
        </View>
      </View>
    );
  };

  // Play notification sound/tone
  const playNotificationSound = () => {
    console.log('🔔 [OrdersScreen] Playing notification sound...');
    
    // Always play vibration as companion
    playVibration();
    
    // Try to use native sound module first
    try {
      const { NativeModules } = require('react-native');
      if (NativeModules.SoundModule) {
        NativeModules.SoundModule.playNotificationSound();
        return;
      }
    } catch (nativeError) {
      // Native module not available
    }
    
    // Fallback to react-native-sound if native module not available
    if (!Sound) {
      return;
    }
    
    try {
      Sound.setCategory('Playback', true);
      
      // Try to play custom notification sound
      const notificationSound = new Sound(
        'notification.mp3',
        Platform.OS === 'android' ? Sound.MAIN_BUNDLE : Sound.MAIN_BUNDLE,
        (error) => {
          if (error) {
            playSystemDefaultSound();
            return;
          }
          
          notificationSound.setVolume(1.0);
          notificationSound.play((success) => {
            if (!success) {
              playSystemDefaultSound();
            }
            notificationSound.release();
          });
        }
      );
    } catch (error) {
      console.warn('⚠️ [OrdersScreen] Notification sound error:', error.message || error);
    }
  };

  const playSystemDefaultSound = () => {
    if (!Sound) return;
    
    try {
      if (Platform.OS === 'android') {
        const systemSound = new Sound(
          'android.resource://android/raw/notification',
          Sound.MAIN_BUNDLE,
          (error) => {
            if (!error) {
              systemSound.setVolume(1.0);
              systemSound.play();
              systemSound.release();
            }
          }
        );
      }
    } catch (error) {
      console.warn('⚠️ [OrdersScreen] System sound error:', error.message || error);
    }
  };

  const playVibration = () => {
    try {
      if (Vibration && typeof Vibration.vibrate === 'function') {
        Vibration.vibrate([200, 100, 200]);
      }
    } catch (vibrateError) {
      console.warn('⚠️ [OrdersScreen] Vibration not available:', vibrateError.message || vibrateError);
    }
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
        <View style={styles.headerRight}>
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
        <View style={styles.tabsContentContainer}>
          {orderTabs.map((tab) => (
            <TouchableOpacity
              key={tab.id}
              style={[
                styles.tab,
                activeTab === tab.id && styles.activeTab,
              ]}
              onPress={() => handleTabPress(tab.id)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.tabText,
                  activeTab === tab.id && styles.activeTabText,
                ]}
                numberOfLines={1}
                adjustsFontSizeToFit={true}
                minimumFontScale={0.7}
              >
                {tab.label}
              </Text>
              {activeTab === tab.id && <View style={styles.tabUnderline} />}
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Main Content Area */}
      <View style={styles.contentArea}>
        {isLoadingOrders ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#FF6E1A" />
            <Text style={styles.loadingText}>Loading orders...</Text>
          </View>
        ) : (
          <>
            {(() => {
              const statusOrStatuses = mapTabIdToStatus(activeTab);
              let orders = [];
              
              console.log(`🔍 [OrdersScreen] ========================================`);
              console.log(`🔍 [OrdersScreen] RENDERING ORDERS FOR UI`);
              console.log(`🔍 [OrdersScreen] ========================================`);
              console.log(`🔍 [OrdersScreen] Active Tab: ${activeTab}`);
              console.log(`🔍 [OrdersScreen] Status mapping: ${JSON.stringify(statusOrStatuses)}`);
              console.log(`🔍 [OrdersScreen] Available ordersByStatus keys:`, Object.keys(ordersByStatus));
              console.log(`🔍 [OrdersScreen] ordersByStatus state:`, {
                NEW: ordersByStatus.NEW?.length || 0,
                PREPARING: ordersByStatus.PREPARING?.length || 0,
                READY: ordersByStatus.READY?.length || 0,
                PICKED_UP: ordersByStatus.PICKED_UP?.length || 0,
                DELIVERED: ordersByStatus.DELIVERED?.length || 0,
              });
              
              if (Array.isArray(statusOrStatuses)) {
                // For pastOrders, combine orders from multiple statuses
                statusOrStatuses.forEach(status => {
                  const statusOrders = ordersByStatus[status] || [];
                  console.log(`🔍 [OrdersScreen] Status ${status}: ${statusOrders.length} orders`);
                  if (statusOrders.length > 0) {
                    console.log(`🔍 [OrdersScreen] Orders for ${status}:`, JSON.stringify(statusOrders.map(o => ({
                      id: o.id,
                      orderNumber: o.orderNumber,
                      customerName: o.customerName,
                      amount: o.amount
                    })), null, 2));
                  }
                  orders.push(...statusOrders);
                });
              } else if (statusOrStatuses) {
                orders = ordersByStatus[statusOrStatuses] || [];
                console.log(`🔍 [OrdersScreen] Status ${statusOrStatuses}: ${orders.length} orders`);
                if (orders.length > 0) {
                  console.log(`🔍 [OrdersScreen] Orders for ${statusOrStatuses}:`, JSON.stringify(orders.map(o => ({
                    id: o.id,
                    orderNumber: o.orderNumber,
                    customerName: o.customerName,
                    amount: o.amount,
                    status: o.status
                  })), null, 2));
                } else {
                  console.log(`🔍 [OrdersScreen] ⚠️ No orders found in ordersByStatus[${statusOrStatuses}]`);
                  console.log(`🔍 [OrdersScreen] Current ordersByStatus state:`, JSON.stringify(ordersByStatus, null, 2));
                }
              } else {
                console.warn(`⚠️ [OrdersScreen] No status mapping for tab: ${activeTab}`);
              }
              
              console.log(`🔍 [OrdersScreen] Total orders to display: ${orders.length}`);
              console.log(`🔍 [OrdersScreen] ========================================`);
              
              // For PREPARING tab, show dummy card if no orders (for styling purposes)
              if (orders.length === 0 && activeTab === 'preparing') {
                const dummyOrder = getDummyPreparingOrder();
                return (
                  <View style={styles.ordersListContainer}>
                    {renderPreparingCard(dummyOrder)}
                  </View>
                );
              }
              
              // For PICKED_UP tab, show dummy card if no orders (for styling purposes)
              if (orders.length === 0 && activeTab === 'pickedUp') {
                const dummyOrder = getDummyPickedUpOrder();
                return (
                  <View style={styles.ordersListContainer}>
                    {renderPickedUpCard(dummyOrder)}
                  </View>
                );
              }
              
              if (orders.length === 0) {
                return (
                  <View style={styles.emptyStateContainer}>
                    <Image
                      source={icons.pan}
                      style={styles.panImage}
                      resizeMode="contain"
                    />
                    <Text style={styles.noOrdersText}>No Orders!</Text>
                  </View>
                );
              }
              
              return (
                <>
                  {activeTab === 'pastOrders' && (
                    <View style={styles.calendarIconContainer}>
                      <TouchableOpacity
                        style={styles.calendarIconButton}
                        onPress={() => setShowDatePicker(true)}
                        activeOpacity={0.7}
                      >
                        <Image
                          source={icons.calendar}
                          style={styles.calendarIcon}
                          resizeMode="contain"
                        />
                        <Text style={styles.calendarText}>Select Date</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                  <FlatList
                    data={orders}
                    keyExtractor={(item) => item.id?.toString() || Math.random().toString()}
                    refreshControl={
                      <RefreshControl
                        refreshing={isRefreshing}
                        onRefresh={async () => {
                          setIsRefreshing(true);
                          await fetchOrdersForTab(activeTab);
                          await fetchNewOrders();
                          setIsRefreshing(false);
                        }}
                        colors={['#FF6E1A']}
                        tintColor="#FF6E1A"
                      />
                    }
                     renderItem={({ item: order }) => {
                       // Render different card based on status
                       if (order.status === 'NEW') {
                         return renderDefaultCard(order);
                       } else if (order.status === 'PREPARING') {
                         return renderPreparingCard(order);
                       } else if (order.status === 'READY') {
                         return renderReadyCard(order);
                       } else if (order.status === 'PICKED_UP' || order.status === 'DELIVERED' || order.status === 'COMPLETED') {
                         return renderPickedUpCard(order);
                       } else {
                         return renderDefaultCard(order);
                       }
                     }}
                    contentContainerStyle={styles.ordersListContainer}
                    showsVerticalScrollIndicator={false}
                  />
                </>
              );
            })()}
          </>
        )}
      </View>

      {/* New Order Notification Banner */}
      <TouchableOpacity
        style={styles.newOrderBanner}
        onPress={async () => {
          console.log('🟢 [OrdersScreen] ========================================');
          console.log('🟢 [OrdersScreen] GREEN BANNER CLICKED');
          console.log('🟢 [OrdersScreen] ========================================');
          
          // Play notification sound/tone
          playNotificationSound();
          
          // Always fetch latest orders from backend API
          const fetchedOrders = await fetchNewOrders();
          
          // Use only orders from backend API (no hardcoded test orders)
          const ordersToShow = fetchedOrders.length > 0 ? fetchedOrders : (ordersByStatus.NEW || []);
          
          console.log(`📋 [OrdersScreen] Opening new orders modal with ${ordersToShow.length} order(s) from backend`);
          if (ordersToShow.length > 0) {
            console.log('📋 [OrdersScreen] Orders to display:', ordersToShow.map(o => ({
              id: o.id,
              orderNumber: o.orderNumber,
              customer: o.customerName,
              amount: o.amount
            })));
          } else {
            console.log('📋 [OrdersScreen] No orders available from backend API');
          }
          
          setPendingOrders(ordersToShow);
          setShowNewOrdersModal(true);
          
          console.log('✅ [OrdersScreen] Modal opened successfully');
          console.log('🟢 [OrdersScreen] ========================================');
        }}
        activeOpacity={0.8}
      >
        <Image
          source={images.newOrder}
          style={styles.newOrderBannerIcon}
          resizeMode="contain"
        />
        <Text style={styles.newOrderBannerText}>
          {orderCount > 0 
            ? `You have ${orderCount} new order${orderCount > 1 ? 's' : ''}` 
            : 'You have a new order'}
        </Text>
        <Image
          source={images.rightArrow}
          style={[styles.newOrderBannerArrowIcon, { tintColor: '#FFFFFF' }]}
          resizeMode="contain"
        />
      </TouchableOpacity>

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

      {/* Time Picker Modal */}
      <Modal
        visible={showTimePickerModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowTimePickerModal(false)}
      >
        <View style={styles.timePickerModalOverlay}>
          <View style={styles.timePickerModalContent}>
            <Text style={styles.timePickerTitle}>Change Preparation Time</Text>
            <Text style={styles.timePickerSubtitle}>
              Faster preparation leads to better customer ratings and more orders
            </Text>

            {/* Preset Time Options */}
            <View style={styles.presetTimeOptions}>
              {[30, 45, 60].map((minutes) => (
                <TouchableOpacity
                  key={minutes}
                  style={[
                    styles.presetTimeCircle,
                    preparationTime === minutes && styles.presetTimeCircleActive,
                  ]}
                  onPress={() => handlePresetTimeSelect(minutes)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.presetTimeNumber,
                      preparationTime === minutes && styles.presetTimeNumberActive,
                    ]}
                  >
                    {minutes}
                  </Text>
                  <Text
                    style={[
                      styles.presetTimeLabel,
                      preparationTime === minutes && styles.presetTimeLabelActive,
                    ]}
                  >
                    Min
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Custom Time Selector */}
            <View style={styles.customTimeSelector}>
              <TouchableOpacity
                style={styles.timeDecrementButton}
                onPress={handleTimeDecrement}
                activeOpacity={0.7}
                disabled={preparationTime <= 1}
              >
                <Text style={styles.timeButtonText}>-</Text>
              </TouchableOpacity>
              <View style={[
                styles.timeDisplayButton,
                (preparationTime === 30 || preparationTime === 45 || preparationTime === 60)
                  ? {} 
                  : styles.timeDisplayButtonActive
              ]}>
                <Text style={styles.timeDisplayText}>
                  {preparationTime}MINS
                </Text>
              </View>
              <TouchableOpacity
                style={styles.timeIncrementButton}
                onPress={handleTimeIncrement}
                activeOpacity={0.7}
                disabled={preparationTime >= 300}
              >
                <Text style={styles.timeButtonText}>+</Text>
              </TouchableOpacity>
            </View>

            {/* Action Buttons */}
            <View style={styles.timePickerActions}>
              <TouchableOpacity
                style={styles.timePickerCancelButton}
                onPress={() => {
                  setShowTimePickerModal(false);
                  setSelectedOrderForTimeUpdate(null);
                }}
                activeOpacity={0.7}
              >
                <Text style={styles.timePickerCancelText}>CANCEL</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.timePickerDoneButton, isUpdatingTime && styles.timePickerDoneButtonDisabled]}
                onPress={handleTimePickerDone}
                activeOpacity={0.7}
                disabled={isUpdatingTime}
              >
                {isUpdatingTime ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.timePickerDoneText}>DONE</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Date Picker Modal */}
      {showDatePicker && (
        <DateTimePicker
          value={selectedDate}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={(event, date) => {
            if (Platform.OS === 'android') {
              setShowDatePicker(false);
            }
            if (event.type === 'set' && date) {
              setSelectedDate(date);
              // TODO: Filter orders by selected date
              console.log('Selected date:', date);
            } else if (event.type === 'dismissed') {
              setShowDatePicker(false);
            }
          }}
          onTouchCancel={() => setShowDatePicker(false)}
        />
      )}
      {Platform.OS === 'ios' && showDatePicker && (
        <Modal
          visible={showDatePicker}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setShowDatePicker(false)}
        >
          <View style={styles.datePickerModalOverlay}>
            <View style={styles.datePickerModalContent}>
              <View style={styles.datePickerHeader}>
                <TouchableOpacity
                  onPress={() => setShowDatePicker(false)}
                  style={styles.datePickerCancelButton}
                >
                  <Text style={styles.datePickerCancelText}>Cancel</Text>
                </TouchableOpacity>
                <Text style={styles.datePickerTitle}>Select Date</Text>
                <TouchableOpacity
                  onPress={() => {
                    setShowDatePicker(false);
                    // TODO: Filter orders by selected date
                    console.log('Selected date:', selectedDate);
                  }}
                  style={styles.datePickerDoneButton}
                >
                  <Text style={styles.datePickerDoneText}>Done</Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={selectedDate}
                mode="date"
                display="spinner"
                onChange={(event, date) => {
                  if (date) {
                    setSelectedDate(date);
                  }
                }}
              />
            </View>
          </View>
        </Modal>
      )}
    </SafeAreaView>
  );
};

// Get screen dimensions for responsive design
const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Calculate responsive font size based on screen width
const getResponsiveFontSize = (baseSize) => {
  const scale = SCREEN_WIDTH / 375; // Base width (iPhone X)
  const scaledSize = baseSize * scale;
  // Clamp between min and max sizes
  return Math.max(11, Math.min(scaledSize, baseSize * 1.2));
};

// Calculate responsive padding
const getResponsivePadding = (basePadding) => {
  const scale = SCREEN_WIDTH / 375;
  return Math.max(8, Math.min(basePadding * scale, basePadding * 1.3));
};

// Calculate responsive values
const RESPONSIVE_TAB_FONT_SIZE = getResponsiveFontSize(13);
const RESPONSIVE_TAB_PADDING = getResponsivePadding(12);

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
  tabsContentContainer: {
    flexDirection: 'row',
    paddingLeft: 0,
    paddingRight: 0,
    width: '100%',
  },
  tab: {
    flex: 1,
    paddingVertical: RESPONSIVE_TAB_PADDING,
    marginRight: 0,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 0, // Allow flex shrinking
    paddingHorizontal: SCREEN_WIDTH < 375 ? 2 : 4, // Smaller padding on small screens
  },
  activeTab: {
    // Active tab styling
  },
  tabText: {
    fontFamily: Poppins.regular,
    fontSize: RESPONSIVE_TAB_FONT_SIZE,
    color: '#000000',
    textAlign: 'center',
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
    position: 'relative',
  },
  contentContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
    paddingBottom: 100,
    position: 'relative',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    fontFamily: Poppins.regular,
    fontSize: 14,
    color: '#666666',
    marginTop: 10,
  },
  calendarIconContainer: {
    paddingHorizontal: 16,
    paddingTop: 8,
    // paddingBottom: 8,
    alignItems: 'flex-end',
  },
  calendarIconButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 2,
   
  },
  calendarIcon: {
    width: 15,
    height: 15,
    tintColor: '#FF6E1A',
    marginRight: 8,
  },
  calendarText: {
    fontFamily: Poppins.regular,
    fontSize: 12,
    color: '#000000',
    textAlign:"center"
  },
  ordersListContainer: {
    padding: 16,
    paddingBottom: 100,
  },
  orderCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  orderCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  orderCardHeaderLeft: {
    flex: 1,
  },
  orderCardId: {
    fontFamily: Poppins.semiBold,
    fontSize: 16,
    color: '#000000',
    marginBottom: 4,
  },
  orderCardTime: {
    fontFamily: Poppins.regular,
    fontSize: 12,
    color: '#666666',
  },
  orderCardAmountContainer: {
    backgroundColor: '#FF6E1A',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  orderCardAmount: {
    fontFamily: Poppins.bold,
    fontSize: 16,
    color: '#FFFFFF',
  },
  orderCardDetails: {
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  orderCardDetailRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  orderCardDetailLabel: {
    fontFamily: Poppins.medium,
    fontSize: 14,
    color: '#666666',
    width: 100,
  },
  orderCardDetailValue: {
    fontFamily: Poppins.regular,
    fontSize: 14,
    color: '#000000',
    flex: 1,
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
  newOrderBanner: {
    backgroundColor: '#4CAF50',
    paddingVertical: 8,
    paddingHorizontal: 20,
    marginHorizontal: 0,
    marginBottom: 10,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  newOrderBannerIcon: {
    width: 56,
    height: 56,
    marginRight: 12,
  },
  newOrderBannerText: {
    fontFamily: Poppins.medium,
    fontSize: 16,
    color: '#FFFFFF',
    flex: 1,
  },
  newOrderBannerArrowIcon: {
    width: 24,
    height: 24,
    marginLeft: 8,
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
  // PREPARING Card Styles
  preparingCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    position: 'relative',
    overflow: 'visible',
  },
  preparingBanner: {
    position: 'absolute',
    top: -1,
    right: 0,
    backgroundColor: '#FF6E1A',
    paddingVertical: 6,
    paddingHorizontal: 12,
    paddingLeft: 16,
    borderTopRightRadius: 12,
    borderBottomLeftRadius: 8,
    zIndex: 1,
  },
  preparingBannerText: {
    fontFamily: Poppins.bold,
    fontSize: 12,
    color: '#FFFFFF',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  preparingCardHeader: {
    marginBottom: 4,
    // marginTop: 8,
  },
  preparingOrderNumber: {
    fontFamily: Poppins.bold,
    fontSize: 24,
    color: '#000000',
  },
  preparingOrderDetails: {
    fontFamily: Poppins.regular,
    fontSize: 14,
    color: '#666666',
    marginBottom: 2,
  },
  preparingTimeInfo: {
    fontFamily: Poppins.medium,
    fontSize: 12,
    color: '#4CAF50',
    marginBottom: 4,
  },
  dashedLine: {
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    borderStyle: 'dashed',
    marginVertical: 4,
  },
  deAssignmentSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  deAssignmentText: {
    fontFamily: Poppins.regular,
    fontSize: 14,
    color: '#666666',
    flex: 1,
  },
  deIcon: {
    width: 32,
    height: 32,
    marginLeft: 12,
  },
  preparingActions: {
    flexDirection: 'row',
  },
  markReadyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  markReadyButtonText: {
    fontFamily: Poppins.regular,
    fontSize: 14,
    color: '#FF6E1A',
  },
  addButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButtonText: {
    fontFamily: Poppins.bold,
    fontSize: 24,
    color: '#FF6E1A',
  },
  addButtonDisabled: {
    opacity: 0.5,
    borderColor: '#CCCCCC',
  },
  dummyBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#FFF3E0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    zIndex: 10,
  },
  dummyBadgeText: {
    fontFamily: Poppins.bold,
    fontSize: 10,
    color: '#FF6E1A',
    textTransform: 'uppercase',
  },
  // READY Card Styles
  readyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    position: 'relative',
    overflow: 'visible',
  },
  readyBanner: {
    position: 'absolute',
    top: -1,
    right: 0,
    backgroundColor: '#4CAF50',
    paddingVertical: 6,
    paddingHorizontal: 12,
    paddingLeft: 16,
    borderTopRightRadius: 12,
    borderBottomLeftRadius: 8,
    zIndex: 1,
  },
  readyBannerText: {
    fontFamily: Poppins.bold,
    fontSize: 12,
    color: '#FFFFFF',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  readyCountdownContainer: {
    position: 'absolute',
    top: 8,
    left: 16,
    zIndex: 1,
  },
  readyCountdownCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 3,
    borderColor: '#4CAF50',
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  readyCountdownNumber: {
    fontFamily: Poppins.bold,
    fontSize: 18,
    color: '#4CAF50',
    lineHeight: 20,
  },
  readyCountdownLabel: {
    fontFamily: Poppins.regular,
    fontSize: 10,
    color: '#4CAF50',
    marginTop: -2,
  },
  readyOrderNumber: {
    fontFamily: Poppins.bold,
    fontSize: 20,
    color: '#000000',
    marginTop: 24,
    marginBottom: 8,
    textAlign: 'right',
    paddingRight: 0,
  },
  readyOrderInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    marginTop: 4,
  },
  readyOrderDetails: {
    fontFamily: Poppins.regular,
    fontSize: 14,
    color: '#666666',
    flex: 1,
    marginRight: 12,
  },
  readyOrderAmount: {
    fontFamily: Poppins.regular,
    fontSize: 14,
    color: '#666666',
  },
  readyActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  foodReadyContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  foodReadyIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#666666',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
  },
  foodReadyIconText: {
    fontFamily: Poppins.bold,
    fontSize: 12,
    color: '#4CAF50',
  },
  foodReadyText: {
    fontFamily: Poppins.regular,
    fontSize: 14,
    color: '#4CAF50',
  },
  trackDeliveryText: {
    fontFamily: Poppins.regular,
    fontSize: 14,
    color: '#000000',
  },
  // PICKED_UP Card Styles
  pickedUpCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    position: 'relative',
    overflow: 'visible',
  },
  pickedUpCardDelivered: {
    borderColor: '#E0E0E0',
  },
  deliveredBanner: {
    position: 'absolute',
    top: -1,
    right: 0,
    backgroundColor: '#4CAF50',
    paddingVertical: 6,
    paddingHorizontal: 12,
    paddingLeft: 16,
    borderTopRightRadius: 12,
    borderBottomLeftRadius: 8,
    zIndex: 1,
  },
  deliveredBannerText: {
    fontFamily: Poppins.bold,
    fontSize: 12,
    color: '#FFFFFF',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  pickedUpBanner: {
    position: 'absolute',
    top: -1,
    right: 0,
    backgroundColor: '#4CAF50',
    paddingVertical: 6,
    paddingHorizontal: 12,
    paddingLeft: 16,
    borderTopRightRadius: 12,
    borderBottomLeftRadius: 8,
    zIndex: 1,
  },
  pickedUpBannerText: {
    fontFamily: Poppins.bold,
    fontSize: 12,
    color: '#FFFFFF',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  pickedUpHeader: {
    marginBottom: 4,
    marginTop: 8,
  },
  pickedUpDate: {
    fontFamily: Poppins.regular,
    fontSize: 14,
    color: '#666666',
  },
  pickedUpOrderNumber: {
    fontFamily: Poppins.bold,
    fontSize: 20,
    color: '#000000',
    marginBottom: 8,
  },
  pickedUpOrderInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    marginTop: 4,
  },
  pickedUpOrderDetails: {
    fontFamily: Poppins.regular,
    fontSize: 14,
    color: '#666666',
    flex: 1,
    marginRight: 12,
  },
  pickedUpOrderAmount: {
    fontFamily: Poppins.regular,
    fontSize: 14,
    color: '#666666',
  },
  riderSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    borderStyle: 'dashed',
  },
  riderAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E0E0E0',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    overflow: 'hidden',
  },
  riderAvatarImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  riderAvatarText: {
    fontFamily: Poppins.bold,
    fontSize: 16,
    color: '#666666',
  },
  riderInfo: {
    flex: 1,
  },
  riderName: {
    fontFamily: Poppins.semiBold,
    fontSize: 14,
    color: '#000000',
    marginBottom: 2,
  },
  riderPhone: {
    fontFamily: Poppins.regular,
    fontSize: 12,
    color: '#666666',
  },
  pickedUpActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  arrivingButton: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  arrivingButtonText: {
    fontFamily: Poppins.regular,
    fontSize: 14,
    color: '#666666',
  },
  trackDeliveryButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  trackDeliveryButtonText: {
    fontFamily: Poppins.regular,
    fontSize: 14,
    color: '#000000',
  },
  viewInvoiceButton: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  viewInvoiceButtonText: {
    fontFamily: Poppins.regular,
    fontSize: 14,
    color: '#4CAF50',
  },
  deliveryStats: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  deliveryStatItem: {
    alignItems: 'center',
  },
  deliveryStatIcon: {
    fontSize: 20,
    marginBottom: 4,
  },
  deliveryStatText: {
    fontFamily: Poppins.regular,
    fontSize: 12,
    color: '#666666',
  },
  // Time Picker Modal Styles
  timePickerModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  timePickerModalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    paddingBottom: 40,
    alignItems: 'center',
  },
  timePickerTitle: {
    fontFamily: Poppins.bold,
    fontSize: 24,
    color: '#000000',
    marginBottom: 8,
    textAlign: 'center',
  },
  timePickerSubtitle: {
    fontFamily: Poppins.regular,
    fontSize: 14,
    color: '#000000',
    textAlign: 'center',
    marginBottom: 32,
    paddingHorizontal: 20,
  },
  presetTimeOptions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginBottom: 32,
    paddingHorizontal: 20,
  },
  presetTimeCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E0E0E0',
  },
  presetTimeCircleActive: {
    backgroundColor: '#4CAF50',
    borderColor: '#4CAF50',
  },
  presetTimeNumber: {
    fontFamily: Poppins.bold,
    fontSize: 24,
    color: '#000000',
  },
  presetTimeNumberActive: {
    color: '#FFFFFF',
  },
  presetTimeLabel: {
    fontFamily: Poppins.regular,
    fontSize: 12,
    color: '#666666',
    marginTop: 2,
  },
  presetTimeLabelActive: {
    color: '#FFFFFF',
  },
  customTimeSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 40,
    width: '100%',
  },
  timeDecrementButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  timeIncrementButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#F44336',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 16,
  },
  timeButtonText: {
    fontFamily: Poppins.bold,
    fontSize: 24,
    color: '#FFFFFF',
  },
  timeDisplayButton: {
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E0E0E0',
    backgroundColor: '#FFFFFF',
    minWidth: 120,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timeDisplayButtonActive: {
    borderColor: '#FF6E1A',
    borderWidth: 2,
  },
  timeDisplayText: {
    fontFamily: Poppins.bold,
    fontSize: 18,
    color: '#000000',
  },
  timePickerActions: {
    flexDirection: 'row',
    width: '100%',
    paddingHorizontal: 20,
  },
  timePickerCancelButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  timePickerCancelText: {
    fontFamily: Poppins.semiBold,
    fontSize: 16,
    color: '#000000',
    letterSpacing: 0.5,
  },
  timePickerDoneButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: '#4CAF50',
    alignItems: 'center',
    justifyContent: 'center',
  },
  timePickerDoneButtonDisabled: {
    backgroundColor: '#A5D6A7',
    opacity: 0.7,
  },
  timePickerDoneText: {
    fontFamily: Poppins.semiBold,
    fontSize: 16,
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  markReadyButtonDisabled: {
    opacity: 0.6,
  },
  // Date Picker Modal Styles
  datePickerModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  datePickerModalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 40,
  },
  datePickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  datePickerCancelButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  datePickerCancelText: {
    fontFamily: Poppins.regular,
    fontSize: 16,
    color: '#666666',
  },
  datePickerTitle: {
    fontFamily: Poppins.semiBold,
    fontSize: 18,
    color: '#000000',
  },
  datePickerDoneButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  datePickerDoneText: {
    fontFamily: Poppins.semiBold,
    fontSize: 16,
    color: '#FF6E1A',
  },
});

export default OrdersScreen;
