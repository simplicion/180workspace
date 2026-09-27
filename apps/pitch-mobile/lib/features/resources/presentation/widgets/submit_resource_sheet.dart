import 'package:flutter/material.dart';
import '../../../../core/theme/pitch_theme.dart';
import '../../models/resource_model.dart';

class SubmitResourceSheet extends StatefulWidget {
  final ValueChanged<PitchResource> onResourceSubmitted;

  const SubmitResourceSheet({super.key, required this.onResourceSubmitted});

  static void show(BuildContext context,
      {required ValueChanged<PitchResource> onResourceSubmitted}) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) =>
          SubmitResourceSheet(onResourceSubmitted: onResourceSubmitted),
    );
  }

  @override
  State<SubmitResourceSheet> createState() => _SubmitResourceSheetState();
}

class _SubmitResourceSheetState extends State<SubmitResourceSheet> {
  final _titleController = TextEditingController();
  final _urlController = TextEditingController();
  final _descController = TextEditingController();
  final _tagsController = TextEditingController();

  String _category = 'dev_tools';
  String _pricing = 'Free';

  final List<String> _categories = [
    'dev_tools',
    'ai',
    'funding',
    'growth',
    'legal',
    'design',
  ];

  final List<String> _pricingOptions = [
    'Free',
    'Freemium',
    'Open Source',
    'Paid',
  ];

  @override
  void dispose() {
    _titleController.dispose();
    _urlController.dispose();
    _descController.dispose();
    _tagsController.dispose();
    super.dispose();
  }

  void _submit() {
    final title = _titleController.text.trim();
    final url = _urlController.text.trim();
    if (title.isEmpty || url.isEmpty) return;

    final rawTags = _tagsController.text
        .split(',')
        .map((s) => s.trim())
        .where((s) => s.isNotEmpty)
        .toList();

    final resource = PitchResource(
      id: 'res_${DateTime.now().millisecondsSinceEpoch}',
      title: title,
      description: _descController.text.trim().isNotEmpty
          ? _descController.text.trim()
          : 'High impact startup resource curated for founders.',
      url: url.startsWith('http') ? url : 'https://$url',
      category: _category,
      tags: rawTags.isNotEmpty ? rawTags : ['#StartupTool'],
      pricing: _pricing,
      submittedBy: 'Alex Rivers',
      upvotes: 1,
      isUpvoted: true,
    );

    widget.onResourceSubmitted(resource);
    Navigator.pop(context);
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: EdgeInsets.only(
        left: 20,
        right: 20,
        top: 16,
        bottom: MediaQuery.of(context).viewInsets.bottom + 24,
      ),
      decoration: const BoxDecoration(
        color: PitchTheme.surface,
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
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
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text(
                'Submit Startup Tool',
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
          const Divider(height: 1, color: Color(0x1AFFFFFF)),
          const SizedBox(height: 14),

          _buildField(
            controller: _titleController,
            label: 'Tool / Resource Name',
            hint: 'e.g. PostHog, Supabase, YC Safe Generator',
          ),
          const SizedBox(height: 12),

          _buildField(
            controller: _urlController,
            label: 'Website URL',
            hint: 'https://...',
            keyboardType: TextInputType.url,
          ),
          const SizedBox(height: 12),

          _buildField(
            controller: _descController,
            label: 'Brief Description',
            hint: 'What founder problem does this solve?',
            maxLines: 2,
          ),
          const SizedBox(height: 12),

          Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text('Category',
                        style: TextStyle(
                            color: Colors.white,
                            fontSize: 12,
                            fontWeight: FontWeight.w700)),
                    const SizedBox(height: 6),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 12),
                      decoration: BoxDecoration(
                        color: PitchTheme.surfaceElevated,
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: DropdownButtonHideUnderline(
                        child: DropdownButton<String>(
                          value: _category,
                          dropdownColor: PitchTheme.surfaceElevated,
                          style: const TextStyle(
                              color: Colors.white, fontSize: 13),
                          isExpanded: true,
                          items: _categories.map((c) {
                            return DropdownMenuItem(
                              value: c,
                              child: Text(c.toUpperCase()),
                            );
                          }).toList(),
                          onChanged: (val) {
                            if (val != null) setState(() => _category = val);
                          },
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text('Pricing',
                        style: TextStyle(
                            color: Colors.white,
                            fontSize: 12,
                            fontWeight: FontWeight.w700)),
                    const SizedBox(height: 6),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 12),
                      decoration: BoxDecoration(
                        color: PitchTheme.surfaceElevated,
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: DropdownButtonHideUnderline(
                        child: DropdownButton<String>(
                          value: _pricing,
                          dropdownColor: PitchTheme.surfaceElevated,
                          style: const TextStyle(
                              color: Colors.white, fontSize: 13),
                          isExpanded: true,
                          items: _pricingOptions.map((p) {
                            return DropdownMenuItem(
                              value: p,
                              child: Text(p),
                            );
                          }).toList(),
                          onChanged: (val) {
                            if (val != null) setState(() => _pricing = val);
                          },
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),

          _buildField(
            controller: _tagsController,
            label: 'Tags (comma separated)',
            hint: 'e.g. Analytics, Product, Privacy',
          ),
          const SizedBox(height: 20),

          SizedBox(
            width: double.infinity,
            height: 48,
            child: ElevatedButton(
              style: ElevatedButton.styleFrom(
                backgroundColor: PitchTheme.primary,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(14),
                ),
              ),
              onPressed: _submit,
              child: const Text(
                'Submit to 180 Vault',
                style: TextStyle(
                  color: Colors.white,
                  fontWeight: FontWeight.w800,
                  fontSize: 15,
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildField({
    required TextEditingController controller,
    required String label,
    required String hint,
    int maxLines = 1,
    TextInputType keyboardType = TextInputType.text,
  }) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label,
            style: const TextStyle(
                color: Colors.white,
                fontSize: 12,
                fontWeight: FontWeight.w700)),
        const SizedBox(height: 6),
        TextField(
          controller: controller,
          maxLines: maxLines,
          keyboardType: keyboardType,
          style: const TextStyle(color: Colors.white, fontSize: 13),
          decoration: InputDecoration(
            hintText: hint,
            hintStyle: TextStyle(
                color: Colors.white.withValues(alpha: 0.35), fontSize: 12),
            filled: true,
            fillColor: PitchTheme.surfaceElevated,
            contentPadding:
                const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: BorderSide.none,
            ),
          ),
        ),
      ],
    );
  }
}
