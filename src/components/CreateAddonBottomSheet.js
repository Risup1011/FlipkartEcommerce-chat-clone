import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  ScrollView,
} from 'react-native';
import { Poppins } from '../assets';
import CustomButton from './CustomButton';
import CustomBottomSheet from './CustomBottomSheet';
import CustomDropdown from './CustomDropdown';

const CreateAddonBottomSheet = ({ visible, onClose, onSave }) => {
  const [addonName, setAddonName] = useState('');
  const [itemType, setItemType] = useState('VEG');
  const [additionalPrice, setAdditionalPrice] = useState('');
  const [gstRate, setGstRate] = useState('GST_5');

  const itemTypeOptions = [
    { label: 'VEG', value: 'VEG' },
    { label: 'NON_VEG', value: 'NON_VEG' },
  ];

  const gstOptions = [
    { label: '0%', value: 'GST_0' },
    { label: '5%', value: 'GST_5' },
    { label: '10%', value: 'GST_10' },
    { label: '12%', value: 'GST_12' },
    { label: '18%', value: 'GST_18' },
  ];

  const handleSave = () => {
    if (addonName.trim() && additionalPrice.trim()) {
      const addonData = {
        name: addonName.trim(),
        item_type: itemType,
        additional_price: parseFloat(additionalPrice) || 0,
        gst_rate: gstRate,
      };
      onSave(addonData);
      setAddonName('');
      setItemType('VEG');
      setAdditionalPrice('');
      setGstRate('GST_5');
      onClose();
    }
  };

  const handleClose = () => {
    setAddonName('');
    setItemType('VEG');
    setAdditionalPrice('');
    setGstRate('GST_5');
    onClose();
  };

  return (
    <CustomBottomSheet
      visible={visible}
      onClose={handleClose}
      maxHeight="70%"
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        nestedScrollEnabled={true}
      >
        {/* Title */}
        <Text style={styles.title}>Create Add-on</Text>
        
        {/* Divider */}
        <View style={styles.divider} />

        {/* Add-on Name Input */}
        <View style={styles.inputContainer}>
          <Text style={styles.label}>
            Add-on Name<Text style={styles.asterisk}> *</Text>
          </Text>
          <TextInput
            style={styles.input}
            placeholder="Type your Add-on name *"
            placeholderTextColor="#999"
            value={addonName}
            onChangeText={setAddonName}
            autoFocus={true}
          />
        </View>

        {/* Item Type Dropdown */}
        <View style={styles.inputContainer}>
          <Text style={styles.label}>
            Item Type<Text style={styles.asterisk}> *</Text>
          </Text>
          <CustomDropdown
            options={itemTypeOptions}
            selectedValue={itemType}
            onSelect={(option) => setItemType(option.value)}
            placeholder="Select Item Type"
          />
        </View>

        {/* Additional Price Input */}
        <View style={styles.inputContainer}>
          <Text style={styles.label}>
            Additional Price<Text style={styles.asterisk}> *</Text>
          </Text>
          <TextInput
            style={styles.input}
            placeholder="Enter additional price *"
            placeholderTextColor="#999"
            value={additionalPrice}
            onChangeText={setAdditionalPrice}
            keyboardType="decimal-pad"
          />
        </View>

        {/* GST Rate Dropdown */}
        <View style={styles.inputContainer}>
          <Text style={styles.label}>
            GST Rate<Text style={styles.asterisk}> *</Text>
          </Text>
          <CustomDropdown
            options={gstOptions}
            selectedValue={gstRate}
            onSelect={(option) => setGstRate(option.value)}
            placeholder="Select GST Rate"
          />
        </View>

        {/* Save Button */}
        <View style={styles.buttonContainer}>
          <CustomButton
            title="Save"
            onPress={handleSave}
            disabled={!addonName.trim() || !additionalPrice.trim()}
          />
        </View>
      </ScrollView>
    </CustomBottomSheet>
  );
};

const styles = StyleSheet.create({
  scrollView: {
    flexGrow: 1,
  },
  scrollContent: {
    paddingBottom: 10,
    paddingTop: 0,
    flexGrow: 1,
  },
  title: {
    fontFamily: Poppins.semiBold,
    fontSize: 20,
    color: '#000000',
    marginBottom: 16,
  },
  divider: {
    height: 1,
    backgroundColor: '#E0E0E0',
    marginBottom: 24,
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontFamily: Poppins.semiBold,
    fontSize: 14,
    color: '#000000',
    marginBottom: 12,
  },
  asterisk: {
    color: '#FF0000',
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontFamily: Poppins.regular,
    fontSize: 14,
    color: '#000000',
    minHeight: 48,
  },
  buttonContainer: {
    width: '100%',
    marginTop: 10,
  },
});

export default CreateAddonBottomSheet;
