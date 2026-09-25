import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/network/social_api_client.dart';
import '../../core/providers.dart';
import '../../core/widgets/common.dart';
import '../../data/models/brand_voice.dart';
import '../../data/models/project.dart';
import '../../data/models/social_account.dart';
import 'brand_voice_form.dart';
import 'project_provider.dart';

final clientsProvider = FutureProvider.autoDispose<List<ClientRef>>((ref) => ref.watch(socialApiProvider).listClients());
final _accountsProvider = FutureProvider.autoDispose<List<SocialAccount>>((ref) => ref.watch(socialApiProvider).listAccounts());

/// New project wizard (web create modal): basics & client → services → brand → channels & workflow.
class CreateProjectScreen extends ConsumerStatefulWidget {
  const CreateProjectScreen({super.key});

  @override
  ConsumerState<CreateProjectScreen> createState() => _CreateProjectScreenState();
}

class _CreateProjectScreenState extends ConsumerState<CreateProjectScreen> {
  int _step = 0;
  bool _saving = false;
  final _name = TextEditingController();
  final _description = TextEditingController();
  final _clientName = TextEditingController();
  final _clientEmail = TextEditingController();
  String? _clientId;
  bool _newClient = false;
  final Set<String> _services = {'content_calendar', 'short_form_video', 'publishing'};
  BrandVoice _voice = const BrandVoice(projectId: '');
  final Set<String> _accountIds = {};
  bool _approval = true;
  String _tz = 'UTC';

  @override
  void initState() {
    super.initState();
    final local = DateTime.now().timeZoneName;
    _tz = timezoneOptions.firstWhere((t) => t.endsWith(local), orElse: () => 'UTC');
  }

  @override
  void dispose() {
    for (final c in [_name, _description, _clientName, _clientEmail]) {
      c.dispose();
    }
    super.dispose();
  }

  String? _validate() {
    if (_step == 0) {
      if (_name.text.trim().isEmpty) return 'Give the project a name.';
      if (_newClient && _clientName.text.trim().isEmpty) return 'Enter the client name, or choose "No client".';
      final email = _clientEmail.text.trim();
      if (_newClient && email.isNotEmpty && !RegExp(r'^[^@\s]+@[^@\s]+\.[^@\s]+$').hasMatch(email)) return 'That client email does not look right.';
    }
    return null;
  }

  Future<void> _create() async {
    setState(() => _saving = true);
    final input = CreateProjectInput(
      name: _name.text,
      description: _description.text,
      clientId: _newClient ? null : _clientId,
      clientName: _newClient ? _clientName.text : null,
      clientEmail: _newClient ? _clientEmail.text : null,
      socialServices: _services.toList(),
      brandVoice: _voice,
      connectedAccountIds: _accountIds.toList(),
      settings: ProjectSettings(approvalRequired: _approval, defaultTimezone: _tz),
    );
    final project = await guarded(context, () => ref.read(socialApiProvider).createProject(input));
    if (!mounted) return;
    setState(() => _saving = false);
    if (project == null) return;
    ref.invalidate(allProjectsProvider);
    ref.invalidate(projectListProvider);
    await ref.read(activeProjectIdProvider.notifier).select(project.id);
    if (!mounted) return;
    showInfo(context, '${project.name} created');
    context.go('/home');
  }

  @override
  Widget build(BuildContext context) {
    final clients = ref.watch(clientsProvider);
    final accounts = ref.watch(_accountsProvider);
    return Scaffold(
      appBar: AppBar(title: const Text('New project')),
      body: Stepper(
        currentStep: _step,
        onStepTapped: (i) => i < _step ? setState(() => _step = i) : null,
        onStepCancel: _step == 0 ? null : () => setState(() => _step--),
        onStepContinue: () {
          final err = _validate();
          if (err != null) return showError(context, err);
          if (_step < 3) {
            setState(() => _step++);
          } else {
            _create();
          }
        },
        controlsBuilder: (context, d) => Padding(
          padding: const EdgeInsets.only(top: 16),
          child: Row(children: [
            FilledButton(
              onPressed: _saving ? null : d.onStepContinue,
              child: _saving
                  ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2))
                  : Text(_step == 3 ? 'Create project' : 'Next'),
            ),
            if (d.onStepCancel != null) TextButton(onPressed: d.onStepCancel, child: const Text('Back')),
          ]),
        ),
        steps: [
          Step(
            title: const Text('Project & client'),
            isActive: _step >= 0,
            content: Column(children: [
              TextField(controller: _name, autofocus: true, decoration: fieldDecoration('Project name *', hint: 'e.g. Apex Gym – Q4 social')),
              const SizedBox(height: 12),
              TextField(controller: _description, minLines: 1, maxLines: 3, decoration: fieldDecoration('Description')),
              const SizedBox(height: 12),
              SegmentedButton<bool>(
                segments: const [ButtonSegment(value: false, label: Text('Existing / no client')), ButtonSegment(value: true, label: Text('New client'))],
                selected: {_newClient},
                onSelectionChanged: (s) => setState(() => _newClient = s.first),
              ),
              const SizedBox(height: 12),
              if (_newClient) ...[
                TextField(controller: _clientName, decoration: fieldDecoration('Client name *')),
                const SizedBox(height: 12),
                TextField(controller: _clientEmail, keyboardType: TextInputType.emailAddress, decoration: fieldDecoration('Client email', helper: 'Used for review links')),
              ] else
                clients.when(
                  loading: () => const LinearProgressIndicator(),
                  error: (e, _) => ErrorView(error: e, compact: true, onRetry: () => ref.invalidate(clientsProvider)),
                  data: (list) => DropdownButtonFormField<String?>(
                    isExpanded: true,
                    initialValue: _clientId,
                    decoration: fieldDecoration('Client', helper: 'Without a client, review links cannot be sent.'),
                    items: [
                      const DropdownMenuItem(value: null, child: Text('No client (internal)')),
                      for (final c in list) DropdownMenuItem(value: c.id, child: Text(c.name, overflow: TextOverflow.ellipsis)),
                    ],
                    onChanged: (v) => setState(() => _clientId = v),
                  ),
                ),
            ]),
          ),
          Step(
            title: const Text('Services'),
            isActive: _step >= 1,
            content: Wrap(spacing: 8, runSpacing: 8, children: [
              for (final e in socialServiceOptions.entries)
                FilterChip(
                  label: Text(e.value),
                  selected: _services.contains(e.key),
                  onSelected: (on) => setState(() => on ? _services.add(e.key) : _services.remove(e.key)),
                ),
            ]),
          ),
          Step(
            title: const Text('Brand identity'),
            subtitle: const Text('Optional, and editable later'),
            isActive: _step >= 2,
            content: BrandVoiceForm(initial: _voice, onChanged: (v) => _voice = v),
          ),
          Step(
            title: const Text('Channels & workflow'),
            isActive: _step >= 3,
            content: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              accounts.when(
                loading: () => const LinearProgressIndicator(),
                error: (e, _) => ErrorView(error: e, compact: true, onRetry: () => ref.invalidate(_accountsProvider)),
                data: (list) => list.isEmpty
                    ? const Text('No channels connected yet. Connect them later from the project\'s Channels section.')
                    : Column(children: [
                        for (final a in list)
                          CheckboxListTile(
                            contentPadding: EdgeInsets.zero,
                            value: _accountIds.contains(a.id),
                            onChanged: (v) => setState(() => v == true ? _accountIds.add(a.id) : _accountIds.remove(a.id)),
                            secondary: Icon(a.platform.icon, color: a.platform.color),
                            title: Text(a.accountName),
                            subtitle: Text(a.projectName == null ? a.platform.label : '${a.platform.label} · now in ${a.projectName}'),
                          ),
                      ]),
              ),
              SwitchListTile(
                contentPadding: EdgeInsets.zero,
                value: _approval,
                onChanged: (v) => setState(() => _approval = v),
                title: const Text('Client approval required'),
              ),
              DropdownButtonFormField<String>(
                initialValue: _tz,
                decoration: fieldDecoration('Timezone'),
                items: [for (final t in timezoneOptions) DropdownMenuItem(value: t, child: Text(t))],
                onChanged: (v) => setState(() => _tz = v ?? _tz),
              ),
            ]),
          ),
        ],
      ),
    );
  }
}
