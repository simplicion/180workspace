import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/providers.dart';
import '../../core/theme/app_theme.dart';
import '../../core/widgets/common.dart';
import '../../data/models/engagement_rule.dart';
import '../../data/models/project.dart';

final engagementRulesProvider = FutureProvider.autoDispose.family<List<EngagementRule>, String>((ref, projectId) {
  return ref.watch(socialApiProvider).listEngagementRules(projectId: projectId);
});

final engagementStatsProvider = FutureProvider.autoDispose.family<EngagementStats, String>((ref, projectId) {
  return ref.watch(socialApiProvider).getEngagementStats(projectId: projectId);
});

final livePlatformMetricsProvider = FutureProvider.autoDispose.family<List<Map<String, dynamic>>, String>((ref, projectId) {
  return ref.watch(socialApiProvider).getLivePlatformMetrics(projectId);
});

/// 180 Engagement Automation Tab for Projects
class EngagementTab extends ConsumerWidget {
  const EngagementTab({super.key, required this.project});
  final Project project;

  void _openCreateRuleSheet(BuildContext context, WidgetRef ref) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: AppTheme.surfaceElevated,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (_) => _EngagementRuleFormSheet(projectId: project.id),
    );
  }

  void _openDryRunSheet(BuildContext context, WidgetRef ref) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: AppTheme.surfaceElevated,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (_) => _DryRunTesterSheet(projectId: project.id),
    );
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final rulesAsync = ref.watch(engagementRulesProvider(project.id));
    final statsAsync = ref.watch(engagementStatsProvider(project.id));

    return Scaffold(
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => _openCreateRuleSheet(context, ref),
        icon: const Icon(Icons.bolt_rounded),
        label: const Text('New Automation'),
        backgroundColor: AppTheme.primary,
      ),
      body: RefreshIndicator(
        onRefresh: () async {
          ref.invalidate(engagementRulesProvider(project.id));
          ref.invalidate(engagementStatsProvider(project.id));
        },
        child: ListView(
          padding: const EdgeInsets.fromLTRB(16, 16, 16, 100),
          children: [
            // Stats summary card
            statsAsync.when(
              data: (stats) => _buildStatsRow(context, stats),
              loading: () => const LinearProgressIndicator(),
              error: (_, _) => const SizedBox.shrink(),
            ),
            _buildLiveMetricsCard(context, ref),
            const SizedBox(height: 20),

            SectionHeader(
              'Active Funnels & Triggers',
              trailing: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    TextButton.icon(
                      onPressed: () => _openDryRunSheet(context, ref),
                      icon: const Icon(Icons.science_rounded, size: 16, color: AppTheme.accent),
                      label: const Text('Test Matcher', style: TextStyle(fontSize: 12, color: AppTheme.accent)),
                    ),
                    IconButton(
                      icon: const Icon(Icons.refresh_rounded, size: 20),
                      onPressed: () {
                        ref.invalidate(engagementRulesProvider(project.id));
                        ref.invalidate(engagementStatsProvider(project.id));
                        ref.invalidate(livePlatformMetricsProvider(project.id));
                      },
                    ),
                  ],
                ),
            ),
            const SizedBox(height: 8),

            rulesAsync.when(
              data: (rules) {
                if (rules.isEmpty) {
                  return EmptyView(
                    icon: Icons.bolt_rounded,
                    title: 'No Automation Rules',
                    message: 'Create a comment-to-DM lead magnet or auto-reply funnel to convert comments into customers.',
                    actionLabel: 'Create Rule',
                    onAction: () => _openCreateRuleSheet(context, ref),
                  );
                }
                return ListView.separated(
                  shrinkWrap: true,
                  physics: const NeverScrollableScrollPhysics(),
                  itemCount: rules.length,
                  separatorBuilder: (_, _) => const SizedBox(height: 12),
                  itemBuilder: (_, i) => _RuleCard(rule: rules[i], projectId: project.id),
                );
              },
              loading: () => const Center(child: Padding(padding: EdgeInsets.all(32), child: CircularProgressIndicator())),
              error: (err, _) => StatusChip(label: 'Failed to load rules: $err', color: AppTheme.error),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildStatsRow(BuildContext context, EngagementStats stats) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppTheme.surface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppTheme.borderSubtle),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Icon(Icons.insights_rounded, color: AppTheme.accent, size: 20),
              const SizedBox(width: 8),
              Text('Automation Telemetry', style: Theme.of(context).textTheme.titleSmall?.copyWith(fontWeight: FontWeight.bold)),
            ],
          ),
          const SizedBox(height: 16),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceAround,
            children: [
              _metricTile('Triggers', '${stats.totalTriggered}', Icons.touch_app_rounded, AppTheme.primary),
              _metricTile('DMs Sent', '${stats.totalDmsSent}', Icons.send_rounded, AppTheme.accent),
              _metricTile('Likes', '${stats.totalLiked}', Icons.favorite_rounded, Colors.pinkAccent),
              _metricTile('Leads', '${stats.totalLeadsGenerated}', Icons.person_pin_rounded, AppTheme.success),
            ],
          ),
        ],
      ),
    );
  }

  Widget _metricTile(String label, String value, IconData icon, Color color) {
    return Column(
      children: [
        Icon(icon, size: 20, color: color),
        const SizedBox(height: 4),
        Text(value, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w800)),
        Text(label, style: const TextStyle(fontSize: 11, color: AppTheme.textSecondary)),
      ],
    );
  }

  Widget _buildLiveMetricsCard(BuildContext context, WidgetRef ref) {
    final metricsAsync = ref.watch(livePlatformMetricsProvider(project.id));
    return metricsAsync.when(
      data: (metrics) {
        if (metrics.isEmpty) return const SizedBox.shrink();
        return Padding(
          padding: const EdgeInsets.only(top: 14),
          child: Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: AppTheme.surface,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: AppTheme.borderSubtle),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    const Icon(Icons.sensors_rounded, color: AppTheme.success, size: 18),
                    const SizedBox(width: 8),
                    Text(
                      'Live Connected Network Telemetry',
                      style: Theme.of(context).textTheme.titleSmall?.copyWith(fontWeight: FontWeight.bold),
                    ),
                  ],
                ),
                const SizedBox(height: 10),
                for (final m in metrics) ...[
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        (m['platform'] as String? ?? 'channel').toUpperCase(),
                        style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 12),
                      ),
                      Text(
                        '${m['followersCount'] ?? 0} followers · ${m['engagementRate'] ?? 0}% eng rate',
                        style: const TextStyle(fontSize: 11, color: AppTheme.textSecondary),
                      ),
                    ],
                  ),
                  const SizedBox(height: 4),
                ],
              ],
            ),
          ),
        );
      },
      loading: () => const SizedBox.shrink(),
      error: (_, _) => const SizedBox.shrink(),
    );
  }
}

class _RuleCard extends ConsumerWidget {
  const _RuleCard({required this.rule, required this.projectId});
  final EngagementRule rule;
  final String projectId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppTheme.surface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: rule.isActive ? AppTheme.primary.withValues(alpha: 0.3) : AppTheme.borderSubtle),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(
                rule.actionEnableAiAgent ? Icons.smart_toy_rounded : Icons.bolt_rounded,
                color: rule.isActive ? AppTheme.primary : AppTheme.textSecondary,
                size: 20,
              ),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  rule.name,
                  style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w700),
                  overflow: TextOverflow.ellipsis,
                ),
              ),
              Switch.adaptive(
                value: rule.isActive,
                activeTrackColor: AppTheme.primary,
                onChanged: (v) async {
                  await ref.read(socialApiProvider).toggleEngagementRule(rule.id);
                  ref.invalidate(engagementRulesProvider(projectId));
                  ref.invalidate(engagementStatsProvider(projectId));
                },
              ),
            ],
          ),
          const SizedBox(height: 8),

          // Keywords
          if (rule.triggerKeywords.isNotEmpty)
            Wrap(
              spacing: 6,
              runSpacing: 4,
              children: [
                for (final kw in rule.triggerKeywords)
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                    decoration: BoxDecoration(
                      color: AppTheme.primary.withValues(alpha: 0.15),
                      borderRadius: BorderRadius.circular(6),
                    ),
                    child: Text(
                      '# $kw',
                      style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: AppTheme.primary),
                    ),
                  ),
              ],
            ),
          const SizedBox(height: 10),

          // Details summary
          Row(
            children: [
              if (rule.actionAutoLike) ...[
                const Icon(Icons.favorite_rounded, size: 14, color: Colors.pinkAccent),
                const SizedBox(width: 4),
                const Text('Auto-Like', style: TextStyle(fontSize: 12, color: AppTheme.textSecondary)),
                const SizedBox(width: 12),
              ],
              if (rule.actionSendDm) ...[
                const Icon(Icons.chat_bubble_rounded, size: 14, color: AppTheme.accent),
                const SizedBox(width: 4),
                const Text('Auto-DM', style: TextStyle(fontSize: 12, color: AppTheme.textSecondary)),
                const SizedBox(width: 12),
              ],
              if (rule.actionEnableAiAgent) ...[
                const Icon(Icons.auto_awesome, size: 14, color: Colors.amber),
                const SizedBox(width: 4),
                const Text('AI Multi-Turn', style: TextStyle(fontSize: 12, color: Colors.amber)),
              ],
            ],
          ),

          if (rule.actionDmDeliverableUrl != null && rule.actionDmDeliverableUrl!.isNotEmpty) ...[
            const SizedBox(height: 8),
            Row(
              children: [
                const Icon(Icons.link_rounded, size: 14, color: AppTheme.textSecondary),
                const SizedBox(width: 4),
                Expanded(
                  child: Text(
                    rule.actionDmDeliverableUrl!,
                    style: const TextStyle(fontSize: 11, color: AppTheme.textSecondary, decoration: TextDecoration.underline),
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
              ],
            ),
          ],

          const Divider(height: 20, color: AppTheme.borderSubtle),

          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                '${rule.totalTriggered} triggered · ${rule.totalDmsSent} DMs sent',
                style: const TextStyle(fontSize: 12, color: AppTheme.textSecondary),
              ),
              IconButton(
                icon: const Icon(Icons.delete_outline_rounded, size: 18, color: AppTheme.error),
                onPressed: () async {
                  final ok = await confirm(context, title: 'Delete rule?', message: 'This automation rule will be permanently deleted.', action: 'Delete');
                  if (ok) {
                    await ref.read(socialApiProvider).deleteEngagementRule(rule.id);
                    ref.invalidate(engagementRulesProvider(projectId));
                    ref.invalidate(engagementStatsProvider(projectId));
                  }
                },
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _EngagementRuleFormSheet extends ConsumerStatefulWidget {
  const _EngagementRuleFormSheet({required this.projectId});
  final String projectId;

  @override
  ConsumerState<_EngagementRuleFormSheet> createState() => _EngagementRuleFormSheetState();
}

class _EngagementRuleFormSheetState extends ConsumerState<_EngagementRuleFormSheet> {
  final _nameCtl = TextEditingController();
  final _keywordsCtl = TextEditingController();
  final _dmTemplateCtl = TextEditingController(
    text: 'Hey {name}! Thanks for your comment. Here is your access link: {link} 🚀',
  );
  final _deliverableUrlCtl = TextEditingController();
  final _publicReplyCtl = TextEditingController(text: 'Sent to your DMs! Check your messages 🙌');

  bool _autoLike = true;
  final bool _sendDm = true;
  bool _enableAiAgent = false;
  final String _matchMode = 'contains';
  bool _saving = false;

  @override
  void dispose() {
    _nameCtl.dispose();
    _keywordsCtl.dispose();
    _dmTemplateCtl.dispose();
    _deliverableUrlCtl.dispose();
    _publicReplyCtl.dispose();
    super.dispose();
  }

  void _applyPreset(String preset) {
    if (preset == 'blueprint') {
      _nameCtl.text = 'Free Blueprint Lead Magnet';
      _keywordsCtl.text = 'BLUEPRINT, GUIDE, LINK, SEND';
      _dmTemplateCtl.text = 'Hey {name}! Here is your VIP Blueprint link: {link} 🚀 Let me know if you have any questions!';
      _deliverableUrlCtl.text = 'https://180workspace.com/blueprint';
      _publicReplyCtl.text = 'Sent to your DMs, {handle}! Check your inbox 🚀';
      setState(() {
        _autoLike = true;
        _enableAiAgent = true;
      });
    } else if (preset == 'support') {
      _nameCtl.text = 'AI Customer Support Bot';
      _keywordsCtl.text = 'HELP, SUPPORT, PRICING, COST';
      _dmTemplateCtl.text = 'Hi {name}! I am the 180 AI Assistant. How can I help you today? Check our options here: {link}';
      _deliverableUrlCtl.text = 'https://180workspace.com/pricing';
      _publicReplyCtl.text = 'Just messaged you with details! 🙌';
      setState(() {
        _autoLike = true;
        _enableAiAgent = true;
      });
    } else if (preset == 'promo') {
      _nameCtl.text = 'VIP Discount Promo Code';
      _keywordsCtl.text = 'DISCOUNT, PROMO, CODE, VIP';
      _dmTemplateCtl.text = 'Hey {name}! Use code VIP20 for 20% off your next purchase: {link} 🎉';
      _deliverableUrlCtl.text = 'https://180workspace.com/store';
      _publicReplyCtl.text = 'Code sent to your DM! Enjoy 🎉';
      setState(() {
        _autoLike = true;
        _enableAiAgent = false;
      });
    }
  }

  Future<void> _submit() async {
    final name = _nameCtl.text.trim();
    if (name.isEmpty) {
      showError(context, 'Rule name is required.');
      return;
    }

    final rawKeywords = _keywordsCtl.text
        .split(RegExp(r'[,\n]'))
        .map((k) => k.trim())
        .where((k) => k.isNotEmpty)
        .toList();

    setState(() => _saving = true);
    final data = {
      'name': name,
      'projectId': widget.projectId,
      'triggerType': 'comment_keyword',
      'triggerKeywords': rawKeywords,
      'matchMode': _matchMode,
      'actionAutoLike': _autoLike,
      'actionPublicReplies': [_publicReplyCtl.text.trim()],
      'actionSendDm': _sendDm,
      'actionDmTemplate': _dmTemplateCtl.text.trim(),
      'actionDmDeliverableUrl': _deliverableUrlCtl.text.trim().isEmpty ? null : _deliverableUrlCtl.text.trim(),
      'actionEnableAiAgent': _enableAiAgent,
      'aiAgentGoal': 'qualify_lead',
    };

    final rule = await guarded(context, () => ref.read(socialApiProvider).createEngagementRule(data));
    if (!mounted) return;
    setState(() => _saving = false);
    if (rule != null) {
      showInfo(context, 'Automation rule created!', color: AppTheme.success);
      ref.invalidate(engagementRulesProvider(widget.projectId));
      ref.invalidate(engagementStatsProvider(widget.projectId));
      Navigator.of(context).pop();
    }
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.only(
        left: 20,
        right: 20,
        top: 20,
        bottom: MediaQuery.of(context).viewInsets.bottom + 24,
      ),
      child: SingleChildScrollView(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisSize: MainAxisSize.min,
          children: [
            Row(
              children: [
                const Icon(Icons.bolt_rounded, color: AppTheme.primary),
                const SizedBox(width: 8),
                Text('Create Engagement Funnel', style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold)),
              ],
            ),
            const SizedBox(height: 12),
            const Text('Quick Preset Templates:', style: TextStyle(fontSize: 12, color: AppTheme.textSecondary, fontWeight: FontWeight.bold)),
            const SizedBox(height: 6),
            SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: Row(
                children: [
                  ActionChip(
                    avatar: const Icon(Icons.card_giftcard_rounded, size: 14, color: AppTheme.primary),
                    label: const Text('🎁 Blueprint Giveaway', style: TextStyle(fontSize: 11)),
                    onPressed: () => _applyPreset('blueprint'),
                  ),
                  const SizedBox(width: 8),
                  ActionChip(
                    avatar: const Icon(Icons.smart_toy_rounded, size: 14, color: AppTheme.accent),
                    label: const Text('💬 Support Bot', style: TextStyle(fontSize: 11)),
                    onPressed: () => _applyPreset('support'),
                  ),
                  const SizedBox(width: 8),
                  ActionChip(
                    avatar: const Icon(Icons.local_offer_rounded, size: 14, color: Colors.amber),
                    label: const Text('🏷️ VIP Promo Code', style: TextStyle(fontSize: 11)),
                    onPressed: () => _applyPreset('promo'),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),

            TextField(
              controller: _nameCtl,
              decoration: fieldDecoration('Rule Name *', hint: 'e.g. Reel Blueprint Giveaway'),
            ),
            const SizedBox(height: 12),

            TextField(
              controller: _keywordsCtl,
              decoration: fieldDecoration(
                'Trigger Keywords (comma separated) *',
                hint: 'e.g. BLUEPRINT, GUIDE, SCALE, SEND',
                helper: 'Triggers when a comment contains any of these keywords',
              ),
            ),
            const SizedBox(height: 12),

            SwitchListTile(
              contentPadding: EdgeInsets.zero,
              value: _autoLike,
              title: const Text('Auto-Like Comment'),
              subtitle: const Text('Likes the comment immediately to increase reach'),
              onChanged: (v) => setState(() => _autoLike = v),
            ),

            TextField(
              controller: _publicReplyCtl,
              decoration: fieldDecoration('Public Comment Reply', hint: 'e.g. Sent to your DM! Check your inbox 🚀'),
            ),
            const SizedBox(height: 12),

            TextField(
              controller: _deliverableUrlCtl,
              decoration: fieldDecoration('Deliverable / Link URL', hint: 'https://yoursite.com/resource'),
            ),
            const SizedBox(height: 12),

            TextField(
              controller: _dmTemplateCtl,
              maxLines: 3,
              decoration: fieldDecoration(
                'Direct Message Template *',
                hint: 'Hey {name}! Here is your link: {link}',
                helper: 'Use {name}, {handle}, {link} tokens',
              ),
            ),
            const SizedBox(height: 12),

            SwitchListTile(
              contentPadding: EdgeInsets.zero,
              value: _enableAiAgent,
              title: const Text('Enable AI Multi-Turn Agent'),
              subtitle: const Text('Autonomous AI qualifies lead and answers questions after DM deliverable'),
              onChanged: (v) => setState(() => _enableAiAgent = v),
            ),
            const SizedBox(height: 20),

            SizedBox(
              width: double.infinity,
              height: 48,
              child: FilledButton.icon(
                onPressed: _saving ? null : _submit,
                icon: _saving ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2)) : const Icon(Icons.check_rounded),
                label: Text(_saving ? 'Creating...' : 'Activate Automation Funnel'),
                style: FilledButton.styleFrom(backgroundColor: AppTheme.primary),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _DryRunTesterSheet extends ConsumerStatefulWidget {
  const _DryRunTesterSheet({required this.projectId});
  final String projectId;

  @override
  ConsumerState<_DryRunTesterSheet> createState() => _DryRunTesterSheetState();
}

class _DryRunTesterSheetState extends ConsumerState<_DryRunTesterSheet> {
  final _commentCtl = TextEditingController(text: 'Can you send me the free blueprint please?');
  String _selectedPlatform = 'instagram';
  bool _testing = false;
  Map<String, dynamic>? _testResult;

  @override
  void dispose() {
    _commentCtl.dispose();
    super.dispose();
  }

  Future<void> _runSimulation() async {
    final text = _commentCtl.text.trim();
    if (text.isEmpty) return;
    setState(() {
      _testing = true;
      _testResult = null;
    });

    final res = await guarded(
      context,
      () => ref.read(socialApiProvider).testEngagementMatch(
            platform: _selectedPlatform,
            text: text,
            senderHandle: 'prospect_jane',
          ),
    );

    if (mounted) {
      setState(() {
        _testing = false;
        _testResult = res;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final matched = _testResult != null && _testResult!['matched'] == true;
    final rule = _testResult?['rule'] as Map<String, dynamic>?;

    return Padding(
      padding: EdgeInsets.only(
        left: 20,
        right: 20,
        top: 20,
        bottom: MediaQuery.of(context).viewInsets.bottom + 24,
      ),
      child: SingleChildScrollView(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisSize: MainAxisSize.min,
          children: [
            Row(
              children: [
                const Icon(Icons.science_rounded, color: AppTheme.accent),
                const SizedBox(width: 8),
                Text('Test Automation Matcher', style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold)),
              ],
            ),
            const SizedBox(height: 8),
            const Text(
              'Simulate how incoming comments trigger auto-likes, public replies, and DMs before going live.',
              style: TextStyle(fontSize: 12, color: AppTheme.textSecondary),
            ),
            const SizedBox(height: 16),

            // Platform selector
            Wrap(
              spacing: 8,
              children: [
                for (final p in ['instagram', 'youtube', 'linkedin', 'threads', 'tiktok'])
                  ChoiceChip(
                    label: Text(p[0].toUpperCase() + p.substring(1)),
                    selected: _selectedPlatform == p,
                    onSelected: (v) => setState(() => _selectedPlatform = p),
                  ),
              ],
            ),
            const SizedBox(height: 12),

            TextField(
              controller: _commentCtl,
              maxLines: 2,
              decoration: fieldDecoration('Sample Incoming Comment', hint: 'e.g. Can you send me the blueprint?'),
            ),
            const SizedBox(height: 16),

            SizedBox(
              width: double.infinity,
              height: 44,
              child: FilledButton.icon(
                onPressed: _testing ? null : _runSimulation,
                icon: _testing
                    ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                    : const Icon(Icons.play_arrow_rounded),
                label: Text(_testing ? 'Evaluating Rules...' : 'Run Simulation'),
                style: FilledButton.styleFrom(backgroundColor: AppTheme.accent),
              ),
            ),
            const SizedBox(height: 16),

            if (_testResult != null) ...[
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: matched ? AppTheme.success.withValues(alpha: 0.1) : AppTheme.error.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: matched ? AppTheme.success.withValues(alpha: 0.4) : AppTheme.error.withValues(alpha: 0.4)),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Icon(matched ? Icons.check_circle_rounded : Icons.cancel_rounded, color: matched ? AppTheme.success : AppTheme.error, size: 20),
                        const SizedBox(width: 8),
                        Expanded(
                          child: Text(
                            matched ? 'Rule Matched: ${rule?['name'] ?? 'Active Rule'}' : 'No Rule Matched',
                            style: TextStyle(fontWeight: FontWeight.bold, color: matched ? AppTheme.success : AppTheme.error),
                          ),
                        ),
                      ],
                    ),
                    if (matched && rule != null) ...[
                      const SizedBox(height: 12),
                      const Text('Automated Action Sequence:', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                      const SizedBox(height: 6),
                      if (rule['actionAutoLike'] == true)
                        const Row(children: [
                          Icon(Icons.favorite, size: 14, color: Colors.pinkAccent),
                          SizedBox(width: 6),
                          Text('Auto-Like: Executed immediately', style: TextStyle(fontSize: 12)),
                        ]),
                      if (rule['actionPublicReplies'] != null && (rule['actionPublicReplies'] as List).isNotEmpty) ...[
                        const SizedBox(height: 4),
                        Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
                          const Icon(Icons.reply, size: 14, color: AppTheme.primary),
                          const SizedBox(width: 6),
                          Expanded(
                            child: Text(
                              'Public Reply: "${(rule['actionPublicReplies'] as List).first.toString().replaceAll('{handle}', '@prospect_jane')}"',
                              style: const TextStyle(fontSize: 12),
                            ),
                          ),
                        ]),
                      ],
                      if (rule['actionSendDm'] == true && rule['actionDmTemplate'] != null) ...[
                        const SizedBox(height: 4),
                        Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
                          const Icon(Icons.send_rounded, size: 14, color: AppTheme.accent),
                          const SizedBox(width: 6),
                          Expanded(
                            child: Text(
                              'Private DM: "${rule['actionDmTemplate'].toString().replaceAll('{name}', 'Jane').replaceAll('{handle}', '@prospect_jane').replaceAll('{link}', rule['actionDmDeliverableUrl'] ?? '')}"',
                              style: const TextStyle(fontSize: 12),
                            ),
                          ),
                        ]),
                      ],
                    ],
                  ],
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

