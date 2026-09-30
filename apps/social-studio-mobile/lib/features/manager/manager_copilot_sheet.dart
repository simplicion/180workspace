import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/providers.dart';
import '../../core/theme/app_theme.dart';
import '../../core/widgets/common.dart';
import '../../data/models/manager_chat.dart';

import '../projects/project_provider.dart';

/// Helper to show the 180 Manager AI Copilot from any screen.
void show180ManagerCopilot(BuildContext context, {String? projectId}) {
  showModalBottomSheet(
    context: context,
    isScrollControlled: true,
    backgroundColor: Colors.transparent,
    builder: (_) => ManagerCopilotSheet(projectId: projectId),
  );
}

class ManagerCopilotSheet extends ConsumerStatefulWidget {
  const ManagerCopilotSheet({super.key, this.projectId});
  final String? projectId;

  @override
  ConsumerState<ManagerCopilotSheet> createState() => _ManagerCopilotSheetState();
}

class _ManagerCopilotSheetState extends ConsumerState<ManagerCopilotSheet> {
  final _inputCtl = TextEditingController();
  final _scrollCtl = ScrollController();
  final List<ManagerChatMessage> _messages = [];
  bool _thinking = false;
  String _conversationId = 'session_1';

  @override
  void initState() {
    super.initState();
    _conversationId = 'session_${DateTime.now().millisecondsSinceEpoch}';

    final pId = widget.projectId ?? ref.read(activeProjectProvider).valueOrNull?.id;
    final project = pId != null
        ? ref.read(allProjectsProvider).valueOrNull?.where((p) => p.id == pId).firstOrNull
        : null;
    final projectName = project?.name ?? 'your active project';
    final accounts = project?.socialAccounts ?? [];
    final accountsDesc = accounts.isNotEmpty
        ? 'your **${accounts.length} linked channel(s)** (${accounts.map((a) => a.platform.label).join(', ')})'
        : 'this project (no channels linked yet to $projectName)';

    _messages.add(
      ManagerChatMessage(
        senderType: 'manager',
        content: '👋 **Hello! I am your 180 Manager.**\n\n'
            'I have live consciousness over **$projectName**, $accountsDesc, content calendar, inbox opportunities, and video editor styles.\n\n'
            'Ask me anything or pick a quick command below:',
        suggestedActions: [
          ManagerActionModel(id: 'q1', label: '📊 Project Reach & Stats', type: 'quick_reply', payload: {'text': 'What is our total reach, engagement, and videos uploaded this month for $projectName?'}),
          ManagerActionModel(id: 'q2', label: '💼 Scan DMs for Deals', type: 'quick_reply', payload: {'text': 'Check my DMs and comments for business opportunities or leads in $projectName'}),
          ManagerActionModel(id: 'q3', label: '📅 Pivot Calendar', type: 'quick_reply', payload: {'text': 'Update our content calendar for the upcoming days using our winning format for $projectName'}),
          ManagerActionModel(id: 'q4', label: '🎬 Update Director Pacing', type: 'quick_reply', payload: {'text': 'Tell the AI Video Director to use fast pacing and high contrast captions for $projectName'}),
        ],
      ),
    );
  }

  @override
  void dispose() {
    _inputCtl.dispose();
    _scrollCtl.dispose();
    super.dispose();
  }

  void _scrollToBottom() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_scrollCtl.hasClients) {
        _scrollCtl.animateTo(
          _scrollCtl.position.maxScrollExtent,
          duration: const Duration(milliseconds: 250),
          curve: Curves.easeOut,
        );
      }
    });
  }

  Future<void> _sendMessage(String text) async {
    final query = text.trim();
    if (query.isEmpty || _thinking) return;

    _inputCtl.clear();
    setState(() {
      _messages.add(ManagerChatMessage(senderType: 'user', content: query));
      _thinking = true;
    });
    _scrollToBottom();

    final effectiveProjectId = widget.projectId ?? ref.read(activeProjectProvider).valueOrNull?.id;
    try {
      final res = await ref.read(socialApiProvider).chatWithManager(
            message: query,
            projectId: effectiveProjectId,
            conversationId: _conversationId,
          );

      if (mounted) {
        setState(() {
          _thinking = false;
          _messages.add(
            ManagerChatMessage(
              senderType: 'manager',
              content: res.reply,
              intent: res.intent,
              delegatedAgents: res.delegatedAgents,
              suggestedActions: res.suggestedActions,
            ),
          );
        });
        _scrollToBottom();
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _thinking = false;
          _messages.add(
            ManagerChatMessage(
              senderType: 'manager',
              content: '⚠️ Unable to connect to 180 Manager brain right now: ${e.toString()}',
            ),
          );
        });
        _scrollToBottom();
      }
    }
  }

  Future<void> _handleAction(ManagerActionModel act) async {
    if (act.type == 'quick_reply') {
      final prompt = act.payload['text'] as String? ?? act.label;
      await _sendMessage(prompt);
      return;
    }

    if (act.type == 'open_inbox_conversation') {
      Navigator.of(context).pop();
      context.push('/inbox');
      return;
    }

    // Execute server action (e.g. calendar pivot, director rule)
    setState(() => _thinking = true);
    final res = await guarded(
      context,
      () => ref.read(socialApiProvider).executeManagerAction({
        'type': act.type,
        'payload': {...act.payload, 'projectId': widget.projectId},
      }),
    );
    if (!mounted) return;
    setState(() => _thinking = false);

    if (res != null) {
      showInfo(context, 'Action executed by 180 Manager!', color: AppTheme.success);
      setState(() {
        _messages.add(
          ManagerChatMessage(
            senderType: 'manager',
            content: '✅ **Action Successfully Executed**\n\n'
                'The updates have been synchronized to your workspace and active agent consciousness.',
          ),
        );
      });
      _scrollToBottom();
    }
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      constraints: BoxConstraints(
        maxHeight: MediaQuery.of(context).size.height * 0.92,
      ),
      decoration: BoxDecoration(
        color: AppTheme.surface,
        borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
        border: Border.all(color: AppTheme.borderSubtle),
      ),
      child: Column(
        children: [
          // Drag handle
          Center(
            child: Container(
              margin: const EdgeInsets.only(top: 10, bottom: 6),
              width: 38,
              height: 4,
              decoration: BoxDecoration(
                color: AppTheme.border,
                borderRadius: BorderRadius.circular(2),
              ),
            ),
          ),

          // Header
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            child: Row(
              children: [
                Container(
                  width: 36,
                  height: 36,
                  decoration: BoxDecoration(
                    gradient: LinearGradient(
                      colors: [AppTheme.primary, AppTheme.accent],
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                    ),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: const Icon(Icons.psychology_rounded, color: Colors.white, size: 20),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          const Text(
                            '180 MANAGER AI',
                            style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold, letterSpacing: 0.5),
                          ),
                          const SizedBox(width: 6),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                            decoration: BoxDecoration(
                              color: AppTheme.success.withValues(alpha: 0.15),
                              borderRadius: BorderRadius.circular(6),
                            ),
                            child: Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Container(
                                  width: 6,
                                  height: 6,
                                  decoration: BoxDecoration(
                                    color: AppTheme.success,
                                    shape: BoxShape.circle,
                                  ),
                                ),
                                const SizedBox(width: 4),
                                Text(
                                  'SWARM ACTIVE',
                                  style: TextStyle(fontSize: 9, fontWeight: FontWeight.w700, color: AppTheme.success),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 2),
                      Text(
                        'Aware of all 5 accounts, calendar, inboxes & video director',
                        style: TextStyle(fontSize: 11, color: AppTheme.textSecondary),
                        overflow: TextOverflow.ellipsis,
                      ),
                    ],
                  ),
                ),
                IconButton(
                  icon: Icon(Icons.close_rounded, size: 20, color: AppTheme.textSecondary),
                  onPressed: () => Navigator.of(context).pop(),
                  tooltip: 'Close',
                ),
              ],
            ),
          ),
          Divider(height: 1, color: AppTheme.border),

          // Message Stream
          Expanded(
            child: ListView.builder(
              controller: _scrollCtl,
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
              itemCount: _messages.length,
              itemBuilder: (context, index) {
                final msg = _messages[index];
                return _buildMessageBubble(msg);
              },
            ),
          ),

          if (_thinking) ...[
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
              child: Row(
                children: [
                  SizedBox(
                    width: 14,
                    height: 14,
                    child: CircularProgressIndicator(strokeWidth: 2, color: AppTheme.primary),
                  ),
                  const SizedBox(width: 8),
                  Text(
                    '180 Manager consulting sub-agents (Calendar, Inbox, Telemetry)...',
                    style: TextStyle(fontSize: 11, fontStyle: FontStyle.italic, color: AppTheme.textSecondary),
                  ),
                ],
              ),
            ),
          ],

          // Input Bar
          Container(
            padding: EdgeInsets.only(
              left: 16,
              right: 16,
              top: 8,
              bottom: MediaQuery.of(context).viewInsets.bottom + 12,
            ),
            decoration: BoxDecoration(
              color: AppTheme.surfaceElevated,
              border: Border(top: BorderSide(color: AppTheme.border)),
            ),
            child: Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: _inputCtl,
                    onSubmitted: _sendMessage,
                    textInputAction: TextInputAction.send,
                    decoration: InputDecoration(
                      hintText: 'Ask 180 Manager (e.g. "What worked best this month?")...',
                      hintStyle: TextStyle(fontSize: 13, color: AppTheme.textMuted),
                      filled: true,
                      fillColor: AppTheme.surface,
                      contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(12),
                        borderSide: BorderSide(color: AppTheme.border),
                      ),
                      enabledBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(12),
                        borderSide: BorderSide(color: AppTheme.border),
                      ),
                      focusedBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(12),
                        borderSide: BorderSide(color: AppTheme.primary),
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: 8),
                IconButton.filled(
                  icon: const Icon(Icons.send_rounded, size: 18),
                  style: IconButton.styleFrom(
                    backgroundColor: AppTheme.primary,
                    foregroundColor: Colors.white,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                  ),
                  onPressed: () => _sendMessage(_inputCtl.text),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildMessageBubble(ManagerChatMessage msg) {
    if (msg.isUser) {
      return Padding(
        padding: const EdgeInsets.only(bottom: 12),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.end,
          children: [
            Container(
              constraints: BoxConstraints(maxWidth: MediaQuery.of(context).size.width * 0.78),
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
              decoration: BoxDecoration(
                color: AppTheme.primary,
                borderRadius: BorderRadius.circular(14).copyWith(bottomRight: Radius.zero),
              ),
              child: Text(
                msg.content,
                style: const TextStyle(fontSize: 13, color: Colors.white, height: 1.3),
              ),
            ),
          ],
        ),
      );
    }

    return Padding(
      padding: const EdgeInsets.only(bottom: 16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                width: 28,
                height: 28,
                margin: const EdgeInsets.only(top: 2),
                decoration: BoxDecoration(
                  color: AppTheme.primary.withValues(alpha: 0.15),
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: AppTheme.primary.withValues(alpha: 0.3)),
                ),
                child: Icon(Icons.psychology_rounded, color: AppTheme.primary, size: 16),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: AppTheme.surfaceElevated,
                    borderRadius: BorderRadius.circular(14).copyWith(topLeft: Radius.zero),
                    border: Border.all(color: AppTheme.border),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        msg.content,
                        style: TextStyle(fontSize: 13, color: AppTheme.textPrimary, height: 1.4),
                      ),

                      // Delegated Agent Badges
                      if (msg.delegatedAgents.isNotEmpty) ...[
                        const SizedBox(height: 10),
                        Wrap(
                          spacing: 6,
                          children: [
                            for (final a in msg.delegatedAgents)
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                decoration: BoxDecoration(
                                  color: AppTheme.surface,
                                  borderRadius: BorderRadius.circular(4),
                                  border: Border.all(color: AppTheme.border),
                                ),
                                child: Text(
                                  '⚡ ${a.toUpperCase()} AGENT',
                                  style: TextStyle(fontSize: 9, fontWeight: FontWeight.bold, color: AppTheme.textSecondary),
                                ),
                              ),
                          ],
                        ),
                      ],
                    ],
                  ),
                ),
              ),
            ],
          ),

          // Suggested Action Buttons
          if (msg.suggestedActions.isNotEmpty) ...[
            Padding(
              padding: const EdgeInsets.only(left: 36, top: 8),
              child: Wrap(
                spacing: 8,
                runSpacing: 6,
                children: [
                  for (final act in msg.suggestedActions)
                    ActionChip(
                      avatar: Icon(
                        act.type == 'open_inbox_conversation'
                            ? Icons.open_in_new_rounded
                            : act.type == 'update_calendar'
                                ? Icons.edit_calendar_rounded
                                : Icons.bolt_rounded,
                        size: 14,
                        color: AppTheme.primary,
                      ),
                      label: Text(
                        act.label,
                        style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: AppTheme.primary),
                      ),
                      backgroundColor: AppTheme.primary.withValues(alpha: 0.1),
                      side: BorderSide(color: AppTheme.primary.withValues(alpha: 0.3)),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                      onPressed: () => _handleAction(act),
                    ),
                ],
              ),
            ),
          ],
        ],
      ),
    );
  }
}
