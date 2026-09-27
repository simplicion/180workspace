package com.workspace180.socialmanager

import android.annotation.SuppressLint
import android.provider.Settings
import androidx.media3.common.util.UnstableApi
import com.workspace180.socialmanager.mediaengine.MediaEnginePlugin
import io.flutter.embedding.android.FlutterActivity
import io.flutter.embedding.engine.FlutterEngine
import io.flutter.plugin.common.MethodChannel

@UnstableApi
class MainActivity : FlutterActivity() {
    override fun configureFlutterEngine(flutterEngine: FlutterEngine) {
        super.configureFlutterEngine(flutterEngine)
        flutterEngine.plugins.add(MediaEnginePlugin())
        // Stable install key for device-slot reuse after a reinstall. ANDROID_ID (API 26+) is scoped to this app's
        // signing key + user + device and survives uninstall/reinstall; the server stores it only hashed per user.
        MethodChannel(flutterEngine.dartExecutor.binaryMessenger, "com.workspace180.socialmanager/device")
            .setMethodCallHandler { call, result ->
                if (call.method == "installKey") {
                    @SuppressLint("HardwareIds")
                    val id = Settings.Secure.getString(contentResolver, Settings.Secure.ANDROID_ID)
                    result.success(id)
                } else {
                    result.notImplemented()
                }
            }
    }
}
