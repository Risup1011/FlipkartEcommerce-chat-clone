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
} from 'react-native';
import { Poppins } from '../assets';
import CustomHeader from './CustomHeader';
import CustomDropdown from './CustomDropdown';
import AddOnsSelectionScreen from './AddOnsSelectionScreen';
import { fetchWithAuth } from '../utils/apiHelpers';
import { API_BASE_URL } from '../config';
import { useToast } from './ToastContext';

const AddAddonsScreen = ({ onBack, onSave, onNavigate, addonType = 'ADD_ONS', addonTitle = 'Add-ons', itemData = null, onItemDataUpdate = null }) => {
  const { showToast } = useToast();
  const [customizationTitle, setCustomizationTitle] = useState(addonTitle);
  const [isCompulsory, setIsCompulsory] = useState(true);
  const [minSelection, setMinSelection] = useState('');
  const [maxSelection, setMaxSelection] = useState('All');
  const [showAddOnsSelection, setShowAddOnsSelection] = useState(false);
  const [linkedAddons, setLinkedAddons] = useState([]);
  const [isRemoving, setIsRemoving] = useState(false);
  const [allAddons, setAllAddons] = useState([]); // Store all add-ons to get prices

  const minSelectionOptions = ['0', '1', '2', '3', '4', '5'];
  const maxSelectionOptions = ['All', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10'];

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

  // Get linked add-ons from itemData
  useEffect(() => {
    if (itemData && itemData.add_ons && Array.isArray(itemData.add_ons)) {
      // Enrich linked add-ons with price information from allAddons
      const enrichedLinkedAddons = itemData.add_ons.map((linkedAddon) => {
        const addonDetails = allAddons.find((addon) => addon.id === linkedAddon.add_on_id);
        return {
          ...linkedAddon,
          additional_price: linkedAddon.additional_price || addonDetails?.additional_price || 0,
        };
      });
      setLinkedAddons(enrichedLinkedAddons);
      console.log('📋 [AddAddonsScreen] Loaded linked add-ons:', enrichedLinkedAddons);
    } else {
      setLinkedAddons([]);
    }
  }, [itemData, allAddons]);

  // Handle remove/unlink add-on
  const handleRemoveAddon = async (addonId) => {
    if (!itemData || !itemData.id) {
      showToast('Item data is missing', 'error');
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
        showToast('Add-on removed successfully', 'success');
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
        showToast(errorMessage, 'error');
      }
    } catch (error) {
      console.error('❌ [AddAddonsScreen] Error removing add-on:', error);
      showToast('Failed to remove add-on', 'error');
    } finally {
      setIsRemoving(false);
    }
  };


  // Show AddOnsSelectionScreen when navigating to add-ons selection
  if (showAddOnsSelection) {
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
        itemData={itemData}
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
            Title of customization<Text style={styles.asterisk}> *</Text>
          </Text>
          <TextInput
            style={styles.titleInput}
            placeholder="Enter customization title"
            placeholderTextColor="#999"
            value={customizationTitle}
            onChangeText={setCustomizationTitle}
          />
        </View>

        {/* Customization Behaviors */}
        <View style={styles.section}>
          <Text style={styles.label}>
            Customization behaviors<Text style={styles.asterisk}> *</Text>
          </Text>
          <View style={styles.behaviorsContainer}>
            <Text style={styles.behaviorLabel}>Customer selection is</Text>
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
                  Compulsory
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
                  Optional
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.selectionRow}>
              <View style={styles.selectionField}>
                <Text style={styles.selectionLabel}>Min selection</Text>
                <CustomDropdown
                  value={minSelection}
                  onSelect={setMinSelection}
                  placeholder="Select"
                  options={minSelectionOptions}
                />
              </View>

              <View style={styles.selectionField}>
                <Text style={styles.selectionLabel}>Max selection</Text>
                <CustomDropdown
                  value={maxSelection}
                  onSelect={setMaxSelection}
                  placeholder="Select"
                  options={maxSelectionOptions}
                />
              </View>
            </View>
          </View>
        </View>

        {/* Add Options Section */}
        <View style={styles.section}>
          <Text style={styles.label}>
            Add Options<Text style={styles.asterisk}> *</Text>
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
              <Text style={styles.addOptionsTitle}>Add Options To This Item</Text>
              <Text style={styles.addOptionsDescription}>
                Select options to add and configure.
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
                    <View style={styles.vegIndicatorGreen}>
                      <View style={styles.vegDot} />
                    </View>
                    <View style={styles.linkedAddonInfo}>
                      <Text style={styles.linkedAddonName}>{linkedAddon.add_on_name || 'Unknown'}</Text>
                      <TouchableOpacity
                        onPress={() => handleRemoveAddon(addonId)}
                        disabled={isRemoving}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.removeButtonText}>Remove</Text>
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

        {/* Go to Menu Screen Button */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={styles.menuButton}
            onPress={onBack}
            activeOpacity={0.7}
          >
            <Text style={styles.menuButtonText}>Go to Menu Screen</Text>
          </TouchableOpacity>
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
  },
  menuButton: {
    width: '100%',
    backgroundColor: '#FF6E1A',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 46,
  },
  menuButtonText: {
    fontFamily: Poppins.semiBold,
    fontSize: 16,
    color: '#FFFFFF',
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
