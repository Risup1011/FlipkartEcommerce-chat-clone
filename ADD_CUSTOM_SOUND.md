# 🎵 Add Custom "Tring Tring" Notification Sound

## Quick Setup:

### Step 1: Get a "Tring Tring" Sound File
You can:
- Download a phone ring sound (MP3 format)
- Use a free sound from: https://freesound.org (search "phone ring" or "notification")
- Record your own "tring tring" sound

**Recommended:** Download a short phone ring/notification sound in MP3 format (1-2 seconds, < 500KB)

### Step 2: Add the Sound File

1. **Create the raw folder** (if it doesn't exist):
   ```bash
   mkdir -p android/app/src/main/res/raw
   ```

2. **Place your sound file** in the raw folder:
   ```
   android/app/src/main/res/raw/notification.mp3
   ```
   
   **Important:** The file MUST be named `notification.mp3` (or `notification.ogg`, `notification.wav`)

3. **Supported formats:**
   - MP3 (recommended)
   - OGG
   - WAV

### Step 3: Rebuild the App

```bash
cd android && ./gradlew clean && cd ..
npm run android
```

## After Rebuild:
- ✅ Custom "tring tring" sound will play when new orders arrive
- ✅ Screen opens automatically
- ✅ Vibration also plays

## File Location:
```
android/app/src/main/res/raw/notification.mp3
```

## Quick Download Links (Free Sounds):
- https://freesound.org/search/?q=phone+ring
- https://mixkit.co/free-sound-effects/notification/
- Search for "notification sound mp3" or "phone ring sound mp3"

## Test:
After adding the file and rebuilding, use the "Test Order" button - you'll hear your custom "tring tring" sound!
