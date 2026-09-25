import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/providers.dart';
import '../../core/theme/app_theme.dart';
import '../../core/widgets/common.dart';
import '../../data/models/project.dart';
import '../projects/project_provider.dart';

/// Project settings (`PUT /projects/:id`: name, description, status, services, socialSettings).
class SettingsTab extends ConsumerStatefulWidget {
  const SettingsTab({super.key, required this.project});
  final Project project;

  @override
  ConsumerState<SettingsTab> createState() => _SettingsTabState();
}

class _SettingsTabState extends ConsumerState<SettingsTab> {
  late final _name = TextEditingController(text: widget.project.name);
  late final _description = TextEditingController(text: widget.project.description ?? '');
  late ProjectStatus _status = widget.project.status == ProjectStatus.unknown ? ProjectStatus.inProgress : widget.project.status;
  late final Set<String> _services = {...widget.project.socialServices};
  late bool _approval = widget.project.settings.approvalRequired;
  late String _tz = widget.project.settings.defaultTimezone;
  late int _retention = widget.project.settings.storageRetentionDays;
  bool _saving = false;

  @override
  void dispose() {
    _name.dispose();
    _description.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    if (_name.text.trim().isEmpty) {
      showError(context, 'The project needs a name.');
      return;
    }
    setState(() => _saving = true);
    final settings = ProjectSettings(
      approvalRequired: _approval,
      defaultTimezone: _tz,
      storageRetentionDays: _retention,
      defaultReviewerId: widget.project.settings.defaultReviewerId,
    );
    final outcome = await guarded(
      context,
      () => ref.read(socialApiProvider).updateProject(widget.project.id, {
        'name': _name.text.trim(),
        'description': _description.text.trim(),
        'status': _status.id,
        'socialServices': _services.toList(),
        'socialSettings': settings.toJson(),
      }),
    );
    if (!mounted) return;
    setState(() => _saving = false);
    if (outcome == null) return;
    showMutation(context, outcome, 'Settings saved');
    ref.refreshProjectData(widget.project.id);
  }

  Future<void> _delete() async {
    final ok = await confirm(context,
        title: 'Delete ${widget.project.name}?',
        message: 'The project is archived for everyone in the workspace. Posts and calendars stay on the server.',
        action: 'Delete',
        destructive: true);
    if (!ok || !mounted) return;
    final done = await guarded(context, () async {
      await ref.read(socialApiProvider).deleteProject(widget.project.id);
      return true;
    });
    if (done != true || !mounted) return;
    if (ref.read(activeProjectIdProvider) == widget.project.id) await ref.read(activeProjectIdProvider.notifier).select(null);
    ref.invalidate(allProjectsProvider);
    if (mounted) context.go('/home');
  }

  @override
  Widget build(BuildContext context) {
    final tzOptions = {...timezoneOptions, _tz}.toList();
    return ListView(padding: const EdgeInsets.fromLTRB(16, 12, 16, 96), children: [
      TextField(controller: _name, decoration: fieldDecoration('Project name')),
      const SizedBox(height: 12),
      TextField(controller: _description, minLines: 2, maxLines: 5, decoration: fieldDecoration('Description')),
      const SizedBox(height: 12),
      DropdownButtonFormField<ProjectStatus>(
        initialValue: _status,
        decoration: fieldDecoration('Status'),
        items: [for (final s in ProjectStatus.editable) DropdownMenuItem(value: s, child: Text(s.label))],
        onChanged: (v) => setState(() => _status = v ?? _status),
      ),
      const SectionHeader('Services'),
      Wrap(spacing: 8, runSpacing: 8, children: [
        for (final e in socialServiceOptions.entries)
          FilterChip(
            label: Text(e.value),
            selected: _services.contains(e.key),
            onSelected: (on) => setState(() => on ? _services.add(e.key) : _services.remove(e.key)),
          ),
      ]),
      const SectionHeader('Workflow'),
      SwitchListTile(
        contentPadding: EdgeInsets.zero,
        value: _approval,
        onChanged: (v) => setState(() => _approval = v),
        title: const Text('Client approval required'),
        subtitle: const Text('Posts must be approved before they publish'),
      ),
      DropdownButtonFormField<String>(
        initialValue: _tz,
        decoration: fieldDecoration('Default timezone'),
        items: [for (final t in tzOptions) DropdownMenuItem(value: t, child: Text(t))],
        onChanged: (v) => setState(() => _tz = v ?? _tz),
      ),
      const SizedBox(height: 12),
      DropdownButtonFormField<int>(
        initialValue: _retention,
        decoration: fieldDecoration('Keep raw footage for'),
        items: [for (final d in {7, 14, 30, 60, 90, _retention}) DropdownMenuItem(value: d, child: Text('$d days'))],
        onChanged: (v) => setState(() => _retention = v ?? _retention),
      ),
      const SizedBox(height: 24),
      ElevatedButton(
        onPressed: _saving ? null : _save,
        child: _saving ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2)) : const Text('Save settings'),
      ),
      const SectionHeader('Danger zone'),
      OutlinedButton.icon(
        style: OutlinedButton.styleFrom(foregroundColor: AppTheme.error, side: const BorderSide(color: AppTheme.error)),
        onPressed: _delete,
        icon: const Icon(Icons.delete_forever_rounded),
        label: const Text('Delete project'),
      ),
    ]);
  }
}
