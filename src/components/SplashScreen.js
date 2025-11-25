

import React, { useEffect, useState } from 'react';
import { StyleSheet, SafeAreaView } from 'react-native';
import Video from 'react-native-video';

const SplashScreen = ({ onFinish }) => {
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowSplash(false);
      if (onFinish) onFinish();
    }, 8000); // 5 seconds
    return () => clearTimeout(timer);
  }, []);

  if (!showSplash) return null;

  return (
    <SafeAreaView style={styles.container}>
      <Video
        source={require('../assets/images/AnimatedSplashScreen.mp4')}
        style={styles.video}
        resizeMode="cover"
        repeat
        muted
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  video: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
});

export default SplashScreen;
