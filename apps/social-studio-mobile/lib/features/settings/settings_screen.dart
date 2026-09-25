import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import 'package:path_provider/path_provider.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../core/config/app_config.dart';
import '../../core/providers.dart';
import '../../core/theme/app_theme.dart';
import '../../core/theme/theme_provider.dart';
import '../../core/widgets/common.dart';
import '../auth/auth_provider.dart';

class SettingsScreen extends ConsumerStatefulWidget {
  const SettingsScreen({super.key});

  @override
  ConsumerState<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends ConsumerState<SettingsScreen> {
  bool _loadingDevices = true;
  List<Map<String, dynamic>> _devices = [];
  String? _currentDeviceId;
  String? _cacheSizeStr = 'Calculating...';
  bool _clearingCache = false;

  @override
  void initState() {
    super.initState();
    _loadDevices();
    _calcCacheSize();
  }

  Future<void> _loadDevices() async {
    setState(() => _loadingDevices = true);
    try {
      final reg = ref.read(deviceRegistrationProvider);
      final currentId = await reg.currentDeviceId;
      final list = await reg.listDevices();
      if (!mounted) return;
      setState(() {
        _currentDeviceId = currentId;
        _devices = list;
        _loadingDevices = false;
      });
    } catch (_) {
      if (mounted) setState(() => _loadingDevices = false);
    }
  }

  Future<void> _revokeDevice(String deviceId, String label) async {
    final ok = await confirm(
      context,
      title: 'Revoke device?',
      message: 'Are you sure you want to revoke "$label"? It will need to re-register on next launch.',
      action: 'Revoke',
    );
    if (!ok) return;

    try {
      await ref.read(deviceRegistrationProvider).revokeDevice(deviceId);
      if (!mounted) return;
      showSuccess(context, 'Device slot revoked.');
      await _loadDevices();
    } catch (e) {
      if (mounted) showError(context, 'Failed to revoke device: $e');
    }
  }

  Future<void> _calcCacheSize() async {
    try {
      final tempDir = await getTemporaryDirectory();
      int totalBytes = 0;
      if (tempDir.existsSync()) {
        final files = tempDir.listSync(recursive: true, followLinks: false);
        for (final f in files) {
          if (f is File) {
            totalBytes += await f.length();
          }
        }
      }
      if (!mounted) return;
      if (totalBytes < 1024 * 1024) {
        setState(() => _cacheSizeStr = '${(totalBytes / 1024).toStringAsFixed(1)} KB');
      } else {
        setState(() => _cacheSizeStr = '${(totalBytes / (1024 * 1024)).toStringAsFixed(1)} MB');
      }
    } catch (_) {
      if (mounted) setState(() => _cacheSizeStr = '0 KB');
    }
  }

  Future<void> _clearCache() async {
    setState(() => _clearingCache = true);
    try {
      final tempDir = await getTemporaryDirectory();
      if (tempDir.existsSync()) {
        final files = tempDir.listSync(recursive: true, followLinks: false);
        for (final f in files) {
          try {
            f.deleteSync(recursive: true);
          } catch (_) {}
        }
      }
      if (!mounted) return;
      setState(() {
        _clearingCache = false;
        _cacheSizeStr = '0 KB';
      });
      showSuccess(context, 'Temporary cache cleared.');
    } catch (e) {
      if (mounted) {
        setState(() => _clearingCache = false);
        showError(context, 'Error clearing cache: $e');
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final currentThemeMode = ref.watch(themeModeProvider);
    final session = ref.watch(sessionProvider).valueOrNull;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Settings'),
      ),
      body: ListView(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 20),
        children: [
          // Section: Appearance
          _sectionHeader(context, 'Appearance & Theme', Icons.palette_outlined),
          const SizedBox(height: 8),
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: Theme.of(context).cardColor,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: Theme.of(context).dividerColor),
            ),
            child: RadioGroup<ThemeMode>(
              groupValue: currentThemeMode,
              onChanged: (v) {
                if (v != null) ref.read(themeModeProvider.notifier).setThemeMode(v);
              },
              child: const Column(
                children: [
                  RadioListTile<ThemeMode>(
                    title: Text('Dark Mode (Obsidian)'),
                    subtitle: Text('OLED true black optimized for video editing'),
                    value: ThemeMode.dark,
                    activeColor: AppTheme.primary,
                  ),
                  RadioListTile<ThemeMode>(
                    title: Text('Light Mode'),
                    subtitle: Text('Clean slate aesthetic with sharp contrast'),
                    value: ThemeMode.light,
                    activeColor: AppTheme.primary,
                  ),
                  RadioListTile<ThemeMode>(
                    title: Text('System Default'),
                    subtitle: Text('Matches device OS settings'),
                    value: ThemeMode.system,
                    activeColor: AppTheme.primary,
                  ),
                ],
              ),
            ),
          ),

          const SizedBox(height: 24),

          // Section: Device Management
          _sectionHeader(context, 'Active Devices & Slots', Icons.devices_rounded),
          const SizedBox(height: 4),
          Text(
            'Maximum 5 registered devices. Older devices are automatically evicted on new logins.',
            style: TextStyle(fontSize: 12, color: Theme.of(context).textTheme.bodyMedium?.color),
          ),
          const SizedBox(height: 10),
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: Theme.of(context).cardColor,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: Theme.of(context).dividerColor),
            ),
            child: _loadingDevices
                ? const Padding(
                    padding: EdgeInsets.all(20),
                    child: Center(child: CircularProgressIndicator()),
                  )
                : _devices.isEmpty
                    ? const Padding(
                        padding: EdgeInsets.all(16),
                        child: Text('No active devices recorded.', style: TextStyle(color: AppTheme.textMuted)),
                      )
                    : Column(
                        children: [
                          for (int i = 0; i < _devices.length; i++) ...[
                            if (i > 0) const Divider(height: 1),
                            _buildDeviceTile(_devices[i]),
                          ],
                        ],
                      ),
          ),

          const SizedBox(height: 24),

          // Section: Storage & Cache
          _sectionHeader(context, 'Storage & Media Cache', Icons.storage_rounded),
          const SizedBox(height: 8),
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Theme.of(context).cardColor,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: Theme.of(context).dividerColor),
            ),
            child: Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text('Temporary Render & B-roll Cache', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 14)),
                      const SizedBox(height: 4),
                      Text('Current cache: $_cacheSizeStr', style: const TextStyle(fontSize: 12, color: AppTheme.textMuted)),
                    ],
                  ),
                ),
                FilledButton.tonal(
                  onPressed: _clearingCache ? null : _clearCache,
                  child: _clearingCache
                      ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2))
                      : const Text('Clear'),
                ),
              ],
            ),
          ),

          const SizedBox(height: 24),

          // Section: Platform & Production Status
          _sectionHeader(context, 'Platform & Production Readiness', Icons.verified_user_rounded),
          const SizedBox(height: 8),
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Theme.of(context).cardColor,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: Theme.of(context).dividerColor),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Container(width: 8, height: 8, decoration: const BoxDecoration(color: AppTheme.success, shape: BoxShape.circle)),
                    const SizedBox(width: 8),
                    const Expanded(
                      child: Text('Backend API Gateway', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
                    ),
                    const Text('ONLINE', style: TextStyle(color: AppTheme.success, fontSize: 11, fontWeight: FontWeight.bold)),
                  ],
                ),
                const SizedBox(height: 4),
                Text(AppConfig.apiBaseUrl, style: const TextStyle(fontSize: 11, color: AppTheme.textMuted)),
                const Divider(height: 20),
                Row(
                  children: [
                    Container(width: 8, height: 8, decoration: const BoxDecoration(color: AppTheme.accentBlue, shape: BoxShape.circle)),
                    const SizedBox(width: 8),
                    const Expanded(
                      child: Text('Meta Graph API (v21.0)', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
                    ),
                    const Text('PRODUCTION READY', style: TextStyle(color: AppTheme.accentBlue, fontSize: 10, fontWeight: FontWeight.bold)),
                  ],
                ),
                const SizedBox(height: 4),
                const Text('Instagram, Facebook, Threads, YouTube, TikTok channels', style: TextStyle(fontSize: 11, color: AppTheme.textMuted)),
                const Divider(height: 20),
                Row(
                  children: [
                    const Icon(Icons.info_outline_rounded, size: 14, color: AppTheme.textSecondary),
                    const SizedBox(width: 8),
                    const Expanded(
                      child: Text('180 Manager Mobile', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
                    ),
                    const Text('v1.0.0+1 Enterprise', style: TextStyle(fontSize: 11, color: AppTheme.textSecondary, fontWeight: FontWeight.w600)),
                  ],
                ),
              ],
            ),
          ),

          const SizedBox(height: 24),

          // Section: What's New & System Updates
          _sectionHeader(context, 'What\'s New & System Updates', Icons.auto_awesome_rounded),
          const SizedBox(height: 8),
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Theme.of(context).cardColor,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: Theme.of(context).dividerColor),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                _updateItem(
                  '🎬 Autonomous Video AI Director',
                  'Chat with the AI Director to splice footage, search unified Pexels/Pixabay stock B-roll, and auto-duck CC0 royalty-free soundtracks under speech.',
                ),
                const Divider(height: 16),
                _updateItem(
                  '📱 Real-Time Channel Previews',
                  'Interactive pixel-faithful previews for Instagram, TikTok 9:16, YouTube Shorts, LinkedIn, Facebook, and Twitter/X inside the post composer.',
                ),
                const Divider(height: 16),
                _updateItem(
                  '🤖 AI Autopilot Content Calendar',
                  'Multi-agent planner writes 30-day cross-platform schedules. Single-piece AI rewrite allows custom prompts on any calendar piece.',
                ),
                const Divider(height: 16),
                _updateItem(
                  '🎨 Brand Consciousness & Cloudflare R2',
                  'Full brand DNA management with direct logo upload to Cloudflare R2, hex palettes, typography, and Hormozi/Ali Abdaal caption styles.',
                ),
                const Divider(height: 16),
                _updateItem(
                  '🔗 Client Magic Link Approvals',
                  'Public client review portal with no-login required, allowing clients to leave feedback and approve entire content calendars in batch.',
                ),
              ],
            ),
          ),

          const SizedBox(height: 24),

          // Section: Account & Security
          _sectionHeader(context, 'Account & Privacy', Icons.shield_outlined),
          const SizedBox(height: 8),
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Theme.of(context).cardColor,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: Theme.of(context).dividerColor),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                if (session != null) ...[
                  Text(session.user.name, style: const TextStyle(fontSize: 15, fontWeight: FontWeight.bold)),
                  const SizedBox(height: 2),
                  Text('${session.user.email} • ${session.company.name}', style: const TextStyle(fontSize: 12, color: AppTheme.textMuted)),
                  const Divider(height: 24),
                ],
                ListTile(
                  contentPadding: EdgeInsets.zero,
                  leading: const Icon(Icons.delete_forever_rounded, color: AppTheme.error),
                  title: const Text('Delete Account & Data', style: TextStyle(color: AppTheme.error, fontWeight: FontWeight.w600)),
                  subtitle: const Text('Permanently delete account, published data, and tenant workspace.'),
                  trailing: const Icon(Icons.arrow_forward_ios_rounded, size: 14),
                  onTap: () async {
                    final uri = Uri.parse('https://180workspace.com/account-delete');
                    if (await canLaunchUrl(uri)) {
                      await launchUrl(uri, mode: LaunchMode.externalApplication);
                    }
                  },
                ),
              ],
            ),
          ),

          const SizedBox(height: 24),

          // Sign out button
          OutlinedButton.icon(
            style: OutlinedButton.styleFrom(
              foregroundColor: AppTheme.error,
              side: const BorderSide(color: AppTheme.error),
              minimumSize: const Size(double.infinity, 50),
            ),
            onPressed: () async {
              final ok = await confirm(
                context,
                title: 'Sign out?',
                message: 'Queued offline changes stay on this device until you sign back in.',
                action: 'Sign out',
              );
              if (ok) await ref.read(sessionProvider.notifier).logout();
            },
            icon: const Icon(Icons.logout_rounded),
            label: const Text('Sign out of 180 Workspace'),
          ),

          const SizedBox(height: 40),
        ],
      ),
    );
  }

  Widget _sectionHeader(BuildContext context, String title, IconData icon) {
    return Row(
      children: [
        Icon(icon, size: 18, color: AppTheme.primary),
        const SizedBox(width: 8),
        Text(title, style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w700, letterSpacing: -0.2)),
      ],
    );
  }

  Widget _buildDeviceTile(Map<String, dynamic> device) {
    final deviceId = device['deviceId']?.toString() ?? '';
    final label = device['label']?.toString() ?? 'Mobile Device';
    final platform = device['platform']?.toString().toLowerCase() ?? 'android';
    final isCurrent = deviceId == _currentDeviceId;
    final lastSeen = device['lastSeenAt'] != null
        ? DateTime.fromMillisecondsSinceEpoch((device['lastSeenAt'] as num).toInt())
        : null;

    final icon = platform.contains('ios') || platform.contains('apple')
        ? Icons.phone_iphone_rounded
        : platform.contains('android')
            ? Icons.phone_android_rounded
            : Icons.computer_rounded;

    return ListTile(
      contentPadding: const EdgeInsets.symmetric(horizontal: 4, vertical: 4),
      leading: CircleAvatar(
        backgroundColor: isCurrent ? AppTheme.primary.withValues(alpha: 0.2) : Theme.of(context).dividerColor,
        child: Icon(icon, color: isCurrent ? AppTheme.primary : AppTheme.textMuted, size: 20),
      ),
      title: Row(
        children: [
          Expanded(child: Text(label, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600))),
          if (isCurrent)
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
              decoration: BoxDecoration(
                color: AppTheme.primary.withValues(alpha: 0.2),
                borderRadius: BorderRadius.circular(6),
                border: Border.all(color: AppTheme.primary.withValues(alpha: 0.5)),
              ),
              child: const Text('THIS DEVICE', style: TextStyle(fontSize: 9, fontWeight: FontWeight.bold, color: AppTheme.primary)),
            ),
        ],
      ),
      subtitle: Text(
        lastSeen != null ? 'Last active: ${DateFormat('MMM d, h:mm a').format(lastSeen)}' : 'Registered device',
        style: const TextStyle(fontSize: 11, color: AppTheme.textMuted),
      ),
      trailing: isCurrent
          ? null
          : IconButton(
              icon: const Icon(Icons.remove_circle_outline_rounded, color: AppTheme.error, size: 20),
              tooltip: 'Revoke device',
              onPressed: () => _revokeDevice(deviceId, label),
            ),
    );
  }

  Widget _updateItem(String title, String description) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(title, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
          const SizedBox(height: 3),
          Text(description, style: const TextStyle(fontSize: 12, color: AppTheme.textSecondary, height: 1.35)),
        ],
      ),
    );
  }
}
