package com.workspace180.socialmanager.mediaengine

import androidx.media3.common.C
import androidx.media3.common.audio.AudioProcessor
import androidx.media3.common.audio.BaseAudioProcessor
import java.nio.ByteBuffer
import java.nio.ByteOrder
import kotlin.math.max
import kotlin.math.min
import kotlin.math.pow

/** Linear gain for a dB value; anything at or below -60 dB is treated as mute (contract §3.2). */
fun dbToGain(db: Double): Float = if (db <= -60.0) 0f else 10.0.pow(db / 20.0).toFloat()

/**
 * Applies a time-varying gain `gainAtUs(itemTimeUs)` where item time counts from the first sample
 * this processor receives after a flush (i.e. the start of its EditedMediaItem).
 * Supports 16-bit PCM and float PCM, any channel count.
 */
class EnvelopeGainProcessor(private val gainAtUs: (Long) -> Float) : BaseAudioProcessor() {
    private var framesProcessed = 0L

    override fun onConfigure(inputAudioFormat: AudioProcessor.AudioFormat): AudioProcessor.AudioFormat {
        if (inputAudioFormat.encoding != C.ENCODING_PCM_16BIT && inputAudioFormat.encoding != C.ENCODING_PCM_FLOAT) {
            throw AudioProcessor.UnhandledAudioFormatException(inputAudioFormat)
        }
        return inputAudioFormat
    }

    override fun queueInput(inputBuffer: ByteBuffer) {
        val remaining = inputBuffer.remaining()
        if (remaining == 0) return
        val fmt = inputAudioFormat
        val channels = fmt.channelCount
        val frames = remaining / fmt.bytesPerFrame
        val out = replaceOutputBuffer(remaining)
        val input = inputBuffer.order(ByteOrder.nativeOrder())
        for (f in 0 until frames) {
            val tUs = (framesProcessed + f) * 1_000_000L / fmt.sampleRate
            val g = gainAtUs(tUs)
            for (ch in 0 until channels) {
                if (fmt.encoding == C.ENCODING_PCM_16BIT) {
                    val s = input.short.toInt()
                    val v = (s * g).toInt().coerceIn(Short.MIN_VALUE.toInt(), Short.MAX_VALUE.toInt())
                    out.putShort(v.toShort())
                } else {
                    out.putFloat(input.float * g)
                }
            }
        }
        framesProcessed += frames
        out.flip()
    }

    override fun onFlush(streamMetadata: AudioProcessor.StreamMetadata) {
        framesProcessed = 0
    }

    override fun onReset() {
        framesProcessed = 0
    }
}

/** Smoothstep-free linear ramp helper: 0 before [a], 1 after [b]. */
private fun ramp(t: Double, a: Double, b: Double): Double =
    if (b <= a) (if (t >= a) 1.0 else 0.0) else ((t - a) / (b - a)).coerceIn(0.0, 1.0)

/**
 * Music gain on the *timeline*: base volume x fade in/out x speech ducking (contract §3.6).
 * Ducking ramps down over attackMs before each speech range and back up over releaseMs after it.
 */
class MusicGainModel(
    private val music: IrMusic,
    speechRangesMs: List<LongArray>,
) {
    private val base = dbToGain(music.volumeDb).toDouble()
    private val duckGain = music.duck?.takeIf { it.enabled }?.let { dbToGain(it.duckDb).toDouble() }
    private val ranges = if (duckGain == null) emptyList() else speechRangesMs.sortedBy { it[0] }

    /** Duck depth 0..1 at timeline ms t (1 = fully ducked). */
    fun duckAmount(tMs: Double): Double {
        val duck = music.duck ?: return 0.0
        var amount = 0.0
        for (r in ranges) {
            val s = r[0].toDouble()
            val e = r[1].toDouble()
            if (tMs < s - duck.attackMs) break
            val down = ramp(tMs, s - duck.attackMs, s)
            val up = 1.0 - ramp(tMs, e, e + duck.releaseMs)
            amount = max(amount, min(down, up))
        }
        return amount
    }

    fun gainAtTimelineMs(tMs: Double): Float {
        var g = base
        val start = music.timelineStartMs.toDouble()
        val end = music.timelineEndMs.toDouble()
        if (music.fadeInMs > 0) g *= ramp(tMs, start, start + music.fadeInMs)
        if (music.fadeOutMs > 0) g *= 1.0 - ramp(tMs, end - music.fadeOutMs, end)
        if (duckGain != null) {
            val d = duckAmount(tMs)
            g *= (1.0 - d) + d * duckGain
        }
        return g.toFloat()
    }
}

/**
 * Main-track clip audio gain: originalTrack.volumeDb + clip.volumeDb, plus a short audio fade at
 * transition boundaries (half the transition duration on each side, contract §3.2).
 */
class ClipAudioGainModel(
    private val clipDurationMs: Double,
    volumeDb: Double,
    private val fadeInMs: Double,
    private val fadeOutMs: Double,
) {
    private val base = dbToGain(volumeDb).toDouble()

    fun gainAtItemMs(tMs: Double): Float {
        var g = base
        if (fadeInMs > 0) g *= ramp(tMs, 0.0, fadeInMs)
        if (fadeOutMs > 0) g *= 1.0 - ramp(tMs, clipDurationMs - fadeOutMs, clipDurationMs)
        return g.toFloat()
    }
}
