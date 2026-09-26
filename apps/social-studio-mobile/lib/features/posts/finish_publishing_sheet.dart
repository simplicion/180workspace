import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/providers.dart';
import '../../core/services/clipboard_assist_service.dart';
import '../../core/services/user_assisted_publishers.dart';
import '../../core/theme/app_theme.dart';
import '../../core/widgets/common.dart';
import '../../data/models/platform.dart';
import '../../data/models/user_assisted_publish_package.dart';

/// Modal bottom sheet allowing users to review prepared copy & media and launch
/// native/web publishing flows for X and Reddit.
class FinishPublishingSheet extends ConsumerStatefulWidget {
  const FinishPublishingSheet({
    super.key,
    required this.package,
    this.onStatusUpdated,
    this.targetPlatforms,
  });

  final UserAssistedPublishPackage package;
  final void Function(String platform, String status)? onStatusUpdated;
  final Set<SocialPlatform>? targetPlatforms;

  @override
  ConsumerState<FinishPublishingSheet> createState() => _FinishPublishingSheetState();
}

class _FinishPublishingSheetState extends ConsumerState<FinishPublishingSheet> with WidgetsBindingObserver {
  late final TextEditingController _xCaptionController;
  late final TextEditingController _redditTitleController;
  late final TextEditingController _redditBodyController;
  late final TextEditingController _redditSubredditController;

  bool _showX = true;
  bool _showReddit = true;
  String? _pendingPlatformHandoff;
  bool _isPublishing = false;

  static const List<String> _suggestedSubreddits = [
    'technology',
    'socialmedia',
    'startups',
    'growth',
    'marketing',
  ];

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);

    final p = widget.package;
    final targets = widget.targetPlatforms;

    if (targets != null && targets.isNotEmpty) {
      _showX = targets.contains(SocialPlatform.x);
      _showReddit = targets.contains(SocialPlatform.reddit);
    } else {
      _showX = p.xPayload != null || p.caption != null;
      _showReddit = p.redditPayload != null || p.title != null;
    }

    _xCaptionController = TextEditingController(
      text: p.xPayload?.text ?? p.caption ?? '',
    );
    _redditTitleController = TextEditingController(
      text: p.redditPayload?.title ?? p.title ?? p.caption ?? '',
    );
    _redditBodyController = TextEditingController(
      text: p.redditPayload?.body ?? p.caption ?? '',
    );
    _redditSubredditController = TextEditingController(
      text: p.redditPayload?.normalizedSubreddit ?? 'socialmedia',
    );
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    _xCaptionController.dispose();
    _redditTitleController.dispose();
    _redditBodyController.dispose();
    _redditSubredditController.dispose();
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed && _pendingPlatformHandoff != null) {
      final platform = _pendingPlatformHandoff!;
      _pendingPlatformHandoff = null;
      Future.microtask(() => _promptReturnConfirmation(platform));
    }
  }

  Future<void> _updateStatus(String platform, String status, {String? externalUrl}) async {
    widget.onStatusUpdated?.call(platform, status);
    try {
      await ref.read(socialApiProvider).updateAssistedPublishStatus(
            widget.package.id,
            platform: platform,
            status: status,
            externalUrl: externalUrl,
            platformMeta: {
              if (platform == 'reddit') 'subreddit': _redditSubredditController.text.trim(),
            },
          );
    } catch (_) {
      // Backend status update is non-blocking for mobile user flow
    }
  }

  Future<void> _promptReturnConfirmation(String platform) async {
    if (!mounted) return;
    await PostPublishReturnDialog.show(
      context,
      platform: platform.toUpperCase(),
      onConfirm: (status) async {
        await _updateStatus(platform, status);
        if (mounted && status == 'user_confirmed') {
          showInfo(context, 'Marked $platform as posted!', color: AppTheme.success);
        }
      },
    );
  }

  Future<void> _postOnX({bool preferWeb = false}) async {
    final text = _xCaptionController.text.trim();
    if (text.isEmpty) {
      showError(context, 'Post caption cannot be empty.');
      return;
    }

    final payload = XPublishPayload(
      text: text,
      mediaPath: widget.package.mediaPath,
      mimeType: widget.package.mimeType,
      sourceContentId: widget.package.id,
      projectId: widget.package.projectId,
    );

    setState(() {
      _isPublishing = true;
      _pendingPlatformHandoff = 'x';
    });

    final result = await XUserAssistedPublisher.publish(
      context: context,
      payload: payload,
      preferWeb: preferWeb,
    );

    if (mounted) {
      setState(() => _isPublishing = false);
      if (result.success) {
        await _updateStatus('x', 'handed_off');
        if (!mounted) return;
        showInfo(
          context,
          preferWeb
              ? 'Opening X in browser… Caption copied!'
              : 'Opening X… Video attached & caption copied!',
          color: AppTheme.success,
        );
      } else {
        showError(context, result.message);
      }
    }
  }

  Future<void> _postOnReddit({bool preferWeb = false}) async {
    final title = _redditTitleController.text.trim();
    if (title.isEmpty) {
      showError(context, 'Post title is required for Reddit.');
      return;
    }

    final sub = _redditSubredditController.text.trim().replaceFirst(RegExp(r'^/?r/'), '');
    final payload = RedditPublishPayload(
      subreddit: sub,
      title: title,
      body: _redditBodyController.text.trim(),
      mediaPath: widget.package.mediaPath,
      mimeType: widget.package.mimeType,
      sourceContentId: widget.package.id,
      projectId: widget.package.projectId,
    );

    setState(() {
      _isPublishing = true;
      _pendingPlatformHandoff = 'reddit';
    });

    final result = await RedditUserAssistedPublisher.publish(
      context: context,
      payload: payload,
      preferWeb: preferWeb,
    );

    if (mounted) {
      setState(() => _isPublishing = false);
      if (result.success) {
        await _updateStatus('reddit', 'handed_off');
        if (!mounted) return;
        showInfo(
          context,
          preferWeb
              ? 'Opening Reddit in browser… Title & body copied!'
              : 'Opening Reddit… Video attached & title copied!',
          color: AppTheme.success,
        );
      } else {
        showError(context, result.message);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final mediaExists = widget.package.mediaPath != null &&
        widget.package.mediaPath!.isNotEmpty &&
        File(widget.package.mediaPath!).existsSync();
    final fileName = widget.package.mediaPath?.split(RegExp(r'[\\/]')).lastOrNull ?? 'Attached video';

    return Container(
      constraints: BoxConstraints(
        maxHeight: MediaQuery.of(context).size.height * 0.9,
      ),
      decoration: const BoxDecoration(
        color: AppTheme.surface,
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      child: SafeArea(
        top: false,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Modal Grab Handle
            Center(
              child: Container(
                margin: const EdgeInsets.only(top: 12, bottom: 8),
                width: 44,
                height: 5,
                decoration: BoxDecoration(
                  color: AppTheme.borderActive,
                  borderRadius: BorderRadius.circular(10),
                ),
              ),
            ),

            // Header Bar
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
              child: Row(
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Finish Publishing',
                          style: Theme.of(context).textTheme.titleLarge?.copyWith(
                                fontWeight: FontWeight.bold,
                                color: AppTheme.textPrimary,
                              ),
                        ),
                        const SizedBox(height: 2),
                        const Text(
                          'User-assisted publishing for X & Reddit',
                          style: TextStyle(fontSize: 12, color: AppTheme.textSecondary),
                        ),
                      ],
                    ),
                  ),
                  IconButton(
                    icon: const Icon(Icons.close_rounded, color: AppTheme.textSecondary),
                    onPressed: () => Navigator.pop(context),
                  ),
                ],
              ),
            ),

            const Divider(color: AppTheme.borderSubtle, height: 1),

            // Scrollable Content
            Flexible(
              child: SingleChildScrollView(
                padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    // Media banner indicator
                    if (mediaExists) ...[
                      Container(
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: AppTheme.surfaceSubtle,
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(color: AppTheme.border),
                        ),
                        child: Row(
                          children: [
                            const Icon(Icons.video_library_rounded, color: AppTheme.accentBlue, size: 20),
                            const SizedBox(width: 10),
                            Expanded(
                              child: Text(
                                fileName,
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                                style: const TextStyle(fontSize: 12, color: AppTheme.textPrimary),
                              ),
                            ),
                            const Text(
                              'Ready for handoff',
                              style: TextStyle(fontSize: 11, color: AppTheme.success, fontWeight: FontWeight.w600),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 16),
                    ],

                    // X Publishing Card
                    if (_showX) ...[
                      _buildXCard(),
                      const SizedBox(height: 20),
                    ],

                    // Reddit Publishing Card
                    if (_showReddit) ...[
                      _buildRedditCard(),
                      const SizedBox(height: 20),
                    ],

                    // Honest Platform Disclosure
                    Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: AppTheme.backgroundSubtle,
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: AppTheme.borderSubtle),
                      ),
                      child: const Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Icon(Icons.verified_user_outlined, size: 16, color: AppTheme.textMuted),
                          SizedBox(width: 8),
                          Expanded(
                            child: Text(
                              '180 Workspace never automatically clicks the final platform Post button. You review and confirm publication in the native app.',
                              style: TextStyle(fontSize: 11, color: AppTheme.textMuted, height: 1.4),
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 12),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildXCard() {
    final charCount = _xCaptionController.text.runes.length;
    final isOverLimit = charCount > XUserAssistedPublisher.maxStandardChars;

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppTheme.surfaceElevated,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: isOverLimit ? AppTheme.warning.withValues(alpha: 0.5) : AppTheme.border,
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(6),
                decoration: BoxDecoration(
                  color: Colors.black,
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: AppTheme.borderActive),
                ),
                child: const Icon(Icons.tag_rounded, size: 18, color: Colors.white),
              ),
              const SizedBox(width: 10),
              const Expanded(
                child: Text(
                  'Post on X',
                  style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: AppTheme.textPrimary),
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(
                  color: isOverLimit ? AppTheme.warning.withValues(alpha: 0.2) : AppTheme.surfaceSubtle,
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(
                  '$charCount / 280',
                  style: TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.w600,
                    color: isOverLimit ? AppTheme.warning : AppTheme.textSecondary,
                  ),
                ),
              ),
            ],
          ),
          if (isOverLimit) ...[
            const SizedBox(height: 8),
            const Text(
              'Caption exceeds 280 characters. Standard accounts will require trimming.',
              style: TextStyle(fontSize: 11, color: AppTheme.warning),
            ),
          ],
          const SizedBox(height: 12),
          TextField(
            controller: _xCaptionController,
            maxLines: 4,
            minLines: 2,
            style: const TextStyle(fontSize: 13, color: AppTheme.textPrimary),
            decoration: InputDecoration(
              hintText: 'X caption…',
              hintStyle: const TextStyle(color: AppTheme.textMuted),
              filled: true,
              fillColor: AppTheme.surfaceSubtle,
              contentPadding: const EdgeInsets.all(12),
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(10),
                borderSide: const BorderSide(color: AppTheme.borderSubtle),
              ),
              enabledBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(10),
                borderSide: const BorderSide(color: AppTheme.borderSubtle),
              ),
            ),
            onChanged: (_) => setState(() {}),
          ),
          const SizedBox(height: 14),
          Row(
            children: [
              Expanded(
                child: FilledButton.icon(
                  style: FilledButton.styleFrom(
                    backgroundColor: Colors.white,
                    foregroundColor: Colors.black,
                    padding: const EdgeInsets.symmetric(vertical: 12),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                  ),
                  onPressed: _isPublishing ? null : () => _postOnX(preferWeb: false),
                  icon: const Icon(Icons.open_in_new_rounded, size: 16),
                  label: const Text('Post on X', style: TextStyle(fontWeight: FontWeight.bold)),
                ),
              ),
              const SizedBox(width: 8),
              IconButton(
                tooltip: 'Copy caption',
                icon: const Icon(Icons.copy_rounded, size: 18),
                style: IconButton.styleFrom(
                  backgroundColor: AppTheme.surfaceSubtle,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(10),
                    side: const BorderSide(color: AppTheme.border),
                  ),
                ),
                onPressed: () => ClipboardAssistService.copyCaption(
                  _xCaptionController.text,
                  context: context,
                ),
              ),
              const SizedBox(width: 4),
              IconButton(
                tooltip: 'Open in X Web',
                icon: const Icon(Icons.language_rounded, size: 18),
                style: IconButton.styleFrom(
                  backgroundColor: AppTheme.surfaceSubtle,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(10),
                    side: const BorderSide(color: AppTheme.border),
                  ),
                ),
                onPressed: _isPublishing ? null : () => _postOnX(preferWeb: true),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildRedditCard() {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppTheme.surfaceElevated,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppTheme.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(6),
                decoration: BoxDecoration(
                  color: const Color(0xFFFF4500),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: const Icon(Icons.forum_rounded, size: 18, color: Colors.white),
              ),
              const SizedBox(width: 10),
              const Expanded(
                child: Text(
                  'Post on Reddit',
                  style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: AppTheme.textPrimary),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),

          // Subreddit field
          TextField(
            controller: _redditSubredditController,
            style: const TextStyle(fontSize: 13, color: AppTheme.textPrimary),
            decoration: InputDecoration(
              prefixText: 'r/ ',
              prefixStyle: const TextStyle(color: Color(0xFFFF4500), fontWeight: FontWeight.bold),
              labelText: 'Target Subreddit',
              labelStyle: const TextStyle(color: AppTheme.textSecondary, fontSize: 12),
              filled: true,
              fillColor: AppTheme.surfaceSubtle,
              contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
              border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
              enabledBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(10),
                borderSide: const BorderSide(color: AppTheme.borderSubtle),
              ),
            ),
          ),
          const SizedBox(height: 8),

          // Suggestion Chips
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: Row(
              children: [
                for (final sub in _suggestedSubreddits)
                  Padding(
                    padding: const EdgeInsets.only(right: 6),
                    child: ActionChip(
                      visualDensity: VisualDensity.compact,
                      padding: const EdgeInsets.symmetric(horizontal: 4),
                      label: Text('r/$sub', style: const TextStyle(fontSize: 11)),
                      backgroundColor: AppTheme.surfaceSubtle,
                      side: const BorderSide(color: AppTheme.borderSubtle),
                      onPressed: () => setState(() => _redditSubredditController.text = sub),
                    ),
                  ),
              ],
            ),
          ),
          const SizedBox(height: 12),

          // Title field
          TextField(
            controller: _redditTitleController,
            style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: AppTheme.textPrimary),
            decoration: InputDecoration(
              labelText: 'Reddit Title (Required)',
              labelStyle: const TextStyle(color: AppTheme.textSecondary, fontSize: 12),
              filled: true,
              fillColor: AppTheme.surfaceSubtle,
              contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
              border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
              enabledBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(10),
                borderSide: const BorderSide(color: AppTheme.borderSubtle),
              ),
            ),
          ),
          const SizedBox(height: 10),

          // Body field
          TextField(
            controller: _redditBodyController,
            maxLines: 3,
            minLines: 2,
            style: const TextStyle(fontSize: 13, color: AppTheme.textPrimary),
            decoration: InputDecoration(
              labelText: 'Reddit Body (Optional)',
              labelStyle: const TextStyle(color: AppTheme.textSecondary, fontSize: 12),
              filled: true,
              fillColor: AppTheme.surfaceSubtle,
              contentPadding: const EdgeInsets.all(12),
              border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
              enabledBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(10),
                borderSide: const BorderSide(color: AppTheme.borderSubtle),
              ),
            ),
          ),
          const SizedBox(height: 14),

          // Action row
          Row(
            children: [
              Expanded(
                child: FilledButton.icon(
                  style: FilledButton.styleFrom(
                    backgroundColor: const Color(0xFFFF4500),
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(vertical: 12),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                  ),
                  onPressed: _isPublishing ? null : () => _postOnReddit(preferWeb: false),
                  icon: const Icon(Icons.open_in_new_rounded, size: 16),
                  label: const Text('Post on Reddit', style: TextStyle(fontWeight: FontWeight.bold)),
                ),
              ),
              const SizedBox(width: 8),
              IconButton(
                tooltip: 'Copy title & body',
                icon: const Icon(Icons.copy_rounded, size: 18),
                style: IconButton.styleFrom(
                  backgroundColor: AppTheme.surfaceSubtle,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(10),
                    side: const BorderSide(color: AppTheme.border),
                  ),
                ),
                onPressed: () => ClipboardAssistService.copyRedditTitleAndBody(
                  title: _redditTitleController.text,
                  body: _redditBodyController.text,
                  context: context,
                ),
              ),
              const SizedBox(width: 4),
              IconButton(
                tooltip: 'Open in Reddit Web',
                icon: const Icon(Icons.language_rounded, size: 18),
                style: IconButton.styleFrom(
                  backgroundColor: AppTheme.surfaceSubtle,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(10),
                    side: const BorderSide(color: AppTheme.border),
                  ),
                ),
                onPressed: _isPublishing ? null : () => _postOnReddit(preferWeb: true),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

/// Dialog asking the user for confirmation when returning from an external platform app.
class PostPublishReturnDialog extends StatelessWidget {
  const PostPublishReturnDialog({
    super.key,
    required this.platform,
    required this.onConfirm,
  });

  final String platform;
  final Future<void> Function(String status) onConfirm;

  static Future<void> show(
    BuildContext context, {
    required String platform,
    required Future<void> Function(String status) onConfirm,
  }) {
    return showDialog<void>(
      context: context,
      barrierDismissible: false,
      builder: (ctx) => PostPublishReturnDialog(
        platform: platform,
        onConfirm: onConfirm,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      backgroundColor: AppTheme.surfaceElevated,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(18)),
      title: Text('Did you publish on $platform?'),
      content: Text(
        '180 Workspace cannot independently verify posts published through external apps. Please let us know if your post went live.',
        style: const TextStyle(fontSize: 13, color: AppTheme.textSecondary, height: 1.4),
      ),
      actions: [
        TextButton(
          onPressed: () async {
            Navigator.pop(context);
            await onConfirm('user_cancelled');
          },
          child: const Text('Cancel', style: TextStyle(color: AppTheme.textMuted)),
        ),
        TextButton(
          onPressed: () async {
            Navigator.pop(context);
            await onConfirm('ready_to_publish');
          },
          child: const Text('Not yet', style: TextStyle(color: AppTheme.accentBlue)),
        ),
        FilledButton(
          style: FilledButton.styleFrom(
            backgroundColor: AppTheme.success,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
          ),
          onPressed: () async {
            Navigator.pop(context);
            await onConfirm('user_confirmed');
          },
          child: const Text('Yes, I posted'),
        ),
      ],
    );
  }
}
