import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:image_picker/image_picker.dart';
import 'package:video_player/video_player.dart';
import 'package:dio/dio.dart';
import '../../../core/config/app_config.dart';
import '../../../core/theme/pitch_theme.dart';
import '../../../core/auth/auth_provider.dart';

class PitchCreatorStudio extends ConsumerStatefulWidget {
  const PitchCreatorStudio({super.key});

  @override
  ConsumerState<PitchCreatorStudio> createState() => _PitchCreatorStudioState();
}

class _PitchCreatorStudioState extends ConsumerState<PitchCreatorStudio> {
  final _picker = ImagePicker();
  final _titleController = TextEditingController();
  final _descController = TextEditingController();
  final _tagsController = TextEditingController();

  XFile? _selectedVideo;
  VideoPlayerController? _previewController;
  double _videoDurationSeconds = 0.0;
  String _selectedCategory = 'startups';
  bool _isUploading = false;
  double _uploadProgress = 0.0;
  String _statusMessage = '';
  String? _errorMessage;

  final List<String> _categories = [
    'startups',
    'ai',
    'saas',
    'fintech',
    'health',
    'creator',
  ];

  @override
  void dispose() {
    _titleController.dispose();
    _descController.dispose();
    _tagsController.dispose();
    _previewController?.dispose();
    super.dispose();
  }

  Future<void> _pickVideo(ImageSource source) async {
    setState(() {
      _errorMessage = null;
      _statusMessage = 'Selecting video...';
    });

    try {
      final file = await _picker.pickVideo(source: source);
      if (file == null) {
        setState(() => _statusMessage = '');
        return;
      }

      // Initialize preview and probe duration
      final controller = VideoPlayerController.file(File(file.path));
      await controller.initialize();
      final duration = controller.value.duration.inMilliseconds / 1000.0;

      // STRICT 180-SECOND LIMIT ENFORCEMENT
      if (duration > AppConfig.maxPitchDurationSeconds) {
        await controller.dispose();
        if (mounted) {
          setState(() {
            _selectedVideo = null;
            _previewController = null;
            _errorMessage =
                'Pitch is ${duration.toStringAsFixed(1)}s long. 180 Network enforces a strict 180-second limit. Please trim your video to 180s or less.';
            _statusMessage = '';
          });
        }
        return;
      }

      _previewController?.dispose();
      setState(() {
        _selectedVideo = file;
        _previewController = controller;
        _videoDurationSeconds = duration;
        _statusMessage = 'Video loaded: ${duration.toStringAsFixed(1)}s (Within 180s limit)';
      });
    } catch (e) {
      setState(() {
        _errorMessage = 'Failed to load video: $e';
        _statusMessage = '';
      });
    }
  }

  Future<void> _publishPitch() async {
    final title = _titleController.text.trim();
    if (title.isEmpty) {
      setState(() => _errorMessage = 'Please enter a pitch title');
      return;
    }

    if (_selectedVideo == null) {
      setState(() => _errorMessage = 'Please record or select a video pitch');
      return;
    }

    final auth = ref.read(authStateProvider);
    if (auth is! Authenticated) {
      ref.read(authStateProvider.notifier).launchSso();
      return;
    }

    setState(() {
      _isUploading = true;
      _errorMessage = null;
      _uploadProgress = 0.05;
      _statusMessage = 'Requesting secure upload URL from Cloudflare R2...';
    });

    try {
      final dio = Dio();
      final userToken = auth.accessToken;
      final videoFile = File(_selectedVideo!.path);
      final filename = _selectedVideo!.name.isNotEmpty ? _selectedVideo!.name : 'pitch.mp4';

      // 1. Request pre-signed URL from Pitch Media Service
      final presignedRes = await dio.post(
        '${AppConfig.apiBaseUrl}/api/v1/pitch/media/upload-url',
        data: {
          'filename': filename,
          'contentType': 'video/mp4',
        },
        options: Options(headers: {'Authorization': 'Bearer $userToken'}),
      );

      final uploadUrl = presignedRes.data['uploadUrl'] as String;
      final publicUrl = presignedRes.data['publicUrl'] as String;

      setState(() {
        _uploadProgress = 0.25;
        _statusMessage = 'Uploading video to Cloudflare R2...';
      });

      // 2. Direct binary PUT to Cloudflare R2 with progress
      final bytes = await videoFile.readAsBytes();
      await dio.put(
        uploadUrl,
        data: bytes,
        options: Options(
          headers: {
            'Content-Type': 'video/mp4',
            'Content-Length': bytes.length.toString(),
          },
        ),
        onSendProgress: (sent, total) {
          if (total > 0 && mounted) {
            final p = 0.25 + (sent / total) * 0.50; // up to 75%
            setState(() {
              _uploadProgress = p;
              _statusMessage = 'Uploading video: ${(sent / 1024 / 1024).toStringAsFixed(1)}MB / ${(total / 1024 / 1024).toStringAsFixed(1)}MB';
            });
          }
        },
      );

      setState(() {
        _uploadProgress = 0.80;
        _statusMessage = 'Creating pitch record on 180 Network...';
      });

      // 3. Create pitch record
      final tags = _tagsController.text
          .split(',')
          .map((t) => t.trim().replaceAll('#', ''))
          .where((t) => t.isNotEmpty)
          .toList();

      final postRes = await dio.post(
        '${AppConfig.apiBaseUrl}/api/v1/pitch/posts',
        data: {
          'title': title,
          'description': _descController.text.trim(),
          'videoUrl': publicUrl,
          'duration': _videoDurationSeconds,
          'category': _selectedCategory,
          'tags': tags,
        },
        options: Options(headers: {'Authorization': 'Bearer $userToken'}),
      );

      final pitchId = postRes.data['pitch']['id'] as String;

      setState(() {
        _uploadProgress = 0.95;
        _statusMessage = 'Enqueuing ABR HLS transcoding job...';
      });

      // 4. Trigger transcoding job in BullMQ worker
      await dio.post(
        '${AppConfig.apiBaseUrl}/api/v1/pitch/media/process-video',
        data: {
          'pitchId': pitchId,
          'rawVideoUrl': publicUrl,
        },
        options: Options(headers: {'Authorization': 'Bearer $userToken'}),
      );

      setState(() {
        _uploadProgress = 1.0;
        _statusMessage = 'Pitch published successfully!';
      });

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            backgroundColor: PitchTheme.success,
            content: Text('🎉 Your 180s pitch is live and processing!'),
          ),
        );
        Navigator.pop(context);
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _isUploading = false;
          _errorMessage = 'Failed to publish pitch: $e';
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: PitchTheme.background,
      appBar: AppBar(
        title: const Text('Pitch Creator Studio', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 18)),
        actions: [
          if (!_isUploading)
            TextButton(
              onPressed: _publishPitch,
              child: const Text('Publish', style: TextStyle(color: PitchTheme.primary, fontWeight: FontWeight.w800, fontSize: 15)),
            ),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Video Preview or Picker Box
            GestureDetector(
              onTap: _isUploading
                  ? null
                  : () => showModalBottomSheet(
                        context: context,
                        backgroundColor: PitchTheme.surface,
                        shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
                        builder: (_) => SafeArea(
                          child: Column(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              ListTile(
                                leading: const Icon(Icons.videocam_rounded, color: PitchTheme.primary),
                                title: const Text('Record Pitch (Camera)'),
                                subtitle: const Text('Max 180 seconds'),
                                onTap: () {
                                  Navigator.pop(context);
                                  _pickVideo(ImageSource.camera);
                                },
                              ),
                              ListTile(
                                leading: const Icon(Icons.video_library_rounded, color: PitchTheme.secondary),
                                title: const Text('Upload from Gallery'),
                                subtitle: const Text('MP4 / MOV, strictly <= 180s'),
                                onTap: () {
                                  Navigator.pop(context);
                                  _pickVideo(ImageSource.gallery);
                                },
                              ),
                            ],
                          ),
                        ),
                      ),
              child: Container(
                height: 240,
                width: double.infinity,
                decoration: BoxDecoration(
                  color: PitchTheme.surface,
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(
                    color: _selectedVideo != null ? PitchTheme.primary : const Color(0x336366F1),
                    width: 2,
                  ),
                ),
                child: _previewController != null && _previewController!.value.isInitialized
                    ? ClipRRect(
                        borderRadius: BorderRadius.circular(18),
                        child: Stack(
                          fit: StackFit.expand,
                          children: [
                            FittedBox(
                              fit: BoxFit.cover,
                              child: SizedBox(
                                width: _previewController!.value.size.width,
                                height: _previewController!.value.size.height,
                                child: VideoPlayer(_previewController!),
                              ),
                            ),
                            Positioned(
                              top: 12,
                              right: 12,
                              child: Container(
                                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                                decoration: BoxDecoration(
                                  color: Colors.black.withValues(alpha: 0.7),
                                  borderRadius: BorderRadius.circular(12),
                                ),
                                child: Text(
                                  '⏱ ${_videoDurationSeconds.toStringAsFixed(1)}s / 180s',
                                  style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 12, color: Colors.white),
                                ),
                              ),
                            ),
                          ],
                        ),
                      )
                    : Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Container(
                            padding: const EdgeInsets.all(16),
                            decoration: BoxDecoration(
                              color: PitchTheme.primary.withValues(alpha: 0.15),
                              shape: BoxShape.circle,
                            ),
                            child: const Icon(Icons.video_call_rounded, size: 40, color: PitchTheme.primary),
                          ),
                          const SizedBox(height: 12),
                          const Text(
                            'Record or Select 180s Pitch Video',
                            style: TextStyle(fontWeight: FontWeight.w700, fontSize: 15),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            'Strict 180s limit • 1080x1920 portrait recommended',
                            style: TextStyle(color: PitchTheme.textSecondary, fontSize: 12),
                          ),
                        ],
                      ),
              ),
            ),
            const SizedBox(height: 20),

            // Upload Progress Bar
            if (_isUploading) ...[
              LinearProgressIndicator(
                value: _uploadProgress,
                backgroundColor: PitchTheme.surface,
                color: PitchTheme.primary,
                minHeight: 8,
                borderRadius: BorderRadius.circular(4),
              ),
              const SizedBox(height: 8),
              Text(
                _statusMessage,
                style: const TextStyle(fontSize: 12, color: PitchTheme.primary, fontWeight: FontWeight.w600),
              ),
              const SizedBox(height: 20),
            ] else if (_statusMessage.isNotEmpty) ...[
              Text(
                _statusMessage,
                style: const TextStyle(fontSize: 12, color: PitchTheme.success, fontWeight: FontWeight.w600),
              ),
              const SizedBox(height: 12),
            ],

            // Error Banner
            if (_errorMessage != null) ...[
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: PitchTheme.error.withValues(alpha: 0.15),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: PitchTheme.error),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.error_outline_rounded, color: PitchTheme.error, size: 20),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Text(_errorMessage!, style: const TextStyle(color: PitchTheme.error, fontSize: 13)),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 16),
            ],

            // Title
            const Text('Pitch Title', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 14)),
            const SizedBox(height: 8),
            TextField(
              controller: _titleController,
              decoration: InputDecoration(
                hintText: 'e.g. Helomi: AI-Powered Clinical Protocol Engine',
                filled: true,
                fillColor: PitchTheme.surface,
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(14), borderSide: BorderSide.none),
              ),
            ),
            const SizedBox(height: 18),

            // Description
            const Text('Elevator Summary', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 14)),
            const SizedBox(height: 8),
            TextField(
              controller: _descController,
              maxLines: 3,
              decoration: InputDecoration(
                hintText: 'What problem are you solving? What is your secret advantage?',
                filled: true,
                fillColor: PitchTheme.surface,
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(14), borderSide: BorderSide.none),
              ),
            ),
            const SizedBox(height: 18),

            // Category Picker
            const Text('Industry / Sector', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 14)),
            const SizedBox(height: 8),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: _categories.map((cat) {
                final isSelected = cat == _selectedCategory;
                return ChoiceChip(
                  label: Text('#${cat.toUpperCase()}'),
                  selected: isSelected,
                  selectedColor: PitchTheme.primary,
                  backgroundColor: PitchTheme.surface,
                  labelStyle: TextStyle(
                    color: isSelected ? Colors.white : PitchTheme.textSecondary,
                    fontWeight: isSelected ? FontWeight.w800 : FontWeight.w600,
                    fontSize: 12,
                  ),
                  onSelected: (val) {
                    if (val) setState(() => _selectedCategory = cat);
                  },
                );
              }).toList(),
            ),
            const SizedBox(height: 18),

            // Tags
            const Text('Tags (comma separated)', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 14)),
            const SizedBox(height: 8),
            TextField(
              controller: _tagsController,
              decoration: InputDecoration(
                hintText: 'e.g. AI, B2B, HealthTech, PreSeed',
                filled: true,
                fillColor: PitchTheme.surface,
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(14), borderSide: BorderSide.none),
              ),
            ),
            const SizedBox(height: 32),

            // Submit Button
            SizedBox(
              width: double.infinity,
              height: 52,
              child: ElevatedButton(
                style: ElevatedButton.styleFrom(
                  backgroundColor: PitchTheme.primary,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                ),
                onPressed: _isUploading ? null : _publishPitch,
                child: _isUploading
                    ? const Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          SizedBox(width: 20, height: 20, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2)),
                          SizedBox(width: 12),
                          Text('Publishing Pitch...', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 16)),
                        ],
                      )
                    : const Text('Publish Pitch Reel', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 16)),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
