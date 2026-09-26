package com.workspace180.socialmanager.mediaengine

import android.content.Context
import android.os.Handler
import android.os.Looper
import androidx.media3.common.util.UnstableApi
import io.flutter.embedding.engine.plugins.FlutterPlugin
import io.flutter.plugin.common.EventChannel
import io.flutter.plugin.common.MethodCall
import io.flutter.plugin.common.MethodChannel
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.Executors
import java.util.concurrent.atomic.AtomicBoolean

/**
 * Flutter bridge for the on-device media engine.
 *
 * MethodChannel `com.workspace180.socialmanager/media_engine`:
 *   getVideoInfo, extractAudio, generateThumbnails, sliceVideo, detectSilences, detectFaces,
 *   detectBeats, renderEditIr, cancelRender, renderJobStatus,
 *   detectScenes, recognizeText, measureLoudness, probeExport, cancelAnalysis
 * EventChannel `com.workspace180.socialmanager/media_engine/render_events`:
 *   {jobId, state: started|progress|completed|failed|cancelled, progress, ...}
 *   {jobId, kind: "analysis", state: "progress", progress} for analysis calls given a jobId.
 *
 * While any render runs, [RenderForegroundService] holds a foreground service with a progress
 * notification so the export survives the app being backgrounded.
 *
 * Every failure is reported as a PlatformException with a stable code — there are no
 * placeholder outputs.
 */
@UnstableApi
class MediaEnginePlugin : FlutterPlugin, MethodChannel.MethodCallHandler, EventChannel.StreamHandler {
    companion object {
        const val METHOD_CHANNEL = "com.workspace180.socialmanager/media_engine"
        const val EVENT_CHANNEL = "com.workspace180.socialmanager/media_engine/render_events"
    }

    private lateinit var context: Context
    private var methodChannel: MethodChannel? = null
    private var eventChannel: EventChannel? = null
    private var eventSink: EventChannel.EventSink? = null
    private val main = Handler(Looper.getMainLooper())
    private val io = Executors.newFixedThreadPool(2)
    private val jobs = HashMap<String, EditIrRenderer>()
    private val jobProgress = HashMap<String, Double>()
    private val analysisCancel = ConcurrentHashMap<String, AtomicBoolean>()

    override fun onAttachedToEngine(binding: FlutterPlugin.FlutterPluginBinding) {
        context = binding.applicationContext
        methodChannel = MethodChannel(binding.binaryMessenger, METHOD_CHANNEL).also { it.setMethodCallHandler(this) }
        eventChannel = EventChannel(binding.binaryMessenger, EVENT_CHANNEL).also { it.setStreamHandler(this) }
    }

    override fun onDetachedFromEngine(binding: FlutterPlugin.FlutterPluginBinding) {
        analysisCancel.values.forEach { it.set(true) }
        jobs.values.forEach { it.cancel() }
        jobs.clear()
        jobProgress.clear()
        RenderForegroundService.stop()
        methodChannel?.setMethodCallHandler(null)
        eventChannel?.setStreamHandler(null)
        io.shutdown()
    }

    override fun onListen(arguments: Any?, events: EventChannel.EventSink) {
        eventSink = events
    }

    override fun onCancel(arguments: Any?) {
        eventSink = null
    }

    private fun emit(event: Map<String, Any?>) {
        main.post {
            val state = event["state"]
            val jobId = event["jobId"] as String
            if (state == "completed" || state == "failed" || state == "cancelled") {
                jobs.remove(jobId)
                jobProgress.remove(jobId)
                if (jobs.isEmpty()) RenderForegroundService.stop()
            } else if (jobs.containsKey(jobId)) {
                jobProgress[jobId] = (event["progress"] as Double?) ?: 0.0
                val overall = jobs.keys.sumOf { jobProgress[it] ?: 0.0 } / jobs.size
                RenderForegroundService.update(jobs.size, overall)
            }
            eventSink?.success(event)
        }
    }

    /** Cancellation flag + progress events for an analysis call; without a jobId it is neither. */
    private fun analysisControl(jobId: String?): Pair<AnalysisControl, () -> Unit> {
        if (jobId == null) return AnalysisControl() to {}
        val flag = AtomicBoolean(false)
        analysisCancel[jobId] = flag
        val control = AnalysisControl({ flag.get() }) { p ->
            main.post { eventSink?.success(mapOf("jobId" to jobId, "kind" to "analysis", "state" to "progress", "progress" to p)) }
        }
        return control to { analysisCancel.remove(jobId) }
    }

    /** Runs an analysis [block] in the background with its control, releasing the flag afterwards. */
    private fun analysis(call: MethodCall, result: MethodChannel.Result, block: (AnalysisControl) -> Any?) {
        val (control, done) = analysisControl(call.argument<String>("jobId"))
        background(result) {
            try {
                block(control)
            } finally {
                done()
            }
        }
    }

    private fun <T> MethodCall.req(name: String): T =
        argument<T>(name) ?: throw MediaEngineError("INVALID_ARGS", "Missing argument '$name'")

    /** Runs [block] on the IO pool and posts its value/error back to [result] on the main thread. */
    private fun background(result: MethodChannel.Result, block: () -> Any?) {
        io.execute {
            try {
                val v = block()
                main.post { result.success(v) }
            } catch (e: MediaEngineError) {
                main.post { result.error(e.code, e.message, null) }
            } catch (e: EditIrException) {
                main.post { result.error(e.code, e.message, null) }
            } catch (e: Exception) {
                main.post { result.error("NATIVE_ERROR", e.message ?: e.toString(), null) }
            }
        }
    }

    override fun onMethodCall(call: MethodCall, result: MethodChannel.Result) {
        try {
            when (call.method) {
                "getVideoInfo" -> {
                    val path = call.req<String>("sourcePath")
                    background(result) { MediaTools.getVideoInfo(path) }
                }
                "extractAudio" -> {
                    val src = call.req<String>("sourcePath")
                    val dest = call.req<String>("destPath")
                    val format = call.argument<String>("format") ?: if (dest.endsWith(".wav", true)) "wav" else "m4a"
                    when (format) {
                        "wav" -> background(result) { MediaTools.extractAudioToWav(src, dest) }
                        "m4a" -> MediaTools.extractAudioToM4a(context, src, dest) { r ->
                            main.post {
                                r.fold(
                                    { result.success(it) },
                                    { e -> result.error((e as? MediaEngineError)?.code ?: "EXTRACT_FAILED", e.message, null) },
                                )
                            }
                        }
                        else -> throw MediaEngineError("INVALID_ARGS", "format must be 'wav' or 'm4a'")
                    }
                }
                "generateThumbnails" -> {
                    val src = call.req<String>("sourcePath")
                    val dir = call.req<String>("outputDir")
                    val times = call.req<List<Number>>("timesMs").map { it.toLong() }
                    val width = call.argument<Number>("maxWidth")?.toInt() ?: 0
                    val exact = call.argument<Boolean>("exact") ?: false
                    background(result) { MediaTools.generateThumbnails(src, dir, times, width, exact) }
                }
                "sliceVideo" -> {
                    val src = call.req<String>("sourcePath")
                    val dest = call.req<String>("destPath")
                    val startMs = call.req<Number>("startMs").toLong()
                    val endMs = call.req<Number>("endMs").toLong()
                    background(result) { MediaTools.sliceVideo(src, dest, startMs, endMs); dest }
                }
                "detectSilences" -> {
                    val src = call.req<String>("sourcePath")
                    val minSilenceMs = call.argument<Number>("minSilenceMs")?.toLong() ?: 500L
                    val thresholdDb = call.argument<Number>("thresholdDb")?.toDouble() ?: -40.0
                    background(result) { MediaTools.detectSilences(src, minSilenceMs, thresholdDb) }
                }
                "detectFaces" -> {
                    val src = call.req<String>("sourcePath")
                    val every = call.argument<Number>("sampleEveryMs")?.toLong() ?: 500L
                    background(result) { OnDeviceAnalysis.detectFaces(src, every) }
                }
                "detectBeats" -> {
                    val src = call.req<String>("audioPath")
                    background(result) { MediaTools.detectBeats(src) }
                }
                "detectScenes" -> {
                    val src = call.req<String>("sourcePath")
                    analysis(call, result) { MediaIntelligence.detectScenes(src, it) }
                }
                "recognizeText" -> {
                    val src = call.req<String>("sourcePath")
                    val every = call.argument<Number>("sampleEveryMs")?.toLong() ?: 1000L
                    analysis(call, result) { MediaIntelligence.recognizeText(src, every, it) }
                }
                "measureLoudness" -> {
                    val src = call.req<String>("sourcePath")
                    analysis(call, result) { MediaIntelligence.measureLoudness(src, it) }
                }
                "probeExport" -> {
                    val src = call.req<String>("path")
                    analysis(call, result) { MediaIntelligence.probeExport(src, it) }
                }
                "cancelAnalysis" -> {
                    val flag = analysisCancel[call.req<String>("jobId")]
                    flag?.set(true)
                    result.success(flag != null)
                }
                "renderJobStatus" -> {
                    val jobId = call.req<String>("jobId")
                    result.success(mapOf("running" to jobs.containsKey(jobId), "progress" to jobProgress[jobId]))
                }
                "renderEditIr" -> {
                    val jobId = call.req<String>("jobId")
                    if (jobs.containsKey(jobId)) throw MediaEngineError("JOB_EXISTS", "Render job '$jobId' is already running")
                    val ir = MobileEditIr.parse(call.req("editIrJson"))
                    val media = RenderMedia(
                        assetPaths = call.argument<Map<String, String>>("assetPaths") ?: emptyMap(),
                        overlayPaths = call.argument<Map<String, String>>("overlayPaths") ?: emptyMap(),
                        musicPaths = call.argument<Map<String, String>>("musicPaths") ?: emptyMap(),
                        fontPaths = call.argument<Map<String, String>>("fontPaths") ?: emptyMap(),
                        watermarkPath = call.argument<String>("watermarkPath"),
                        sfxPaths = call.argument<Map<String, String>>("sfxPaths") ?: emptyMap(),
                    )
                    val renderer = EditIrRenderer(context, jobId, ir, media, call.req("outputPath"), ::emit)
                    jobs[jobId] = renderer
                    RenderForegroundService.start(context, jobs.size)
                    renderer.start()
                    result.success(jobId)
                }
                "cancelRender" -> {
                    val jobId = call.req<String>("jobId")
                    val job = jobs[jobId]
                    if (job == null) {
                        result.success(false)
                    } else {
                        job.cancel()
                        result.success(true)
                    }
                }
                else -> result.notImplemented()
            }
        } catch (e: MediaEngineError) {
            result.error(e.code, e.message, null)
        } catch (e: EditIrException) {
            result.error(e.code, e.message, null)
        } catch (e: Exception) {
            result.error("NATIVE_ERROR", e.message ?: e.toString(), null)
        }
    }
}
