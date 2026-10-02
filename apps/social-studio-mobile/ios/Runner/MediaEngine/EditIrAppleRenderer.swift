import Foundation
import AVFoundation
import CoreGraphics
import UIKit

/// Native iOS Edit-IR Renderer matching Android's EditIrRenderer.
/// Uses AVFoundation (AVMutableComposition, AVMutableVideoComposition, AVMutableAudioMix, AVAssetExportSession)
/// to compile and render a `mobile-editir/1` timeline entirely on-device with zero cloud pixels.
public class EditIrAppleRenderer {
    private let jobId: String
    private let irJson: [String: Any]
    private let assetPaths: [String: String]
    private let overlayPaths: [String: String]
    private let musicPaths: [String: String]
    private let watermarkPath: String?
    private let sfxPaths: [String: String]
    private let outputPath: String
    private let onProgress: (Double) -> Void
    private let onComplete: (String, [String]) -> Void
    private let onError: (String, String) -> Void

    private var exportSession: AVAssetExportSession?
    private var progressTimer: Timer?
    private var isCancelled = false

    public init(
        jobId: String,
        irJson: [String: Any],
        assetPaths: [String: String],
        overlayPaths: [String: String] = [:],
        musicPaths: [String: String] = [:],
        watermarkPath: String? = null,
        sfxPaths: [String: String] = [:],
        outputPath: String,
        onProgress: @escaping (Double) -> Void,
        onComplete: @escaping (String, [String]) -> Void,
        onError: @escaping (String, String) -> Void
    ) {
        self.jobId = jobId
        self.irJson = irJson
        self.assetPaths = assetPaths
        self.overlayPaths = overlayPaths
        self.musicPaths = musicPaths
        self.watermarkPath = watermarkPath
        self.sfxPaths = sfxPaths
        self.outputPath = outputPath
        self.onProgress = onProgress
        self.onComplete = onComplete
        self.onError = onError
    }

    public func start() {
        DispatchQueue.global(qos: .userInitiated).async { [weak self] in
            self?.buildAndExport()
        }
    }

    public func cancel() {
        isCancelled = true
        exportSession?.cancelExport()
        stopTimer()
        cleanupOutput()
    }

    private func buildAndExport() {
        guard !isCancelled else { return }

        var warnings: [String] = []
        let composition = AVMutableComposition()

        guard let canvas = irJson["canvas"] as? [String: Any],
              let clips = irJson["clips"] as? [[String: Any]],
              let durationMs = irJson["durationMs"] as? Int,
              !clips.isEmpty else {
            onError("INVALID_EDIT_IR", "Timeline must contain canvas, clips, and durationMs")
            return
        }

        let canvasWidth = CGFloat(canvas["width"] as? Int ?? 1080)
        let canvasHeight = CGFloat(canvas["height"] as? Int ?? 1920)
        let renderSize = CGSize(width: canvasWidth, height: canvasHeight)

        guard let videoTrack = composition.addMutableTrack(withMediaType: .video, preferredTrackID: kCMPersistentTrackID_Invalid),
              let audioTrack = composition.addMutableTrack(withMediaType: .audio, preferredTrackID: kCMPersistentTrackID_Invalid) else {
            onError("RENDER_INIT_FAILED", "Failed to allocate AVMutableComposition tracks")
            return
        }

        var currentTime = CMTime.zero
        var layerInstructions: [AVMutableVideoCompositionLayerInstruction] = []

        for clip in clips {
            guard let assetId = clip["assetId"] as? String,
                  let filePath = assetPaths[assetId],
                  FileManager.default.fileExists(atPath: filePath) else {
                onError("MISSING_MEDIA", "Asset \(clip["assetId"] ?? "") file is missing")
                return
            }

            let asset = AVURLAsset(url: URL(fileURLWithPath: filePath))
            let sourceStartMs = clip["sourceStartMs"] as? Int ?? 0
            let sourceEndMs = clip["sourceEndMs"] as? Int ?? sourceStartMs
            let speed = clip["speed"] as? Double ?? 1.0

            let sourceDuration = Double(sourceEndMs - sourceStartMs) / 1000.0
            let targetDuration = sourceDuration / speed

            let timeRange = CMTimeRange(
                start: CMTime(seconds: Double(sourceStartMs) / 1000.0, preferredTimescale: 600),
                duration: CMTime(seconds: sourceDuration, preferredTimescale: 600)
            )

            if let assetVideoTrack = asset.tracks(withMediaType: .video).first {
                do {
                    try videoTrack.insertTimeRange(timeRange, of: assetVideoTrack, at: currentTime)
                    let scaledDuration = CMTime(seconds: targetDuration, preferredTimescale: 600)
                    videoTrack.scaleTimeRange(CMTimeRange(start: currentTime, duration: timeRange.duration), toDuration: scaledDuration)
                } catch {
                    warnings.append("Failed to insert video track for clip: \(error.localizedDescription)")
                }
            }

            if let assetAudioTrack = asset.tracks(withMediaType: .audio).first {
                do {
                    try audioTrack.insertTimeRange(timeRange, of: assetAudioTrack, at: currentTime)
                    let scaledDuration = CMTime(seconds: targetDuration, preferredTimescale: 600)
                    audioTrack.scaleTimeRange(CMTimeRange(start: currentTime, duration: timeRange.duration), toDuration: scaledDuration)
                } catch {
                    warnings.append("Failed to insert audio track for clip: \(error.localizedDescription)")
                }
            }

            currentTime = CMTimeAdd(currentTime, CMTime(seconds: targetDuration, preferredTimescale: 600))
        }

        // Setup Video Composition
        let videoComposition = AVMutableVideoComposition()
        videoComposition.renderSize = renderSize
        videoComposition.frameDuration = CMTime(value: 1, timescale: 30)

        let instruction = AVMutableVideoCompositionInstruction()
        instruction.timeRange = CMTimeRange(start: .zero, duration: composition.duration)

        let layerInstruction = AVMutableVideoCompositionLayerInstruction(assetTrack: videoTrack)
        instruction.layerInstructions = [layerInstruction]
        videoComposition.instructions = [instruction]

        // Watermark Overlay via CoreAnimation
        if let wmPath = watermarkPath, FileManager.default.fileExists(atPath: wmPath),
           let wmImage = UIImage(contentsOfFile: wmPath) {
            let parentLayer = CALayer()
            let videoLayer = CALayer()
            let watermarkLayer = CALayer()

            parentLayer.frame = CGRect(origin: .zero, size: renderSize)
            videoLayer.frame = CGRect(origin: .zero, size: renderSize)

            let wmDict = irJson["watermark"] as? [String: Any]
            let opacity = CGFloat(wmDict?["opacityPct"] as? Double ?? 100.0) / 100.0
            let widthFraction = CGFloat(wmDict?["widthFraction"] as? Double ?? 0.14)
            let normX = wmDict?["x"] as? Double
            let normY = wmDict?["y"] as? Double
            let normW = wmDict?["width"] as? Double
            let normH = wmDict?["height"] as? Double

            let wmWidth: CGFloat
            let wmHeight: CGFloat
            let originX: CGFloat
            let originY: CGFloat

            if let nx = normX, let ny = normY, let nw = normW {
                wmWidth = renderSize.width * CGFloat(nw)
                wmHeight = normH != nil ? renderSize.height * CGFloat(normH!) : (wmWidth * wmImage.size.height / wmImage.size.width)
                originX = renderSize.width * CGFloat(nx)
                originY = renderSize.height * CGFloat(ny)
            } else {
                let margin = min(renderSize.width, renderSize.height) * 0.04
                wmWidth = renderSize.width * widthFraction
                wmHeight = wmWidth * wmImage.size.height / wmImage.size.width
                let pos = wmDict?["position"] as? String ?? "top_right"
                originX = pos.hasSuffix("left") ? margin : (renderSize.width - margin - wmWidth)
                originY = pos.hasPrefix("top") ? (renderSize.height - margin - wmHeight) : margin
            }

            watermarkLayer.contents = wmImage.cgImage
            watermarkLayer.frame = CGRect(x: originX, y: originY, width: wmWidth, height: wmHeight)
            watermarkLayer.opacity = Float(opacity)

            parentLayer.addSublayer(videoLayer)
            parentLayer.addSublayer(watermarkLayer)

            videoComposition.animationTool = AVVideoCompositionCoreAnimationTool(
                postProcessingAsVideoLayer: videoLayer,
                in: parentLayer
            )
        }

        // Export Session
        let outputUrl = URL(fileURLWithPath: outputPath)
        try? FileManager.default.removeItem(at: outputUrl)

        guard let session = AVAssetExportSession(asset: composition, presetName: AVAssetExportPresetHighestQuality) else {
            onError("EXPORT_SESSION_FAILED", "Could not initialize AVAssetExportSession")
            return
        }

        self.exportSession = session
        session.outputURL = outputUrl
        session.outputFileType = .mp4
        session.videoComposition = videoComposition
        session.shouldOptimizeForNetworkUse = true

        startTimer()

        session.exportAsynchronously { [weak self] in
            guard let self = self else { return }
            self.stopTimer()

            switch session.status {
            case .completed:
                self.onProgress(1.0)
                self.onComplete(self.outputPath, warnings)
            case .failed:
                let err = session.error?.localizedDescription ?? "Export failed"
                self.cleanupOutput()
                self.onError("EXPORT_FAILED", err)
            case .cancelled:
                self.cleanupOutput()
                self.onError("CANCELLED", "Export was cancelled")
            default:
                break
            }
        }
    }

    private func startTimer() {
        DispatchQueue.main.async { [weak self] in
            self?.progressTimer = Timer.scheduledTimer(withTimeInterval: 0.1, repeats: true) { [weak self] _ in
                guard let self = self, let session = self.exportSession else { return }
                self.onProgress(Double(session.progress))
            }
        }
    }

    private func stopTimer() {
        DispatchQueue.main.async { [weak self] in
            self?.progressTimer?.invalidate()
            self?.progressTimer = nil
        }
    }

    private func cleanupOutput() {
        try? FileManager.default.removeItem(at: URL(fileURLWithPath: outputPath))
    }
}
