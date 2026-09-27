import 'package:flutter/material.dart';
import '../../../core/theme/pitch_theme.dart';
import '../models/chat_message.dart';
import '../widgets/conversation_tile.dart';
import '../widgets/connection_request_card.dart';
import 'chat_screen.dart';

class ConversationsScreen extends StatefulWidget {
  const ConversationsScreen({super.key});

  @override
  State<ConversationsScreen> createState() => _ConversationsScreenState();
}

class _ConversationsScreenState extends State<ConversationsScreen> {
  int _selectedTab = 0; // 0: Messages, 1: Requests
  final TextEditingController _searchController = TextEditingController();
  String _searchQuery = '';

  final List<Conversation> _conversations = [
    Conversation(
      id: 'conv_1',
      otherUserId: 'usr_sarah_chen',
      otherUserName: 'Sarah Chen',
      otherUserAvatar:
          'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&auto=format&fit=crop&q=80',
      otherUserHeadline: 'Founder & CEO @ Synthetix AI | YC W24',
      isOnline: true,
      lastMessage:
          'Are you presenting at the Global Demo Day on Thursday? Several tier-1 VC partners want to review your term sheet.',
      lastMessageTime: DateTime.now().subtract(const Duration(minutes: 12)),
      unreadCount: 1,
      pinnedPitchId: 'exp_1',
    ),
    Conversation(
      id: 'conv_2',
      otherUserId: 'usr_david_k',
      otherUserName: 'David Kumar',
      otherUserAvatar:
          'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&auto=format&fit=crop&q=80',
      otherUserHeadline: 'Founder @ VaultZero | Ex-Stripe Crypto Lead',
      isOnline: false,
      lastMessage:
          'Sent over the ZK payroll SDK documentation. Let\'s sync tomorrow morning on the multi-party contract.',
      lastMessageTime: DateTime.now().subtract(const Duration(hours: 3)),
      unreadCount: 0,
      pinnedPitchId: 'exp_2',
    ),
    Conversation(
      id: 'conv_3',
      otherUserId: 'usr_elena_bio',
      otherUserName: 'Elena Rostova',
      otherUserAvatar:
          'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=400&auto=format&fit=crop&q=80',
      otherUserHeadline: 'Founder & Bio-Physicist @ NeuroPulse',
      isOnline: true,
      lastMessage:
          'Loved the 180s pitch on the Work Graph. We would love to integrate our health sensors with your platform.',
      lastMessageTime: DateTime.now().subtract(const Duration(days: 1)),
      unreadCount: 0,
      pinnedPitchId: 'exp_3',
    ),
  ];

  final List<ConnectionRequest> _requests = [
    ConnectionRequest(
      id: 'req_1',
      fromUserId: 'usr_marcus_v',
      fromUserName: 'Marcus Vance',
      fromUserAvatar:
          'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&auto=format&fit=crop&q=80',
      fromUserHeadline: 'CTO & Co-Founder @ KubePulse',
      note:
          'Saw your post looking for distributed systems engineers. We are optimizing K8s clusters and would love to collaborate on the 180 workspace sync node.',
      pitchTitle: 'KubePulse: Real-time Kubernetes Cost Optimization',
      pitchThumbnail:
          'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=800&auto=format&fit=crop&q=80',
      pitchDuration: 165.0,
      createdAt: DateTime.now().subtract(const Duration(hours: 5)),
    ),
    ConnectionRequest(
      id: 'req_2',
      fromUserId: 'usr_clara_l',
      fromUserName: 'Dr. Clara Lindqvist',
      fromUserAvatar:
          'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&auto=format&fit=crop&q=80',
      fromUserHeadline: 'Founder @ TerraCapture | Climate Tech Fellow',
      note:
          'Would love to connect regarding investor introductions for our direct air mineralization pilot in Europe.',
      pitchTitle: 'TerraCapture: Direct Air Carbon Mineralization',
      pitchThumbnail:
          'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=800&auto=format&fit=crop&q=80',
      pitchDuration: 180.0,
      createdAt: DateTime.now().subtract(const Duration(days: 1)),
    ),
  ];

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  void _openChat(Conversation conv) {
    setState(() {
      final idx = _conversations.indexWhere((c) => c.id == conv.id);
      if (idx != -1) {
        _conversations[idx] = _conversations[idx].copyWith(unreadCount: 0);
      }
    });

    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (_) => ChatScreen(conversation: conv),
      ),
    );
  }

  void _acceptRequest(ConnectionRequest req) {
    setState(() {
      req.status = 'accepted';
      _conversations.insert(
        0,
        Conversation(
          id: 'conv_${req.id}',
          otherUserId: req.fromUserId,
          otherUserName: req.fromUserName,
          otherUserAvatar: req.fromUserAvatar,
          otherUserHeadline: req.fromUserHeadline,
          isOnline: true,
          lastMessage: req.note,
          lastMessageTime: DateTime.now(),
          unreadCount: 0,
        ),
      );
    });

    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text('Connected with ${req.fromUserName}!'),
        backgroundColor: PitchTheme.surfaceElevated,
      ),
    );
  }

  void _ignoreRequest(ConnectionRequest req) {
    setState(() {
      req.status = 'ignored';
    });
  }

  int get _pendingRequestsCount =>
      _requests.where((r) => r.status == 'pending').length;

  List<Conversation> get _filteredConversations {
    if (_searchQuery.isEmpty) return _conversations;
    return _conversations
        .where((c) =>
            c.otherUserName.toLowerCase().contains(_searchQuery.toLowerCase()) ||
            c.lastMessage.toLowerCase().contains(_searchQuery.toLowerCase()))
        .toList();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: PitchTheme.background,
      appBar: AppBar(
        title: Row(
          children: [
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
              decoration: BoxDecoration(
                gradient: PitchTheme.primaryGradient,
                borderRadius: BorderRadius.circular(8),
              ),
              child: const Text(
                'MESSAGES',
                style: TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.w900,
                  letterSpacing: 1.0,
                  color: Colors.white,
                ),
              ),
            ),
            const SizedBox(width: 8),
            const Text(
              '1-on-1 Founder Chat',
              style: TextStyle(fontSize: 17, fontWeight: FontWeight.w800),
            ),
          ],
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.edit_note_rounded,
                color: PitchTheme.primary, size: 26),
            onPressed: () {
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(
                  content: Text('Select a founder from Explore to start a pitch chat'),
                  backgroundColor: PitchTheme.surfaceElevated,
                ),
              );
            },
          ),
          const SizedBox(width: 4),
        ],
      ),
      body: Column(
        children: [
          // 1. Search Box
          Container(
            margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            decoration: BoxDecoration(
              color: PitchTheme.surface,
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: const Color(0x1A6366F1)),
            ),
            child: TextField(
              controller: _searchController,
              onChanged: (val) => setState(() => _searchQuery = val.trim()),
              style: const TextStyle(color: Colors.white, fontSize: 13),
              decoration: InputDecoration(
                hintText: 'Search chats & connection notes...',
                hintStyle:
                    TextStyle(color: PitchTheme.textSecondary, fontSize: 12),
                prefixIcon: const Icon(Icons.search_rounded,
                    color: PitchTheme.primary, size: 20),
                border: InputBorder.none,
                contentPadding: const EdgeInsets.symmetric(vertical: 12),
              ),
            ),
          ),

          // 2. Segmented Tabs: Active Chats | Connection Requests
          Container(
            margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
            padding: const EdgeInsets.all(4),
            decoration: BoxDecoration(
              color: PitchTheme.surface,
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: const Color(0x15FFFFFF)),
            ),
            child: Row(
              children: [
                Expanded(
                  child: GestureDetector(
                    onTap: () => setState(() => _selectedTab = 0),
                    child: Container(
                      padding: const EdgeInsets.symmetric(vertical: 9),
                      decoration: BoxDecoration(
                        color: _selectedTab == 0
                            ? PitchTheme.primary
                            : Colors.transparent,
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: Text(
                        'Direct Messages (${_conversations.length})',
                        textAlign: TextAlign.center,
                        style: TextStyle(
                          color: _selectedTab == 0
                              ? Colors.white
                              : PitchTheme.textSecondary,
                          fontSize: 12,
                          fontWeight: _selectedTab == 0
                              ? FontWeight.w800
                              : FontWeight.w600,
                        ),
                      ),
                    ),
                  ),
                ),
                Expanded(
                  child: GestureDetector(
                    onTap: () => setState(() => _selectedTab = 1),
                    child: Container(
                      padding: const EdgeInsets.symmetric(vertical: 9),
                      decoration: BoxDecoration(
                        color: _selectedTab == 1
                            ? PitchTheme.primary
                            : Colors.transparent,
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Text(
                            'Requests',
                            style: TextStyle(
                              color: _selectedTab == 1
                                  ? Colors.white
                                  : PitchTheme.textSecondary,
                              fontSize: 12,
                              fontWeight: _selectedTab == 1
                                  ? FontWeight.w800
                                  : FontWeight.w600,
                            ),
                          ),
                          if (_pendingRequestsCount > 0) ...[
                            const SizedBox(width: 6),
                            Container(
                              padding: const EdgeInsets.symmetric(
                                  horizontal: 6, vertical: 2),
                              decoration: BoxDecoration(
                                color: PitchTheme.accentPink,
                                borderRadius: BorderRadius.circular(10),
                              ),
                              child: Text(
                                '$_pendingRequestsCount',
                                style: const TextStyle(
                                  color: Colors.white,
                                  fontSize: 10,
                                  fontWeight: FontWeight.w900,
                                ),
                              ),
                            ),
                          ],
                        ],
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),

          const SizedBox(height: 8),

          // 3. Tab Body
          Expanded(
            child: _selectedTab == 0
                ? _buildMessagesList()
                : _buildRequestsList(),
          ),
        ],
      ),
    );
  }

  Widget _buildMessagesList() {
    final list = _filteredConversations;
    if (list.isEmpty) {
      return Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.chat_bubble_outline_rounded,
                size: 48, color: PitchTheme.textSecondary),
            const SizedBox(height: 12),
            const Text(
              'No messages found',
              style: TextStyle(
                  color: Colors.white,
                  fontWeight: FontWeight.w700,
                  fontSize: 15),
            ),
            const SizedBox(height: 4),
            Text(
              'Reach out to founders from the Explore tab!',
              style: TextStyle(color: PitchTheme.textSecondary, fontSize: 12),
            ),
          ],
        ),
      );
    }

    return ListView.builder(
      physics: const BouncingScrollPhysics(),
      itemCount: list.length,
      itemBuilder: (ctx, i) {
        final conv = list[i];
        return ConversationTile(
          conversation: conv,
          onTap: () => _openChat(conv),
        );
      },
    );
  }

  Widget _buildRequestsList() {
    if (_requests.isEmpty) {
      return Center(
        child: Text(
          'No pending connection requests.',
          style: TextStyle(color: PitchTheme.textSecondary),
        ),
      );
    }

    return ListView.builder(
      physics: const BouncingScrollPhysics(),
      itemCount: _requests.length,
      itemBuilder: (ctx, i) {
        final req = _requests[i];
        return ConnectionRequestCard(
          request: req,
          onAccept: () => _acceptRequest(req),
          onIgnore: () => _ignoreRequest(req),
        );
      },
    );
  }
}
