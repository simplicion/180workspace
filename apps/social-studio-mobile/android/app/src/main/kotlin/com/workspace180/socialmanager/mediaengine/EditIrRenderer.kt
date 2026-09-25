package com.workspace180.socialmanager.mediaengine

import android.content.Context
import android.graphics.BitmapFactory
import android.graphics.Color
import android.graphics.Typeface
import android.net.Uri
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.os.StatFs
import androidx.media3.common.C
import androidx.media3.common.Effect
import androidx.media3.common.MediaItem
import androidx.media3.common.MimeTypes
import androidx.media3.common.audio.AudioProcessor
import androidx.media3.common.audio.SpeedProvider
import androidx.media3.common.util.UnstableApi
import androidx.media3.effect.Brightness
import androidx.media3.effect.Contrast
import androidx.media3.effect.Crop
import androidx.media3.effect.FrameDropEffect
import androidx.media3.effect.HslAdjustment
import androidx.media3.effect.OverlayEffect
import androidx.media3.effect.Presentation
import androidx.media3.effect.RgbAdjustment
import androidx.media3.effect.RgbFilter
import androidx.media3.effect.ScaleAndRotateTransformation
import androidx.media3.transformer.Composition
import androidx.media3.transformer.EditedMediaItem
import androidx.media3.transformer.EditedMediaItemSequence
import androidx.media3.transformer.Effects
import androidx.media3.transformer.ExportException
import androidx.media3.transformer.ExportResult
import androidx.media3.transformer.ProgressHolder
import androidx.media3.transformer.Transformer
import java.io.File
import kotlin.math.abs
import kotlin.math.min
import kotlin.math.roundToLong

/** Local files for everything the IR references. The IR itself carries no device paths. */
data class RenderMedia(
    /** assetId -> local video path for `clips[].assetId`. */
    val assetPaths: Map<String, String>,
    /** overlay id -> local video path (downloaded/cached B-roll). */
    val overlayPaths: Map<String, String>,
    /** music id -> local audio path. */
    val musicPaths: Map<String, String>,
    /** font family (e.g. "Inter") or "family:weight" (e.g. "Inter:800") -> .ttf/.otf path. */
    val fontPaths: Map<String, String>,
    /** Local image file (PNG/JPEG/WebP) for `watermark`, downloaded by the Dart side. Null = none supplied. */
    val watermarkPath: String? = null,
)

/** Events are plain maps so they can go straight over the EventChannel. */
typealias RenderEventSink = (Map<String, Any?>) -> Unit

/**
 * Renders a `mobile-editir/1` timeline to an H.264/AAC MP4 with AndroidX Media3 Transformer.
 *
 * Composition layout:
 *  - No B-roll: one sequence of main clips carrying audio+video.
 *  - With B-roll: a video-only sequence where B-roll pieces replace the main picture for their
 *    interval (full-canvas cover, muted), plus an audio-only sequence of the main clips so speech
 *    continues underneath (contract §3.3).
 *  - Music: an extra audio-only sequence (gap -> looped source items) with a timeline gain
 *    envelope for fades and speech ducking (contract §3.6).
 *  - Composition-level effects on the output timeline: frame-rate cap, zoom punch-ins,
 *    transition dips, captions.
 *  - HDR (PQ/HLG) sources are tone-mapped to SDR in OpenGL because the output is 8-bit H.264.
 */
@UnstableApi
class EditIrRenderer(
    private val context: Context,
    private val jobId: String,
    private val ir: MobileEditIr,
    private val media: RenderMedia,
    private val outputPath: String,
    private val emit: RenderEventSink,
) {
    private companion object {
        val BUNDLED_INTER_WEIGHTS = listOf(400, 600, 800)
        const val MB = 1024L * 1024L
        const val STORAGE_HEADROOM_BYTES = 32 * MB
    }

    private val mainHandler = Handler(Looper.getMainLooper())
    private val warnings = mutableListOf<String>()
    private var transformer: Transformer? = null
    @Volatile private var cancelled = false
    @Volatile private var finished = false

    private data class Probe(
        val durationMs: Long,
        val hasAudio: Boolean,
        val hasVideo: Boolean,
        val displayWidth: Int,
        val displayHeight: Int,
        val frameRate: Double?,
        val isHdr: Boolean,
    )
    private val probes = HashMap<String, Probe>()

    /** Builds the composition on a worker thread, then starts the export on the main looper. */
    fun start() {
        Thread({
            val composition = try {
                buildComposition()
            } catch (e: EditIrException) {
                fail(e.code, e.message ?: "invalid editIR", null)
                return@Thread
            } catch (e: Exception) {
                fail("RENDER_SETUP_FAILED", e.message ?: e.toString(), null)
                return@Thread
            }
            try {
                checkFreeSpace()
            } catch (e: MediaEngineError) {
                fail(e.code, e.message ?: "insufficient storage", null)
                return@Thread
            }
            mainHandler.post { startExport(composition) }
        }, "EditIrRenderer-$jobId").start()
    }

    fun cancel() {
        mainHandler.post {
            if (finished) return@post
            cancelled = true
            finished = true
            transformer?.cancel()
            File(outputPath).delete()
            emit(event("cancelled", progress = null))
        }
    }

    // ---------------------------------------------------------------------------------------
    // Composition

    private fun probe(path: String): Probe = probes.getOrPut(path) {
        val f = File(path)
        if (!f.isFile) throw EditIrException("MISSING_MEDIA", "File not found: $path")
        val info = MediaTools.getVideoInfo(path)
        Probe(
            durationMs = (info["durationMs"] as Number).toLong(),
            hasAudio = info["hasAudio"] as Boolean,
            hasVideo = info["hasVideo"] as Boolean,
            displayWidth = (info["displayWidth"] as Number).toInt(),
            displayHeight = (info["displayHeight"] as Number).toInt(),
            frameRate = (info["frameRate"] as Number?)?.toDouble(),
            isHdr = info["isHdr"] as Boolean,
        )
    }

    private fun assetPath(assetId: String) = media.assetPaths[assetId]
        ?: throw EditIrException("MISSING_MEDIA", "No local file supplied for assetId '$assetId'")

    private fun constantSpeed(speed: Float) = object : SpeedProvider {
        override fun getSpeed(timeUs: Long): Float = speed
        override fun getNextSpeedChangeTimeUs(timeUs: Long): Long = C.TIME_UNSET
    }

    private fun clippedItem(path: String, startUs: Long, endUs: Long): MediaItem =
        MediaItem.Builder()
            .setUri(Uri.fromFile(File(path)))
            .setClippingConfiguration(
                MediaItem.ClippingConfiguration.Builder()
                    .setStartPositionUs(startUs)
                    .setEndPositionUs(endUs)
                    .build(),
            )
            .build()

    private fun mainVideoEffects(clip: IrClip): List<Effect> {
        val fx = mutableListOf<Effect>()
        // Rotate/flip first so crop and fit work in the rotated picture's coordinates.
        // Media3 rotates counter-clockwise; the contract's rotationDeg is clockwise.
        if (clip.rotationDeg != 0) fx.add(ScaleAndRotateTransformation.Builder().setRotationDegrees(-clip.rotationDeg.toFloat()).build())
        if (clip.flipH) fx.add(ScaleAndRotateTransformation.Builder().setScale(-1f, 1f).build())
        val crop = clip.crop
        if (crop != null) {
            // Contract §3.2 NDC mapping.
            fx.add(
                Crop(
                    (2 * crop.x - 1).toFloat(),
                    (2 * (crop.x + crop.width) - 1).toFloat(),
                    (1 - 2 * (crop.y + crop.height)).toFloat(),
                    (1 - 2 * crop.y).toFloat(),
                ),
            )
            fx.add(Presentation.createForWidthAndHeight(ir.canvas.width, ir.canvas.height, Presentation.LAYOUT_SCALE_TO_FIT_WITH_CROP))
        } else {
            fx.add(Presentation.createForWidthAndHeight(ir.canvas.width, ir.canvas.height, Presentation.LAYOUT_SCALE_TO_FIT))
            // Presentation leaves the bars black; paint them in canvas.background when it differs.
            if (ir.canvas.background != Color.BLACK) {
                val p = probe(assetPath(clip.assetId))
                val swap = clip.rotationDeg % 180 != 0
                val w = if (swap) p.displayHeight else p.displayWidth
                val h = if (swap) p.displayWidth else p.displayHeight
                if (w > 0 && h > 0) fx.add(OverlayEffect(listOf(LetterboxFill(ir.canvas.background, w.toFloat() / h))))
            }
        }
        clip.filter?.let { f ->
            when (f.preset) {
                "NOIR_BW" -> fx.add(RgbFilter.createGrayscaleFilter())
                "VIVID" -> fx.add(HslAdjustment.Builder().adjustSaturation(25f).build())
                "CINEMATIC_TEAL_ORANGE" -> fx.add(RgbAdjustment.Builder().setRedScale(1.08f).setGreenScale(1.0f).setBlueScale(0.92f).build())
                "VINTAGE_WARM" -> fx.add(RgbAdjustment.Builder().setRedScale(1.1f).setGreenScale(1.02f).setBlueScale(0.85f).build())
                "CYBER_NEON" -> fx.add(RgbAdjustment.Builder().setRedScale(1.05f).setGreenScale(0.9f).setBlueScale(1.15f).build())
                "GLOW" -> fx.add(Brightness(0.06f))
                "NORMAL" -> Unit
                else -> warnings.add("filter preset '${f.preset}' unknown; only multipliers applied")
            }
            if (abs(f.brightness - 1.0) > 1e-3) fx.add(Brightness((f.brightness - 1.0).toFloat().coerceIn(-1f, 1f)))
            if (abs(f.contrast - 1.0) > 1e-3) fx.add(Contrast((f.contrast - 1.0).toFloat().coerceIn(-1f, 1f)))
            if (abs(f.saturation - 1.0) > 1e-3) {
                fx.add(HslAdjustment.Builder().adjustSaturation(((f.saturation - 1.0) * 100).toFloat().coerceIn(-100f, 100f)).build())
            }
        }
        return fx
    }

    private fun clipAudioProcessors(index: Int, clip: IrClip): List<AudioProcessor> {
        val durMs = (clip.timelineEndMs - clip.timelineStartMs).toDouble()
        val fadeIn = clip.transitionIn?.takeIf { it.type != "CUT" }?.durationMs?.div(2.0) ?: 0.0
        val next = ir.clips.getOrNull(index + 1)
        val fadeOut = next?.transitionIn?.takeIf { it.type != "CUT" }?.durationMs?.div(2.0) ?: 0.0
        val model = ClipAudioGainModel(durMs, ir.audio.originalVolumeDb + clip.volumeDb, fadeIn, fadeOut)
        return listOf(EnvelopeGainProcessor { tUs -> model.gainAtItemMs(tUs / 1000.0) })
    }

    /** Timeline piece of the video track: either main-clip picture or a B-roll cutaway. */
    private data class Piece(val startMs: Double, val endMs: Double, val clipIndex: Int, val overlay: IrOverlay?)

    private fun effectiveOverlays(): List<Pair<IrOverlay, LongArray>> {
        val boundaries = ir.clips.map { it.timelineStartMs } + ir.durationMs
        fun snap(t: Long): Long = boundaries.minByOrNull { abs(it - t) }?.takeIf { abs(it - t) <= 40 } ?: t
        return ir.overlays.sortedBy { it.timelineStartMs }.mapNotNull { ov ->
            val path = media.overlayPaths[ov.id]
                ?: throw EditIrException("MISSING_MEDIA", "No local file supplied for overlay '${ov.id}' (download/resolve it before rendering, or remove it)")
            val p = probe(path)
            if (!p.hasVideo) throw EditIrException("MISSING_MEDIA", "Overlay '${ov.id}' file has no video track")
            if (!ov.muted) warnings.add("overlay ${ov.id}: muted=false not supported; B-roll audio is dropped")
            if (abs(ov.opacity - 1.0) > 1e-3) warnings.add("overlay ${ov.id}: opacity ${ov.opacity} rendered as 1.0")
            val available = p.durationMs - ov.sourceStartMs
            if (available <= 0) throw EditIrException("MISSING_MEDIA", "Overlay '${ov.id}' sourceStartMs is beyond the file duration")
            var end = min(ov.timelineEndMs, ir.durationMs)
            if (ov.timelineStartMs + available < end) {
                end = ov.timelineStartMs + available
                warnings.add("overlay ${ov.id}: source is ${available}ms, shorter than its slot; main video shown for the remainder")
            }
            val s = snap(ov.timelineStartMs)
            val e = snap(end)
            if (e - s < 1) null else ov to longArrayOf(s, e)
        }
    }

    private fun videoPieces(overlays: List<Pair<IrOverlay, LongArray>>): List<Piece> {
        val pieces = mutableListOf<Piece>()
        ir.clips.forEachIndexed { i, clip ->
            val cs = clip.timelineStartMs.toDouble()
            val ce = clip.timelineEndMs.toDouble()
            var cursor = cs
            for ((ov, r) in overlays) {
                val os = r[0].toDouble()
                val oe = r[1].toDouble()
                if (oe <= cursor || os >= ce) continue
                if (os > cursor) pieces.add(Piece(cursor, os, i, null))
                val bs = maxOf(os, cursor)
                val be = min(oe, ce)
                pieces.add(Piece(bs, be, i, ov))
                cursor = be
            }
            if (cursor < ce) pieces.add(Piece(cursor, ce, i, null))
        }
        return pieces.filter { it.endMs - it.startMs >= 1.0 }
    }

    private fun buildComposition(): Composition {
        val sequences = mutableListOf<EditedMediaItemSequence>()
        val overlays = effectiveOverlays()

        ir.clips.forEach { probe(assetPath(it.assetId)) }
        val anyAudio = ir.clips.any { probe(assetPath(it.assetId)).hasAudio }
        val allAudio = ir.clips.all { probe(assetPath(it.assetId)).hasAudio }
        if (!anyAudio) warnings.add("main source has no audio track")

        fun mainItem(clip: IrClip, index: Int, startMs: Double, endMs: Double, removeAudio: Boolean, removeVideo: Boolean): EditedMediaItem {
            val path = assetPath(clip.assetId)
            val p = probe(path)
            val srcStartUs = ((clip.sourceStartMs + (startMs - clip.timelineStartMs) * clip.speed) * 1000).roundToLong()
            val srcEndUs = ((clip.sourceStartMs + (endMs - clip.timelineStartMs) * clip.speed) * 1000).roundToLong()
            if (srcEndUs > p.durationMs * 1000 + 50_000) {
                throw EditIrException("INVALID_EDIT_IR", "clip ${clip.id}: source range ends at ${srcEndUs / 1000}ms but the file is ${p.durationMs}ms")
            }
            val b = EditedMediaItem.Builder(clippedItem(path, srcStartUs, min(srcEndUs, p.durationMs * 1000)))
                .setRemoveAudio(removeAudio || !p.hasAudio)
                .setRemoveVideo(removeVideo)
            if (abs(clip.speed - 1.0) > 1e-6) b.setSpeed(constantSpeed(clip.speed.toFloat()))
            b.setEffects(
                Effects(
                    if (removeAudio || !p.hasAudio) emptyList() else clipAudioProcessors(index, clip),
                    if (removeVideo) emptyList() else mainVideoEffects(clip),
                ),
            )
            return b.build()
        }

        if (overlays.isEmpty()) {
            val items = ir.clips.mapIndexed { i, c ->
                mainItem(c, i, c.timelineStartMs.toDouble(), c.timelineEndMs.toDouble(), removeAudio = false, removeVideo = false)
            }
            val types = if (anyAudio) setOf(C.TRACK_TYPE_AUDIO, C.TRACK_TYPE_VIDEO) else setOf(C.TRACK_TYPE_VIDEO)
            sequences.add(
                EditedMediaItemSequence.Builder(types).addItems(items)
                    .experimentalSetForceAudioTrack(anyAudio && !allAudio)
                    .build(),
            )
        } else {
            val videoItems = videoPieces(overlays).map { piece ->
                val clip = ir.clips[piece.clipIndex]
                val ov = piece.overlay
                if (ov == null) {
                    mainItem(clip, piece.clipIndex, piece.startMs, piece.endMs, removeAudio = true, removeVideo = false)
                } else {
                    val path = media.overlayPaths.getValue(ov.id)
                    val srcStartUs = ((ov.sourceStartMs + (piece.startMs - ov.timelineStartMs)) * 1000).roundToLong()
                    val srcEndUs = ((ov.sourceStartMs + (piece.endMs - ov.timelineStartMs)) * 1000).roundToLong()
                    EditedMediaItem.Builder(clippedItem(path, srcStartUs, srcEndUs))
                        .setRemoveAudio(true)
                        .setEffects(
                            Effects(
                                emptyList(),
                                listOf(Presentation.createForWidthAndHeight(ir.canvas.width, ir.canvas.height, Presentation.LAYOUT_SCALE_TO_FIT_WITH_CROP)),
                            ),
                        )
                        .build()
                }
            }
            sequences.add(EditedMediaItemSequence.Builder(setOf(C.TRACK_TYPE_VIDEO)).addItems(videoItems).build())
            if (anyAudio) {
                val audioItems = ir.clips.mapIndexed { i, c ->
                    mainItem(c, i, c.timelineStartMs.toDouble(), c.timelineEndMs.toDouble(), removeAudio = false, removeVideo = true)
                }
                sequences.add(
                    EditedMediaItemSequence.Builder(setOf(C.TRACK_TYPE_AUDIO)).addItems(audioItems)
                        .experimentalSetForceAudioTrack(!allAudio)
                        .build(),
                )
            }
        }

        ir.audio.music.forEach { m -> sequences.add(musicSequence(m)) }

        val compositionFx = mutableListOf<Effect>()
        // Cap the output at canvas.fps. Phone footage is often 60 fps or variable frame rate;
        // Media3 can drop frames but never duplicates them, so slower sources keep their rate.
        val videoPaths = ir.clips.map { assetPath(it.assetId) } + overlays.map { media.overlayPaths.getValue(it.first.id) }
        val videoProbes = videoPaths.distinct().map { probe(it) }
        if (videoProbes.any { it.frameRate == null || it.frameRate > ir.canvas.fps * 1.05 }) {
            compositionFx.add(FrameDropEffect.createDefaultFrameDropEffect(ir.canvas.fps.toFloat()))
        }
        if (videoProbes.any { it.isHdr }) {
            warnings.add("HDR source tone-mapped to SDR for H.264 output")
            if (Build.VERSION.SDK_INT < 29) warnings.add("HDR tone-mapping needs Android 10+; colours may be washed out")
        }
        if (ir.zooms.isNotEmpty()) compositionFx.add(ZoomTransformation(ir.zooms, overlays.map { it.second }))
        val transitionBoundaries = ir.clips.filter { it.transitionIn != null && it.transitionIn.type != "CUT" }
            .map { it.timelineStartMs to it.transitionIn!!.durationMs }
        ir.clips.mapNotNull { it.transitionIn?.type }.filter { it !in setOf("CUT", "CROSSFADE", "DISSOLVE") }
            .toSet().forEach { warnings.add("transition '$it' rendered as CROSSFADE") }
        if (transitionBoundaries.isNotEmpty()) {
            compositionFx.add(TransitionFade(transitionBoundaries))
            warnings.add("transitions rendered as a centred dip-through-black (no overlapping crossfade)")
        }
        if (ir.captions.isNotEmpty()) compositionFx.add(OverlayEffect(listOf(CaptionOverlay(ir.captions, ::typefaceFor))))
        watermarkOverlay()?.let { compositionFx.add(OverlayEffect(listOf(it))) }

        return Composition.Builder(sequences)
            .setEffects(Effects(emptyList(), compositionFx))
            // Output is 8-bit SDR H.264: tone-map only if an input is actually HDR.
            // On SDR sources, keeping HDR mode avoids unsupported OpenGL ES tone-mapping shader errors.
            .setHdrMode(if (videoProbes.any { it.isHdr }) Composition.HDR_MODE_TONE_MAP_HDR_TO_SDR_USING_OPEN_GL else Composition.HDR_MODE_KEEP_HDR)
            .build()
    }

    /**
     * Brand logo (contract §3.9): decoded once, drawn last so it sits above B-roll and captions, and after the zoom
     * so it is never zoomed. A watermark without a local file is skipped with a warning rather than failing the export.
     */
    private fun watermarkOverlay(): WatermarkOverlay? {
        val wm = ir.watermark ?: return null
        val path = media.watermarkPath
        if (path == null || !File(path).isFile) {
            warnings.add("watermark: no local logo file supplied (watermarkPath); exported without the logo")
            return null
        }
        val opts = BitmapFactory.Options().apply { inJustDecodeBounds = true }
        BitmapFactory.decodeFile(path, opts)
        if (opts.outWidth <= 0 || opts.outHeight <= 0) throw EditIrException("MISSING_MEDIA", "Watermark file is not a readable image: $path")
        // Decode at most ~2x the drawn width to keep memory small for large logos.
        val targetW = (ir.canvas.width * wm.widthFraction).coerceAtLeast(1.0)
        var sample = 1
        while (opts.outWidth / (sample * 2) >= targetW * 2) sample *= 2
        val bitmap = BitmapFactory.decodeFile(path, BitmapFactory.Options().apply { inSampleSize = sample })
            ?: throw EditIrException("MISSING_MEDIA", "Watermark file could not be decoded: $path")
        return WatermarkOverlay(bitmap, wm.position, wm.opacityPct, wm.widthFraction)
    }

    private fun musicSequence(m: IrMusic): EditedMediaItemSequence {
        val path = media.musicPaths[m.id]
            ?: throw EditIrException("MISSING_MEDIA", "No local file supplied for music '${m.id}' (resolve stock_query/url before rendering, or remove it)")
        val p = probe(path)
        if (!p.hasAudio) throw EditIrException("MISSING_MEDIA", "Music '${m.id}' file has no audio track")
        val end = min(m.timelineEndMs, ir.durationMs)
        if (end <= m.timelineStartMs) throw EditIrException("INVALID_EDIT_IR", "music ${m.id} starts after the timeline ends")
        val model = MusicGainModel(m, ir.audio.speechRangesMs)
        val b = EditedMediaItemSequence.Builder(setOf(C.TRACK_TYPE_AUDIO))
        if (m.timelineStartMs > 0) b.addGap(m.timelineStartMs * 1000)
        var tl = m.timelineStartMs
        var src = m.sourceStartMs
        if (src >= p.durationMs) throw EditIrException("INVALID_EDIT_IR", "music ${m.id}: sourceStartMs beyond file duration")
        var loops = 0
        while (tl < end) {
            val len = min(end - tl, p.durationMs - src)
            val offsetMs = tl.toDouble()
            b.addItem(
                EditedMediaItem.Builder(clippedItem(path, src * 1000, (src + len) * 1000))
                    .setRemoveVideo(true)
                    .setEffects(Effects(listOf(EnvelopeGainProcessor { tUs -> model.gainAtTimelineMs(offsetMs + tUs / 1000.0) }), emptyList()))
                    .build(),
            )
            tl += len
            src = 0
            if (++loops > 500) throw EditIrException("INVALID_EDIT_IR", "music ${m.id}: source too short to loop")
        }
        return b.build()
    }

    private val typefaceCache = HashMap<String, Typeface>()

    private fun typefaceFor(family: String, weight: Int): Typeface = typefaceCache.getOrPut("$family:$weight") {
        val path = media.fontPaths["$family:$weight"] ?: media.fontPaths[family]
        if (path != null && File(path).isFile) {
            if (Build.VERSION.SDK_INT >= 26) {
                Typeface.Builder(File(path)).setWeight(weight).build()
            } else {
                Typeface.createFromFile(path)
            }
        } else if (family.equals("Inter", ignoreCase = true)) {
            // Inter ships in the APK (assets/fonts, SIL OFL 1.1). Other scripts use system fallback.
            // Nearest bundled weight; ties go to the heavier one.
            val bundled = BUNDLED_INTER_WEIGHTS.minBy { abs(it - weight) * 2 - (if (it > weight) 1 else 0) }
            if (bundled != weight) synchronized(warnings) { warnings.add("font Inter $weight rendered with bundled Inter $bundled") }
            Typeface.createFromAsset(context.assets, "fonts/Inter-$bundled.ttf")
        } else {
            synchronized(warnings) { warnings.add("font '$family' $weight not supplied; system sans-serif used") }
            if (Build.VERSION.SDK_INT >= 28) {
                Typeface.create(Typeface.SANS_SERIF, weight.coerceIn(1, 1000), false)
            } else {
                Typeface.create(Typeface.SANS_SERIF, if (weight >= 600) Typeface.BOLD else Typeface.NORMAL)
            }
        }
    }

    // ---------------------------------------------------------------------------------------
    // Export

    /**
     * Refuses to start when the output volume clearly cannot hold the result. The estimate is
     * duration x (video + audio bitrate) with a 1.5x margin plus fixed headroom for the muxer.
     * The video bitrate mirrors Media3's default encoder heuristic (w x h x fps x 0.07 x 2).
     */
    private fun checkFreeSpace() {
        val dir = File(outputPath).absoluteFile.parentFile ?: return
        dir.mkdirs()
        val available = try {
            StatFs(dir.path).availableBytes
        } catch (e: IllegalArgumentException) {
            return // Not a statable path; let the export report the real I/O error.
        }
        val videoBps = ir.canvas.width.toDouble() * ir.canvas.height * ir.canvas.fps * 0.07 * 2
        val audioBps = 192_000.0
        val needed = (ir.durationMs / 1000.0 * (videoBps + audioBps) / 8 * 1.5).toLong() + STORAGE_HEADROOM_BYTES
        if (available < needed) {
            throw MediaEngineError(
                "INSUFFICIENT_STORAGE",
                "Not enough free storage to export: about ${needed / MB} MB needed, ${available / MB} MB available. Free up space and try again.",
            )
        }
    }

    private fun startExport(composition: Composition) {
        if (cancelled) return
        val out = File(outputPath)
        out.parentFile?.mkdirs()
        if (out.exists() && !out.delete()) {
            fail("IO_ERROR", "Cannot overwrite $outputPath", null)
            return
        }
        val hasAudio = ir.clips.any { probe(assetPath(it.assetId)).hasAudio } || ir.audio.music.isNotEmpty()
        val builder = Transformer.Builder(context)
            .setVideoMimeType(MimeTypes.VIDEO_H264)
        if (hasAudio) {
            builder.setAudioMimeType(MimeTypes.AUDIO_AAC)
        }
        val t = builder
            .addListener(object : Transformer.Listener {
                override fun onCompleted(composition: Composition, exportResult: ExportResult) = onDone(exportResult)
                override fun onError(composition: Composition, exportResult: ExportResult, exportException: ExportException) {
                    if (cancelled) return
                    File(outputPath).delete()
                    val detail = "${exportException.errorCodeName}: ${exportException.message ?: ""} ${exportException.cause?.message ?: ""}".trim()
                    if (isOutOfSpace(exportException)) {
                        fail("INSUFFICIENT_STORAGE", "The device ran out of storage while exporting. Free up space and try again.", detail)
                    } else {
                        fail("EXPORT_FAILED", detail, exportException.errorCodeName)
                    }
                }
            })
            .build()
        transformer = t
        emit(event("started", progress = 0.0))
        try {
            t.start(composition, outputPath)
        } catch (e: Exception) {
            android.util.Log.e("EditIrRenderer", "Export start failed for job $jobId", e)
            val rootMsg = e.cause?.message ?: e.message ?: e.javaClass.simpleName
            fail("EXPORT_FAILED", "Could not start video export: $rootMsg", e.stackTraceToString())
            return
        }
        pollProgress()
    }

    private fun pollProgress() {
        val holder = ProgressHolder()
        val tick = object : Runnable {
            override fun run() {
                val t = transformer ?: return
                if (finished) return
                if (t.getProgress(holder) == Transformer.PROGRESS_STATE_AVAILABLE) {
                    emit(event("progress", progress = holder.progress / 100.0))
                }
                mainHandler.postDelayed(this, 250)
            }
        }
        mainHandler.postDelayed(tick, 250)
    }

    private fun onDone(result: ExportResult) {
        if (finished) return
        finished = true
        // Verify the file we actually wrote instead of trusting the export callback.
        val verified = try {
            MediaTools.getVideoInfo(outputPath)
        } catch (e: Exception) {
            fail("OUTPUT_INVALID", "Export reported success but the output could not be read: ${e.message}", null, force = true)
            return
        }
        emit(
            event("completed", progress = 1.0) + mapOf(
                "outputPath" to outputPath,
                "durationMs" to verified["durationMs"],
                "width" to verified["displayWidth"],
                "height" to verified["displayHeight"],
                "hasAudio" to verified["hasAudio"],
                "fileSizeBytes" to File(outputPath).length(),
                "videoEncoder" to result.videoEncoderName,
                "audioEncoder" to result.audioEncoderName,
                "expectedDurationMs" to ir.durationMs,
                "warnings" to synchronized(warnings) { warnings.distinct() },
            ),
        )
    }

    private fun isOutOfSpace(e: Throwable): Boolean =
        generateSequence(e) { it.cause }.take(8).any { (it.message ?: "").let { m -> "ENOSPC" in m || "No space left" in m } }

    private fun fail(code: String, message: String, detail: String?, force: Boolean = false) {
        mainHandler.post {
            if (finished && !force) return@post
            finished = true
            emit(event("failed", progress = null) + mapOf("errorCode" to code, "message" to message, "detail" to detail))
        }
    }

    private fun event(state: String, progress: Double?): Map<String, Any?> =
        mapOf("jobId" to jobId, "state" to state, "progress" to progress)
}
