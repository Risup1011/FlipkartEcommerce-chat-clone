import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableWithoutFeedback,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  PermissionsAndroid,
  Keyboard,
  Image,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { launchImageLibrary, launchCamera } from 'react-native-image-picker';
import DocumentPicker from 'react-native-document-picker';
import { Poppins, icons } from '../assets';
import CustomHeader from './CustomHeader';
import CustomTextInput2 from './CustomTextInput2';
import CustomDropdown from './CustomDropdown';
import CustomButton from './CustomButton';
import CustomUploadButton from './CustomUploadButton';
import UploadBottomSheet from './UploadBottomSheet';
import SuccessBottomSheet from './SuccessBottomSheet';
import InfoBanner from './InfoBanner';
import { useToast } from './ToastContext';

const PackagingDetailsScreen = ({ onBack, onProceed }) => {
  const { showToast } = useToast();
  
  // Packaging Details
  const [orderPackagingCharges, setOrderPackagingCharges] = useState('');
  const [itemPackagingCharges, setItemPackagingCharges] = useState('');

  // Menu Details
  const [cuisineType, setCuisineType] = useState('');
  const [costForTwo, setCostForTwo] = useState('');
  const [isPureVegetarian, setIsPureVegetarian] = useState('');
  const [menuType, setMenuType] = useState('');
  const [menuImageFile, setMenuImageFile] = useState(null);
  const [takeAwayBillType, setTakeAwayBillType] = useState('');
  const [takeawayBillFile, setTakeawayBillFile] = useState(null);

  // Opening and Closing Time
  const [days, setDays] = useState('');
  const [slots, setSlots] = useState([
    {
      id: 1,
      openingTime: null,
      closingTime: null,
      showOpeningPicker: false,
      showClosingPicker: false,
    },
  ]);

  // Upload states
  const [showUploadBottomSheet, setShowUploadBottomSheet] = useState(false);
  const [currentUploadType, setCurrentUploadType] = useState(null); // 'menu' or 'takeaway'
  const [showSuccessBottomSheet, setShowSuccessBottomSheet] = useState(false);

  // Refs for all text inputs
  const costForTwoRef = useRef(null);

  // Function to blur all inputs
  const blurAllInputs = () => {
    costForTwoRef.current?.blur();
    Keyboard.dismiss();
  };

  // Options
  const yesNoOptions = ['Yes', 'No'];
  const cuisineTypeOptions = [
    'North Indian',
    'South Indian',
    'Chinese',
    'Italian',
    'Continental',
    'Fast Food',
    'Beverages',
    'Desserts',
    'Other',
  ];
  const menuTypeOptions = ['Image', 'PDF', 'Document'];
  const takeAwayBillTypeOptions = ['Image', 'PDF', 'Document'];
  const daysOptions = [
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday',
    'Sunday',
    'All Days',
  ];

  const formatTime = (date) => {
    if (!date) return '';
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  const handleAddSlot = () => {
    if (slots.length >= 2) {
      showToast('Maximum 2 slots allowed', 'error');
      return;
    }
    setSlots([
      ...slots,
      {
        id: slots.length + 1,
        openingTime: null,
        closingTime: null,
        showOpeningPicker: false,
        showClosingPicker: false,
      },
    ]);
  };

  const handleTimeChange = (slotId, type, event, selectedTime) => {
    if (Platform.OS === 'android') {
      setSlots(slots.map(slot => {
        if (slot.id === slotId) {
          return {
            ...slot,
            [type === 'opening' ? 'showOpeningPicker' : 'showClosingPicker']: false,
            [type === 'opening' ? 'openingTime' : 'closingTime']: event.type === 'set' ? selectedTime : slot[type === 'opening' ? 'openingTime' : 'closingTime'],
          };
        }
        return slot;
      }));
    } else {
      if (event.type === 'set' && selectedTime) {
        setSlots(slots.map(slot => {
          if (slot.id === slotId) {
            return {
              ...slot,
              [type === 'opening' ? 'openingTime' : 'closingTime']: selectedTime,
            };
          }
          return slot;
        }));
      }
    }
  };

  const handleMenuImageUpload = () => {
    setCurrentUploadType('menu');
    setShowUploadBottomSheet(true);
  };

  const handleTakeawayBillUpload = () => {
    setCurrentUploadType('takeaway');
    setShowUploadBottomSheet(true);
  };

  const requestStoragePermission = async () => {
    if (Platform.OS === 'android') {
      try {
        if (Platform.Version >= 33) {
          const granted = await PermissionsAndroid.requestMultiple([
            PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES,
            PermissionsAndroid.PERMISSIONS.READ_MEDIA_VIDEO,
          ]);
          return (
            granted['android.permission.READ_MEDIA_IMAGES'] === PermissionsAndroid.RESULTS.GRANTED ||
            granted['android.permission.READ_MEDIA_VIDEO'] === PermissionsAndroid.RESULTS.GRANTED
          );
        } else {
          const granted = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
          );
          return granted === PermissionsAndroid.RESULTS.GRANTED;
        }
      } catch (err) {
        console.warn(err);
        return false;
      }
    }
    return true;
  };

  const requestCameraPermission = async () => {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.CAMERA,
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      } catch (err) {
        console.warn(err);
        return false;
      }
    }
    return true;
  };

  const handleSelectGallery = async () => {
    const hasPermission = await requestStoragePermission();
    if (!hasPermission) {
      showToast('Storage permission is required', 'error');
      return;
    }

    if (currentUploadType === 'menu') {
      launchImageLibrary(
        {
          mediaType: 'photo',
          quality: 0.8,
          maxWidth: 2000,
          maxHeight: 2000,
        },
        (response) => {
          if (response.didCancel) {
            return;
          }
          if (response.errorMessage) {
            showToast(response.errorMessage, 'error');
            return;
          }
          if (response.assets && response.assets[0]) {
            const asset = response.assets[0];
            const fileData = {
              name: asset.fileName || asset.uri?.split('/').pop() || 'image.jpg',
              uri: asset.uri,
              type: asset.type,
              size: asset.fileSize,
            };
            setMenuImageFile(fileData);
            showToast('Menu image selected from gallery', 'success');
          }
        },
      );
    } else {
      launchImageLibrary(
        {
          mediaType: 'photo',
          quality: 0.8,
          maxWidth: 2000,
          maxHeight: 2000,
        },
        (response) => {
          if (response.didCancel) {
            return;
          }
          if (response.errorMessage) {
            showToast(response.errorMessage, 'error');
            return;
          }
          if (response.assets && response.assets[0]) {
            const asset = response.assets[0];
            const fileData = {
              name: asset.fileName || asset.uri?.split('/').pop() || 'image.jpg',
              uri: asset.uri,
              type: asset.type,
              size: asset.fileSize,
            };
            setTakeawayBillFile(fileData);
            showToast('Takeaway bill image selected from gallery', 'success');
          }
        },
      );
    }
    setShowUploadBottomSheet(false);
  };

  const handleSelectCamera = async () => {
    const hasPermission = await requestCameraPermission();
    if (!hasPermission) {
      showToast('Camera permission is required', 'error');
      return;
    }

    launchCamera(
      {
        mediaType: 'photo',
        quality: 0.8,
        maxWidth: 2000,
        maxHeight: 2000,
      },
      (response) => {
        if (response.didCancel) {
          return;
        }
        if (response.errorMessage) {
          showToast(response.errorMessage, 'error');
          return;
        }
        if (response.assets && response.assets[0]) {
          const asset = response.assets[0];
          const fileData = {
            name: asset.fileName || asset.uri?.split('/').pop() || 'image.jpg',
            uri: asset.uri,
            type: asset.type,
            size: asset.fileSize,
          };
          if (currentUploadType === 'menu') {
            setMenuImageFile(fileData);
          } else {
            setTakeawayBillFile(fileData);
          }
          showToast('Photo captured', 'success');
        }
      },
    );
    setShowUploadBottomSheet(false);
  };

  const handleSelectFiles = async () => {
    const hasPermission = await requestStoragePermission();
    if (!hasPermission) {
      showToast('Storage permission is required', 'error');
      return;
    }

    DocumentPicker.pick({
      type: [DocumentPicker.types.pdf, DocumentPicker.types.images],
      copyTo: 'cachesDirectory',
    })
      .then((response) => {
        if (response && response[0]) {
          const fileData = {
            name: response[0].name,
            uri: response[0].uri,
            type: response[0].type,
            size: response[0].size,
          };
          if (currentUploadType === 'menu') {
            setMenuImageFile(fileData);
          } else {
            setTakeawayBillFile(fileData);
          }
          showToast('File selected', 'success');
        }
      })
      .catch((err) => {
        if (DocumentPicker.isCancel(err)) {
          // User cancelled
        } else {
          showToast('Error selecting file', 'error');
        }
      });
    setShowUploadBottomSheet(false);
  };

  const handleProceed = () => {
    // Validate all required fields
    if (!orderPackagingCharges) {
      showToast('Please select if there are order packaging charges', 'error');
      return;
    }
    if (!itemPackagingCharges) {
      showToast('Please select if there are item packaging charges', 'error');
      return;
    }
    if (!cuisineType) {
      showToast('Please select cuisine type', 'error');
      return;
    }
    if (!costForTwo) {
      showToast('Please enter cost for two', 'error');
      return;
    }
    if (!isPureVegetarian) {
      showToast('Please select if restaurant is pure vegetarian', 'error');
      return;
    }
    if (!menuType) {
      showToast('Please select menu type', 'error');
      return;
    }
    if (!menuImageFile) {
      showToast('Please upload menu image', 'error');
      return;
    }
    if (!takeAwayBillType) {
      showToast('Please select take away bill type', 'error');
      return;
    }
    if (!takeawayBillFile) {
      showToast('Please upload takeaway bill', 'error');
      return;
    }
    if (!days) {
      showToast('Please select days', 'error');
      return;
    }
    
    // Validate slots
    for (let i = 0; i < slots.length; i++) {
      const slot = slots[i];
      if (!slot.openingTime) {
        showToast(`Please select opening hours for Slot ${i + 1}`, 'error');
        return;
      }
      if (!slot.closingTime) {
        showToast(`Please select closing hours for Slot ${i + 1}`, 'error');
        return;
      }
    }

    // Show success bottom sheet
    setShowSuccessBottomSheet(true);
  };

  const handleNavigateAfterSuccess = () => {
    setShowSuccessBottomSheet(false);
    // Navigate to next screen after 3 seconds (handled in SuccessBottomSheet)
    if (onProceed) {
      onProceed();
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <KeyboardAvoidingView
        style={styles.keyboardAvoidingView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <CustomHeader
          title="Packaging Details"
          onBack={onBack}
          showBackButton={true}
        />
        <TouchableWithoutFeedback onPress={blurAllInputs} accessible={false}>
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            onScrollBeginDrag={blurAllInputs}
          >
            {/* Packaging Details Section */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Packaging Details</Text>
              <InfoBanner
                text="Please note that item level charges apply on individual menu items and Order charges apply to one complete order"
              />

              <View style={styles.fieldContainer}>
                <Text style={styles.label}>
                  Are there any order packaging charges? <Text style={styles.asterisk}>*</Text>
                </Text>
                <CustomDropdown
                  value={orderPackagingCharges}
                  onSelect={(item) => setOrderPackagingCharges(typeof item === 'string' ? item : item.label || item.value)}
                  placeholder="Select"
                  options={yesNoOptions}
                  showSearch={false}
                />
              </View>

              <View style={styles.fieldContainer}>
                <Text style={styles.label}>
                  Are there any item packaging charges? <Text style={styles.asterisk}>*</Text>
                </Text>
                <CustomDropdown
                  value={itemPackagingCharges}
                  onSelect={(item) => setItemPackagingCharges(typeof item === 'string' ? item : item.label || item.value)}
                  placeholder="Select"
                  options={yesNoOptions}
                  showSearch={false}
                />
              </View>
            </View>

            {/* Menu Details Section */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Menu Details</Text>

              <View style={styles.fieldContainer}>
                <Text style={styles.label}>
                  What is the type of your cuisine? <Text style={styles.asterisk}>*</Text>
                </Text>
                <CustomDropdown
                  value={cuisineType}
                  onSelect={(item) => setCuisineType(typeof item === 'string' ? item : item.label || item.value)}
                  placeholder="Select"
                  options={cuisineTypeOptions}
                />
              </View>

              <View style={styles.fieldContainer}>
                <Text style={styles.label}>
                  What is the cost for two? <Text style={styles.asterisk}>*</Text>
                </Text>
                <CustomTextInput2
                  ref={costForTwoRef}
                  value={costForTwo}
                  onChangeText={setCostForTwo}
                  placeholder="Enter cost for two"
                  keyboardType="number-pad"
                />
              </View>

              <View style={styles.fieldContainer}>
                <Text style={styles.label}>
                  Is your Restaurant pure vegetarian? <Text style={styles.asterisk}>*</Text>
                </Text>
                <CustomDropdown
                  value={isPureVegetarian}
                  onSelect={(item) => setIsPureVegetarian(typeof item === 'string' ? item : item.label || item.value)}
                  placeholder="Select"
                  options={yesNoOptions}
                  showSearch={false}
                />
              </View>

              <View style={styles.fieldContainer}>
                <Text style={styles.label}>
                  Upload your Menu Type <Text style={styles.asterisk}>*</Text>
                </Text>
                <CustomDropdown
                  value={menuType}
                  onSelect={(item) => setMenuType(typeof item === 'string' ? item : item.label || item.value)}
                  placeholder="Select"
                  options={menuTypeOptions}
                  showSearch={false}
                />
              </View>

              <View style={styles.fieldContainer}>
                <Text style={styles.label}>
                  Upload your Menu image <Text style={styles.asterisk}>*</Text>
                </Text>
                <CustomUploadButton
                  onPress={handleMenuImageUpload}
                  fileName={menuImageFile?.name}
                  label="Drag and drop or browse files to upload"
                  subtext="[Max: 5MB] (jpg/jpeg/png/only)"
                />
              </View>

              <View style={styles.fieldContainer}>
                <Text style={styles.label}>
                  Upload your Take Away Bill type <Text style={styles.asterisk}>*</Text>
                </Text>
                <CustomDropdown
                  value={takeAwayBillType}
                  onSelect={(item) => setTakeAwayBillType(typeof item === 'string' ? item : item.label || item.value)}
                  placeholder="Select"
                  options={takeAwayBillTypeOptions}
                  showSearch={false}
                />
              </View>

              <View style={styles.fieldContainer}>
                <Text style={styles.label}>
                  Upload your Takeaway Bill Type <Text style={styles.asterisk}>*</Text>
                </Text>
                <CustomUploadButton
                  onPress={handleTakeawayBillUpload}
                  fileName={takeawayBillFile?.name}
                  label="Drag and drop or browse files to upload"
                  subtext="[Max: 5MB] (jpg/jpeg/png/only)"
                />
              </View>
            </View>

            {/* Opening and Closing Time Section */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Opening and Closing Time</Text>
              
              <InfoBanner
                text="Please enter timing when the outlets will open & close on Kamai."
              />
              
              <InfoBanner
                text="Please set your opening time on Kamai 15mins after your actually open it. This will give you some time to get prepared to serve orders better and avoid order cancellation which leads to bad customer experience. Also, if your restaurant for two slots i.e lunch and dinner, please mention slot 1 as lunch timings and slot 2 as Dinner timing"
              />

              <View style={styles.fieldContainer}>
                <Text style={styles.label}>
                  Days <Text style={styles.asterisk}>*</Text>
                </Text>
                <CustomDropdown
                  value={days}
                  onSelect={(item) => setDays(typeof item === 'string' ? item : item.label || item.value)}
                  placeholder="Select"
                  options={daysOptions}
                />
              </View>

              {slots.map((slot, index) => (
                <View key={slot.id} style={styles.slotContainer}>
                  <Text style={styles.slotTitle}>Slot {index + 1}</Text>

                  <View style={styles.fieldContainer}>
                    <Text style={styles.label}>
                      Opening Hours <Text style={styles.asterisk}>*</Text>
                    </Text>
                    <TouchableOpacity
                      style={styles.timeInput}
                      onPress={() => {
                        setSlots(slots.map(s => 
                          s.id === slot.id 
                            ? { ...s, showOpeningPicker: true }
                            : { ...s, showOpeningPicker: false, showClosingPicker: false }
                        ));
                      }}
                    >
                      <Text style={[
                        styles.timeInputText,
                        !slot.openingTime && styles.timeInputPlaceholder
                      ]}>
                        {slot.openingTime ? formatTime(slot.openingTime) : 'Select time'}
                      </Text>
                      <Image
                        source={icons.calendar}
                        style={styles.timeIcon}
                        resizeMode="contain"
                      />
                    </TouchableOpacity>
                    {slot.showOpeningPicker && (
                      <DateTimePicker
                        value={slot.openingTime || new Date()}
                        mode="time"
                        display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                        onChange={(event, time) => handleTimeChange(slot.id, 'opening', event, time)}
                      />
                    )}
                  </View>

                  <View style={styles.fieldContainer}>
                    <Text style={styles.label}>
                      Closing Hours <Text style={styles.asterisk}>*</Text>
                    </Text>
                    <TouchableOpacity
                      style={styles.timeInput}
                      onPress={() => {
                        setSlots(slots.map(s => 
                          s.id === slot.id 
                            ? { ...s, showClosingPicker: true }
                            : { ...s, showOpeningPicker: false, showClosingPicker: false }
                        ));
                      }}
                    >
                      <Text style={[
                        styles.timeInputText,
                        !slot.closingTime && styles.timeInputPlaceholder
                      ]}>
                        {slot.closingTime ? formatTime(slot.closingTime) : 'Select time'}
                      </Text>
                      <Image
                        source={icons.calendar}
                        style={styles.timeIcon}
                        resizeMode="contain"
                      />
                    </TouchableOpacity>
                    {slot.showClosingPicker && (
                      <DateTimePicker
                        value={slot.closingTime || new Date()}
                        mode="time"
                        display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                        onChange={(event, time) => handleTimeChange(slot.id, 'closing', event, time)}
                      />
                    )}
                  </View>
                </View>
              ))}

              {slots.length < 2 && (
                <TouchableOpacity
                  style={styles.addSlotButton}
                  onPress={handleAddSlot}
                  activeOpacity={0.7}
                >
                  <Text style={styles.addSlotButtonText}>+ Add Slot</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Continue Button */}
            <View style={styles.buttonContainer}>
              <CustomButton
                title="Continue"
                onPress={handleProceed}
              />
            </View>
          </ScrollView>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
      
      {/* Upload Bottom Sheet */}
      <UploadBottomSheet
        visible={showUploadBottomSheet}
        onClose={() => setShowUploadBottomSheet(false)}
        onSelectGallery={handleSelectGallery}
        onSelectCamera={handleSelectCamera}
        onSelectFiles={handleSelectFiles}
      />

      {/* Success Bottom Sheet */}
      <SuccessBottomSheet
        visible={showSuccessBottomSheet}
        onClose={() => setShowSuccessBottomSheet(false)}
        onNavigate={handleNavigateAfterSuccess}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 30,
  },
  section: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontFamily: Poppins.semiBold,
    fontSize: 18,
    color: '#000000',
    marginBottom: 15,
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
  asterisk: {
    color: '#FF0000',
  },
  slotContainer: {
    marginBottom: 20,
    padding: 15,
    backgroundColor: '#F9F9F9',
    borderRadius: 12,
  },
  slotTitle: {
    fontFamily: Poppins.semiBold,
    fontSize: 16,
    color: '#000000',
    marginBottom: 15,
  },
  timeInput: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    paddingHorizontal: 15,
    paddingVertical: 15,
    backgroundColor: '#FFFFFF',
    minHeight: 50,
  },
  timeInputText: {
    fontFamily: Poppins.regular,
    fontSize: 16,
    color: '#000000',
    flex: 1,
  },
  timeInputPlaceholder: {
    color: '#999999',
  },
  timeIcon: {
    width: 20,
    height: 20,
    tintColor: '#666666',
  },
  addSlotButton: {
    borderWidth: 1,
    borderColor: '#FF6E1A',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    marginTop: 10,
  },
  addSlotButtonText: {
    fontFamily: Poppins.medium,
    fontSize: 14,
    color: '#FF6E1A',
  },
  buttonContainer: {
    marginTop: 10,
    marginBottom: 20,
  },
});

export default PackagingDetailsScreen;
