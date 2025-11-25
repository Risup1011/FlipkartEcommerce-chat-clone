# ⚠️ IMPORTANT: google-services.json Missing!

## You need to add this file before the app will work!

### Steps to Get google-services.json:

1. **Go to Firebase Console:** https://console.firebase.google.com/
2. **Select/Create Your Project**
3. **Click Project Settings** (gear icon)
4. **Go to "Your apps" section**
5. **Add Android App** (or select existing one)
   - Package name: `com.kamai24` (check AndroidManifest.xml)
   - App nickname: Kamai24 (optional)
   - Debug signing certificate SHA-1: (optional for now)
6. **Download google-services.json**
7. **Place it here:** `android/app/google-services.json`

### After Adding the File:

```bash
# Rebuild the app
cd android
./gradlew clean
cd ..
npx react-native run-android
```

---

## Without this file, you'll see errors like:
- "Native module RNFBAppModule not found"
- "initializeNotifications of undefined"

This is expected! Once you add the file and rebuild, everything will work.
