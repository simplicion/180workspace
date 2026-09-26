import 'package:url_launcher/url_launcher.dart';

import '../../data/models/platform.dart';

/// Capability metadata describing what publishing features are supported for a platform.
class PlatformCapability {
  const PlatformCapability({
    required this.platform,
    required this.userAssistedPublishing,
    required this.apiPublishing,
    required this.canReceiveVideo,
    required this.canReceiveText,
    required this.captionPrefillGuaranteed,
    required this.requiresExternalPostButton,
    this.notes = '',
  });

  final SocialPlatform platform;
  final bool userAssistedPublishing;
  final bool apiPublishing;
  final bool canReceiveVideo;
  final bool canReceiveText;
  final bool captionPrefillGuaranteed;
  final bool requiresExternalPostButton;
  final String notes;
}

/// Registry for detecting platform availability, capabilities, and web composer URLs.
class PlatformCapabilityRegistry {
  const PlatformCapabilityRegistry._();

  /// Static capabilities registry reflecting platform realities.
  static const Map<SocialPlatform, PlatformCapability> capabilities = {
    SocialPlatform.x: PlatformCapability(
      platform: SocialPlatform.x,
      userAssistedPublishing: true,
      apiPublishing: false,
      canReceiveVideo: true,
      canReceiveText: true,
      captionPrefillGuaranteed: false, // Discarded on many X versions when video stream is attached
      requiresExternalPostButton: true,
      notes: 'Video is attached via Sharesheet; caption is copied to clipboard as dual handoff.',
    ),
    SocialPlatform.reddit: PlatformCapability(
      platform: SocialPlatform.reddit,
      userAssistedPublishing: true,
      apiPublishing: false,
      canReceiveVideo: true,
      canReceiveText: true,
      captionPrefillGuaranteed: false, // Reddit ignores EXTRA_TEXT for video composer
      requiresExternalPostButton: true,
      notes: 'Video attached via Sharesheet; title and body are copied to clipboard.',
    ),
    SocialPlatform.instagram: PlatformCapability(
      platform: SocialPlatform.instagram,
      userAssistedPublishing: false,
      apiPublishing: true,
      canReceiveVideo: true,
      canReceiveText: true,
      captionPrefillGuaranteed: true,
      requiresExternalPostButton: false,
    ),
    SocialPlatform.youtube: PlatformCapability(
      platform: SocialPlatform.youtube,
      userAssistedPublishing: false,
      apiPublishing: true,
      canReceiveVideo: true,
      canReceiveText: true,
      captionPrefillGuaranteed: true,
      requiresExternalPostButton: false,
    ),
    SocialPlatform.linkedin: PlatformCapability(
      platform: SocialPlatform.linkedin,
      userAssistedPublishing: false,
      apiPublishing: true,
      canReceiveVideo: true,
      canReceiveText: true,
      captionPrefillGuaranteed: true,
      requiresExternalPostButton: false,
    ),
    SocialPlatform.facebook: PlatformCapability(
      platform: SocialPlatform.facebook,
      userAssistedPublishing: false,
      apiPublishing: true,
      canReceiveVideo: true,
      canReceiveText: true,
      captionPrefillGuaranteed: true,
      requiresExternalPostButton: false,
    ),
    SocialPlatform.tiktok: PlatformCapability(
      platform: SocialPlatform.tiktok,
      userAssistedPublishing: false,
      apiPublishing: true,
      canReceiveVideo: true,
      canReceiveText: true,
      captionPrefillGuaranteed: true,
      requiresExternalPostButton: false,
    ),
  };

  /// Returns the capability specification for a given platform.
  static PlatformCapability getCapabilities(SocialPlatform platform) {
    return capabilities[platform] ??
        PlatformCapability(
          platform: platform,
          userAssistedPublishing: platform.isUserAssisted,
          apiPublishing: !platform.isUserAssisted,
          canReceiveVideo: true,
          canReceiveText: true,
          captionPrefillGuaranteed: false,
          requiresExternalPostButton: platform.isUserAssisted,
        );
  }

  /// Checks if the native app for the platform is installed and can handle URLs.
  static Future<bool> isAppInstalled(SocialPlatform platform) async {
    try {
      final Uri probeUri;
      switch (platform) {
        case SocialPlatform.x:
          probeUri = Uri.parse('twitter://');
          break;
        case SocialPlatform.reddit:
          probeUri = Uri.parse('reddit://');
          break;
        default:
          return false;
      }
      return await canLaunchUrl(probeUri);
    } catch (_) {
      return false;
    }
  }

  /// Builds official web composer URL for X with prefilled text.
  static Uri getXWebComposeUrl({required String text}) {
    return Uri.parse('https://x.com/intent/post?text=${Uri.encodeComponent(text)}');
  }

  /// Builds official web submission URL for Reddit with prefilled subreddit, title, and body.
  static Uri getRedditWebComposeUrl({
    String? subreddit,
    required String title,
    String? body,
  }) {
    final sub = (subreddit != null && subreddit.trim().isNotEmpty)
        ? subreddit.trim().replaceFirst(RegExp(r'^/?r/'), '')
        : 'all';
    final q = <String, String>{'title': title};
    if (body != null && body.isNotEmpty) q['text'] = body;
    return Uri.https('www.reddit.com', '/r/$sub/submit', q);
  }
}
