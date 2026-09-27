import 'package:flutter/material.dart';
import '../../../../core/theme/pitch_theme.dart';
import '../../models/gig_model.dart';

class PostGigSheet extends StatefulWidget {
  final ValueChanged<PitchGig> onGigPosted;

  const PostGigSheet({super.key, required this.onGigPosted});

  static void show(BuildContext context,
      {required ValueChanged<PitchGig> onGigPosted}) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => PostGigSheet(onGigPosted: onGigPosted),
    );
  }

  @override
  State<PostGigSheet> createState() => _PostGigSheetState();
}

class _PostGigSheetState extends State<PostGigSheet> {
  final _titleController = TextEditingController();
  final _companyController = TextEditingController();
  final _descController = TextEditingController();
  final _amountController = TextEditingController();
  final _tagsController = TextEditingController();

  String _type = 'gig'; // 'gig' or 'job'
  String _category = 'tech';
  bool _isRemote = true;
  bool _submitting = false;

  final List<String> _categories = [
    'tech',
    'design',
    'marketing',
    'finance',
    'ai',
  ];

  @override
  void dispose() {
    _titleController.dispose();
    _companyController.dispose();
    _descController.dispose();
    _amountController.dispose();
    _tagsController.dispose();
    super.dispose();
  }

  void _submit() {
    final title = _titleController.text.trim();
    if (title.isEmpty) return;

    setState(() => _submitting = true);

    final amount = double.tryParse(_amountController.text.trim());
    final rawTags = _tagsController.text
        .split(',')
        .map((s) => s.trim())
        .where((s) => s.isNotEmpty)
        .toList();

    final newGig = PitchGig(
      id: 'gig_${DateTime.now().millisecondsSinceEpoch}',
      title: title,
      companyName: _companyController.text.trim().isNotEmpty
          ? _companyController.text.trim()
          : 'My Startup',
      description: _descController.text.trim().isNotEmpty
          ? _descController.text.trim()
          : 'Seeking top talent to collaborate on our startup milestone.',
      category: _category,
      opportunityType: _type,
      budget: _type == 'gig' ? (amount ?? 1500.0) : null,
      salaryMin: _type == 'job' ? (amount ?? 120000.0) : null,
      salaryMax: _type == 'job' ? ((amount ?? 120000.0) * 1.3) : null,
      equity: _type == 'job' ? '0.5% - 2.0%' : null,
      location: _isRemote ? 'Remote (Worldwide)' : 'San Francisco, CA',
      isRemote: _isRemote,
      userName: 'Alex Rivers',
      tags: rawTags.isNotEmpty ? rawTags : ['#Startup', '#HighPriority'],
      createdAt: DateTime.now(),
    );

    widget.onGigPosted(newGig);
    Navigator.pop(context);
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      height: MediaQuery.of(context).size.height * 0.85,
      padding: EdgeInsets.only(
        left: 20,
        right: 20,
        top: 16,
        bottom: MediaQuery.of(context).viewInsets.bottom + 20,
      ),
      decoration: const BoxDecoration(
        color: PitchTheme.surface,
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      child: Column(
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
                'Post Opportunity',
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
          const SizedBox(height: 12),
          Expanded(
            child: SingleChildScrollView(
              physics: const BouncingScrollPhysics(),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Type Switcher
                  Row(
                    children: [
                      Expanded(
                        child: _buildTypeButton(
                          title: 'Freelance Gig / Bounty',
                          type: 'gig',
                          icon: Icons.flash_on_rounded,
                        ),
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: _buildTypeButton(
                          title: 'Full-Time Role',
                          type: 'job',
                          icon: Icons.business_center_rounded,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),

                  _buildTextField(
                    controller: _titleController,
                    label: _type == 'gig' ? 'Gig / Project Title' : 'Job Title',
                    hint: _type == 'gig'
                        ? 'e.g. Build Flutter Mobile Audio Visualizer'
                        : 'e.g. Founding Full-Stack Engineer',
                  ),
                  const SizedBox(height: 12),

                  _buildTextField(
                    controller: _companyController,
                    label: 'Startup / Company Name',
                    hint: 'e.g. Simplicion Inc.',
                  ),
                  const SizedBox(height: 12),

                  _buildTextField(
                    controller: _descController,
                    label: 'Description & Scope',
                    hint:
                        'Explain requirements, deliverables, or team culture...',
                    maxLines: 3,
                  ),
                  const SizedBox(height: 12),

                  Row(
                    children: [
                      Expanded(
                        child: _buildTextField(
                          controller: _amountController,
                          label: _type == 'gig'
                              ? 'Fixed Bounty (\$ USD)'
                              : 'Starting Salary (\$ USD)',
                          hint: _type == 'gig' ? '1500' : '140000',
                          keyboardType: TextInputType.number,
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text(
                              'Category',
                              style: TextStyle(
                                  color: Colors.white,
                                  fontSize: 12,
                                  fontWeight: FontWeight.w700),
                            ),
                            const SizedBox(height: 6),
                            Container(
                              padding:
                                  const EdgeInsets.symmetric(horizontal: 12),
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
                                    if (val != null) {
                                      setState(() => _category = val);
                                    }
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

                  _buildTextField(
                    controller: _tagsController,
                    label: 'Skill Tags (comma separated)',
                    hint: 'e.g. Flutter, Go, GraphQL, Postgres',
                  ),
                  const SizedBox(height: 12),

                  // Remote Switch
                  SwitchListTile(
                    contentPadding: EdgeInsets.zero,
                    title: const Text('Worldwide Remote',
                        style: TextStyle(
                            color: Colors.white,
                            fontSize: 13,
                            fontWeight: FontWeight.w600)),
                    subtitle: Text(
                      _isRemote
                          ? 'Open to global founders and devs'
                          : 'Specific on-site / hybrid office',
                      style: TextStyle(
                          color: PitchTheme.textSecondary, fontSize: 11),
                    ),
                    value: _isRemote,
                    activeThumbColor: PitchTheme.primary,
                    onChanged: (val) => setState(() => _isRemote = val),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 12),
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
              onPressed: _submitting ? null : _submit,
              child: const Text(
                'Publish Opportunity',
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

  Widget _buildTypeButton({
    required String title,
    required String type,
    required IconData icon,
  }) {
    final isSelected = _type == type;
    return GestureDetector(
      onTap: () => setState(() => _type = type),
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 10),
        decoration: BoxDecoration(
          color: isSelected
              ? PitchTheme.primary.withValues(alpha: 0.2)
              : PitchTheme.surfaceElevated,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: isSelected ? PitchTheme.primary : Colors.transparent,
            width: 1.5,
          ),
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(icon,
                color: isSelected ? PitchTheme.primary : PitchTheme.textSecondary,
                size: 16),
            const SizedBox(width: 6),
            Flexible(
              child: Text(
                title,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: TextStyle(
                  color: isSelected ? Colors.white : PitchTheme.textSecondary,
                  fontWeight: isSelected ? FontWeight.w800 : FontWeight.w500,
                  fontSize: 12,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildTextField({
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
