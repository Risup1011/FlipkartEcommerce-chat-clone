import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Poppins } from '../assets';
import CustomBottomSheet from './CustomBottomSheet';

const AddPhotoBottomSheet = ({ visible, onClose, onSelectGallery, onSelectCamera }) => {
  return (
    <CustomBottomSheet
      visible={visible}
      onClose={onClose}
      maxHeight="40%"
    >
      <View style={styles.handle} />
      <Text style={styles.title}>Choose an option</Text>
      
      <TouchableOpacity
        style={styles.option}
        onPress={async () => {
          onClose();
          // Small delay to allow modal to close before opening image picker
          setTimeout(() => {
            if (onSelectGallery) {
              onSelectGallery();
            }
          }, 300);
        }}
        activeOpacity={0.7}
      >
        <Text style={styles.optionText}>Gallery</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.option}
        onPress={async () => {
          onClose();
          // Small delay to allow modal to close before opening camera
          setTimeout(() => {
            if (onSelectCamera) {
              onSelectCamera();
            }
          }, 300);
        }}
        activeOpacity={0.7}
      >
        <Text style={styles.optionText}>Camera</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.cancelButton}
        onPress={onClose}
        activeOpacity={0.7}
      >
        <Text style={styles.cancelText}>Cancel</Text>
      </TouchableOpacity>
    </CustomBottomSheet>
  );
};

const styles = StyleSheet.create({
  handle: {
    width: 40,
    height: 4,
    backgroundColor: '#E0E0E0',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 20,
  },
  title: {
    fontFamily: Poppins.semiBold,
    fontSize: 18,
    color: '#000000',
    marginBottom: 20,
    textAlign: 'center',
  },
  option: {
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  optionText: {
    fontFamily: Poppins.regular,
    fontSize: 16,
    color: '#000000',
  },
  cancelButton: {
    marginTop: 10,
    paddingVertical: 16,
    alignItems: 'center',
    backgroundColor: '#FF6E1A',
    borderRadius: 12,
  },
  cancelText: {
    fontFamily: Poppins.medium,
    fontSize: 16,
    color: '#FFFFFF',
  },
});

export default AddPhotoBottomSheet;
