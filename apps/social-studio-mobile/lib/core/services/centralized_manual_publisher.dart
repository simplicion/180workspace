import 'dart:io';
import 'package:flutter/material.dart';
import 'package:share_plus/share_plus.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../data/models/platform.dart';
import '../../data/models/user_assisted_publish_package.dart';
import 'clipboard_assist_service.dart';
import 'platform_capability_registry.dart';
import 'user_assisted_publishers.dart';

/// Centralized service handling manual pre-filled publishing across all 9 platforms.
///
/// This provides a unified handoff pipeline:
/// 1. Validates character limits, required fields (title, caption), and media existence.
/// 2. Performs clipboard assist (auto-copies caption/title to device clipboard).
/// 3. Hands off to native Sharesheet with video/image attachment or opens native/web composer.
class CentralizedManualPublisher {
  const CentralizedManualPublisher._();

  /// Validates text requirements, character limits, and media files for any platform.
  static List<String> validate(UniversalPlatformPayload payload) {
    final issues = <String>[];
    final text = payload.fullText.trim();
    final p = payload.platform;

    // Platform-specific title validation
    if (p == SocialPlatform.reddit && (payload.title == null || payload.title!.trim().isEmpty)) {
      issues.add('Post title is required for Reddit.');
    }
    if (p == SocialPlatform.reddit && payload.title != null && payload.title!.runes.length > 300) {
      issues.add('Reddit post title cannot exceed 300 characters.');
    }
    if (p == SocialPlatform.youtube && (payload.title == null || payload.title!.trim().isEmpty)) {
      issues.add('Video title is required for YouTube.');
    }

    // Platform-specific text / caption validation
    if (text.isEmpty && (payload.title == null || payload.title!.trim().isEmpty)) {
      issues.add('Post content cannot be empty for ${p.label}.');
    }

    // Platform character limits
    if (p == SocialPlatform.x && text.runes.length > 280) {
      issues.add('Post text exceeds standard limit of 280 characters (${text.runes.length} chars). It may require X Premium.');
    }
    if (p == SocialPlatform.threads && text.runes.length > 500) {
      issues.add('Post text exceeds Threads limit of 500 characters (${text.runes.length} chars).');
    }
    if (p == SocialPlatform.tiktok && text.runes.length > 2200) {
      issues.add('Post text exceeds TikTok limit of 2,200 characters.');
    }
    if (p == SocialPlatform.instagram && text.runes.length > 2200) {
      issues.add('Caption exceeds Instagram limit of 2,200 characters.');
    }
    if (p == SocialPlatform.linkedin && text.runes.length > 3000) {
      issues.add('Post text exceeds LinkedIn limit of 3,000 characters.');
    }

    // Media file existence check
    if (payload.mediaPath != null && payload.mediaPath!.isNotEmpty) {
      final file = File(payload.mediaPath!);
      if (!file.existsSync()) {
        issues.add('Attached media file does not exist on device.');
      }
    }

    return issues;
  }

  /// Executes centralized manual handoff for any platform.
  ///
  /// Flow:
  /// 1. Copies caption/title to clipboard with contextual toast.
  /// 2. If [preferWeb] is true, opens official web compose URL with prefilled parameters.
  /// 3. Otherwise, invokes native device Sharesheet with video/image attached.
  /// 4. Gracefully falls back to web compose if native Sharesheet encounters an error.
  static Future<UserAssistedHandoffResult> publish({
    required BuildContext context,
    required UniversalPlatformPayload payload,
    bool preferWeb = false,
  }) async {
    final p = payload.platform;
    final shareText = payload.fullText;

    // 1. Dual handoff: Copy text to clipboard
    if (p == SocialPlatform.reddit) {
      await ClipboardAssistService.copyRedditTitleAndBody(
        title: payload.title ?? '',
        body: payload.caption,
        context: context,
      );
    } else {
      await ClipboardAssistService.copyCaption(
        shareText,
        context: context,
        platformLabel: p.label,
      );
    }

    // 2. Web fallback if requested
    if (preferWeb) {
      final url = PlatformCapabilityRegistry.getWebComposeUrl(
        p,
        text: shareText,
        title: payload.title,
        subreddit: payload.subreddit,
      );
      final launched = await launchUrl(url, mode: LaunchMode.externalApplication).catchError((_) => false);
      if (launched) {
        return UserAssistedHandoffResult(
          success: true,
          mode: HandoffMode.webCompose,
          message: 'Opened ${p.label} web composer with prefilled content.',
        );
      }
      return UserAssistedHandoffResult(
        success: false,
        mode: HandoffMode.webCompose,
        message: 'Could not open ${p.label} in web browser.',
      );
    }

    // 3. Native Android/iOS Sharesheet handoff
    try {
      final hasMedia = payload.mediaPath != null &&
          payload.mediaPath!.isNotEmpty &&
          File(payload.mediaPath!).existsSync();

      final fullShareContent = (payload.title != null && payload.title!.isNotEmpty && p != SocialPlatform.x)
          ? '${payload.title}\n\n$shareText'
          : shareText;

      if (hasMedia) {
        await SharePlus.instance.share(
          ShareParams(
            files: [XFile(payload.mediaPath!, mimeType: payload.mimeType)],
            text: fullShareContent,
          ),
        );
      } else {
        await SharePlus.instance.share(
          ShareParams(text: fullShareContent),
        );
      }

      return UserAssistedHandoffResult(
        success: true,
        mode: HandoffMode.nativeShare,
        message: 'Content handed off to device sharing sheet for ${p.label}.',
      );
    } catch (e) {
      // Fallback to web compose if native share throws an exception
      final url = PlatformCapabilityRegistry.getWebComposeUrl(
        p,
        text: shareText,
        title: payload.title,
        subreddit: payload.subreddit,
      );
      final launched = await launchUrl(url, mode: LaunchMode.externalApplication).catchError((_) => false);
      if (launched) {
        return UserAssistedHandoffResult(
          success: true,
          mode: HandoffMode.webCompose,
          message: 'Native share unavailable. Opened ${p.label} web composer.',
          error: e.toString(),
        );
      }
      return UserAssistedHandoffResult(
        success: false,
        mode: HandoffMode.clipboardOnly,
        message: 'Could not share to ${p.label}. Content saved to clipboard.',
        error: e.toString(),
      );
    }
  }
}
