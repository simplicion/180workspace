import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:share_plus/share_plus.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../../../core/theme/pitch_theme.dart';
import '../../models/pitch_post.dart';

class SharePitchSheet extends StatefulWidget {
  final PitchPost post;

  const SharePitchSheet({super.key, required this.post});

  static void show(BuildContext context, PitchPost post) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => SharePitchSheet(post: post),
    );
  }

  @override
  State<SharePitchSheet> createState() => _SharePitchSheetState();
}

class _SharePitchSheetState extends State<SharePitchSheet> {
  bool _copied = false;

  String get _pitchUrl => 'https://app.180workspace.com/pitch/${widget.post.id}';

  Future<void> _copyLink() async {
    await Clipboard.setData(ClipboardData(text: _pitchUrl));
    setState(() => _copied = true);
    await Future.delayed(const Duration(seconds: 2));
    if (mounted) setState(() => _copied = false);
  }

  void _shareViaNative() {
    Navigator.pop(context);
    SharePlus.instance.share(
      ShareParams(
        text: 'Watch "${widget.post.title}" (180s Elevator Pitch) on Pitch in 180: $_pitchUrl\n#180pitch #startups #founders',
        subject: widget.post.title,
      ),
    );
  }

  Future<void> _shareToSocial(String platform) async {
    final text = Uri.encodeComponent(
      'Watch "${widget.post.title}" on @180workspace #180pitch: $_pitchUrl',
    );

    Uri? url;
    switch (platform) {
      case 'twitter':
        url = Uri.parse('https://twitter.com/intent/tweet?text=$text');
        break;
      case 'linkedin':
        url = Uri.parse(
          'https://www.linkedin.com/sharing/share-offsite/?url=${Uri.encodeComponent(_pitchUrl)}',
        );
        break;
      case 'whatsapp':
        url = Uri.parse('https://api.whatsapp.com/send?text=$text');
        break;
      case 'telegram':
        url = Uri.parse('https://t.me/share/url?url=${Uri.encodeComponent(_pitchUrl)}&text=${Uri.encodeComponent(widget.post.title)}');
        break;
    }

    if (url != null && await canLaunchUrl(url)) {
      await launchUrl(url, mode: LaunchMode.externalApplication);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.only(top: 12, bottom: 28, left: 20, right: 20),
      decoration: const BoxDecoration(
        color: PitchTheme.surface,
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Drag handle
          Center(
            child: Container(
              width: 44,
              height: 4,
              decoration: BoxDecoration(
                color: Colors.white.withValues(alpha: 0.2),
                borderRadius: BorderRadius.circular(2),
              ),
            ),
          ),
          const SizedBox(height: 16),

          // Header
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text(
                'Share 180s Pitch',
                style: TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.w800,
                  color: Colors.white,
                ),
              ),
              IconButton(
                icon: const Icon(Icons.close_rounded,
                    color: PitchTheme.textSecondary, size: 20),
                onPressed: () => Navigator.pop(context),
              ),
            ],
          ),

          // Pitch Card Mini Preview
          Container(
            padding: const EdgeInsets.all(12),
            margin: const EdgeInsets.symmetric(vertical: 12),
            decoration: BoxDecoration(
              color: PitchTheme.surfaceElevated,
              borderRadius: BorderRadius.circular(14),
              border: Border.all(
                color: PitchTheme.primary.withValues(alpha: 0.25),
              ),
            ),
            child: Row(
              children: [
                ClipRRect(
                  borderRadius: BorderRadius.circular(8),
                  child: Container(
                    width: 48,
                    height: 48,
                    color: const Color(0xFF222538),
                    child: const Icon(Icons.videocam_rounded,
                        color: PitchTheme.primary, size: 24),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        widget.post.title,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                          color: Colors.white,
                          fontWeight: FontWeight.w700,
                          fontSize: 13,
                        ),
                      ),
                      const SizedBox(height: 3),
                      Text(
                        'By ${widget.post.authorName} • ${widget.post.durationSeconds.toInt()}s',
                        style: TextStyle(
                          color: PitchTheme.textSecondary,
                          fontSize: 11,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),

          const SizedBox(height: 8),

          // Quick Social Channels
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceAround,
            children: [
              _buildSocialAction(
                icon: Icons.chat_bubble_outline_rounded,
                label: 'WhatsApp',
                color: const Color(0xFF25D366),
                onTap: () => _shareToSocial('whatsapp'),
              ),
              _buildSocialAction(
                icon: Icons.send_rounded,
                label: 'Telegram',
                color: const Color(0xFF0088CC),
                onTap: () => _shareToSocial('telegram'),
              ),
              _buildSocialAction(
                icon: Icons.alternate_email_rounded,
                label: 'X / Twitter',
                color: Colors.white,
                onTap: () => _shareToSocial('twitter'),
              ),
              _buildSocialAction(
                icon: Icons.business_center_rounded,
                label: 'LinkedIn',
                color: const Color(0xFF0A66C2),
                onTap: () => _shareToSocial('linkedin'),
              ),
            ],
          ),

          const SizedBox(height: 20),

          // Direct Copy Link Bar
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
            decoration: BoxDecoration(
              color: const Color(0xFF131422),
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: const Color(0x336366F1)),
            ),
            child: Row(
              children: [
                Expanded(
                  child: Text(
                    _pitchUrl,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(
                      color: PitchTheme.textSecondary,
                      fontSize: 12,
                    ),
                  ),
                ),
                const SizedBox(width: 8),
                ElevatedButton.icon(
                  style: ElevatedButton.styleFrom(
                    backgroundColor:
                        _copied ? PitchTheme.accentEmerald : PitchTheme.primary,
                    padding:
                        const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(10),
                    ),
                  ),
                  onPressed: _copyLink,
                  icon: Icon(
                    _copied ? Icons.check_rounded : Icons.copy_rounded,
                    size: 15,
                    color: Colors.white,
                  ),
                  label: Text(
                    _copied ? 'Copied!' : 'Copy',
                    style: const TextStyle(
                      color: Colors.white,
                      fontWeight: FontWeight.w700,
                      fontSize: 12,
                    ),
                  ),
                ),
              ],
            ),
          ),

          const SizedBox(height: 12),

          // System Share Button
          SizedBox(
            width: double.infinity,
            height: 46,
            child: OutlinedButton.icon(
              style: OutlinedButton.styleFrom(
                side: const BorderSide(color: Color(0x22FFFFFF)),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(14),
                ),
              ),
              onPressed: _shareViaNative,
              icon: const Icon(Icons.share_outlined,
                  size: 18, color: Colors.white),
              label: const Text(
                'More Sharing Options',
                style: TextStyle(
                  color: Colors.white,
                  fontWeight: FontWeight.w600,
                  fontSize: 13,
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSocialAction({
    required IconData icon,
    required String label,
    required Color color,
    required VoidCallback onTap,
  }) {
    return GestureDetector(
      onTap: onTap,
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 50,
            height: 50,
            decoration: BoxDecoration(
              color: color.withValues(alpha: 0.15),
              shape: BoxShape.circle,
              border: Border.all(color: color.withValues(alpha: 0.4), width: 1.2),
            ),
            child: Icon(icon, color: color, size: 22),
          ),
          const SizedBox(height: 6),
          Text(
            label,
            style: const TextStyle(
              color: Colors.white70,
              fontSize: 11,
              fontWeight: FontWeight.w500,
            ),
          ),
        ],
      ),
    );
  }
}
