package com.workspace180.socialmanager.mediaengine

import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Matrix
import android.graphics.Paint
import android.graphics.PorterDuff
import android.graphics.RectF
import android.graphics.Typeface
import androidx.media3.common.util.UnstableApi
import androidx.media3.effect.CanvasOverlay
import androidx.media3.effect.MatrixTransformation
import androidx.media3.effect.RgbMatrix
import kotlin.math.max
import kotlin.math.min

/*
 * Time-varying effects applied at the Composition level. Media3 hands these effects the
 * presentation time of the frame on the *output* timeline (in microseconds), so every lookup
 * below is in timeline milliseconds as defined by the contract.
 */

private fun easeOut(x: Double) = 1.0 - (1.0 - x) * (1.0 - x) * (1.0 - x)
private fun easeIn(x: Double) = x * x * x

/**
 * Camera punch-ins (contract §3.5). Scales about the canvas-normalized centre. Scaling about a
 * point inside the frame never reveals background, which satisfies the clamp requirement.
 * Zoom is suppressed inside B-roll intervals because B-roll is not zoomed.
 */
@UnstableApi
class ZoomTransformation(
    private val zooms: List<IrZoom>,
    private val excludedRangesMs: List<LongArray>,
) : MatrixTransformation {
    override fun getMatrix(presentationTimeUs: Long): Matrix {
        val m = Matrix()
        val t = presentationTimeUs / 1000.0
        if (excludedRangesMs.any { t >= it[0] && t < it[1] }) return m
        val z = zooms.firstOrNull { t >= it.startMs && t < it.endMs } ?: return m
        val ramp = max(1.0, min(z.rampMs.toDouble(), (z.endMs - z.startMs) / 2.0))
        val progress = when {
            t < z.startMs + ramp -> easeOut((t - z.startMs) / ramp)
            t > z.endMs - ramp -> 1.0 - easeIn((t - (z.endMs - ramp)) / ramp)
            else -> 1.0
        }.coerceIn(0.0, 1.0)
        val s = (1.0 + (z.scale - 1.0) * progress).toFloat()
        // NDC: x right, y up.
        val cx = (2.0 * z.centerX - 1.0).toFloat().coerceIn(-1f, 1f)
        val cy = (1.0 - 2.0 * z.centerY).toFloat().coerceIn(-1f, 1f)
        m.setScale(s, s, cx, cy)
        return m
    }

    override fun isNoOp(inputWidth: Int, inputHeight: Int): Boolean = zooms.isEmpty()
}

/**
 * Transition envelope: dips luminance to black around each cut boundary with a transition.
 * Media3 sequences cannot overlap two items, so CROSSFADE/DISSOLVE are rendered as a
 * centred dip-through-black of the same duration (durations are unchanged, as required).
 */
@UnstableApi
class TransitionFade(private val boundaries: List<Pair<Long, Long>>) : RgbMatrix {
    override fun getMatrix(presentationTimeUs: Long, useHdr: Boolean): FloatArray {
        val t = presentationTimeUs / 1000.0
        var f = 1.0
        for ((boundaryMs, durMs) in boundaries) {
            val half = durMs / 2.0
            if (half <= 0) continue
            val d = kotlin.math.abs(t - boundaryMs)
            if (d < half) f = min(f, d / half)
        }
        val v = f.toFloat()
        return floatArrayOf(
            v, 0f, 0f, 0f,
            0f, v, 0f, 0f,
            0f, 0f, v, 0f,
            0f, 0f, 0f, 1f,
        )
    }

    override fun isNoOp(inputWidth: Int, inputHeight: Int): Boolean = boundaries.isEmpty()
}

/**
 * Renders captions and titles (contract §3.4) with per-word timing: word_pop, karaoke, none.
 * Drawn with a Canvas at the output frame size, so fontSizePx is in canvas pixels.
 */
@UnstableApi
class CaptionOverlay(
    private val captions: List<IrCaption>,
    private val typefaceFor: (family: String, weight: Int) -> Typeface,
) : CanvasOverlay(/* useInputFrameSize= */ true) {

    private val fill = Paint(Paint.ANTI_ALIAS_FLAG).apply { style = Paint.Style.FILL }
    private val stroke = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        style = Paint.Style.STROKE
        strokeJoin = Paint.Join.ROUND
        strokeMiter = 2f
    }
    private val bg = Paint(Paint.ANTI_ALIAS_FLAG).apply { style = Paint.Style.FILL }

    private data class Token(val word: IrWord, val text: String, val width: Float)

    override fun onDraw(canvas: Canvas, presentationTimeUs: Long) {
        canvas.drawColor(Color.TRANSPARENT, PorterDuff.Mode.CLEAR)
        val t = presentationTimeUs / 1000.0
        for (cap in captions) {
            if (t >= cap.startMs && t < cap.endMs) drawCaption(canvas, cap, t)
        }
    }

    private fun drawCaption(canvas: Canvas, cap: IrCaption, t: Double) {
        val st = cap.style
        val w = canvas.width.toFloat()
        val h = canvas.height.toFloat()
        val tf = typefaceFor(st.fontFamily, st.fontWeight)
        val size = st.fontSizePx.toFloat()
        for (p in listOf(fill, stroke)) {
            p.typeface = tf
            p.textSize = size
        }
        val words = cap.words.ifEmpty {
            // A caption without word timings is still drawn, as a single static word run.
            listOf(IrWord(cap.text, cap.startMs, cap.endMs, false, null, 1.0))
        }
        val tokens = words.map {
            val text = if (st.uppercase) it.text.uppercase() else it.text
            Token(it, text, fill.measureText(text))
        }
        val space = fill.measureText(" ")
        val maxWidth = (st.maxWidthFraction * w).toFloat()

        // Greedy word wrap.
        val lines = mutableListOf<MutableList<Token>>()
        var cur = mutableListOf<Token>()
        var curW = 0f
        for (tok in tokens) {
            val add = if (cur.isEmpty()) tok.width else curW + space + tok.width
            if (cur.isNotEmpty() && add > maxWidth) {
                lines.add(cur)
                cur = mutableListOf(tok)
                curW = tok.width
            } else {
                cur.add(tok)
                curW = add
            }
        }
        if (cur.isNotEmpty()) lines.add(cur)

        val fm = fill.fontMetrics
        val lineHeight = (fm.descent - fm.ascent) * 1.1f
        val blockH = lineHeight * lines.size
        val lineWidths = lines.map { l -> l.sumOf { it.width.toDouble() }.toFloat() + space * (l.size - 1) }
        val blockW = lineWidths.maxOrNull() ?: 0f
        val cx = (st.positionX * w).toFloat()
        val cy = (st.positionY * h).toFloat()
        val top = cy - blockH / 2f

        st.background?.let { b ->
            bg.color = b.color
            val pad = b.paddingPx.toFloat()
            val r = b.radiusPx.toFloat()
            canvas.drawRoundRect(RectF(cx - blockW / 2 - pad, top - pad, cx + blockW / 2 + pad, top + blockH + pad), r, r, bg)
        }

        stroke.strokeWidth = (st.strokeWidthPx * 2).toFloat() // stroke is centred on the glyph edge
        stroke.color = st.strokeColor
        if (st.shadow) fill.setShadowLayer(6f, 0f, 4f, 0xA0000000.toInt()) else fill.clearShadowLayer()

        lines.forEachIndexed { li, line ->
            var x = cx - lineWidths[li] / 2f
            val baseline = top + li * lineHeight - fm.ascent + (lineHeight - (fm.descent - fm.ascent)) / 2f
            for (tok in line) {
                val (color, scale) = styleFor(tok.word, st, t)
                canvas.save()
                val wordCx = x + tok.width / 2f
                val wordCy = baseline + (fm.ascent + fm.descent) / 2f
                canvas.scale(scale, scale, wordCx, wordCy)
                if (st.strokeWidthPx > 0) canvas.drawText(tok.text, x, baseline, stroke)
                fill.color = color
                canvas.drawText(tok.text, x, baseline, fill)
                canvas.restore()
                x += tok.width + space
            }
        }
    }

    private fun styleFor(word: IrWord, st: IrCaptionStyle, t: Double): Pair<Int, Float> {
        val active = t >= word.startMs && t < word.endMs
        val activeColor = word.color ?: st.highlightColor
        val restingColor = if (word.highlight) (word.color ?: st.highlightColor) else st.textColor
        return when (st.animation) {
            "word_pop" -> if (active) {
                val p = easeOut(((t - word.startMs) / 120.0).coerceIn(0.0, 1.0))
                activeColor to (1.0 + (word.scale - 1.0) * p).toFloat()
            } else restingColor to 1f
            "karaoke" -> when {
                active -> activeColor to 1f
                t >= word.endMs -> st.highlightColor to 1f
                else -> restingColor to 1f
            }
            else -> restingColor to 1f
        }
    }
}

/**
 * Paints `canvas.background` into the letterbox bars that [androidx.media3.effect.Presentation]
 * leaves black in `LAYOUT_SCALE_TO_FIT` mode (contract §3.1). Presentation has no fill colour, so
 * the bars are drawn over the fitted frame: the content rect is recomputed from the source aspect
 * ratio exactly as Presentation centres it, and only the area outside it is filled.
 */
@UnstableApi
class LetterboxFill(
    private val color: Int,
    /** Display aspect ratio (width / height) of the picture after rotation, before fitting. */
    private val contentAspect: Float,
) : CanvasOverlay(/* useInputFrameSize= */ true) {
    private val paint = Paint().apply {
        style = Paint.Style.FILL
        color = this@LetterboxFill.color
    }

    override fun onDraw(canvas: Canvas, presentationTimeUs: Long) {
        canvas.drawColor(Color.TRANSPARENT, PorterDuff.Mode.CLEAR)
        val w = canvas.width.toFloat()
        val h = canvas.height.toFloat()
        if (w <= 0f || h <= 0f || contentAspect <= 0f) return
        if (contentAspect > w / h) {
            // Wider than the canvas: bars above and below.
            val bar = (h - w / contentAspect) / 2f
            if (bar < 0.5f) return
            canvas.drawRect(0f, 0f, w, bar, paint)
            canvas.drawRect(0f, h - bar, w, h, paint)
        } else {
            // Bars left and right.
            val bar = (w - h * contentAspect) / 2f
            if (bar < 0.5f) return
            canvas.drawRect(0f, 0f, bar, h, paint)
            canvas.drawRect(w - bar, 0f, w, h, paint)
        }
    }
}

/**
 * Brand logo watermark (contract §3.9): the bitmap is scaled to `widthFraction` of the canvas width (aspect kept),
 * placed in the requested corner with a margin of 4% of the shorter canvas side, and drawn at `opacityPct`.
 * It is static, so the same pixels are drawn on every frame.
 */
@UnstableApi
class WatermarkOverlay(
    private val bitmap: android.graphics.Bitmap,
    private val position: String,
    opacityPct: Double,
    private val widthFraction: Double,
) : CanvasOverlay(/* useInputFrameSize= */ true) {
    private val paint = Paint(Paint.ANTI_ALIAS_FLAG or Paint.FILTER_BITMAP_FLAG).apply {
        alpha = (opacityPct.coerceIn(0.0, 100.0) / 100.0 * 255).toInt()
    }
    private val dst = RectF()

    override fun onDraw(canvas: Canvas, presentationTimeUs: Long) {
        canvas.drawColor(Color.TRANSPARENT, PorterDuff.Mode.CLEAR)
        val w = canvas.width.toFloat()
        val h = canvas.height.toFloat()
        if (w <= 0f || h <= 0f || bitmap.width <= 0 || bitmap.height <= 0 || paint.alpha == 0) return
        val drawW = (w * widthFraction).toFloat()
        val drawH = drawW * bitmap.height / bitmap.width
        val margin = min(w, h) * 0.04f
        val left = if (position.endsWith("left")) margin else w - margin - drawW
        val top = if (position.startsWith("top")) margin else h - margin - drawH
        dst.set(left, top, left + drawW, top + drawH)
        canvas.drawBitmap(bitmap, null, dst, paint)
    }
}
