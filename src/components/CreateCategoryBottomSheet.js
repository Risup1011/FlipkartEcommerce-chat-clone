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

const CreateCategoryBottomSheet = ({ visible, onClose, onSave, categoryData = null }) => {
  const [categoryName, setCategoryName] = useState('');
  const [description, setDescription] = useState('');
  const [displayOrder, setDisplayOrder] = useState('');

  // Populate fields when editing
  useEffect(() => {
    if (categoryData) {
      setCategoryName(categoryData.name || '');
      setDescription(categoryData.description || '');
      setDisplayOrder(categoryData.display_order?.toString() || '');
    } else {
      // Reset when creating new
      setCategoryName('');
      setDescription('');
      setDisplayOrder('');
    }
  }, [categoryData, visible]);

  const handleSave = () => {
    if (categoryName.trim()) {
      const categoryData = {
        name: categoryName.trim(),
        description: description.trim() || '',
        display_order: displayOrder ? parseInt(displayOrder) : 0,
      };
      onSave(categoryData);
      setCategoryName('');
      setDescription('');
      setDisplayOrder('');
      onClose();
    }
  };

  const handleClose = () => {
    setCategoryName('');
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
        nestedScrollEnabled={true}
      >
        {/* Title */}
        <Text style={styles.title}>{categoryData ? 'Edit Category' : 'Create Category'}</Text>
        
        {/* Divider */}
        <View style={styles.divider} />

        {/* Category Name Input */}
        <View style={styles.inputContainer}>
          <Text style={styles.label}>
            Category Name<Text style={styles.asterisk}> *</Text>
          </Text>
          <TextInput
            style={styles.input}
            placeholder="Type your Category name *"
            placeholderTextColor="#999"
            value={categoryName}
            onChangeText={setCategoryName}
            autoFocus={true}
          />
        </View>

        {/* Description Input */}
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Description</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Enter category description (optional)"
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
            disabled={!categoryName.trim()}
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
  textArea: {
    minHeight: 80,
    paddingTop: 14,
  },
  buttonContainer: {
    width: '100%',
    marginTop: 10,
  },
});

export default CreateCategoryBottomSheet;
