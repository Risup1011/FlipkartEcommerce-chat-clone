import React, { useState } from 'react';
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
} from 'react-native';
import { Poppins, icons } from '../assets';
import CustomButton from './CustomButton';

const OrderDetailsScreen = ({ order, onBack, onAccept, onDeny }) => {
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [estimatedTime, setEstimatedTime] = useState(order?.estimatedTime || 15);
  const [customTimeInput, setCustomTimeInput] = useState('');

  if (!order) {
    return null;
  }

  // Calculate totals
  const itemTotal = order.items?.reduce((sum, item) => sum + (item.price || 0) * (item.quantity || 1), 0) || 0;
  const packagingCharge = order.packagingCharge || 20;
  const gst = order.gst || 0;
  const totalAmount = itemTotal + packagingCharge + gst;

  // Format order ID (e.g., "#18889874916-1956")
  const formatOrderId = (id) => {
    if (!id) return { main: '#00000000000', suffix: '0000' };
    const idStr = id.toString().replace(/^#/, ''); // Remove existing # if present
    if (idStr.includes('-')) {
      const parts = idStr.split('-');
      return { main: `#${parts[0]}`, suffix: parts[1] || '0000' };
    }
    // If no dash, create one (last 4 digits after dash)
    if (idStr.length >= 4) {
      const mainPart = idStr.slice(0, -4);
      const suffix = idStr.slice(-4);
      return { main: `#${mainPart}`, suffix };
    }
    return { main: `#${idStr}`, suffix: '0000' };
  };

  const orderIdParts = formatOrderId(order.id);

  // Get current time in 12-hour format
  const getCurrentTime = () => {
    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    const displayMinutes = minutes.toString().padStart(2, '0');
    return `${displayHours}:${displayMinutes} ${ampm}`;
  };

  const handleTimeChange = (minutes) => {
    setEstimatedTime(minutes);
    setShowTimePicker(false);
    setCustomTimeInput('');
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
              {getCurrentTime()} • {order.items?.length || 0} items • ₹{totalAmount.toFixed(2)}
            </Text>
          </View>
          <View style={styles.newTag}>
            <Text style={styles.newTagText}>NEW</Text>
          </View>
        </View>
        <View style={styles.placeholder} />
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
              Order from {order.customerName || 'Customer'}
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
                {order.deliveryAddress || 'Delivery address not provided'}
              </Text>
              {order.contactNumber && (
                <Text style={styles.contactText}>
                  Contact Number: {order.contactNumber}
                </Text>
              )}
            </View>
          </View>
        </View>

        {/* Item Details Card */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Item Details</Text>
          {order.items && order.items.length > 0 ? (
            order.items.map((item, index) => (
              <View 
                key={index} 
                style={[
                  styles.itemRow,
                  index === order.items.length - 1 && styles.lastItemRow
                ]}
              >
                <View style={styles.itemLeft}>
                  <View style={[
                    styles.vegIcon,
                    (item.type === 'veg' || item.isVeg) ? styles.vegIconGreen : styles.vegIconOrange
                  ]}>
                    <Text style={styles.vegIconText}>
                      {(item.type === 'veg' || item.isVeg) ? '●' : '▲'}
                    </Text>
                  </View>
                  <View style={styles.itemInfo}>
                    <Text style={styles.itemName}>{item.name || item.itemName || 'Item'}</Text>
                    {item.category && (
                      <Text style={styles.itemCategory}>{item.category}</Text>
                    )}
                  </View>
                </View>
                <View style={styles.itemRight}>
                  <Text style={styles.itemQuantity}>x {item.quantity || 1}</Text>
                  <Text style={styles.itemPrice}>
                    ₹{((item.price || 0) * (item.quantity || 1)).toFixed(2)}
                  </Text>
                </View>
              </View>
            ))
          ) : (
            <Text style={styles.noItemsText}>No items in this order</Text>
          )}
        </View>

        {/* Bill Details Card */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Bill Details</Text>
          
          <View style={styles.billRow}>
            <Text style={styles.billLabel}>
              Item Total ({order.items?.length || 0} Items)
            </Text>
            <Text style={styles.billValue}>₹{itemTotal.toFixed(2)}</Text>
          </View>

          <View style={styles.billRow}>
            <Text style={styles.billLabel}>Packaging Charge</Text>
            <Text style={styles.billValue}>₹{packagingCharge.toFixed(2)}</Text>
          </View>

          <View style={styles.billRow}>
            <Text style={styles.billLabel}>Rx Payable GST</Text>
            <Text style={styles.billValue}>₹{gst.toFixed(2)}</Text>
          </View>

          <View style={[styles.billRow, styles.totalRow]}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>₹{totalAmount.toFixed(2)}</Text>
          </View>
        </View>
      </ScrollView>

      {/* Delivery Estimate Section - Fixed above buttons */}
      {/* <View style={styles.deliveryEstimateSection}>
        <View style={styles.deliveryCircle}>
          <View style={styles.deliveryCircleInner}>
            <Text style={styles.deliveryTimeNumber}>{estimatedTime}</Text>
            <Text style={styles.deliveryTimeLabel}>Mins</Text>
          </View>
        </View>
        <View style={styles.deliveryMessageContainer}>
          <Text style={styles.deliveryMessage}>
            Based on your past orders.{'\n'}
            Driver will arrive accordingly to{'\n'}
            the ensure on-time and fresh{'\n'}
            delivery.
          </Text>
        </View>
        <TouchableOpacity
          style={styles.changeButton}
          onPress={() => setShowTimePicker(true)}
          activeOpacity={0.7}
        >
          <Text style={styles.changeButtonText}>Change</Text>
        </TouchableOpacity>
      </View> */}

      {/* Action Buttons */}
      <View style={styles.actionButtonsContainer}>
        <TouchableOpacity
          style={[styles.actionButton, styles.outOfStockButton]}
          onPress={() => onDeny && onDeny(order)}
          activeOpacity={0.7}
        >
          <Text style={styles.outOfStockButtonText}>OUT OF STOCK?</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, styles.confirmButton]}
          onPress={() => onAccept && onAccept(order)}
          activeOpacity={0.7}
        >
          <Text style={styles.confirmButtonText}>CONFIRM NOW</Text>
        </TouchableOpacity>
      </View>

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
                {presetTimes.map((time) => (
                  <TouchableOpacity
                    key={time}
                    style={[
                      styles.presetTimeButton,
                      estimatedTime === time && styles.presetTimeButtonActive,
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
    marginBottom: 8,
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
  deliveryEstimateSection: {
    backgroundColor: '#E8F5E9',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  deliveryCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#C8E6C9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  deliveryCircleInner: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
  },
  deliveryTimeNumber: {
    fontFamily: Poppins.bold,
    fontSize: 20,
    color: '#FFFFFF',
    lineHeight: 24,
  },
  deliveryTimeLabel: {
    fontFamily: Poppins.medium,
    fontSize: 12,
    color: '#FFFFFF',
    marginTop: -2,
  },
  deliveryMessageContainer: {
    flex: 1,
    marginRight: 12,
  },
  deliveryMessage: {
    fontFamily: Poppins.regular,
    fontSize: 12,
    color: '#000000',
    lineHeight: 18,
  },
  changeButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  changeButtonText: {
    fontFamily: Poppins.semiBold,
    fontSize: 14,
    color: '#FF6E1A',
  },
  actionButtonsContainer: {
    flexDirection: 'row',
    gap: 12,
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
    gap: 12,
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
