package com.workspace180.socialmanager.mediaengine

import android.content.Context
import android.graphics.Bitmap
import android.media.AudioFormat
import android.media.MediaCodec
import android.media.MediaExtractor
import android.media.MediaFormat
import android.media.MediaMetadataRetriever
import android.media.MediaMuxer
import android.net.Uri
import android.os.Build
import androidx.media3.common.MediaItem
import androidx.media3.common.MimeTypes
import androidx.media3.common.audio.ChannelMixingAudioProcessor
import androidx.media3.common.audio.ChannelMixingMatrix
import androidx.media3.common.audio.SonicAudioProcessor
import androidx.media3.common.util.UnstableApi
import androidx.media3.transformer.Composition
import androidx.media3.transformer.EditedMediaItem
import androidx.media3.transformer.Effects
import androidx.media3.transformer.ExportException
import androidx.media3.transformer.ExportResult
import androidx.media3.transformer.Transformer
import java.io.File
import java.io.FileOutputStream
import java.io.RandomAccessFile
import java.nio.ByteBuffer
import java.nio.ByteOrder
import kotlin.math.exp
import kotlin.math.pow
import kotlin.math.roundToInt
import kotlin.math.sqrt

/** Failure with a stable code that crosses the MethodChannel as PlatformException.code. */
class MediaEngineError(val code: String, message: String) : Exception(message)

@UnstableApi
object MediaTools {
    const val STT_SAMPLE_RATE = 16_000

    private fun requireFile(path: String) {
        if (!File(path).isFile) throw MediaEngineError("FILE_NOT_FOUND", "File not found: $path")
    }

    // -----------------------------------------------------------------------------------------
    // getVideoInfo

    fun getVideoInfo(path: String): Map<String, Any?> {
        requireFile(path)
        val r = MediaMetadataRetriever()
        try {
            try {
                r.setDataSource(path)
            } catch (e: Exception) {
                throw MediaEngineError("UNSUPPORTED_MEDIA", "Cannot read media metadata of $path: ${e.message}")
            }
            fun meta(key: Int) = r.extractMetadata(key)
            val hasVideo = meta(MediaMetadataRetriever.METADATA_KEY_HAS_VIDEO) == "yes"
            val hasAudio = meta(MediaMetadataRetriever.METADATA_KEY_HAS_AUDIO) == "yes"
            val durationMs = meta(MediaMetadataRetriever.METADATA_KEY_DURATION)?.toLongOrNull()
                ?: throw MediaEngineError("UNSUPPORTED_MEDIA", "Media has no duration: $path")
            val width = meta(MediaMetadataRetriever.METADATA_KEY_VIDEO_WIDTH)?.toIntOrNull() ?: 0
            val height = meta(MediaMetadataRetriever.METADATA_KEY_VIDEO_HEIGHT)?.toIntOrNull() ?: 0
            val rotation = meta(MediaMetadataRetriever.METADATA_KEY_VIDEO_ROTATION)?.toIntOrNull() ?: 0
            val swap = rotation % 180 != 0
            var frameRate: Double? = null
            var videoMime: String? = null
            var audioMime: String? = null
            var sampleRate: Int? = null
            var channels: Int? = null
            var isHdr = false
            val ex = MediaExtractor()
            try {
                ex.setDataSource(path)
                for (i in 0 until ex.trackCount) {
                    val f = ex.getTrackFormat(i)
                    val mime = f.getString(MediaFormat.KEY_MIME) ?: continue
                    if (mime.startsWith("video/") && videoMime == null) {
                        videoMime = mime
                        if (f.containsKey(MediaFormat.KEY_COLOR_TRANSFER)) {
                            val transfer = f.getInteger(MediaFormat.KEY_COLOR_TRANSFER)
                            isHdr = transfer == MediaFormat.COLOR_TRANSFER_ST2084 || transfer == MediaFormat.COLOR_TRANSFER_HLG
                        }
                        if (f.containsKey(MediaFormat.KEY_FRAME_RATE)) {
                            frameRate = try { f.getInteger(MediaFormat.KEY_FRAME_RATE).toDouble() } catch (_: ClassCastException) { f.getFloat(MediaFormat.KEY_FRAME_RATE).toDouble() }
                        }
                    } else if (mime.startsWith("audio/") && audioMime == null) {
                        audioMime = mime
                        sampleRate = f.getInteger(MediaFormat.KEY_SAMPLE_RATE)
                        channels = f.getInteger(MediaFormat.KEY_CHANNEL_COUNT)
                    }
                }
            } finally {
                ex.release()
            }
            return mapOf(
                "durationMs" to durationMs,
                "width" to width,
                "height" to height,
                "rotation" to rotation,
                "displayWidth" to if (swap) height else width,
                "displayHeight" to if (swap) width else height,
                "hasVideo" to hasVideo,
                "hasAudio" to hasAudio,
                "frameRate" to frameRate,
                "isHdr" to isHdr,
                "bitrate" to meta(MediaMetadataRetriever.METADATA_KEY_BITRATE)?.toLongOrNull(),
                "videoMimeType" to videoMime,
                "audioMimeType" to audioMime,
                "audioSampleRate" to sampleRate,
                "audioChannels" to channels,
                "fileSizeBytes" to File(path).length(),
            )
        } finally {
            r.release()
        }
    }

    // -----------------------------------------------------------------------------------------
    // extractAudio: 16 kHz mono, for speech-to-text.

    /** Decodes, downmixes and resamples to 16 kHz mono 16-bit PCM WAV. Blocking; call off the UI thread. */
    fun extractAudioToWav(sourcePath: String, destPath: String): Map<String, Any?> {
        requireFile(sourcePath)
        val (ex, codec, inFormat) = openAudioDecoder(sourcePath)
            ?: throw MediaEngineError("NO_AUDIO_TRACK", "No audio track in $sourcePath")

        File(destPath).parentFile?.mkdirs()
        val raf = RandomAccessFile(destPath, "rw")
        raf.setLength(0)
        raf.write(ByteArray(44)) // header placeholder
        var outSamples = 0L
        val outBuf = ByteBuffer.allocate(64 * 1024).order(ByteOrder.LITTLE_ENDIAN)

        val srcRate = inFormat.getInteger(MediaFormat.KEY_SAMPLE_RATE)
        // Streaming low-pass + linear-interpolation resampler state.
        var lp = 0.0
        var lpAlpha = 1.0 - exp(-2.0 * Math.PI * 7000.0 / srcRate)
        var step = srcRate.toDouble() / STT_SAMPLE_RATE
        var nextOut = 0.0
        var inIndex = 0L
        var prev = 0.0

        fun flushOut() {
            outBuf.flip()
            raf.write(outBuf.array(), 0, outBuf.limit())
            outBuf.clear()
        }

        fun pushMono(sample: Double) {
            lp += lpAlpha * (sample - lp)
            val cur = lp
            while (nextOut <= inIndex) {
                val frac = nextOut - (inIndex - 1)
                val v = if (inIndex == 0L) cur else prev + (cur - prev) * frac
                val s = (v * 32767.0).roundToInt().coerceIn(-32768, 32767)
                if (outBuf.remaining() < 2) flushOut()
                outBuf.putShort(s.toShort())
                outSamples++
                nextOut += step
            }
            prev = cur
            inIndex++
        }

        try {
            decodeMonoPcm(ex, codec, inFormat, onFormat = { rate, _ ->
                lpAlpha = 1.0 - exp(-2.0 * Math.PI * 7000.0 / rate)
                step = rate.toDouble() / STT_SAMPLE_RATE
            }) { _, sample -> pushMono(sample) }
            flushOut()
            writeWavHeader(raf, outSamples)
        } catch (e: MediaEngineError) {
            throw e
        } catch (e: Exception) {
            File(destPath).delete()
            throw MediaEngineError("DECODE_FAILED", "Audio decode failed: ${e.message}")
        } finally {
            try { codec.stop() } catch (_: Exception) {}
            codec.release()
            ex.release()
            raf.close()
        }
        if (outSamples == 0L) {
            File(destPath).delete()
            throw MediaEngineError("DECODE_FAILED", "Audio track decoded to zero samples")
        }
        return mapOf(
            "path" to destPath,
            "format" to "wav",
            "sampleRate" to STT_SAMPLE_RATE,
            "channels" to 1,
            "durationMs" to outSamples * 1000 / STT_SAMPLE_RATE,
            "fileSizeBytes" to File(destPath).length(),
        )
    }

    /**
     * Opens the first audio track of [path] with a started platform decoder.
     * Returns null when the file has no audio track. The caller releases both objects.
     */
    private fun openAudioDecoder(path: String): Triple<MediaExtractor, MediaCodec, MediaFormat>? {
        val ex = MediaExtractor()
        try {
            ex.setDataSource(path)
        } catch (e: Exception) {
            ex.release()
            throw MediaEngineError("UNSUPPORTED_MEDIA", "Cannot open $path: ${e.message}")
        }
        val track = (0 until ex.trackCount).firstOrNull {
            ex.getTrackFormat(it).getString(MediaFormat.KEY_MIME)?.startsWith("audio/") == true
        }
        if (track == null) {
            ex.release()
            return null
        }
        ex.selectTrack(track)
        val format = ex.getTrackFormat(track)
        val mime = format.getString(MediaFormat.KEY_MIME)!!
        val codec = try {
            MediaCodec.createDecoderByType(mime).apply { configure(format, null, null, 0); start() }
        } catch (e: Exception) {
            ex.release()
            throw MediaEngineError("DECODER_UNAVAILABLE", "No decoder for $mime: ${e.message}")
        }
        return Triple(ex, codec, format)
    }

    /**
     * Runs [codec] over every sample of [ex] and hands each PCM frame to [onFrame], downmixed to
     * mono in -1..1, with its presentation time in microseconds. [onFormat] reports the decoder
     * output (sampleRate, channels) whenever it changes, before the frames that use it.
     */
    private fun decodeMonoPcm(
        ex: MediaExtractor,
        codec: MediaCodec,
        inFormat: MediaFormat,
        onFormat: (sampleRate: Int, channels: Int) -> Unit,
        onFrame: (timeUs: Long, sample: Double) -> Unit,
    ) {
        var rate = inFormat.getInteger(MediaFormat.KEY_SAMPLE_RATE)
        var channels = inFormat.getInteger(MediaFormat.KEY_CHANNEL_COUNT)
        var floatPcm = false
        val info = MediaCodec.BufferInfo()
        var inputDone = false
        var outputDone = false
        while (!outputDone) {
            if (!inputDone) {
                val ii = codec.dequeueInputBuffer(10_000)
                if (ii >= 0) {
                    val buf = codec.getInputBuffer(ii)!!
                    val n = ex.readSampleData(buf, 0)
                    if (n < 0) {
                        codec.queueInputBuffer(ii, 0, 0, 0, MediaCodec.BUFFER_FLAG_END_OF_STREAM)
                        inputDone = true
                    } else {
                        codec.queueInputBuffer(ii, 0, n, ex.sampleTime, 0)
                        ex.advance()
                    }
                }
            }
            val oi = codec.dequeueOutputBuffer(info, 10_000)
            when {
                oi == MediaCodec.INFO_OUTPUT_FORMAT_CHANGED -> {
                    val f = codec.outputFormat
                    rate = f.getInteger(MediaFormat.KEY_SAMPLE_RATE)
                    channels = f.getInteger(MediaFormat.KEY_CHANNEL_COUNT)
                    floatPcm = Build.VERSION.SDK_INT >= 24 && f.containsKey(MediaFormat.KEY_PCM_ENCODING) &&
                        f.getInteger(MediaFormat.KEY_PCM_ENCODING) == AudioFormat.ENCODING_PCM_FLOAT
                    onFormat(rate, channels)
                }
                oi >= 0 -> {
                    val buf = codec.getOutputBuffer(oi)!!.order(ByteOrder.nativeOrder())
                    buf.position(info.offset)
                    buf.limit(info.offset + info.size)
                    var frame = 0L
                    val baseUs = info.presentationTimeUs
                    if (floatPcm) {
                        val fb = buf.asFloatBuffer()
                        while (fb.remaining() >= channels) {
                            var sum = 0.0
                            repeat(channels) { sum += fb.get() }
                            onFrame(baseUs + frame++ * 1_000_000L / rate, sum / channels)
                        }
                    } else {
                        val sb = buf.asShortBuffer()
                        while (sb.remaining() >= channels) {
                            var sum = 0.0
                            repeat(channels) { sum += sb.get() / 32768.0 }
                            onFrame(baseUs + frame++ * 1_000_000L / rate, sum / channels)
                        }
                    }
                    codec.releaseOutputBuffer(oi, false)
                    if (info.flags and MediaCodec.BUFFER_FLAG_END_OF_STREAM != 0) outputDone = true
                }
            }
        }
    }

    // -----------------------------------------------------------------------------------------
    // detectSilences: RMS level over short windows of decoded PCM.

    private const val SILENCE_WINDOW_MS = 20

    /**
     * Finds stretches of at least [minSilenceMs] whose RMS level stays below [thresholdDb] dBFS,
     * analysed in 20 ms windows. Times are source milliseconds. A gap before the first audio sample
     * and silence running to the end of the file (including audio that stops before the video)
     * are reported. A file without an audio track returns an empty list, not an error.
     * Blocking; call off the UI thread.
     */
    fun detectSilences(sourcePath: String, minSilenceMs: Long, thresholdDb: Double): List<Map<String, Long>> {
        requireFile(sourcePath)
        if (minSilenceMs <= 0) throw MediaEngineError("INVALID_ARGS", "minSilenceMs must be > 0")
        if (thresholdDb.isNaN() || thresholdDb > 0.0 || thresholdDb < -120.0) {
            throw MediaEngineError("INVALID_ARGS", "thresholdDb must be in -120..0")
        }
        val fileDurationUs = (getVideoInfo(sourcePath)["durationMs"] as Long) * 1000
        val (ex, codec, format) = openAudioDecoder(sourcePath) ?: return emptyList()

        val thresholdRms = 10.0.pow(thresholdDb / 20.0)
        val minSilenceUs = minSilenceMs * 1000
        val out = mutableListOf<Map<String, Long>>()
        val initialRate = format.getInteger(MediaFormat.KEY_SAMPLE_RATE)
        var windowFrames = (initialRate * SILENCE_WINDOW_MS / 1000).coerceAtLeast(1)
        var frameDurUs = 1_000_000L / initialRate
        var windowStartUs = -1L
        var sumSq = 0.0
        var n = 0
        var endOfAudioUs = 0L
        var runStartUs: Long? = null
        var firstWindow = true

        fun addRun(startUs: Long, endUs: Long) {
            if (endUs - startUs >= minSilenceUs) out.add(mapOf("startMs" to startUs / 1000, "endMs" to endUs / 1000))
        }

        fun closeWindow() {
            val silent = sqrt(sumSq / n) < thresholdRms
            if (silent) {
                // Anything before the first decoded sample is silence too.
                if (runStartUs == null) runStartUs = if (firstWindow) 0L else windowStartUs
            } else {
                runStartUs?.let { addRun(it, windowStartUs) }
                runStartUs = null
            }
            firstWindow = false
            sumSq = 0.0
            n = 0
            windowStartUs = -1L
        }

        try {
            decodeMonoPcm(ex, codec, format, onFormat = { rate, _ ->
                windowFrames = (rate * SILENCE_WINDOW_MS / 1000).coerceAtLeast(1)
                frameDurUs = 1_000_000L / rate
            }) { tUs, sample ->
                if (windowStartUs < 0) windowStartUs = tUs
                sumSq += sample * sample
                n++
                endOfAudioUs = tUs + frameDurUs
                if (n >= windowFrames) closeWindow()
            }
        } catch (e: MediaEngineError) {
            throw e
        } catch (e: Exception) {
            throw MediaEngineError("DECODE_FAILED", "Audio decode failed: ${e.message}")
        } finally {
            try { codec.stop() } catch (_: Exception) {}
            codec.release()
            ex.release()
        }
        if (n > 0) closeWindow()
        // Silence runs to the end of the file; audio that stops early leaves a silent tail.
        val endUs = maxOf(endOfAudioUs, fileDurationUs)
        addRun(runStartUs ?: endOfAudioUs, endUs)
        return out
    }

    private fun writeWavHeader(raf: RandomAccessFile, samples: Long) {
        val dataBytes = samples * 2
        val h = ByteBuffer.allocate(44).order(ByteOrder.LITTLE_ENDIAN)
        h.put("RIFF".toByteArray()).putInt((36 + dataBytes).toInt()).put("WAVE".toByteArray())
        h.put("fmt ".toByteArray()).putInt(16).putShort(1).putShort(1)
            .putInt(STT_SAMPLE_RATE).putInt(STT_SAMPLE_RATE * 2).putShort(2).putShort(16)
        h.put("data".toByteArray()).putInt(dataBytes.toInt())
        raf.seek(0)
        raf.write(h.array())
    }

    /** 16 kHz mono AAC in an MP4/M4A container via Media3. Must be called on the main thread. */
    fun extractAudioToM4a(
        context: Context,
        sourcePath: String,
        destPath: String,
        onDone: (Result<Map<String, Any?>>) -> Unit,
    ) {
        requireFile(sourcePath)
        val info = getVideoInfo(sourcePath)
        if (info["hasAudio"] != true) throw MediaEngineError("NO_AUDIO_TRACK", "No audio track in $sourcePath")
        val channels = (info["audioChannels"] as Int?) ?: 2
        val resample = SonicAudioProcessor().apply { setOutputSampleRateHz(STT_SAMPLE_RATE) }
        val mono = ChannelMixingAudioProcessor().apply {
            // Average all input channels into one (mono) channel.
            for (inCh in 1..8) putChannelMixingMatrix(ChannelMixingMatrix(inCh, 1, FloatArray(inCh) { 1f / inCh }))
        }
        val item = EditedMediaItem.Builder(MediaItem.fromUri(Uri.fromFile(File(sourcePath))))
            .setRemoveVideo(true)
            .setEffects(Effects(listOf(mono, resample), emptyList()))
            .build()
        File(destPath).parentFile?.mkdirs()
        File(destPath).delete()
        Transformer.Builder(context)
            .setAudioMimeType(MimeTypes.AUDIO_AAC)
            .addListener(object : Transformer.Listener {
                override fun onCompleted(composition: Composition, exportResult: ExportResult) {
                    onDone(Result.success(mapOf(
                        "path" to destPath,
                        "format" to "m4a",
                        "sampleRate" to exportResult.sampleRate,
                        "channels" to exportResult.channelCount,
                        "sourceChannels" to channels,
                        "durationMs" to exportResult.durationMs,
                        "fileSizeBytes" to File(destPath).length(),
                    )))
                }

                override fun onError(composition: Composition, exportResult: ExportResult, exportException: ExportException) {
                    File(destPath).delete()
                    onDone(Result.failure(MediaEngineError("EXTRACT_FAILED", "${exportException.errorCodeName}: ${exportException.message}")))
                }
            })
            .build()
            .start(item, destPath)
    }

    // -----------------------------------------------------------------------------------------
    // Thumbnails

    fun generateThumbnails(
        sourcePath: String,
        outputDir: String,
        timesMs: List<Long>,
        maxWidth: Int,
        exact: Boolean,
    ): List<String> {
        requireFile(sourcePath)
        if (timesMs.isEmpty()) throw MediaEngineError("INVALID_ARGS", "timesMs is empty")
        val dir = File(outputDir).apply { mkdirs() }
        val r = MediaMetadataRetriever()
        try {
            r.setDataSource(sourcePath)
            val option = if (exact) MediaMetadataRetriever.OPTION_CLOSEST else MediaMetadataRetriever.OPTION_CLOSEST_SYNC
            val srcW = r.extractMetadata(MediaMetadataRetriever.METADATA_KEY_VIDEO_WIDTH)?.toIntOrNull()
                ?: throw MediaEngineError("NO_VIDEO_TRACK", "No video track in $sourcePath")
            val srcH = r.extractMetadata(MediaMetadataRetriever.METADATA_KEY_VIDEO_HEIGHT)?.toIntOrNull() ?: srcW
            val base = File(sourcePath).nameWithoutExtension
            return timesMs.map { t ->
                val frame: Bitmap = (if (Build.VERSION.SDK_INT >= 27 && maxWidth in 1 until srcW) {
                    r.getScaledFrameAtTime(t * 1000, option, maxWidth, (maxWidth.toLong() * srcH / srcW).toInt().coerceAtLeast(1))
                } else {
                    r.getFrameAtTime(t * 1000, option)
                }) ?: throw MediaEngineError("THUMBNAIL_FAILED", "No frame at ${t}ms in $sourcePath")
                val out = File(dir, "${base}_$t.jpg")
                FileOutputStream(out).use { frame.compress(Bitmap.CompressFormat.JPEG, 88, it) }
                frame.recycle()
                out.absolutePath
            }
        } finally {
            r.release()
        }
    }

    // -----------------------------------------------------------------------------------------
    // Lossless GOP-aligned slice (kept for the timeline screen's quick trims).

    fun sliceVideo(sourcePath: String, destPath: String, startMs: Long, endMs: Long) {
        requireFile(sourcePath)
        File(destPath).parentFile?.mkdirs()
        val extractor = MediaExtractor()
        extractor.setDataSource(sourcePath)
        val muxer = MediaMuxer(destPath, MediaMuxer.OutputFormat.MUXER_OUTPUT_MPEG_4)
        try {
            val indexMap = HashMap<Int, Int>()
            for (i in 0 until extractor.trackCount) {
                val format = extractor.getTrackFormat(i)
                val mime = format.getString(MediaFormat.KEY_MIME) ?: ""
                if (mime.startsWith("video/") || mime.startsWith("audio/")) {
                    extractor.selectTrack(i)
                    indexMap[i] = muxer.addTrack(format)
                }
            }
            if (indexMap.isEmpty()) throw MediaEngineError("UNSUPPORTED_MEDIA", "No audio/video tracks in $sourcePath")
            val rotation = (getVideoInfo(sourcePath)["rotation"] as Int)
            muxer.setOrientationHint(rotation)
            muxer.start()
            val startUs = startMs * 1000L
            val endUs = if (endMs > 0) endMs * 1000L else Long.MAX_VALUE
            extractor.seekTo(startUs, MediaExtractor.SEEK_TO_CLOSEST_SYNC)
            val buffer = ByteBuffer.allocateDirect(2 * 1024 * 1024)
            val info = MediaCodec.BufferInfo()
            while (true) {
                val trackIndex = extractor.sampleTrackIndex
                if (trackIndex < 0) break
                val sampleTime = extractor.sampleTime
                if (sampleTime > endUs) break
                if (sampleTime >= startUs) {
                    info.offset = 0
                    info.size = extractor.readSampleData(buffer, 0)
                    if (info.size < 0) break
                    info.presentationTimeUs = sampleTime - startUs
                    info.flags = extractor.sampleFlags
                    indexMap[trackIndex]?.let { muxer.writeSampleData(it, buffer, info) }
                }
                extractor.advance()
            }
            muxer.stop()
        } catch (e: MediaEngineError) {
            File(destPath).delete()
            throw e
        } catch (e: Exception) {
            File(destPath).delete()
            throw MediaEngineError("SLICE_FAILED", e.message ?: e.toString())
        } finally {
            try { muxer.release() } catch (_: Exception) {}
            extractor.release()
        }
    }
}
