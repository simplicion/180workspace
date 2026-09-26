import 'dart:async';

import 'package:camera/camera.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';

import '../../core/theme/app_theme.dart';
import '../../core/widgets/common.dart';

/// Teleprompter camera. On stop it opens the recording in the Studio editor. A failed or
/// denied recording is reported; no placeholder file is ever handed on.
class CameraScreen extends StatefulWidget {
  const CameraScreen({super.key, this.hook, this.script, this.projectId, this.postId, this.pieceId});
  final String? hook;
  final String? script;
  final String? projectId;
  final String? postId;
  final String? pieceId;

  @override
  State<CameraScreen> createState() => _CameraScreenState();
}

class _CameraScreenState extends State<CameraScreen> with WidgetsBindingObserver {
  CameraController? _cam;
  List<CameraDescription> _cameras = [];
  int _index = 0;
  Object? _error;
  bool _recording = false;
  bool _busy = false;
  int _seconds = 0;
  Timer? _timer;
  Timer? _scroll;
  double _speed = 1.2;
  final _scrollCtl = ScrollController();

  bool get _hasScript => (widget.hook?.trim().isNotEmpty ?? false) || (widget.script?.trim().isNotEmpty ?? false);

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _init();
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    _timer?.cancel();
    _scroll?.cancel();
    _scrollCtl.dispose();
    _cam?.dispose();
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    final cam = _cam;
    if (cam == null || !cam.value.isInitialized) return;
    if (state == AppLifecycleState.inactive) {
      if (_recording) _stop();
      cam.dispose();
      _cam = null;
    } else if (state == AppLifecycleState.resumed && _cameras.isNotEmpty) {
      _open(_cameras[_index]);
    }
  }

  Future<void> _init() async {
    try {
      _cameras = await availableCameras();
      if (_cameras.isEmpty) throw 'No camera was found on this device.';
      final front = _cameras.indexWhere((c) => c.lensDirection == CameraLensDirection.front);
      _index = front >= 0 && _hasScript ? front : 0;
      await _open(_cameras[_index]);
    } catch (e) {
      if (mounted) setState(() => _error = e);
    }
  }

  Future<void> _open(CameraDescription d) async {
    await _cam?.dispose();
    final cam = CameraController(d, ResolutionPreset.veryHigh, enableAudio: true);
    try {
      await cam.initialize();
      if (!mounted) {
        await cam.dispose();
        return;
      }
      setState(() {
        _cam = cam;
        _error = null;
      });
    } on CameraException catch (e) {
      await cam.dispose();
      if (mounted) {
        setState(() => _error = e.code == 'CameraAccessDenied' || e.code == 'AudioAccessDenied'
            ? 'Camera or microphone access is off. Allow it in Settings to record.'
            : 'Could not open the camera: ${e.description ?? e.code}');
      }
    }
  }

  Future<void> _flip() async {
    if (_cameras.length < 2 || _recording) return;
    _index = (_index + 1) % _cameras.length;
    await _open(_cameras[_index]);
  }

  Future<void> _start() async {
    final cam = _cam;
    if (cam == null || _busy) return;
    setState(() => _busy = true);
    try {
      await cam.startVideoRecording();
      setState(() {
        _recording = true;
        _seconds = 0;
      });
      _timer = Timer.periodic(const Duration(seconds: 1), (_) => mounted ? setState(() => _seconds++) : null);
      _scroll = Timer.periodic(const Duration(milliseconds: 30), (_) {
        if (_scrollCtl.hasClients && _scrollCtl.offset < _scrollCtl.position.maxScrollExtent) {
          _scrollCtl.jumpTo(_scrollCtl.offset + _speed);
        }
      });
    } catch (e) {
      if (mounted) showError(context, 'Recording could not start: $e');
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _stop() async {
    final cam = _cam;
    if (cam == null || !_recording) return;
    _timer?.cancel();
    _scroll?.cancel();
    setState(() {
      _recording = false;
      _busy = true;
    });
    try {
      final file = await cam.stopVideoRecording();
      if (!mounted) return;
      final q = [
        if (widget.postId?.isNotEmpty ?? false) 'postId=${widget.postId}',
        if (widget.projectId?.isNotEmpty ?? false) 'projectId=${widget.projectId}',
      ].join('&');
      context.pushReplacement('/studio/session${q.isEmpty ? '' : '?$q'}', extra: {
        'sourcePath': file.path,
        'pieceId': ?widget.pieceId,
        'hook': ?widget.hook,
        'script': ?widget.script,
      });
    } catch (e) {
      if (mounted) showError(context, 'The recording could not be saved: $e');
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final cam = _cam;
    final mono = GoogleFonts.jetBrainsMono(fontSize: 14, fontWeight: FontWeight.w700, color: Colors.white);
    return Scaffold(
      backgroundColor: Colors.black,
      body: Stack(fit: StackFit.expand, children: [
        if (cam != null && cam.value.isInitialized)
          Center(child: CameraPreview(cam))
        else if (_error != null)
          Center(
            child: Padding(
              padding: const EdgeInsets.all(24),
              child: ErrorView(error: _error!, compact: true, onRetry: _init),
            ),
          )
        else
          const Center(child: CircularProgressIndicator(color: AppTheme.primary)),
        SafeArea(
          child: Column(children: [
            Padding(
              padding: const EdgeInsets.all(8),
              child: Row(children: [
                IconButton(
                  tooltip: 'Close',
                  style: IconButton.styleFrom(backgroundColor: Colors.black54, minimumSize: const Size(44, 44)),
                  onPressed: _recording ? null : () => context.pop(),
                  icon: const Icon(Icons.close_rounded, color: Colors.white),
                ),
                const Spacer(),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                  decoration: BoxDecoration(color: Colors.black54, borderRadius: BorderRadius.circular(10)),
                  child: Row(children: [
                    if (_recording) Container(width: 10, height: 10, margin: const EdgeInsets.only(right: 8), decoration: const BoxDecoration(color: AppTheme.error, shape: BoxShape.circle)),
                    Text('${(_seconds ~/ 60).toString().padLeft(2, '0')}:${(_seconds % 60).toString().padLeft(2, '0')}', style: mono),
                  ]),
                ),
                const Spacer(),
                IconButton(
                  tooltip: 'Switch camera',
                  style: IconButton.styleFrom(backgroundColor: Colors.black54, minimumSize: const Size(44, 44)),
                  onPressed: _cameras.length > 1 && !_recording ? _flip : null,
                  icon: const Icon(Icons.flip_camera_ios_rounded, color: Colors.white),
                ),
              ]),
            ),
            if (_hasScript)
              Expanded(
                child: Container(
                  margin: const EdgeInsets.symmetric(horizontal: 16),
                  padding: const EdgeInsets.symmetric(horizontal: 16),
                  decoration: BoxDecoration(color: Colors.black.withValues(alpha: 0.45), borderRadius: BorderRadius.circular(16)),
                  child: ListView(controller: _scrollCtl, children: [
                    const SizedBox(height: 24),
                    if (widget.hook?.trim().isNotEmpty ?? false) ...[
                      const Text('HOOK · LOOK AT THE LENS', style: TextStyle(color: AppTheme.accentCyan, fontWeight: FontWeight.w700, fontSize: 12, letterSpacing: 1.2)),
                      const SizedBox(height: 6),
                      Text(widget.hook!, style: const TextStyle(color: Colors.white, fontSize: 26, fontWeight: FontWeight.w900, height: 1.3)),
                      const SizedBox(height: 24),
                    ],
                    if (widget.script?.trim().isNotEmpty ?? false)
                      Text(widget.script!, style: const TextStyle(color: Colors.white, fontSize: 21, height: 1.5, fontWeight: FontWeight.w500)),
                    const SizedBox(height: 240),
                  ]),
                ),
              )
            else
              const Spacer(),
            if (_hasScript)
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 24),
                child: Row(children: [
                  const Icon(Icons.speed_rounded, color: Colors.white70, size: 18),
                  Expanded(child: Slider(value: _speed, min: 0.4, max: 3, onChanged: (v) => setState(() => _speed = v))),
                ]),
              ),
            Padding(
              padding: const EdgeInsets.only(bottom: 24, top: 8),
              child: Semantics(
                button: true,
                label: _recording ? 'Stop recording' : 'Start recording',
                child: GestureDetector(
                  onTap: cam == null || _busy ? null : (_recording ? _stop : _start),
                  child: Container(
                    width: 80,
                    height: 80,
                    padding: const EdgeInsets.all(4),
                    decoration: BoxDecoration(shape: BoxShape.circle, border: Border.all(color: Colors.white, width: 4)),
                    child: Center(
                      child: AnimatedContainer(
                        duration: const Duration(milliseconds: 200),
                        width: _recording ? 32 : 64,
                        height: _recording ? 32 : 64,
                        decoration: BoxDecoration(color: AppTheme.error, borderRadius: BorderRadius.circular(_recording ? 8 : 40)),
                      ),
                    ),
                  ),
                ),
              ),
            ),
          ]),
        ),
      ]),
    );
  }
}
