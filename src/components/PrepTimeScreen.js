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
import CustomButton from './CustomButton';
import CustomTextInput from './CustomTextInput';
import { useToast } from './ToastContext';
import { fetchWithAuth } from '../utils/apiHelpers';
import { API_BASE_URL } from '../config';

const PrepTimeScreen = ({ onBack }) => {
  const { showToast } = useToast();
  const [prepTime, setPrepTime] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchPrepTime();
  }, []);

  const fetchPrepTime = async () => {
    try {
      setIsLoading(true);
      const url = `${API_BASE_URL}v1/settings`;
      console.log('📡 [PrepTimeScreen] Fetching settings:', url);

      const response = await fetchWithAuth(url, {
        method: 'GET',
      });

      const data = await response.json();
      console.log('📥 [PrepTimeScreen] Settings Response:', JSON.stringify(data, null, 2));

      if (response.ok && data.code === 200 && data.status === 'success') {
        const defaultPrepTime = data.data?.default_prep_time_minutes || 30;
        setPrepTime(defaultPrepTime.toString());
      } else {
        console.error('❌ [PrepTimeScreen] Failed to fetch settings:', data.message);
        showToast(data.message || 'Failed to load prep time', 'error');
      }
    } catch (error) {
      console.error('❌ [PrepTimeScreen] Error fetching settings:', error);
      showToast('Failed to load prep time', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      const prepTimeMinutes = parseInt(prepTime, 10);

      if (isNaN(prepTimeMinutes) || prepTimeMinutes < 0) {
        showToast('Please enter a valid prep time', 'error');
        return;
      }

      const url = `${API_BASE_URL}v1/settings/prep-time`;
      console.log('📡 [PrepTimeScreen] Updating prep time:', url);
      console.log('📤 [PrepTimeScreen] Prep time minutes:', prepTimeMinutes);

      const response = await fetchWithAuth(url, {
        method: 'PATCH',
        body: JSON.stringify({
          prep_time_minutes: prepTimeMinutes,
        }),
      });

      const data = await response.json();
      console.log('📥 [PrepTimeScreen] Update Prep Time Response:', JSON.stringify(data, null, 2));

      if (response.ok && data.code === 200 && data.status === 'success') {
        showToast('Prep time updated successfully', 'success');
        if (onBack) {
          onBack();
        }
      } else {
        showToast(data.message || 'Failed to update prep time', 'error');
      }
    } catch (error) {
      console.error('❌ [PrepTimeScreen] Error updating prep time:', error);
      showToast('Failed to update prep time', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
        <CustomHeader
          title="Prep Time"
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
        title="Prep Time"
        onBack={onBack}
        showBackButton={true}
      />

      <ScrollView
        style={styles.contentArea}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.formContainer}>
          <Text style={styles.label}>Default Prep Time (minutes)</Text>
          <CustomTextInput
            value={prepTime}
            onChangeText={setPrepTime}
            placeholder="Enter prep time in minutes"
            keyboardType="numeric"
          />
          <Text style={styles.hint}>
            This is the default preparation time for all orders. You can override this for individual items.
          </Text>
        </View>

        <View style={styles.buttonContainer}>
          <CustomButton
            title="Save"
            onPress={handleSave}
            disabled={isSaving}
            loading={isSaving}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
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
    paddingBottom: 40,
  },
  formContainer: {
    paddingHorizontal: 20,
    paddingTop: 24,
  },
  label: {
    fontFamily: Poppins.semiBold,
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 12,
  },
  hint: {
    fontFamily: Poppins.regular,
    fontSize: 12,
    color: '#666666',
    marginTop: 8,
    lineHeight: 18,
  },
  buttonContainer: {
    paddingHorizontal: 20,
    paddingTop: 32,
  },
});

export default PrepTimeScreen;

