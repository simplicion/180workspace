import 'dart:io';
import 'package:flutter/material.dart';
import 'package:share_plus/share_plus.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../data/models/platform.dart';
import '../../data/models/user_assisted_publish_package.dart';
import 'clipboard_assist_service.dart';
import 'platform_capability_registry.dart';

enum HandoffMode {
  nativeShare,
  webCompose,
  clipboardOnly,
}

/// Result of a user-assisted handoff operation.
class UserAssistedHandoffResult {
  const UserAssistedHandoffResult({
    required this.success,
    required this.mode,
    required this.message,
    this.error,
  });

  final bool success;
  final HandoffMode mode;
  final String message;
  final String? error;
}

/// Publisher handling user-assisted publishing to X (Twitter).
class XUserAssistedPublisher {
  const XUserAssistedPublisher._();

  /// Maximum standard character limit for an X post.
  static const int maxStandardChars = 280;

  /// Validates text requirements for X.
  static List<String> validate(XPublishPayload payload) {
    final issues = <String>[];
    if (payload.text.trim().isEmpty) {
      issues.add('Post text cannot be empty for X.');
    }
    if (payload.text.runes.length > maxStandardChars) {
      issues.add('Post text exceeds standard limit of $maxStandardChars characters (${payload.text.runes.length} chars). It may require X Premium.');
    }
    if (payload.mediaPath != null && payload.mediaPath!.isNotEmpty) {
      final file = File(payload.mediaPath!);
      if (!file.existsSync()) {
        issues.add('Attached media file does not exist on device.');
      }
    }
    return issues;
  }

  /// Executes user-assisted handoff to X.
  /// Dual handoff: Copies caption to clipboard + opens native Sharesheet or web compose.
  static Future<UserAssistedHandoffResult> publish({
    required BuildContext context,
    required XPublishPayload payload,
    bool preferWeb = false,
  }) async {
    // 1. Dual handoff: Always copy caption to clipboard first
    await ClipboardAssistService.copyCaption(
      payload.text,
      context: context,
      platformLabel: 'X',
    );

    // 2. Web fallback if requested or if native share unavailable
    if (preferWeb) {
      final url = PlatformCapabilityRegistry.getXWebComposeUrl(text: payload.text);
      final launched = await launchUrl(url, mode: LaunchMode.externalApplication);
      if (launched) {
        return const UserAssistedHandoffResult(
          success: true,
          mode: HandoffMode.webCompose,
          message: 'Opened X in web browser with prefilled text.',
        );
      }
      return const UserAssistedHandoffResult(
        success: false,
        mode: HandoffMode.webCompose,
        message: 'Could not open web browser for X.',
      );
    }

    // 3. Native Android Sharesheet handoff
    try {
      final hasMedia = payload.mediaPath != null && payload.mediaPath!.isNotEmpty && File(payload.mediaPath!).existsSync();
      if (hasMedia) {
        await SharePlus.instance.share(
          ShareParams(
            files: [XFile(payload.mediaPath!, mimeType: payload.mimeType)],
            text: payload.text,
          ),
        );
      } else {
        await SharePlus.instance.share(
          ShareParams(text: payload.text),
        );
      }
      return const UserAssistedHandoffResult(
        success: true,
        mode: HandoffMode.nativeShare,
        message: 'Content handed off to device sharing sheet.',
      );
    } catch (e) {
      // Fallback to web compose if native share throws an exception
      final url = PlatformCapabilityRegistry.getXWebComposeUrl(text: payload.text);
      final launched = await launchUrl(url, mode: LaunchMode.externalApplication).catchError((_) => false);
      if (launched) {
        return UserAssistedHandoffResult(
          success: true,
          mode: HandoffMode.webCompose,
          message: 'Native share unavailable. Opened X web composer.',
          error: e.toString(),
        );
      }
      return UserAssistedHandoffResult(
        success: false,
        mode: HandoffMode.clipboardOnly,
        message: 'Could not share to X. Caption is saved to clipboard.',
        error: e.toString(),
      );
    }
  }
}

/// Publisher handling user-assisted publishing to Reddit.
class RedditUserAssistedPublisher {
  const RedditUserAssistedPublisher._();

  /// Validates Reddit post payload requirements.
  static List<String> validate(RedditPublishPayload payload) {
    final issues = <String>[];
    if (payload.title.trim().isEmpty) {
      issues.add('Post title is required for Reddit.');
    }
    if (payload.title.runes.length > 300) {
      issues.add('Reddit post title cannot exceed 300 characters.');
    }
    if (payload.mediaPath != null && payload.mediaPath!.isNotEmpty) {
      final file = File(payload.mediaPath!);
      if (!file.existsSync()) {
        issues.add('Attached media file does not exist on device.');
      }
    }
    return issues;
  }

  /// Executes user-assisted handoff to Reddit.
  /// Dual handoff: Copies Title & Body to clipboard + opens native Sharesheet or web compose.
  static Future<UserAssistedHandoffResult> publish({
    required BuildContext context,
    required RedditPublishPayload payload,
    bool preferWeb = false,
  }) async {
    // 1. Dual handoff: Copy Reddit Title & Body to clipboard
    await ClipboardAssistService.copyRedditTitleAndBody(
      title: payload.title,
      body: payload.body ?? '',
      context: context,
    );

    // 2. Web fallback if requested
    if (preferWeb) {
      final url = PlatformCapabilityRegistry.getRedditWebComposeUrl(
        subreddit: payload.normalizedSubreddit,
        title: payload.title,
        body: payload.body,
      );
      final launched = await launchUrl(url, mode: LaunchMode.externalApplication);
      if (launched) {
        return const UserAssistedHandoffResult(
          success: true,
          mode: HandoffMode.webCompose,
          message: 'Opened Reddit web submission with prefilled title.',
        );
      }
      return const UserAssistedHandoffResult(
        success: false,
        mode: HandoffMode.webCompose,
        message: 'Could not open Reddit in web browser.',
      );
    }

    // 3. Native Android Sharesheet handoff
    try {
      final hasMedia = payload.mediaPath != null && payload.mediaPath!.isNotEmpty && File(payload.mediaPath!).existsSync();
      final shareText = payload.body != null && payload.body!.isNotEmpty
          ? '${payload.title}\n\n${payload.body}'
          : payload.title;

      if (hasMedia) {
        await SharePlus.instance.share(
          ShareParams(
            files: [XFile(payload.mediaPath!, mimeType: payload.mimeType)],
            text: shareText,
          ),
        );
      } else {
        await SharePlus.instance.share(
          ShareParams(text: shareText),
        );
      }

      return const UserAssistedHandoffResult(
        success: true,
        mode: HandoffMode.nativeShare,
        message: 'Content handed off to device sharing sheet.',
      );
    } catch (e) {
      // Fallback to web submission
      final url = PlatformCapabilityRegistry.getRedditWebComposeUrl(
        subreddit: payload.normalizedSubreddit,
        title: payload.title,
        body: payload.body,
      );
      final launched = await launchUrl(url, mode: LaunchMode.externalApplication).catchError((_) => false);
      if (launched) {
        return UserAssistedHandoffResult(
          success: true,
          mode: HandoffMode.webCompose,
          message: 'Native share unavailable. Opened Reddit web submission.',
          error: e.toString(),
        );
      }
      return UserAssistedHandoffResult(
        success: false,
        mode: HandoffMode.clipboardOnly,
        message: 'Could not share to Reddit. Title and body are saved to clipboard.',
        error: e.toString(),
      );
    }
  }
}
