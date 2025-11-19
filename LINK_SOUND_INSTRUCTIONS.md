# How to Link react-native-sound for Notification Tune

## Current Status
The app is currently using **vibration only** for notifications because `react-native-sound` needs to be linked to the native code.

## To Enable Sound Notifications:

### Step 1: Link the Native Module
Since you're using React Native 0.82+, auto-linking should work, but you need to rebuild:

```bash
# Clean the build
cd android && ./gradlew clean && cd ..

# Rebuild the app
npm run android
```

### Step 2: If Auto-linking Doesn't Work (Manual Linking)

#### For Android:
1. Open `android/settings.gradle` and ensure it includes:
```gradle
include ':react-native-sound'
project(':react-native-sound').projectDir = new File(rootProject.projectDir, '../node_modules/react-native-sound/android')
```

2. Open `android/app/build.gradle` and add:
```gradle
dependencies {
    ...
    implementation project(':react-native-sound')
}
```

3. Rebuild:
```bash
cd android && ./gradlew clean && cd ..
npm run android
```

### Step 3: Add Notification Sound File (Optional)

For custom sound:
1. Place your sound file in: `android/app/src/main/res/raw/notification.mp3`
2. Rebuild the app

## Current Behavior
- ✅ **Vibration works** - You'll feel vibration when new orders arrive
- ⏳ **Sound pending** - Will work after rebuild with linked native module

## Quick Test
Use the "Test Order" button in OrdersScreen - you should feel vibration. After rebuilding, you'll also hear the notification sound!
