import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TextInput,
  TouchableOpacity,
} from 'react-native';
import { Poppins } from '../assets';
import CustomHeader from './CustomHeader';
import CustomDropdown from './CustomDropdown';
import CustomButton from './CustomButton';
import { fetchWithAuth } from '../utils/apiHelpers';
import { API_BASE_URL } from '../config';

const ItemDetailsScreen = ({ onBack, categoryId, onSave, itemData = null, subCategories = [] }) => {
  const [itemName, setItemName] = useState(itemData?.name || '');
  const [itemDescription, setItemDescription] = useState(itemData?.description || '');
  const [itemPrice, setItemPrice] = useState(itemData?.price?.toString() || '');
  const [packagingPrice, setPackagingPrice] = useState(itemData?.packagingPrice?.toString() || '');
  const [gst, setGst] = useState(itemData?.gst || '0%');
  const [itemType, setItemType] = useState(itemData?.item_type || 'VEG');
  const [selectedSubCategoryId, setSelectedSubCategoryId] = useState(itemData?.sub_category_id || null);
  const [displayOrder, setDisplayOrder] = useState(itemData?.display_order?.toString() || '');
  const [finalPrice, setFinalPrice] = useState(0);
  const [gstOptions, setGstOptions] = useState(['0%', '5%', '10%', '12%', '18%']); // Default fallback options
  const [isLoadingGstOptions, setIsLoadingGstOptions] = useState(false);

  const itemTypeOptions = ['VEG', 'NON_VEG'];
  
  // Fetch GST options from backend
  useEffect(() => {
    const fetchGstOptions = async () => {
      setIsLoadingGstOptions(true);
      try {
        // Try fetching from config endpoint first
        const url = `${API_BASE_URL}v1/config`;
        console.log('📡 [ItemDetailsScreen] Fetching GST options from:', url);
        
        const response = await fetchWithAuth(url, {
          method: 'GET',
        });
        
        const responseData = await response.json();
        
        if (response.ok && responseData?.data) {
          // Check if GST options are in the config response
          // The structure might vary, so we'll check common patterns
          const gstRates = responseData.data.gst_rates || 
                          responseData.data.gst_options || 
                          responseData.data.tax_rates ||
                          responseData.data.gst;
          
          if (gstRates && Array.isArray(gstRates) && gstRates.length > 0) {
            // Convert backend format to display format (e.g., ['0%', '5%', '10%'])
            const formattedOptions = gstRates.map(rate => {
              if (typeof rate === 'string') {
                // If it's already in format like "0%", use it directly
                if (rate.includes('%')) {
                  return rate;
                }
                // If it's in format like "GST_0", convert to "0%"
                if (rate.startsWith('GST_')) {
                  return rate.replace('GST_', '') + '%';
                }
                // If it's just a number, add %
                return rate + '%';
              } else if (typeof rate === 'number') {
                return rate + '%';
              } else if (rate && typeof rate === 'object') {
                // If it's an object with value/label, extract the percentage
                const value = rate.value || rate.rate || rate.percentage || rate;
                if (typeof value === 'string' && value.includes('%')) {
                  return value;
                }
                if (typeof value === 'string' && value.startsWith('GST_')) {
                  return value.replace('GST_', '') + '%';
                }
                return (typeof value === 'number' ? value : parseFloat(value) || 0) + '%';
              }
              return rate;
            });
            
            setGstOptions(formattedOptions);
            console.log('✅ [ItemDetailsScreen] GST options loaded from backend:', formattedOptions);
            
            // Validate current GST value is in the new options
            setGst(prevGst => {
              if (!formattedOptions.includes(prevGst)) {
                console.log(`⚠️ [ItemDetailsScreen] Current GST value "${prevGst}" not in backend options, resetting to first option`);
                return formattedOptions[0] || '0%';
              }
              return prevGst;
            });
          } else {
            // If no GST options found in config, try a dedicated GST endpoint
            console.log('⚠️ [ItemDetailsScreen] No GST options in config, trying dedicated endpoint...');
            const gstUrl = `${API_BASE_URL}v1/gst-rates`;
            const gstResponse = await fetchWithAuth(gstUrl, {
              method: 'GET',
            });
            
            const gstData = await gstResponse.json();
            if (gstResponse.ok && gstData?.data && Array.isArray(gstData.data)) {
              const formattedOptions = gstData.data.map(rate => {
                if (typeof rate === 'string') {
                  return rate.includes('%') ? rate : rate + '%';
                }
                return (typeof rate === 'number' ? rate : parseFloat(rate) || 0) + '%';
              });
              setGstOptions(formattedOptions);
              console.log('✅ [ItemDetailsScreen] GST options loaded from dedicated endpoint:', formattedOptions);
              
              // Validate current GST value is in the new options
              setGst(prevGst => {
                if (!formattedOptions.includes(prevGst)) {
                  console.log(`⚠️ [ItemDetailsScreen] Current GST value "${prevGst}" not in backend options, resetting to first option`);
                  return formattedOptions[0] || '0%';
                }
                return prevGst;
              });
            } else {
              console.log('⚠️ [ItemDetailsScreen] No GST endpoint found, using default options');
            }
          }
        } else {
          console.log('⚠️ [ItemDetailsScreen] Config fetch failed, using default GST options');
        }
      } catch (error) {
        console.error('❌ [ItemDetailsScreen] Error fetching GST options:', error);
        // Keep default options on error
      } finally {
        setIsLoadingGstOptions(false);
      }
    };

    fetchGstOptions();
  }, []);
  
  // Convert GST percentage to API format (dynamic based on available options)
  const getGstRate = (gstPercent) => {
    const percent = parseFloat(gstPercent.replace('%', '')) || 0;
    // Generate GST rate code dynamically (e.g., GST_0, GST_5, GST_10)
    return `GST_${percent}`;
  };

  // Calculate final price whenever inputs change
  useEffect(() => {
    const price = parseFloat(itemPrice) || 0;
    const packaging = parseFloat(packagingPrice) || 0;
    const gstPercent = parseFloat(gst.replace('%', '')) || 0;
    
    const subtotal = price + packaging;
    const gstAmount = (subtotal * gstPercent) / 100;
    const total = subtotal + gstAmount;
    
    setFinalPrice(total);
  }, [itemPrice, packagingPrice, gst]);

  const handleDelete = () => {
    // TODO: Implement delete functionality
    // For now, just go back
    onBack();
  };

  const handleNext = () => {
    // Validation
    if (!itemName.trim()) {
      // TODO: Show error toast
      return;
    }
    if (!itemDescription.trim()) {
      // TODO: Show error toast
      return;
    }
    if (!itemPrice || parseFloat(itemPrice) <= 0) {
      // TODO: Show error toast
      return;
    }
    if (!packagingPrice || parseFloat(packagingPrice) < 0) {
      // TODO: Show error toast
      return;
    }

    const itemData = {
      name: itemName.trim(),
      description: itemDescription.trim(),
      price: parseFloat(itemPrice),
      packagingPrice: parseFloat(packagingPrice),
      gst: gst,
      gst_rate: getGstRate(gst),
      item_type: itemType,
      sub_category_id: selectedSubCategoryId || null,
      display_order: displayOrder ? parseInt(displayOrder) : 0,
      finalPrice: finalPrice,
    };

    if (onSave) {
      onSave(itemData);
    }
    onBack();
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <View style={styles.headerBackground}>
        <CustomHeader title="Item Details" onBack={onBack} />
      </View>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Basic Details Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              Basic Details<Text style={styles.asterisk}> *</Text>
            </Text>

            {/* Item Name */}
            <View style={styles.fieldContainer}>
              <Text style={styles.label}>Item Name</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter item name"
                placeholderTextColor="#999"
                value={itemName}
                onChangeText={setItemName}
              />
            </View>

            {/* Item Description */}
            <View style={styles.fieldContainer}>
              <Text style={styles.label}>
                Item Description<Text style={styles.asterisk}> *</Text>
              </Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Enter item description"
                placeholderTextColor="#999"
                value={itemDescription}
                onChangeText={setItemDescription}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>

            {/* Item Type */}
            <View style={styles.fieldContainer}>
              <Text style={styles.label}>Item Type</Text>
              <View style={styles.dropdownWrapper}>
                <CustomDropdown
                  value={itemType}
                  onSelect={(value) => setItemType(value)}
                  placeholder="Select Item Type"
                  options={itemTypeOptions}
                />
              </View>
            </View>

            {/* Sub-Category (Optional) */}
            {subCategories && subCategories.length > 0 && (
              <View style={styles.fieldContainer}>
                <Text style={styles.label}>Sub-Category (Optional)</Text>
                <View style={styles.dropdownWrapper}>
                  <CustomDropdown
                    value={selectedSubCategoryId || ''}
                    onSelect={(value) => {
                      // Handle both object and string values from dropdown
                      const subCategoryValue = typeof value === 'object' ? (value.value || null) : (value || null);
                      setSelectedSubCategoryId(subCategoryValue === '' ? null : subCategoryValue);
                    }}
                    placeholder="Select Sub-Category"
                    options={[
                      { label: 'None', value: '' },
                      ...subCategories.map((sub) => ({
                        label: sub.name,
                        value: sub.id,
                      })),
                    ]}
                  />
                </View>
              </View>
            )}

            {/* Display Order */}
            <View style={styles.fieldContainer}>
              <Text style={styles.label}>Display Order</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter display order (optional)"
                placeholderTextColor="#999"
                value={displayOrder}
                onChangeText={setDisplayOrder}
                keyboardType="number-pad"
              />
            </View>
          </View>

          {/* Divider */}
          <View style={styles.divider} />

          {/* Item Pricing Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              Item Pricing<Text style={styles.asterisk}> *</Text>
            </Text>

            {/* First Row: Item Price and Packaging Price */}
            <View style={styles.pricingRow}>
              {/* Item Price */}
              <View style={[styles.fieldContainer, styles.pricingField]}>
                <Text style={styles.label}>
                  Item Price<Text style={styles.asterisk}> *</Text>
                </Text>
                <TextInput
                  style={styles.input}
                  placeholder="0.00"
                  placeholderTextColor="#999"
                  value={itemPrice}
                  onChangeText={setItemPrice}
                  keyboardType="decimal-pad"
                />
                <Text style={styles.helperText}>Excluding all taxes</Text>
              </View>

              {/* Packaging Price */}
              <View style={[styles.fieldContainer, styles.pricingField]}>
                <Text style={styles.label}>
                  Packaging Price<Text style={styles.asterisk}> *</Text>
                </Text>
                <TextInput
                  style={styles.input}
                  placeholder="0.00"
                  placeholderTextColor="#999"
                  value={packagingPrice}
                  onChangeText={setPackagingPrice}
                  keyboardType="decimal-pad"
                />
                <Text style={styles.helperText}>Excluding all taxes</Text>
              </View>
            </View>

            {/* Second Row: GST */}
            <View style={styles.fieldContainer}>
              <Text style={styles.label}>GST</Text>
              <View style={styles.dropdownWrapper}>
                <CustomDropdown
                  value={gst}
                  onSelect={(value) => setGst(value)}
                  placeholder="Select GST"
                  options={gstOptions}
                />
              </View>
            </View>
          </View>

          {/* Divider */}
          <View style={styles.divider} />

          {/* Final Price Section */}
          <View style={styles.section}>
            <View style={styles.finalPriceRow}>
              <View style={styles.finalPriceContainer}>
                <Text style={styles.label}>Final Price</Text>
                <Text style={styles.finalPriceValue}>₹{finalPrice.toFixed(2)}</Text>
                <Text style={styles.helperText}>Item Price + Packaging + GST</Text>
              </View>

              <View style={styles.warningBox}>
                <Text style={styles.warningText}>
                  Please ensure the item price matches in your menu to avoid rejection of changes.
                </Text>
              </View>
            </View>
          </View>

          {/* Delete and Next Buttons */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={styles.deleteButton}
              onPress={handleDelete}
              activeOpacity={0.7}
            >
              <Text style={styles.deleteButtonText}>Delete</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.nextButton}
              onPress={handleNext}
              activeOpacity={0.7}
            >
              <Text style={styles.nextButtonText}>Next</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  headerBackground: {
    backgroundColor: '#F5F5F5',
  },
  keyboardView: {
    flex: 1,
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
  sectionTitle: {
    fontFamily: Poppins.semiBold,
    fontSize: 18,
    color: '#000000',
    marginBottom: 20,
  },
  asterisk: {
    color: '#FF0000',
  },
  divider: {
    height: 1,
    backgroundColor: '#E0E0E0',
    marginVertical: 24,
  },
  fieldContainer: {
    marginBottom: 20,
  },
  label: {
    fontFamily: Poppins.medium,
    fontSize: 14,
    color: '#000000',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontFamily: Poppins.regular,
    fontSize: 14,
    color: '#000000',
    minHeight: 48,
    borderWidth: 0.5,
  },
  textArea: {
    minHeight: 100,
    paddingTop: 14,
  },
  helperText: {
    fontFamily: Poppins.regular,
    fontSize: 12,
    color: '#999999',
    marginTop: 6,
  },
  pricingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  pricingField: {
    flex: 1,
    marginBottom: 0,
  },
  dropdownWrapper: {
    // Wrapper to ensure dropdown matches input styling
  },
  finalPriceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 16,
  },
  finalPriceContainer: {
    flex: 1,
  },
  finalPriceValue: {
    fontFamily: Poppins.semiBold,
    fontSize: 20,
    color: '#000000',
    marginTop: 8,
    marginBottom: 6,
  },
  warningBox: {
    flex: 1,
    backgroundColor: '#FFF3E0',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#FFE0B2',
  },
  warningText: {
    fontFamily: Poppins.regular,
    fontSize: 12,
    color: '#000000',
    lineHeight: 18,
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
  nextButton: {
    flex: 1,
    backgroundColor: '#FF6E1A',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 46,
  },
  nextButtonText: {
    fontFamily: Poppins.semiBold,
    fontSize: 16,
    color: '#FFFFFF',
  },
});

export default ItemDetailsScreen;
