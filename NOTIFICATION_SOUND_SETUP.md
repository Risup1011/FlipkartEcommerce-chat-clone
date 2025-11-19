# Notification Sound Setup

## Quick Setup (Using System Sound)

The app is configured to play a notification sound when new orders arrive. Currently, it will use vibration as a fallback if no sound file is found.

## To Add a Custom Notification Sound:

### For Android:
1. Place your notification sound file (MP3, OGG, or WAV) in:
   ```
   android/app/src/main/res/raw/notification.mp3
   ```
2. The file should be named `notification.mp3` (or .ogg, .wav)
3. Rebuild the app: `npm run android`

### For iOS:
1. Add your sound file to the Xcode project
2. Place it in the project root or Resources folder
3. Make sure it's included in the bundle
4. Rebuild the app: `npm run ios`

## Using System Default Sound (Recommended)

The code will automatically try to use the system's default notification sound if a custom file is not found. The vibration will always play as a companion notification.

## Testing

Use the "Test Order" button in the OrdersScreen to test the notification sound.
