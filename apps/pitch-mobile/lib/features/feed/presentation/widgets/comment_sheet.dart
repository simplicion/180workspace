import 'package:flutter/material.dart';
import 'package:dio/dio.dart';
import '../../../../core/config/app_config.dart';
import '../../../../core/theme/pitch_theme.dart';

class PitchComment {
  final String id;
  final String content;
  final String userName;
  final String? userPhoto;
  final DateTime createdAt;

  PitchComment({
    required this.id,
    required this.content,
    required this.userName,
    this.userPhoto,
    required this.createdAt,
  });

  factory PitchComment.fromJson(Map<String, dynamic> json) {
    return PitchComment(
      id: json['id'] ?? '',
      content: json['content'] ?? '',
      userName: json['user']?['name'] ?? 'Founder',
      userPhoto: json['user']?['photoUrl'],
      createdAt: DateTime.tryParse(json['createdAt'] ?? '') ?? DateTime.now(),
    );
  }
}

class CommentBottomSheet extends StatefulWidget {
  final String pitchId;
  final String? userToken;
  final VoidCallback? onCommentAdded;

  const CommentBottomSheet({
    super.key,
    required this.pitchId,
    this.userToken,
    this.onCommentAdded,
  });

  static void show(BuildContext context, {required String pitchId, String? userToken, VoidCallback? onCommentAdded}) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => CommentBottomSheet(
        pitchId: pitchId,
        userToken: userToken,
        onCommentAdded: onCommentAdded,
      ),
    );
  }

  @override
  State<CommentBottomSheet> createState() => _CommentBottomSheetState();
}

class _CommentBottomSheetState extends State<CommentBottomSheet> {
  final _commentController = TextEditingController();
  final List<PitchComment> _comments = [];
  bool _loading = true;
  bool _submitting = false;

  @override
  void initState() {
    super.initState();
    _fetchComments();
  }

  @override
  void dispose() {
    _commentController.dispose();
    super.dispose();
  }

  Future<void> _fetchComments() async {
    try {
      final dio = Dio();
      final res = await dio.get('${AppConfig.apiBaseUrl}/api/v1/pitch/posts/${widget.pitchId}/comments');
      if (res.data['success'] == true) {
        final list = (res.data['comments'] as List)
            .map((c) => PitchComment.fromJson(c))
            .toList();
        if (mounted) {
          setState(() {
            _comments.clear();
            _comments.addAll(list);
            _loading = false;
          });
        }
      }
    } catch (_) {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _submitComment() async {
    final text = _commentController.text.trim();
    if (text.isEmpty) return;

    setState(() => _submitting = true);
    try {
      final dio = Dio();
      final headers = <String, String>{};
      if (widget.userToken != null) {
        headers['Authorization'] = 'Bearer ${widget.userToken}';
      }

      final res = await dio.post(
        '${AppConfig.apiBaseUrl}/api/v1/pitch/posts/${widget.pitchId}/comments',
        data: {'content': text},
        options: Options(headers: headers),
      );

      if (res.data['success'] == true) {
        _commentController.clear();
        final newComment = PitchComment.fromJson(res.data['comment']);
        setState(() {
          _comments.insert(0, newComment);
          _submitting = false;
        });
        widget.onCommentAdded?.call();
      }
    } catch (e) {
      if (mounted) setState(() => _submitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      height: MediaQuery.of(context).size.height * 0.65,
      padding: EdgeInsets.only(
        bottom: MediaQuery.of(context).viewInsets.bottom,
      ),
      decoration: const BoxDecoration(
        color: PitchTheme.surface,
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      child: Column(
        children: [
          const SizedBox(height: 12),
          Container(
            width: 44,
            height: 4,
            decoration: BoxDecoration(
              color: Colors.white.withValues(alpha: 0.2),
              borderRadius: BorderRadius.circular(2),
            ),
          ),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  'Comments (${_comments.length})',
                  style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 16),
                ),
                IconButton(
                  icon: const Icon(Icons.close_rounded, size: 20),
                  onPressed: () => Navigator.pop(context),
                ),
              ],
            ),
          ),
          const Divider(height: 1, color: Color(0x1AFFFFFF)),
          Expanded(
            child: _loading
                ? const Center(child: CircularProgressIndicator(color: PitchTheme.primary))
                : _comments.isEmpty
                    ? Center(
                        child: Text(
                          'No comments yet. Start the conversation!',
                          style: TextStyle(color: PitchTheme.textSecondary),
                        ),
                      )
                    : ListView.builder(
                        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
                        itemCount: _comments.length,
                        itemBuilder: (ctx, i) {
                          final c = _comments[i];
                          return Padding(
                            padding: const EdgeInsets.only(bottom: 16),
                            child: Row(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                CircleAvatar(
                                  radius: 16,
                                  backgroundColor: PitchTheme.primary.withValues(alpha: 0.2),
                                  backgroundImage: c.userPhoto != null ? NetworkImage(c.userPhoto!) : null,
                                  child: c.userPhoto == null
                                      ? Text(
                                          c.userName.isNotEmpty ? c.userName[0].toUpperCase() : 'U',
                                          style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 12, color: Colors.white),
                                        )
                                      : null,
                                ),
                                const SizedBox(width: 12),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        c.userName,
                                        style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 13, color: Colors.white),
                                      ),
                                      const SizedBox(height: 3),
                                      Text(
                                        c.content,
                                        style: const TextStyle(fontSize: 14, color: PitchTheme.textPrimary),
                                      ),
                                    ],
                                  ),
                                ),
                              ],
                            ),
                          );
                        },
                      ),
          ),
          Padding(
            padding: const EdgeInsets.all(16),
            child: Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: _commentController,
                    style: const TextStyle(color: Colors.white),
                    decoration: InputDecoration(
                      hintText: 'Add a thought or feedback...',
                      hintStyle: TextStyle(color: Colors.white.withValues(alpha: 0.4)),
                      filled: true,
                      fillColor: PitchTheme.surfaceElevated,
                      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(24),
                        borderSide: BorderSide.none,
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: 8),
                IconButton(
                  onPressed: _submitting ? null : _submitComment,
                  icon: _submitting
                      ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2, color: PitchTheme.primary))
                      : const Icon(Icons.send_rounded, color: PitchTheme.primary),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
