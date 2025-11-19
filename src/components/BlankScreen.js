import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import CustomHeader from './CustomHeader';

const BlankScreen = ({ onBack }) => {
  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <CustomHeader
        title=""
        onBack={onBack}
        showBackButton={true}
      />
      <View style={styles.content}>
        {/* This screen is intentionally left blank */}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  content: {
    flex: 1,
  },
});

export default BlankScreen;
