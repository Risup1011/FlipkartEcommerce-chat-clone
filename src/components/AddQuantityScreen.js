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
  Alert,
} from 'react-native';
import { Poppins } from '../assets';
import CustomHeader from './CustomHeader';
import CustomDropdown from './CustomDropdown';
import { fetchWithAuth } from '../utils/apiHelpers';
import { API_BASE_URL } from '../config';
import { useToast } from './ToastContext';

const AddQuantityScreen = ({ onBack, onSave, onDelete: onDeleteCallback, variantType = 'QUANTITY', variantTitle = 'Quantity', itemData = null, configData = null }) => {
  const { showToast } = useToast();
  const [variantOptions, setVariantOptions] = useState([
    {
      id: Date.now(),
      name: '',
      itemType: 'VEG',
      itemPrice: '',
      additionalPrice: '',
      isDefault: true,
    },
  ]);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [existingVariantId, setExistingVariantId] = useState(null); // Track if we're editing an existing variant
  const [variantSettings, setVariantSettings] = useState({
    is_mandatory: true,
    min_selection: 1,
    max_selection: 1,
  }); // Store variant settings from existing variant or config

  const itemTypeOptions = ['VEG', 'NON_VEG'];

  // Prefill variant data if editing existing variant
  useEffect(() => {
    console.log('🔍 [AddQuantityScreen] Prefill check - itemData:', itemData ? JSON.stringify(itemData, null, 2) : 'null');
    console.log('🔍 [AddQuantityScreen] Prefill check - variantType:', variantType);
    
    if (itemData && itemData.variants && Array.isArray(itemData.variants)) {
      console.log('🔍 [AddQuantityScreen] Variants array found:', itemData.variants.length, 'variants');
      console.log('🔍 [AddQuantityScreen] Variants:', JSON.stringify(itemData.variants, null, 2));
      
      // Find variant that matches the current variantType
      const existingVariant = itemData.variants.find(
        (variant) => variant.variant_type === variantType
      );
      
      console.log('🔍 [AddQuantityScreen] Matching variant found:', existingVariant ? 'YES' : 'NO');

      if (existingVariant && existingVariant.options && existingVariant.options.length > 0) {
        console.log('📋 [AddQuantityScreen] Found existing variant:', existingVariant);
        setExistingVariantId(existingVariant.variant_id || existingVariant.id || null);
        
        // Store variant settings from existing variant (backend dynamic)
        setVariantSettings({
          is_mandatory: existingVariant.is_mandatory !== undefined ? existingVariant.is_mandatory : true,
          min_selection: existingVariant.min_selection !== undefined ? existingVariant.min_selection : 1,
          max_selection: existingVariant.max_selection !== undefined ? existingVariant.max_selection : 1,
        });
        
        // Map API variant options to component state format
        // Handle both old format (name, item_type, item_price) and new format (option_name, is_veg, base_price)
        const prefilledOptions = existingVariant.options.map((option, index) => ({
          id: option.option_id || option.id || Date.now() + index,
          optionId: option.option_id || null, // Store API option_id for updates
          name: option.option_name || option.name || '',
          itemType: option.is_veg !== undefined ? (option.is_veg ? 'VEG' : 'NON_VEG') : (option.item_type || 'VEG'),
          itemPrice: (option.base_price !== undefined ? option.base_price : option.item_price) ? 
                     (option.base_price !== undefined ? option.base_price : option.item_price).toString() : '',
          additionalPrice: option.additional_price ? option.additional_price.toString() : '',
          isDefault: option.is_default || false,
        }));

        // Ensure at least one option is marked as default
        const hasDefault = prefilledOptions.some((opt) => opt.isDefault);
        if (!hasDefault && prefilledOptions.length > 0) {
          prefilledOptions[0].isDefault = true;
        }

        setVariantOptions(prefilledOptions);
        console.log('✅ [AddQuantityScreen] Prefilled variant options:', prefilledOptions);
        
        const settingsFromBackend = {
          is_mandatory: existingVariant.is_mandatory !== undefined ? existingVariant.is_mandatory : true,
          min_selection: existingVariant.min_selection !== undefined ? existingVariant.min_selection : 1,
          max_selection: existingVariant.max_selection !== undefined ? existingVariant.max_selection : 1,
        };
        console.log('✅ [AddQuantityScreen] Variant settings from backend:', settingsFromBackend);
      } else {
        // No existing variant found, reset to default
        setExistingVariantId(null);
        // Use defaults from config API if available, otherwise use sensible defaults
        const defaultSettings = configData?.variant_config?.default_settings || {};
        setVariantSettings({
          is_mandatory: defaultSettings.is_mandatory !== undefined ? defaultSettings.is_mandatory : true,
          min_selection: defaultSettings.min_selection !== undefined ? defaultSettings.min_selection : 1,
          max_selection: defaultSettings.max_selection !== undefined ? defaultSettings.max_selection : 1,
        });
        setVariantOptions([
          {
            id: Date.now(),
            name: '',
            itemType: 'VEG',
            itemPrice: '',
            additionalPrice: '',
            isDefault: true,
          },
        ]);
      }
    } else {
      // No itemData or no variants array, reset to default
      setExistingVariantId(null);
      // Use defaults from config API if available
      const defaultSettings = configData?.variant_config?.default_settings || {};
      setVariantSettings({
        is_mandatory: defaultSettings.is_mandatory !== undefined ? defaultSettings.is_mandatory : true,
        min_selection: defaultSettings.min_selection !== undefined ? defaultSettings.min_selection : 1,
        max_selection: defaultSettings.max_selection !== undefined ? defaultSettings.max_selection : 1,
      });
      setVariantOptions([
        {
          id: Date.now(),
          name: '',
          itemType: 'VEG',
          itemPrice: '',
          additionalPrice: '',
          isDefault: true,
        },
      ]);
    }
  }, [itemData, variantType, configData]);

  const calculateFinalPrice = (itemPrice, additionalPrice) => {
    const item = parseFloat(itemPrice) || 0;
    const additional = parseFloat(additionalPrice) || 0;
    return item + additional;
  };

  const handleAddOption = () => {
    setVariantOptions([
      ...variantOptions,
      {
        id: Date.now(),
        name: '',
        itemType: 'VEG',
        itemPrice: '',
        additionalPrice: '',
        isDefault: false,
      },
    ]);
  };

  const handleRemoveOption = async (id) => {
    const filtered = variantOptions.filter((opt) => opt.id !== id);
    // Ensure at least one option remains
    if (filtered.length === 0) {
      showToast('At least one variant option is required', 'error');
      return;
    }

    // If we removed the default, make the first one default
    const hadDefault = variantOptions.find((opt) => opt.id === id)?.isDefault;
    if (hadDefault && filtered.length > 0) {
      filtered[0].isDefault = true;
    }

    // Store original state for potential rollback
    const originalOptions = [...variantOptions];

    // Update local state immediately for better UX
    setVariantOptions(filtered);

    // If editing an existing variant, update via API
    if (existingVariantId && itemData && itemData.id) {
      const success = await updateVariantOnRemove(filtered);
      if (!success) {
        // Revert to original state on error
        setVariantOptions(originalOptions);
      }
    }
  };

  const updateVariantOnRemove = async (updatedOptions) => {
    try {
      const itemId = itemData.id;
      const url = `${API_BASE_URL}v1/catalog/items/${itemId}/variants/${existingVariantId}`;
      
      // Prepare API payload with updated options (without the removed one)
      // Use variant settings from state (which came from existing variant or config)
      const apiPayload = {
        variant_type: variantType, // Required by API
        variant_group_name: variantTitle,
        is_mandatory: variantSettings.is_mandatory, // From existing variant or config API
        min_selection: variantSettings.min_selection, // From existing variant or config API
        max_selection: variantSettings.max_selection, // From existing variant or config API
        options: updatedOptions.map((opt) => ({
          option_name: opt.name.trim(),
          base_price: parseFloat(opt.itemPrice) || 0,
          additional_price: parseFloat(opt.additionalPrice) || 0,
          is_veg: opt.itemType === 'VEG',
        })),
      };

      console.log('📡 [AddQuantityScreen] Updating variant after option removal:', url);
      console.log('📤 [AddQuantityScreen] Updated Variant Data:', JSON.stringify(apiPayload, null, 2));

      const response = await fetchWithAuth(url, {
        method: 'PUT',
        body: JSON.stringify(apiPayload),
      });

      const data = await response.json();
      console.log('📥 [AddQuantityScreen] Update Variant API Response:', JSON.stringify(data, null, 2));

      if (response.ok && (data.code === 200 || data.status === 'success')) {
        console.log('✅ [AddQuantityScreen] Variant updated successfully after option removal');
        return true; // Success
      } else {
        const errorMessage = data.message || data.error || 'Failed to update variant';
        console.error('❌ [AddQuantityScreen] Failed to update variant:', errorMessage);
        showToast('Failed to remove option. Please try again.', 'error');
        return false; // Failure
      }
    } catch (error) {
      console.error('❌ [AddQuantityScreen] Error updating variant:', error);
      showToast('Failed to remove option. Please try again.', 'error');
      return false; // Failure
    }
  };

  const handleSetDefault = (id) => {
    setVariantOptions(
      variantOptions.map((opt) => ({
        ...opt,
        isDefault: opt.id === id,
      }))
    );
  };

  const handleUpdateOption = (id, field, value) => {
    setVariantOptions(
      variantOptions.map((opt) =>
        opt.id === id ? { ...opt, [field]: value } : opt
      )
    );
  };

  const handleSavePress = async () => {
    // Validation
    const hasEmptyNames = variantOptions.some((opt) => !opt.name.trim());
    if (hasEmptyNames) {
      showToast('Please enter a name for all variant options', 'error');
      return;
    }

    const hasInvalidPrices = variantOptions.some((opt) => {
      const basePrice = parseFloat(opt.itemPrice);
      const additionalPrice = parseFloat(opt.additionalPrice);
      return (
        !opt.itemPrice || 
        opt.itemPrice.trim() === '' || 
        isNaN(basePrice) || 
        basePrice < 0 ||
        isNaN(additionalPrice) ||
        additionalPrice < 0
      );
    });
    if (hasInvalidPrices) {
      showToast('Please enter valid prices (numbers >= 0) for all variant options', 'error');
      return;
    }

    // Check if itemData and itemId are available
    if (!itemData || !itemData.id) {
      showToast('Item data is missing. Please save the item first.', 'error');
      return;
    }

    // Validate variant title
    if (!variantTitle || variantTitle.trim() === '') {
      showToast('Variant title is required', 'error');
      return;
    }

    setIsSaving(true);
    try {
      const itemId = itemData.id;
      
      // Determine if we're updating an existing variant or creating a new one
      const isUpdating = existingVariantId !== null;
      const url = isUpdating
        ? `${API_BASE_URL}v1/catalog/items/${itemId}/variants/${existingVariantId}`
        : `${API_BASE_URL}v1/catalog/items/${itemId}/variants`;
      
      // Prepare API payload - new format
      // Filter out any options with empty names and ensure all prices are valid numbers
      const validOptions = variantOptions
        .filter((opt) => opt.name && opt.name.trim().length > 0)
        .map((opt) => {
          const basePriceStr = String(opt.itemPrice || '').trim();
          const additionalPriceStr = String(opt.additionalPrice || '').trim();
          
          const basePrice = parseFloat(basePriceStr);
          const additionalPrice = parseFloat(additionalPriceStr) || 0;
          
          // Ensure base_price is a valid positive number
          if (basePriceStr === '' || isNaN(basePrice) || basePrice < 0) {
            throw new Error(`Invalid base price for option: ${opt.name || 'Unknown'}`);
          }
          
          // Ensure additional_price is valid (can be 0)
          if (additionalPriceStr !== '' && (isNaN(additionalPrice) || additionalPrice < 0)) {
            throw new Error(`Invalid additional price for option: ${opt.name || 'Unknown'}`);
          }
          
          return {
            option_name: opt.name.trim(),
            base_price: Number(basePrice.toFixed(2)), // Ensure proper number format
            additional_price: Number(Math.max(0, additionalPrice).toFixed(2)), // Ensure non-negative and proper format
            is_veg: opt.itemType === 'VEG',
          };
        });

      // Ensure we have at least one valid option
      if (validOptions.length === 0) {
        showToast('At least one valid variant option is required', 'error');
        setIsSaving(false);
        return;
      }

      const apiPayload = {
        variant_type: variantType, // Required by API
        variant_group_name: variantTitle.trim(),
        is_mandatory: variantSettings.is_mandatory, // From existing variant or config API
        min_selection: variantSettings.min_selection, // From existing variant or config API
        max_selection: variantSettings.max_selection, // From existing variant or config API
        options: validOptions,
      };

      console.log(`📡 [AddQuantityScreen] ${isUpdating ? 'Updating' : 'Creating'} variant:`, url);
      console.log('📤 [AddQuantityScreen] Variant Data:', JSON.stringify(apiPayload, null, 2));

      const response = await fetchWithAuth(url, {
        method: isUpdating ? 'PUT' : 'POST',
        body: JSON.stringify(apiPayload),
      });

      const data = await response.json();
      console.log('📥 [AddQuantityScreen] Create Variant API Response:', JSON.stringify(data, null, 2));
      console.log('📥 [AddQuantityScreen] Response Status:', response.status);
      console.log('📥 [AddQuantityScreen] Response OK:', response.ok);

      if (response.ok && (data.code === 200 || data.code === 201) && data.status === 'success') {
        showToast(`Variant ${isUpdating ? 'updated' : 'created'} successfully`, 'success');
        
        // Call onSave callback with variant data if provided
        if (onSave) {
          const variantData = {
            variantType,
            variantTitle,
            options: variantOptions.map((opt) => ({
              name: opt.name.trim(),
              item_type: opt.itemType,
              item_price: parseFloat(opt.itemPrice) || 0,
              additional_price: parseFloat(opt.additionalPrice) || 0,
              final_price: calculateFinalPrice(opt.itemPrice, opt.additionalPrice),
              is_default: opt.isDefault,
            })),
          };
          onSave(variantData);
        }
        
        onBack();
      } else {
        const errorMessage = data.message || data.error || 'Failed to create variant';
        console.error('❌ [AddQuantityScreen] Failed to create variant:', errorMessage);
        console.error('❌ [AddQuantityScreen] Full error response:', JSON.stringify(data, null, 2));
        console.error('❌ [AddQuantityScreen] Request payload that failed:', JSON.stringify(apiPayload, null, 2));
        
        // Show more detailed error if available
        let displayMessage = errorMessage;
        if (data.errors && Array.isArray(data.errors)) {
          displayMessage = data.errors.join(', ');
        } else if (data.error && typeof data.error === 'object') {
          displayMessage = JSON.stringify(data.error);
        }
        
        showToast(displayMessage, 'error');
      }
    } catch (error) {
      console.error('❌ [AddQuantityScreen] Error creating variant:', error);
      showToast('Failed to create variant. Please try again.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    // Only allow deletion if we're editing an existing variant
    if (!existingVariantId) {
      showToast('No variant to delete. This is a new variant.', 'error');
      return;
    }

    if (!itemData || !itemData.id) {
      showToast('Item data is missing', 'error');
      return;
    }

    // Show confirmation dialog
    Alert.alert(
      'Delete Variant',
      `Are you sure you want to delete the "${variantTitle}" variant? This action cannot be undone.`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: deleteVariant,
        },
      ]
    );
  };

  const deleteVariant = async () => {
    setIsDeleting(true);
    try {
      const itemId = itemData.id;
      const url = `${API_BASE_URL}v1/catalog/items/${itemId}/variants/${existingVariantId}`;
      
      console.log('📡 [AddQuantityScreen] Deleting variant:', url);

      const response = await fetchWithAuth(url, {
        method: 'DELETE',
      });

      const data = await response.json();
      console.log('📥 [AddQuantityScreen] Delete Variant API Response:', JSON.stringify(data, null, 2));

      if (response.ok && (data.code === 200 || data.status === 'success')) {
        showToast('Variant deleted successfully', 'success');
        // Call onDelete callback to refresh categories before navigating back
        if (onDeleteCallback) {
          await onDeleteCallback();
        }
        onBack();
      } else {
        const errorMessage = data.message || data.error || 'Failed to delete variant';
        console.error('❌ [AddQuantityScreen] Failed to delete variant:', errorMessage);
        showToast(errorMessage, 'error');
      }
    } catch (error) {
      console.error('❌ [AddQuantityScreen] Error deleting variant:', error);
      showToast('Failed to delete variant. Please try again.', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <View style={styles.headerBackground}>
        <CustomHeader title={`Add ${variantTitle}`} onBack={onBack} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Variant Group Title */}
        <View style={styles.section}>
          <Text style={styles.label}>Title of the variant group</Text>
          <Text style={styles.variantTitle}>{variantTitle}</Text>
        </View>

        {/* Add Variant Options */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Add variant options</Text>

          {variantOptions.map((option, index) => (
            <View key={option.id} style={styles.optionContainer}>
              {/* Radio Button and Option Name */}
              <View style={styles.optionHeader}>
                <TouchableOpacity
                  style={styles.radioButton}
                  onPress={() => handleSetDefault(option.id)}
                  activeOpacity={0.7}
                >
                  <View
                    style={[
                      styles.radioCircle,
                      option.isDefault && styles.radioCircleSelected,
                    ]}
                  >
                    {option.isDefault && <View style={styles.radioInner} />}
                  </View>
                </TouchableOpacity>
                <TextInput
                  style={styles.optionNameInput}
                  placeholder="Option name"
                  placeholderTextColor="#999"
                  value={option.name}
                  onChangeText={(text) =>
                    handleUpdateOption(option.id, 'name', text)
                  }
                />
              </View>

              {/* Item Type Dropdown */}
              <View style={styles.dropdownContainer}>
                <CustomDropdown
                  value={option.itemType}
                  onSelect={(value) =>
                    handleUpdateOption(option.id, 'itemType', value)
                  }
                  placeholder="Select Item Type"
                  options={itemTypeOptions}
                />
              </View>

              {/* Price Fields */}
              <View style={styles.priceRow}>
                <View style={styles.priceField}>
                  <Text style={styles.priceLabel}>Item Price</Text>
                  <View style={styles.priceInputContainer}>
                    <Text style={styles.currencySymbol}>₹</Text>
                    <TextInput
                      style={styles.priceInput}
                      placeholder="0.00"
                      placeholderTextColor="#999"
                      value={option.itemPrice}
                      onChangeText={(text) =>
                        handleUpdateOption(option.id, 'itemPrice', text)
                      }
                      keyboardType="decimal-pad"
                    />
                  </View>
                </View>

                <Text style={styles.plusSign}>+</Text>

                <View style={styles.priceField}>
                  <Text style={styles.priceLabel}>Additional Price</Text>
                  <View style={styles.priceInputContainer}>
                    <Text style={styles.currencySymbol}>₹</Text>
                    <TextInput
                      style={styles.priceInput}
                      placeholder="0.00"
                      placeholderTextColor="#999"
                      value={option.additionalPrice}
                      onChangeText={(text) =>
                        handleUpdateOption(option.id, 'additionalPrice', text)
                      }
                      keyboardType="decimal-pad"
                    />
                  </View>
                </View>
              </View>

              {/* Final Price */}
              <View style={styles.finalPriceContainer}>
                <Text style={styles.equalsSign}>=</Text>
                <View style={styles.finalPriceField}>
                  <Text style={styles.priceLabel}>Final Price</Text>
                  <Text style={styles.finalPriceValue}>
                    ₹{calculateFinalPrice(option.itemPrice, option.additionalPrice).toFixed(2)}
                  </Text>
                </View>
              </View>

              {/* Default Option Label */}
              {option.isDefault && (
                <Text style={styles.defaultLabel}>(Default Option)</Text>
              )}

              {/* Remove Button */}
              {!option.isDefault && (
                <TouchableOpacity
                  style={styles.removeButton}
                  onPress={() => handleRemoveOption(option.id)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.removeButtonText}>REMOVE</Text>
                </TouchableOpacity>
              )}
            </View>
          ))}

          {/* Add More Option Button */}
          <TouchableOpacity
            style={styles.addMoreButton}
            onPress={handleAddOption}
            activeOpacity={0.7}
          >
            <Text style={styles.addMoreButtonText}>ADD MORE OPTION</Text>
          </TouchableOpacity>
        </View>

        {/* Delete and Save Buttons */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.deleteButton, isDeleting && styles.deleteButtonDisabled]}
            onPress={handleDelete}
            activeOpacity={0.7}
            disabled={isDeleting || !existingVariantId}
          >
            {isDeleting ? (
              <ActivityIndicator color="#000000" />
            ) : (
              <Text style={styles.deleteButtonText}>Delete</Text>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
            onPress={handleSavePress}
            activeOpacity={0.7}
            disabled={isSaving}
          >
            {isSaving ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.saveButtonText}>Save</Text>
            )}
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
    color: '#666666',
    marginBottom: 8,
  },
  variantTitle: {
    fontFamily: Poppins.semiBold,
    fontSize: 20,
    color: '#000000',
    marginBottom: 8,
  },
  sectionTitle: {
    fontFamily: Poppins.semiBold,
    fontSize: 18,
    color: '#000000',
    marginBottom: 20,
  },
  optionContainer: {
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  optionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  radioButton: {
    marginRight: 12,
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#666666',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioCircleSelected: {
    borderColor: '#FF6E1A',
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#FF6E1A',
  },
  optionNameInput: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontFamily: Poppins.regular,
    fontSize: 14,
    color: '#000000',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  dropdownContainer: {
    marginBottom: 16,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 12,
    gap: 12,
  },
  priceField: {
    flex: 1,
  },
  priceLabel: {
    fontFamily: Poppins.regular,
    fontSize: 12,
    color: '#666666',
    marginBottom: 6,
  },
  priceInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    paddingHorizontal: 12,
    minHeight: 48,
  },
  currencySymbol: {
    fontFamily: Poppins.regular,
    fontSize: 14,
    color: '#000000',
    marginRight: 6,
  },
  priceInput: {
    flex: 1,
    fontFamily: Poppins.regular,
    fontSize: 14,
    color: '#000000',
    paddingVertical: 12,
  },
  plusSign: {
    fontFamily: Poppins.semiBold,
    fontSize: 18,
    color: '#000000',
    marginBottom: 6,
  },
  finalPriceContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 8,
  },
  equalsSign: {
    fontFamily: Poppins.semiBold,
    fontSize: 18,
    color: '#000000',
    marginRight: 12,
    marginBottom: 6,
  },
  finalPriceField: {
    flex: 1,
  },
  finalPriceValue: {
    fontFamily: Poppins.semiBold,
    fontSize: 16,
    color: '#000000',
  },
  defaultLabel: {
    fontFamily: Poppins.regular,
    fontSize: 12,
    color: '#666666',
    fontStyle: 'italic',
    marginTop: 4,
  },
  removeButton: {
    alignSelf: 'flex-end',
    marginTop: 8,
  },
  removeButtonText: {
    fontFamily: Poppins.medium,
    fontSize: 14,
    color: '#0066CC',
  },
  addMoreButton: {
    alignSelf: 'flex-start',
    marginTop: 8,
  },
  addMoreButtonText: {
    fontFamily: Poppins.medium,
    fontSize: 14,
    color: '#0066CC',
  },
  buttonContainer: {
    flexDirection: 'row',
    marginTop: 20,
    marginBottom: 10,
    gap: 12,
  },
  deleteButton: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#000000',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 46,
  },
  deleteButtonText: {
    fontFamily: Poppins.semiBold,
    fontSize: 16,
    color: '#000000',
  },
  deleteButtonDisabled: {
    opacity: 0.6,
  },
  saveButton: {
    flex: 1,
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
});

export default AddQuantityScreen;
