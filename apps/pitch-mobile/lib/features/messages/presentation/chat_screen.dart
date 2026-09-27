import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/theme/pitch_theme.dart';
import '../../../core/auth/local_user_profile.dart';
import '../models/chat_message.dart';
import '../widgets/message_bubble.dart';

class ChatScreen extends ConsumerStatefulWidget {
  final Conversation conversation;

  const ChatScreen({super.key, required this.conversation});

  @override
  ConsumerState<ChatScreen> createState() => _ChatScreenState();
}

class _ChatScreenState extends ConsumerState<ChatScreen> {
  final TextEditingController _textController = TextEditingController();
  final ScrollController _scrollController = ScrollController();
  final List<ChatMessage> _messages = [];
  bool _attachPitch = false;

  @override
  void initState() {
    super.initState();
    _loadInitialMessages();
  }

  @override
  void dispose() {
    _textController.dispose();
    _scrollController.dispose();
    super.dispose();
  }

  void _loadInitialMessages() {
    final now = DateTime.now();
    _messages.addAll([
      ChatMessage(
        id: 'msg_1',
        conversationId: widget.conversation.id,
        senderId: widget.conversation.otherUserId,
        senderName: widget.conversation.otherUserName,
        senderAvatar: widget.conversation.otherUserAvatar,
        text: 'Hey Alex! Just watched your 180s elevator pitch on the Work Graph sovereign architecture. Truly impressive vision!',
        timestamp: now.subtract(const Duration(minutes: 45)),
        isMe: false,
        attachedPitchId: 'post_demo_1',
        attachedPitchTitle: 'Simplicion Work Graph: The Universal Work Mesh',
      ),
      ChatMessage(
        id: 'msg_2',
        conversationId: widget.conversation.id,
        senderId: 'usr_founder_001',
        senderName: 'Alex Rivers',
        text: 'Thanks Sarah! Really appreciate that. Your autonomous contract audit demo on Synthetix AI was mind-blowing as well.',
        timestamp: now.subtract(const Duration(minutes: 30)),
        isMe: true,
      ),
      ChatMessage(
        id: 'msg_3',
        conversationId: widget.conversation.id,
        senderId: widget.conversation.otherUserId,
        senderName: widget.conversation.otherUserName,
        senderAvatar: widget.conversation.otherUserAvatar,
        text: 'Are you presenting at the Global Demo Day on Thursday? Several tier-1 VC partners want to review your term sheet.',
        timestamp: now.subtract(const Duration(minutes: 12)),
        isMe: false,
      ),
    ]);
  }

  void _sendMessage() {
    final text = _textController.text.trim();
    if (text.isEmpty && !_attachPitch) return;

    final profile = ref.read(localUserProfileProvider);

    final newMsg = ChatMessage(
      id: 'msg_${DateTime.now().millisecondsSinceEpoch}',
      conversationId: widget.conversation.id,
      senderId: profile.id,
      senderName: profile.name,
      text: text.isNotEmpty ? text : 'Shared my 180s pitch reel with you.',
      timestamp: DateTime.now(),
      isMe: true,
      isRead: false,
      attachedPitchId: _attachPitch ? 'post_demo_1' : null,
      attachedPitchTitle: _attachPitch ? 'Simplicion Work Graph: Universal Work Mesh' : null,
    );

    setState(() {
      _messages.add(newMsg);
      _attachPitch = false;
      _textController.clear();
    });

    // Auto scroll down
    Future.delayed(const Duration(milliseconds: 100), () {
      if (_scrollController.hasClients) {
        _scrollController.animateTo(
          _scrollController.position.maxScrollExtent,
          duration: const Duration(milliseconds: 300),
          curve: Curves.easeOut,
        );
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: PitchTheme.background,
      appBar: AppBar(
        titleSpacing: 0,
        title: Row(
          children: [
            CircleAvatar(
              radius: 18,
              backgroundImage: NetworkImage(widget.conversation.otherUserAvatar),
              onBackgroundImageError: (_, __) {},
            ),
            const SizedBox(width: 10),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Flexible(
                        child: Text(
                          widget.conversation.otherUserName,
                          style: const TextStyle(
                            fontSize: 15,
                            fontWeight: FontWeight.w800,
                            color: Colors.white,
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                      const SizedBox(width: 4),
                      const Icon(Icons.verified_rounded,
                          color: PitchTheme.primary, size: 14),
                    ],
                  ),
                  Text(
                    widget.conversation.isOnline ? 'Online now' : 'Active today',
                    style: TextStyle(
                      color: widget.conversation.isOnline
                          ? PitchTheme.accentEmerald
                          : PitchTheme.textSecondary,
                      fontSize: 11,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.videocam_outlined,
                color: PitchTheme.primary, size: 22),
            onPressed: () {
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(
                  content: Text('Starting encrypted 180 video room...'),
                  backgroundColor: PitchTheme.surfaceElevated,
                ),
              );
            },
          ),
          IconButton(
            icon: const Icon(Icons.more_vert_rounded,
                color: PitchTheme.textSecondary, size: 20),
            onPressed: () {},
          ),
          const SizedBox(width: 4),
        ],
      ),
      body: Column(
        children: [
          // 1. Message Bubble Stream
          Expanded(
            child: ListView.builder(
              controller: _scrollController,
              padding: const EdgeInsets.symmetric(vertical: 16),
              physics: const BouncingScrollPhysics(),
              itemCount: _messages.length,
              itemBuilder: (ctx, i) {
                final msg = _messages[i];
                return MessageBubble(message: msg);
              },
            ),
          ),

          // 2. Attached Pitch Banner (if toggled)
          if (_attachPitch)
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              color: const Color(0xFF16182B),
              child: Row(
                children: [
                  const Icon(Icons.video_library_rounded,
                      color: PitchTheme.accentAmber, size: 20),
                  const SizedBox(width: 10),
                  const Expanded(
                    child: Text(
                      'Your Pinned 180s Pitch Video will be attached',
                      style: TextStyle(
                        color: Colors.white,
                        fontSize: 12,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ),
                  IconButton(
                    icon: const Icon(Icons.close_rounded,
                        color: Colors.white54, size: 18),
                    onPressed: () => setState(() => _attachPitch = false),
                  ),
                ],
              ),
            ),

          // 3. Input Bar
          Container(
            padding: EdgeInsets.only(
              left: 12,
              right: 12,
              top: 10,
              bottom: MediaQuery.of(context).padding.bottom + 10,
            ),
            decoration: const BoxDecoration(
              color: PitchTheme.surface,
              border: Border(
                top: BorderSide(color: Color(0x1A6366F1), width: 1),
              ),
            ),
            child: Row(
              children: [
                // Attach Pitch button
                IconButton(
                  tooltip: 'Attach 180s Pitch Reel',
                  icon: Icon(
                    _attachPitch
                        ? Icons.video_call_rounded
                        : Icons.add_circle_outline_rounded,
                    color: _attachPitch
                        ? PitchTheme.accentAmber
                        : PitchTheme.primary,
                    size: 26,
                  ),
                  onPressed: () {
                    setState(() => _attachPitch = !_attachPitch);
                  },
                ),

                // Text field
                Expanded(
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 14),
                    decoration: BoxDecoration(
                      color: PitchTheme.surfaceElevated,
                      borderRadius: BorderRadius.circular(24),
                    ),
                    child: TextField(
                      controller: _textController,
                      style: const TextStyle(color: Colors.white, fontSize: 13.5),
                      decoration: InputDecoration(
                        hintText: 'Message ${widget.conversation.otherUserName}...',
                        hintStyle: TextStyle(
                            color: PitchTheme.textSecondary, fontSize: 12.5),
                        border: InputBorder.none,
                      ),
                      onSubmitted: (_) => _sendMessage(),
                    ),
                  ),
                ),
                const SizedBox(width: 8),

                // Send button
                Container(
                  width: 42,
                  height: 42,
                  decoration: const BoxDecoration(
                    gradient: PitchTheme.primaryGradient,
                    shape: BoxShape.circle,
                  ),
                  child: IconButton(
                    icon: const Icon(Icons.send_rounded,
                        color: Colors.white, size: 18),
                    onPressed: _sendMessage,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
