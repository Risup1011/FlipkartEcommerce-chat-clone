import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  TouchableOpacity,
  Image,
  Modal,
  Alert,
  Vibration,
  Platform,
} from 'react-native';
import { Poppins, images, icons } from '../assets';
import CustomButton from './CustomButton';
import { useToast } from './ToastContext';
import OrderDetailsScreen from './OrderDetailsScreen';

// Try to import react-native-sound, but handle gracefully if not available
let Sound = null;
try {
  Sound = require('react-native-sound').default;
} catch (e) {
}

const NewOrdersScreen = ({ visible, onClose, orders = [], onAcceptOrder, onDenyOrder }) => {
  const { showToast } = useToast();
  const [localOrders, setLocalOrders] = useState(orders);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showOrderDetails, setShowOrderDetails] = useState(false);
  const soundPlayedRef = useRef(false);

  useEffect(() => {
    setLocalOrders(orders);
  }, [orders]);

  useEffect(() => {
    if (visible && orders.length > 0 && !soundPlayedRef.current) {
      // Play notification sound/vibration
      playNotificationSound();
      soundPlayedRef.current = true;
    }
    if (!visible) {
      soundPlayedRef.current = false;
    }
  }, [visible, orders.length]);

  const playNotificationSound = () => {
    
    // Always play vibration as companion
    playVibration();
    
    // Try to use native sound module first (simpler, works immediately after rebuild)
    try {
      const { NativeModules } = require('react-native');
      if (NativeModules.SoundModule) {
        NativeModules.SoundModule.playNotificationSound();
        return; // Exit early if native module works
      }
    } catch (nativeError) {
    }
    
    // Fallback to react-native-sound if native module not available
    if (!Sound) {
      return;
    }
    
    try {
      // Enable playback in silence mode (iOS)
      Sound.setCategory('Playback', true);
      
      // Try to play custom notification sound first
      const notificationSound = new Sound(
        'notification.mp3',
        Platform.OS === 'android' ? Sound.MAIN_BUNDLE : Sound.MAIN_BUNDLE,
        (error) => {
          if (error) {
            // Try system default notification sound
            playSystemDefaultSound();
            return;
          }
          
          // Play the custom sound
          notificationSound.setVolume(1.0);
          notificationSound.play((success) => {
            if (success) {
            } else {
              console.warn('⚠️ Custom sound playback failed, using system default');
              playSystemDefaultSound();
            }
            notificationSound.release();
          });
        }
      );
      
    } catch (error) {
      console.warn('⚠️ Notification sound error:', error.message || error);
      // Vibration already played, so user still gets notification
    }
  };

  const playSystemDefaultSound = () => {
    // Play system default notification sound
    if (!Sound) {
      return; // Sound library not available
    }
    
    try {
      if (Platform.OS === 'android') {
        // Android: Try to use system default notification sound
        const systemSound = new Sound(
          'android.resource://android/raw/notification',
          Sound.MAIN_BUNDLE,
          (error) => {
            if (error) {
            } else {
              systemSound.setVolume(1.0);
              systemSound.play();
              systemSound.release();
            }
          }
        );
      } else {
        // iOS: System sounds are handled differently
      }
    } catch (error) {
      console.warn('⚠️ System sound error:', error.message || error);
      // Vibration already played, so we're good
    }
  };

  const playVibration = () => {
    // Vibration as fallback/companion to sound
    try {
      if (Vibration && typeof Vibration.vibrate === 'function') {
        // Vibrate pattern: vibrate for 200ms, pause 100ms, vibrate 200ms
        Vibration.vibrate([200, 100, 200]);
      }
    } catch (vibrateError) {
      console.warn('⚠️ Vibration not available:', vibrateError.message || vibrateError);
    }
  };

  const handleAccept = (order) => {
    Alert.alert(
      'Accept Order',
      `Do you want to accept order #${order.id}?`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Accept',
          onPress: () => {
            if (onAcceptOrder) {
              onAcceptOrder(order);
            }
            setLocalOrders(prevOrders => prevOrders.filter(o => o.id !== order.id));
            showToast('Order accepted successfully', 'success');
            
            // Close screen if no more orders
            if (localOrders.length === 1) {
              setTimeout(() => {
                onClose();
              }, 500);
            }
          },
        },
      ]
    );
  };

  const handleDeny = (order) => {
    Alert.alert(
      'Deny Order',
      `Do you want to deny order #${order.id}?`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Deny',
          style: 'destructive',
          onPress: () => {
            if (onDenyOrder) {
              onDenyOrder(order);
            }
            setLocalOrders(prevOrders => prevOrders.filter(o => o.id !== order.id));
            showToast('Order denied', 'info');
            
            // Close screen if no more orders
            if (localOrders.length === 1) {
              setTimeout(() => {
                onClose();
              }, 500);
            }
          },
        },
      ]
    );
  };

  const handleCardPress = (order) => {
    setSelectedOrder(order);
    setShowOrderDetails(true);
  };

  const handleBackFromDetails = () => {
    setShowOrderDetails(false);
    setSelectedOrder(null);
  };

  const handleAcceptFromDetails = (order) => {
    handleAccept(order);
    setShowOrderDetails(false);
    setSelectedOrder(null);
  };

  const handleDenyFromDetails = (order) => {
    handleDeny(order);
    setShowOrderDetails(false);
    setSelectedOrder(null);
  };

  const renderOrderCard = ({ item: order }) => {
    return (
      <View style={styles.orderCard}>
        {/* Order Header */}
        <View style={styles.orderHeader}>
          <View style={styles.orderHeaderLeft}>
            <Image
              source={images.newOrder || icons.orders}
              style={styles.orderIcon}
              resizeMode="contain"
            />
            <View style={styles.orderInfo}>
              <Text style={styles.orderId}>Order #{order.id}</Text>
              <Text style={styles.orderTime}>{order.time || 'Just now'}</Text>
            </View>
          </View>
          <View style={styles.orderAmountContainer}>
            <Text style={styles.orderAmount}>₹{order.amount || '0'}</Text>
          </View>
        </View>

        {/* Order Details */}
        <View style={styles.orderDetails}>
          {order.customerName && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Customer:</Text>
              <Text style={styles.detailValue}>{order.customerName}</Text>
            </View>
          )}
          {order.items && order.items.length > 0 && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Items:</Text>
              <Text style={styles.detailValue}>{order.items.length} item(s)</Text>
            </View>
          )}
          {order.deliveryAddress && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Address:</Text>
              <Text style={styles.detailValue} numberOfLines={2}>
                {order.deliveryAddress}
              </Text>
            </View>
          )}
          {order.estimatedTime && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Est. Time:</Text>
              <Text style={styles.detailValue}>{order.estimatedTime} mins</Text>
            </View>
          )}
        </View>

        {/* Show More Details Button */}
        <TouchableOpacity
          style={styles.showDetailsButton}
          onPress={() => handleCardPress(order)}
          activeOpacity={0.7}
        >
          <Text style={styles.showDetailsButtonText}>Show more details</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderEmptyState = () => {
    return (
      <View style={styles.emptyState}>
        <Image
          source={icons.pan}
          style={styles.emptyStateImage}
          resizeMode="contain"
        />
        <Text style={styles.emptyStateText}>No New Orders</Text>
        <Text style={styles.emptyStateSubtext}>New orders will appear here</Text>
      </View>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Image
              source={images.newOrder || icons.orders}
              style={styles.headerIcon}
              resizeMode="contain"
            />
            <View>
              <Text style={styles.headerTitle}>New Orders</Text>
              <Text style={styles.headerSubtitle}>
                {localOrders.length} {localOrders.length === 1 ? 'order' : 'orders'} waiting
              </Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={onClose}
            activeOpacity={0.7}
          >
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
        </View>

        {/* Orders List */}
        <FlatList
          data={localOrders}
          renderItem={renderOrderCard}
          keyExtractor={(item) => item.id?.toString() || Math.random().toString()}
          contentContainerStyle={[
            styles.listContainer,
            localOrders.length === 0 && styles.emptyListContainer,
          ]}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={renderEmptyState}
        />

        {/* Order Details Screen Modal */}
        {showOrderDetails && selectedOrder && (
          <Modal
            visible={showOrderDetails}
            animationType="slide"
            transparent={false}
            onRequestClose={handleBackFromDetails}
          >
            <OrderDetailsScreen
              order={selectedOrder}
              onBack={handleBackFromDetails}
              onAccept={handleAcceptFromDetails}
              onDeny={handleDenyFromDetails}
            />
          </Modal>
        )}
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  headerIcon: {
    width: 32,
    height: 32,
    marginRight: 12,
  },
  headerTitle: {
    fontFamily: Poppins.bold,
    fontSize: 20,
    color: '#000000',
    marginBottom: 2,
  },
  headerSubtitle: {
    fontFamily: Poppins.regular,
    fontSize: 12,
    color: '#666666',
  },
  closeButton: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 16,
    backgroundColor: '#F5F5F5',
  },
  closeButtonText: {
    fontSize: 18,
    color: '#666666',
    fontWeight: 'bold',
  },
  listContainer: {
    padding: 16,
  },
  emptyListContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  orderCard: {
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
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  orderHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  orderIcon: {
    width: 40,
    height: 40,
    marginRight: 12,
  },
  orderInfo: {
    flex: 1,
  },
  orderId: {
    fontFamily: Poppins.semiBold,
    fontSize: 16,
    color: '#000000',
    marginBottom: 4,
  },
  orderTime: {
    fontFamily: Poppins.regular,
    fontSize: 12,
    color: '#666666',
  },
  orderAmountContainer: {
    backgroundColor: '#FF6E1A',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  orderAmount: {
    fontFamily: Poppins.bold,
    fontSize: 16,
    color: '#FFFFFF',
  },
  orderDetails: {
    marginBottom: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  detailRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  detailLabel: {
    fontFamily: Poppins.medium,
    fontSize: 14,
    color: '#666666',
    width: 100,
  },
  detailValue: {
    fontFamily: Poppins.regular,
    fontSize: 14,
    color: '#000000',
    flex: 1,
  },
  showDetailsButton: {
    backgroundColor: '#FF6E1A',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  showDetailsButtonText: {
    fontFamily: Poppins.semiBold,
    fontSize: 16,
    color: '#FFFFFF',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  denyButton: {
    backgroundColor: '#F5F5F5',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  acceptButton: {
    backgroundColor: '#4CAF50',
  },
  denyButtonText: {
    fontFamily: Poppins.semiBold,
    fontSize: 16,
    color: '#666666',
  },
  acceptButtonText: {
    fontFamily: Poppins.semiBold,
    fontSize: 16,
    color: '#FFFFFF',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyStateImage: {
    width: 150,
    height: 150,
    marginBottom: 20,
    opacity: 0.5,
  },
  emptyStateText: {
    fontFamily: Poppins.semiBold,
    fontSize: 20,
    color: '#000000',
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontFamily: Poppins.regular,
    fontSize: 14,
    color: '#666666',
  },
});

export default NewOrdersScreen;
