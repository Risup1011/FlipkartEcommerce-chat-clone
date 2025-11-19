# Setup Notification Sound - Complete Guide

## ✅ What's Already Working:
1. **Auto-open screen** - NewOrdersScreen opens automatically when new orders arrive
2. **Vibration** - Works immediately (no setup needed)
3. **Sound library installed** - `react-native-sound` is installed

## 🎵 To Enable Notification Sound:

### Step 1: Rebuild the App (Required)
The native module needs to be linked. Run:

```bash
# Clean build
cd android && ./gradlew clean && cd ..

# Rebuild and install
npm run android
```

### Step 2: Add Notification Sound File (Optional but Recommended)

#### For Android:
1. Create the raw folder if it doesn't exist:
   ```bash
   mkdir -p android/app/src/main/res/raw
   ```

2. Place your notification sound file (MP3, OGG, or WAV) in:
   ```
   android/app/src/main/res/raw/notification.mp3
   ```

3. Rebuild:
   ```bash
   npm run android
   ```

#### Sound File Requirements:
- Format: MP3, OGG, or WAV
- Name: `notification.mp3` (or .ogg, .wav)
- Location: `android/app/src/main/res/raw/`
- Size: Keep it small (< 1MB recommended)

### Step 3: Test
1. Use the "Test Order" button in OrdersScreen
2. The screen should open automatically
3. You should hear the notification sound + feel vibration

## 🔧 How It Works:

1. **When new orders arrive:**
   - NewOrdersScreen opens automatically
   - Vibration plays immediately
   - Notification sound plays (after rebuild)

2. **Sound Priority:**
   - First tries: Custom sound file (`notification.mp3`)
   - Falls back to: System default notification sound
   - Always includes: Vibration

## 📝 Current Status:
- ✅ Auto-open: Working
- ✅ Vibration: Working
- ⏳ Sound: Needs rebuild to link native module

## 🚀 Quick Start:
After rebuilding, everything will work automatically. The notification sound will play whenever:
- New orders arrive via API/WebSocket
- You tap "Test Order" button
- The NewOrdersScreen opens
