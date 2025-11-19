import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Poppins } from '../assets';

const CustomUploadButton = ({
  onPress,
  fileName,
  label = 'Drag and drop or browse files to upload',
  subtext,
  uploaded = false,
}) => {
  const hasFile = uploaded || (fileName && fileName.trim() !== '');

  return (
    <TouchableOpacity
      style={[styles.uploadButton, hasFile && styles.uploadButtonUploaded]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={styles.uploadContent}>
        {hasFile ? (
          <>
            <Text style={styles.uploadedIcon}>✓</Text>
            <View style={styles.fileInfo}>
              <Text style={styles.fileName} numberOfLines={1}>
                {fileName}
              </Text>
              <Text style={styles.uploadedText}>File uploaded</Text>
            </View>
          </>
        ) : (
          <>
            <Text style={styles.uploadIcon}>📁</Text>
            <View style={styles.uploadInfo}>
              <Text style={styles.labelText}>{label}</Text>
              {subtext && <Text style={styles.subtext}>{subtext}</Text>}
            </View>
          </>
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  uploadButton: {
    borderWidth: 1.5,
    borderColor: '#E0E0E0',
    borderStyle: 'dashed',
    borderRadius: 12,
    paddingVertical: 20,
    paddingHorizontal: 16,
    backgroundColor: '#FAFAFA',
    minHeight: 80,
    justifyContent: 'center',
  },
  uploadButtonUploaded: {
    borderColor: '#4CAF50',
    borderStyle: 'solid',
    backgroundColor: '#F1F8F4',
  },
  uploadContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadIcon: {
    fontSize: 32,
    marginRight: 12,
  },
  uploadedIcon: {
    fontSize: 24,
    color: '#4CAF50',
    marginRight: 12,
    fontWeight: 'bold',
  },
  uploadInfo: {
    flex: 1,
    alignItems: 'center',
  },
  fileInfo: {
    flex: 1,
    alignItems: 'flex-start',
  },
  labelText: {
    fontFamily: Poppins.medium,
    fontSize: 14,
    color: '#666666',
    textAlign: 'center',
    marginBottom: 4,
  },
  subtext: {
    fontFamily: Poppins.regular,
    fontSize: 12,
    color: '#999999',
    textAlign: 'center',
  },
  fileName: {
    fontFamily: Poppins.medium,
    fontSize: 14,
    color: '#333333',
    marginBottom: 4,
  },
  uploadedText: {
    fontFamily: Poppins.regular,
    fontSize: 12,
    color: '#4CAF50',
  },
});

export default CustomUploadButton;
