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
  Modal,
  Dimensions,
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
    const [screenData, setScreenData] = useState(null); // Store backend screen configuration
  const [loadingScreenData, setLoadingScreenData] = useState(true); // Loading state for screen config
  const [uploadedImages, setUploadedImages] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({});
  const [previewImage, setPreviewImage] = useState(null); // For image preview modal
  const [loadingExistingImages, setLoadingExistingImages] = useState(false); // Loading state for existing images

  // Fetch screen configuration from backend
  useEffect(() => {
    fetchScreenConfig();
  }, []);

  // Fetch existing item images after screen config is loaded
  useEffect(() => {
    if (!loadingScreenData && itemId) {
      fetchExistingImages();
    }
  }, [loadingScreenData, itemId]);

  const fetchScreenConfig = async () => {
    try {
      setLoadingScreenData(true);
      const endpoint = `${API_BASE_URL}v1/onboarding/sections`;
      
      const headers = await getApiHeaders(true);
      const response = await fetchWithAuth(endpoint, {
        method: 'GET',
        headers: headers,
      }, true);

      
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
      

      if (response.ok && data.code === 200 && data.status === 'success') {
        
        // Find ITEM_IMAGE_TIMING section
        const imageTimingSection = data.data?.sections?.find(
          section => section.section_id === 'ITEM_IMAGE_TIMING'
        );

        if (imageTimingSection) {
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
    }
  };

  // Fetch existing images for the item from backend
  const fetchExistingImages = async () => {
    if (!itemId) {
      console.warn('⚠️ [ItemImageTimingScreen] No itemId provided, skipping image fetch');
      return;
    }

    try {
      setLoadingExistingImages(true);
      const endpoint = `${API_BASE_URL}v1/catalog/items/${itemId}`;
      
      const response = await fetchWithAuth(endpoint, {
        method: 'GET',
      });

      
      let data;
      try {
        data = await response.json();
      } catch (parseError) {
        console.error('❌ [ItemImageTimingScreen] Failed to parse response as JSON');
        const textResponse = await response.text();
        console.error('❌ [ItemImageTimingScreen] Raw Response:', textResponse);
        setLoadingExistingImages(false);
        return;
      }
      

      if (response.ok && data.code === 200 && data.status === 'success') {
        const itemData = data.data || {};
        const imageUrls = itemData.image_urls || [];
        
        
        // Map image URLs to uploadedImages format
        // Existing images from backend have URL, new images from device have URI
        const existingImages = imageUrls.map((imageUrl, index) => {
          // Extract filename from URL or generate one
          const urlParts = imageUrl.split('/');
          const fileName = urlParts[urlParts.length - 1] || `image_${index + 1}.jpg`;
          
          return {
            id: `existing_${index}_${Date.now()}`, // Unique ID for existing images
            uri: imageUrl, // Use URL as URI for display
            originalUri: imageUrl, // Store original URL
            fileName: fileName,
            fileSize: 0, // Unknown for existing images
            type: 'image/jpeg', // Default type
            isExisting: true, // Flag to identify existing images from backend
            imageUrl: imageUrl, // Store the original URL for deletion if needed
          };
        });
        
        setUploadedImages(existingImages);
      } else {
        console.warn('⚠️ [ItemImageTimingScreen] Failed to fetch item details - no existing images will be shown');
        console.warn('⚠️ [ItemImageTimingScreen] Error:', data.message || 'Unknown error');
      }
    } catch (error) {
      console.error('❌ [ItemImageTimingScreen] ========================================');
      console.error('❌ [ItemImageTimingScreen] ERROR FETCHING EXISTING IMAGES');
      console.error('❌ [ItemImageTimingScreen] Error:', error);
      console.error('❌ [ItemImageTimingScreen] ========================================');
    } finally {
      setLoadingExistingImages(false);
    }
  };

  const handleBrowseFiles = async () => {
    try {
      const options = {
        mediaType: 'photo',
        quality: 1.0, // Maximum quality
        // Remove maxWidth and maxHeight to get full resolution images
        selectionLimit: 10, // Allow multiple images
        includeBase64: false,
      };

      const result = await launchImageLibrary(options);

      if (result.didCancel) {
        return;
      }

      if (result.errorMessage) {
        const errorMsg = screenData?.messages?.error?.image_selection_failed || result.errorMessage;
        return;
      }

      if (result.assets && result.assets.length > 0) {
        // Process each selected image
        const newImages = result.assets.map((asset) => ({
          id: Date.now() + Math.random(),
          uri: asset.uri,
          originalUri: asset.originalUri || asset.uri, // Store original full-resolution URI
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
            return false;
          }
          return true;
        });

        if (validImages.length > 0) {
          setUploadedImages((prev) => [...prev, ...validImages]);
          const successMsg = screenData?.messages?.success?.images_added || `${validImages.length} image(s) added`;
        }
      }
    } catch (error) {
      console.error('Error selecting images:', error);
      const errorMsg = screenData?.messages?.error?.image_selection_failed || 'Failed to select images';
    }
  };

  const deleteImageFromServer = async (fileUrl, menuItemId) => {
    try {
      const endpoint = `${API_BASE_URL}v1/partners/media`;
      
      const requestBody = {
        file_url: fileUrl,
        menu_item_id: menuItemId,
      };

      const response = await fetchWithAuth(endpoint, {
        method: 'DELETE',
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();

      if (response.ok && data.code === 200 && data.status === 'success') {
        return { success: true, data: data.data };
      } else {
        const errorMessage = data.message || 'Failed to delete image';
        console.error('❌ [ItemImageTimingScreen] Delete image failed:', errorMessage);
        return { success: false, error: errorMessage };
      }
    } catch (error) {
      console.error('❌ [ItemImageTimingScreen] Error deleting image:', error);
      return { success: false, error: 'Failed to delete image' };
    }
  };

  const handleRemoveImage = async (imageId) => {
    const removeTitle = screenData?.messages?.remove_image?.title || 'Remove Image';
    const removeMessage = screenData?.messages?.remove_image?.message || 'Are you sure you want to remove this image?';
    const cancelText = screenData?.messages?.remove_image?.cancel || 'Cancel';
    const removeText = screenData?.messages?.remove_image?.confirm || 'Remove';
    const removedMsg = screenData?.messages?.success?.image_removed || 'Image removed';
    const deleteErrorMsg = screenData?.messages?.error?.delete_failed || 'Failed to delete image';
    
    // Find the image to check if it's an existing image from backend
    const imageToRemove = uploadedImages.find(img => img.id === imageId);
    const isExistingImage = imageToRemove?.isExisting;
    const fileUrl = imageToRemove?.imageUrl || imageToRemove?.originalUri || imageToRemove?.uri;
    
    Alert.alert(
      removeTitle,
      removeMessage,
      [
        { text: cancelText, style: 'cancel' },
        {
          text: removeText,
          style: 'destructive',
          onPress: async () => {
            // For existing images, call the delete API endpoint
            if (isExistingImage && fileUrl && itemId) {
              try {
                const deleteResult = await deleteImageFromServer(fileUrl, itemId);
                
                if (deleteResult.success) {
                  // Successfully deleted from server, remove from state
                  setUploadedImages((prev) => prev.filter((img) => img.id !== imageId));
                } else {
                  // Failed to delete from server, show error
                  return; // Don't remove from state if API call failed
                }
              } catch (error) {
                console.error('❌ [ItemImageTimingScreen] Error in delete operation:', error);
                return; // Don't remove from state if there was an error
              }
            } else {
              // For new images (not yet uploaded), just remove from state
              setUploadedImages((prev) => prev.filter((img) => img.id !== imageId));
            }
          },
        },
      ]
    );
  };

  const handlePreviewImage = (image) => {
    setPreviewImage(image);
  };

  const closePreview = () => {
    setPreviewImage(null);
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
            onBack();
          },
        },
      ]
    );
  };

  const uploadImage = async (image) => {
    if (!itemId) {
      const errorMsg = screenData?.messages?.validation?.item_id_required || 'Item ID is missing';
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

      const response = await fetchWithAuth(endpoint, {
        method: 'POST',
        body: formData,
      }, true);

      const data = await response.json();

      if (response.ok && data.code === 200 && data.status === 'success') {
        return data.data; // Return the updated item data
      } else {
        const errorMessage = data.message || screenData?.messages?.error?.upload_failed || 'Failed to upload image';
        console.error('❌ [ItemImageTimingScreen] Upload failed:', errorMessage);
        return null;
      }
    } catch (error) {
      console.error('❌ [ItemImageTimingScreen] Error uploading image:', error);
      const errorMsg = screenData?.messages?.error?.upload_failed || 'Failed to upload image';
      return null;
    }
  };

  const handleSubmit = async () => {
    if (uploadedImages.length === 0) {
      const errorMsg = screenData?.messages?.validation?.images_required || 'Please upload at least one image';
      return;
    }

    if (!itemId) {
      const errorMsg = screenData?.messages?.validation?.item_id_required || 'Item ID is missing';
      return;
    }

    setUploading(true);
    setUploadProgress({});

    try {
      let lastItemData = null;
      let successCount = 0;
      let newImagesCount = 0;

      // Separate existing images from new images
      const existingImages = uploadedImages.filter(img => img.isExisting);
      const newImages = uploadedImages.filter(img => !img.isExisting);


      // Only upload new images (not existing ones from backend)
      for (let i = 0; i < newImages.length; i++) {
        const image = newImages[i];
        setUploadProgress({ current: i + 1, total: newImages.length });
        
        const itemData = await uploadImage(image);
        
        if (itemData) {
          lastItemData = itemData;
          successCount++;
          newImagesCount++;
        } else {
          // If one upload fails, continue with others but show warning
          console.warn(`⚠️ [ItemImageTimingScreen] Failed to upload image ${i + 1}`);
        }
      }

      // If there are only existing images and no new uploads, fetch the latest item data
      if (newImages.length === 0 && existingImages.length > 0) {
        const endpoint = `${API_BASE_URL}v1/catalog/items/${itemId}`;
        const response = await fetchWithAuth(endpoint, {
          method: 'GET',
        });
        
        if (response.ok) {
          const data = await response.json();
          if (data.code === 200 && data.status === 'success') {
            lastItemData = data.data;
            successCount = existingImages.length; // All existing images are "successful"
          }
        }
      }

      if (successCount === 0 && newImages.length > 0) {
        const errorMsg = screenData?.messages?.error?.upload_failed || 'Failed to upload images. Please try again.';
        setUploading(false);
        return;
      }

      // Use the final itemData which contains all image URLs (including newly uploaded ones)
      const finalImageUrls = lastItemData?.image_urls || [];

      const submitData = {
        itemId,
        imageUrls: finalImageUrls, // Use final response which has all images
        itemData: lastItemData,
      };

      if (onSave) {
        await onSave(submitData);
      } else {
        const successMsg = screenData?.messages?.success?.images_uploaded || 'Images uploaded successfully';
        onBack();
      }
    } catch (error) {
      console.error('❌ [ItemImageTimingScreen] Error submitting:', error);
      const errorMsg = screenData?.messages?.error?.upload_failed || 'Failed to upload images';
    } finally {
      setUploading(false);
      setUploadProgress({});  
    }
  };


  // Show loading state while fetching screen config or existing images
  if (loadingScreenData || loadingExistingImages) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
        <CustomHeader 
          title={screenData?.title || "Item Image"} 
          onBack={onBack} 
          showBackButton={true} 
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF6E1A" />
          <Text style={styles.loadingText}>
            {loadingScreenData ? 'Loading...' : 'Loading images...'}
          </Text>
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
                  </View>
                  <View style={styles.checkmarkContainer}>
                    <Text style={styles.checkmark}>✓</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.previewButton}
                    onPress={() => handlePreviewImage(image)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.previewButtonText}>Preview</Text>
                  </TouchableOpacity>
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
      </ScrollView>

      {/* Footer Buttons */}
      {uploadedImages.length > 0 && (
        <View style={styles.footer}>
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
      )}

      {/* Image Preview Modal */}
      <Modal
        visible={previewImage !== null}
        transparent={true}
        animationType="fade"
        onRequestClose={closePreview}
      >
        <SafeAreaView style={styles.previewModalContainer}>
          {/* Header with Close Button */}
          <View style={styles.previewHeader}>
            <TouchableOpacity
              style={styles.previewCloseButton}
              onPress={closePreview}
              activeOpacity={0.7}
            >
              <Text style={styles.previewCloseButtonText}>×</Text>
            </TouchableOpacity>
          </View>
          
          {/* Image Frame Container */}
          <View style={styles.previewImageFrame}>
            {previewImage && (
              <Image
                source={{ uri: previewImage.originalUri || previewImage.uri }}
                style={styles.previewImage}
                resizeMode="contain"
              />
            )}
          </View>
        </SafeAreaView>
      </Modal>
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
    minHeight: 120,
  },
  imageThumbnail: {
    width: '100%',
    height: 70,
    borderRadius: 6,
    marginBottom: 6,
  },
  imageInfo: {
    marginBottom: 30,
    minHeight: 14,
  },
  imageFileName: {
    fontFamily: Poppins.regular,
    fontSize: 10,
    color: '#000000',
    marginBottom: 2,
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
  previewButton: {
    position: 'absolute',
    bottom: 2,
    left: 2,
    right: 2,
    backgroundColor: '#FF6E1A',
    borderRadius: 4,
    paddingVertical: 4,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewButtonText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontFamily: Poppins.medium,
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
  previewModalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
  },
  previewHeader: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 10 : 20,
    paddingBottom: 10,
    backgroundColor: 'transparent',
  },
  previewCloseButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewCloseButtonText: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: 'bold',
    lineHeight: 32,
  },
  previewImageFrame: {
    flex: 1,
    marginHorizontal: 20,
    marginBottom: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 10,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  previewImage: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
  },
  footer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    backgroundColor: '#FFFFFF',
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
