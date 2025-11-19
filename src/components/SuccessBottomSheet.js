import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableWithoutFeedback,
  TouchableOpacity,
  Platform,
  ScrollView,
} from 'react-native';
import { Poppins } from '../assets';
import CustomButton from './CustomButton';

const SuccessBottomSheet = ({ visible, onClose, onboardingId = '8925461' }) => {
  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View style={styles.bottomSheet}>
              <View style={styles.handle} />
              
              <ScrollView 
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
              >
              {/* Success Icon */}
              <View style={styles.successIconContainer}>
                <View style={styles.successCircle}>
                  <Text style={styles.checkmark}>✓</Text>
                </View>
              </View>

              {/* Congratulations Text */}
              <Text style={styles.congratulationsText}>Congratulations</Text>
              <Text style={styles.subText}>You have successfully completed the process</Text>

              {/* Dotted Separator */}
              <View style={styles.separator} />

              {/* Information Text */}
              <View style={styles.infoContainer}>
                <Text style={styles.infoText}>
                    Your request is under review, please reach out to{' '}
                    <Text style={styles.linkText}>onboarding@kamai.in</Text>
                    {' / '}
                    <Text style={styles.linkText}>080-46706906</Text>
                    {' with your Onboarding Id '}
                    <Text style={styles.boldText}>{onboardingId}</Text>
                    {' for further assistance. We would take 7-8 days to setup your outlet. We are eager as you are.'}
                </Text>
              </View>

              {/* Watch out message */}
              <Text style={styles.watchOutText}>Watch out for more updates!</Text>
              </ScrollView>

              {/* Dismiss Button */}
              <View style={styles.buttonContainer}>
                <CustomButton
                  title="Dismiss"
                  onPress={onClose}
                  style={styles.dismissButton}
                />
              </View>
            </View>
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
  bottomSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
    maxHeight: '90%',
    alignItems: 'center',
  },
  scrollContent: {
    alignItems: 'center',
    paddingBottom: 10,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: '#E0E0E0',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 20,
  },
  successIconContainer: {
    marginBottom: 20,
    alignItems: 'center',
  },
  successCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkmark: {
    color: '#FFFFFF',
    fontSize: 48,
    fontWeight: 'bold',
  },
  congratulationsText: {
    fontFamily: Poppins.semiBold,
    fontSize: 24,
    color: '#000000',
    marginBottom: 8,
    textAlign: 'center',
  },
  subText: {
    fontFamily: Poppins.regular,
    fontSize: 14,
    color: '#999999',
    marginBottom: 20,
    textAlign: 'center',
  },
  separator: {
    width: '100%',
    height: 1,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderStyle: 'dashed',
    marginBottom: 20,
  },
  infoContainer: {
    marginBottom: 20,
    paddingHorizontal: 10,
  },
  infoText: {
    fontFamily: Poppins.regular,
    fontSize: 14,
    color: '#000000',
    lineHeight: 22,
    textAlign: 'center',
  },
  boldText: {
    fontFamily: Poppins.semiBold,
    fontWeight: 'bold',
  },
  watchOutText: {
    fontFamily: Poppins.regular,
    fontSize: 14,
    color: '#000000',
    textAlign: 'center',
    marginTop: 10,
  },
  buttonContainer: {
    width: '100%',
    marginTop: 20,
    paddingBottom: 10,
  },
  dismissButton: {
    width: '100%',
  },
  linkText: {
    color: '#FF6E1A',
    textDecorationLine: 'underline',
  },
});

export default SuccessBottomSheet;
