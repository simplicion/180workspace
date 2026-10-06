import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../core/config/app_config.dart';
import '../../core/payment/pay_bottom_sheet.dart';
import '../../core/providers.dart';
import '../../core/theme/app_theme.dart';
import '../auth/auth_provider.dart';
import '../auth/auth_repository.dart';

/// Shown when the creator needs to subscribe, recharge, or when trial has expired.
/// Features a switcher between "Monthly Plan" ($20/mo) and "Recharge & Use Pass" ($0.71/day).
/// Opens the 180 Pay checkout directly in-app via PayBottomSheet.
class FeatureLockView extends ConsumerStatefulWidget {
  const FeatureLockView({super.key});

  static (String, String) copyFor(LockReason? reason) => switch (reason) {
        LockReason.subscriptionExpired => (
            '3-Day Free Trial Expired',
            'Your free trial has ended. Subscribe monthly or recharge for flexible days to unlock full creator access.'
          ),
        LockReason.companySuspended => (
            'Workspace Suspended',
            'This workspace has been suspended. Contact 180 Workspace support to restore access.'
          ),
        LockReason.adminDisabled => (
            'Temporarily Unavailable',
            '180 Social Studio has been disabled by the platform administrator. Please check back later.'
          ),
        _ => (
            'Unlock 180 Social Studio',
            'Choose a creator plan or flexible daily recharge to continue creating content.'
          ),
      };

  @override
  ConsumerState<FeatureLockView> createState() => _FeatureLockViewState();
}

class _FeatureLockViewState extends ConsumerState<FeatureLockView> {
  int _selectedTab = 0; // 0: Monthly Subscription, 1: Recharge & Use Pass
  int _selectedDays = 7;
  bool _isLoadingCheckout = false;
  String? _activeCheckoutType;

  double _calculateRechargeAmount(int days) {
    // $20 for 28 days = $0.714285... per day
    return ((days * 20.0 / 28.0) * 100).round() / 100.0;
  }

  Future<void> _handleCheckout(String type, {int? days}) async {
    setState(() {
      _isLoadingCheckout = true;
      _activeCheckoutType = type;
    });

    try {
      final api = ref.read(socialApiProvider);
      final checkout = await api.createBillingCheckout(
        type: type,
        days: days,
        returnUrl: AppConfig.oauthRedirectUri,
      );

      final uri = Uri.parse(checkout.checkoutUrl);

      if (!mounted) return;

      // Open in-app 180 Pay bottom sheet directly (Web in-DOM or Mobile in-app WebView)
      final paid = await PayBottomSheet.show(
        context,
        checkoutUrl: uri,
        returnUrl: AppConfig.oauthRedirectUri,
      );

      if (paid) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: const Text('🎉 Payment successful! Creator access unlocked.'),
              backgroundColor: AppTheme.success,
              duration: const Duration(seconds: 4),
            ),
          );
        }
        await ref.read(sessionProvider.notifier).refreshEntitlement();
      } else {
        // Refresh entitlement in case webhook updated account status before modal was closed
        await ref.read(sessionProvider.notifier).refreshEntitlement();
      }
    } catch (e) {
      // Graceful fallback to external application browser if in-app bottom sheet fails
      try {
        final api = ref.read(socialApiProvider);
        final checkout = await api.createBillingCheckout(
          type: type,
          days: days,
          returnUrl: AppConfig.oauthRedirectUri,
        );
        final uri = Uri.parse(checkout.checkoutUrl);
        if (await canLaunchUrl(uri)) {
          await launchUrl(uri, mode: LaunchMode.externalApplication);
          if (mounted) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                content: const Text('Payment page opened. Pull down to refresh after completing payment.'),
                backgroundColor: AppTheme.primary,
                duration: const Duration(seconds: 5),
              ),
            );
          }
        }
      } catch (fallbackErr) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('Could not start checkout: $e'),
              backgroundColor: AppTheme.error,
            ),
          );
        }
      }
    } finally {
      if (mounted) {
        setState(() {
          _isLoadingCheckout = false;
          _activeCheckoutType = null;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final session = ref.watch(sessionProvider).valueOrNull;
    final ent = session?.entitlement;
    final billing = ent?.creatorBilling;
    final (defaultTitle, defaultBody) = FeatureLockView.copyFor(ent?.lockReason);

    final title = billing?.isTrial == true && billing?.trialDaysRemaining != 0
        ? '3-Day Free Trial'
        : defaultTitle;
    final body = ent?.message ?? defaultBody;

    final rechargeCost = _calculateRechargeAmount(_selectedDays);

    return Scaffold(
      backgroundColor: AppTheme.background,
      body: SafeArea(
        child: Column(
          children: [
            // Top Header: Sign out action
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.end,
                children: [
                  TextButton.icon(
                    onPressed: () => ref.read(sessionProvider.notifier).logout(),
                    icon: Icon(Icons.logout_rounded, size: 16, color: AppTheme.textMuted),
                    label: Text(
                      'Sign out',
                      style: TextStyle(
                        color: AppTheme.textMuted,
                        fontSize: 13,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    style: TextButton.styleFrom(
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                      minimumSize: Size.zero,
                      tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                    ),
                  ),
                ],
              ),
            ),
            Expanded(
              child: RefreshIndicator(
                onRefresh: () => ref.read(sessionProvider.notifier).refreshEntitlement(),
                color: AppTheme.primary,
                backgroundColor: AppTheme.surfaceElevated,
                child: SingleChildScrollView(
                  physics: const AlwaysScrollableScrollPhysics(),
                  padding: const EdgeInsets.fromLTRB(20, 8, 20, 32),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      // Top Brand Logo Icon & Badge
                Center(
                  child: Container(
                    width: 76,
                    height: 76,
                    padding: const EdgeInsets.all(14),
                    decoration: BoxDecoration(
                      color: AppTheme.surfaceElevated,
                      shape: BoxShape.circle,
                      border: Border.all(
                        color: AppTheme.primary.withValues(alpha: 0.35),
                        width: 1.5,
                      ),
                      boxShadow: [
                        BoxShadow(
                          color: AppTheme.primary.withValues(alpha: 0.25),
                          blurRadius: 24,
                          offset: const Offset(0, 8),
                        ),
                      ],
                    ),
                    child: Image.asset(
                      'assets/logo/brand_favicon.png',
                      fit: BoxFit.contain,
                      errorBuilder: (context, error, stackTrace) => const Icon(
                        Icons.workspace_premium_rounded,
                        size: 36,
                        color: Colors.white,
                      ),
                    ),
                  ),
                ),
                const SizedBox(height: 16),

                // Creator Header
                Center(
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                    decoration: BoxDecoration(
                      color: AppTheme.primary.withValues(alpha: 0.12),
                      borderRadius: BorderRadius.circular(20),
                      border: Border.all(color: AppTheme.primary.withValues(alpha: 0.3)),
                    ),
                    child: Text(
                      '180 SOCIAL STUDIO CREATOR',
                      style: TextStyle(
                        color: AppTheme.primary,
                        fontSize: 11,
                        fontWeight: FontWeight.w700,
                        letterSpacing: 1.2,
                      ),
                    ),
                  ),
                ),
                const SizedBox(height: 12),

                // Title & Description
                Text(
                  title,
                  key: const Key('lock.title'),
                  style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                        fontWeight: FontWeight.bold,
                        color: AppTheme.textPrimary,
                      ),
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 8),
                Text(
                  body,
                  style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                        color: AppTheme.textSecondary,
                        height: 1.4,
                      ),
                  textAlign: TextAlign.center,
                ),

                if (session != null) ...[
                  const SizedBox(height: 8),
                  Text(
                    session.user.email,
                    style: Theme.of(context).textTheme.labelSmall?.copyWith(
                          color: AppTheme.textMuted,
                        ),
                    textAlign: TextAlign.center,
                  ),
                ],

                const SizedBox(height: 20),

                // ─── Plan / Recharge Switcher Tab ───────────────────────────
                Container(
                  padding: const EdgeInsets.all(4),
                  decoration: BoxDecoration(
                    color: AppTheme.surfaceElevated,
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: AppTheme.border),
                  ),
                  child: Row(
                    children: [
                      Expanded(
                        child: _PlanTabButton(
                          title: 'Monthly Plan',
                          badge: 'POPULAR',
                          badgeColor: AppTheme.primary,
                          subtitle: '\$20/mo',
                          icon: Icons.bolt_rounded,
                          isSelected: _selectedTab == 0,
                          onTap: () => setState(() => _selectedTab = 0),
                        ),
                      ),
                      const SizedBox(width: 4),
                      Expanded(
                        child: _PlanTabButton(
                          title: 'Recharge Pass',
                          badge: 'FLEXIBLE',
                          badgeColor: AppTheme.accent,
                          subtitle: '~\$0.71/d',
                          icon: Icons.calendar_today_rounded,
                          isSelected: _selectedTab == 1,
                          onTap: () => setState(() => _selectedTab = 1),
                        ),
                      ),
                    ],
                  ),
                ),

                const SizedBox(height: 20),

                // ─── Interactive Pricing Card with Smooth Switcher ───────────
                AnimatedSwitcher(
                  duration: const Duration(milliseconds: 260),
                  switchInCurve: Curves.easeOutCubic,
                  switchOutCurve: Curves.easeInCubic,
                  transitionBuilder: (child, animation) {
                    return FadeTransition(
                      opacity: animation,
                      child: SlideTransition(
                        position: Tween<Offset>(
                          begin: const Offset(0, 0.04),
                          end: Offset.zero,
                        ).animate(animation),
                        child: child,
                      ),
                    );
                  },
                  child: _selectedTab == 0
                      ? _buildMonthlyCard()
                      : _buildRechargeCard(rechargeCost),
                ),

                const SizedBox(height: 24),
              ],
            ),
          ),
        ),
      ),
    ],
  ),
),
);
  }

  Widget _buildMonthlyCard() {
    return Container(
      key: const ValueKey('monthly_card'),
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: AppTheme.surface,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: AppTheme.primary, width: 1.5),
        boxShadow: [
          BoxShadow(
            color: AppTheme.primary.withValues(alpha: 0.12),
            blurRadius: 18,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Flexible(
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  decoration: BoxDecoration(
                    color: AppTheme.primary,
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: const Text(
                    'MOST POPULAR',
                    style: TextStyle(
                      color: Colors.white,
                      fontSize: 10,
                      fontWeight: FontWeight.bold,
                      letterSpacing: 0.8,
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 8),
              Text(
                'Cancel anytime',
                style: TextStyle(fontSize: 12, color: AppTheme.textMuted),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Row(
            crossAxisAlignment: CrossAxisAlignment.baseline,
            textBaseline: TextBaseline.alphabetic,
            children: [
              Text(
                '\$20',
                style: TextStyle(
                  fontSize: 32,
                  fontWeight: FontWeight.w900,
                  color: AppTheme.textPrimary,
                ),
              ),
              Text(
                ' / month',
                style: TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.w500,
                  color: AppTheme.textSecondary,
                ),
              ),
            ],
          ),
          const SizedBox(height: 6),
          Text(
            'Direct monthly creator subscription. Automatic recurring billing via 180 Subscriptions.',
            style: TextStyle(fontSize: 13, color: AppTheme.textSecondary, height: 1.3),
          ),
          const SizedBox(height: 14),
          const _FeatureItem(text: 'Full unlimited project & video creation'),
          const _FeatureItem(text: 'AI Script Director & timeline editor'),
          const _FeatureItem(text: 'Autonomous Autopilot & social scheduling'),
          const _FeatureItem(text: 'Direct publishing to Instagram, YouTube & TikTok'),
          const SizedBox(height: 16),
          SizedBox(
            width: double.infinity,
            height: 48,
            child: ElevatedButton.icon(
              onPressed: _isLoadingCheckout
                  ? null
                  : () => _handleCheckout('monthly'),
              style: ElevatedButton.styleFrom(
                backgroundColor: AppTheme.primary,
                foregroundColor: Colors.white,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
                elevation: 0,
              ),
              icon: _isLoadingCheckout && _activeCheckoutType == 'monthly'
                  ? const SizedBox(
                      width: 18,
                      height: 18,
                      child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                    )
                  : const Icon(Icons.bolt_rounded, size: 20),
              label: const Text(
                'Subscribe Monthly — \$20/mo',
                style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15),
              ),
            ),
          ),
          const SizedBox(height: 10),
          Center(
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(Icons.shield_outlined, size: 12, color: AppTheme.textMuted),
                const SizedBox(width: 4),
                Text(
                  'Opens in-app 180 Pay bottom sheet · Instant activation',
                  style: TextStyle(fontSize: 11, color: AppTheme.textMuted),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildRechargeCard(double rechargeCost) {
    return Container(
      key: const ValueKey('recharge_card'),
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: AppTheme.surface,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: AppTheme.accent.withValues(alpha: 0.6), width: 1.5),
        boxShadow: [
          BoxShadow(
            color: AppTheme.accent.withValues(alpha: 0.08),
            blurRadius: 18,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Flexible(
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  decoration: BoxDecoration(
                    color: AppTheme.accent.withValues(alpha: 0.15),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: AppTheme.accent.withValues(alpha: 0.4)),
                  ),
                  child: Text(
                    'PAY AS YOU GO',
                    style: TextStyle(
                      color: AppTheme.accent,
                      fontSize: 10,
                      fontWeight: FontWeight.bold,
                      letterSpacing: 0.8,
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 8),
              Text(
                '~ \$0.71 / day',
                style: TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w600,
                  color: AppTheme.accent,
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Text(
            'Recharge & Use Pass',
            style: TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.bold,
              color: AppTheme.textPrimary,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            'Slide to choose how many days you need. Based on \$20 for 28 days with no ongoing commitment.',
            style: TextStyle(fontSize: 13, color: AppTheme.textSecondary, height: 1.3),
          ),
          const SizedBox(height: 16),

          // Days duration selector with badge
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Expanded(
                child: Text(
                  'Duration:',
                  style: TextStyle(fontSize: 14, color: AppTheme.textPrimary, fontWeight: FontWeight.w500),
                ),
              ),
              const SizedBox(width: 8),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                decoration: BoxDecoration(
                  color: AppTheme.accent.withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: AppTheme.accent.withValues(alpha: 0.35)),
                ),
                child: Text(
                  '$_selectedDays Day${_selectedDays > 1 ? 's' : ''}',
                  style: TextStyle(
                    color: AppTheme.accent,
                    fontWeight: FontWeight.bold,
                    fontSize: 14,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),

          // Duration Slider
          SliderTheme(
            data: SliderTheme.of(context).copyWith(
              activeTrackColor: AppTheme.accent,
              inactiveTrackColor: AppTheme.border,
              thumbColor: AppTheme.accent,
              overlayColor: AppTheme.accent.withValues(alpha: 0.2),
              trackHeight: 6,
              thumbShape: const RoundSliderThumbShape(enabledThumbRadius: 10),
            ),
            child: Slider(
              value: _selectedDays.toDouble(),
              min: 1,
              max: 28,
              divisions: 27,
              onChanged: (val) {
                setState(() {
                  _selectedDays = val.round();
                });
              },
            ),
          ),
          const SizedBox(height: 12),

          // Dynamic total amount display box
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            decoration: BoxDecoration(
              color: AppTheme.surfaceElevated,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: AppTheme.border),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Total Recharge',
                        style: TextStyle(fontSize: 12, color: AppTheme.textMuted),
                      ),
                      Text(
                        '$_selectedDays Days Access',
                        style: TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.w600,
                          color: AppTheme.textPrimary,
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: 8),
                Text(
                  '\$${rechargeCost.toStringAsFixed(2)}',
                  style: TextStyle(
                    fontSize: 20,
                    fontWeight: FontWeight.w900,
                    color: AppTheme.accent,
                  ),
                ),
              ],
            ),
          ),

          const SizedBox(height: 16),

          SizedBox(
            width: double.infinity,
            height: 48,
            child: ElevatedButton.icon(
              onPressed: _isLoadingCheckout
                  ? null
                  : () => _handleCheckout('recharge', days: _selectedDays),
              style: ElevatedButton.styleFrom(
                backgroundColor: AppTheme.accent,
                foregroundColor: Colors.white,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
                elevation: 0,
              ),
              icon: _isLoadingCheckout && _activeCheckoutType == 'recharge'
                  ? const SizedBox(
                      width: 18,
                      height: 18,
                      child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                    )
                  : const Icon(Icons.calendar_today_rounded, size: 18),
              label: Text(
                'Recharge for $_selectedDays Day${_selectedDays > 1 ? 's' : ''} — \$${rechargeCost.toStringAsFixed(2)}',
                style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
              ),
            ),
          ),
          const SizedBox(height: 10),
          Center(
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(Icons.bolt_rounded, size: 12, color: AppTheme.textMuted),
                const SizedBox(width: 4),
                Text(
                  'Opens in-app 180 Pay bottom sheet · No recurring charge',
                  style: TextStyle(fontSize: 11, color: AppTheme.textMuted),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _PlanTabButton extends StatelessWidget {
  const _PlanTabButton({
    required this.title,
    required this.badge,
    required this.badgeColor,
    required this.subtitle,
    required this.icon,
    required this.isSelected,
    required this.onTap,
  });

  final String title;
  final String badge;
  final Color badgeColor;
  final String subtitle;
  final IconData icon;
  final bool isSelected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(12),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        curve: Curves.easeOutCubic,
        padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 8),
        decoration: BoxDecoration(
          color: isSelected ? AppTheme.surface : Colors.transparent,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: isSelected ? badgeColor : Colors.transparent,
            width: 1.5,
          ),
          boxShadow: isSelected
              ? [
                  BoxShadow(
                    color: badgeColor.withValues(alpha: 0.15),
                    blurRadius: 12,
                    offset: const Offset(0, 2),
                  ),
                ]
              : null,
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(
                  icon,
                  size: 16,
                  color: isSelected ? badgeColor : AppTheme.textMuted,
                ),
                const SizedBox(width: 6),
                Flexible(
                  child: Text(
                    title,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(
                      fontSize: 13,
                      fontWeight: isSelected ? FontWeight.w700 : FontWeight.w500,
                      color: isSelected ? AppTheme.textPrimary : AppTheme.textSecondary,
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 4),
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1.5),
                  decoration: BoxDecoration(
                    color: badgeColor.withValues(alpha: isSelected ? 0.2 : 0.1),
                    borderRadius: BorderRadius.circular(4),
                  ),
                  child: Text(
                    badge,
                    style: TextStyle(
                      fontSize: 9,
                      fontWeight: FontWeight.bold,
                      color: badgeColor,
                      letterSpacing: 0.5,
                    ),
                  ),
                ),
                const SizedBox(width: 6),
                Text(
                  subtitle,
                  style: TextStyle(
                    fontSize: 11,
                    fontWeight: isSelected ? FontWeight.w600 : FontWeight.normal,
                    color: isSelected ? AppTheme.textSecondary : AppTheme.textMuted,
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _FeatureItem extends StatelessWidget {
  const _FeatureItem({required this.text});
  final String text;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 6),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(Icons.check_circle_rounded, size: 16, color: AppTheme.success),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              text,
              style: TextStyle(
                fontSize: 13,
                color: AppTheme.textSecondary,
                height: 1.25,
              ),
            ),
          ),
        ],
      ),
    );
  }
}
