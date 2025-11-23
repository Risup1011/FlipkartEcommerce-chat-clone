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

const PrepTimeScreen = ({ onBack, configData }) => {
    const [prepTime, setPrepTime] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Get UI labels from config with fallbacks
  const getUILabel = (key, fallback) => {
    return configData?.prep_time_labels?.[key] || 
           configData?.ui_labels?.[key] || 
           fallback;
  };

  useEffect(() => {
    fetchPrepTime();
  }, []);

  const fetchPrepTime = async () => {
    try {
      setIsLoading(true);
      const url = `${API_BASE_URL}v1/settings`;

      const response = await fetchWithAuth(url, {
        method: 'GET',
      });

      const data = await response.json();

      if (response.ok && data.code === 200 && data.status === 'success') {
        // Get prep time from backend - fully dynamic, no hardcoded default
        const defaultPrepTime = data.data?.default_prep_time_minutes;
        if (defaultPrepTime !== undefined && defaultPrepTime !== null) {
          setPrepTime(defaultPrepTime.toString());
        } else {
          setPrepTime('');
        }
      } else {
        console.error('❌ [PrepTimeScreen] Failed to fetch settings:', data.message);
        const errorMessage = getUILabel('load_prep_time_error', 'Failed to load prep time');
      }
    } catch (error) {
      console.error('❌ [PrepTimeScreen] Error fetching settings:', error);
      const errorMessage = getUILabel('load_prep_time_error', 'Failed to load prep time');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      const prepTimeMinutes = parseInt(prepTime, 10);

      if (isNaN(prepTimeMinutes) || prepTimeMinutes < 0) {
        const errorMessage = getUILabel('invalid_prep_time_error', 'Please enter a valid prep time');
        return;
      }

      const url = `${API_BASE_URL}v1/settings/prep-time`;

      const response = await fetchWithAuth(url, {
        method: 'PATCH',
        body: JSON.stringify({
          prep_time_minutes: prepTimeMinutes,
        }),
      });

      const data = await response.json();

      if (response.ok && data.code === 200 && data.status === 'success') {
        const successMessage = getUILabel('prep_time_updated_success', 'Prep time updated successfully');
        if (onBack) {
          onBack();
        }
      } else {
        const errorMessage = data.message || getUILabel('update_prep_time_error', 'Failed to update prep time');
      }
    } catch (error) {
      console.error('❌ [PrepTimeScreen] Error updating prep time:', error);
      const errorMessage = getUILabel('update_prep_time_error', 'Failed to update prep time');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
        <CustomHeader
          title={getUILabel('prep_time_title', 'Prep Time')}
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
        title={getUILabel('prep_time_title', 'Prep Time')}
        onBack={onBack}
        showBackButton={true}
      />

      <ScrollView
        style={styles.contentArea}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.formContainer}>
          <Text style={styles.label}>
            {getUILabel('prep_time_label', 'Default Prep Time (minutes)')}
          </Text>
          <CustomTextInput
            value={prepTime}
            onChangeText={setPrepTime}
            placeholder={getUILabel('prep_time_placeholder', 'Enter prep time in minutes')}
            keyboardType="numeric"
          />
          <Text style={styles.hint}>
            {getUILabel('prep_time_hint', 'This is the default preparation time for all orders. You can override this for individual items.')}
          </Text>
        </View>

        <View style={styles.buttonContainer}>
          <CustomButton
            title={getUILabel('save_button', 'Save')}
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
