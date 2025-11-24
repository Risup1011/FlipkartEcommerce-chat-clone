import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Image,
  Alert,
} from 'react-native';
import { Poppins, icons } from '../assets';
import CustomHeader from './CustomHeader';
import CustomDropdown from './CustomDropdown';
import AddOnsSelectionScreen from './AddOnsSelectionScreen';
import { fetchWithAuth } from '../utils/apiHelpers';
import { API_BASE_URL } from '../config';
import { useToast } from './ToastContext';

const AddAddonsScreen = ({ onBack, onSave, onNavigate, onDelete: onDeleteCallback, addonType = 'ADD_ONS', addonTitle = 'Add-ons', itemData = null, onItemDataUpdate = null, configData = null }) => {
    // For CUSTOM addons, start with empty string if new, otherwise use addonTitle
  const [customizationTitle, setCustomizationTitle] = useState(
    addonType === 'CUSTOM' ? '' : addonTitle
  );
  const [isCompulsory, setIsCompulsory] = useState(true);
  const [minSelection, setMinSelection] = useState('');
  const [maxSelection, setMaxSelection] = useState('All');
  const [showAddOnsSelection, setShowAddOnsSelection] = useState(false);
  const [linkedAddons, setLinkedAddons] = useState([]);
  const [isRemoving, setIsRemoving] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [allAddons, setAllAddons] = useState([]); // Store all add-ons to get prices

  const minSelectionOptions = ['0', '1', '2', '3', '4', '5'];
  const maxSelectionOptions = ['All', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10'];

  // Get UI labels from config with fallbacks
  const getUILabel = (key, fallback) => {
    return configData?.addon_screen_labels?.[key] || 
           configData?.ui_labels?.[key] || 
           fallback;
  };

  // Fetch all add-ons to get prices for linked add-ons
  useEffect(() => {
    const fetchAllAddons = async () => {
      try {
        const url = `${API_BASE_URL}v1/catalog/addons`;
        const response = await fetchWithAuth(url, { method: 'GET' });
        const data = await response.json();
        
        if (response.ok && (data.code === 200 || data.code === 201) && data.status === 'success') {
          setAllAddons(data.data || []);
        }
      } catch (error) {
        console.error('❌ [AddAddonsScreen] Error fetching add-ons for prices:', error);
      }
    };
    
    fetchAllAddons();
  }, []);

  // Get linked add-ons from itemData and prefill customization settings
  useEffect(() => {
    console.log('🔄 [AddAddonsScreen] useEffect triggered - itemData changed');
    console.log('🔄 [AddAddonsScreen] itemData:', itemData ? { id: itemData.id, add_ons_count: itemData.add_ons?.length || 0 } : 'null');
    console.log('🔄 [AddAddonsScreen] itemData.add_ons:', itemData?.add_ons ? JSON.stringify(itemData.add_ons, null, 2) : 'none');
    
    if (itemData && itemData.add_ons && Array.isArray(itemData.add_ons) && itemData.add_ons.length > 0) {
      // Enrich linked add-ons with price information from allAddons
      const enrichedLinkedAddons = itemData.add_ons.map((linkedAddon) => {
        const addonDetails = allAddons.find((addon) => addon.id === linkedAddon.add_on_id);
        return {
          ...linkedAddon,
          additional_price: linkedAddon.additional_price || addonDetails?.additional_price || 0,
          item_type: linkedAddon.item_type || addonDetails?.item_type || 'VEG',
        };
      });
      setLinkedAddons(enrichedLinkedAddons);
      console.log('📋 [AddAddonsScreen] Loaded linked add-ons:', enrichedLinkedAddons);

      // Prefill customization settings from the first linked add-on
      // (assuming all add-ons in the same group share the same settings)
      const firstLinkedAddon = enrichedLinkedAddons[0];
      if (firstLinkedAddon) {
        console.log('🔍 [AddAddonsScreen] Prefilling customization settings from linked add-on:', firstLinkedAddon);
        
        // Prefill selection type (Compulsory/Optional)
        if (firstLinkedAddon.selection_type) {
          const isMandatory = firstLinkedAddon.selection_type === 'MANDATORY';
          setIsCompulsory(isMandatory);
          console.log('✅ [AddAddonsScreen] Prefilled isCompulsory:', isMandatory);
        }

        // Prefill min selection
        if (firstLinkedAddon.min_selection !== undefined && firstLinkedAddon.min_selection !== null) {
          setMinSelection(String(firstLinkedAddon.min_selection));
          console.log('✅ [AddAddonsScreen] Prefilled minSelection:', firstLinkedAddon.min_selection);
        }

        // Prefill max selection
        if (firstLinkedAddon.max_selection !== undefined && firstLinkedAddon.max_selection !== null) {
          // Convert 999 (unlimited) to "All", otherwise use the number
          if (firstLinkedAddon.max_selection === 999 || firstLinkedAddon.max_selection >= 10) {
            setMaxSelection('All');
            console.log('✅ [AddAddonsScreen] Prefilled maxSelection: All (unlimited)');
          } else {
            setMaxSelection(String(firstLinkedAddon.max_selection));
            console.log('✅ [AddAddonsScreen] Prefilled maxSelection:', firstLinkedAddon.max_selection);
          }
        } else {
          // If max_selection is null, it means unlimited
          setMaxSelection('All');
          console.log('✅ [AddAddonsScreen] Prefilled maxSelection: All (null = unlimited)');
        }
      }
    } else {
      setLinkedAddons([]);
      // Reset to defaults if no linked add-ons
      setIsCompulsory(true);
      setMinSelection('');
      setMaxSelection('All');
      // For CUSTOM addons, clear the title so user can type directly
      if (addonType === 'CUSTOM') {
        setCustomizationTitle('');
      }
    }
  }, [itemData, allAddons]);

  // Handle save customization settings
  const handleSaveSettings = async () => {
    if (!itemData || !itemData.id) {
      const errorMsg = getUILabel('item_data_missing', 'Item data is missing');
      return;
    }

    if (linkedAddons.length === 0) {
      const errorMsg = getUILabel('addon_at_least_one_required', 'Please add at least one add-on before saving settings');
      return;
    }

    // Validate min selection
    if (isCompulsory && (!minSelection || minSelection === '')) {
      const errorMsg = getUILabel('min_selection_required_compulsory', 'Please select minimum selection for compulsory add-ons');
      return;
    }

    setIsSaving(true);
    try {
      const itemId = itemData.id;
      
      // Prepare customization settings
      // API only accepts "OPTIONAL" as selection_type
      // Mandatory selection is controlled by min_selection > 0
      // Always use "OPTIONAL" as per API specification
      const selectionType = 'OPTIONAL';
      const minSelectionValue = isCompulsory ? parseInt(minSelection) || 1 : 0;
      const maxSelectionValue = maxSelection === 'All' ? 999 : parseInt(maxSelection);

      // Prepare request body with all linked add-ons and updated settings
      // Use the same format as AddOnsSelectionScreen (POST with array)
      const requestBody = linkedAddons.map((linkedAddon) => {
        const addonId = linkedAddon.add_on_id || linkedAddon.id;
        return {
          add_on_id: String(addonId), // Ensure it's a string
          selection_type: selectionType,
          min_selection: Number(minSelectionValue),
          max_selection: Number(maxSelectionValue),
        };
      });

      const url = `${API_BASE_URL}v1/catalog/items/${itemId}/addons`;
      console.log('📡 [AddAddonsScreen] Updating add-ons settings:', url);
      console.log('📤 [AddAddonsScreen] Request body:', JSON.stringify(requestBody, null, 2));

      // Use POST to update all add-ons at once (same endpoint as linking)
      const response = await fetchWithAuth(url, {
        method: 'POST',
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();
      console.log('📥 [AddAddonsScreen] Update Add-ons API Response:', JSON.stringify(data, null, 2));

      if (response.ok && (data.code === 200 || data.status === 'success')) {
        console.log('✅ [AddAddonsScreen] Settings saved successfully');
        
        // Use the updated item data from response if available
        if (data.data) {
          const updatedItemData = data.data;
          // Update itemData via callback
          if (onItemDataUpdate) {
            onItemDataUpdate(updatedItemData);
          }
        } else {
          // Fallback: Fetch updated item data to refresh the screen
          try {
            const itemUrl = `${API_BASE_URL}v1/catalog/items/${itemId}`;
            const itemResponse = await fetchWithAuth(itemUrl, { method: 'GET' });
            const itemDataResponse = await itemResponse.json();
            
            if (itemResponse.ok && (itemDataResponse.code === 200 || itemDataResponse.status === 'success')) {
              const updatedItemData = itemDataResponse.data;
              // Update itemData via callback
              if (onItemDataUpdate) {
                onItemDataUpdate(updatedItemData);
              }
            }
          } catch (error) {
            console.error('❌ [AddAddonsScreen] Error fetching updated item data:', error);
            // Still show success since settings were saved
          }
        }
        
        // Navigate back after successful save
        console.log('✅ [AddAddonsScreen] Navigating back after successful save');
        onBack();
      } else {
        const errorMessage = data.message || data.error || 'Failed to update add-on settings';
        console.error('❌ [AddAddonsScreen] Failed to update add-ons:', errorMessage);
        Alert.alert('Error', errorMessage);
      }
    } catch (error) {
      console.error('❌ [AddAddonsScreen] Error saving customization settings:', error);
      const errorMsg = getUILabel('addon_save_settings_error', 'Failed to save customization settings');
      Alert.alert('Error', errorMsg);
    } finally {
      setIsSaving(false);
    }
  };

  // Handle remove/unlink add-on
  const handleRemoveAddon = async (addonId) => {
    if (!itemData || !itemData.id) {
      const errorMsg = getUILabel('item_data_missing', 'Item data is missing');
      return;
    }

    setIsRemoving(true);
    try {
      const itemId = itemData.id;
      const url = `${API_BASE_URL}v1/catalog/items/${itemId}/addons/${addonId}`;
      console.log('📡 [AddAddonsScreen] Unlinking add-on:', url);

      const response = await fetchWithAuth(url, {
        method: 'DELETE',
      });

      const data = await response.json();
      console.log('📥 [AddAddonsScreen] Unlink Add-on API Response:', JSON.stringify(data, null, 2));

      if (response.ok && (data.code === 200 || data.status === 'success')) {
        const successMsg = getUILabel('addon_removed_success', 'Add-on removed successfully');
        // Call onDelete callback to refresh item data before updating local state
        if (onDeleteCallback) {
          await onDeleteCallback();
        }
        // Remove from local state immediately
        setLinkedAddons((prev) => prev.filter((addon) => {
          const id = addon.add_on_id || addon.id;
          return id !== addonId;
        }));
        // If response includes updated item data, use it
        if (data.data && data.data.add_ons) {
          const enrichedLinkedAddons = data.data.add_ons.map((linkedAddon) => {
            const addonDetails = allAddons.find((addon) => addon.id === linkedAddon.add_on_id);
            return {
              ...linkedAddon,
              additional_price: linkedAddon.additional_price || addonDetails?.additional_price || 0,
            };
          });
          setLinkedAddons(enrichedLinkedAddons);
        }
      } else {
        const errorMessage = data.message || data.error || 'Failed to remove add-on';
        console.error('❌ [AddAddonsScreen] Failed to remove add-on:', errorMessage);
      }
    } catch (error) {
      console.error('❌ [AddAddonsScreen] Error removing add-on:', error);
      const errorMsg = getUILabel('addon_remove_error', 'Failed to remove add-on');
    } finally {
      setIsRemoving(false);
    }
  };


  // Show AddOnsSelectionScreen when navigating to add-ons selection
  if (showAddOnsSelection) {
    const itemDataWithAddons = {
      ...itemData,
      add_ons: linkedAddons, // Pass the linked add-ons explicitly
    };
    console.log('🔍 [AddAddonsScreen] Passing to AddOnsSelectionScreen:', {
      itemId: itemData?.id,
      linkedAddonsCount: linkedAddons.length,
      linkedAddons: linkedAddons,
      itemDataWithAddons: itemDataWithAddons,
    });
    
    return (
      <AddOnsSelectionScreen
        onBack={() => setShowAddOnsSelection(false)}
        onSave={(updatedItemData) => {
          // Add-ons linked successfully, update linked add-ons list
          if (updatedItemData) {
            // Update itemData if callback is provided
            if (onItemDataUpdate) {
              onItemDataUpdate(updatedItemData);
            }
            // The useEffect will automatically update linkedAddons when itemData changes
          }
          setShowAddOnsSelection(false);
        }}
        itemData={itemDataWithAddons}
        customizationData={{
          selection_type: isCompulsory ? 'MANDATORY' : 'OPTIONAL',
          min_selection: isCompulsory ? parseInt(minSelection) || 1 : 0,
          max_selection: maxSelection === 'All' ? null : parseInt(maxSelection),
        }}
      />
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <View style={styles.headerBackground}>
        <CustomHeader title={`Add ${addonTitle}`} onBack={onBack} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Title of Customization */}
        <View style={styles.section}>
          <Text style={styles.label}>
            {getUILabel('customization_title_label', 'Title of customization')}<Text style={styles.asterisk}> *</Text>
          </Text>
          <TextInput
            style={styles.titleInput}
            placeholder={getUILabel('customization_title_placeholder', 'Enter customization title')}
            placeholderTextColor="#999"
            value={customizationTitle}
            onChangeText={setCustomizationTitle}
          />
        </View>

        {/* Customization Behaviors */}
        <View style={styles.section}>
          <Text style={styles.label}>
            {getUILabel('customization_behaviors_label', 'Customization behaviors')}<Text style={styles.asterisk}> *</Text>
          </Text>
          <View style={styles.behaviorsContainer}>
            <Text style={styles.behaviorLabel}>{getUILabel('customer_selection_label', 'Customer selection is')}</Text>
            <View style={styles.toggleContainer}>
              <TouchableOpacity
                style={[
                  styles.toggleButton,
                  isCompulsory && styles.toggleButtonActive,
                ]}
                onPress={() => setIsCompulsory(true)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.toggleButtonText,
                    isCompulsory && styles.toggleButtonTextActive,
                  ]}
                >
                  {getUILabel('compulsory_button', 'Compulsory')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.toggleButton,
                  !isCompulsory && styles.toggleButtonActive,
                ]}
                onPress={() => setIsCompulsory(false)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.toggleButtonText,
                    !isCompulsory && styles.toggleButtonTextActive,
                  ]}
                >
                  {getUILabel('optional_button', 'Optional')}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.selectionRow}>
              <View style={styles.selectionField}>
                <Text style={styles.selectionLabel}>{getUILabel('min_selection_label', 'Min selection')}</Text>
                <CustomDropdown
                  value={minSelection}
                  onSelect={setMinSelection}
                  placeholder={getUILabel('select_placeholder', 'Select')}
                  options={minSelectionOptions}
                />
              </View>

              <View style={styles.selectionField}>
                <Text style={styles.selectionLabel}>{getUILabel('max_selection_label', 'Max selection')}</Text>
                <CustomDropdown
                  value={maxSelection}
                  onSelect={setMaxSelection}
                  placeholder={getUILabel('select_placeholder', 'Select')}
                  options={maxSelectionOptions}
                />
              </View>
            </View>
          </View>
        </View>

        {/* Add Options Section */}
        <View style={styles.section}>
          <Text style={styles.label}>
            {getUILabel('add_options_label', 'Add Options')}<Text style={styles.asterisk}> *</Text>
          </Text>
          <TouchableOpacity
            style={styles.addOptionsContainer}
            activeOpacity={0.7}
            onPress={() => {
              // Navigate to add-ons selection screen
              if (onNavigate) {
                onNavigate('addonsSelection', {
                  itemData,
                  customizationData: {
                    selection_type: isCompulsory ? 'MANDATORY' : 'OPTIONAL',
                    min_selection: isCompulsory ? parseInt(minSelection) || 1 : 0,
                    max_selection: maxSelection === 'All' ? null : parseInt(maxSelection),
                  },
                });
              } else {
                setShowAddOnsSelection(true);
              }
            }}
          >
            <View style={styles.addOptionsContent}>
              <Text style={styles.plusIcon}>+</Text>
              <Text style={styles.addOptionsTitle}>{getUILabel('add_options_to_item_title', 'Add Options To This Item')}</Text>
              <Text style={styles.addOptionsDescription}>
                {getUILabel('add_options_description', 'Select options to add and configure.')}
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Linked Add-ons List */}
        {linkedAddons.length > 0 && (
          <View style={styles.section}>
            <View style={styles.linkedAddonsList}>
              {linkedAddons.map((linkedAddon) => {
                const addonId = linkedAddon.add_on_id || linkedAddon.id;
                return (
                <View key={addonId} style={styles.linkedAddonItem}>
                  <View style={styles.linkedAddonLeft}>
                    <Image
                      source={linkedAddon.item_type === 'VEG' ? icons.veg : icons.nonVeg}
                      style={styles.vegIcon}
                      resizeMode="contain"
                    />
                    <View style={styles.linkedAddonInfo}>
                      <Text style={styles.linkedAddonName}>{linkedAddon.add_on_name || 'Unknown'}</Text>
                      <TouchableOpacity
                        onPress={() => handleRemoveAddon(addonId)}
                        disabled={isRemoving}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.removeButtonText}>{getUILabel('remove_button', 'Remove')}</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                  <Text style={styles.linkedAddonPrice}>
                    ₹{linkedAddon.additional_price || linkedAddon.price || 0}
                  </Text>
                </View>
                );
              })}
            </View>
          </View>
        )}

        {/* Save and Go to Menu Screen Buttons */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
            onPress={handleSaveSettings}
            activeOpacity={0.7}
            disabled={isSaving}
          >
            {isSaving ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.saveButtonText}>{getUILabel('save_button', 'Save')}</Text>
            )}
          </TouchableOpacity>
          {/* <TouchableOpacity
            style={styles.menuButton}
            onPress={onBack}
            activeOpacity={0.7}
          >
            <Text style={styles.menuButtonText}>Go to Menu Screen</Text>
          </TouchableOpacity> */}
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
  headerBackground: {
    backgroundColor: '#FFFFFF',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 30,
  },
  section: {
    marginBottom: 24,
  },
  label: {
    fontFamily: Poppins.regular,
    fontSize: 14,
    color: '#000000',
    marginBottom: 8,
  },
  asterisk: {
    color: '#FF0000',
  },
  titleInput: {
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontFamily: Poppins.semiBold,
    fontSize: 16,
    color: '#000000',
    minHeight: 48,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  behaviorsContainer: {
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  behaviorLabel: {
    fontFamily: Poppins.regular,
    fontSize: 14,
    color: '#000000',
    marginBottom: 12,
  },
  toggleContainer: {
    flexDirection: 'row',
    marginBottom: 20,
    gap: 12,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleButtonActive: {
    backgroundColor: '#4CAF50',
    borderColor: '#4CAF50',
  },
  toggleButtonText: {
    fontFamily: Poppins.medium,
    fontSize: 14,
    color: '#666666',
  },
  toggleButtonTextActive: {
    color: '#FFFFFF',
  },
  selectionRow: {
    flexDirection: 'row',
    gap: 12,
  },
  selectionField: {
    flex: 1,
  },
  selectionLabel: {
    fontFamily: Poppins.regular,
    fontSize: 12,
    color: '#666666',
    marginBottom: 8,
  },
  addOptionsContainer: {
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#CCCCCC',
    minHeight: 200,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  addOptionsContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  plusIcon: {
    fontSize: 48,
    color: '#666666',
    marginBottom: 12,
  },
  addOptionsTitle: {
    fontFamily: Poppins.semiBold,
    fontSize: 16,
    color: '#000000',
    marginBottom: 8,
    textAlign: 'center',
  },
  addOptionsDescription: {
    fontFamily: Poppins.regular,
    fontSize: 14,
    color: '#666666',
    textAlign: 'center',
  },
  buttonContainer: {
    marginTop: 20,
    marginBottom: 10,
    gap: 12,
  },
  saveButton: {
    width: '100%',
    backgroundColor: '#FF6E1A',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 46,
  },
  saveButtonText: {
    fontFamily: Poppins.semiBold,
    fontSize: 16,
    color: '#FFFFFF',
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  menuButton: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 46,
  },
  menuButtonText: {
    fontFamily: Poppins.semiBold,
    fontSize: 16,
    color: '#000000',
  },
  linkedAddonsList: {
    marginTop: 8,
  },
  linkedAddonItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  linkedAddonLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  vegIndicatorGreen: {
    width: 20,
    height: 20,
    borderRadius: 4,
    marginRight: 12,
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
  },
  vegIcon: {
    width: 16,
    height: 16,
    marginRight: 12,
  },
  vegDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FFFFFF',
  },
  linkedAddonInfo: {
    flex: 1,
  },
  linkedAddonName: {
    fontFamily: Poppins.regular,
    fontSize: 14,
    color: '#000000',
    marginBottom: 4,
  },
  removeButtonText: {
    fontFamily: Poppins.regular,
    fontSize: 12,
    color: '#666666',
  },
  linkedAddonPrice: {
    fontFamily: Poppins.regular,
    fontSize: 14,
    color: '#000000',
  },
});

export default AddAddonsScreen;
