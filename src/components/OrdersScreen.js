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
  Linking,
  Animated,
} from 'react-native';
import { WebView } from 'react-native-webview';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Poppins, icons, images } from '../assets';
import NewOrdersScreen from './NewOrdersScreen';
import MenuScreen from './MenuScreen';
import MoreScreen from './MoreScreen';
import FinanceScreen from './FinanceScreen';
import { useToast } from './ToastContext';
import { fetchWithAuth } from '../utils/apiHelpers';
import { API_BASE_URL, RIDER_API_BASE_URL, DEFAULT_RIDER_ID } from '../config';
import PowerToggle from './PowerToggle';

// Try to import react-native-sound, but handle gracefully if not available
let Sound = null;
try {
  Sound = require('react-native-sound').default;
} catch (e) {
  // Sound library not available
}

const OrdersScreen = ({ onBack, partnerStatus, newOrders = [], onNewOrderReceived, onLogout, initialTab, initialBottomTab, onNavigate }) => {
    const [isOnline, setIsOnline] = useState(true);
  const [isTogglingOnline, setIsTogglingOnline] = useState(false);
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
  const [loadingOrderIds, setLoadingOrderIds] = useState(new Set());
  const [isUpdatingTime, setIsUpdatingTime] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [invoicePdfUrl, setInvoicePdfUrl] = useState(null);
  const [isLoadingInvoice, setIsLoadingInvoice] = useState(false);
  const [useDirectPdf, setUseDirectPdf] = useState(false);

  // Handle online toggle with API call
  const handleOnlineToggle = async (value) => {
    try {
      setIsTogglingOnline(true);
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
        setIsOnline(value);
        
        // Update configData with new status
        setConfigData(prev => ({
          ...prev,
          partner_info: {
            ...prev?.partner_info,
            online_status: value ? 'Online' : 'Offline',
            closing_info: data.data?.closing_info || prev?.partner_info?.closing_info,
          },
        }));
      } else {
        console.error('❌ [OrdersScreen] Failed to update online status:', data.message);
      }
    } catch (error) {
      console.error('❌ [OrdersScreen] Error toggling online status:', error);
    } finally {
      setIsTogglingOnline(false);
    }
  };

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
    if (estimatedReadyTime === null || estimatedReadyTime === undefined) return null;
    try {
      // Handle numeric values (could be minutes remaining, epoch seconds, or epoch ms)
      if (typeof estimatedReadyTime === 'number') {
        // If small number, treat as minutes remaining (e.g., 15)
        if (estimatedReadyTime > 0 && estimatedReadyTime <= 10000) {
          const totalSeconds = Math.floor(estimatedReadyTime * 60);
          const minutes = Math.floor(totalSeconds / 60);
          const seconds = totalSeconds % 60;
          return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        }

        // Otherwise treat as epoch (seconds or milliseconds)
        const asMs = estimatedReadyTime > 1e12 ? estimatedReadyTime : estimatedReadyTime > 1e10 ? estimatedReadyTime : estimatedReadyTime * 1000;
        const target = new Date(asMs);
        if (isNaN(target.getTime())) return null;
        const now = new Date();
        const diffMs = target - now;
        if (diffMs <= 0) return '00:00';
        const totalSeconds = Math.floor(diffMs / 1000);
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
      }

      // Handle string values
      if (typeof estimatedReadyTime === 'string') {
        const trimmed = estimatedReadyTime.trim();
        // If numeric string, convert to number and reuse logic
        if (/^-?\d+$/.test(trimmed)) {
          const num = Number(trimmed);
          return calculateRemainingTime(num);
        }

        // Otherwise try ISO/date parse
        const target = new Date(trimmed);
        if (isNaN(target.getTime())) return null;
        const now = new Date();
        const diffMs = target - now;
        if (diffMs <= 0) return '00:00';
        const totalSeconds = Math.floor(diffMs / 1000);
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
      }

      // Unknown format
      return null;
    } catch (e) {
      console.warn('calculateRemainingTime parse error:', e);
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
      orderNumber: apiOrder.order_number ? String(apiOrder.order_number).replace(/^#/, '') : apiOrder.order_number,
      partnerId: apiOrder.partner_id,
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
      deliveredAt: apiOrder.delivered_at,
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
          // Log partner_id specifically to help debug invoice integration
          if (apiOrder.partner_id) {
            console.log(`🔄 [OrdersScreen] Order ${index + 1} has partner_id: ${apiOrder.partner_id}`);
          } else {
            console.warn(`⚠️ [OrdersScreen] Order ${index + 1} missing partner_id in API response`);
          }
          const transformed = transformOrder(apiOrder);
          console.log(`🔄 [OrdersScreen] Transformed Order:`, JSON.stringify(transformed, null, 2));
          // Log partnerId in transformed order
          if (transformed.partnerId) {
            console.log(`✅ [OrdersScreen] Order ${index + 1} has partnerId after transformation: ${transformed.partnerId}`);
          } else {
            console.warn(`⚠️ [OrdersScreen] Order ${index + 1} missing partnerId after transformation`);
          }
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
        { id: 'preparing', label: labels.preparing || 'Preparing', icon: images.preparing },
        { id: 'ready', label: labels.ready || 'Ready', icon: images.ready },
        { id: 'pickedUp', label: labels.picked_up || 'Picked Up', icon: images.pickedUp },
        { id: 'pastOrders', label: labels.past_order || 'Past Orders', icon: images.pastOrders },
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
      { id: 'preparing', label: 'Preparing', icon: images.preparing },
      { id: 'ready', label: 'Ready', icon: images.ready },
      { id: 'pickedUp', label: 'Picked Up', icon: images.pickedUp },
      { id: 'pastOrders', label: 'Past Orders', icon: images.pastOrders },
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
      
      
      // Refresh orders after denying
      setTimeout(() => {
        fetchNewOrders();
        fetchOrdersForTab(activeTab);
      }, 1000);
    } catch (error) {
      console.error('❌ Error denying order:', error);
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
      } else {
      }
    } catch (error) {
      console.error('❌ Catalog API Error:', error);
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
      } else {
      }
    } catch (error) {
      console.error('❌ Config API Error:', error);
    } finally {
      setIsLoadingConfig(false);
    }
  };

  // Countdown timer component for preparing orders
  const PreparingCountdown = ({ estimatedReadyTime }) => {
    const [countdown, setCountdown] = useState(null);
    const targetMsRef = useRef(null);

    // Convert various estimatedReadyTime formats into an absolute target timestamp (ms since epoch)
    const computeTargetMs = (val) => {
      console.log('🕐 [PreparingCountdown] ========================================');
      console.log('🕐 [PreparingCountdown] COMPUTING TARGET TIME');
      console.log('🕐 [PreparingCountdown] Input value:', val);
      console.log('🕐 [PreparingCountdown] Input type:', typeof val);
      console.log('🕐 [PreparingCountdown] ========================================');
      
      if (val === null || val === undefined) {
        console.log('🕐 [PreparingCountdown] Input is null/undefined, returning null');
        return null;
      }
      // Numeric: could be minutes remaining or epoch seconds/ms
      if (typeof val === 'number') {
        // Treat small numbers (<= 10000) as minutes remaining
        if (val > 0 && val <= 10000) {
          const targetMs = Date.now() + Math.round(val * 60 * 1000);
          console.log('🕐 [PreparingCountdown] Number <= 10000, treating as minutes remaining:', val);
          console.log('🕐 [PreparingCountdown] Target timestamp (ms):', targetMs);
          console.log('🕐 [PreparingCountdown] Target date:', new Date(targetMs).toISOString());
          return targetMs;
        }
        // Otherwise treat as epoch (seconds or ms)
        if (val > 1e12) {
          console.log('🕐 [PreparingCountdown] Large number, treating as epoch ms:', val);
          console.log('🕐 [PreparingCountdown] Target date:', new Date(val).toISOString());
          return val; // already ms
        }
        if (val > 1e10) {
          console.log('🕐 [PreparingCountdown] Medium-large number, treating as epoch ms:', val);
          console.log('🕐 [PreparingCountdown] Target date:', new Date(val).toISOString());
          return val; // probably ms
        }
        if (val > 1e9) {
          const targetMs = val * 1000;
          console.log('🕐 [PreparingCountdown] Number > 1e9, treating as epoch seconds:', val);
          console.log('🕐 [PreparingCountdown] Target timestamp (ms):', targetMs);
          console.log('🕐 [PreparingCountdown] Target date:', new Date(targetMs).toISOString());
          return targetMs; // seconds -> ms
        }
        // fallback: treat as minutes
        const targetMs = Date.now() + Math.round(val * 60 * 1000);
        console.log('🕐 [PreparingCountdown] Number fallback, treating as minutes:', val);
        console.log('🕐 [PreparingCountdown] Target timestamp (ms):', targetMs);
        console.log('🕐 [PreparingCountdown] Target date:', new Date(targetMs).toISOString());
        return targetMs;
      }

      if (typeof val === 'string') {
        const s = val.trim();
        console.log('🕐 [PreparingCountdown] String input, trimmed:', s);
        
        // Numeric string -> minutes remaining
        if (/^-?\d+$/.test(s)) {
          const n = Number(s);
          console.log('🕐 [PreparingCountdown] Numeric string detected, value:', n);
          if (n > 0) {
            const targetMs = Date.now() + Math.round(n * 60 * 1000);
            console.log('🕐 [PreparingCountdown] Treating as minutes, target ms:', targetMs);
            console.log('🕐 [PreparingCountdown] Target date:', new Date(targetMs).toISOString());
            return targetMs;
          }
        }
        
        // Try ISO/date parse - handle timezone issue
        // If timestamp has no timezone (no Z or offset), treat as local time
        // Pattern: YYYY-MM-DDTHH:mm:ss.sss (no Z or +/- at end)
        const hasTimezone = s.endsWith('Z') || /[+-]\d{2}:\d{2}$/.test(s);
        
        if (!hasTimezone && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(s)) {
          // Parse as local time by creating Date object directly
          console.log('🕐 [PreparingCountdown] Timestamp has no timezone, treating as LOCAL time');
          try {
            // Extract date parts and construct Date using local timezone
            const parts = s.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d+))?/);
            if (parts) {
              const [, year, month, day, hour, minute, second, ms = '0'] = parts;
              const localDate = new Date(
                parseInt(year),
                parseInt(month) - 1, // Month is 0-indexed
                parseInt(day),
                parseInt(hour),
                parseInt(minute),
                parseInt(second),
                parseInt(ms.padEnd(3, '0').slice(0, 3)) // Handle ms
              );
              const targetMs = localDate.getTime();
              console.log('🕐 [PreparingCountdown] Parsed as local time, target ms:', targetMs);
              console.log('🕐 [PreparingCountdown] Target date (local):', localDate.toString());
              console.log('🕐 [PreparingCountdown] Target date (UTC):', localDate.toISOString());
              console.log('🕐 [PreparingCountdown] Current time:', new Date().toString());
              console.log('🕐 [PreparingCountdown] Diff (ms):', targetMs - Date.now());
              return targetMs;
            }
          } catch (e) {
            console.warn('🕐 [PreparingCountdown] Error parsing as local time:', e);
          }
        }
        
        // Fallback: standard Date.parse (for timestamps with timezone info)
        const parsed = Date.parse(s);
        console.log('🕐 [PreparingCountdown] Date.parse result:', parsed);
        if (!isNaN(parsed)) {
          console.log('🕐 [PreparingCountdown] Successfully parsed as ISO date');
          console.log('🕐 [PreparingCountdown] Target date:', new Date(parsed).toISOString());
          return parsed;
        }
        console.log('🕐 [PreparingCountdown] Failed to parse string, returning null');
        return null;
      }

      // Unknown type
      console.log('🕐 [PreparingCountdown] Unknown type, returning null');
      return null;
    };

    useEffect(() => {
      console.log('🕐 [PreparingCountdown] useEffect triggered, estimatedReadyTime:', estimatedReadyTime);
      
      // Compute target once when estimatedReadyTime changes
      targetMsRef.current = computeTargetMs(estimatedReadyTime);
      
      console.log('🕐 [PreparingCountdown] Computed targetMsRef.current:', targetMsRef.current);

      // If no valid target, clear countdown
      if (!targetMsRef.current) {
        console.log('🕐 [PreparingCountdown] No valid target, clearing countdown');
        setCountdown(null);
        return;
      }

      // Update immediately and then every second
      const tick = () => {
        const now = Date.now();
        const diffMs = targetMsRef.current - now;
        
        if (diffMs <= 0) {
          console.log('🕐 [PreparingCountdown] Time expired (diffMs <= 0), clearing countdown');
          setCountdown(null);
          return;
        }
        
        const totalSeconds = Math.floor(diffMs / 1000);
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        
        console.log('🕐 [PreparingCountdown] Tick - Remaining:', `${minutes}:${String(seconds).padStart(2, '0')}`, `(${totalSeconds}s)`);
        setCountdown({ minutes, seconds });
      };

      console.log('🕐 [PreparingCountdown] Starting countdown timer');
      tick();
      const interval = setInterval(tick, 1000);
      return () => {
        console.log('🕐 [PreparingCountdown] Cleaning up countdown timer');
        clearInterval(interval);
      };
    }, [estimatedReadyTime]);

    if (!countdown) return <Text style={styles.markReadyButtonTextNew}>Mark ready</Text>;

    return (
      <Text style={styles.markReadyButtonTextNew}>
        Mark ready in {String(countdown.minutes).padStart(2, '0')}:{String(countdown.seconds).padStart(2, '0')} min
      </Text>
    );
  };

  // Mark order as ready API
  const handleMarkOrderReady = async (order) => {
    if (!order || !order.id) {
      return;
    }

    setLoadingOrderIds(prev => new Set(prev).add(order.id));
    try {
      const url = `${API_BASE_URL}v1/orders/${order.id}/mark-ready`;
      console.log(`📡 [OrdersScreen] Marking order as ready: ${order.id}`);

      const response = await fetchWithAuth(url, {
        method: 'PUT',
      });

      const responseData = await response.json();

      if (response.ok && responseData?.code === 200) {
        console.log(`✅ [OrdersScreen] Order marked as ready successfully`);
        
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
      }
    } catch (error) {
      console.error(`❌ [OrdersScreen] Error marking order as ready:`, error);
    } finally {
      setLoadingOrderIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(order.id);
        return newSet;
      });
    }
  };

  // Update preparation time API
  const handleUpdatePreparationTime = async (orderId, minutes) => {
    if (!orderId) {
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
      }
    } catch (error) {
      console.error(`❌ [OrdersScreen] Error updating preparation time:`, error);
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
      return;
    }

    setLoadingOrderIds(prev => new Set(prev).add(order.id));
    try {
      console.log('📡 [OrdersScreen] ========================================');
      console.log('📡 [OrdersScreen] MARKING ORDER AS PICKED UP');
      console.log('📡 [OrdersScreen] ========================================');
      console.log(`📡 [OrdersScreen] Order ID: ${order.id}`);
      console.log(`📡 [OrdersScreen] Order Number: ${order.orderNumber}`);
      
      // Use rider API endpoint for marking order as picked up
      // This endpoint is specifically for the rider app: PUT /rider/api/v1/orders/{orderId}/mark-picked-up
      // Requires X-Rider-Id header
      const url = `${RIDER_API_BASE_URL}v1/orders/${order.id}/mark-picked-up`;
      console.log(`📡 [OrdersScreen] Endpoint: ${url}`);
      console.log(`📡 [OrdersScreen] Using rider API endpoint for marking order as picked up`);
      
      // Get rider ID from order if available, otherwise use default
      // TODO: Replace with actual rider ID from order assignment or user context
      const riderId = order.riderId || DEFAULT_RIDER_ID;
      console.log(`📡 [OrdersScreen] Using Rider ID: ${riderId}`);

      const response = await fetchWithAuth(url, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-Rider-Id': riderId,
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
      }
    } catch (error) {
      console.error('❌ [OrdersScreen] ========================================');
      console.error(`❌ [OrdersScreen] EXCEPTION MARKING ORDER AS PICKED UP`);
      console.error('❌ [OrdersScreen] ========================================');
      console.error(`❌ [OrdersScreen] Error:`, error);
      console.error(`❌ [OrdersScreen] Error Message:`, error?.message);
      console.error(`❌ [OrdersScreen] Error Stack:`, error?.stack);
      
    } finally {
      setLoadingOrderIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(order.id);
        return newSet;
      });
    }
  };

  // Mark order as delivered API
  const handleMarkOrderDelivered = async (order) => {
    if (!order || !order.id) {
      return;
    }

    setLoadingOrderIds(prev => new Set(prev).add(order.id));
    try {
      console.log('📡 [OrdersScreen] ========================================');
      console.log('📡 [OrdersScreen] MARKING ORDER AS DELIVERED');
      console.log('📡 [OrdersScreen] ========================================');
      console.log(`📡 [OrdersScreen] Order ID: ${order.id}`);
      console.log(`📡 [OrdersScreen] Order Number: ${order.orderNumber}`);
      
      // Use rider API endpoint for marking order as delivered
      // This endpoint is specifically for the rider app: PUT /rider/api/v1/orders/{orderId}/mark-delivered
      // Requires X-Rider-Id header
      const url = `${RIDER_API_BASE_URL}v1/orders/${order.id}/mark-delivered`;
      console.log(`📡 [OrdersScreen] Endpoint: ${url}`);
      console.log(`📡 [OrdersScreen] Using rider API endpoint for marking order as delivered`);
      
      // Get rider ID from order if available, otherwise use default
      // TODO: Replace with actual rider ID from order assignment or user context
      const riderId = order.riderId || DEFAULT_RIDER_ID;
      console.log(`📡 [OrdersScreen] Using Rider ID: ${riderId}`);

      const response = await fetchWithAuth(url, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-Rider-Id': riderId,
        },
      });

      const responseData = await response.json();
      
      console.log(`📡 [OrdersScreen] Response Status: ${response.status}`);
      console.log(`📡 [OrdersScreen] Response Code: ${responseData?.code}`);
      console.log(`📡 [OrdersScreen] Response Message: ${responseData?.message || 'N/A'}`);

      if (response.ok && responseData?.code === 200) {
        console.log('✅ [OrdersScreen] ========================================');
        console.log('✅ [OrdersScreen] ORDER MARKED AS DELIVERED SUCCESSFULLY');
        console.log('✅ [OrdersScreen] ========================================');
        console.log('📋 [OrdersScreen] Updated Order Data:', JSON.stringify(responseData.data, null, 2));
        
        
        // Remove order from PICKED_UP list immediately
        setOrdersByStatus(prev => ({
          ...prev,
          PICKED_UP: prev.PICKED_UP.filter(o => o.id !== order.id),
        }));
        
        // Switch to Past Orders tab to show the delivered order
        if (activeTab === 'pickedUp') {
          setActiveTab('pastOrders');
          
          // Scroll to past orders tab
          setTimeout(() => {
            if (tabsScrollViewRef.current && tabPositions.current['pastOrders'] !== undefined) {
              tabsScrollViewRef.current.scrollTo({
                x: tabPositions.current['pastOrders'] - 20,
                animated: true,
              });
            }
          }, 100);
        }
        
        // Refresh orders after marking delivered
        setTimeout(() => {
          fetchOrdersForTab('pastOrders');
          fetchNewOrders();
        }, 500);
      } else {
        console.error('❌ [OrdersScreen] ========================================');
        console.error(`❌ [OrdersScreen] FAILED TO MARK ORDER AS DELIVERED`);
        console.error('❌ [OrdersScreen] ========================================');
        console.error(`❌ [OrdersScreen] HTTP Status: ${response.status}`);
        console.error(`❌ [OrdersScreen] Response Code: ${responseData?.code}`);
        console.error(`❌ [OrdersScreen] Response Message: ${responseData?.message || 'N/A'}`);
        console.error(`❌ [OrdersScreen] Full Response:`, JSON.stringify(responseData, null, 2));
        
        const errorMessage = responseData?.message || 'Failed to mark order as delivered';
      }
    } catch (error) {
      console.error('❌ [OrdersScreen] ========================================');
      console.error(`❌ [OrdersScreen] EXCEPTION MARKING ORDER AS DELIVERED`);
      console.error('❌ [OrdersScreen] ========================================');
      console.error(`❌ [OrdersScreen] Error:`, error);
      console.error(`❌ [OrdersScreen] Error Message:`, error?.message);
      console.error(`❌ [OrdersScreen] Error Stack:`, error?.stack);
      
    } finally {
      setLoadingOrderIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(order.id);
        return newSet;
      });
    }
  };

  // Handle viewing invoice
  const handleViewInvoice = async (order) => {
    if (!order) {
      return;
    }

    // Validate order ID - must be a valid MongoDB ObjectId (24 hex characters)
    if (!order.id) {
      console.error('❌ [OrdersScreen] Order ID is missing');
      console.error('❌ [OrdersScreen] Order object:', JSON.stringify(order, null, 2));
      return;
    }

    // Get order ID - try multiple possible fields
    let orderIdStr = null;
    
    // First, try order.id (should be MongoDB ObjectId)
    if (order.id) {
      const idStr = String(order.id).trim();
      // Check if it's a valid MongoDB ObjectId (24 hex characters)
      if (/^[0-9a-fA-F]{24}$/.test(idStr)) {
        orderIdStr = idStr;
        console.log('✅ [OrdersScreen] Using order.id (MongoDB ObjectId):', orderIdStr);
      } else {
        console.warn('⚠️ [OrdersScreen] order.id is not a valid MongoDB ObjectId:', idStr);
        console.warn('⚠️ [OrdersScreen] Order ID format:', idStr);
        console.warn('⚠️ [OrdersScreen] Order Number:', order.orderNumber);
      }
    }
    
    // If order.id is not valid, we cannot proceed (API requires MongoDB ObjectId)
    if (!orderIdStr) {
      console.error('❌ [OrdersScreen] ========================================');
      console.error('❌ [OrdersScreen] INVALID ORDER ID FOR INVOICE');
      console.error('❌ [OrdersScreen] ========================================');
      console.error('❌ [OrdersScreen] Order ID (raw):', order.id);
      console.error('❌ [OrdersScreen] Order ID Type:', typeof order.id);
      console.error('❌ [OrdersScreen] Order Number:', order.orderNumber);
      console.error('❌ [OrdersScreen] Order Status:', order.status);
      console.error('❌ [OrdersScreen] Full Order Object:', JSON.stringify(order, null, 2));
      return;
    }

    setIsLoadingInvoice(true);
    setShowInvoiceModal(true);
    setInvoicePdfUrl(null);
    setUseDirectPdf(false);

    try {
      console.log('📄 [OrdersScreen] ========================================');
      console.log('📄 [OrdersScreen] FETCHING INVOICE FROM BACKEND');
      console.log('📄 [OrdersScreen] ========================================');
      console.log('📄 [OrdersScreen] Order ID:', orderIdStr);
      console.log('📄 [OrdersScreen] Order ID Type:', typeof order.id);
      console.log('📄 [OrdersScreen] Order Number:', order.orderNumber);
      console.log('📄 [OrdersScreen] Order Status:', order.status);
      console.log('📄 [OrdersScreen] Full Order Object Keys:', Object.keys(order));
      
      // Call backend API to get/create invoice
      // This endpoint will create the invoice if it doesn't exist
      const url = `${API_BASE_URL}v1/orders/${orderIdStr}/invoice`;
      console.log('📄 [OrdersScreen] Invoice API URL:', url);
      console.log('📄 [OrdersScreen] API Base URL:', API_BASE_URL);
      console.log('📄 [OrdersScreen] Note: This endpoint will CREATE invoice if it does not exist');

      const response = await fetchWithAuth(url, {
        method: 'GET',
      });

      console.log('📄 [OrdersScreen] HTTP Response Status:', response.status);
      console.log('📄 [OrdersScreen] HTTP Response OK:', response.ok);

      const responseData = await response.json();
      
      console.log('📄 [OrdersScreen] Response Code:', responseData?.code);
      console.log('📄 [OrdersScreen] Response Status:', responseData?.status);
      console.log('📄 [OrdersScreen] Response Message:', responseData?.message || 'N/A');
      console.log('📄 [OrdersScreen] Has Data:', !!responseData?.data);
      console.log('📄 [OrdersScreen] Has PDF URL:', !!responseData?.data?.pdf_url);
      
      if (responseData?.data) {
        console.log('📄 [OrdersScreen] Response Data Keys:', Object.keys(responseData.data));
        console.log('📄 [OrdersScreen] Full Response Data:', JSON.stringify(responseData.data, null, 2));
      }

      // Check if invoice was successfully created/fetched
      if (response.ok && responseData?.code === 200) {
        // Check if PDF URL exists in response
        if (responseData?.data?.pdf_url) {
          const pdfUrl = responseData.data.pdf_url;
          console.log('✅ [OrdersScreen] Invoice created/fetched successfully');
          console.log('✅ [OrdersScreen] PDF URL:', pdfUrl);
          console.log('✅ [OrdersScreen] PDF URL Protocol:', pdfUrl.startsWith('https') ? 'HTTPS' : pdfUrl.startsWith('http') ? 'HTTP' : 'UNKNOWN');
          console.log('✅ [OrdersScreen] Invoice Number:', responseData.data.invoice_number);
          console.log('✅ [OrdersScreen] Invoice ID:', responseData.data.invoice_id);
          console.log('✅ [OrdersScreen] Invoice Status:', responseData.data.status);
          
            // Convert HTTP URLs to HTTPS S3 URLs
            let finalPdfUrl = pdfUrl;
            const isHttps = pdfUrl.startsWith('https://');
            const isHttp = pdfUrl.startsWith('http://');
            
            if (isHttp) {
              // Extract the path from HTTP URL and convert to HTTPS S3 URL
              // Example: http://kamai24-stage.../invoices/partners/PARTCIAN1SOF/invoices/INV-2025-2438.pdf
              // Convert to: https://dev-kamai24.s3.amazonaws.com/partners/PARTCIAN1SOF/invoices/INV-2025-2438.pdf
              try {
                const urlObj = new URL(pdfUrl);
                const pathParts = urlObj.pathname.split('/').filter(part => part !== ''); // Remove empty strings
                
                console.log('🔄 [OrdersScreen] Path parts:', pathParts);
                
                // Find the index of 'partners' in the path
                const partnersIndex = pathParts.findIndex(part => part === 'partners');
                
                if (partnersIndex !== -1) {
                  // Extract everything from 'partners' onwards (including 'partners')
                  const s3Path = pathParts.slice(partnersIndex).join('/');
                  finalPdfUrl = `https://dev-kamai24.s3.amazonaws.com/${s3Path}`;
                  console.log('🔄 [OrdersScreen] Converting HTTP URL to HTTPS S3 URL');
                  console.log('🔄 [OrdersScreen] Original URL:', pdfUrl);
                  console.log('🔄 [OrdersScreen] S3 Path:', s3Path);
                  console.log('🔄 [OrdersScreen] Converted URL:', finalPdfUrl);
                } else {
                  // Fallback: try to extract invoice filename and partner from URL pattern
                  // Look for pattern: .../invoices/INV-YYYY-XXXX.pdf
                  const invoiceMatch = pdfUrl.match(/\/invoices\/(INV-\d{4}-\d+\.pdf)/);
                  if (invoiceMatch) {
                    const invoiceFileName = invoiceMatch[1];
                    // Try to extract partner ID from URL path or use from response data
                    const partnerMatch = pdfUrl.match(/\/partners\/([^\/]+)/);
                    const partnerId = partnerMatch ? partnerMatch[1] : (responseData?.data?.partner_id || responseData?.partner_id || 'PARTCIAN1SOF');
                    finalPdfUrl = `https://dev-kamai24.s3.amazonaws.com/partners/${partnerId}/invoices/${invoiceFileName}`;
                    console.log('🔄 [OrdersScreen] Using fallback conversion method');
                    console.log('🔄 [OrdersScreen] Invoice filename:', invoiceFileName);
                    console.log('🔄 [OrdersScreen] Partner ID:', partnerId);
                    console.log('🔄 [OrdersScreen] Converted URL:', finalPdfUrl);
                  } else {
                    console.warn('⚠️ [OrdersScreen] Could not find "partners" or invoice pattern in HTTP URL path');
                    console.warn('⚠️ [OrdersScreen] Using original HTTP URL');
                  }
                }
              } catch (error) {
                console.error('❌ [OrdersScreen] Error converting HTTP URL to HTTPS:', error);
                console.error('❌ [OrdersScreen] Error details:', error.message);
                console.warn('⚠️ [OrdersScreen] Using original HTTP URL');
              }
            }
          
          // Use Google Docs Viewer for all URLs (now all should be HTTPS)
          const viewerUrl = `https://docs.google.com/viewer?url=${encodeURIComponent(finalPdfUrl)}&embedded=true`;
          console.log('✅ [OrdersScreen] Using Google Docs Viewer to display PDF');
          console.log('✅ [OrdersScreen] Final PDF URL:', finalPdfUrl);
          console.log('✅ [OrdersScreen] Viewer URL:', viewerUrl);
          setInvoicePdfUrl(viewerUrl);
          setUseDirectPdf(false);
        } else {
          // Invoice was created but PDF URL is missing
          console.error('❌ [OrdersScreen] Invoice created but PDF URL is missing');
          console.error('❌ [OrdersScreen] Response Data:', JSON.stringify(responseData.data, null, 2));
          setShowInvoiceModal(false);
        }
      } else {
        // API returned an error
        console.error('❌ [OrdersScreen] ========================================');
        console.error('❌ [OrdersScreen] FAILED TO CREATE/FETCH INVOICE');
        console.error('❌ [OrdersScreen] ========================================');
        console.error('❌ [OrdersScreen] Order ID:', orderIdStr);
        console.error('❌ [OrdersScreen] Order Number:', order.orderNumber);
        console.error('❌ [OrdersScreen] HTTP Status:', response.status);
        console.error('❌ [OrdersScreen] Response Code:', responseData?.code);
        console.error('❌ [OrdersScreen] Response Status:', responseData?.status);
        console.error('❌ [OrdersScreen] Response Message:', responseData?.message || 'N/A');
        console.error('❌ [OrdersScreen] Full Response:', JSON.stringify(responseData, null, 2));
        
        // Provide more helpful error message
        let errorMessage = responseData?.message || `Failed to create/fetch invoice (Status: ${response.status})`;
        
        // Check for specific error cases
        if (response.status === 404) {
          errorMessage = 'Order not found. Cannot create invoice.';
        } else if (response.status === 400) {
          errorMessage = responseData?.message || 'Invalid order. Cannot create invoice.';
        } else if (response.status === 500) {
          errorMessage = 'Server error while creating invoice. Please try again.';
        }
        
        setShowInvoiceModal(false);
      }
    } catch (error) {
      console.error('❌ [OrdersScreen] ========================================');
      console.error(`❌ [OrdersScreen] EXCEPTION FETCHING INVOICE`);
      console.error('❌ [OrdersScreen] ========================================');
      console.error('❌ [OrdersScreen] Order ID:', order.id);
      console.error('❌ [OrdersScreen] Order Number:', order.orderNumber);
      console.error(`❌ [OrdersScreen] Error Type:`, error?.constructor?.name || 'Unknown');
      console.error(`❌ [OrdersScreen] Error:`, error);
      console.error(`❌ [OrdersScreen] Error Message:`, error?.message);
      console.error(`❌ [OrdersScreen] Error Stack:`, error?.stack);
      
      setShowInvoiceModal(false);
    } finally {
      setIsLoadingInvoice(false);
    }
  };

  // Render PREPARING order card
  const renderPreparingCard = (order) => {
    // Log order details for debugging
    console.log('🎨 [OrdersScreen] Rendering PREPARING card:', {
      orderNumber: order.orderNumber,
      customerName: order.customerName,
      amount: order.amount,
      estimatedTime: order.estimatedTime,
      estimatedReadyTime: order.estimatedReadyTime,
      acceptedAt: order.acceptedAt,
    });
    
    return (
      <View style={styles.preparingCardNew}>
        {/* Header: Date (left), Status (center), Time (right) */}
        <View style={styles.preparingCardHeader}>
          <Text style={styles.preparingCardDate}>
            {order.acceptedAt 
              ? formatDate(order.acceptedAt) 
              : (order.dateDisplay || '')}
          </Text>
          <Text style={styles.preparingCardStatus}>{order.statusDisplay || 'Preparing'}</Text>
          <Text style={styles.preparingCardTime}>
            {order.acceptedAt 
              ? formatTimeDisplay(order.acceptedAt) 
              : (order.timeDisplay || '')}
          </Text>
        </View>
        
        {/* Order Number */}
        <Text style={styles.preparingOrderNumberNew}>
          {order.orderNumber ? `#${order.orderNumber}` : (order.id ? `#${order.id.slice(-4)}` : '#N/A')}
        </Text>
        
        {/* Order Summary Line */}
        <View style={styles.preparingOrderInfoNew}>
          <Text style={styles.preparingOrderDetailsNew} numberOfLines={1}>
            {order.timeDisplay ? `${order.timeDisplay} | ` : ''}₹{order.amount?.toFixed(2) || '0.00'}
          </Text>
        </View>
        
        {/* Items Preview */}
        <Text style={styles.preparingItemsPreview} numberOfLines={1}>
          {order.itemsPreview || `${order.itemCount || 0} items`}
        </Text>
        
        {/* Dashed Line */}
        <View style={styles.dashedLine} />
        
        {/* Bottom Actions: Mark Ready + Add Time */}
        <View style={styles.preparingActionsNew}>
          <TouchableOpacity
            style={[styles.markReadyButtonNew, loadingOrderIds.has(order.id) && styles.markReadyButtonDisabledNew]}
            onPress={() => handleMarkOrderReady(order)}
            activeOpacity={0.7}
            disabled={loadingOrderIds.has(order.id)}
          >
            {loadingOrderIds.has(order.id) ? (
              <ActivityIndicator size="small" color="#8B4513" />
            ) : (
              <PreparingCountdown estimatedReadyTime={order.estimatedReadyTime} />
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.addTimeButton}
            onPress={() => openTimePicker(order)}
            activeOpacity={0.7}
          >
            <Text style={styles.addTimeButtonText}>+</Text>
          </TouchableOpacity>
        </View>
        <TornEdge />
      </View>
    );
  };

  // Render READY order card
  const renderReadyCard = (order) => {
    return (
      <View style={styles.readyCardNew}>
        {/* Header: Date (left), Status (center), Time (right) */}
        <View style={styles.readyCardHeader}>
          <Text style={styles.readyCardDate}>
            {order.readyAt 
              ? formatDate(order.readyAt) 
              : (order.dateDisplay || '')}
          </Text>
          <Text style={styles.readyCardStatus}>{order.statusDisplay || 'Ready'}</Text>
          <Text style={styles.readyCardTime}>
            {order.readyAt 
              ? formatTimeDisplay(order.readyAt) 
              : (order.timeDisplay || '')}
          </Text>
        </View>
        
        {/* Order Number */}
        <Text style={styles.readyOrderNumberNew}>
          {order.orderNumber ? `#${order.orderNumber}` : (order.id ? `#${order.id.slice(-4)}` : '#N/A')}
        </Text>
        
        {/* Order Summary Line */}
        <View style={styles.readyOrderInfoNew}>
          <Text style={styles.readyOrderDetailsNew} numberOfLines={1}>
            {order.timeDisplay ? `${order.timeDisplay} | ` : ''}{order.itemsPreview || ''}
          </Text>
          <Text style={styles.readyOrderAmountNew}>₹{order.amount?.toFixed(2) || '0.00'}</Text>
        </View>
        
        {/* Bottom Actions: Food Ready + Track Delivery */}
        <View style={styles.readyActionsNew}>
          <TouchableOpacity
            style={[styles.foodReadyButton, loadingOrderIds.has(order.id) && styles.foodReadyButtonDisabled]}
            onPress={() => handleMarkOrderPickedUp(order)}
            activeOpacity={0.7}
            disabled={loadingOrderIds.has(order.id)}
          >
            {loadingOrderIds.has(order.id) ? (
              <ActivityIndicator size="small" color="#666666" />
            ) : (
              <Text style={styles.foodReadyButtonText} numberOfLines={1}>Food Ready</Text>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.trackDeliveryButtonReady}
            onPress={() => {
              // TODO: Track delivery
            }}
            activeOpacity={0.7}
          >
            <Text style={styles.trackDeliveryButtonTextReady} numberOfLines={1}>Track Delivery</Text>
          </TouchableOpacity>
        </View>
        <TornEdge />
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
    const isDelivered = order.status === 'DELIVERED' || order.status === 'COMPLETED' || order.deliveredAt;
    const statusText = isDelivered ? 'Delivered' : 'On the Way';
    
    // Format delivery stats from backend data (show "0" if not available)
    const deliveryTime = order.deliveryTime 
      ? (typeof order.deliveryTime === 'number' ? `${order.deliveryTime}min` : order.deliveryTime)
      : '0min';
    const deliveryDistance = order.deliveryDistance 
      ? (typeof order.deliveryDistance === 'number' ? `${order.deliveryDistance}km` : order.deliveryDistance)
      : '0km';
    const deliveryRating = order.deliveryRating 
      ? (typeof order.deliveryRating === 'number' ? order.deliveryRating.toFixed(1) : order.deliveryRating)
      : '0';
    
    // For DELIVERED status, use new design
    if (isDelivered) {
      return (
        <View style={styles.deliveredCard}>
          {/* Header: Date (left), Status (center), Time (right) */}
          <View style={styles.deliveredCardHeader}>
            <Text style={styles.deliveredCardDate}>
              {order.deliveredAt 
                ? formatDate(order.deliveredAt) 
                : (order.pickedUpAt 
                  ? formatDate(order.pickedUpAt) 
                  : (order.dateDisplay || ''))}
            </Text>
            <Text style={styles.deliveredCardStatus}>{order.statusDisplay || 'Delivered'}</Text>
            <Text style={styles.deliveredCardTime}>
              {order.deliveredAt 
                ? formatTimeDisplay(order.deliveredAt) 
                : (order.pickedUpAt 
                  ? formatTimeDisplay(order.pickedUpAt) 
                  : (order.timeDisplay || ''))}
            </Text>
          </View>
          
          {/* Order Number */}
          <Text style={styles.deliveredOrderNumber}>
            {order.orderNumber ? `#${order.orderNumber}` : (order.id ? `#${order.id.slice(-4)}` : '#N/A')}
          </Text>
          
          {/* Order Summary Line */}
          <View style={styles.deliveredOrderInfo}>
            <Text style={styles.deliveredOrderDetails} numberOfLines={1}>
              {order.timeDisplay ? `${order.timeDisplay} | ` : ''}{order.itemsPreview || ''}
            </Text>
            <Text style={styles.deliveredOrderAmount}>₹{order.amount?.toFixed(2) || '0.00'}</Text>
          </View>
          
          {/* Dashed Line */}
          <View style={styles.dashedLine} />
          
          {/* Rider Details Section */}
          {(order.riderName || order.riderPhone) && (
            <>
              <Text style={styles.riderDetailsHeading}>Rider Details</Text>
              <View style={styles.riderDetailsSection}>
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
                <View style={styles.riderDetailsInfo}>
                  <Text style={styles.riderDetailsName}>
                    Name: {order.riderName || ''}
                  </Text>
                  <Text style={styles.riderDetailsPhone}>
                    Phone No: {order.riderPhone || ''}
                  </Text>
                </View>
              </View>
              
              {/* Dashed Line */}
              <View style={styles.dashedLine} />
            </>
          )}
          
          {/* Bottom Actions: View Invoice + Delivery Stats */}
          <View style={styles.deliveredActions}>
            <TouchableOpacity
              style={styles.viewInvoiceButtonOutlined}
              onPress={() => handleViewInvoice(order)}
              activeOpacity={0.7}
            >
              <Text style={styles.viewInvoiceButtonTextOutlined}>View Invoice</Text>
            </TouchableOpacity>
            
            {/* Always show delivery stats icons (show "0" if backend data not available) */}
            <View style={styles.deliveryStatsContainer}>
              <View style={[styles.deliveredDeliveryStatItem, { marginLeft: 0 }]}>
                <Image
                  source={icons.time}
                  style={styles.deliveredDeliveryStatIcon}
                  resizeMode="contain"
                />
                <Text style={styles.deliveredDeliveryStatText}>{deliveryTime}</Text>
              </View>
              <View style={styles.deliveredDeliveryStatItem}>
                <Image
                  source={icons.location}
                  style={styles.deliveredDeliveryStatIcon}
                  resizeMode="contain"
                />
                <Text style={styles.deliveredDeliveryStatText}>{deliveryDistance}</Text>
              </View>
              <View style={styles.deliveredDeliveryStatItem}>
                <Image
                  source={icons.star}
                  style={styles.deliveredDeliveryStatIcon}
                  resizeMode="contain"
                />
                <Text style={styles.deliveredDeliveryStatText}>{deliveryRating}</Text>
              </View>
            </View>
          </View>
          <TornEdge />
        </View>
      );
    }
    
    // For PICKED_UP (On the Way) status, use new design matching delivered card
    return (
      <View style={styles.pickedUpCardNew}>
        {/* Header: Date (left), Status (center), Time (right) */}
        <View style={styles.pickedUpCardHeader}>
          <Text style={styles.pickedUpCardDate}>
            {order.pickedUpAt 
              ? formatDate(order.pickedUpAt) 
              : (order.dateDisplay || '')}
          </Text>
          <Text style={styles.pickedUpCardStatus}>{order.statusDisplay || 'On the Way'}</Text>
          <Text style={styles.pickedUpCardTime}>
            {order.pickedUpAt 
              ? formatTimeDisplay(order.pickedUpAt) 
              : (order.timeDisplay || '')}
          </Text>
        </View>
        
        {/* Order Number */}
        <Text style={styles.pickedUpOrderNumberNew}>
          {order.orderNumber ? `#${order.orderNumber}` : (order.id ? `#${order.id.slice(-4)}` : '#N/A')}
        </Text>
        
        {/* Order Summary Line */}
        <View style={styles.pickedUpOrderInfoNew}>
          <Text style={styles.pickedUpOrderDetailsNew} numberOfLines={1}>
            {order.timeDisplay ? `${order.timeDisplay} | ` : ''}{order.itemsPreview || ''}
          </Text>
          <Text style={styles.pickedUpOrderAmountNew}>₹{order.amount?.toFixed(2) || '0.00'}</Text>
        </View>
        
        {/* Dashed Line */}
        <View style={styles.dashedLine} />
        
        {/* Rider Details Section */}
        {(order.riderName || order.riderPhone) && (
          <>
            <Text style={styles.riderDetailsHeading}>Rider Details</Text>
            <View style={styles.riderDetailsSection}>
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
              <View style={styles.riderDetailsInfo}>
                <Text style={styles.riderDetailsName}>
                  Name: {order.riderName || ''}
                </Text>
                <Text style={styles.riderDetailsPhone}>
                  Phone No: {order.riderPhone || ''}
                </Text>
              </View>
            </View>
            
            {/* Dashed Line */}
            <View style={styles.dashedLine} />
          </>
        )}
        
        {/* Bottom Actions: DE Arriving + Track Delivery */}
        <View style={styles.pickedUpActionsNew}>
          <TouchableOpacity
            style={[styles.deArrivingButton, loadingOrderIds.has(order.id) && styles.deArrivingButtonDisabled]}
            onPress={() => handleMarkOrderDelivered(order)}
            activeOpacity={0.7}
            disabled={loadingOrderIds.has(order.id)}
          >
            {loadingOrderIds.has(order.id) ? (
              <ActivityIndicator size="small" color="#666666" />
            ) : (
              <Text style={styles.deArrivingButtonText} numberOfLines={1}>
                DE Arriving in {formatArrivalTime(order)} min
              </Text>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.trackDeliveryButtonFilled}
            onPress={() => {
              // TODO: Track delivery
            }}
            activeOpacity={0.7}
          >
            <Text style={styles.trackDeliveryButtonTextFilled} numberOfLines={1}>Track Delivery</Text>
          </TouchableOpacity>
        </View>
        <TornEdge />
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
        <TornEdge />
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
              <AnimatedBottomNavIcon
                source={tab.icon}
                isActive={activeBottomTab === tab.id}
                style={[
                  styles.bottomNavIcon,
                  activeBottomTab === tab.id && styles.bottomNavIconActive,
                ]}
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
              <AnimatedBottomNavIcon
                source={tab.icon}
                isActive={activeBottomTab === tab.id}
                style={[
                  styles.bottomNavIcon,
                  activeBottomTab === tab.id && styles.bottomNavIconActive,
                ]}
              />
            </TouchableOpacity>
          ))}
        </View>
      </SafeAreaView>
    );
  }

  // Render FinanceScreen when finance tab is active
  if (activeBottomTab === 'finance') {
    return (
      <SafeAreaView style={styles.fullScreenContainer} edges={['top', 'left', 'right']}>
        <View style={styles.menuScreenWrapper}>
          <FinanceScreen 
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
              <AnimatedBottomNavIcon
                source={tab.icon}
                isActive={activeBottomTab === tab.id}
                style={[
                  styles.bottomNavIcon,
                  activeBottomTab === tab.id && styles.bottomNavIconActive,
                ]}
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
              source={images.headerLogo}
              style={styles.cookingIcon}
              resizeMode="contain"
            />
          </View>
          <View style={styles.headerContent}>
            <View style={styles.headerTopRow}>
              <Text style={styles.restaurantName}>
                {configData?.partner_info?.business_name || ''}
              </Text>
              {isTogglingOnline ? (
                <ActivityIndicator size="small" color="#FF6E1A" style={styles.headerToggleLoader} />
              ) : (
                <View style={styles.smallToggleWrapper}>
                  <PowerToggle
                    value={isOnline}
                    onValueChange={handleOnlineToggle}
                    disabled={isTogglingOnline}
                  />
                </View>
              )}
            </View>
            {configData?.partner_info && (
              <View style={styles.statusContainer}>
                <Text style={[
                  styles.onlineText,
                  configData.partner_info.online_status?.toLowerCase() === 'offline' && styles.offlineText
                ]}>
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

      {/* Partner Status Banner */}
      {partnerStatus === 'UNDER_REVIEW' && (
        <View style={styles.statusBanner}>
          <Text style={styles.statusBannerText}>
            Your application is under review. We'll notify you once it's approved.
          </Text>
        </View>
      )}

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
              {tab.icon && (
                <AnimatedTabIcon
                  source={tab.icon}
                  isActive={activeTab === tab.id}
                />
              )}
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
              
              // Show empty state if no orders
              if (orders.length === 0) {
                return (
                  <View style={styles.emptyStateContainer}>
                    <Image
                      source={icons.cooking}
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
            <AnimatedBottomNavIcon
              source={tab.icon}
              isActive={activeBottomTab === tab.id}
              style={[
                styles.bottomNavIcon,
                activeBottomTab === tab.id && styles.bottomNavIconActive,
              ]}
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

      {/* Invoice Modal with WebView */}
      <Modal
        visible={showInvoiceModal}
        transparent={false}
        animationType="slide"
        onRequestClose={() => {
          setShowInvoiceModal(false);
          setInvoicePdfUrl(null);
        }}
      >
        <SafeAreaView style={styles.invoiceModalContainer} edges={['top', 'left', 'right']}>
          <View style={styles.invoiceModalHeader}>
            <Text style={styles.invoiceModalTitle}>Invoice</Text>
            <TouchableOpacity
              onPress={() => {
                setShowInvoiceModal(false);
                setInvoicePdfUrl(null);
              }}
              style={styles.invoiceModalCloseButton}
              activeOpacity={0.7}
            >
              <Text style={styles.invoiceModalCloseText}>Close</Text>
            </TouchableOpacity>
          </View>
          
          {isLoadingInvoice ? (
            <View style={styles.invoiceLoadingContainer}>
              <ActivityIndicator size="large" color="#FF6E1A" />
              <Text style={styles.invoiceLoadingText}>Generating invoice...</Text>
            </View>
          ) : invoicePdfUrl ? (
            <WebView
              source={useDirectPdf ? { html: invoicePdfUrl } : { uri: invoicePdfUrl }}
              style={styles.invoiceWebView}
              startInLoadingState={true}
              javaScriptEnabled={true}
              domStorageEnabled={true}
              allowsInlineMediaPlayback={true}
              mediaPlaybackRequiresUserAction={false}
              originWhitelist={['*']}
              mixedContentMode="always"
              renderLoading={() => (
                <View style={styles.invoiceLoadingContainer}>
                  <ActivityIndicator size="large" color="#FF6E1A" />
                  <Text style={styles.invoiceLoadingText}>Loading PDF...</Text>
                </View>
              )}
              onError={(syntheticEvent) => {
                const { nativeEvent } = syntheticEvent;
                console.error('❌ [OrdersScreen] WebView error:', nativeEvent);
                // If Google Docs Viewer fails, try direct PDF with HTML wrapper
                if (!useDirectPdf && invoicePdfUrl.includes('docs.google.com')) {
                  console.log('⚠️ [OrdersScreen] Google Docs Viewer failed, trying direct PDF with HTML wrapper...');
                  const pdfUrl = invoicePdfUrl.split('url=')[1]?.split('&')[0];
                  if (pdfUrl) {
                    const decodedUrl = decodeURIComponent(pdfUrl);
                    const htmlFallback = `
                      <!DOCTYPE html>
                      <html>
                        <head>
                          <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
                          <style>
                            * { margin: 0; padding: 0; box-sizing: border-box; }
                            body, html { width: 100%; height: 100%; overflow: hidden; background: #525252; }
                            iframe { width: 100%; height: 100%; border: none; }
                          </style>
                        </head>
                        <body>
                          <iframe src="${decodedUrl}" type="application/pdf" width="100%" height="100%"></iframe>
                        </body>
                      </html>
                    `;
                    setInvoicePdfUrl(htmlFallback);
                    setUseDirectPdf(true);
                    return;
                  }
                }
              }}
              onHttpError={(syntheticEvent) => {
                const { nativeEvent } = syntheticEvent;
                console.error('❌ [OrdersScreen] WebView HTTP error:', nativeEvent);
                // Try fallback if Google Docs Viewer fails
                if (!useDirectPdf && invoicePdfUrl.includes('docs.google.com')) {
                  console.log('⚠️ [OrdersScreen] Google Docs Viewer HTTP error, trying direct PDF...');
                  const pdfUrl = invoicePdfUrl.split('url=')[1]?.split('&')[0];
                  if (pdfUrl) {
                    const decodedUrl = decodeURIComponent(pdfUrl);
                    const htmlFallback = `
                      <!DOCTYPE html>
                      <html>
                        <head>
                          <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
                          <style>
                            * { margin: 0; padding: 0; box-sizing: border-box; }
                            body, html { width: 100%; height: 100%; overflow: hidden; background: #525252; }
                            iframe { width: 100%; height: 100%; border: none; }
                          </style>
                        </head>
                        <body>
                          <iframe src="${decodedUrl}" type="application/pdf" width="100%" height="100%"></iframe>
                        </body>
                      </html>
                    `;
                    setInvoicePdfUrl(htmlFallback);
                    setUseDirectPdf(true);
                    return;
                  }
                }
              }}
            />
          ) : (
            <View style={styles.invoiceErrorContainer}>
              <Text style={styles.invoiceErrorText}>Unable to load invoice</Text>
            </View>
          )}
        </SafeAreaView>
      </Modal>
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

// Animated Tab Icon Component (for order status tabs)
const AnimatedTabIcon = ({ source, isActive }) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isActive) {
      // Bounce animation when active
      Animated.sequence([
        Animated.spring(scaleAnim, {
          toValue: 1.2,
          friction: 3,
          tension: 40,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 3,
          tension: 40,
          useNativeDriver: true,
        }),
      ]).start();
      
      // Subtle rotation
      Animated.sequence([
        Animated.timing(rotateAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(rotateAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [isActive]);

  const rotate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '10deg'],
  });

  return (
    <Animated.Image
      source={source}
      style={[
        styles.tabIcon,
        {
          transform: [
            { scale: scaleAnim },
            { rotate: rotate },
          ],
        },
      ]}
      resizeMode="contain"
    />
  );
};

// Animated Bottom Nav Icon Component
const AnimatedBottomNavIcon = ({ source, isActive, style }) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const bounceAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isActive) {
      // Scale and bounce animation
      Animated.parallel([
        Animated.sequence([
          Animated.spring(scaleAnim, {
            toValue: 1.3,
            friction: 3,
            tension: 40,
            useNativeDriver: true,
          }),
          Animated.spring(scaleAnim, {
            toValue: 1.1,
            friction: 3,
            tension: 40,
            useNativeDriver: true,
          }),
        ]),
        Animated.sequence([
          Animated.timing(bounceAnim, {
            toValue: -8,
            duration: 150,
            useNativeDriver: true,
          }),
          Animated.spring(bounceAnim, {
            toValue: 0,
            friction: 3,
            tension: 40,
            useNativeDriver: true,
          }),
        ]),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(bounceAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [isActive]);

  return (
    <Animated.Image
      source={source}
      style={[
        style,
        {
          transform: [
            { scale: scaleAnim },
            { translateY: bounceAnim },
          ],
        },
      ]}
      resizeMode="contain"
    />
  );
};

// Torn Edge Component
const TornEdge = () => {
  const numTriangles = 20;
  const triangles = [];
  
  for (let i = 0; i < numTriangles; i++) {
    triangles.push(
      <View
        key={i}
        style={{
          width: 0,
          height: 0,
          backgroundColor: 'transparent',
          borderStyle: 'solid',
          borderLeftWidth: SCREEN_WIDTH / numTriangles / 2,
          borderRightWidth: SCREEN_WIDTH / numTriangles / 2,
          borderBottomWidth: 8,
          borderLeftColor: 'transparent',
          borderRightColor: 'transparent',
          borderBottomColor: '#F5F5F5',
        }}
      />
    );
  }
  
  return (
    <View style={{
      flexDirection: 'row',
      position: 'absolute',
      bottom: -8,
      left: 0,
      right: 0,
      backgroundColor: '#FFFFFF',
    }}>
      {triangles}
    </View>
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
    backgroundColor: '#F5F5F5',
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
  headerContent: {
    flex: 1,
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  restaurantName: {
    fontFamily: Poppins.semiBold,
    fontSize: 18,
    color: '#000000',
    flex: 1,
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
  offlineText: {
    color: '#EF5350',
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
  headerToggleLoader: {
    marginLeft: 8,
  },
  smallToggleWrapper: {
    transform: [{ scale: 0.6 }],
    marginLeft: 12,
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
  tabIcon: {
    width: 24,
    height: 24,
    marginBottom: 4,
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
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    padding: 10,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    overflow: 'hidden',
  },
  orderCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
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
    flex: 1,
  },
  panImage: {
    width: 120,
    height: 120,
    alignSelf: 'center',
    marginBottom: 10,
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
    width: 40,
    height: 40,
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
  // PREPARING Card Styles (New Design - matching other cards)
  preparingCardNew: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    padding: 16,
    paddingBottom: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E3F2FD',
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
  preparingCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  preparingCardDate: {
    fontFamily: Poppins.regular,
    fontSize: 14,
    color: '#666666',
    flex: 1,
  },
  preparingCardStatus: {
    fontFamily: Poppins.semiBold,
    fontSize: 16,
    color: '#8B4513',
    flex: 1,
    textAlign: 'center',
  },
  preparingCardTime: {
    fontFamily: Poppins.regular,
    fontSize: 14,
    color: '#666666',
    flex: 1,
    textAlign: 'right',
  },
  preparingOrderNumberNew: {
    fontFamily: Poppins.bold,
    fontSize: 24,
    color: '#000000',
    marginBottom: 8,
    textAlign: 'left',
  },
  preparingOrderInfoNew: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  preparingOrderDetailsNew: {
    fontFamily: Poppins.regular,
    fontSize: 14,
    color: '#666666',
  },
  preparingItemsPreview: {
    fontFamily: Poppins.regular,
    fontSize: 14,
    color: '#666666',
    marginBottom: 12,
  },
  deAssignmentSectionNew: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  deAssignmentTextNew: {
    fontFamily: Poppins.regular,
    fontSize: 14,
    color: '#000000',
    flex: 1,
  },
  deIconNew: {
    width: 48,
    height: 48,
    marginLeft: 12,
  },
  preparingActionsNew: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'stretch',
    marginTop: 8,
    gap: 12,
  },
  markReadyButtonNew: {
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#8B4513',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    height: 48,
  },
  markReadyButtonDisabledNew: {
    opacity: 0.6,
  },
  markReadyButtonTextNew: {
    fontFamily: Poppins.medium,
    fontSize: 14,
    color: '#8B4513',
    textAlign: 'center',
  },
  addTimeButton: {
    width: 48,
    height: 48,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#8B4513',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addTimeButtonText: {
    fontFamily: Poppins.bold,
    fontSize: 24,
    color: '#8B4513',
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
  // READY Card Styles (New Design - matching picked up and delivered cards)
  readyCardNew: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    padding: 16,
    paddingBottom: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E3F2FD',
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
  readyCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  readyCardDate: {
    fontFamily: Poppins.regular,
    fontSize: 14,
    color: '#666666',
    flex: 1,
  },
  readyCardStatus: {
    fontFamily: Poppins.semiBold,
    fontSize: 16,
    color: '#4CAF50',
    flex: 1,
    textAlign: 'center',
  },
  readyCardTime: {
    fontFamily: Poppins.regular,
    fontSize: 14,
    color: '#666666',
    flex: 1,
    textAlign: 'right',
  },
  readyOrderNumberNew: {
    fontFamily: Poppins.bold,
    fontSize: 24,
    color: '#000000',
    marginBottom: 8,
  },
  readyOrderInfoNew: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  readyOrderDetailsNew: {
    fontFamily: Poppins.regular,
    fontSize: 14,
    color: '#666666',
    flex: 1,
    marginRight: 12,
  },
  readyOrderAmountNew: {
    fontFamily: Poppins.regular,
    fontSize: 14,
    color: '#666666',
  },
  readyActionsNew: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'stretch',
    marginTop: 8,
    gap: 12,
  },
  foodReadyButton: {
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#666666',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    height: 48,
  },
  foodReadyButtonDisabled: {
    opacity: 0.6,
  },
  foodReadyButtonText: {
    fontFamily: Poppins.medium,
    fontSize: 14,
    color: '#666666',
    textAlign: 'center',
  },
  trackDeliveryButtonReady: {
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#D4A574',
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    height: 48,
  },
  trackDeliveryButtonTextReady: {
    fontFamily: Poppins.medium,
    fontSize: 14,
    color: '#FFFFFF',
    textAlign: 'center',
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
  arrivingButtonDisabled: {
    opacity: 0.6,
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
  // PICKED_UP Card Styles (New Design - matching delivered card)
  pickedUpCardNew: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    padding: 16,
    paddingBottom: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E3F2FD',
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
  pickedUpCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  pickedUpCardDate: {
    fontFamily: Poppins.regular,
    fontSize: 14,
    color: '#666666',
    flex: 1,
  },
  pickedUpCardStatus: {
    fontFamily: Poppins.semiBold,
    fontSize: 16,
    color: '#4CAF50',
    flex: 1,
    textAlign: 'center',
  },
  pickedUpCardTime: {
    fontFamily: Poppins.regular,
    fontSize: 14,
    color: '#666666',
    flex: 1,
    textAlign: 'right',
  },
  pickedUpOrderNumberNew: {
    fontFamily: Poppins.bold,
    fontSize: 24,
    color: '#000000',
    marginBottom: 8,
  },
  pickedUpOrderInfoNew: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  pickedUpOrderDetailsNew: {
    fontFamily: Poppins.regular,
    fontSize: 14,
    color: '#666666',
    flex: 1,
    marginRight: 12,
  },
  pickedUpOrderAmountNew: {
    fontFamily: Poppins.regular,
    fontSize: 14,
    color: '#666666',
  },
  pickedUpActionsNew: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'stretch',
    marginTop: 8,
    gap: 12,
  },
  deArrivingButton: {
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#666666',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    height: 48,
  },
  deArrivingButtonDisabled: {
    opacity: 0.6,
  },
  deArrivingButtonText: {
    fontFamily: Poppins.medium,
    fontSize: 14,
    color: '#666666',
    textAlign: 'center',
  },
  trackDeliveryButtonFilled: {
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#D4A574',
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    height: 48,
  },
  trackDeliveryButtonTextFilled: {
    fontFamily: Poppins.medium,
    fontSize: 14,
    color: '#FFFFFF',
    textAlign: 'center',
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
    marginLeft: 16,
  },
  deliveryStatIcon: {
    width: 24,
    height: 24,
    marginBottom: 4,
    tintColor: '#FF6E1A',
  },
  deliveryStatText: {
    fontFamily: Poppins.regular,
    fontSize: 12,
    color: '#666666',
  },
  // DELIVERED Card Styles (New Design)
  deliveredCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    padding: 16,
    paddingBottom: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E3F2FD',
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
  deliveredCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  deliveredCardDate: {
    fontFamily: Poppins.regular,
    fontSize: 14,
    color: '#666666',
    flex: 1,
  },
  deliveredCardStatus: {
    fontFamily: Poppins.semiBold,
    fontSize: 16,
    color: '#4CAF50',
    flex: 1,
    textAlign: 'center',
  },
  deliveredCardTime: {
    fontFamily: Poppins.regular,
    fontSize: 14,
    color: '#666666',
    flex: 1,
    textAlign: 'right',
  },
  deliveredOrderNumber: {
    fontFamily: Poppins.bold,
    fontSize: 24,
    color: '#000000',
    marginBottom: 8,
  },
  deliveredOrderInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  deliveredOrderDetails: {
    fontFamily: Poppins.regular,
    fontSize: 14,
    color: '#666666',
    flex: 1,
    marginRight: 12,
  },
  deliveredOrderAmount: {
    fontFamily: Poppins.regular,
    fontSize: 14,
    color: '#666666',
  },
  riderDetailsHeading: {
    fontFamily: Poppins.bold,
    fontSize: 14,
    color: '#000000',
    marginBottom: 8,
    marginTop: 4,
  },
  riderDetailsSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  riderDetailsInfo: {
    flex: 1,
    marginLeft: 12,
  },
  riderDetailsName: {
    fontFamily: Poppins.regular,
    fontSize: 14,
    color: '#666666',
    marginBottom: 4,
  },
  riderDetailsPhone: {
    fontFamily: Poppins.regular,
    fontSize: 14,
    color: '#666666',
  },
  deliveredActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  viewInvoiceButtonOutlined: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D4A574',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    marginRight: 12,
  },
  viewInvoiceButtonTextOutlined: {
    fontFamily: Poppins.medium,
    fontSize: 14,
    color: '#D4A574',
  },
  deliveryStatsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  deliveredDeliveryStatItem: {
    alignItems: 'center',
    marginLeft: 12,
  },
  deliveredDeliveryStatIcon: {
    width: 24,
    height: 24,
    marginBottom: 4,
    // tintColor: '#FF6E1A',
  },
  deliveredDeliveryStatText: {
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
  // Invoice Modal Styles
  invoiceModalContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  invoiceModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    backgroundColor: '#FFFFFF',
  },
  invoiceModalTitle: {
    fontFamily: Poppins.bold,
    fontSize: 20,
    color: '#000000',
  },
  invoiceModalCloseButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  invoiceModalCloseText: {
    fontFamily: Poppins.semiBold,
    fontSize: 16,
    color: '#FF6E1A',
  },
  invoiceWebView: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  invoiceLoadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  invoiceLoadingText: {
    fontFamily: Poppins.regular,
    fontSize: 14,
    color: '#666666',
    marginTop: 12,
  },
  invoiceErrorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  invoiceErrorText: {
    fontFamily: Poppins.regular,
    fontSize: 16,
    color: '#666666',
  },
});

export default OrdersScreen;
