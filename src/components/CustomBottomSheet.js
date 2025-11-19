import React from 'react';
import {
  View,
  StyleSheet,
  Modal,
  TouchableWithoutFeedback,
  TouchableOpacity,
  Text,
  Platform,
  KeyboardAvoidingView,
  Dimensions,
} from 'react-native';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

const CustomBottomSheet = ({
  visible,
  onClose,
  children,
  maxHeight = '50%',
  showOverlay = true,
  dismissOnOverlayPress = true,
}) => {
  const handleOverlayPress = () => {
    if (dismissOnOverlayPress) {
      onClose();
    }
  };

  // Convert percentage string to actual height
  const getMaxHeight = () => {
    if (typeof maxHeight === 'string' && maxHeight.includes('%')) {
      const percentage = parseFloat(maxHeight.replace('%', ''));
      return (SCREEN_HEIGHT * percentage) / 100;
    }
    return maxHeight;
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={handleOverlayPress}>
        <View style={[styles.overlay, !showOverlay && styles.overlayTransparent]}>
          <TouchableWithoutFeedback>
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
              style={styles.keyboardView}
            >
              <View style={[styles.bottomSheet, { height: getMaxHeight() }]}>
                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={onClose}
                  activeOpacity={0.7}
                >
                  <Text style={styles.closeButtonText}>×</Text>
                </TouchableOpacity>
                {children}
              </View>
            </KeyboardAvoidingView>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  overlayTransparent: {
    backgroundColor: 'transparent',
  },
  keyboardView: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  bottomSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    position: 'relative',
    width: '100%',
    minHeight: 200,
  },
  closeButton: {
    position: 'absolute',
    top: 20,
    right: 20,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  closeButtonText: {
    fontSize: 24,
    color: '#666666',
    lineHeight: 28,
    fontWeight: '300',
  },
});

export default CustomBottomSheet;
