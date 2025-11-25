# Firebase Push Notification Setup - Final Steps

## ✅ What's Already Done:

1. **Firebase packages installed** (`@react-native-firebase/app`, `@react-native-firebase/messaging`)
2. **Notification service created** (`src/utils/notificationService.js`)
3. **Android configuration updated** (build.gradle files)
4. **Permissions added** (AndroidManifest.xml)
5. **OTP verification updated** to send FCM token to backend
6. **App.js updated** to handle incoming notifications

---

## 🔴 What You Need to Do:

### **Step 1: Get google-services.json from Firebase Console**

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project (or create a new one if you don't have it)
3. Click on **Project Settings** (gear icon)
4. Scroll down to **Your apps** section
5. Click on your Android app (or add a new Android app if not exists)
   - Package name: `com.kamai24` (or whatever your package name is from `AndroidManifest.xml`)
6. Download the **google-services.json** file
7. Place it in: `android/app/google-services.json`

### **Step 2: Rebuild the Android App**

After adding `google-services.json`:

```bash
cd android
./gradlew clean
cd ..
npx react-native run-android
```

---

## 📱 How It Works:

### **1. OTP Verification Sends FCM Token**
When user verifies OTP, the app:
- Gets FCM token from Firebase
- Sends it to backend: `/partner/api/v1/auth/verify-otp`
- Request includes: `fcm_token` field

### **2. Backend Sends Notifications**
When new order arrives, backend:
- Uses FCM token to send push notification
- Notification payload should include:
  ```json
  {
    "notification": {
      "title": "New Order",
      "body": "You have received a new order!"
    },
    "data": {
      "notification_type": "NEW_ORDER",
      "order_id": "123456"
    }
  }
  ```

### **3. App Receives Notification**
- **Foreground**: Shows alert with "View" and "Dismiss" buttons
- **Background/Quit**: User taps notification → Opens Orders screen with "New" tab
- Automatically navigates to Orders screen when notification is opened

---

## 🧪 Testing:

### **Test FCM Token is Sent:**
1. Login with OTP
2. Check logs for: `🔔 [VerificationCodeScreen] FCM Token obtained: Yes`
3. Verify backend receives `fcm_token` in verify-otp request

### **Test Push Notifications:**
Use Firebase Console to send test notification:
1. Go to Firebase Console → Cloud Messaging
2. Send a test notification to your device's FCM token
3. Include in data payload:
   ```json
   {
     "notification_type": "NEW_ORDER"
   }
   ```

---

## 🔧 Troubleshooting:

### **"No FCM token available"**
- Make sure `google-services.json` is in `android/app/`
- Rebuild the app after adding the file
- Check notification permissions are granted (Android 13+)

### **"Permission denied"**
- On Android 13+, app will request POST_NOTIFICATIONS permission
- User must grant permission for FCM to work
- Permission is requested automatically when getting FCM token

### **Notifications not received**
- Verify FCM token was sent to backend successfully
- Check backend is sending notifications with correct FCM token
- Verify notification payload includes `notification` and `data` fields
- Check device is connected to internet

---

## 📋 Backend Integration Checklist:

- [ ] Backend receives `fcm_token` in verify-otp request
- [ ] Backend stores FCM token with partner/user record
- [ ] Backend sends push notification when new order arrives
- [ ] Notification includes `notification_type: "NEW_ORDER"` in data
- [ ] Backend handles token refresh (when token changes)

---

## 🚀 That's It!

Once you add `google-services.json` and rebuild, push notifications will be fully functional!
