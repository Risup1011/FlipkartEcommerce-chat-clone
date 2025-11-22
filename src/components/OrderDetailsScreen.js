import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Image,
  Modal,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { Poppins, icons } from '../assets';
import CustomButton from './CustomButton';
import { fetchWithAuth } from '../utils/apiHelpers';
import { API_BASE_URL } from '../config';
import { useToast } from './ToastContext';

const OrderDetailsScreen = ({ order, orderId, onBack, onAccept, onDeny }) => {
  const { showToast } = useToast();
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [estimatedTime, setEstimatedTime] = useState(15);
  const [customTimeInput, setCustomTimeInput] = useState('');
  const [orderData, setOrderData] = useState(order);
  const [isLoading, setIsLoading] = useState(false);
  const [isAccepting, setIsAccepting] = useState(false);

  // Fetch order details from API if orderId is provided
  useEffect(() => {
    const fetchOrderDetails = async () => {
      // Always fetch from API if orderId is available to get full pricing details
      // The order prop might not have complete pricing breakdown
      if (orderId) {
        setIsLoading(true);
        try {
          const url = `${API_BASE_URL}v1/orders/${orderId}`;
          console.log('📡 [OrderDetailsScreen] ========================================');
          console.log(`📡 [OrderDetailsScreen] FETCHING ORDER DETAILS FROM API`);
          console.log(`📡 [OrderDetailsScreen] Endpoint: /v1/orders/${orderId}`);
          console.log(`📡 [OrderDetailsScreen] Full URL: ${url}`);
          console.log('📡 [OrderDetailsScreen] ========================================');
          
          const response = await fetchWithAuth(url, {
            method: 'GET',
          });
          
          const responseData = await response.json();
          
          if (response.ok && responseData?.code === 200 && responseData.data) {
            console.log('✅ [OrderDetailsScreen] ========================================');
            console.log('✅ [OrderDetailsScreen] ORDER DETAILS FETCHED SUCCESSFULLY');
            console.log('✅ [OrderDetailsScreen] ========================================');
            console.log('📋 [OrderDetailsScreen] Order Details:');
            console.log(`  - ID: ${responseData.data.id}`);
            console.log(`  - Order Number: ${responseData.data.order_number}`);
            console.log(`  - Status: ${responseData.data.status}`);
            console.log(`  - Customer: ${responseData.data.customer_details?.name}`);
            console.log(`  - Items Count: ${responseData.data.items?.length || 0}`);
            console.log(`  - Total Amount: ₹${responseData.data.pricing?.total_amount || 0}`);
            console.log(`  - Payment Method: ${responseData.data.payment_method}`);
            console.log(`  - Payment Status: ${responseData.data.payment_status}`);
            console.log(`  - Preparation Time: ${responseData.data.preparation_time_minutes} minutes`);
            console.log(`  - Status Timeline: ${responseData.data.status_timeline?.length || 0} entries`);
            
            // Log BILL DETAILS from API response
            console.log('💰 [OrderDetailsScreen] ========================================');
            console.log('💰 [OrderDetailsScreen] BILL DETAILS FROM API');
            console.log('💰 [OrderDetailsScreen] ========================================');
            console.log('💰 [OrderDetailsScreen] Raw API Pricing Object:', JSON.stringify(responseData.data.pricing, null, 2));
            if (responseData.data.pricing) {
              console.log('💰 [OrderDetailsScreen] Item Total:', responseData.data.pricing.item_total);
              console.log('💰 [OrderDetailsScreen] Packaging Charge:', responseData.data.pricing.packaging_charge);
              console.log('💰 [OrderDetailsScreen] Delivery Charge:', responseData.data.pricing.delivery_charge);
              console.log('💰 [OrderDetailsScreen] GST Amount:', responseData.data.pricing.gst_amount);
              console.log('💰 [OrderDetailsScreen] Discount Amount:', responseData.data.pricing.discount_amount);
              console.log('💰 [OrderDetailsScreen] Total Amount:', responseData.data.pricing.total_amount);
            } else {
              console.warn('⚠️ [OrderDetailsScreen] No pricing object in API response!');
            }
            console.log('💰 [OrderDetailsScreen] ========================================');
            
            const transformedOrder = transformApiOrder(responseData.data);
            console.log('✅ [OrderDetailsScreen] Order transformed successfully');
            
            // Log transformed bill details
            console.log('💰 [OrderDetailsScreen] ========================================');
            console.log('💰 [OrderDetailsScreen] TRANSFORMED BILL DETAILS');
            console.log('💰 [OrderDetailsScreen] ========================================');
            console.log('💰 [OrderDetailsScreen] Transformed Order Pricing:');
            console.log(`  - itemTotal: ₹${transformedOrder.itemTotal || 0}`);
            console.log(`  - packagingCharge: ₹${transformedOrder.packagingCharge || 0}`);
            console.log(`  - deliveryCharge: ₹${transformedOrder.deliveryCharge || 0}`);
            console.log(`  - gst: ₹${transformedOrder.gst || 0}`);
            console.log(`  - discountAmount: ₹${transformedOrder.discountAmount || 0}`);
            console.log(`  - totalAmount: ₹${transformedOrder.totalAmount || 0}`);
            console.log('💰 [OrderDetailsScreen] ========================================');
            
            setOrderData(transformedOrder);
            setEstimatedTime(transformedOrder.preparationTimeMinutes || 15);
          } else {
            console.error('❌ [OrderDetailsScreen] ========================================');
            console.error(`❌ [OrderDetailsScreen] Failed to fetch order details:`, response.status);
            console.error(`❌ [OrderDetailsScreen] Response:`, JSON.stringify(responseData, null, 2));
            console.error('❌ [OrderDetailsScreen] ========================================');
            // Fallback to provided order if API fails
            if (order) {
              console.warn('⚠️ [OrderDetailsScreen] Falling back to provided order data');
              setOrderData(order);
              setEstimatedTime(order?.preparationTimeMinutes || order?.estimatedTime || 15);
            } else {
              showToast('Failed to load order details', 'error');
              if (onBack) onBack();
            }
          }
        } catch (error) {
          console.error('❌ [OrderDetailsScreen] ========================================');
          console.error(`❌ [OrderDetailsScreen] Error fetching order details:`, error);
          console.error(`❌ [OrderDetailsScreen] Error message:`, error.message);
          console.error('❌ [OrderDetailsScreen] ========================================');
          // Fallback to provided order if API fails
          if (order) {
            console.warn('⚠️ [OrderDetailsScreen] Falling back to provided order data due to error');
            setOrderData(order);
            setEstimatedTime(order?.preparationTimeMinutes || order?.estimatedTime || 15);
          } else {
            showToast('Error loading order details', 'error');
            if (onBack) onBack();
          }
        } finally {
          setIsLoading(false);
        }
      } else if (order) {
        // Only use provided order if orderId is not available
        console.log('📋 [OrderDetailsScreen] Using provided order data (orderId not available)');
        console.log('💰 [OrderDetailsScreen] ========================================');
        console.log('💰 [OrderDetailsScreen] BILL DETAILS FROM PROVIDED ORDER');
        console.log('💰 [OrderDetailsScreen] ========================================');
        console.log('💰 [OrderDetailsScreen] Provided Order Pricing:');
        console.log(`  - itemTotal: ₹${order.itemTotal || 0}`);
        console.log(`  - packagingCharge: ₹${order.packagingCharge || 0}`);
        console.log(`  - deliveryCharge: ₹${order.deliveryCharge || 0}`);
        console.log(`  - gst: ₹${order.gst || 0}`);
        console.log(`  - discountAmount: ₹${order.discountAmount || 0}`);
        console.log(`  - totalAmount: ₹${order.totalAmount || order.amount || 0}`);
        console.log('💰 [OrderDetailsScreen] Full order object:', JSON.stringify(order, null, 2));
        console.log('💰 [OrderDetailsScreen] ========================================');
        setOrderData(order);
        setEstimatedTime(order?.preparationTimeMinutes || order?.estimatedTime || 15);
      }
    };

    fetchOrderDetails();
  }, [orderId, order]);

  // Transform API order response to UI format
  const transformApiOrder = (apiOrder) => {
    // Format delivery address
    const formatAddress = (address) => {
      if (!address) return 'Address not available';
      const parts = [];
      if (address.address_line1) parts.push(address.address_line1);
      if (address.address_line2) parts.push(address.address_line2);
      if (address.landmark) parts.push(address.landmark);
      if (address.city) parts.push(address.city);
      if (address.state) parts.push(address.state);
      if (address.pincode) parts.push(address.pincode);
      return parts.join(', ');
    };

    // Transform items
    const transformedItems = (apiOrder.items || []).map(item => ({
      id: item.menu_item_id,
      name: item.item_name,
      type: item.item_type === 'VEG' ? 'veg' : 'non-veg',
      isVeg: item.item_type === 'VEG',
      quantity: item.quantity || 1,
      basePrice: item.base_price || 0,
      variant: item.selected_variant,
      addons: item.selected_addons || [],
      itemTotal: item.item_total || 0,
      specialInstructions: item.special_instructions,
      // For display
      price: item.item_total || 0,
      category: item.variant?.variant_name || '',
      // Price breakdown
      priceBreakdown: item.price_breakdown || null,
    }));

    const transformedOrder = {
      id: apiOrder.id,
      orderNumber: apiOrder.order_number,
      status: apiOrder.status,
      statusDisplay: apiOrder.status_display,
      customerName: apiOrder.customer_details?.name || 'Customer',
      customerPhone: apiOrder.customer_details?.phone || '',
      contactNumber: apiOrder.customer_details?.phone || '',
      email: apiOrder.customer_details?.email || '',
      customerId: apiOrder.customer_id,
      partnerId: apiOrder.partner_id,
      deliveryAddress: formatAddress(apiOrder.delivery_address),
      deliveryAddressDetails: apiOrder.delivery_address, // Keep full address object
      items: transformedItems,
      itemTotal: apiOrder.pricing?.item_total || 0,
      packagingCharge: apiOrder.pricing?.packaging_charge || 0,
      deliveryCharge: apiOrder.pricing?.delivery_charge || 0,
      gst: apiOrder.pricing?.gst_amount || 0,
      discountAmount: apiOrder.pricing?.discount_amount || 0,
      totalAmount: apiOrder.pricing?.total_amount || 0,
      preparationTimeMinutes: apiOrder.preparation_time_minutes,
      estimatedReadyTime: apiOrder.estimated_ready_time,
      paymentMethod: apiOrder.payment_method,
      paymentStatus: apiOrder.payment_status,
      specialInstructions: apiOrder.special_instructions,
      rejectionReason: apiOrder.rejection_reason,
      statusTimeline: apiOrder.status_timeline || [],
      createdAt: apiOrder.created_at,
      updatedAt: apiOrder.updated_at,
      acceptedAt: apiOrder.accepted_at,
      readyAt: apiOrder.ready_at,
      pickedUpAt: apiOrder.picked_up_at,
      deliveredAt: apiOrder.delivered_at,
      riderDetails: apiOrder.rider_details,
      isAssignedToRider: apiOrder.is_assigned_to_rider,
    };
    
    // Log transformation details for pricing
    console.log('💰 [OrderDetailsScreen] ========================================');
    console.log('💰 [OrderDetailsScreen] TRANSFORMING PRICING DATA');
    console.log('💰 [OrderDetailsScreen] ========================================');
    console.log('💰 [OrderDetailsScreen] API Pricing Object:', JSON.stringify(apiOrder.pricing, null, 2));
    console.log('💰 [OrderDetailsScreen] Transformed Pricing Values:');
    console.log(`  - itemTotal: ${apiOrder.pricing?.item_total} → ${transformedOrder.itemTotal}`);
    console.log(`  - packagingCharge: ${apiOrder.pricing?.packaging_charge} → ${transformedOrder.packagingCharge}`);
    console.log(`  - deliveryCharge: ${apiOrder.pricing?.delivery_charge} → ${transformedOrder.deliveryCharge}`);
    console.log(`  - gst: ${apiOrder.pricing?.gst_amount} → ${transformedOrder.gst}`);
    console.log(`  - discountAmount: ${apiOrder.pricing?.discount_amount} → ${transformedOrder.discountAmount}`);
    console.log(`  - totalAmount: ${apiOrder.pricing?.total_amount} → ${transformedOrder.totalAmount}`);
    console.log('💰 [OrderDetailsScreen] ========================================');
    
    return transformedOrder;
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF6E1A" />
          <Text style={styles.loadingText}>Loading order details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!orderData) {
    return null;
  }

  // Calculate totals from orderData
  const itemTotal = orderData.itemTotal || orderData.items?.reduce((sum, item) => sum + (item.itemTotal || item.price || 0), 0) || 0;
  const packagingCharge = orderData.packagingCharge || 0;
  const gst = orderData.gst || 0;
  const totalAmount = orderData.totalAmount || (itemTotal + packagingCharge + gst);
  
  // Log calculated bill details for rendering
  console.log('💰 [OrderDetailsScreen] ========================================');
  console.log('💰 [OrderDetailsScreen] CALCULATED BILL DETAILS FOR RENDERING');
  console.log('💰 [OrderDetailsScreen] ========================================');
  console.log('💰 [OrderDetailsScreen] orderData.itemTotal:', orderData.itemTotal);
  console.log('💰 [OrderDetailsScreen] orderData.packagingCharge:', orderData.packagingCharge);
  console.log('💰 [OrderDetailsScreen] orderData.deliveryCharge:', orderData.deliveryCharge);
  console.log('💰 [OrderDetailsScreen] orderData.gst:', orderData.gst);
  console.log('💰 [OrderDetailsScreen] orderData.discountAmount:', orderData.discountAmount);
  console.log('💰 [OrderDetailsScreen] orderData.totalAmount:', orderData.totalAmount);
  console.log('💰 [OrderDetailsScreen] Calculated itemTotal:', itemTotal);
  console.log('💰 [OrderDetailsScreen] Calculated packagingCharge:', packagingCharge);
  console.log('💰 [OrderDetailsScreen] Calculated gst:', gst);
  console.log('💰 [OrderDetailsScreen] Calculated totalAmount:', totalAmount);
  console.log('💰 [OrderDetailsScreen] Items count:', orderData.items?.length || 0);
  console.log('💰 [OrderDetailsScreen] ========================================');

  // Format order ID (e.g., "#18889874916-1956")
  const formatOrderId = (orderNumber) => {
    if (!orderNumber) {
      // Fallback to order ID if orderNumber not available
      const id = order.id?.toString() || '';
      if (id.includes('-')) {
        const parts = id.split('-');
        return { main: `#${parts[0]}`, suffix: parts[1] || '0000' };
      }
      return { main: `#${id}`, suffix: '0000' };
    }
    const orderNumStr = orderNumber.toString().replace(/^#/, '');
    if (orderNumStr.includes('-')) {
      const parts = orderNumStr.split('-');
      return { main: `#${parts[0]}`, suffix: parts[1] || '0000' };
    }
    // If no dash, try to split last 4 digits
    if (orderNumStr.length >= 4) {
      const mainPart = orderNumStr.slice(0, -4);
      const suffix = orderNumStr.slice(-4);
      return { main: `#${mainPart}`, suffix };
    }
    return { main: `#${orderNumStr}`, suffix: '0000' };
  };

  const orderIdParts = formatOrderId(orderData.orderNumber);

  // Format time from created_at (HH:MM AM/PM)
  const formatTime = (dateString) => {
    if (!dateString) {
      const now = new Date();
      const hours = now.getHours();
      const minutes = now.getMinutes();
      const ampm = hours >= 12 ? 'PM' : 'AM';
      const displayHours = hours % 12 || 12;
      const displayMinutes = minutes.toString().padStart(2, '0');
      return `${displayHours}:${displayMinutes} ${ampm}`;
    }
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

  const orderTime = formatTime(orderData.createdAt);

  const handleTimeChange = (minutes) => {
    setEstimatedTime(minutes);
    setShowTimePicker(false);
    setCustomTimeInput('');
  };

  // Handle accept order API call
  const handleAcceptOrder = async () => {
    if (!orderData || !orderData.id) {
      showToast('Order ID not available', 'error');
      return;
    }

    setIsAccepting(true);
    try {
      const url = `${API_BASE_URL}v1/orders/${orderData.id}/accept`;
      console.log(`📡 [OrderDetailsScreen] Accepting order: ${orderData.id}`);
      console.log(`📡 [OrderDetailsScreen] Preparation time: ${estimatedTime} minutes`);

      const response = await fetchWithAuth(url, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          preparation_time_minutes: estimatedTime,
          remarks: `Order accepted. Will be ready in ${estimatedTime} minutes`,
        }),
      });

      const responseData = await response.json();

      if (response.ok && responseData?.code === 200) {
        console.log(`✅ [OrderDetailsScreen] Order accepted successfully`);
        showToast('Order accepted successfully', 'success');
        
        // Update order data with the response
        if (responseData.data) {
          const transformedOrder = transformApiOrder(responseData.data);
          setOrderData(transformedOrder);
        }

        // Call parent's onAccept callback if provided
        if (onAccept) {
          onAccept(orderData);
        }

        // Close the screen after a short delay
        setTimeout(() => {
          if (onBack) {
            onBack();
          }
        }, 1500);
      } else {
        console.error(`❌ [OrderDetailsScreen] Failed to accept order:`, response.status, responseData);
        const errorMessage = responseData?.message || 'Failed to accept order';
        showToast(errorMessage, 'error');
      }
    } catch (error) {
      console.error(`❌ [OrderDetailsScreen] Error accepting order:`, error);
      showToast('Error accepting order. Please try again.', 'error');
    } finally {
      setIsAccepting(false);
    }
  };

  const handleCustomTimeSubmit = () => {
    const minutes = parseInt(customTimeInput, 10);
    if (!isNaN(minutes) && minutes > 0 && minutes <= 300) {
      handleTimeChange(minutes);
    }
  };

  const presetTimes = [15, 20, 25, 30, 45, 60, 90, 120];

  // Get veg/non-veg icon based on item type
  const getItemIcon = (itemType) => {
    // itemType can be 'veg', 'non-veg', or you can determine from item properties
    if (itemType === 'veg' || itemType === 'vegetarian') {
      return '🟢'; // Green circle for veg
    } else {
      return '🔴'; // Red/orange for non-veg
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={onBack}
          activeOpacity={0.7}
        >
          <Image
            source={icons.backArrow}
            style={styles.backIcon}
            resizeMode="contain"
          />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <View style={styles.orderIdContainer}>
            <Text style={styles.orderIdMain}>
              {orderIdParts.main}
            </Text>
            <Text style={styles.orderIdSuffix}>
              -{orderIdParts.suffix}
            </Text>
          </View>
          <View style={styles.headerInfo}>
            <Text style={styles.headerInfoText}>
              {orderTime} | {orderData.items?.length || 0} items for ₹{totalAmount.toFixed(2)}
            </Text>
          </View>
        </View>
        <View style={styles.newTag}>
          <Text style={styles.newTagText}>{orderData.statusDisplay || orderData.status || 'NEW'}</Text>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Orderer Information Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.userIconContainer}>
              <Text style={styles.userIcon}>👤</Text>
            </View>
            <Text style={styles.ordererText}>
              Order from {orderData.customerName || 'Customer'}
            </Text>
          </View>
        </View>

        {/* Delivery Address Card */}
        <View style={styles.card}>
          <View style={styles.addressHeader}>
            <Image
              source={icons.location}
              style={styles.locationIcon}
              resizeMode="contain"
            />
            <View style={styles.addressContent}>
              <Text style={styles.addressText}>
                {orderData.deliveryAddress || 'Delivery address not provided'}
              </Text>
              {orderData.contactNumber && (
                <Text style={styles.contactText}>
                  Contact Number: {orderData.contactNumber}
                </Text>
              )}
            </View>
          </View>
        </View>

        {/* Item Details Card */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Item Details</Text>
          {orderData.items && orderData.items.length > 0 ? (
            orderData.items.map((item, index) => {
              // Build item description with variant and addons
              // Support multiple formats: item.variant, item.selected_variant, item.variant_name
              let variantText = '';
              if (item.variant) {
                // Format: { variant_name: "...", option_name: "..." }
                variantText = item.variant.option_name || item.variant.variant_name || '';
              } else if (item.selected_variant) {
                variantText = item.selected_variant.option_name || item.selected_variant.variant_name || '';
              } else if (item.variant_name) {
                variantText = item.variant_name;
              }
              
              // Support multiple formats: item.addons, item.selected_addons
              const addons = item.addons || item.selected_addons || [];
              const addonsText = addons.length > 0 
                ? addons.map(a => a.addon_name || a.name || a).join(', ')
                : '';
              
              // Show variant/option name below product name
              const optionText = variantText || '';
              const addonsDisplayText = addonsText || '';

              // Get price breakdown if available
              const priceBreakdown = item.priceBreakdown || item.price_breakdown;

              return (
                <View 
                  key={item.id || item.menu_item_id || index} 
                  style={[
                    styles.itemRow,
                    index === orderData.items.length - 1 && styles.lastItemRow
                  ]}
                >
                  <View style={styles.itemLeft}>
                    <Image
                      source={(item.type === 'veg' || item.isVeg || item.item_type === 'VEG') ? icons.veg : icons.nonVeg}
                      style={styles.vegIconImage}
                      resizeMode="contain"
                    />
                    <View style={styles.itemInfo}>
                      <Text style={styles.itemName}>{item.name || item.item_name || 'Item'}</Text>
                      {/* Show option/variant name below product name */}
                      {optionText ? (
                        <Text style={styles.itemOption}>{optionText}</Text>
                      ) : null}
                      {/* Show addons if available */}
                      {addonsDisplayText ? (
                        <Text style={styles.itemCategory}>{addonsDisplayText}</Text>
                      ) : null}
                      {item.specialInstructions && (
                        <Text style={styles.specialInstructions}>Note: {item.specialInstructions}</Text>
                      )}
                      {/* Price Breakdown */}
                      {priceBreakdown && (
                        <View style={styles.priceBreakdownContainer}>
                          <View style={styles.priceBreakdownRow}>
                            <Text style={styles.priceBreakdownLabel}>Item Price:</Text>
                            <Text style={styles.priceBreakdownValue}>₹{priceBreakdown.item_price?.toFixed(2) || '0.00'}</Text>
                          </View>
                          {priceBreakdown.addons_total_price > 0 && (
                            <View style={styles.priceBreakdownRow}>
                              <Text style={styles.priceBreakdownLabel}>Addons:</Text>
                              <Text style={styles.priceBreakdownValue}>₹{priceBreakdown.addons_total_price?.toFixed(2) || '0.00'}</Text>
                            </View>
                          )}
                          <View style={styles.priceBreakdownRow}>
                            <Text style={styles.priceBreakdownLabel}>Subtotal:</Text>
                            <Text style={styles.priceBreakdownValue}>₹{priceBreakdown.subtotal?.toFixed(2) || '0.00'}</Text>
                          </View>
                          {priceBreakdown.quantity > 1 && (
                            <View style={styles.priceBreakdownRow}>
                              <Text style={styles.priceBreakdownLabel}>Qty:</Text>
                              <Text style={styles.priceBreakdownValue}>x{priceBreakdown.quantity}</Text>
                            </View>
                          )}
                          <View style={[styles.priceBreakdownRow, styles.priceBreakdownTotal]}>
                            <Text style={styles.priceBreakdownTotalLabel}>Total:</Text>
                            <Text style={styles.priceBreakdownTotalValue}>₹{priceBreakdown.total_price?.toFixed(2) || '0.00'}</Text>
                          </View>
                        </View>
                      )}
                    </View>
                  </View>
                  <View style={styles.itemRight}>
                    <Text style={styles.itemQuantity}>x {item.quantity || 1}</Text>
                    <Text style={styles.itemPrice}>
                      ₹{(item.itemTotal || item.price || 0).toFixed(2)}
                    </Text>
                  </View>
                </View>
              );
            })
          ) : (
            <Text style={styles.noItemsText}>No items in this order</Text>
          )}
        </View>

        {/* Bill Details Card */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Bill Details</Text>
          
          <View style={styles.billRow}>
            <Text style={styles.billLabel}>
              Item Total ({orderData.items?.length || 0} Items)
            </Text>
            <Text style={styles.billValue}>₹{itemTotal.toFixed(2)}</Text>
          </View>

          {orderData.deliveryCharge > 0 && (
            <View style={styles.billRow}>
              <Text style={styles.billLabel}>Delivery Charge</Text>
              <Text style={styles.billValue}>₹{orderData.deliveryCharge.toFixed(2)}</Text>
            </View>
          )}

          <View style={styles.billRow}>
            <Text style={styles.billLabel}>Packaging Charge</Text>
            <Text style={styles.billValue}>₹{packagingCharge.toFixed(2)}</Text>
          </View>

          <View style={styles.billRow}>
            <Text style={styles.billLabel}>Rx Payable GST</Text>
            <Text style={styles.billValue}>₹{gst.toFixed(2)}</Text>
          </View>

          {orderData.discountAmount > 0 && (
            <View style={styles.billRow}>
              <Text style={styles.billLabel}>Discount</Text>
              <Text style={[styles.billValue, { color: '#4CAF50' }]}>-₹{orderData.discountAmount.toFixed(2)}</Text>
            </View>
          )}

          <View style={[styles.billRow, styles.totalRow]}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>₹{totalAmount.toFixed(2)}</Text>
          </View>
        </View>
      </ScrollView>

      {/* Action Buttons - Only show for NEW orders */}
      {orderData.status === 'NEW' && (
        <View style={styles.actionButtonsContainer}>
          <TouchableOpacity
            style={[styles.actionButton, styles.outOfStockButton]}
            onPress={() => onDeny && onDeny(orderData)}
            activeOpacity={0.7}
            disabled={isAccepting}
          >
            <Text style={styles.outOfStockButtonText}>OUT OF STOCK?</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.actionButton,
              styles.confirmButton,
              { marginLeft: 12 },
              isAccepting && styles.confirmButtonDisabled
            ]}
            onPress={handleAcceptOrder}
            activeOpacity={0.7}
            disabled={isAccepting}
          >
            {isAccepting ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.confirmButtonText}>CONFIRM NOW</Text>
            )}
          </TouchableOpacity>
        </View>
      )}

      {/* Time Picker Modal */}
      <Modal
        visible={showTimePicker}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowTimePicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.timePickerModal}>
            <View style={styles.timePickerHeader}>
              <Text style={styles.timePickerTitle}>Set Preparation Time</Text>
              <TouchableOpacity
                onPress={() => setShowTimePicker(false)}
                style={styles.closeModalButton}
              >
                <Text style={styles.closeModalText}>✕</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.presetTimesContainer}>
              <Text style={styles.presetTimesLabel}>Quick Select (Minutes)</Text>
              <View style={styles.presetTimesGrid}>
                {presetTimes.map((time, index) => (
                  <TouchableOpacity
                    key={time}
                    style={[
                      styles.presetTimeButton,
                      estimatedTime === time && styles.presetTimeButtonActive,
                      index > 0 && { marginLeft: 12 },
                      index >= 4 && { marginTop: 12 },
                    ]}
                    onPress={() => handleTimeChange(time)}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.presetTimeText,
                        estimatedTime === time && styles.presetTimeTextActive,
                      ]}
                    >
                      {time}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.customTimeContainer}>
              <Text style={styles.customTimeLabel}>Or Enter Custom Time (Minutes)</Text>
              <View style={styles.customTimeInputContainer}>
                <TextInput
                  style={styles.customTimeInput}
                  placeholder="Enter minutes (1-300)"
                  placeholderTextColor="#999"
                  keyboardType="number-pad"
                  value={customTimeInput}
                  onChangeText={setCustomTimeInput}
                  maxLength={3}
                />
                <TouchableOpacity
                  style={[
                    styles.submitCustomTimeButton,
                    { marginLeft: 12 },
                    (!customTimeInput || isNaN(parseInt(customTimeInput, 10)) || parseInt(customTimeInput, 10) <= 0 || parseInt(customTimeInput, 10) > 300) && styles.submitCustomTimeButtonDisabled,
                  ]}
                  onPress={handleCustomTimeSubmit}
                  disabled={!customTimeInput || isNaN(parseInt(customTimeInput, 10)) || parseInt(customTimeInput, 10) <= 0 || parseInt(customTimeInput, 10) > 300}
                  activeOpacity={0.7}
                >
                  <Text style={styles.submitCustomTimeText}>Set</Text>
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setShowTimePicker(false)}
              activeOpacity={0.7}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  backButton: {
    padding: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 4,
  },
  backIcon: {
    width: 24,
    height: 24,
  },
  headerContent: {
    flex: 1,
    marginLeft: 12,
  },
  orderIdContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 4,
  },
  orderIdMain: {
    fontFamily: Poppins.semiBold,
    fontSize: 18,
    color: '#000000',
  },
  orderIdSuffix: {
    fontFamily: Poppins.semiBold,
    fontSize: 18,
    color: '#4CAF50',
  },
  headerInfo: {
    marginBottom: 2,
  },
  headerInfoText: {
    fontFamily: Poppins.regular,
    fontSize: 12,
    color: '#666666',
  },
  newTag: {
    alignSelf: 'flex-start',
    backgroundColor: '#4CAF50',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  newTagText: {
    fontFamily: Poppins.semiBold,
    fontSize: 12,
    color: '#FFFFFF',
  },
  placeholder: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 20,
  },
  card: {
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
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  userIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  userIcon: {
    fontSize: 20,
  },
  ordererText: {
    fontFamily: Poppins.semiBold,
    fontSize: 16,
    color: '#000000',
  },
  addressHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  locationIcon: {
    width: 24,
    height: 24,
    marginRight: 12,
    marginTop: 2,
  },
  addressContent: {
    flex: 1,
  },
  addressText: {
    fontFamily: Poppins.regular,
    fontSize: 14,
    color: '#000000',
    lineHeight: 20,
    marginBottom: 8,
  },
  contactText: {
    fontFamily: Poppins.regular,
    fontSize: 14,
    color: '#666666',
  },
  sectionTitle: {
    fontFamily: Poppins.semiBold,
    fontSize: 16,
    color: '#000000',
    marginBottom: 16,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  lastItemRow: {
    borderBottomWidth: 0,
    marginBottom: 0,
    paddingBottom: 0,
  },
  itemLeft: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flex: 1,
  },
  vegIcon: {
    width: 20,
    height: 20,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    marginTop: 2,
  },
  vegIconImage: {
    width: 20,
    height: 20,
    marginRight: 12,
    marginTop: 2,
  },
  vegIconGreen: {
    backgroundColor: '#4CAF50',
  },
  vegIconOrange: {
    backgroundColor: '#FF6E1A',
  },
  vegIconText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontFamily: Poppins.medium,
    fontSize: 15,
    color: '#000000',
    marginBottom: 4,
  },
  itemOption: {
    fontFamily: Poppins.regular,
    fontSize: 13,
    color: '#666666',
    marginBottom: 2,
    fontStyle: 'italic',
  },
  itemCategory: {
    fontFamily: Poppins.regular,
    fontSize: 12,
    color: '#666666',
  },
  itemRight: {
    alignItems: 'flex-end',
  },
  itemQuantity: {
    fontFamily: Poppins.medium,
    fontSize: 14,
    color: '#000000',
    marginBottom: 4,
  },
  itemPrice: {
    fontFamily: Poppins.regular,
    fontSize: 12,
    color: '#666666',
  },
  priceBreakdownContainer: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  priceBreakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  priceBreakdownLabel: {
    fontFamily: Poppins.regular,
    fontSize: 11,
    color: '#666666',
  },
  priceBreakdownValue: {
    fontFamily: Poppins.regular,
    fontSize: 11,
    color: '#666666',
  },
  priceBreakdownTotal: {
    marginTop: 4,
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  priceBreakdownTotalLabel: {
    fontFamily: Poppins.semiBold,
    fontSize: 12,
    color: '#000000',
  },
  priceBreakdownTotalValue: {
    fontFamily: Poppins.semiBold,
    fontSize: 12,
    color: '#000000',
  },
  noItemsText: {
    fontFamily: Poppins.regular,
    fontSize: 14,
    color: '#666666',
    textAlign: 'center',
    paddingVertical: 20,
  },
  billRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  billLabel: {
    fontFamily: Poppins.regular,
    fontSize: 14,
    color: '#000000',
  },
  billValue: {
    fontFamily: Poppins.medium,
    fontSize: 14,
    color: '#000000',
  },
  totalRow: {
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  totalLabel: {
    fontFamily: Poppins.semiBold,
    fontSize: 16,
    color: '#000000',
  },
  totalValue: {
    fontFamily: Poppins.bold,
    fontSize: 18,
    color: '#000000',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontFamily: Poppins.regular,
    fontSize: 14,
    color: '#666666',
    marginTop: 12,
  },
  specialInstructions: {
    fontFamily: Poppins.regular,
    fontSize: 12,
    color: '#FF6E1A',
    fontStyle: 'italic',
    marginTop: 4,
  },
  actionButtonsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  actionButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  outOfStockButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  confirmButton: {
    backgroundColor: '#4CAF50',
  },
  confirmButtonDisabled: {
    backgroundColor: '#A5D6A7',
    opacity: 0.7,
  },
  outOfStockButtonText: {
    fontFamily: Poppins.semiBold,
    fontSize: 14,
    color: '#000000',
    letterSpacing: 0.5,
  },
  confirmButtonText: {
    fontFamily: Poppins.semiBold,
    fontSize: 14,
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  timePickerModal: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 40,
    maxHeight: '80%',
  },
  timePickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  timePickerTitle: {
    fontFamily: Poppins.bold,
    fontSize: 20,
    color: '#000000',
  },
  closeModalButton: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 16,
    backgroundColor: '#F5F5F5',
  },
  closeModalText: {
    fontSize: 18,
    color: '#666666',
    fontWeight: 'bold',
  },
  presetTimesContainer: {
    marginBottom: 24,
  },
  presetTimesLabel: {
    fontFamily: Poppins.semiBold,
    fontSize: 16,
    color: '#000000',
    marginBottom: 12,
  },
  presetTimesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  presetTimeButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#F5F5F5',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    minWidth: 70,
    alignItems: 'center',
  },
  presetTimeButtonActive: {
    backgroundColor: '#4CAF50',
    borderColor: '#4CAF50',
  },
  presetTimeText: {
    fontFamily: Poppins.semiBold,
    fontSize: 16,
    color: '#000000',
  },
  presetTimeTextActive: {
    color: '#FFFFFF',
  },
  customTimeContainer: {
    marginBottom: 24,
  },
  customTimeLabel: {
    fontFamily: Poppins.semiBold,
    fontSize: 16,
    color: '#000000',
    marginBottom: 12,
  },
  customTimeInputContainer: {
    flexDirection: 'row',
  },
  customTimeInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontFamily: Poppins.regular,
    fontSize: 16,
    color: '#000000',
    backgroundColor: '#FFFFFF',
  },
  submitCustomTimeButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
  },
  submitCustomTimeButtonDisabled: {
    backgroundColor: '#E0E0E0',
  },
  submitCustomTimeText: {
    fontFamily: Poppins.semiBold,
    fontSize: 16,
    color: '#FFFFFF',
  },
  cancelButton: {
    paddingVertical: 14,
    borderRadius: 8,
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  cancelButtonText: {
    fontFamily: Poppins.semiBold,
    fontSize: 16,
    color: '#666666',
  },
});

export default OrderDetailsScreen;
