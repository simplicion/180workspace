package com.workspace180.socialmanager.mediaengine

import android.content.Context
import android.graphics.Color
import android.opengl.GLES20
import androidx.media3.common.VideoFrameProcessingException
import androidx.media3.common.util.GlProgram
import androidx.media3.common.util.GlUtil
import androidx.media3.common.util.Size
import androidx.media3.common.util.UnstableApi
import androidx.media3.effect.BaseGlShaderProgram
import androidx.media3.effect.GlEffect
import androidx.media3.effect.GlShaderProgram
import org.json.JSONObject

/** Green / blue screen key on an overlay layer (contract `chromaKey`). */
data class IrChromaKey(val color: Int, val similarity: Double, val smoothness: Double, val spill: Double) {
    companion object {
        fun parse(o: JSONObject?): IrChromaKey? {
            if (o == null) return null
            val hex = o.optString("color", "#00FF00")
            val color = try { Color.parseColor(hex) } catch (_: IllegalArgumentException) { Color.GREEN }
            return IrChromaKey(
                color,
                o.optDouble("similarity", 0.3).coerceIn(0.0, 1.0),
                o.optDouble("smoothness", 0.1).coerceIn(0.0, 1.0),
                o.optDouble("spill", 0.5).coerceIn(0.0, 1.0),
            )
        }
    }
}

/**
 * Keys out [IrChromaKey.color]: pixels whose chroma (CbCr) is within `similarity` of the key become transparent,
 * with a `smoothness` edge, and the key colour's spill is pulled toward grey. The phone preview runs the same maths
 * (shaders/chroma_key.frag), so preview = export.
 */
@UnstableApi
class ChromaKeyEffect(private val key: IrChromaKey) : GlEffect {
    override fun toGlShaderProgram(context: Context, useHdr: Boolean): GlShaderProgram = ChromaKeyProgram(key, useHdr)
}

@UnstableApi
private class ChromaKeyProgram(private val key: IrChromaKey, useHdr: Boolean) : BaseGlShaderProgram(useHdr, 1) {
    private val program = try {
        GlProgram(VERTEX, FRAGMENT)
    } catch (e: GlUtil.GlException) {
        throw VideoFrameProcessingException(e)
    }

    init {
        program.setBufferAttribute("aFramePosition", GlUtil.getNormalizedCoordinateBounds(), GlUtil.HOMOGENEOUS_COORDINATE_VECTOR_SIZE)
    }

    override fun configure(inputWidth: Int, inputHeight: Int): Size = Size(inputWidth, inputHeight)

    override fun drawFrame(inputTexId: Int, presentationTimeUs: Long) {
        try {
            program.use()
            program.setSamplerTexIdUniform("uTexSampler", inputTexId, 0)
            program.setFloatsUniform(
                "uKeyColor",
                floatArrayOf(Color.red(key.color) / 255f, Color.green(key.color) / 255f, Color.blue(key.color) / 255f),
            )
            program.setFloatUniform("uSimilarity", key.similarity.toFloat())
            program.setFloatUniform("uSmoothness", key.smoothness.toFloat())
            program.setFloatUniform("uSpill", key.spill.toFloat())
            program.bindAttributesAndUniforms()
            GLES20.glDrawArrays(GLES20.GL_TRIANGLE_STRIP, 0, 4)
        } catch (e: GlUtil.GlException) {
            throw VideoFrameProcessingException(e, presentationTimeUs)
        }
    }

    override fun release() {
        super.release()
        try {
            program.delete()
        } catch (e: GlUtil.GlException) {
            throw VideoFrameProcessingException(e)
        }
    }

    companion object {
        const val VERTEX = """
attribute vec4 aFramePosition;
varying vec2 vTexSamplingCoord;
void main() {
  gl_Position = aFramePosition;
  vTexSamplingCoord = vec2(aFramePosition.x * 0.5 + 0.5, aFramePosition.y * 0.5 + 0.5);
}
"""

        // Keep in step with shaders/chroma_key.frag (Flutter preview).
        const val FRAGMENT = """
precision mediump float;
uniform sampler2D uTexSampler;
uniform vec3 uKeyColor;
uniform float uSimilarity;
uniform float uSmoothness;
uniform float uSpill;
varying vec2 vTexSamplingCoord;
vec2 cbcr(vec3 c) {
  return vec2(-0.168736 * c.r - 0.331264 * c.g + 0.5 * c.b, 0.5 * c.r - 0.418688 * c.g - 0.081312 * c.b);
}
void main() {
  vec4 src = texture2D(uTexSampler, vTexSamplingCoord);
  vec3 rgb = src.a > 0.0 ? src.rgb / src.a : src.rgb;
  float d = distance(cbcr(rgb), cbcr(uKeyColor));
  float a = smoothstep(uSimilarity * 0.5, uSimilarity * 0.5 + max(uSmoothness * 0.5, 0.001), d);
  float luma = dot(rgb, vec3(0.2126, 0.7152, 0.0722));
  rgb = mix(rgb, vec3(luma), (1.0 - smoothstep(0.0, uSimilarity * 0.5 + uSmoothness, d)) * uSpill);
  float alpha = a * src.a;
  gl_FragColor = vec4(rgb * alpha, alpha);
}
"""
    }
}
