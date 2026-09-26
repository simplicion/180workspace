import 'package:flutter/material.dart';

import '../../core/theme/app_theme.dart';
import '../../core/widgets/common.dart';
import '../../data/models/brand_voice.dart';

/// Editable brand identity: tone, audience, pillars, restricted words, hooks, CTAs, hashtags,
/// sample viral posts, and visual identity (colors, fonts, caption styles).
class BrandVoiceForm extends StatefulWidget {
  const BrandVoiceForm({
    super.key,
    required this.initial,
    required this.onChanged,
    this.onUploadLogo,
  });

  final BrandVoice initial;
  final ValueChanged<BrandVoice> onChanged;
  final VoidCallback? onUploadLogo;

  @override
  State<BrandVoiceForm> createState() => _BrandVoiceFormState();
}

class _BrandVoiceFormState extends State<BrandVoiceForm> {
  late final _tone = TextEditingController(text: widget.initial.tone);
  late final _audience = TextEditingController(text: widget.initial.targetAudience);
  late final _pillars = TextEditingController(text: widget.initial.contentPillars.join(', '));
  late final _forbidden = TextEditingController(text: widget.initial.forbiddenWords.join(', '));
  late final _ctas = TextEditingController(text: widget.initial.standardCtas.join('\n'));
  late final _hashtags = TextEditingController(text: widget.initial.defaultHashtags.join(' '));
  late final _hookStyle = TextEditingController(text: widget.initial.hookStyle);
  late final _hooks = TextEditingController(text: widget.initial.hooks.join('\n'));
  late final _samples = TextEditingController(text: widget.initial.sampleViralPosts.join('\n---\n'));
  // Start empty: only what the user chooses is saved (the server drops invented defaults).
  late final _primaryColor = TextEditingController(text: widget.initial.primaryColor ?? '');
  late final _accentColor = TextEditingController(text: widget.initial.accentColor ?? '');
  late String? _font = widget.initial.font;
  late String? _captionStyle = widget.initial.captionStylePreset;

  @override
  void dispose() {
    for (final c in [
      _tone,
      _audience,
      _pillars,
      _forbidden,
      _ctas,
      _hashtags,
      _hookStyle,
      _hooks,
      _samples,
      _primaryColor,
      _accentColor,
    ]) {
      c.dispose();
    }
    super.dispose();
  }

  void _emit() {
    widget.onChanged(widget.initial.copyWith(
      tone: _tone.text.trim(),
      targetAudience: _audience.text.trim(),
      contentPillars: splitList(_pillars.text),
      forbiddenWords: splitList(_forbidden.text),
      standardCtas: _ctas.text.split('\n').map((s) => s.trim()).where((s) => s.isNotEmpty).toList(),
      defaultHashtags: _hashtags.text
          .split(RegExp(r'[\s,]+'))
          .map((s) => s.trim())
          .where((s) => s.isNotEmpty)
          .map((s) => s.startsWith('#') ? s : '#$s')
          .toList(),
      hookStyle: _hookStyle.text.trim(),
      hooks: _hooks.text.split('\n').map((s) => s.trim()).where((s) => s.isNotEmpty).toList(),
      sampleViralPosts: _samples.text
          .split(RegExp(r'\n-{3,}\n'))
          .map((s) => s.trim())
          .where((s) => s.isNotEmpty)
          .take(5)
          .toList(),
      primaryColor: _primaryColor.text.trim().isEmpty ? null : _primaryColor.text.trim(),
      accentColor: _accentColor.text.trim().isEmpty ? null : _accentColor.text.trim(),
      font: _font,
      captionStylePreset: _captionStyle,
    ));
  }

  Widget _field(TextEditingController c, String label, {String? hint, int maxLines = 1, String? helper}) => Padding(
        padding: const EdgeInsets.only(bottom: 14),
        child: TextField(
          controller: c,
          maxLines: maxLines,
          minLines: 1,
          onChanged: (_) => _emit(),
          decoration: fieldDecoration(label, hint: hint, helper: helper),
        ),
      );

  Color? _parseColor(String hex) {
    final clean = hex.replaceAll('#', '').trim();
    if (clean.length == 6) {
      final val = int.tryParse('FF$clean', radix: 16);
      if (val != null) return Color(val);
    }
    return null;
  }

  @override
  Widget build(BuildContext context) {
    final pColor = _parseColor(_primaryColor.text) ?? AppTheme.primary;
    final aColor = _parseColor(_accentColor.text) ?? AppTheme.accent;

    return Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
      // Logo and Visual Identity Card
      SectionCard(
        child: Row(
          children: [
            Container(
              width: 56,
              height: 56,
              decoration: BoxDecoration(
                color: AppTheme.surfaceElevated,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: AppTheme.border),
                image: widget.initial.logoUrl != null
                    ? DecorationImage(image: NetworkImage(widget.initial.logoUrl!), fit: BoxFit.contain)
                    : null,
              ),
              child: widget.initial.logoUrl == null
                  ? const Icon(Icons.business_rounded, color: AppTheme.textSecondary, size: 28)
                  : null,
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('Brand Logo', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                  Text(
                    widget.initial.logoUrl != null ? 'Stored in Cloudflare R2' : 'PNG, JPEG, WebP or SVG',
                    style: const TextStyle(fontSize: 11, color: AppTheme.textMuted),
                  ),
                ],
              ),
            ),
            if (widget.onUploadLogo != null)
              FilledButton.tonalIcon(
                onPressed: widget.onUploadLogo,
                icon: const Icon(Icons.upload_rounded, size: 16),
                label: Text(widget.initial.logoUrl != null ? 'Change' : 'Upload'),
              ),
          ],
        ),
      ),
      const SizedBox(height: 16),

      // Brand Colors & Styling
      const SectionHeader('Visual Identity & Aesthetics'),
      Row(
        children: [
          Expanded(
            child: TextField(
              controller: _primaryColor,
              onChanged: (_) => _emit(),
              decoration: fieldDecoration(
                'Primary Color',
                prefix: Container(
                  width: 16,
                  height: 16,
                  margin: const EdgeInsets.only(left: 10, right: 8),
                  decoration: BoxDecoration(color: pColor, shape: BoxShape.circle),
                ),
              ),
            ),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: TextField(
              controller: _accentColor,
              onChanged: (_) => _emit(),
              decoration: fieldDecoration(
                'Accent Color',
                prefix: Container(
                  width: 16,
                  height: 16,
                  margin: const EdgeInsets.only(left: 10, right: 8),
                  decoration: BoxDecoration(color: aColor, shape: BoxShape.circle),
                ),
              ),
            ),
          ),
        ],
      ),
      const SizedBox(height: 12),
      DropdownButtonFormField<String?>(
        isExpanded: true,
        initialValue: BrandVoice.fontPresets.contains(_font) ? _font : null,
        decoration: fieldDecoration('Typography Font'),
        items: [
          const DropdownMenuItem<String?>(value: null, child: Text('Not chosen')),
          for (final f in BrandVoice.fontPresets) DropdownMenuItem(value: f, child: Text(f, overflow: TextOverflow.ellipsis)),
        ],
        onChanged: (v) {
          setState(() => _font = v);
          _emit();
        },
      ),
      const SizedBox(height: 12),
      DropdownButtonFormField<String?>(
        isExpanded: true,
        initialValue: BrandVoice.captionStylePresets.contains(_captionStyle) ? _captionStyle : null,
        decoration: fieldDecoration('Caption Styling Preset'),
        items: [
          const DropdownMenuItem<String?>(value: null, child: Text('Not chosen')),
          for (final s in BrandVoice.captionStylePresets)
            DropdownMenuItem(value: s, child: Text(s.replaceAll('_', ' '), overflow: TextOverflow.ellipsis)),
        ],
        onChanged: (v) {
          setState(() => _captionStyle = v);
          _emit();
        },
      ),
      const SizedBox(height: 18),

      // Tone Presets
      const SectionHeader('Tone & Persona'),
      Wrap(spacing: 8, runSpacing: 8, children: [
        for (final preset in BrandVoice.tonePresets)
          ChoiceChip(
            label: Text(preset),
            selected: _tone.text == preset,
            onSelected: (_) {
              setState(() => _tone.text = preset);
              _emit();
            },
          ),
      ]),
      const SizedBox(height: 14),
      _field(_tone, 'Tone of voice', hint: 'e.g. Bold & energetic, never salesy'),
      _field(_audience, 'Target audience', hint: 'Who are we talking to?', maxLines: 3),
      _field(_pillars, 'Content pillars', helper: 'Comma separated, e.g. Education, Behind the scenes, Offers'),
      _field(_forbidden, 'Restricted words', helper: 'Comma separated. Captions using these are flagged before publishing.'),
      _field(_hookStyle, 'Hook style', hint: 'e.g. Question-led, contrarian, number-driven'),
      _field(_hooks, 'Signature hooks', helper: 'One per line', maxLines: 4),
      _field(_ctas, 'Standard calls to action', helper: 'One per line', maxLines: 3),
      _field(_hashtags, 'Default hashtags', hint: '#brand #niche'),
      _field(_samples, 'Sample viral posts (up to 5)', helper: 'Separate posts with a line containing ---', maxLines: 6),
    ]);
  }
}
