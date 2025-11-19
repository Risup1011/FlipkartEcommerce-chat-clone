import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Poppins } from '../assets';
import CustomHeader from './CustomHeader';
import { useToast } from './ToastContext';
import { fetchWithAuth } from '../utils/apiHelpers';
import { API_BASE_URL } from '../config';

const AccountSettingsScreen = ({ onBack }) => {
  const { showToast } = useToast();
  const [settings, setSettings] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setIsLoading(true);
      const url = `${API_BASE_URL}v1/settings`;
      console.log('📡 [AccountSettingsScreen] Fetching partner settings:', url);

      const response = await fetchWithAuth(url, {
        method: 'GET',
      });

      const data = await response.json();
      console.log('📥 [AccountSettingsScreen] Partner Settings Response:', JSON.stringify(data, null, 2));

      if (response.ok && data.code === 200 && data.status === 'success') {
        setSettings(data.data);
        console.log('✅ [AccountSettingsScreen] Settings loaded successfully');
      } else {
        console.error('❌ [AccountSettingsScreen] Failed to fetch settings:', data.message);
        showToast(data.message || 'Failed to load settings', 'error');
      }
    } catch (error) {
      console.error('❌ [AccountSettingsScreen] Error fetching settings:', error);
      showToast('Failed to load settings', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      return date.toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch (error) {
      return dateString;
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
        <CustomHeader
          title="Account Settings"
          onBack={onBack}
          showBackButton={true}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF6E1A" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <CustomHeader
        title="Account Settings"
        onBack={onBack}
        showBackButton={true}
      />

      <ScrollView
        style={styles.contentArea}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {settings ? (
          <View style={styles.settingsContainer}>
            {/* Partner ID */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Partner Information</Text>
              <View style={styles.infoRow}>
                <Text style={styles.label}>Partner ID</Text>
                <Text style={styles.value}>{settings.partner_id || 'N/A'}</Text>
              </View>
            </View>

            {/* Receiving Orders Status */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Order Receiving Status</Text>
              <View style={styles.infoRow}>
                <Text style={styles.label}>Status</Text>
                <View style={styles.statusContainer}>
                  <View
                    style={[
                      styles.statusDot,
                      { backgroundColor: settings.receiving_orders?.is_accepting ? '#4CAF50' : '#EF5350' },
                    ]}
                  />
                  <Text style={styles.value}>
                    {settings.receiving_orders?.is_accepting ? 'Accepting Orders' : 'Not Accepting Orders'}
                  </Text>
                </View>
              </View>
              {settings.receiving_orders?.closing_info && (
                <View style={styles.infoRow}>
                  <Text style={styles.label}>Closing Info</Text>
                  <Text style={styles.value}>{settings.receiving_orders.closing_info}</Text>
                </View>
              )}
              {settings.receiving_orders?.paused_at && (
                <View style={styles.infoRow}>
                  <Text style={styles.label}>Paused At</Text>
                  <Text style={styles.value}>{formatDate(settings.receiving_orders.paused_at)}</Text>
                </View>
              )}
              {settings.receiving_orders?.paused_reason && (
                <View style={styles.infoRow}>
                  <Text style={styles.label}>Paused Reason</Text>
                  <Text style={styles.value}>{settings.receiving_orders.paused_reason}</Text>
                </View>
              )}
            </View>

            {/* Default Prep Time */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Preparation Time</Text>
              <View style={styles.infoRow}>
                <Text style={styles.label}>Default Prep Time</Text>
                <Text style={styles.value}>
                  {settings.default_prep_time_minutes
                    ? `${settings.default_prep_time_minutes} minutes`
                    : 'N/A'}
                </Text>
              </View>
            </View>

            {/* Timestamps */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Timestamps</Text>
              <View style={styles.infoRow}>
                <Text style={styles.label}>Created At</Text>
                <Text style={styles.value}>{formatDate(settings.created_at)}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.label}>Last Updated</Text>
                <Text style={styles.value}>{formatDate(settings.updated_at)}</Text>
              </View>
            </View>
          </View>
        ) : (
          <View style={styles.placeholderContainer}>
            <Text style={styles.placeholderText}>No settings data available</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  contentArea: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  contentContainer: {
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  settingsContainer: {
    padding: 20,
  },
  section: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  sectionTitle: {
    fontFamily: Poppins.semiBold,
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  label: {
    fontFamily: Poppins.regular,
    fontSize: 14,
    color: '#666666',
    flex: 1,
    marginRight: 12,
  },
  value: {
    fontFamily: Poppins.medium,
    fontSize: 14,
    color: '#000000',
    flex: 1,
    textAlign: 'right',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    justifyContent: 'flex-end',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  placeholderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  placeholderText: {
    fontFamily: Poppins.regular,
    fontSize: 16,
    color: '#666666',
  },
});

export default AccountSettingsScreen;
