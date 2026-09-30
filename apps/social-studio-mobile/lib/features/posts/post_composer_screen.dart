import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:image_picker/image_picker.dart';

import '../../core/providers.dart';
import '../../core/theme/app_theme.dart';
import '../../core/util/json.dart';
import '../../core/widgets/common.dart';
import '../../data/models/platform.dart';
import '../../data/models/project.dart';
import '../../data/models/social_post.dart';
import '../projects/project_provider.dart';
import 'platform_post_preview.dart';
import 'post_providers.dart';

/// Create or edit a post with a clean 2-Step Composer:
/// Step 1: Content, Media & Platform Channel Customization
/// Step 2: Scheduling, Visibility & 180 Auto DM / Comment Funnel
class PostComposerScreen extends ConsumerWidget {
  const PostComposerScreen({
    super.key,
    this.postId,
    this.projectId,
    this.date,
    this.calendarId,
    this.pieceId,
    this.prefill,
  });

  final String? postId;
  final String? projectId;
  final DateTime? date;
  final String? calendarId;
  final String? pieceId;

  /// Initial caption/title/hook, e.g. from a calendar piece, video studio export, or content idea.
  final Json? prefill;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    if (postId != null) {
      final post = ref.watch(postDetailProvider(postId!));
      return Scaffold(
        appBar: AppBar(title: const Text('Edit post')),
        body: AsyncBody<SocialPost>(
          value: post,
          onRetry: () => ref.invalidate(postDetailProvider(postId!)),
          builder: (p) => _ProjectLoader(
            projectId: p.projectId,
            builder: (project) => _ComposerForm(project: project, existing: p),
          ),
        ),
      );
    }
    return Scaffold(
      appBar: AppBar(title: const Text('New post')),
      body: _ProjectLoader(
        projectId: projectId ?? ref.watch(activeProjectProvider).valueOrNull?.id,
        builder: (project) => _ComposerForm(
          project: project,
          date: date,
          calendarId: calendarId,
          pieceId: pieceId,
          prefill: prefill ?? {},
        ),
      ),
    );
  }
}

class _ProjectLoader extends ConsumerWidget {
  const _ProjectLoader({required this.projectId, required this.builder});
  final String? projectId;
  final Widget Function(Project? project) builder;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final id = projectId;
    if (id == null) return builder(null);
    return AsyncBody<ProjectDetail>(
      value: ref.watch(projectDetailProvider(id)),
      onRetry: () => ref.invalidate(projectDetailProvider(id)),
      builder: (d) => builder(d.project),
    );
  }
}

class _ComposerForm extends ConsumerStatefulWidget {
  const _ComposerForm({
    required this.project,
    this.existing,
    this.date,
    this.calendarId,
    this.pieceId,
    this.prefill = const {},
  });

  final Project? project;
  final SocialPost? existing;
  final DateTime? date;
  final String? calendarId;
  final String? pieceId;
  final Json prefill;

  @override
  ConsumerState<_ComposerForm> createState() => _ComposerFormState();
}

class _ComposerFormState extends ConsumerState<_ComposerForm> {
  late final SocialPost? _p = widget.existing;

  // Step indicator: 0 = Content & Channels, 1 = Schedule & Automation
  int _currentStep = 0;

  late final _title = TextEditingController(text: _p?.title ?? jStr(widget.prefill['title']) ?? '');
  late final _content = TextEditingController(text: _p?.content ?? jStr(widget.prefill['content']) ?? '');
  late final _hook = TextEditingController(text: _p?.hook ?? jStr(widget.prefill['hook']) ?? '');
  late final _firstComment = TextEditingController(text: _p?.firstComment ?? '');
  late String _mediaType = _p?.mediaType ?? jStr(widget.prefill['mediaType']) ?? 'video';
  late DateTime? _scheduledFor = _p?.scheduledFor ?? widget.date;
  late bool _evergreen = _p?.isEvergreen ?? false;
  late String _visibility = _p?.metadata['visibility']?.toString() ?? 'public';

  late final Set<SocialPlatform> _platforms = {
    ...?_p?.platforms,
    ...jStrList(widget.prefill['platforms']).map(SocialPlatform.parse).where((p) => p != SocialPlatform.unknown),
  };

  late final Map<SocialPlatform, TextEditingController> _variantText = {
    for (final v in _p?.variants ?? const <PostVariant>[]) v.platform: TextEditingController(text: v.customContent ?? ''),
  };

  late final Map<SocialPlatform, TextEditingController> _variantTitle = {
    for (final v in _p?.variants ?? const <PostVariant>[])
      if (v.platformMeta['title'] != null) v.platform: TextEditingController(text: v.platformMeta['title'].toString()),
  };

  late final List<String> _mediaUrls = [...?_p?.mediaUrls, ...jStrList(widget.prefill['mediaUrls'])];
  bool _saving = false;
  double? _uploadProgress;

  // 180 Engagement Automation (Auto DM & Comment Funnel)
  bool _enableEngagement = false;
  late final _engagementKeyword = TextEditingController(text: 'GROWTH');
  late final _engagementCommentReply = TextEditingController(text: 'Check your DMs! Sent you the full link 🚀');
  late final _engagementDmTemplate = TextEditingController(text: 'Hey {name}! Here is your requested link: {link} 🔥');
  bool _engagementAutoLike = true;

  late final _redditTitle = TextEditingController(
      text: _p?.variants.where((v) => v.platform == SocialPlatform.reddit).firstOrNull?.platformMeta['title']?.toString() ?? '');
  late final _redditSubreddit = TextEditingController(
      text: _p?.variants.where((v) => v.platform == SocialPlatform.reddit).firstOrNull?.platformMeta['subreddit']?.toString() ??
          'socialmedia');

  @override
  void initState() {
    super.initState();
  }

  @override
  void dispose() {
    for (final c in [
      _title,
      _content,
      _hook,
      _firstComment,
      _engagementKeyword,
      _engagementCommentReply,
      _engagementDmTemplate,
      _redditTitle,
      _redditSubreddit,
      ..._variantText.values,
      ..._variantTitle.values,
    ]) {
      c.dispose();
    }
    super.dispose();
  }

  Future<void> _pickSchedule() async {
    final now = DateTime.now();
    final initial = _scheduledFor ?? now.add(const Duration(days: 1));
    final d = await showDatePicker(
      context: context,
      initialDate: initial,
      firstDate: now.subtract(const Duration(days: 1)),
      lastDate: now.add(const Duration(days: 730)),
    );
    if (d == null || !mounted) return;
    final t = await showTimePicker(context: context, initialTime: TimeOfDay.fromDateTime(initial));
    if (t == null || !mounted) return;
    setState(() => _scheduledFor = DateTime(d.year, d.month, d.day, t.hour, t.minute));
  }

  Future<void> _addMedia() async {
    final picker = ImagePicker();
    if (_mediaType == 'carousel') {
      final List<XFile> files = await picker.pickMultiImage();
      if (files.isEmpty || !mounted) return;
      for (final f in files) {
        if (!mounted) return;
        setState(() => _uploadProgress = 0);
        final bytes = await f.readAsBytes();
        if (!mounted) return;
        final url = await guarded(
          context,
          () => ref.read(socialApiProvider).uploadFile(
            f.path,
            fileBytes: bytes,
            filename: f.name,
            onProgress: (s, t) {
              if (mounted && t > 0) setState(() => _uploadProgress = s / t);
            },
          ),
        );
        if (url != null && mounted) {
          setState(() => _mediaUrls.add(url));
        }
      }
      if (mounted) setState(() => _uploadProgress = null);
      return;
    }

    final XFile? file = _mediaType == 'video'
        ? await picker.pickVideo(source: ImageSource.gallery)
        : await picker.pickImage(source: ImageSource.gallery);
    if (file == null || !mounted) return;
    setState(() => _uploadProgress = 0);
    final bytes = await file.readAsBytes();
    if (!mounted) return;
    final url = await guarded(
      context,
      () => ref.read(socialApiProvider).uploadFile(
        file.path,
        fileBytes: bytes,
        filename: file.name,
        onProgress: (s, t) {
          if (mounted && t > 0) setState(() => _uploadProgress = s / t);
        },
      ),
    );
    if (!mounted) return;
    setState(() {
      _uploadProgress = null;
      if (url != null) _mediaUrls.add(url);
    });
  }

  List<String> _restrictedHits(List<String> forbidden) {
    final text = '${_title.text} ${_content.text} ${_hook.text}'.toLowerCase();
    return forbidden.where((w) => w.trim().isNotEmpty && text.contains(w.toLowerCase())).toList();
  }

  void _openPlatformCustomization(SocialPlatform platform) {
    final captionCtrl = _variantText.putIfAbsent(platform, TextEditingController.new);
    if (captionCtrl.text.isEmpty && _content.text.trim().isNotEmpty) {
      captionCtrl.text = _content.text.trim();
    }
    final titleCtrl = _variantTitle.putIfAbsent(platform, TextEditingController.new);
    if (titleCtrl.text.isEmpty && _title.text.trim().isNotEmpty) {
      titleCtrl.text = _title.text.trim();
    }

    showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: AppTheme.surfaceElevated,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) => _PlatformCustomizationSheet(
        platform: platform,
        globalTitle: _title.text.trim(),
        globalCaption: _content.text.trim(),
        customCaptionController: captionCtrl,
        customTitleController: titleCtrl,
        redditSubredditController: platform == SocialPlatform.reddit ? _redditSubreddit : null,
        onSaved: () {
          setState(() => _platforms.add(platform));
          Navigator.pop(ctx);
        },
        onRemoved: () {
          setState(() => _platforms.remove(platform));
          Navigator.pop(ctx);
        },
      ),
    );
  }

  void _showPreview() {
    showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: AppTheme.surface,
      builder: (ctx) => DraggableScrollableSheet(
        expand: false,
        initialChildSize: 0.88,
        maxChildSize: 0.95,
        builder: (_, scroll) => SingleChildScrollView(
          controller: scroll,
          padding: const EdgeInsets.only(bottom: 32),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Padding(
                padding: const EdgeInsets.fromLTRB(16, 16, 8, 8),
                child: Row(
                  children: [
                    Icon(Icons.devices_rounded, color: AppTheme.primary),
                    const SizedBox(width: 8),
                    const Expanded(
                      child: Text('Live Cross-Platform Preview', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                    ),
                    IconButton(icon: const Icon(Icons.close_rounded), onPressed: () => Navigator.pop(ctx)),
                  ],
                ),
              ),
              PlatformPostPreview(
                caption: _content.text,
                title: _title.text.isNotEmpty ? _title.text : null,
                mediaUrls: _mediaUrls,
                mediaType: _mediaType,
                selectedPlatform: _platforms.isNotEmpty ? _platforms.first : SocialPlatform.instagram,
                accountName: widget.project?.name ?? '180creator',
              ),
            ],
          ),
        ),
      ),
    );
  }

  Future<void> _save() async {
    if (_content.text.trim().isEmpty) {
      showError(context, 'The caption cannot be empty.');
      return;
    }
    if (_platforms.isEmpty) {
      showError(context, 'Please select at least one social channel to publish to.');
      return;
    }

    setState(() => _saving = true);
    final project = widget.project;
    final metadata = compact({
      ...?_p?.metadata,
      'hook': _hook.text.trim().isEmpty ? null : _hook.text.trim(),
      'visibility': _visibility,
      'firstComment': _firstComment.text.trim().isEmpty ? null : _firstComment.text.trim(),
    });

    final body = compact({
      'title': _title.text.trim().isEmpty ? null : _title.text.trim(),
      'content': _content.text.trim(),
      'mediaType': _mediaType,
      'mediaUrls': _mediaUrls,
      'scheduledFor': isoOrNull(_scheduledFor),
      'isEvergreen': _evergreen,
      'metadata': metadata,
      'variants': [
        for (final p in _platforms)
          PostVariant(
            platform: p,
            customContent: (_variantText[p]?.text.trim() == _content.text.trim())
                ? ''
                : (_variantText[p]?.text.trim() ?? ''),
            firstComment: metadata['firstComment'] as String?,
            platformMeta: p == SocialPlatform.reddit
                ? compact({
                    'publishingMode': 'user_assisted',
                    'subreddit': _redditSubreddit.text.trim().replaceFirst(RegExp(r'^/?r/'), ''),
                    'title': _variantTitle[p]?.text.trim().isNotEmpty ?? false
                        ? _variantTitle[p]!.text.trim()
                        : (_title.text.trim().isNotEmpty ? _title.text.trim() : null),
                  })
                : p == SocialPlatform.youtube
                    ? compact({
                        'title': _variantTitle[p]?.text.trim().isNotEmpty ?? false
                            ? _variantTitle[p]!.text.trim()
                            : (_title.text.trim().isNotEmpty ? _title.text.trim() : null),
                        'visibility': _visibility,
                      })
                    : p == SocialPlatform.x
                        ? {'publishingMode': 'user_assisted'}
                        : {},
          ).toCreateJson(),
      ],
      if (_p == null) ...{
        'projectId': project?.id,
        'clientId': project?.primaryClientId,
        'calendarId': widget.calendarId,
        'calendarPieceId': widget.pieceId,
      },
    });

    final api = ref.read(socialApiProvider);
    final outcome = await guarded(context, () => _p == null ? api.createPost(body) : api.updatePost(_p.id, body));
    if (!mounted) return;
    setState(() => _saving = false);
    if (outcome == null) return;
    showMutation(context, outcome, _p == null ? 'Post created' : 'Post saved');
    if (project != null) ref.refreshProjectData(project.id);
    if (_p != null) {
      ref.refreshPost(_p.id, projectId: project?.id);
      context.pop();
      return;
    }

    final created = jMapOrNull(outcome.data?['post']);
    final id = _p?.id ?? (created == null ? null : jStr(created['id']));

    // Save Auto-DM & Comment Funnel Rule if enabled
    if (_enableEngagement && id != null) {
      final titleStr = _title.text.trim();
      final contentStr = _content.text.trim();
      final postLabel = titleStr.isNotEmpty ? titleStr : (contentStr.length > 20 ? contentStr.substring(0, 20) : contentStr);
      try {
        await api.createEngagementRule({
          'name': 'Auto-DM: $postLabel',
          'projectId': project?.id,
          'postId': id,
          'triggerType': 'comment_keyword',
          'triggerKeywords': _engagementKeyword.text.trim().isNotEmpty ? [_engagementKeyword.text.trim()] : [],
          'matchMode': 'contains',
          'actionAutoLike': _engagementAutoLike,
          'actionSendDm': true,
          'actionDmTemplate': _engagementDmTemplate.text.trim(),
          'actionReplyComment': _engagementCommentReply.text.trim().isNotEmpty,
          'actionCommentReplyTemplate': _engagementCommentReply.text.trim(),
        });
      } catch (_) {}
    }

    ref.invalidate(projectPostsProvider);
    if (!mounted) return;
    if (id != null && _p == null) {
      context.pushReplacement('/posts/$id');
    } else {
      context.pop();
    }
  }

  @override
  Widget build(BuildContext context) {
    final project = widget.project;
    final accounts = project?.socialAccounts ?? [];
    final voice = project == null ? null : ref.watch(brandVoiceProvider(project.id)).valueOrNull;
    final hits = _restrictedHits(voice?.forbiddenWords ?? []);

    return Column(
      children: [
        // ── 2-Step Progress Stepper Header ──
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
          decoration: BoxDecoration(
            color: Theme.of(context).cardColor,
            border: Border(bottom: BorderSide(color: Theme.of(context).dividerColor)),
          ),
          child: Row(
            children: [
              Expanded(
                child: _StepTab(
                  stepIndex: 0,
                  title: '1. Content',
                  isActive: _currentStep == 0,
                  isDone: _currentStep > 0,
                  onTap: () => setState(() => _currentStep = 0),
                ),
              ),
              const SizedBox(width: 8),
              const Icon(Icons.chevron_right_rounded, size: 16, color: Colors.white38),
              const SizedBox(width: 8),
              Expanded(
                child: _StepTab(
                  stepIndex: 1,
                  title: '2. Schedule & Funnel',
                  isActive: _currentStep == 1,
                  isDone: false,
                  onTap: () {
                    if (_content.text.trim().isEmpty) {
                      showError(context, 'Please enter a caption first');
                      return;
                    }
                    setState(() => _currentStep = 1);
                  },
                ),
              ),
            ],
          ),
        ),

        // ── Step Content ──
        Expanded(
          child: ListView(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 120),
            children: [
              if (project != null)
                Padding(
                  padding: const EdgeInsets.only(bottom: 12),
                  child: Row(
                    children: [
                      Icon(Icons.folder_rounded, size: 16, color: AppTheme.textSecondary),
                      const SizedBox(width: 6),
                      Text(
                        'Project: ',
                        style: TextStyle(fontSize: 12, fontWeight: FontWeight.w500, color: AppTheme.textSecondary),
                      ),
                      Expanded(
                        child: Text(
                          project.name,
                          overflow: TextOverflow.ellipsis,
                          style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: AppTheme.textSecondary),
                        ),
                      ),
                    ],
                  ),
                ),

              // ════════════════════════════════════════════
              // STEP 1: CONTENT, MEDIA & CHANNEL ASSIGNMENT
              // ════════════════════════════════════════════
              if (_currentStep == 0) ...[
                // Media Type Selector
                SegmentedButton<String>(
                  segments: const [
                    ButtonSegment(value: 'video', label: Text('Video'), icon: Icon(Icons.videocam_rounded)),
                    ButtonSegment(value: 'image', label: Text('Image'), icon: Icon(Icons.image_rounded)),
                    ButtonSegment(value: 'carousel', label: Text('Carousel'), icon: Icon(Icons.view_carousel_rounded)),
                  ],
                  selected: {_mediaType},
                  onSelectionChanged: (s) => setState(() => _mediaType = s.first),
                ),
                const SizedBox(height: 16),

                // Post Title (Universal)
                TextField(
                  controller: _title,
                  decoration: fieldDecoration(
                    'Title (internal & video title)',
                    hint: 'e.g. 5 AI Video Tricks That Tripled My Engagement',
                  ),
                ),
                const SizedBox(height: 12),

                // Main Caption (Universal)
                TextField(
                  controller: _content,
                  minLines: 5,
                  maxLines: 12,
                  onChanged: (_) => setState(() {}),
                  decoration: fieldDecoration(
                    'Caption *',
                    hint: 'Write your post caption or video description...',
                    helper: '${_content.text.characters.length} characters',
                  ),
                ),

                if (hits.isNotEmpty) ...[
                  const SizedBox(height: 8),
                  StatusChip(
                    label: 'Restricted brand words: ${hits.join(', ')}',
                    color: AppTheme.error,
                    icon: Icons.block_rounded,
                  ),
                ],

                if (voice != null && voice.defaultHashtags.isNotEmpty) ...[
                  const SizedBox(height: 8),
                  Wrap(
                    spacing: 6,
                    runSpacing: 6,
                    children: [
                      for (final h in voice.defaultHashtags)
                        ActionChip(
                          label: Text(h, style: const TextStyle(fontSize: 12)),
                          onPressed: () => setState(() => _content.text = '${_content.text.trimRight()} $h'),
                        ),
                    ],
                  ),
                ],

                const SizedBox(height: 16),

                // Media Attachment
                SectionHeader(
                  'Media Files',
                  trailing: TextButton.icon(
                    onPressed: _uploadProgress != null ? null : _addMedia,
                    icon: const Icon(Icons.add_photo_alternate_rounded, size: 16),
                    label: Text(_mediaType == 'video'
                        ? 'Add Video'
                        : _mediaType == 'carousel'
                            ? 'Add Images'
                            : 'Add Image'),
                  ),
                ),
                for (final url in _mediaUrls)
                  ListTile(
                    contentPadding: EdgeInsets.zero,
                    leading: Container(
                      width: 40,
                      height: 40,
                      decoration: BoxDecoration(
                        color: AppTheme.surfaceElevated,
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Icon(_mediaType == 'video' ? Icons.movie_rounded : Icons.image_rounded, color: AppTheme.primary),
                    ),
                    title: Text(
                      Uri.tryParse(url)?.pathSegments.lastOrNull ?? url,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(fontSize: 13),
                    ),
                    trailing: IconButton(
                      icon: const Icon(Icons.close_rounded, size: 18),
                      onPressed: () => setState(() => _mediaUrls.remove(url)),
                    ),
                  ),
                if (_uploadProgress != null)
                  Padding(
                    padding: const EdgeInsets.symmetric(vertical: 8),
                    child: LinearProgressIndicator(value: _uploadProgress),
                  ),

                const SizedBox(height: 16),

                // Channels & Customization Tiles
                Row(
                  children: [
                    const Expanded(
                      child: SectionHeader('Target Channels'),
                    ),
                    TextButton.icon(
                      onPressed: _showPreview,
                      icon: const Icon(Icons.remove_red_eye_rounded, size: 16),
                      label: const Text('Live Preview'),
                    ),
                  ],
                ),
                const SizedBox(height: 4),
                Text(
                  'Select platforms to post to. Tap a channel to customize platform-specific title, description, or first comments.',
                  style: TextStyle(fontSize: 12, color: AppTheme.textSecondary),
                ),
                const SizedBox(height: 12),

                // Channels Grid
                Wrap(
                  spacing: 10,
                  runSpacing: 10,
                  children: [
                    for (final p in SocialPlatform.connectable)
                      _ChannelTile(
                        platform: p,
                        isSelected: _platforms.contains(p),
                        account: accounts.where((a) => a.platform == p).firstOrNull,
                        hasCustomOverride: (_variantText[p]?.text.trim().isNotEmpty == true &&
                                _variantText[p]?.text.trim() != _content.text.trim()) ||
                            (_variantTitle[p]?.text.trim().isNotEmpty == true &&
                                _variantTitle[p]?.text.trim() != _title.text.trim()),
                        onToggle: () {
                          setState(() => _platforms.add(p));
                          _openPlatformCustomization(p);
                        },
                        onCustomize: () => _openPlatformCustomization(p),
                      ),
                  ],
                ),

                const SizedBox(height: 32),

                // Step 1 Actions
                Row(
                  children: [
                    Expanded(
                      child: OutlinedButton.icon(
                        onPressed: () {
                          if (_content.text.trim().isEmpty) {
                            showError(context, 'The caption cannot be empty.');
                            return;
                          }
                          if (_platforms.isEmpty) {
                            showError(context, 'Select at least one social channel.');
                            return;
                          }
                          setState(() => _currentStep = 1);
                        },
                        icon: const Icon(Icons.tune_rounded, size: 16),
                        label: const Text('Schedule / Funnel'),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      flex: 2,
                      child: ElevatedButton.icon(
                        style: ElevatedButton.styleFrom(
                          backgroundColor: AppTheme.primary,
                          foregroundColor: Colors.white,
                          padding: const EdgeInsets.symmetric(vertical: 14),
                        ),
                        onPressed: _saving ? null : _save,
                        icon: _saving
                            ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                            : const Icon(Icons.send_rounded, size: 18),
                        label: Text(_p != null ? 'Save post' : 'Create post'),
                      ),
                    ),
                  ],
                ),
              ],

              // ════════════════════════════════════════════
              // STEP 2: SCHEDULE, VISIBILITY & AUTO-DM FUNNEL
              // ════════════════════════════════════════════
              if (_currentStep == 1) ...[
                // Schedule Mode
                SectionHeader('Publishing Schedule'),
                const SizedBox(height: 8),
                SectionCard(
                  onTap: _pickSchedule,
                  child: Row(
                    children: [
                      Icon(Icons.event_rounded, color: AppTheme.primary),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              _scheduledFor == null ? 'Publish Instantly' : 'Scheduled for',
                              style: TextStyle(fontSize: 12, color: AppTheme.textSecondary),
                            ),
                            const SizedBox(height: 2),
                            Text(
                              _scheduledFor == null ? 'Post now upon creating' : fmtDateTime(_scheduledFor),
                              style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14),
                            ),
                          ],
                        ),
                      ),
                      if (_scheduledFor != null)
                        IconButton(
                          tooltip: 'Clear schedule and publish instantly',
                          icon: const Icon(Icons.clear_rounded),
                          onPressed: () => setState(() => _scheduledFor = null),
                        )
                      else
                        OutlinedButton.icon(
                          onPressed: _pickSchedule,
                          icon: const Icon(Icons.calendar_month_rounded, size: 16),
                          label: const Text('Schedule'),
                        ),
                    ],
                  ),
                ),
                if (project != null)
                  Padding(
                    padding: const EdgeInsets.only(top: 6),
                    child: Text(
                      'Timezone: ${project.settings.defaultTimezone}. Posts are scheduled automatically in the background.',
                      style: Theme.of(context).textTheme.labelSmall,
                    ),
                  ),

                const SizedBox(height: 16),

                // Post Visibility (YouTube / Video platforms)
                SectionHeader('Visibility & Privacy'),
                const SizedBox(height: 8),
                SegmentedButton<String>(
                  segments: const [
                    ButtonSegment(value: 'public', label: Text('Public'), icon: Icon(Icons.public_rounded)),
                    ButtonSegment(value: 'unlisted', label: Text('Unlisted'), icon: Icon(Icons.lock_clock_rounded)),
                    ButtonSegment(value: 'private', label: Text('Private'), icon: Icon(Icons.lock_outline_rounded)),
                  ],
                  selected: {_visibility},
                  onSelectionChanged: (s) => setState(() => _visibility = s.first),
                ),

                const SizedBox(height: 12),
                SwitchListTile(
                  contentPadding: EdgeInsets.zero,
                  value: _evergreen,
                  onChanged: (v) => setState(() => _evergreen = v),
                  title: const Text('Evergreen Re-post Queue'),
                  subtitle: const Text('Allow AI Smart Scheduler to re-post this content periodically'),
                ),

                const SizedBox(height: 20),

                // 180 Engagement Automation (Auto DM & Comment Funnel)
                SectionHeader('180 Auto DM & Comment Funnel'),
                const SizedBox(height: 4),
                Text(
                  'Automatically send direct messages (DMs) with resource links and reply to comments on Instagram & Facebook.',
                  style: TextStyle(fontSize: 12, color: AppTheme.textSecondary),
                ),
                const SizedBox(height: 10),

                SectionCard(
                  padding: const EdgeInsets.all(14),
                  borderColor: _enableEngagement ? AppTheme.primary.withValues(alpha: 0.5) : AppTheme.borderSubtle,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      SwitchListTile(
                        contentPadding: EdgeInsets.zero,
                        value: _enableEngagement,
                        onChanged: (v) => setState(() => _enableEngagement = v),
                        title: const Text('Enable Auto-DM & Comment Funnel', style: TextStyle(fontWeight: FontWeight.bold)),
                        subtitle: const Text('Convert viral comments into qualified leads & delivery in DMs'),
                      ),
                      if (_enableEngagement) ...[
                        const Divider(height: 20),

                        // Trigger Keyword
                        TextField(
                          controller: _engagementKeyword,
                          decoration: fieldDecoration(
                            'Trigger Keyword (optional)',
                            hint: 'e.g. GROWTH, GUIDE, SEND (leave empty to reply to every comment)',
                          ),
                        ),
                        const SizedBox(height: 12),

                        // Public Comment Reply
                        TextField(
                          controller: _engagementCommentReply,
                          decoration: fieldDecoration(
                            'Public Comment Reply',
                            hint: 'e.g. Check your DMs! Sent you the full access link 🚀',
                          ),
                        ),
                        const SizedBox(height: 12),

                        // Direct Message (DM)
                        TextField(
                          controller: _engagementDmTemplate,
                          minLines: 2,
                          maxLines: 4,
                          decoration: fieldDecoration(
                            'Direct Message (DM) Template',
                            hint: 'Hey {name}! Here is your download link: https://180workspace.com/resource 🚀',
                          ),
                        ),
                        const SizedBox(height: 8),

                        // Auto-like comment
                        SwitchListTile(
                          contentPadding: EdgeInsets.zero,
                          value: _engagementAutoLike,
                          onChanged: (v) => setState(() => _engagementAutoLike = v),
                          title: const Text('Auto-like matching comment', style: TextStyle(fontSize: 13)),
                          subtitle: const Text('Gives an instant like before sending the reply', style: TextStyle(fontSize: 11)),
                        ),
                      ],
                    ],
                  ),
                ),

                const SizedBox(height: 32),

                // Step 2 Submission Actions
                Row(
                  children: [
                    OutlinedButton.icon(
                      onPressed: () => setState(() => _currentStep = 0),
                      icon: const Icon(Icons.arrow_back_rounded, size: 16),
                      label: const Text('Back to Content'),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: ElevatedButton.icon(
                        style: ElevatedButton.styleFrom(
                          backgroundColor: AppTheme.primary,
                          foregroundColor: Colors.white,
                          padding: const EdgeInsets.symmetric(vertical: 14),
                        ),
                        onPressed: _saving ? null : _save,
                        icon: _saving
                            ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                            : const Icon(Icons.send_rounded, size: 18),
                        label: Text(_p != null
                            ? 'Save Changes'
                            : _scheduledFor != null
                                ? 'Schedule Post'
                                : 'Create post'),
                      ),
                    ),
                  ],
                ),
              ],
            ],
          ),
        ),
      ],
    );
  }
}

// ───────────────────────────────────────────
// Step Indicator Tab
// ───────────────────────────────────────────
class _StepTab extends StatelessWidget {
  const _StepTab({
    required this.stepIndex,
    required this.title,
    required this.isActive,
    required this.isDone,
    required this.onTap,
  });

  final int stepIndex;
  final String title;
  final bool isActive;
  final bool isDone;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(8),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
        decoration: BoxDecoration(
          color: isActive ? AppTheme.primary.withValues(alpha: 0.18) : Colors.transparent,
          borderRadius: BorderRadius.circular(8),
          border: Border.all(
            color: isActive ? AppTheme.primary : (isDone ? AppTheme.success : Colors.transparent),
          ),
        ),
        child: Row(
          children: [
            if (isDone)
              Icon(Icons.check_circle_rounded, size: 14, color: AppTheme.success)
            else
              Container(
                width: 16,
                height: 16,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: isActive ? AppTheme.primary : Colors.white24,
                ),
                child: Center(
                  child: Text(
                    '${stepIndex + 1}',
                    style: const TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Colors.white),
                  ),
                ),
              ),
            const SizedBox(width: 6),
            Expanded(
              child: Text(
                title,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: TextStyle(
                  fontSize: 11,
                  fontWeight: isActive ? FontWeight.bold : FontWeight.w500,
                  color: isActive ? Colors.white : AppTheme.textSecondary,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// ───────────────────────────────────────────
// Channel Selection & Customization Tile
// ───────────────────────────────────────────
class _ChannelTile extends StatelessWidget {
  const _ChannelTile({
    required this.platform,
    required this.isSelected,
    this.account,
    required this.hasCustomOverride,
    required this.onToggle,
    required this.onCustomize,
  });

  final SocialPlatform platform;
  final bool isSelected;
  final dynamic account;
  final bool hasCustomOverride;
  final VoidCallback onToggle;
  final VoidCallback onCustomize;

  @override
  Widget build(BuildContext context) {
    return FilterChip(
      avatar: Icon(platform.icon, size: 16, color: isSelected ? Colors.white : platform.color),
      label: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(platform.label),
          if (hasCustomOverride) ...[
            const SizedBox(width: 4),
            Container(
              width: 6,
              height: 6,
              decoration: const BoxDecoration(color: Color(0xFF10B981), shape: BoxShape.circle),
            ),
          ],
          if (isSelected) ...[
            const SizedBox(width: 6),
            InkWell(
              onTap: onCustomize,
              child: const Icon(Icons.tune_rounded, size: 14, color: Colors.white70),
            ),
          ],
        ],
      ),
      selected: isSelected,
      selectedColor: platform.color,
      onSelected: (_) => onToggle(),
    );
  }
}

// ───────────────────────────────────────────
// Platform Customization Bottom Sheet & Specifications
// ───────────────────────────────────────────
class _PlatformSpec {
  const _PlatformSpec({
    required this.name,
    required this.mediaTypes,
    required this.aspectRatios,
    required this.maxChars,
    this.maxTitleChars,
    required this.features,
    required this.guidelines,
  });

  final String name;
  final String mediaTypes;
  final String aspectRatios;
  final int maxChars;
  final int? maxTitleChars;
  final List<String> features;
  final String guidelines;

  static _PlatformSpec forPlatform(SocialPlatform platform) {
    switch (platform) {
      case SocialPlatform.instagram:
        return const _PlatformSpec(
          name: 'Instagram',
          mediaTypes: 'Reels (Video), Feed (Image/Carousel)',
          aspectRatios: '9:16 (Reels/Stories), 1:1 or 4:5 (Feed)',
          maxChars: 2200,
          features: ['Up to 30 hashtags', '@mentions', 'First comment auto-delivery'],
          guidelines: 'Visuals are paramount. Use engaging hooks in the first line and put hashtags in the caption or first comment.',
        );
      case SocialPlatform.youtube:
        return const _PlatformSpec(
          name: 'YouTube',
          mediaTypes: 'Video (MP4 / MOV / WebM)',
          aspectRatios: '16:9 (Landscape) or 9:16 (Shorts under 60s)',
          maxChars: 5000,
          maxTitleChars: 100,
          features: ['Title (max 100 chars)', 'Description chapters & timestamps', 'Privacy control'],
          guidelines: 'Title is crucial for search & algorithm CTR. Include keywords, links, and hashtags in the description.',
        );
      case SocialPlatform.facebook:
        return const _PlatformSpec(
          name: 'Facebook',
          mediaTypes: 'Video, Image, or Status Post',
          aspectRatios: '16:9, 1:1, or 9:16 (Reels)',
          maxChars: 63206,
          maxTitleChars: 255,
          features: ['Page / Group targeting', 'Video title', 'Link previews'],
          guidelines: 'Great for community discussions. Videos between 1-3 minutes perform exceptionally well.',
        );
      case SocialPlatform.linkedin:
        return const _PlatformSpec(
          name: 'LinkedIn',
          mediaTypes: 'Post text, Image, Video, or PDF Document',
          aspectRatios: '1:1, 16:9, or 4:5',
          maxChars: 3000,
          maxTitleChars: 200,
          features: ['Professional headlines', 'Rich text formatting', '3-5 relevant hashtags'],
          guidelines: 'Focus on professional insights, career learnings, and business value. Spaced-out paragraphs improve read-through.',
        );
      case SocialPlatform.x:
        return const _PlatformSpec(
          name: 'X (Twitter)',
          mediaTypes: 'Up to 4 images, 1 video, or text-only',
          aspectRatios: '16:9 or 1:1',
          maxChars: 280,
          features: ['Concise 280 chars', 'Trending hashtags', 'Thread-ready'],
          guidelines: 'Keep copy punchy and fast-paced. Media attachments stand out in dense feeds.',
        );
      case SocialPlatform.threads:
        return const _PlatformSpec(
          name: 'Threads',
          mediaTypes: 'Up to 10 photos, video (up to 5m), or text',
          aspectRatios: '9:16, 1:1, or 4:5',
          maxChars: 500,
          features: ['500 character limit', 'Conversational tone', 'Instagram identity sync'],
          guidelines: 'Prioritize conversational prompts and community engagement.',
        );
      case SocialPlatform.tiktok:
        return const _PlatformSpec(
          name: 'TikTok',
          mediaTypes: 'Vertical Video (9:16) required',
          aspectRatios: '9:16 Fullscreen vertical',
          maxChars: 2200,
          features: ['Vertical video', 'Trending sound pairing', 'Search SEO keywords'],
          guidelines: 'High-energy hook in the first 2 seconds. Add relevant search keywords in your caption.',
        );
      case SocialPlatform.reddit:
        return const _PlatformSpec(
          name: 'Reddit',
          mediaTypes: 'Text, Link, Image, or Video',
          aspectRatios: 'Any',
          maxChars: 40000,
          maxTitleChars: 300,
          features: ['Subreddit targeting (Required)', 'Markdown formatting', 'Community discussion'],
          guidelines: 'Avoid overly promotional language. Follow subreddit rules and deliver genuine community value.',
        );
      case SocialPlatform.pinterest:
        return const _PlatformSpec(
          name: 'Pinterest',
          mediaTypes: 'Vertical Image or Video Pin',
          aspectRatios: '2:3 recommended (1000 x 1500 px)',
          maxChars: 500,
          maxTitleChars: 100,
          features: ['Pin title', 'Search keywords', 'Destination link'],
          guidelines: 'High-quality vertical imagery with clear text overlays and actionable tips drives saves.',
        );
      default:
        return _PlatformSpec(
          name: platform.label,
          mediaTypes: 'Image, Video, or Text',
          aspectRatios: 'Standard',
          maxChars: 2200,
          features: const ['Cross-platform publishing'],
          guidelines: 'Customize your title and caption for this channel.',
        );
    }
  }
}

class _PlatformCustomizationSheet extends StatefulWidget {
  const _PlatformCustomizationSheet({
    required this.platform,
    required this.globalTitle,
    required this.globalCaption,
    required this.customCaptionController,
    required this.customTitleController,
    this.redditSubredditController,
    required this.onSaved,
    required this.onRemoved,
  });

  final SocialPlatform platform;
  final String globalTitle;
  final String globalCaption;
  final TextEditingController customCaptionController;
  final TextEditingController customTitleController;
  final TextEditingController? redditSubredditController;
  final VoidCallback onSaved;
  final VoidCallback onRemoved;

  @override
  State<_PlatformCustomizationSheet> createState() => _PlatformCustomizationSheetState();
}

class _PlatformCustomizationSheetState extends State<_PlatformCustomizationSheet> {
  @override
  void initState() {
    super.initState();
    if (widget.customCaptionController.text.isEmpty && widget.globalCaption.isNotEmpty) {
      widget.customCaptionController.text = widget.globalCaption;
    }
    if (widget.customTitleController.text.isEmpty && widget.globalTitle.isNotEmpty) {
      widget.customTitleController.text = widget.globalTitle;
    }
    widget.customCaptionController.addListener(_onChanged);
    widget.customTitleController.addListener(_onChanged);
    widget.redditSubredditController?.addListener(_onChanged);
  }

  @override
  void dispose() {
    widget.customCaptionController.removeListener(_onChanged);
    widget.customTitleController.removeListener(_onChanged);
    widget.redditSubredditController?.removeListener(_onChanged);
    super.dispose();
  }

  void _onChanged() {
    if (mounted) setState(() {});
  }

  @override
  Widget build(BuildContext context) {
    final platform = widget.platform;
    final spec = _PlatformSpec.forPlatform(platform);
    final hasTitle = spec.maxTitleChars != null ||
        platform == SocialPlatform.youtube ||
        platform == SocialPlatform.facebook ||
        platform == SocialPlatform.linkedin ||
        platform == SocialPlatform.reddit ||
        platform == SocialPlatform.pinterest;
    final isReddit = platform == SocialPlatform.reddit;

    final captionLength = widget.customCaptionController.text.characters.length;
    final isOverLimit = captionLength > spec.maxChars;
    final titleLength = widget.customTitleController.text.characters.length;
    final isTitleOverLimit = spec.maxTitleChars != null && titleLength > spec.maxTitleChars!;

    return DraggableScrollableSheet(
      expand: false,
      initialChildSize: 0.85,
      maxChildSize: 0.95,
      minChildSize: 0.5,
      builder: (ctx, scrollController) => SingleChildScrollView(
        controller: scrollController,
        padding: EdgeInsets.fromLTRB(18, 14, 18, MediaQuery.of(context).viewInsets.bottom + 24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Center(
              child: Container(
                width: 36,
                height: 4,
                margin: const EdgeInsets.only(bottom: 14),
                decoration: BoxDecoration(
                  color: Colors.white24,
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
            ),

            // Sheet Header
            Row(
              children: [
                Container(
                  width: 38,
                  height: 38,
                  decoration: BoxDecoration(
                    color: platform.color.withValues(alpha: 0.18),
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(color: platform.color.withValues(alpha: 0.35)),
                  ),
                  child: Icon(platform.icon, color: platform.color, size: 20),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Customize for ${platform.label}',
                        style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                      ),
                      Text(
                        spec.mediaTypes,
                        style: TextStyle(fontSize: 11, color: AppTheme.textSecondary),
                      ),
                    ],
                  ),
                ),
                IconButton(
                  icon: const Icon(Icons.close_rounded),
                  onPressed: () => Navigator.pop(context),
                ),
              ],
            ),
            const SizedBox(height: 14),

            // Platform Requirements & Specs Card
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: platform.color.withValues(alpha: 0.08),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: platform.color.withValues(alpha: 0.22)),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Icon(Icons.info_outline_rounded, size: 15, color: platform.color),
                      const SizedBox(width: 6),
                      Expanded(
                        child: Text(
                          '${platform.label} Requirements & Specs',
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.w700,
                            color: platform.color,
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Wrap(
                    spacing: 6,
                    runSpacing: 6,
                    children: [
                      _RequirementPill(icon: Icons.aspect_ratio_rounded, text: spec.aspectRatios),
                      _RequirementPill(
                        icon: Icons.text_fields_rounded,
                        text: 'Max ${spec.maxChars.toString().replaceAllMapped(RegExp(r'(\d{1,3})(?=(\d{3})+(?!\d))'), (m) => '${m[1]},')} chars',
                      ),
                      for (final f in spec.features)
                        _RequirementPill(icon: Icons.check_circle_outline_rounded, text: f),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Text(
                    spec.guidelines,
                    style: TextStyle(fontSize: 11, color: AppTheme.textSecondary, height: 1.35),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),

            // Optional Title Override
            if (hasTitle) ...[
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    platform == SocialPlatform.youtube
                        ? 'YouTube Video Title *'
                        : '${platform.label} Title',
                    style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600),
                  ),
                  if (spec.maxTitleChars != null)
                    Text(
                      '$titleLength / ${spec.maxTitleChars}',
                      style: TextStyle(
                        fontSize: 11,
                        color: isTitleOverLimit ? AppTheme.error : AppTheme.textSecondary,
                        fontWeight: isTitleOverLimit ? FontWeight.bold : FontWeight.normal,
                      ),
                    ),
                ],
              ),
              const SizedBox(height: 6),
              TextField(
                controller: widget.customTitleController,
                decoration: fieldDecoration(
                  platform == SocialPlatform.youtube ? 'Video Title' : '${platform.label} Title',
                  hint: widget.globalTitle.isNotEmpty ? widget.globalTitle : 'Enter title for ${platform.label}',
                ),
              ),
              const SizedBox(height: 14),
            ],

            // Reddit Subreddit target
            if (isReddit && widget.redditSubredditController != null) ...[
              const Text(
                'Target Subreddit *',
                style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600),
              ),
              const SizedBox(height: 6),
              TextField(
                controller: widget.redditSubredditController!,
                decoration: fieldDecoration('Subreddit target', hint: 'e.g. socialmedia or technology'),
              ),
              const SizedBox(height: 14),
            ],

            // Caption / Content Field
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  spec.name == 'YouTube' ? 'Video Description' : '${spec.name} Caption',
                  style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600),
                ),
                Text(
                  '$captionLength / ${spec.maxChars}',
                  style: TextStyle(
                    fontSize: 11,
                    color: isOverLimit ? AppTheme.error : AppTheme.textSecondary,
                    fontWeight: isOverLimit ? FontWeight.bold : FontWeight.normal,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 6),
            TextField(
              controller: widget.customCaptionController,
              minLines: 4,
              maxLines: 10,
              decoration: fieldDecoration(
                spec.name == 'YouTube' ? 'YouTube Description' : '${platform.label} Caption',
                hint: widget.globalCaption.isNotEmpty ? widget.globalCaption : 'Enter caption for ${platform.label}',
                helper: isOverLimit
                    ? '⚠️ Warning: Exceeds ${platform.label} character limit!'
                    : (widget.customCaptionController.text.trim() == widget.globalCaption.trim() && widget.globalCaption.isNotEmpty)
                        ? 'Pre-filled with your post description. Edit if you wish to customize.'
                        : null,
              ),
            ),
            const SizedBox(height: 22),

            // Actions
            ElevatedButton.icon(
              style: ElevatedButton.styleFrom(
                backgroundColor: platform.color,
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(vertical: 14),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
              ),
              onPressed: widget.onSaved,
              icon: const Icon(Icons.check_rounded, size: 18),
              label: Text('Save ${platform.label} Settings', style: const TextStyle(fontWeight: FontWeight.bold)),
            ),
            const SizedBox(height: 8),
            OutlinedButton.icon(
              style: OutlinedButton.styleFrom(
                foregroundColor: AppTheme.error,
                side: BorderSide(color: AppTheme.error.withValues(alpha: 0.3)),
                padding: const EdgeInsets.symmetric(vertical: 12),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
              ),
              onPressed: widget.onRemoved,
              icon: const Icon(Icons.delete_outline_rounded, size: 16),
              label: Text('Remove ${platform.label} from this post'),
            ),
          ],
        ),
      ),
    );
  }
}

class _RequirementPill extends StatelessWidget {
  const _RequirementPill({required this.icon, required this.text});
  final IconData icon;
  final String text;

  @override
  Widget build(BuildContext context) {
    return Container(
      constraints: const BoxConstraints(maxWidth: 220),
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.05),
        borderRadius: BorderRadius.circular(6),
        border: Border.all(color: Colors.white12),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 11, color: Colors.white70),
          const SizedBox(width: 4),
          Flexible(
            child: Text(
              text,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(fontSize: 10, color: Colors.white70, fontWeight: FontWeight.w500),
            ),
          ),
        ],
      ),
    );
  }
}
