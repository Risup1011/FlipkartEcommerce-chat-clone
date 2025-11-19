package com.kamai24

import android.content.Context
import android.content.res.Resources
import android.media.AudioAttributes
import android.media.AudioManager
import android.media.MediaPlayer
import android.net.Uri
import android.provider.Settings
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

class SoundModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {
    
    override fun getName(): String {
        return "SoundModule"
    }
    
    @ReactMethod
    fun playNotificationSound() {
        try {
            val context = reactApplicationContext
            val resources: Resources = context.resources
            val packageName: String = context.packageName
            
            // Try to load custom notification sound first
            val customSoundId = resources.getIdentifier("notification", "raw", packageName)
            
            val mediaPlayer = MediaPlayer()
            mediaPlayer.setAudioAttributes(
                AudioAttributes.Builder()
                    .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                    .setUsage(AudioAttributes.USAGE_NOTIFICATION)
                    .build()
            )
            
            if (customSoundId != 0) {
                // Custom sound file exists - use it
                val customSoundUri = Uri.parse("android.resource://$packageName/$customSoundId")
                mediaPlayer.setDataSource(context, customSoundUri)
            } else {
                // Fallback to system default notification sound
                val notificationSoundUri = Settings.System.DEFAULT_NOTIFICATION_URI
                mediaPlayer.setDataSource(context, notificationSoundUri)
            }
            
            mediaPlayer.prepare()
            mediaPlayer.start()
            
            // Release the media player after sound finishes
            mediaPlayer.setOnCompletionListener { mp ->
                mp.release()
            }
            
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }
}
