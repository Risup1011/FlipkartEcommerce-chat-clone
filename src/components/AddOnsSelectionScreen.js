import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { Poppins } from '../assets';
import CustomHeader from './CustomHeader';
import { fetchWithAuth } from '../utils/apiHelpers';
import { API_BASE_URL } from '../config';
import { useToast } from './ToastContext';

const AddOnsSelectionScreen = ({
  onBack,
  onSave,
  itemData = null,
  customizationData = null, // Contains selection_type, min_selection, max_selection
}) => {
  const { showToast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [addons, setAddons] = useState([]);
  const [selectedAddons, setSelectedAddons] = useState(new Set());
  const [isLoadingAddons, setIsLoadingAddons] = useState(false);
  const [isLinking, setIsLinking] = useState(false);

  // Fetch add-ons from API
  const fetchAddons = useCallback(async () => {
    setIsLoadingAddons(true);
    try {
      const url = `${API_BASE_URL}v1/catalog/addons`;
      console.log('📡 [AddOnsSelectionScreen] Fetching add-ons from:', url);

      const response = await fetchWithAuth(url, {
        method: 'GET',
      });

      const data = await response.json();
      console.log('📥 [AddOnsSelectionScreen] Add-ons API Response:', JSON.stringify(data, null, 2));

      if (response.ok && (data.code === 200 || data.code === 201) && data.status === 'success') {
        const mappedAddons = (data.data || []).map((addon) => ({
          id: addon.id,
          name: addon.name || '',
          price: addon.additional_price || 0,
          isVeg: addon.item_type === 'VEG',
          item_type: addon.item_type || 'VEG',
        }));

        setAddons(mappedAddons);
        console.log(`✅ [AddOnsSelectionScreen] Loaded ${mappedAddons.length} add-ons`);
      } else {
        const errorMessage = data.message || data.error || 'Failed to fetch add-ons';
        console.error('❌ [AddOnsSelectionScreen] Failed to fetch add-ons:', errorMessage);
        showToast(errorMessage, 'error');
      }
    } catch (error) {
      console.error('❌ [AddOnsSelectionScreen] Error fetching add-ons:', error);
      showToast('Failed to fetch add-ons', 'error');
    } finally {
      setIsLoadingAddons(false);
    }
  }, [showToast]);

  // Fetch add-ons on mount
  useEffect(() => {
    fetchAddons();
  }, [fetchAddons]);

  // Pre-select add-ons that are already linked to the item
  useEffect(() => {
    if (itemData && itemData.add_ons && Array.isArray(itemData.add_ons) && addons.length > 0) {
      const linkedAddonIds = new Set(
        itemData.add_ons.map((linkedAddon) => linkedAddon.add_on_id || linkedAddon.id)
      );
      setSelectedAddons(linkedAddonIds);
      console.log('✅ [AddOnsSelectionScreen] Pre-selected linked add-ons:', Array.from(linkedAddonIds));
      console.log('✅ [AddOnsSelectionScreen] Item add_ons:', JSON.stringify(itemData.add_ons, null, 2));
    }
  }, [itemData, addons]);

  // Filter add-ons based on search query
  const filteredAddons = addons.filter((addon) =>
    addon.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Toggle add-on selection
  const toggleAddonSelection = (addonId) => {
    setSelectedAddons((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(addonId)) {
        newSet.delete(addonId);
      } else {
        newSet.add(addonId);
      }
      return newSet;
    });
  };

  // Link selected add-ons to item
  const handleLinkAddons = async () => {
    if (!itemData || !itemData.id) {
      showToast('Item data is missing', 'error');
      return;
    }

    if (selectedAddons.size === 0) {
      showToast('Please select at least one add-on', 'error');
      return;
    }

    if (!customizationData) {
      showToast('Customization settings are missing', 'error');
      return;
    }

    setIsLinking(true);
    try {
      const itemId = itemData.id;
      const url = `${API_BASE_URL}v1/catalog/items/${itemId}/addons`;
      console.log('📡 [AddOnsSelectionScreen] Linking add-ons to item:', url);

      // Prepare request body
      // Ensure all values match API expectations:
      // - selection_type: "OPTIONAL" or "MANDATORY" (try MANDATORY first, fallback to OPTIONAL if needed)
      // - max_selection: must be a number (not null)
      const requestBody = Array.from(selectedAddons).map((addonId) => {
        // Ensure max_selection is always a number
        // If null (unlimited), use a large number to represent unlimited selection
        let maxSelection = customizationData.max_selection;
        if (maxSelection === null || maxSelection === undefined || isNaN(maxSelection)) {
          // Use a large number to represent unlimited
          maxSelection = 999; // Large number representing unlimited
        }
        
        // Ensure min_selection is a valid number
        const minSelection = customizationData.min_selection !== undefined && 
                            customizationData.min_selection !== null
                            ? Number(customizationData.min_selection)
                            : 0;
        
        // Based on API example, selection_type should be "OPTIONAL"
        // Mandatory selection is controlled by min_selection > 0
        // The API might only accept "OPTIONAL" as the selection_type value
        const selectionType = 'OPTIONAL'; // Always use OPTIONAL as per API example
        
        const payload = {
          add_on_id: String(addonId), // Ensure it's a string
          selection_type: selectionType,
          min_selection: Number(minSelection),
          max_selection: Number(maxSelection),
        };
        
        console.log('📤 [AddOnsSelectionScreen] Prepared payload for addon:', addonId, payload);
        return payload;
      });

      console.log('📤 [AddOnsSelectionScreen] Request body:', JSON.stringify(requestBody, null, 2));
      console.log('📤 [AddOnsSelectionScreen] Item ID:', itemId);
      console.log('📤 [AddOnsSelectionScreen] Customization data:', JSON.stringify(customizationData, null, 2));

      const response = await fetchWithAuth(url, {
        method: 'POST',
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();
      console.log('📥 [AddOnsSelectionScreen] Link Add-ons API Response Status:', response.status);
      console.log('📥 [AddOnsSelectionScreen] Link Add-ons API Response:', JSON.stringify(data, null, 2));

      if (response.ok && data.code === 200 && data.status === 'success') {
        showToast('Add-ons linked successfully', 'success');
        if (onSave) {
          onSave(data.data); // Pass the updated item data
        }
        onBack();
      } else {
        // Enhanced error logging
        const errorMessage = data.message || data.error || 'Failed to link add-ons';
        console.error('❌ [AddOnsSelectionScreen] Failed to link add-ons');
        console.error('❌ [AddOnsSelectionScreen] Status:', response.status);
        console.error('❌ [AddOnsSelectionScreen] Error message:', errorMessage);
        console.error('❌ [AddOnsSelectionScreen] Full response:', JSON.stringify(data, null, 2));
        console.error('❌ [AddOnsSelectionScreen] Request that failed:', JSON.stringify(requestBody, null, 2));
        showToast(errorMessage, 'error');
      }
    } catch (error) {
      console.error('❌ [AddOnsSelectionScreen] Error linking add-ons:', error);
      showToast('Failed to link add-ons', 'error');
    } finally {
      setIsLinking(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <View style={styles.headerBackground}>
        <CustomHeader title="Select Add-ons" onBack={onBack} />
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search add-on name"
          placeholderTextColor="#999"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* Add-ons List */}
      {isLoadingAddons ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF6E1A" />
          <Text style={styles.loadingText}>Loading add-ons...</Text>
        </View>
      ) : filteredAddons.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No add-ons found</Text>
          <Text style={styles.emptySubText}>
            {searchQuery ? 'Try a different search term' : 'No add-ons available'}
          </Text>
        </View>
      ) : (
        <ScrollView
          style={styles.addonsList}
          contentContainerStyle={styles.addonsListContent}
          showsVerticalScrollIndicator={false}
        >
          {filteredAddons.map((addon) => {
            const isSelected = selectedAddons.has(addon.id);
            return (
              <TouchableOpacity
                key={addon.id}
                style={styles.addonItem}
                onPress={() => toggleAddonSelection(addon.id)}
                activeOpacity={0.7}
              >
                <View style={styles.addonItemLeft}>
                  <View
                    style={[
                      styles.vegIndicator,
                      addon.isVeg ? styles.vegIndicatorGreen : styles.vegIndicatorOrange,
                    ]}
                  >
                    <View style={styles.vegDot} />
                  </View>
                  <Text style={styles.addonName}>{addon.name}</Text>
                </View>
                <View style={styles.addonItemRight}>
                  <Text style={styles.addonPrice}>₹{addon.price}</Text>
                  <View
                    style={[
                      styles.checkbox,
                      isSelected && styles.checkboxChecked,
                    ]}
                  >
                    {isSelected && <Text style={styles.checkmark}>✓</Text>}
                  </View>
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}

      {/* Save Button */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.saveButton, (isLinking || selectedAddons.size === 0) && styles.saveButtonDisabled]}
          onPress={handleLinkAddons}
          disabled={isLinking || selectedAddons.size === 0}
          activeOpacity={0.7}
        >
          {isLinking ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.saveButtonText}>
              Save ({selectedAddons.size} selected)
            </Text>
          )}
        </TouchableOpacity>
      </View>
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
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    paddingLeft: 16,
    paddingRight: 12,
    marginHorizontal: 20,
    marginTop: 20,
    marginBottom: 16,
    height: 48,
  },
  searchInput: {
    flex: 1,
    fontFamily: Poppins.regular,
    fontSize: 14,
    color: '#000000',
    paddingVertical: 0,
    paddingRight: 8,
  },
  addonsList: {
    flex: 1,
  },
  addonsListContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  addonItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  addonItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  addonItemRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  vegIndicator: {
    width: 20,
    height: 20,
    borderRadius: 4,
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  vegIndicatorGreen: {
    backgroundColor: '#4CAF50',
  },
  vegIndicatorOrange: {
    backgroundColor: '#FF6E1A',
  },
  vegDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FFFFFF',
  },
  addonName: {
    fontFamily: Poppins.regular,
    fontSize: 14,
    color: '#000000',
    flex: 1,
  },
  addonPrice: {
    fontFamily: Poppins.regular,
    fontSize: 14,
    color: '#000000',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#CCCCCC',
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#FF6E1A',
    borderColor: '#FF6E1A',
  },
  checkmark: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: Poppins.semiBold,
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
    marginTop: 12,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontFamily: Poppins.semiBold,
    fontSize: 16,
    color: '#000000',
    marginBottom: 8,
  },
  emptySubText: {
    fontFamily: Poppins.regular,
    fontSize: 14,
    color: '#666666',
    textAlign: 'center',
  },
  buttonContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  saveButton: {
    backgroundColor: '#FF6E1A',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 46,
  },
  saveButtonDisabled: {
    backgroundColor: '#CCCCCC',
    opacity: 0.6,
  },
  saveButtonText: {
    fontFamily: Poppins.semiBold,
    fontSize: 16,
    color: '#FFFFFF',
  },
});

export default AddOnsSelectionScreen;
