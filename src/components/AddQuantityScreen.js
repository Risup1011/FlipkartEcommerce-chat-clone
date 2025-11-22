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
  // For CUSTOM variants, start with empty string if new, otherwise use variantTitle
  const [editableVariantTitle, setEditableVariantTitle] = useState(
    variantType === 'CUSTOM' ? '' : variantTitle
  ); // Editable title for CUSTOM variants

  const itemTypeOptions = ['VEG', 'NON_VEG'];

  // Get UI labels from config with fallbacks
  const getUILabel = (key, fallback) => {
    return configData?.variant_screen_labels?.[key] || 
           configData?.ui_labels?.[key] || 
           fallback;
  };

  // Prefill variant data if editing existing variant
  useEffect(() => {
    console.log('🔍 [AddQuantityScreen] Prefill check - itemData:', itemData ? JSON.stringify(itemData, null, 2) : 'null');
    console.log('🔍 [AddQuantityScreen] Prefill check - variantType:', variantType);
    
    if (itemData && itemData.variants && Array.isArray(itemData.variants)) {
      console.log('🔍 [AddQuantityScreen] Variants array found:', itemData.variants.length, 'variants');
      console.log('🔍 [AddQuantityScreen] Variants:', JSON.stringify(itemData.variants, null, 2));
      
      // Find variant that matches the current variantType
      // For CUSTOM variants, also check custom_variant_name
      const existingVariant = itemData.variants.find(
        (variant) => {
          if (variantType === 'CUSTOM') {
            return variant.variant_type === 'CUSTOM';
          }
          return variant.variant_type === variantType;
        }
      );
      
      console.log('🔍 [AddQuantityScreen] Matching variant found:', existingVariant ? 'YES' : 'NO');

      if (existingVariant && existingVariant.options && existingVariant.options.length > 0) {
        console.log('📋 [AddQuantityScreen] Found existing variant:', existingVariant);
        setExistingVariantId(existingVariant.variant_id || existingVariant.id || null);
        
        // For CUSTOM variants, use custom_variant_name or variant_group_name as editable title
        if (variantType === 'CUSTOM' && existingVariant) {
          const customTitle = existingVariant.custom_variant_name || existingVariant.variant_group_name || variantTitle;
          setEditableVariantTitle(customTitle);
          console.log('✅ [AddQuantityScreen] Prefilled CUSTOM variant title:', customTitle);
        }
        
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
        // For CUSTOM variants, clear the title so user can type directly
        if (variantType === 'CUSTOM') {
          setEditableVariantTitle('');
        }
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
      // For CUSTOM variants, clear the title so user can type directly
      if (variantType === 'CUSTOM') {
        setEditableVariantTitle('');
      }
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
      const errorMsg = getUILabel('variant_at_least_one_option', 'At least one variant option is required');
      showToast(errorMsg, 'error');
      return;
    }

    // Ensure first option is always default
    if (filtered.length > 0) {
      filtered[0].isDefault = true;
      // Remove default from others
      filtered.forEach((opt, index) => {
        opt.isDefault = index === 0;
      });
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
      const titleToUse = variantType === 'CUSTOM' ? editableVariantTitle : variantTitle;
      const apiPayload = {
        variant_type: variantType, // Required by API
        variant_group_name: titleToUse.trim(),
        ...(variantType === 'CUSTOM' && { custom_variant_name: editableVariantTitle.trim() }),
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
        const errorMsg = getUILabel('variant_remove_option_error', 'Failed to remove option. Please try again.');
        showToast(errorMsg, 'error');
        return false; // Failure
      }
    } catch (error) {
      console.error('❌ [AddQuantityScreen] Error updating variant:', error);
      const errorMsg = getUILabel('variant_remove_option_error', 'Failed to remove option. Please try again.');
      showToast(errorMsg, 'error');
      return false; // Failure
    }
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
      const errorMsg = getUILabel('variant_option_name_required', 'Please enter a name for all variant options');
      showToast(errorMsg, 'error');
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
      const errorMsg = getUILabel('variant_price_required', 'Please enter valid prices (numbers >= 0) for all variant options');
      showToast(errorMsg, 'error');
      return;
    }

    // Check if itemData and itemId are available
    if (!itemData || !itemData.id) {
      const errorMsg = getUILabel('item_data_missing', 'Item data is missing. Please save the item first.');
      showToast(errorMsg, 'error');
      return;
    }

    // Validate variant title - use editable title for CUSTOM variants
    const titleToUse = variantType === 'CUSTOM' ? editableVariantTitle : variantTitle;
    if (!titleToUse || titleToUse.trim() === '') {
      const errorMsg = getUILabel('variant_title_required', 'Variant title is required');
      showToast(errorMsg, 'error');
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
        const errorMsg = getUILabel('variant_at_least_one_option', 'At least one valid variant option is required');
        showToast(errorMsg, 'error');
        setIsSaving(false);
        return;
      }

      // For CUSTOM variants, use custom_variant_name field
      const apiPayload = {
        variant_type: variantType, // Required by API
        variant_group_name: variantType === 'CUSTOM' ? editableVariantTitle.trim() : variantTitle.trim(),
        ...(variantType === 'CUSTOM' && { custom_variant_name: editableVariantTitle.trim() }),
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
        const successMsg = isUpdating 
          ? getUILabel('variant_updated_success', 'Variant updated successfully')
          : getUILabel('variant_created_success', 'Variant created successfully');
        showToast(successMsg, 'success');
        
        // Call onSave callback with variant data if provided
        if (onSave) {
          const titleToUse = variantType === 'CUSTOM' ? editableVariantTitle : variantTitle;
          const variantData = {
            variantType,
            variantTitle: titleToUse,
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
      const errorMsg = getUILabel('variant_create_error', 'Failed to create variant. Please try again.');
      showToast(errorMsg, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    // Only allow deletion if we're editing an existing variant
    if (!existingVariantId) {
      const errorMsg = getUILabel('variant_no_delete_new', 'No variant to delete. This is a new variant.');
      showToast(errorMsg, 'error');
      return;
    }

    if (!itemData || !itemData.id) {
      const errorMsg = getUILabel('item_data_missing', 'Item data is missing');
      showToast(errorMsg, 'error');
      return;
    }

    // Show confirmation dialog
    const deleteTitle = getUILabel('delete_variant_title', 'Delete Variant');
    const deleteMessage = getUILabel('delete_variant_message', `Are you sure you want to delete the "${variantTitle}" variant? This action cannot be undone.`);
    Alert.alert(
      deleteTitle,
      deleteMessage,
      [
        {
          text: getUILabel('cancel_button', 'Cancel'),
          style: 'cancel',
        },
        {
          text: getUILabel('delete_button', 'Delete'),
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
        const successMsg = getUILabel('variant_deleted_success', 'Variant deleted successfully');
        showToast(successMsg, 'success');
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
      const errorMsg = getUILabel('variant_delete_error', 'Failed to delete variant. Please try again.');
      showToast(errorMsg, 'error');
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
          <Text style={styles.label}>
            {getUILabel('variant_group_title_label', 'Title of the variant group')}{variantType === 'CUSTOM' && <Text style={styles.asterisk}> *</Text>}
          </Text>
          {variantType === 'CUSTOM' ? (
            <TextInput
              style={styles.variantTitleInput}
              placeholder={getUILabel('variant_group_title_placeholder', 'Enter variant group title')}
              placeholderTextColor="#999"
              value={editableVariantTitle}
              onChangeText={setEditableVariantTitle}
            />
          ) : (
            <Text style={styles.variantTitle}>{variantTitle}</Text>
          )}
        </View>

        {/* Add Variant Options */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{getUILabel('add_variant_options_label', 'Add variant options')}</Text>

          {variantOptions.map((option, index) => (
            <View key={option.id} style={styles.optionContainer}>
              {/* Option Name */}
              <View style={styles.optionHeader}>
                <TextInput
                  style={styles.optionNameInput}
                  placeholder={getUILabel('option_name_placeholder', 'Option name')}
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
                  placeholder={getUILabel('select_item_type_placeholder', 'Select Item Type')}
                  options={itemTypeOptions}
                />
              </View>

              {/* Price Fields */}
              <View style={styles.priceRow}>
                <View style={styles.priceField}>
                  <Text style={styles.priceLabel}>{getUILabel('item_price_label', 'Item Price')}</Text>
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
                  <Text style={styles.priceLabel}>{getUILabel('additional_price_label', 'Additional Price')}</Text>
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
                  <Text style={styles.priceLabel}>{getUILabel('final_price_label', 'Final Price')}</Text>
                  <Text style={styles.finalPriceValue}>
                    ₹{calculateFinalPrice(option.itemPrice, option.additionalPrice).toFixed(2)}
                  </Text>
                </View>
              </View>

              {/* Remove Button */}
              <TouchableOpacity
                style={styles.removeButton}
                onPress={() => handleRemoveOption(option.id)}
                activeOpacity={0.7}
              >
                <Text style={styles.removeButtonText}>{getUILabel('remove_button', 'REMOVE')}</Text>
              </TouchableOpacity>
            </View>
          ))}

          {/* Add More Option Button */}
          <TouchableOpacity
            style={styles.addMoreButton}
            onPress={handleAddOption}
            activeOpacity={0.7}
          >
            <Text style={styles.addMoreButtonText}>{getUILabel('add_more_option_button', 'ADD MORE OPTION')}</Text>
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
              <Text style={styles.deleteButtonText}>{getUILabel('delete_button', 'Delete')}</Text>
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
              <Text style={styles.saveButtonText}>{getUILabel('save_button', 'Save')}</Text>
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
  variantTitleInput: {
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontFamily: Poppins.semiBold,
    fontSize: 20,
    color: '#000000',
    minHeight: 48,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  asterisk: {
    color: '#FF0000',
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
    marginBottom: 12,
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
