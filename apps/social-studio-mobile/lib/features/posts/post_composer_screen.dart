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

/// Create or edit a post (web composer). Create: `POST /posts`. Edit: `PUT /posts/:id`.
class PostComposerScreen extends ConsumerWidget {
  const PostComposerScreen({super.key, this.postId, this.projectId, this.date, this.calendarId, this.pieceId, this.prefill});
  final String? postId;
  final String? projectId;
  final DateTime? date;
  final String? calendarId;
  final String? pieceId;

  /// Initial caption/title/hook, e.g. from a calendar piece or content idea.
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
          builder: (p) => _ProjectLoader(projectId: p.projectId, builder: (project) => _ComposerForm(project: project, existing: p)),
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
          prefill: prefill ?? const {},
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
  const _ComposerForm({required this.project, this.existing, this.date, this.calendarId, this.pieceId, this.prefill = const {}});
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
  late final _title = TextEditingController(text: _p?.title ?? jStr(widget.prefill['title']) ?? '');
  late final _content = TextEditingController(text: _p?.content ?? jStr(widget.prefill['content']) ?? '');
  late final _hook = TextEditingController(text: _p?.hook ?? jStr(widget.prefill['hook']) ?? '');
  late final _objective = TextEditingController(text: _p?.objective ?? '');
  late final _firstComment = TextEditingController(text: _p?.firstComment ?? '');
  late String _mediaType = _p?.mediaType ?? jStr(widget.prefill['mediaType']) ?? 'video';
  late DateTime? _scheduledFor = _p?.scheduledFor ?? widget.date;
  late bool _evergreen = _p?.isEvergreen ?? false;
  late String? _accountId = _p?.socialAccountId;
  late final Set<SocialPlatform> _platforms = {
    ...?_p?.platforms,
    ...jStrList(widget.prefill['platforms']).map(SocialPlatform.parse).where((p) => p != SocialPlatform.unknown),
  };
  late final Map<SocialPlatform, TextEditingController> _variantText = {
    for (final v in _p?.variants ?? const <PostVariant>[]) v.platform: TextEditingController(text: v.customContent ?? ''),
  };
  late final List<String> _mediaUrls = [...?_p?.mediaUrls];
  bool _saving = false;
  double? _uploadProgress;

  bool _enableEngagement = false;
  late final _engagementKeyword = TextEditingController(text: 'GROWTH');
  late final _engagementDeliverable = TextEditingController();
  late final _engagementDmTemplate = TextEditingController(text: 'Hey {name}! Here is your link: {link} 🚀');
  bool _engagementAutoLike = true;
  bool _engagementAiAgent = true;

  late final _redditTitle = TextEditingController(text: _p?.variants.where((v) => v.platform == SocialPlatform.reddit).firstOrNull?.platformMeta['title']?.toString() ?? '');
  late final _redditSubreddit = TextEditingController(text: _p?.variants.where((v) => v.platform == SocialPlatform.reddit).firstOrNull?.platformMeta['subreddit']?.toString() ?? 'socialmedia');

  @override
  void dispose() {
    for (final c in [
      _title,
      _content,
      _hook,
      _objective,
      _firstComment,
      _engagementKeyword,
      _engagementDeliverable,
      _engagementDmTemplate,
      _redditTitle,
      _redditSubreddit,
      ..._variantText.values
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
    final XFile? file = _mediaType == 'video'
        ? await picker.pickVideo(source: ImageSource.gallery)
        : await picker.pickImage(source: ImageSource.gallery);
    if (file == null || !mounted) return;
    setState(() => _uploadProgress = 0);
    final url = await guarded(context, () => ref.read(socialApiProvider).uploadFile(file.path, onProgress: (s, t) {
          if (mounted && t > 0) setState(() => _uploadProgress = s / t);
        }));
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

  Future<void> _save() async {
    if (_content.text.trim().isEmpty) {
      showError(context, 'The caption cannot be empty.');
      return;
    }
    setState(() => _saving = true);
    final project = widget.project;
    final metadata = compact({
      ...?_p?.metadata,
      'hook': _hook.text.trim().isEmpty ? null : _hook.text.trim(),
      'objective': _objective.text.trim().isEmpty ? null : _objective.text.trim(),
      'firstComment': _firstComment.text.trim().isEmpty ? null : _firstComment.text.trim(),
    });
    final body = compact({
      'title': _title.text.trim().isEmpty ? null : _title.text.trim(),
      'content': _content.text.trim(),
      'mediaType': _mediaType,
      'mediaUrls': _mediaUrls,
      'scheduledFor': isoOrNull(_scheduledFor),
      'isEvergreen': _evergreen,
      'socialAccountId': _accountId,
      'metadata': metadata,
      'variants': [
        for (final p in _platforms)
          PostVariant(
            platform: p,
            customContent: _variantText[p]?.text.trim() ?? '',
            firstComment: metadata['firstComment'] as String?,
            platformMeta: p == SocialPlatform.reddit
                ? compact({
                    'publishingMode': 'user_assisted',
                    'subreddit': _redditSubreddit.text.trim().replaceFirst(RegExp(r'^/?r/'), ''),
                    'title': _redditTitle.text.trim().isNotEmpty ? _redditTitle.text.trim() : null,
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

    if (_enableEngagement && id != null) {
      final titleStr = _title.text.trim();
      final contentStr = _content.text.trim();
      final postLabel = titleStr.isNotEmpty ? titleStr : (contentStr.length > 20 ? contentStr.substring(0, 20) : contentStr);
      try {
        await api.createEngagementRule({
          'name': 'Auto-DM: $postLabel',
          'projectId': project?.id,
          'postId': id,
          'socialAccountId': _accountId,
          'triggerType': 'comment_keyword',
          'triggerKeywords': [_engagementKeyword.text.trim()],
          'matchMode': 'contains',
          'actionAutoLike': _engagementAutoLike,
          'actionSendDm': true,
          'actionDmTemplate': _engagementDmTemplate.text.trim(),
          'actionDmDeliverableUrl': _engagementDeliverable.text.trim().isEmpty ? null : _engagementDeliverable.text.trim(),
          'actionEnableAiAgent': _engagementAiAgent,
          'aiAgentGoal': 'qualify_lead',
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
    final accounts = project?.socialAccounts ?? const [];
    final voice = project == null ? null : ref.watch(brandVoiceProvider(project.id)).valueOrNull;
    final hits = _restrictedHits(voice?.forbiddenWords ?? const []);
    final scheduleNote = _scheduledFor != null && _p == null
        ? (project?.settings.approvalRequired ?? false)
            ? 'This project requires approval, but the server marks a dated post as Scheduled on creation. Send it for approval before its date.'
            : 'A post with a date is created as Scheduled.'
        : null;

    return ListView(padding: const EdgeInsets.fromLTRB(16, 12, 16, 120), children: [
      if (project != null)
        Padding(
          padding: const EdgeInsets.only(bottom: 12),
          child: Row(children: [
            const Icon(Icons.folder_rounded, size: 16, color: AppTheme.textSecondary),
            const SizedBox(width: 6),
            Expanded(child: Text(project.name, style: Theme.of(context).textTheme.bodyMedium)),
          ]),
        ),
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
      TextField(controller: _title, decoration: fieldDecoration('Title (internal)')),
      const SizedBox(height: 12),
      TextField(controller: _hook, onChanged: (_) => setState(() {}), decoration: fieldDecoration('Hook', hint: 'The first line / first 3 seconds')),
      const SizedBox(height: 12),
      TextField(
        controller: _content,
        minLines: 5,
        maxLines: 12,
        onChanged: (_) => setState(() {}),
        decoration: fieldDecoration('Caption *', helper: '${_content.text.characters.length} characters'),
      ),
      if (hits.isNotEmpty) ...[
        const SizedBox(height: 8),
        StatusChip(label: 'Restricted words: ${hits.join(', ')}', color: AppTheme.error, icon: Icons.block_rounded),
      ],
      if (voice != null && voice.defaultHashtags.isNotEmpty) ...[
        const SizedBox(height: 8),
        Wrap(spacing: 6, runSpacing: 6, children: [
          for (final h in voice.defaultHashtags)
            ActionChip(
              label: Text(h, style: const TextStyle(fontSize: 12)),
              onPressed: () => setState(() => _content.text = '${_content.text.trimRight()} $h'),
            ),
        ]),
      ],
      const SizedBox(height: 12),
      TextField(controller: _objective, decoration: fieldDecoration('Objective', hint: 'e.g. Drive sign-ups')),
      const SizedBox(height: 12),
      TextField(controller: _firstComment, maxLines: 3, minLines: 1, decoration: fieldDecoration('First comment')),
      const SectionHeader('Channels'),
      if (accounts.isNotEmpty)
        DropdownButtonFormField<String?>(
          isExpanded: true,
          initialValue: accounts.any((a) => a.id == _accountId) ? _accountId : null,
          decoration: fieldDecoration('Publish from account'),
          items: [
            const DropdownMenuItem(value: null, child: Text('Not set')),
            for (final a in accounts)
              DropdownMenuItem(value: a.id, child: Text('${a.platform.label} · ${a.accountName}', overflow: TextOverflow.ellipsis)),
          ],
          onChanged: (v) => setState(() {
            _accountId = v;
            final acc = accounts.where((a) => a.id == v).firstOrNull;
            if (acc != null) _platforms.add(acc.platform);
          }),
        )
      else
        const Text('No channels are linked to this project. Link one under Channels to publish.',
            style: TextStyle(color: AppTheme.textSecondary)),
      const SizedBox(height: 12),
      Wrap(spacing: 8, runSpacing: 8, children: [
        for (final p in SocialPlatform.connectable)
          FilterChip(
            avatar: Icon(p.icon, size: 16, color: p.color),
            label: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(p.label),
                const SizedBox(width: 6),
                Text(
                  p.isAutomated ? '● Auto & Manual' : '○ Manual Assist',
                  style: const TextStyle(fontSize: 10, color: AppTheme.textSecondary),
                ),
              ],
            ),
            selected: _platforms.contains(p),
            onSelected: (on) => setState(() => on ? _platforms.add(p) : _platforms.remove(p)),
          ),
      ]),
      for (final p in _platforms)
        Padding(
          padding: const EdgeInsets.only(top: 12),
          child: TextField(
            controller: _variantText.putIfAbsent(p, TextEditingController.new),
            minLines: 1,
            maxLines: 5,
            decoration: fieldDecoration('${p.label} caption override', helper: 'Leave empty to use the main caption'),
          ),
        ),
      if (_platforms.contains(SocialPlatform.reddit)) ...[
        Padding(
          padding: const EdgeInsets.only(top: 12),
          child: TextField(
            controller: _redditSubreddit,
            decoration: fieldDecoration('Reddit Subreddit destination', hint: 'e.g. technology (without r/)'),
          ),
        ),
        Padding(
          padding: const EdgeInsets.only(top: 12),
          child: TextField(
            controller: _redditTitle,
            decoration: fieldDecoration('Reddit Post Title', helper: 'Defaults to main post title if empty'),
          ),
        ),
      ],
      const SectionHeader('Schedule'),
      SectionCard(
        onTap: _pickSchedule,
        child: Row(children: [
          const Icon(Icons.event_rounded, color: AppTheme.primary),
          const SizedBox(width: 12),
          Expanded(child: Text(_scheduledFor == null ? 'Not scheduled (draft)' : fmtDateTime(_scheduledFor))),
          if (_scheduledFor != null)
            IconButton(icon: const Icon(Icons.clear_rounded), onPressed: () => setState(() => _scheduledFor = null)),
        ]),
      ),
      if (scheduleNote != null)
        Padding(padding: const EdgeInsets.only(top: 6), child: Text(scheduleNote, style: Theme.of(context).textTheme.labelSmall)),
      if (project != null)
        Padding(
          padding: const EdgeInsets.only(top: 4),
          child: Text('Times are shown in device time. Project timezone: ${project.settings.defaultTimezone}.',
              style: Theme.of(context).textTheme.labelSmall),
        ),
      SwitchListTile(
        contentPadding: EdgeInsets.zero,
        value: _evergreen,
        onChanged: (v) => setState(() => _evergreen = v),
        title: const Text('Evergreen'),
        subtitle: const Text('Eligible for the evergreen re-post queue'),
      ),
      const SectionHeader('Media'),
      for (final url in _mediaUrls)
        ListTile(
          contentPadding: EdgeInsets.zero,
          leading: const Icon(Icons.attachment_rounded),
          title: Text(Uri.tryParse(url)?.pathSegments.lastOrNull ?? url, maxLines: 1, overflow: TextOverflow.ellipsis),
          trailing: IconButton(icon: const Icon(Icons.close_rounded), onPressed: () => setState(() => _mediaUrls.remove(url))),
        ),
      if (_uploadProgress != null)
        Padding(padding: const EdgeInsets.symmetric(vertical: 8), child: LinearProgressIndicator(value: _uploadProgress)),
      OutlinedButton.icon(
        onPressed: _uploadProgress != null ? null : _addMedia,
        icon: const Icon(Icons.upload_rounded),
        label: Text(_mediaType == 'video' ? 'Upload video' : 'Upload image'),
      ),
      const SizedBox(height: 16),
      const SectionHeader('180 Engagement Automation'),
      // SectionCard is a Material, so the SwitchListTile's ink renders correctly inside it.
      SectionCard(
        padding: const EdgeInsets.all(12),
        borderColor: _enableEngagement ? AppTheme.primary.withValues(alpha: 0.4) : AppTheme.borderSubtle,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            SwitchListTile(
              contentPadding: EdgeInsets.zero,
              value: _enableEngagement,
              onChanged: (v) => setState(() => _enableEngagement = v),
              title: const Text('Auto-DM & Comment Funnel', style: TextStyle(fontWeight: FontWeight.bold)),
              subtitle: const Text('Send direct messages, lead magnets, and auto-like comments'),
            ),
            if (_enableEngagement) ...[
              const SizedBox(height: 12),
              TextField(
                controller: _engagementKeyword,
                decoration: fieldDecoration('Trigger Keyword', hint: 'e.g. GROWTH, BLUEPRINT, INFO', helper: 'Users who comment this word get the auto-DM'),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: _engagementDeliverable,
                decoration: fieldDecoration('Deliverable URL', hint: 'https://yoursite.com/free-guide'),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: _engagementDmTemplate,
                maxLines: 2,
                decoration: fieldDecoration('Direct Message Template', hint: 'Hey {name}! Here is your link: {link}'),
              ),
              const SizedBox(height: 8),
              Row(
                children: [
                  Checkbox(
                    value: _engagementAutoLike,
                    activeColor: AppTheme.primary,
                    onChanged: (v) => setState(() => _engagementAutoLike = v ?? true),
                  ),
                  const Text('Auto-like matching comment', style: TextStyle(fontSize: 13)),
                ],
              ),
              Row(
                children: [
                  Checkbox(
                    value: _engagementAiAgent,
                    activeColor: AppTheme.primary,
                    onChanged: (v) => setState(() => _engagementAiAgent = v ?? true),
                  ),
                  const Text('Enable AI Follow-up Agent', style: TextStyle(fontSize: 13)),
                ],
              ),
            ],
          ],
        ),
      ),
      const SizedBox(height: 24),
      OutlinedButton.icon(
        onPressed: () => _showPreview(context),
        icon: const Icon(Icons.remove_red_eye_rounded),
        label: const Text('Preview across channels'),
      ),
      const SizedBox(height: 12),
      ElevatedButton(
        onPressed: _saving || _uploadProgress != null ? null : _save,
        child: _saving
            ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2))
            : Text(_p == null ? 'Create post' : 'Save changes'),
      ),
    ]);
  }

  void _showPreview(BuildContext context) {
    showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: AppTheme.surface,
      builder: (ctx) => DraggableScrollableSheet(
        expand: false,
        initialChildSize: 0.85,
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
                    const Icon(Icons.devices_rounded, color: AppTheme.primary),
                    const SizedBox(width: 8),
                    const Expanded(
                      child: Text('Live Channel Previews', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                    ),
                    IconButton(icon: const Icon(Icons.close_rounded), onPressed: () => Navigator.pop(ctx)),
                  ],
                ),
              ),
              PlatformPostPreview(
                caption: _content.text,
                title: _title.text.isNotEmpty ? _title.text : null,
                hook: _hook.text.isNotEmpty ? _hook.text : null,
                mediaUrls: _mediaUrls,
                mediaType: _mediaType,
                selectedPlatform: _platforms.firstOrNull ?? SocialPlatform.instagram,
                accountName: widget.project?.name,
                firstComment: _firstComment.text.isNotEmpty ? _firstComment.text : null,
              ),
            ],
          ),
        ),
      ),
    );
  }
}
