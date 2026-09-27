import 'package:flutter/material.dart';
import 'package:video_player/video_player.dart';
import '../../../../core/theme/pitch_theme.dart';

class VideoReelPlayer extends StatefulWidget {
  final String videoUrl;
  final String? hlsMasterUrl;
  final bool isCurrent;
  final ValueChanged<double>? onProgressSeconds;

  const VideoReelPlayer({
    super.key,
    required this.videoUrl,
    this.hlsMasterUrl,
    required this.isCurrent,
    this.onProgressSeconds,
  });

  @override
  State<VideoReelPlayer> createState() => _VideoReelPlayerState();
}

class _VideoReelPlayerState extends State<VideoReelPlayer> {
  VideoPlayerController? _controller;
  bool _initialized = false;
  bool _isPlaying = true;
  bool _showPlayIcon = false;

  @override
  void initState() {
    super.initState();
    _initPlayer();
  }

  @override
  void didUpdateWidget(covariant VideoReelPlayer oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.isCurrent != oldWidget.isCurrent) {
      if (widget.isCurrent) {
        _controller?.play();
        setState(() => _isPlaying = true);
      } else {
        _controller?.pause();
        setState(() => _isPlaying = false);
      }
    }
  }

  Future<void> _initPlayer() async {
    final streamUrl = (widget.hlsMasterUrl != null && widget.hlsMasterUrl!.isNotEmpty)
        ? widget.hlsMasterUrl!
        : widget.videoUrl;

    _controller = VideoPlayerController.networkUrl(Uri.parse(streamUrl));
    try {
      await _controller!.initialize();
      _controller!.setLooping(true);
      if (widget.isCurrent) {
        _controller!.play();
      }

      _controller!.addListener(_onControllerUpdate);

      if (mounted) {
        setState(() {
          _initialized = true;
        });
      }
    } catch (e) {
      // Fallback or error state
    }
  }

  void _onControllerUpdate() {
    if (_controller == null || !_controller!.value.isInitialized) return;
    final pos = _controller!.value.position.inMilliseconds / 1000.0;
    widget.onProgressSeconds?.call(pos);
  }

  void _togglePlayPause() {
    if (_controller == null || !_controller!.value.isInitialized) return;
    if (_controller!.value.isPlaying) {
      _controller!.pause();
      setState(() {
        _isPlaying = false;
        _showPlayIcon = true;
      });
    } else {
      _controller!.play();
      setState(() {
        _isPlaying = true;
        _showPlayIcon = true;
      });
      Future.delayed(const Duration(milliseconds: 600), () {
        if (mounted) setState(() => _showPlayIcon = false);
      });
    }
  }

  @override
  void dispose() {
    _controller?.removeListener(_onControllerUpdate);
    _controller?.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    if (!_initialized || _controller == null) {
      return Container(
        color: PitchTheme.background,
        child: const Center(
          child: CircularProgressIndicator(color: PitchTheme.primary, strokeWidth: 2.5),
        ),
      );
    }

    return GestureDetector(
      onTap: _togglePlayPause,
      child: Stack(
        fit: StackFit.expand,
        children: [
          FittedBox(
            fit: BoxFit.cover,
            child: SizedBox(
              width: _controller!.value.size.width,
              height: _controller!.value.size.height,
              child: VideoPlayer(_controller!),
            ),
          ),
          if (_showPlayIcon || !_isPlaying)
            Center(
              child: AnimatedOpacity(
                opacity: _isPlaying ? 0.0 : 1.0,
                duration: const Duration(milliseconds: 300),
                child: Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: Colors.black.withValues(alpha: 0.5),
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(
                    Icons.play_arrow_rounded,
                    size: 54,
                    color: Colors.white,
                  ),
                ),
              ),
            ),
        ],
      ),
    );
  }
}
