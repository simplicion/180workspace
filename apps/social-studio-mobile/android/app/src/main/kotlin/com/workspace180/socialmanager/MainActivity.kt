package com.workspace180.socialmanager

import androidx.media3.common.util.UnstableApi
import com.workspace180.socialmanager.mediaengine.MediaEnginePlugin
import io.flutter.embedding.android.FlutterActivity
import io.flutter.embedding.engine.FlutterEngine

@UnstableApi
class MainActivity : FlutterActivity() {
    override fun configureFlutterEngine(flutterEngine: FlutterEngine) {
        super.configureFlutterEngine(flutterEngine)
        flutterEngine.plugins.add(MediaEnginePlugin())
    }
}
