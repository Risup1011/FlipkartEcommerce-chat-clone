import React, { useState, useEffect } from 'react';
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

const CreateSubCategoryBottomSheet = ({ visible, onClose, onSave, categoryName = '', subCategoryData = null }) => {
  const [subCategoryName, setSubCategoryName] = useState('');
  const [description, setDescription] = useState('');
  const [displayOrder, setDisplayOrder] = useState('');

  // Populate fields when editing
  useEffect(() => {
    if (subCategoryData) {
      setSubCategoryName(subCategoryData.name || '');
      setDescription(subCategoryData.description || '');
      setDisplayOrder(subCategoryData.display_order?.toString() || '');
    } else {
      // Reset when creating new
      setSubCategoryName('');
      setDescription('');
      setDisplayOrder('');
    }
  }, [subCategoryData, visible]);

  const handleSave = () => {
    if (subCategoryName.trim()) {
      const subCategoryData = {
        name: subCategoryName.trim(),
        description: description.trim() || '',
        display_order: displayOrder ? parseInt(displayOrder) : 0,
      };
      onSave(subCategoryData);
      setSubCategoryName('');
      setDescription('');
      setDisplayOrder('');
      onClose();
    }
  };

  const handleClose = () => {
    setSubCategoryName('');
    setDescription('');
    setDisplayOrder('');
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
      >
        {/* Title */}
        <Text style={styles.title}>{subCategoryData ? 'Edit Sub-Category' : 'Create Sub-Category'}</Text>
        
        {/* Divider */}
        <View style={styles.divider} />

        {/* Category Name Display */}
        {categoryName && (
          <View style={styles.categoryInfo}>
            <Text style={styles.categoryLabel}>Parent Category:</Text>
            <Text style={styles.categoryName}>{categoryName}</Text>
          </View>
        )}

        {/* Sub-Category Name Input */}
        <View style={styles.inputContainer}>
          <Text style={styles.label}>
            Sub-Category Name<Text style={styles.asterisk}> *</Text>
          </Text>
          <TextInput
            style={styles.input}
            placeholder="Type your Sub-Category name *"
            placeholderTextColor="#999"
            value={subCategoryName}
            onChangeText={setSubCategoryName}
            autoFocus={true}
          />
        </View>

        {/* Description Input */}
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Description</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Enter sub-category description (optional)"
            placeholderTextColor="#999"
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />
        </View>

        {/* Display Order Input */}
        <View style={styles.inputContainer}>
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

        {/* Save Button */}
        <View style={styles.buttonContainer}>
          <CustomButton
            title="Save"
            onPress={handleSave}
            disabled={!subCategoryName.trim()}
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
  categoryInfo: {
    marginBottom: 20,
    padding: 12,
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
  },
  categoryLabel: {
    fontFamily: Poppins.regular,
    fontSize: 12,
    color: '#666666',
    marginBottom: 4,
  },
  categoryName: {
    fontFamily: Poppins.semiBold,
    fontSize: 14,
    color: '#000000',
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
  textArea: {
    minHeight: 80,
    paddingTop: 14,
  },
  buttonContainer: {
    width: '100%',
    marginTop: 10,
  },
});

export default CreateSubCategoryBottomSheet;
