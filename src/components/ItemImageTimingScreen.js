import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { launchImageLibrary } from 'react-native-image-picker';
import { Poppins, icons } from '../assets';
import CustomHeader from './CustomHeader';
import CustomButton from './CustomButton';
import CustomUploadButton from './CustomUploadButton';
import { useToast } from './ToastContext';
import { API_BASE_URL } from '../config';
import { fetchWithAuth, getApiHeaders } from '../utils/apiHelpers';

const ItemImageTimingScreen = ({ itemId, itemName, onBack, onSave }) => {
  const { showToast } = useToast();
  const [screenData, setScreenData] = useState(null); // Store backend screen configuration
  const [loadingScreenData, setLoadingScreenData] = useState(true); // Loading state for screen config
  const [uploadedImages, setUploadedImages] = useState([]);
  const [selectedTimingOption, setSelectedTimingOption] = useState(0); // 0: all times, 1: same time all days, 2: different times
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({});

  // Fetch screen configuration from backend
  useEffect(() => {
    fetchScreenConfig();
  }, []);

  const fetchScreenConfig = async () => {
    try {
      setLoadingScreenData(true);
      const endpoint = `${API_BASE_URL}v1/onboarding/sections`;
      console.log('📤 [ItemImageTimingScreen] ========================================');
      console.log('📤 [ItemImageTimingScreen] FETCHING SCREEN CONFIG FROM API');
      console.log('📤 [ItemImageTimingScreen] Endpoint:', endpoint);
      console.log('📤 [ItemImageTimingScreen] Method: GET');
      console.log('📤 [ItemImageTimingScreen] ========================================');
      
      const headers = await getApiHeaders(true);
      const response = await fetchWithAuth(endpoint, {
        method: 'GET',
        headers: headers,
      }, true);

      console.log('📥 [ItemImageTimingScreen] ========================================');
      console.log('📥 [ItemImageTimingScreen] API RESPONSE RECEIVED');
      console.log('📥 [ItemImageTimingScreen] Response Status:', response.status);
      console.log('📥 [ItemImageTimingScreen] Response OK:', response.ok);
      
      let data;
      try {
        data = await response.json();
      } catch (parseError) {
        console.error('❌ [ItemImageTimingScreen] Failed to parse response as JSON');
        const textResponse = await response.text();
        console.error('❌ [ItemImageTimingScreen] Raw Response:', textResponse);
        setScreenData(null);
        setLoadingScreenData(false);
        return;
      }
      
      console.log('📥 [ItemImageTimingScreen] Response Data:', JSON.stringify(data, null, 2));
      console.log('📥 [ItemImageTimingScreen] ========================================');

      if (response.ok && data.code === 200 && data.status === 'success') {
        console.log('✅ [ItemImageTimingScreen] API Call Successful');
        console.log('✅ [ItemImageTimingScreen] Total Sections:', data.data?.sections?.length || 0);
        
        // Find ITEM_IMAGE_TIMING section
        const imageTimingSection = data.data?.sections?.find(
          section => section.section_id === 'ITEM_IMAGE_TIMING'
        );

        if (imageTimingSection) {
          console.log('✅ [ItemImageTimingScreen] Section Found:', imageTimingSection.section_id);
          console.log('✅ [ItemImageTimingScreen] Screen Config:', JSON.stringify(imageTimingSection, null, 2));
          setScreenData(imageTimingSection);
        } else {
          console.warn('⚠️ [ItemImageTimingScreen] ITEM_IMAGE_TIMING section not found, using fallback');
          setScreenData(null);
        }
      } else {
        console.warn('⚠️ [ItemImageTimingScreen] API Call Failed - Using fallback text');
        setScreenData(null);
      }
    } catch (error) {
      console.error('❌ [ItemImageTimingScreen] ========================================');
      console.error('❌ [ItemImageTimingScreen] NETWORK/API ERROR');
      console.error('❌ [ItemImageTimingScreen] Error:', error);
      console.error('❌ [ItemImageTimingScreen] ========================================');
      setScreenData(null);
    } finally {
      setLoadingScreenData(false);
      console.log('🏁 [ItemImageTimingScreen] Screen config fetch completed');
    }
  };

  const handleBrowseFiles = async () => {
    try {
      const options = {
        mediaType: 'photo',
        quality: 0.8,
        maxWidth: 133,
        maxHeight: 133,
        selectionLimit: 10, // Allow multiple images
        includeBase64: false,
      };

      const result = await launchImageLibrary(options);

      if (result.didCancel) {
        return;
      }

      if (result.errorMessage) {
        const errorMsg = screenData?.messages?.error?.image_selection_failed || result.errorMessage;
        showToast(errorMsg, 'error');
        return;
      }

      if (result.assets && result.assets.length > 0) {
        // Process each selected image
        const newImages = result.assets.map((asset) => ({
          id: Date.now() + Math.random(),
          uri: asset.uri,
          fileName: asset.fileName || `image_${Date.now()}.jpg`,
          fileSize: asset.fileSize || 0,
          type: asset.type || 'image/jpeg',
        }));

        // Get max size from screen data or use default (20MB)
        const maxSizeMB = screenData?.image_config?.max_size_mb || 20;
        const maxSize = maxSizeMB * 1024 * 1024;
        const maxSizeText = screenData?.messages?.validation?.file_size_exceeded || `Image exceeds ${maxSizeMB}MB limit`;
        
        const validImages = newImages.filter((img) => {
          if (img.fileSize > maxSize) {
            const errorMsg = maxSizeText.replace('{fileName}', img.fileName).replace('{maxSize}', maxSizeMB);
            showToast(errorMsg, 'error');
            return false;
          }
          return true;
        });

        if (validImages.length > 0) {
          setUploadedImages((prev) => [...prev, ...validImages]);
          const successMsg = screenData?.messages?.success?.images_added || `${validImages.length} image(s) added`;
          showToast(successMsg.replace('{count}', validImages.length), 'success');
        }
      }
    } catch (error) {
      console.error('Error selecting images:', error);
      const errorMsg = screenData?.messages?.error?.image_selection_failed || 'Failed to select images';
      showToast(errorMsg, 'error');
    }
  };

  const handleRemoveImage = (imageId) => {
    const removeTitle = screenData?.messages?.remove_image?.title || 'Remove Image';
    const removeMessage = screenData?.messages?.remove_image?.message || 'Are you sure you want to remove this image?';
    const cancelText = screenData?.messages?.remove_image?.cancel || 'Cancel';
    const removeText = screenData?.messages?.remove_image?.confirm || 'Remove';
    const removedMsg = screenData?.messages?.success?.image_removed || 'Image removed';
    
    Alert.alert(
      removeTitle,
      removeMessage,
      [
        { text: cancelText, style: 'cancel' },
        {
          text: removeText,
          style: 'destructive',
          onPress: () => {
            setUploadedImages((prev) => prev.filter((img) => img.id !== imageId));
            showToast(removedMsg, 'success');
          },
        },
      ]
    );
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '0 B';
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(1)} MB`;
  };

  const handleDelete = () => {
    const deleteTitle = screenData?.messages?.delete_item?.title || 'Delete Item';
    const deleteMessage = screenData?.messages?.delete_item?.message || 'Are you sure you want to delete this item?';
    const cancelText = screenData?.messages?.delete_item?.cancel || 'Cancel';
    const deleteText = screenData?.messages?.delete_item?.confirm || 'Delete';
    const deletedMsg = screenData?.messages?.success?.item_deleted || 'Item deleted';
    
    Alert.alert(
      deleteTitle,
      deleteMessage,
      [
        { text: cancelText, style: 'cancel' },
        {
          text: deleteText,
          style: 'destructive',
          onPress: () => {
            // Handle delete action
            showToast(deletedMsg, 'success');
            onBack();
          },
        },
      ]
    );
  };

  const uploadImage = async (image) => {
    if (!itemId) {
      const errorMsg = screenData?.messages?.validation?.item_id_required || 'Item ID is missing';
      showToast(errorMsg, 'error');
      return null;
    }

    try {
      const formData = new FormData();
      
      // Get file extension from URI or fileName
      const uri = image.uri;
      const fileName = image.fileName || `image_${Date.now()}.jpg`;
      const fileType = image.type || 'image/jpeg';
      
      // Extract file extension
      const match = /\.(\w+)$/.exec(fileName);
      const fileExtension = match ? match[1].toLowerCase() : 'jpg';
      
      // Create file object for FormData
      const fileObject = {
        uri: uri,
        name: fileName,
        type: fileType,
      };
      formData.append('file', fileObject);

      const endpoint = `${API_BASE_URL}v1/catalog/items/${itemId}/images`;
      console.log('📤 [ItemImageTimingScreen] Uploading image:', fileName);
      console.log('📤 [ItemImageTimingScreen] Endpoint:', endpoint);

      const response = await fetchWithAuth(endpoint, {
        method: 'POST',
        body: formData,
      }, true);

      const data = await response.json();
      console.log('📥 [ItemImageTimingScreen] Upload response:', JSON.stringify(data, null, 2));

      if (response.ok && data.code === 200 && data.status === 'success') {
        return data.data; // Return the updated item data
      } else {
        const errorMessage = data.message || screenData?.messages?.error?.upload_failed || 'Failed to upload image';
        console.error('❌ [ItemImageTimingScreen] Upload failed:', errorMessage);
        showToast(errorMessage, 'error');
        return null;
      }
    } catch (error) {
      console.error('❌ [ItemImageTimingScreen] Error uploading image:', error);
      const errorMsg = screenData?.messages?.error?.upload_failed || 'Failed to upload image';
      showToast(errorMsg, 'error');
      return null;
    }
  };

  const handleSubmit = async () => {
    if (uploadedImages.length === 0) {
      const errorMsg = screenData?.messages?.validation?.images_required || 'Please upload at least one image';
      showToast(errorMsg, 'error');
      return;
    }

    if (!itemId) {
      const errorMsg = screenData?.messages?.validation?.item_id_required || 'Item ID is missing';
      showToast(errorMsg, 'error');
      return;
    }

    setUploading(true);
    setUploadProgress({});

    try {
      let lastItemData = null;
      let successCount = 0;

      // Upload each image sequentially
      for (let i = 0; i < uploadedImages.length; i++) {
        const image = uploadedImages[i];
        setUploadProgress({ current: i + 1, total: uploadedImages.length });
        
        const itemData = await uploadImage(image);
        
        if (itemData) {
          lastItemData = itemData;
          successCount++;
        } else {
          // If one upload fails, continue with others but show warning
          console.warn(`⚠️ [ItemImageTimingScreen] Failed to upload image ${i + 1}`);
        }
      }

      if (successCount === 0) {
        const errorMsg = screenData?.messages?.error?.upload_failed || 'Failed to upload images. Please try again.';
        showToast(errorMsg, 'error');
        setUploading(false);
        return;
      }

      // Use the final itemData which contains all image URLs (including newly uploaded ones)
      const finalImageUrls = lastItemData?.image_urls || [];

      // Get timing options from screen data or use fallback
      const timingOptions = screenData?.timing_options || [
        'Item is available at all times when kitchen / restaurant is open on kamai',
        'Item is available at same time for all days of the week',
        'Item is available at different times during different days of the weeks',
      ];

      const timingData = {
        option: selectedTimingOption,
        optionText: timingOptions[selectedTimingOption] || timingOptions[0],
      };

      const submitData = {
        itemId,
        imageUrls: finalImageUrls, // Use final response which has all images
        itemData: lastItemData,
        timing: timingData,
      };

      if (onSave) {
        await onSave(submitData);
      } else {
        const successMsg = screenData?.messages?.success?.images_uploaded || 'Images uploaded successfully';
        showToast(successMsg, 'success');
        onBack();
      }
    } catch (error) {
      console.error('❌ [ItemImageTimingScreen] Error submitting:', error);
      const errorMsg = screenData?.messages?.error?.upload_failed || 'Failed to upload images';
      showToast(errorMsg, 'error');
    } finally {
      setUploading(false);
      setUploadProgress({});  
    }
  };

  const RadioButton = ({ selected, onPress, label }) => (
    <TouchableOpacity
      style={styles.radioButtonContainer}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.radioButton}>
        {selected && <View style={styles.radioButtonInner} />}
      </View>
      <Text style={styles.radioButtonLabel}>{label}</Text>
    </TouchableOpacity>
  );

  // Show loading state while fetching screen config
  if (loadingScreenData) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
        <CustomHeader 
          title={screenData?.title || "Item Image"} 
          onBack={onBack} 
          showBackButton={true} 
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF6E1A" />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Get dynamic values from screen data or use fallbacks
  const screenTitle = screenData?.title || "Item Image";
  const imageSectionTitle = screenData?.image_section?.title || "Item Image";
  const formats = screenData?.image_config?.formats || ['JPG', 'PNG'];
  const dimension = screenData?.image_config?.dimension || '133 px x 133 px';
  const maxSizeMB = screenData?.image_config?.max_size_mb || 20;
  const guidelineNote = screenData?.image_config?.quality_note || 'Quality should be same as you serve for dine-in customers.';
  const uploadButtonText = screenData?.image_section?.upload_button_text || 'BROWSE FILES TO UPLOAD';
  const uploadSubtext = `[Max: ${maxSizeMB}MB] (${formats.join('/')})`;
  
  const timingSectionTitle = screenData?.timing_section?.title || "Item Timing";
  const timingInstruction = screenData?.timing_section?.instruction || 'Please specify the timing when this item will be available on kamai';
  const timingWarning = screenData?.timing_section?.warning || 'Each day can have only maximum of 3 timeslots.';
  
  const deleteButtonText = screenData?.buttons?.delete || 'Delete';
  const submitButtonText = screenData?.buttons?.submit || 'SUBMIT';

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <CustomHeader title={screenTitle} onBack={onBack} showBackButton={true} />
      
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Item Image Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{imageSectionTitle}</Text>
          
          {/* Guidelines Box */}
          <View style={styles.guidelinesBox}>
            <View style={styles.guidelineRow}>
              <Text style={styles.guidelineLabel}>FORMATS:</Text>
              <Text style={styles.guidelineValue}>{formats.join(', ')}</Text>
            </View>
            <View style={styles.guidelineRow}>
              <Text style={styles.guidelineLabel}>DIMENSION:</Text>
              <Text style={styles.guidelineValue}>{dimension}</Text>
            </View>
            <View style={styles.guidelineRow}>
              <Text style={styles.guidelineLabel}>MAX SIZE:</Text>
              <Text style={styles.guidelineValue}>{maxSizeMB}MB</Text>
            </View>
            <Text style={styles.guidelineNote}>
              {guidelineNote}
            </Text>
          </View>

          {/* Upload Area */}
          <CustomUploadButton
            onPress={handleBrowseFiles}
            label={uploadButtonText}
            subtext={uploadSubtext}
            uploaded={uploadedImages.length > 0}
            fileName={uploadedImages.length > 0 ? `${uploadedImages.length} image(s) selected` : null}
          />

          {/* Uploaded Images Grid */}
          {uploadedImages.length > 0 && (
            <View style={styles.imagesGrid}>
              {uploadedImages.map((image) => (
                <View key={image.id} style={styles.imageItem}>
                  <Image
                    source={{ uri: image.uri }}
                    style={styles.imageThumbnail}
                    resizeMode="cover"
                  />
                  <View style={styles.imageInfo}>
                    <Text style={styles.imageFileName} numberOfLines={1}>
                      {image.fileName}
                    </Text>
                    <Text style={styles.imageFileSize}>
                      {formatFileSize(image.fileSize)}
                    </Text>
                  </View>
                  <View style={styles.checkmarkContainer}>
                    <Text style={styles.checkmark}>✓</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.removeButton}
                    onPress={() => handleRemoveImage(image.id)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.removeButtonText}>×</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Item Timing Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{timingSectionTitle}</Text>
          <Text style={styles.timingInstruction}>
            {timingInstruction}
          </Text>

          {/* Warning */}
          <View style={styles.warningContainer}>
            <Text style={styles.warningIcon}>⚠️</Text>
            <Text style={styles.warningText}>
              {timingWarning}
            </Text>
          </View>

          {/* Radio Button Options */}
          <View style={styles.radioOptions}>
            {(screenData?.timing_options || [
              'Item is available at all times when kitchen / restaurant is open on kamai',
              'Item is available at same time for all days of the week',
              'Item is available at different times during different days of the weeks',
            ]).map((option, index) => (
              <RadioButton
                key={index}
                selected={selectedTimingOption === index}
                onPress={() => setSelectedTimingOption(index)}
                label={option}
              />
            ))}
          </View>
        </View>
      </ScrollView>

      {/* Footer Buttons */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={handleDelete}
          activeOpacity={0.7}
        >
          <Text style={styles.deleteButtonText}>{deleteButtonText}</Text>
        </TouchableOpacity>
        <CustomButton
          title={
            uploading 
              ? (screenData?.messages?.uploading?.progress || `UPLOADING... (${uploadProgress.current || 0}/${uploadProgress.total || 0})`).replace('{current}', uploadProgress.current || 0).replace('{total}', uploadProgress.total || 0)
              : submitButtonText
          }
          onPress={handleSubmit}
          style={styles.submitButton}
          disabled={uploading}
          loading={uploading}
        />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  section: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontFamily: Poppins.semiBold,
    fontSize: 18,
    color: '#000000',
    marginBottom: 16,
  },
  guidelinesBox: {
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    padding: 16,
    marginBottom: 20,
  },
  guidelineRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  guidelineLabel: {
    fontFamily: Poppins.medium,
    fontSize: 14,
    color: '#000000',
    marginRight: 8,
    minWidth: 100,
  },
  guidelineValue: {
    fontFamily: Poppins.regular,
    fontSize: 14,
    color: '#666666',
  },
  guidelineNote: {
    fontFamily: Poppins.regular,
    fontSize: 12,
    color: '#666666',
    marginTop: 8,
    fontStyle: 'italic',
  },
  imagesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 10,
    marginHorizontal: -6,
  },
  imageItem: {
    width: '30%',
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    padding: 6,
    marginBottom: 12,
    marginHorizontal: '1.5%',
    position: 'relative',
  },
  imageThumbnail: {
    width: '100%',
    height: 70,
    borderRadius: 6,
    marginBottom: 6,
  },
  imageInfo: {
    marginBottom: 4,
  },
  imageFileName: {
    fontFamily: Poppins.regular,
    fontSize: 10,
    color: '#000000',
    marginBottom: 2,
  },
  imageFileSize: {
    fontFamily: Poppins.regular,
    fontSize: 9,
    color: '#666666',
  },
  checkmarkContainer: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkmark: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  removeButton: {
    position: 'absolute',
    top: 2,
    right: 2,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#FF4444',
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
    lineHeight: 16,
  },
  timingInstruction: {
    fontFamily: Poppins.regular,
    fontSize: 14,
    color: '#666666',
    marginBottom: 16,
  },
  warningContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF3E0',
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
  },
  warningIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  warningText: {
    fontFamily: Poppins.regular,
    fontSize: 12,
    color: '#FF6E1A',
    flex: 1,
  },
  radioOptions: {
    gap: 16,
  },
  radioButtonContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  radioButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#666666',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    marginTop: 2,
  },
  radioButtonInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#FF6E1A',
  },
  radioButtonLabel: {
    fontFamily: Poppins.regular,
    fontSize: 14,
    color: '#000000',
    flex: 1,
    lineHeight: 20,
  },
  footer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    backgroundColor: '#FFFFFF',
    gap: 12,
  },
  deleteButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#000000',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  deleteButtonText: {
    fontFamily: Poppins.medium,
    fontSize: 16,
    color: '#000000',
  },
  submitButton: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    fontFamily: Poppins.regular,
    fontSize: 14,
    color: '#666666',
    marginTop: 12,
  },
});

export default ItemImageTimingScreen;
