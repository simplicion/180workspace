import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/providers.dart';
import '../../core/theme/app_theme.dart';
import '../../core/widgets/common.dart';
import '../../core/widgets/universal_skeleton.dart';
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
      backgroundColor: AppTheme.surface,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(24))),
      builder: (_) => _EngagementRuleFormSheet(projectId: project.id),
    );
  }

  void _openDryRunSheet(BuildContext context, WidgetRef ref) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: AppTheme.surface,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(24))),
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
        icon: Icon(Icons.bolt_rounded),
        label: Text('New Automation'),
        backgroundColor: AppTheme.primary,
      ),
      body: RefreshIndicator(
        onRefresh: () async {
          ref.invalidate(engagementRulesProvider(project.id));
          ref.invalidate(engagementStatsProvider(project.id));
        },
        child: ListView(
          padding: EdgeInsets.fromLTRB(16, 16, 16, 100),
          children: [
            // Stats summary card
            statsAsync.when(
              data: (stats) => _buildStatsRow(context, stats),
              loading: () => SizedBox(height: 84, child: UniversalSkeleton(type: SkeletonType.metrics)),
              error: (err, _) => ErrorView(
                error: err,
                compact: true,
                onRetry: () => ref.invalidate(engagementStatsProvider(project.id)),
              ),
            ),
            _buildLiveMetricsCard(context, ref),
            SizedBox(height: 20),

            SectionHeader(
              'Active Funnels & Triggers',
              trailing: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    TextButton.icon(
                      onPressed: () => _openDryRunSheet(context, ref),
                      icon: Icon(Icons.science_rounded, size: 16, color: AppTheme.primary),
                      label: Text('Test Matcher', style: TextStyle(fontSize: 12, color: AppTheme.primary)),
                    ),
                    IconButton(
                      tooltip: 'Refresh',
                      icon: Icon(Icons.refresh_rounded, size: 20),
                      onPressed: () {
                        ref.invalidate(engagementRulesProvider(project.id));
                        ref.invalidate(engagementStatsProvider(project.id));
                        ref.invalidate(livePlatformMetricsProvider(project.id));
                      },
                    ),
                  ],
                ),
            ),
            SizedBox(height: 8),

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
                  physics: NeverScrollableScrollPhysics(),
                  itemCount: rules.length,
                  separatorBuilder: (_, _) => SizedBox(height: 12),
                  itemBuilder: (_, i) => _RuleCard(rule: rules[i], projectId: project.id),
                );
              },
              loading: () => UniversalSkeleton(type: SkeletonType.table),
              error: (err, _) => ErrorView(
                error: err,
                compact: true,
                onRetry: () => ref.invalidate(engagementRulesProvider(project.id)),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildStatsRow(BuildContext context, EngagementStats stats) {
    return Container(
      padding: EdgeInsets.all(16),
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
              Icon(Icons.insights_rounded, color: AppTheme.primary, size: 20),
              SizedBox(width: 8),
              Text('Automation Telemetry', style: Theme.of(context).textTheme.titleSmall?.copyWith(fontWeight: FontWeight.bold)),
            ],
          ),
          SizedBox(height: 16),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceAround,
            children: [
              _metricTile('Triggers', '${stats.totalTriggered}', Icons.touch_app_rounded, AppTheme.primary),
              _metricTile('DMs Sent', '${stats.totalDmsSent}', Icons.send_rounded, AppTheme.primary),
              _metricTile('Likes', '${stats.totalLiked}', Icons.favorite_rounded, AppTheme.primary),
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
        SizedBox(height: 4),
        Text(value, style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800)),
        Text(label, style: TextStyle(fontSize: 11, color: AppTheme.textSecondary)),
      ],
    );
  }

  Widget _buildLiveMetricsCard(BuildContext context, WidgetRef ref) {
    final metricsAsync = ref.watch(livePlatformMetricsProvider(project.id));
    return metricsAsync.when(
      data: (metrics) {
        if (metrics.isEmpty) return SizedBox.shrink();
        return Padding(
          padding: EdgeInsets.only(top: 14),
          child: Container(
            padding: EdgeInsets.all(14),
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
                    Icon(Icons.sensors_rounded, color: AppTheme.success, size: 18),
                    SizedBox(width: 8),
                    Text(
                      'Network metrics',
                      style: Theme.of(context).textTheme.titleSmall?.copyWith(fontWeight: FontWeight.bold),
                    ),
                  ],
                ),
                SizedBox(height: 10),
                for (final m in metrics) ...[
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        (m['platform'] as String? ?? 'channel').toUpperCase(),
                        style: TextStyle(fontWeight: FontWeight.w700, fontSize: 12),
                      ),
                      Text(
                        _metricLine(m),
                        style: TextStyle(fontSize: 11, color: AppTheme.textSecondary),
                      ),
                    ],
                  ),
                  SizedBox(height: 4),
                ],
              ],
            ),
          ),
        );
      },
      loading: () => SizedBox.shrink(),
      error: (_, _) => SizedBox.shrink(),
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
      padding: EdgeInsets.all(16),
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
              SizedBox(width: 8),
              Expanded(
                child: Text(
                  rule.name,
                  style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700),
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
          SizedBox(height: 8),

          // Keywords
          if (rule.triggerKeywords.isNotEmpty)
            Wrap(
              spacing: 6,
              runSpacing: 4,
              children: [
                for (final kw in rule.triggerKeywords)
                  Container(
                    padding: EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                    decoration: BoxDecoration(
                      color: AppTheme.primary.withValues(alpha: 0.15),
                      borderRadius: BorderRadius.circular(6),
                    ),
                    child: Text(
                      '# $kw',
                      style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: AppTheme.primary),
                    ),
                  ),
              ],
            ),
          SizedBox(height: 10),

          // Details summary
          Wrap(
            spacing: 0,
            runSpacing: 4,
            crossAxisAlignment: WrapCrossAlignment.center,
            children: [
              if (rule.actionAutoLike) ...[
                Icon(Icons.favorite_rounded, size: 14, color: AppTheme.accent),
                SizedBox(width: 4),
                Text('Auto-Like', style: TextStyle(fontSize: 12, color: AppTheme.textSecondary)),
                SizedBox(width: 12),
              ],
              if (rule.actionSendDm) ...[
                Icon(Icons.chat_bubble_rounded, size: 14, color: AppTheme.accent),
                SizedBox(width: 4),
                Text('Auto-DM', style: TextStyle(fontSize: 12, color: AppTheme.textSecondary)),
                SizedBox(width: 12),
              ],
              if (rule.actionEnableAiAgent) ...[
                Icon(Icons.auto_awesome, size: 14, color: AppTheme.warning),
                SizedBox(width: 4),
                Text('AI Multi-Turn', style: TextStyle(fontSize: 12, color: AppTheme.warning)),
              ],
            ],
          ),

          if (rule.actionDmDeliverableUrl != null && rule.actionDmDeliverableUrl!.isNotEmpty) ...[
            SizedBox(height: 8),
            Row(
              children: [
                Icon(Icons.link_rounded, size: 14, color: AppTheme.textSecondary),
                SizedBox(width: 4),
                Expanded(
                  child: Text(
                    rule.actionDmDeliverableUrl!,
                    style: TextStyle(fontSize: 11, color: AppTheme.textSecondary, decoration: TextDecoration.underline),
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
              ],
            ),
          ],

          Divider(height: 20, color: AppTheme.borderSubtle),

          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                '${rule.totalTriggered} triggered · ${rule.totalDmsSent} DMs sent',
                style: TextStyle(fontSize: 12, color: AppTheme.textSecondary),
              ),
              IconButton(
                icon: Icon(Icons.delete_outline_rounded, size: 18, color: AppTheme.error),
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
    text: 'Hey {name}! Thanks for your comment. Here is your access link: {link}',
  );
  final _deliverableUrlCtl = TextEditingController();
  final _publicReplyCtl = TextEditingController(text: 'Sent to your DMs! Check your messages');

  bool _autoLike = true;
  final bool _sendDm = true;
  bool _enableAiAgent = false;
  final String _matchMode = 'contains';
  bool _saving = false;
  String? _selectedPreset;

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
    setState(() => _selectedPreset = preset);
    if (preset == 'blueprint') {
      _nameCtl.text = 'Free Blueprint Lead Magnet';
      _keywordsCtl.text = 'BLUEPRINT, GUIDE, LINK, SEND';
      _dmTemplateCtl.text = 'Hey {name}! Here is your VIP Blueprint link: {link} Let me know if you have any questions!';
      _deliverableUrlCtl.text = 'https://180workspace.com/blueprint';
      _publicReplyCtl.text = 'Sent to your DMs, {handle}! Check your inbox';
      setState(() {
        _autoLike = true;
        _enableAiAgent = true;
      });
    } else if (preset == 'support') {
      _nameCtl.text = 'AI Customer Support Bot';
      _keywordsCtl.text = 'HELP, SUPPORT, PRICING, COST';
      _dmTemplateCtl.text = 'Hi {name}! I am the 180 AI Assistant. How can I help you today? Check our options here: {link}';
      _deliverableUrlCtl.text = 'https://180workspace.com/pricing';
      _publicReplyCtl.text = 'Just messaged you with details!';
      setState(() {
        _autoLike = true;
        _enableAiAgent = true;
      });
    } else if (preset == 'promo') {
      _nameCtl.text = 'VIP Discount Promo Code';
      _keywordsCtl.text = 'DISCOUNT, PROMO, CODE, VIP';
      _dmTemplateCtl.text = 'Hey {name}! Use code VIP20 for 20% off your next purchase: {link}';
      _deliverableUrlCtl.text = 'https://180workspace.com/store';
      _publicReplyCtl.text = 'Code sent to your DM! Enjoy';
      setState(() {
        _autoLike = true;
        _enableAiAgent = false;
      });
    }
  }

  void _insertToken(String token) {
    final text = _dmTemplateCtl.text;
    final selection = _dmTemplateCtl.selection;
    if (selection.isValid && selection.start >= 0 && selection.end >= 0) {
      final newText = text.replaceRange(selection.start, selection.end, token);
      _dmTemplateCtl.text = newText;
      _dmTemplateCtl.selection = TextSelection.collapsed(offset: selection.start + token.length);
    } else {
      _dmTemplateCtl.text = '$text $token'.trim();
      _dmTemplateCtl.selection = TextSelection.collapsed(offset: _dmTemplateCtl.text.length);
    }
    setState(() {});
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

  Widget _buildPresetButton(String id, String label, IconData icon) {
    final isSelected = _selectedPreset == id;
    return InkWell(
      onTap: () => _applyPreset(id),
      borderRadius: BorderRadius.circular(10),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 150),
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        decoration: BoxDecoration(
          color: isSelected ? AppTheme.primary.withValues(alpha: 0.15) : AppTheme.surfaceElevated,
          borderRadius: BorderRadius.circular(10),
          border: Border.all(
            color: isSelected ? AppTheme.primary : AppTheme.border,
            width: isSelected ? 1.5 : 1,
          ),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              icon,
              size: 15,
              color: isSelected ? AppTheme.primary : AppTheme.textSecondary,
            ),
            const SizedBox(width: 6),
            Text(
              label,
              style: TextStyle(
                fontSize: 12,
                fontWeight: isSelected ? FontWeight.bold : FontWeight.w500,
                color: isSelected ? AppTheme.primary : AppTheme.textPrimary,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildSectionCard({
    required IconData icon,
    required String title,
    required List<Widget> children,
  }) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppTheme.surfaceElevated,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppTheme.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(icon, size: 16, color: AppTheme.primary),
              const SizedBox(width: 8),
              Text(
                title.toUpperCase(),
                style: TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.w700,
                  letterSpacing: 0.8,
                  color: AppTheme.textMuted,
                ),
              ),
            ],
          ),
          const SizedBox(height: 14),
          ...children,
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      constraints: BoxConstraints(maxHeight: MediaQuery.of(context).size.height * 0.9),
      decoration: BoxDecoration(
        color: AppTheme.surface,
        borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          // Drag handle
          Center(
            child: Container(
              margin: const EdgeInsets.only(top: 10, bottom: 8),
              width: 36,
              height: 4,
              decoration: BoxDecoration(
                color: AppTheme.border,
                borderRadius: BorderRadius.circular(2),
              ),
            ),
          ),

          // Header
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
            child: Row(
              children: [
                Container(
                  width: 38,
                  height: 38,
                  decoration: BoxDecoration(
                    color: AppTheme.primary.withValues(alpha: 0.12),
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(color: AppTheme.primary.withValues(alpha: 0.3)),
                  ),
                  child: Icon(Icons.bolt_rounded, color: AppTheme.primary, size: 22),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Create Engagement Funnel',
                        style: TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.bold,
                          color: AppTheme.textPrimary,
                        ),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        'Turn comments into automated DM leads & responses',
                        style: TextStyle(fontSize: 12, color: AppTheme.textSecondary),
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

          // Scrollable Form Body
          Expanded(
            child: SingleChildScrollView(
              padding: EdgeInsets.only(
                left: 20,
                right: 20,
                top: 16,
                bottom: MediaQuery.of(context).viewInsets.bottom + 24,
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Presets header
                  Text(
                    'QUICK TEMPLATES',
                    style: TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.w700,
                      letterSpacing: 0.8,
                      color: AppTheme.textMuted,
                    ),
                  ),
                  const SizedBox(height: 8),
                  SingleChildScrollView(
                    scrollDirection: Axis.horizontal,
                    child: Row(
                      children: [
                        _buildPresetButton('blueprint', 'Blueprint Giveaway', Icons.card_giftcard_rounded),
                        const SizedBox(width: 8),
                        _buildPresetButton('support', 'Support Bot', Icons.smart_toy_rounded),
                        const SizedBox(width: 8),
                        _buildPresetButton('promo', 'VIP Promo Code', Icons.local_offer_rounded),
                      ],
                    ),
                  ),
                  const SizedBox(height: 20),

                  // Section 1: Trigger Configuration
                  _buildSectionCard(
                    icon: Icons.tune_rounded,
                    title: 'Trigger Configuration',
                    children: [
                      TextField(
                        controller: _nameCtl,
                        decoration: fieldDecoration(
                          'Rule Name *',
                          hint: 'e.g. Reel Blueprint Giveaway',
                          prefix: Icon(Icons.drive_file_rename_outline_rounded, size: 18, color: AppTheme.textSecondary),
                        ),
                      ),
                      const SizedBox(height: 14),
                      TextField(
                        controller: _keywordsCtl,
                        decoration: fieldDecoration(
                          'Trigger Keywords (comma separated) *',
                          hint: 'e.g. BLUEPRINT, GUIDE, SCALE, SEND',
                          helper: 'Triggers when a comment contains any of these keywords',
                          prefix: Icon(Icons.tag_rounded, size: 18, color: AppTheme.textSecondary),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),

                  // Section 2: Automation Actions & Deliverables
                  _buildSectionCard(
                    icon: Icons.flash_on_rounded,
                    title: 'Automation Actions & DM',
                    children: [
                      // Auto-Like Container
                      Container(
                        decoration: BoxDecoration(
                          color: AppTheme.surface,
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(color: AppTheme.border),
                        ),
                        child: SwitchListTile.adaptive(
                          contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 2),
                          value: _autoLike,
                          activeTrackColor: AppTheme.primary,
                          title: Text(
                            'Auto-Like Comment',
                            style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: AppTheme.textPrimary),
                          ),
                          subtitle: Text(
                            'Likes the comment immediately to increase algorithmic reach',
                            style: TextStyle(fontSize: 11, color: AppTheme.textSecondary),
                          ),
                          onChanged: (v) => setState(() => _autoLike = v),
                        ),
                      ),
                      const SizedBox(height: 14),

                      TextField(
                        controller: _publicReplyCtl,
                        decoration: fieldDecoration(
                          'Public Comment Reply',
                          hint: 'e.g. Sent to your DM! Check your inbox',
                          prefix: Icon(Icons.chat_bubble_outline_rounded, size: 18, color: AppTheme.textSecondary),
                        ),
                      ),
                      const SizedBox(height: 14),

                      TextField(
                        controller: _deliverableUrlCtl,
                        decoration: fieldDecoration(
                          'Deliverable / Link URL',
                          hint: 'https://yoursite.com/resource',
                          prefix: Icon(Icons.link_rounded, size: 18, color: AppTheme.textSecondary),
                        ),
                      ),
                      const SizedBox(height: 14),

                      TextField(
                        controller: _dmTemplateCtl,
                        maxLines: 3,
                        decoration: fieldDecoration(
                          'Direct Message Template *',
                          hint: 'Hey {name}! Here is your link: {link}',
                          prefix: Icon(Icons.mark_chat_unread_outlined, size: 18, color: AppTheme.textSecondary),
                        ),
                      ),
                      const SizedBox(height: 8),

                      // Interactive Token Pills
                      Row(
                        children: [
                          Text('Insert token: ', style: TextStyle(fontSize: 11, color: AppTheme.textMuted)),
                          const SizedBox(width: 4),
                          Wrap(
                            spacing: 6,
                            children: [
                              for (final token in ['{name}', '{handle}', '{link}'])
                                InkWell(
                                  onTap: () => _insertToken(token),
                                  borderRadius: BorderRadius.circular(6),
                                  child: Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 3),
                                    decoration: BoxDecoration(
                                      color: AppTheme.surface,
                                      borderRadius: BorderRadius.circular(6),
                                      border: Border.all(color: AppTheme.border),
                                    ),
                                    child: Text(
                                      '+ $token',
                                      style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: AppTheme.primary),
                                    ),
                                  ),
                                ),
                            ],
                          ),
                        ],
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),

                  // Section 3: Autonomous AI Agent
                  _buildSectionCard(
                    icon: Icons.psychology_outlined,
                    title: 'Autonomous AI Agent',
                    children: [
                      Container(
                        decoration: BoxDecoration(
                          color: AppTheme.surface,
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(color: AppTheme.border),
                        ),
                        child: SwitchListTile.adaptive(
                          contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 2),
                          value: _enableAiAgent,
                          activeTrackColor: AppTheme.primary,
                          title: Row(
                            children: [
                              Text(
                                'Enable AI Multi-Turn Agent',
                                style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: AppTheme.textPrimary),
                              ),
                              const SizedBox(width: 6),
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1),
                                decoration: BoxDecoration(
                                  color: AppTheme.primary.withValues(alpha: 0.15),
                                  borderRadius: BorderRadius.circular(4),
                                ),
                                child: Text(
                                  'PRO',
                                  style: TextStyle(fontSize: 9, fontWeight: FontWeight.bold, color: AppTheme.primary),
                                ),
                              ),
                            ],
                          ),
                          subtitle: Text(
                            'Autonomous AI qualifies lead and answers questions after DM deliverable',
                            style: TextStyle(fontSize: 11, color: AppTheme.textSecondary),
                          ),
                          onChanged: (v) => setState(() => _enableAiAgent = v),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 24),

                  // Submit Action Button
                  SizedBox(
                    width: double.infinity,
                    height: 50,
                    child: FilledButton.icon(
                      onPressed: _saving ? null : _submit,
                      icon: _saving
                          ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                          : const Icon(Icons.bolt_rounded, size: 20),
                      label: Text(
                        _saving ? 'Creating Funnel...' : 'Activate Automation Funnel',
                        style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w700),
                      ),
                      style: FilledButton.styleFrom(
                        backgroundColor: AppTheme.primary,
                        foregroundColor: Colors.white,
                        elevation: 0,
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                      ),
                    ),
                  ),
                  const SizedBox(height: 12),
                ],
              ),
            ),
          ),
        ],
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

    return Container(
      constraints: BoxConstraints(maxHeight: MediaQuery.of(context).size.height * 0.9),
      decoration: BoxDecoration(
        color: AppTheme.surface,
        borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          // Drag handle
          Center(
            child: Container(
              margin: const EdgeInsets.only(top: 10, bottom: 8),
              width: 36,
              height: 4,
              decoration: BoxDecoration(
                color: AppTheme.border,
                borderRadius: BorderRadius.circular(2),
              ),
            ),
          ),
          Expanded(
            child: SingleChildScrollView(
              padding: EdgeInsets.only(
                left: 20,
                right: 20,
                top: 8,
                bottom: MediaQuery.of(context).viewInsets.bottom + 24,
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Container(
                        width: 36,
                        height: 36,
                        decoration: BoxDecoration(
                          color: AppTheme.primary.withValues(alpha: 0.12),
                          borderRadius: BorderRadius.circular(10),
                          border: Border.all(color: AppTheme.primary.withValues(alpha: 0.3)),
                        ),
                        child: Icon(Icons.science_rounded, color: AppTheme.primary, size: 20),
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: Text(
                          'Test Automation Matcher',
                          style: TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.bold,
                            color: AppTheme.textPrimary,
                          ),
                        ),
                      ),
                      IconButton(
                        icon: Icon(Icons.close_rounded, size: 20, color: AppTheme.textSecondary),
                        onPressed: () => Navigator.of(context).pop(),
                        tooltip: 'Close',
                      ),
                    ],
                  ),
                  const SizedBox(height: 6),
                  Text(
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
                          selectedColor: AppTheme.primary.withValues(alpha: 0.15),
                          onSelected: (v) => setState(() => _selectedPlatform = p),
                        ),
                    ],
                  ),
                  const SizedBox(height: 14),

                  TextField(
                    controller: _commentCtl,
                    maxLines: 2,
                    decoration: fieldDecoration('Sample Incoming Comment', hint: 'e.g. Can you send me the blueprint?'),
                  ),
                  const SizedBox(height: 16),

                  SizedBox(
                    width: double.infinity,
                    height: 48,
                    child: FilledButton.icon(
                      onPressed: _testing ? null : _runSimulation,
                      icon: _testing
                          ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                          : const Icon(Icons.play_arrow_rounded),
                      label: Text(_testing ? 'Evaluating Rules...' : 'Run Simulation'),
                      style: FilledButton.styleFrom(
                        backgroundColor: AppTheme.primary,
                        foregroundColor: Colors.white,
                        elevation: 0,
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      ),
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
                            Text('Automated Action Sequence:', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: AppTheme.textPrimary)),
                            const SizedBox(height: 6),
                            if (rule['actionAutoLike'] == true)
                              Row(children: [
                                Icon(Icons.favorite, size: 14, color: AppTheme.primary),
                                const SizedBox(width: 6),
                                Text('Auto-like (where the platform allows it)', style: TextStyle(fontSize: 12, color: AppTheme.textSecondary)),
                              ]),
                            if (rule['actionPublicReplies'] != null && (rule['actionPublicReplies'] as List).isNotEmpty) ...[
                              const SizedBox(height: 4),
                              Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
                                Icon(Icons.reply, size: 14, color: AppTheme.primary),
                                const SizedBox(width: 6),
                                Expanded(
                                  child: Text(
                                    'Public Reply: "${(rule['actionPublicReplies'] as List).first.toString().replaceAll('{handle}', '@prospect_jane')}"',
                                    style: TextStyle(fontSize: 12, color: AppTheme.textSecondary),
                                  ),
                                ),
                              ]),
                            ],
                            if (rule['actionSendDm'] == true && rule['actionDmTemplate'] != null) ...[
                              const SizedBox(height: 4),
                              Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
                                Icon(Icons.send_rounded, size: 14, color: AppTheme.primary),
                                const SizedBox(width: 6),
                                Expanded(
                                  child: Text(
                                    'Private DM: "${rule['actionDmTemplate'].toString().replaceAll('{name}', 'Jane').replaceAll('{handle}', '@prospect_jane').replaceAll('{link}', rule['actionDmDeliverableUrl'] ?? '')}"',
                                    style: TextStyle(fontSize: 12, color: AppTheme.textSecondary),
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
          ),
        ],
      ),
    );
  }
}

/// One honest line per account: live numbers with their time, stored values labelled as such, or why they are unavailable.
String _metricLine(Map<String, dynamic> m) {
  String n(Object? v) => v is num ? v.toString() : '–';
  final parts = <String>['${n(m['followersCount'])} followers'];
  if (m['reach'] is num) parts.add('${n(m['reach'])} reach');
  if (m['views'] is num) parts.add('${n(m['views'])} views');
  if (m['engagements'] is num) parts.add('${n(m['engagements'])} engagements');
  final source = m['source'] as String? ?? 'stored';
  final at = DateTime.tryParse(m['fetchedAt'] as String? ?? '')?.toLocal();
  final when = at == null ? '' : ' · ${at.day}/${at.month} ${at.hour.toString().padLeft(2, '0')}:${at.minute.toString().padLeft(2, '0')}';
  final unavailable = m['unavailable'] is Map ? (m['unavailable'] as Map)['reason'] as String? : null;
  final label = source == 'live' ? 'live' : unavailable != null && unavailable != 'unsupported' ? 'unavailable: ${unavailable.replaceAll('_', ' ')}' : 'stored';
  return '${parts.join(' · ')} ($label$when)';
}
