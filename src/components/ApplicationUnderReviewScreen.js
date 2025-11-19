import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  Image,
  ScrollView,
} from 'react-native';
import { Poppins, images } from '../assets';

const ApplicationUnderReviewScreen = ({ onboardingId = '8925461' }) => {
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Illustration */}
        <View style={styles.illustrationContainer}>
          <Image
            source={images.congrats}
            style={styles.illustration}
            resizeMode="contain"
          />
        </View>

        {/* Heading */}
        <Text style={styles.heading}>APPLICATION UNDER REVIEW</Text>

        {/* Sub Text */}
        <Text style={styles.subText}>
          Our team is eagerly working to review your application.
        </Text>

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
        {/* <Text style={styles.watchOutText}>Watch out for more updates!</Text> */}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 40,
    alignItems: 'center',
  },
  illustrationContainer: {
    width: '100%',
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 30,
  },
  illustration: {
    width: 300,
    height: 300,
  },
  heading: {
    fontFamily: Poppins.bold,
    fontSize: 24,
    fontWeight: '700',
    color: '#000000',
    marginBottom: 12,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  subText: {
    fontFamily: Poppins.regular,
    fontSize: 16,
    color: '#4CAF50',
    marginBottom: 30,
    textAlign: 'center',
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
    fontWeight: '600',
  },
  linkText: {
    color: '#FF6E1A',
    textDecorationLine: 'underline',
  },
  watchOutText: {
    fontFamily: Poppins.regular,
    fontSize: 14,
    color: '#000000',
    textAlign: 'center',
    marginTop: 10,
    marginBottom: 20,
  },
});

export default ApplicationUnderReviewScreen;
