import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { Poppins } from '../assets';
import CustomHeader from './CustomHeader';
import CustomDropdown from './CustomDropdown';

const AddQuantityScreen = ({ onBack, onSave, variantType = 'QUANTITY', variantTitle = 'Quantity', itemData = null }) => {
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

  const itemTypeOptions = ['VEG', 'NON_VEG'];

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

  const handleRemoveOption = (id) => {
    const filtered = variantOptions.filter((opt) => opt.id !== id);
    // Ensure at least one option remains
    if (filtered.length > 0) {
      // If we removed the default, make the first one default
      const hadDefault = variantOptions.find((opt) => opt.id === id)?.isDefault;
      if (hadDefault && filtered.length > 0) {
        filtered[0].isDefault = true;
      }
      setVariantOptions(filtered);
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

  const handleSavePress = () => {
    // Validation
    const hasEmptyNames = variantOptions.some((opt) => !opt.name.trim());
    if (hasEmptyNames) {
      // TODO: Show error toast
      return;
    }

    const hasInvalidPrices = variantOptions.some(
      (opt) => !opt.itemPrice || parseFloat(opt.itemPrice) < 0
    );
    if (hasInvalidPrices) {
      // TODO: Show error toast
      return;
    }

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

    if (onSave) {
      onSave(variantData);
    }
    onBack();
  };

  const handleDelete = () => {
    // TODO: Implement delete functionality
    onBack();
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
            style={styles.deleteButton}
            onPress={handleDelete}
            activeOpacity={0.7}
          >
            <Text style={styles.deleteButtonText}>Delete</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.saveButton}
            onPress={handleSavePress}
            activeOpacity={0.7}
          >
            <Text style={styles.saveButtonText}>Save</Text>
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
});

export default AddQuantityScreen;
