import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  Switch,
  Image,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Poppins, icons } from '../assets';
import CustomHeader from './CustomHeader';
import CustomButton from './CustomButton';
import CustomBottomSheet from './CustomBottomSheet';
import { useToast } from './ToastContext';
import { fetchWithAuth } from '../utils/apiHelpers';
import { API_BASE_URL } from '../config';

const OutletTimingsScreen = ({ onBack, configData, onNavigate }) => {
  const { showToast } = useToast();
  const [timings, setTimings] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [editingDay, setEditingDay] = useState(null);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [isOpen, setIsOpen] = useState(true);
  const [slots, setSlots] = useState([]);
  const [showTimePicker, setShowTimePicker] = useState({ slotIndex: null, type: null });
  const [isSaving, setIsSaving] = useState(false);
  const [activeBottomTab, setActiveBottomTab] = useState('more');

  // Get days from backend timings data (dynamic)
  const getDaysFromTimings = () => {
    if (!timings?.timings || !Array.isArray(timings.timings)) {
      return [];
    }
    return timings.timings.map(t => t.day).filter(Boolean);
  };

  // Get day labels from config or use fallback
  const getDayLabel = (day) => {
    // Try to get from config first
    if (configData?.outlet_timings_labels?.[day]) {
      return configData.outlet_timings_labels[day];
    }
    
    // Fallback to formatted day name
    if (day) {
      return day.charAt(0) + day.slice(1).toLowerCase();
    }
    
    return day || '';
  };

  // Get UI labels from config with fallbacks
  const getUILabel = (key, fallback) => {
    return configData?.outlet_timings_labels?.[key] || 
           configData?.ui_labels?.[key] || 
           fallback;
  };

  useEffect(() => {
    fetchOutletTimings();
  }, []);

  const fetchOutletTimings = async () => {
    try {
      setIsLoading(true);
      const url = `${API_BASE_URL}v1/outlet/timings`;

      const response = await fetchWithAuth(url, {
        method: 'GET',
      });

      const data = await response.json();

      if (response.ok && data.code === 200 && data.status === 'success') {
        setTimings(data.data);
      } else {
        console.error('❌ [OutletTimingsScreen] Failed to fetch timings:', data.message);
        const errorMessage = data.message || getUILabel('load_timings_error', 'Failed to load outlet timings');
        showToast(errorMessage, 'error');
      }
    } catch (error) {
      console.error('❌ [OutletTimingsScreen] Error fetching timings:', error);
      const errorMessage = getUILabel('load_timings_error', 'Failed to load outlet timings');
      showToast(errorMessage, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const formatTime = (time) => {
    if (!time) return '';
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours, 10);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  const handleEdit = (day) => {
    const dayTiming = getDayTiming(day);
    
    // Get default slot times from config or use fallback
    const defaultOpenTime = configData?.outlet_timings_config?.default_open_time || '11:00';
    const defaultCloseTime = configData?.outlet_timings_config?.default_close_time || '23:00';
    
    if (dayTiming) {
      setIsOpen(dayTiming.is_open ?? true);
      setSlots(dayTiming.slots && dayTiming.slots.length > 0 
        ? dayTiming.slots.map(slot => ({ ...slot }))
        : [{ open_time: defaultOpenTime, close_time: defaultCloseTime }]
      );
    } else {
      setIsOpen(true);
      setSlots([{ open_time: defaultOpenTime, close_time: defaultCloseTime }]);
    }
    
    setEditingDay(day);
    setEditModalVisible(true);
  };

  const handleCloseModal = () => {
    setEditModalVisible(false);
    setEditingDay(null);
    setShowTimePicker({ slotIndex: null, type: null });
  };

  const handleTimeChange = (event, selectedTime, slotIndex, type) => {
    if (Platform.OS === 'android') {
      setShowTimePicker({ slotIndex: null, type: null });
    }
    
    if (event.type === 'set' && selectedTime) {
      const hours = selectedTime.getHours().toString().padStart(2, '0');
      const minutes = selectedTime.getMinutes().toString().padStart(2, '0');
      const timeString = `${hours}:${minutes}`;
      
      setSlots(prevSlots => 
        prevSlots.map((slot, index) => 
          index === slotIndex 
            ? { ...slot, [type === 'open' ? 'open_time' : 'close_time']: timeString }
            : slot
        )
      );
    } else if (Platform.OS === 'android' && event.type === 'dismissed') {
      setShowTimePicker({ slotIndex: null, type: null });
    }
  };

  const handleAddSlot = () => {
    // Get default slot times from config or use fallback
    const defaultOpenTime = configData?.outlet_timings_config?.default_open_time || '11:00';
    const defaultCloseTime = configData?.outlet_timings_config?.default_close_time || '23:00';
    setSlots([...slots, { open_time: defaultOpenTime, close_time: defaultCloseTime }]);
  };

  const handleRemoveSlot = (index) => {
    if (slots.length > 1) {
      setSlots(slots.filter((_, i) => i !== index));
    } else {
      const errorMessage = getUILabel('min_slot_required_error', 'At least one time slot is required');
      showToast(errorMessage, 'error');
    }
  };

  const handleSaveTimings = async () => {
    if (!editingDay) return;

    // If closed, ensure slots array is empty
    if (!isOpen) {
      // Skip validation for closed days - just send empty slots
    } else {
      // If open, validate slots
      if (slots.length === 0) {
        const errorMessage = getUILabel('add_slot_error', 'Please add at least one time slot');
        showToast(errorMessage, 'error');
        return;
      }

      // Validate slots
      for (const slot of slots) {
        if (!slot.open_time || !slot.close_time) {
          const errorMessage = getUILabel('fill_all_slots_error', 'Please fill all time slots');
          showToast(errorMessage, 'error');
          return;
        }
        
        // Validate open_time < close_time
        const [openHour, openMin] = slot.open_time.split(':').map(Number);
        const [closeHour, closeMin] = slot.close_time.split(':').map(Number);
        const openMinutes = openHour * 60 + openMin;
        const closeMinutes = closeHour * 60 + closeMin;
        
        if (openMinutes >= closeMinutes) {
          const errorMessage = getUILabel('open_before_close_error', 'Open time must be before close time');
          showToast(errorMessage, 'error');
          return;
        }
      }
    }

    setIsSaving(true);
    try {
      const url = `${API_BASE_URL}v1/outlet/timings`;

      const response = await fetchWithAuth(url, {
        method: 'PATCH',
        body: JSON.stringify({
          day: editingDay,
          is_open: isOpen,
          slots: isOpen ? slots : [],
        }),
      });

      const data = await response.json();

      if (response.ok && data.code === 200 && data.status === 'success') {
        const successMessage = getUILabel('timings_updated_success', `Timings updated successfully for ${getDayLabel(editingDay)}`);
        showToast(successMessage, 'success');
        // Refresh timings
        await fetchOutletTimings();
        handleCloseModal();
      } else {
        const errorMessage = data.message || getUILabel('update_timings_error', 'Failed to update timings');
        console.error('❌ [OutletTimingsScreen] Failed to update timings:', errorMessage);
        showToast(errorMessage, 'error');
      }
    } catch (error) {
      console.error('❌ [OutletTimingsScreen] Error updating timings:', error);
      const errorMessage = getUILabel('update_timings_error', 'Failed to update timings');
      showToast(errorMessage, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const getDayTiming = (day) => {
    if (!timings?.timings) return null;
    return timings.timings.find((t) => t.day === day);
  };

  const locationName = configData?.partner_info?.location || '';
  const daysOfWeek = getDaysFromTimings();
  const screenTitle = getUILabel('outlet_timings_title', 'Restaurant Timings');
  const editButtonText = getUILabel('edit_button', 'EDIT');
  const closedText = getUILabel('closed_text', 'Closed');
  const restaurantStatusLabel = getUILabel('restaurant_status_label', 'Restaurant Status');
  const timeSlotsLabel = getUILabel('time_slots_label', 'Time Slots');
  const addSlotText = getUILabel('add_slot_text', '+ Add Slot');
  const saveChangesText = getUILabel('save_changes_text', 'Save Changes');

  // Get bottom tabs from config or use defaults
  const getBottomTabs = () => {
    if (configData?.bottom_navigation_tabs && Array.isArray(configData.bottom_navigation_tabs)) {
      return configData.bottom_navigation_tabs.map(tab => ({
        id: tab.id || tab.route?.replace('/', '') || '',
        label: tab.label || tab.title || '',
        icon: tab.icon ? icons[tab.icon] : icons.menu,
        route: tab.route || '',
      }));
    }
    // Default bottom tabs
    return [
      { id: 'orders', label: getUILabel('orders_tab', 'Orders'), icon: icons.orders },
      { id: 'menu', label: getUILabel('menu_tab', 'Menu'), icon: icons.menu },
      { id: 'finance', label: getUILabel('finance_tab', 'Finance'), icon: icons.finance },
      { id: 'more', label: getUILabel('more_tab', 'More'), icon: icons.more },
    ];
  };

  const bottomTabs = getBottomTabs();

  // Handle back button - navigate to MoreScreen
  const handleBack = () => {
    if (onNavigate) {
      onNavigate('more');
    } else if (onBack) {
      onBack();
    }
  };

  // Handle bottom tab press
  const handleBottomTabPress = (tabId) => {
    if (tabId === 'more') {
      // Navigate back to MoreScreen
      if (onNavigate) {
        onNavigate('more');
      }
      return;
    }
    
    setActiveBottomTab(tabId);
    
    // Navigate using onNavigate if available
    if (onNavigate) {
      const tab = bottomTabs.find(t => t.id === tabId);
      if (tab?.route) {
        onNavigate(tab.route);
      } else {
        onNavigate(tabId);
      }
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      {/* Header Section - Same style as OrdersScreen/MenuScreen/MoreScreen */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity onPress={handleBack} style={styles.backButtonHeader}>
            <Image
              source={icons.backArrow}
              style={styles.backArrow}
              resizeMode="contain"
            />
          </TouchableOpacity>
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
              {configData?.partner_info && (
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

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF6E1A" />
        </View>
      ) : (
        <ScrollView
          style={styles.contentArea}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
        >
          {daysOfWeek.length === 0 ? (
            <View style={styles.emptyStateContainer}>
              <Text style={styles.emptyStateText}>
                {getUILabel('no_timings_text', 'No timings available')}
              </Text>
            </View>
          ) : (
            daysOfWeek.map((day) => {
              const dayTiming = getDayTiming(day);
              const isOpen = dayTiming?.is_open ?? true;
              const slots = dayTiming?.slots || [];

              return (
                <View key={day} style={styles.dayCard}>
                  <Text style={styles.dayName}>{getDayLabel(day)}</Text>
                  {isOpen && slots.length > 0 ? (
                    <View style={styles.slotsContainer}>
                      {slots.map((slot, index) => (
                        <Text key={index} style={styles.timeSlot}>
                          {formatTime(slot.open_time)} - {formatTime(slot.close_time)}
                        </Text>
                      ))}
                    </View>
                  ) : (
                    <Text style={styles.closedText}>{closedText}</Text>
                  )}
                  <TouchableOpacity
                    style={styles.editButton}
                    onPress={() => handleEdit(day)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.editButtonText}>{editButtonText}</Text>
                  </TouchableOpacity>
                </View>
              );
            })
          )}
        </ScrollView>
      )}

      {/* Edit Bottom Sheet */}
      <CustomBottomSheet
        visible={editModalVisible}
        onClose={handleCloseModal}
        maxHeight="90%"
      >
        <View style={styles.bottomSheetContent}>
          <Text style={styles.bottomSheetTitle}>
            {getUILabel('edit_timings_title', 'Edit')} {editingDay ? getDayLabel(editingDay) : ''} {getUILabel('timings_label', 'Timings')}
          </Text>

          <ScrollView
            style={styles.bottomSheetScrollView}
            contentContainerStyle={styles.bottomSheetScrollContent}
            showsVerticalScrollIndicator={false}
            nestedScrollEnabled={true}
            bounces={false}
          >
              {/* Open/Closed Toggle */}
              <View style={styles.toggleContainer}>
                <Text style={styles.toggleLabel}>{restaurantStatusLabel}</Text>
                <View style={styles.toggleRow}>
                  <Text style={styles.toggleText}>
                    {isOpen 
                      ? getUILabel('open_text', 'Open') 
                      : getUILabel('closed_text', 'Closed')
                    }
                  </Text>
                  <Switch
                    value={isOpen}
                    onValueChange={setIsOpen}
                    trackColor={{ false: '#E0E0E0', true: '#4CAF50' }}
                    thumbColor="#FFFFFF"
                    ios_backgroundColor="#E0E0E0"
                  />
                </View>
              </View>

              {/* Time Slots */}
              {isOpen && (
                <View style={styles.slotsSection}>
                  <View style={styles.slotsHeader}>
                    <Text style={styles.slotsTitle}>{timeSlotsLabel}</Text>
                    <TouchableOpacity
                      onPress={handleAddSlot}
                      style={styles.addSlotButton}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.addSlotText}>{addSlotText}</Text>
                    </TouchableOpacity>
                  </View>

                {slots.map((slot, index) => (
                  <View key={index} style={styles.slotCard}>
                      <View style={styles.slotHeader}>
                        <Text style={styles.slotNumber}>
                          {getUILabel('slot_label', 'Slot')} {index + 1}
                        </Text>
                        {slots.length > 1 && (
                          <TouchableOpacity
                            onPress={() => handleRemoveSlot(index)}
                            style={styles.removeSlotButton}
                            activeOpacity={0.7}
                          >
                            <Text style={styles.removeSlotText}>
                              {getUILabel('remove_text', 'Remove')}
                            </Text>
                          </TouchableOpacity>
                        )}
                      </View>

                      <View style={styles.timeInputsRow}>
                        {/* Open Time */}
                        <View style={styles.timeInputContainer}>
                          <Text style={styles.timeLabel}>
                            {getUILabel('open_time_label', 'Open Time')}
                          </Text>
                        <TouchableOpacity
                          style={styles.timeInput}
                          onPress={() => {
                            setShowTimePicker({ slotIndex: index, type: 'open' });
                          }}
                          activeOpacity={0.7}
                        >
                          <Text style={styles.timeInputText}>
                            {formatTime(slot.open_time)}
                          </Text>
                        </TouchableOpacity>
                        {showTimePicker.slotIndex === index && showTimePicker.type === 'open' && (
                          <DateTimePicker
                            value={new Date(`2000-01-01T${slot.open_time}`)}
                            mode="time"
                            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                            onChange={(event, time) => handleTimeChange(event, time, index, 'open')}
                          />
                        )}
                      </View>

                        {/* Close Time */}
                        <View style={styles.timeInputContainer}>
                          <Text style={styles.timeLabel}>
                            {getUILabel('close_time_label', 'Close Time')}
                          </Text>
                        <TouchableOpacity
                          style={styles.timeInput}
                          onPress={() => {
                            setShowTimePicker({ slotIndex: index, type: 'close' });
                          }}
                          activeOpacity={0.7}
                        >
                          <Text style={styles.timeInputText}>
                            {formatTime(slot.close_time)}
                          </Text>
                        </TouchableOpacity>
                        {showTimePicker.slotIndex === index && showTimePicker.type === 'close' && (
                          <DateTimePicker
                            value={new Date(`2000-01-01T${slot.close_time}`)}
                            mode="time"
                            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                            onChange={(event, time) => handleTimeChange(event, time, index, 'close')}
                          />
                        )}
                      </View>
                    </View>
                  </View>
                ))}
              </View>
            )}

              {/* Save Button */}
              <View style={styles.bottomSheetButtonContainer}>
                <CustomButton
                  title={saveChangesText}
                  onPress={handleSaveTimings}
                  disabled={isSaving}
                  loading={isSaving}
                />
              </View>
          </ScrollView>
        </View>
      </CustomBottomSheet>

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
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  // Header styles - matching OrdersScreen/MenuScreen/MoreScreen
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
  backButtonHeader: {
    padding: 5,
    marginRight: 12,
  },
  backArrow: {
    width: 24,
    height: 24,
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  contentArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 100, // Extra padding for bottom nav
  },
  dayCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    padding: 16,
    marginBottom: 12,
  },
  dayName: {
    fontFamily: Poppins.bold,
    fontSize: 16,
    fontWeight: '700',
    color: '#000000',
    marginBottom: 8,
  },
  slotsContainer: {
    marginBottom: 8,
  },
  timeSlot: {
    fontFamily: Poppins.regular,
    fontSize: 14,
    color: '#000000',
    marginBottom: 4,
  },
  closedText: {
    fontFamily: Poppins.regular,
    fontSize: 14,
    color: '#666666',
    marginBottom: 8,
  },
  editButton: {
    alignSelf: 'flex-end',
    flexDirection: 'row',
    alignItems: 'center',
  },
  editButtonText: {
    fontFamily: Poppins.semiBold,
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '600',
  },
  bottomSheetContent: {
    flex: 1,
    paddingTop: 0,
  },
  bottomSheetTitle: {
    fontFamily: Poppins.bold,
    fontSize: 18,
    fontWeight: '700',
    color: '#000000',
    marginBottom: 20,
  },
  bottomSheetScrollView: {
    flex: 1,
  },
  bottomSheetScrollContent: {
    flexGrow: 1,
    paddingBottom: 0,
  },
  toggleContainer: {
    marginBottom: 24,
  },
  toggleLabel: {
    fontFamily: Poppins.semiBold,
    fontSize: 16,
    color: '#000000',
    marginBottom: 12,
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  toggleText: {
    fontFamily: Poppins.regular,
    fontSize: 16,
    color: '#000000',
  },
  slotsSection: {
    marginBottom: 24,
  },
  slotsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  slotsTitle: {
    fontFamily: Poppins.semiBold,
    fontSize: 16,
    color: '#000000',
  },
  addSlotButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  addSlotText: {
    fontFamily: Poppins.semiBold,
    fontSize: 14,
    color: '#007AFF',
  },
  slotCard: {
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
  },
  slotHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  slotNumber: {
    fontFamily: Poppins.semiBold,
    fontSize: 14,
    color: '#000000',
  },
  removeSlotButton: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  removeSlotText: {
    fontFamily: Poppins.regular,
    fontSize: 12,
    color: '#FF3B30',
  },
  timeInputsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  timeInputContainer: {
    flex: 1,
  },
  timeLabel: {
    fontFamily: Poppins.regular,
    fontSize: 12,
    color: '#666666',
    marginBottom: 8,
  },
  timeInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  timeInputText: {
    fontFamily: Poppins.medium,
    fontSize: 14,
    color: '#000000',
  },
  bottomSheetButtonContainer: {
    marginTop: 24,
    marginBottom: 0,
  },
  emptyStateContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyStateText: {
    fontFamily: Poppins.regular,
    fontSize: 16,
    color: '#666666',
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
  },
  bottomNavIconActive: {
    tintColor: '#FF6E1A',
  },
});

export default OutletTimingsScreen;
