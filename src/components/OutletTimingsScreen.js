import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Poppins, icons } from '../assets';
import CustomHeader from './CustomHeader';
import { useToast } from './ToastContext';
import { fetchWithAuth } from '../utils/apiHelpers';
import { API_BASE_URL } from '../config';

const OutletTimingsScreen = ({ onBack, configData }) => {
  const { showToast } = useToast();
  const [timings, setTimings] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [editingDay, setEditingDay] = useState(null);

  const daysOfWeek = [
    'MONDAY',
    'TUESDAY',
    'WEDNESDAY',
    'THURSDAY',
    'FRIDAY',
    'SATURDAY',
    'SUNDAY',
  ];

  const dayLabels = {
    MONDAY: 'Monday',
    TUESDAY: 'Tuesday',
    WEDNESDAY: 'Wednesday',
    THURSDAY: 'Thursday',
    FRIDAY: 'Friday',
    SATURDAY: 'Saturday',
    SUNDAY: 'Sunday',
  };

  useEffect(() => {
    fetchOutletTimings();
  }, []);

  const fetchOutletTimings = async () => {
    try {
      setIsLoading(true);
      const url = `${API_BASE_URL}v1/outlet/timings`;
      console.log('📡 [OutletTimingsScreen] Fetching outlet timings:', url);

      const response = await fetchWithAuth(url, {
        method: 'GET',
      });

      const data = await response.json();
      console.log('📥 [OutletTimingsScreen] Outlet Timings Response:', JSON.stringify(data, null, 2));

      if (response.ok && data.code === 200 && data.status === 'success') {
        setTimings(data.data);
      } else {
        console.error('❌ [OutletTimingsScreen] Failed to fetch timings:', data.message);
        showToast(data.message || 'Failed to load outlet timings', 'error');
      }
    } catch (error) {
      console.error('❌ [OutletTimingsScreen] Error fetching timings:', error);
      showToast('Failed to load outlet timings', 'error');
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
    console.log('📡 [OutletTimingsScreen] Edit clicked for:', day);
    // TODO: Navigate to edit screen or show edit modal
    showToast(`Edit ${dayLabels[day]} timings - Coming soon`, 'info');
  };

  const getDayTiming = (day) => {
    if (!timings?.timings) return null;
    return timings.timings.find((t) => t.day === day);
  };

  const locationName = configData?.partner_info?.location || 'HSR Layout';

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <CustomHeader
        title="Restaurant Timings"
        onBack={onBack}
        showBackButton={true}
      />
      {locationName && (
        <View style={styles.subtitleContainer}>
          <Text style={styles.subtitle}>{locationName}</Text>
        </View>
      )}

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
          {daysOfWeek.map((day) => {
            const dayTiming = getDayTiming(day);
            const isOpen = dayTiming?.is_open ?? true;
            const slots = dayTiming?.slots || [];

            return (
              <View key={day} style={styles.dayCard}>
                <Text style={styles.dayName}>{dayLabels[day]}</Text>
                {isOpen && slots.length > 0 ? (
                  <View style={styles.slotsContainer}>
                    {slots.map((slot, index) => (
                      <Text key={index} style={styles.timeSlot}>
                        {formatTime(slot.open_time)} - {formatTime(slot.close_time)}
                      </Text>
                    ))}
                  </View>
                ) : (
                  <Text style={styles.closedText}>Closed</Text>
                )}
                <TouchableOpacity
                  style={styles.editButton}
                  onPress={() => handleEdit(day)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.editButtonText}>EDIT</Text>
                </TouchableOpacity>
              </View>
            );
          })}
        </ScrollView>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  subtitleContainer: {
    paddingHorizontal: 20,
    paddingBottom: 12,
    backgroundColor: '#F5F5F5',
  },
  subtitle: {
    fontFamily: Poppins.regular,
    fontSize: 14,
    color: '#000000',
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
    paddingBottom: 40,
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
});

export default OutletTimingsScreen;

