import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:social_studio_mobile/core/services/clipboard_assist_service.dart';
import 'package:social_studio_mobile/core/services/platform_capability_registry.dart';
import 'package:social_studio_mobile/core/services/user_assisted_publishers.dart';
import 'package:social_studio_mobile/data/models/platform.dart';
import 'package:social_studio_mobile/data/models/user_assisted_publish_package.dart';
import 'package:social_studio_mobile/features/posts/finish_publishing_sheet.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  group('User-Assisted Publishing Payload Models', () {
    test('XPublishPayload serializes to and from json accurately', () {
      const payload = XPublishPayload(
        text: 'Exciting announcement from 180 Workspace! #buildinpublic',
        mediaPath: '/cache/videos/export.mp4',
        mimeType: 'video/mp4',
        sourceContentId: 'post_123',
        projectId: 'proj_abc',
      );

      final json = payload.toJson();
      expect(json['platform'], 'x');
      expect(json['text'], 'Exciting announcement from 180 Workspace! #buildinpublic');
      expect(json['mediaPath'], '/cache/videos/export.mp4');

      final restored = XPublishPayload.fromJson(json);
      expect(restored.text, payload.text);
      expect(restored.mediaPath, payload.mediaPath);
      expect(restored.mimeType, 'video/mp4');
    });

    test('RedditPublishPayload normalizes subreddit correctly', () {
      final p1 = RedditPublishPayload(
        subreddit: 'r/technology',
        title: 'How we built an Android social media OS',
        body: 'Full breakdown inside...',
      );
      expect(p1.normalizedSubreddit, 'technology');

      final p2 = RedditPublishPayload(
        subreddit: '/r/socialmedia',
        title: 'Growth strategies',
      );
      expect(p2.normalizedSubreddit, 'socialmedia');

      final p3 = RedditPublishPayload(
        subreddit: 'startups',
        title: 'Launching today',
      );
      expect(p3.normalizedSubreddit, 'startups');
    });

    test('UserAssistedPublishPackage bundles X and Reddit payloads', () {
      final package = UserAssistedPublishPackage(
        id: 'post_999',
        projectId: 'proj_1',
        title: 'Universal Post Title',
        caption: 'Universal Post Caption',
        xPayload: const XPublishPayload(text: 'X Caption #growth'),
        redditPayload: const RedditPublishPayload(
          subreddit: 'startups',
          title: 'Reddit Title',
          body: 'Reddit Body',
        ),
      );

      final json = package.toJson();
      expect(json['id'], 'post_999');
      expect(json['xPayload']['text'], 'X Caption #growth');
      expect(json['redditPayload']['title'], 'Reddit Title');

      final restored = UserAssistedPublishPackage.fromJson(json);
      expect(restored.xPayload?.text, 'X Caption #growth');
      expect(restored.redditPayload?.title, 'Reddit Title');
    });
  });

  group('Publishing Validation Layer', () {
    test('XUserAssistedPublisher validates text length and empty checks', () {
      // Empty text
      final empty = XUserAssistedPublisher.validate(
        const XPublishPayload(text: '   '),
      );
      expect(empty, contains('Post text cannot be empty for X.'));

      // Standard text (<= 280 chars)
      final valid = XUserAssistedPublisher.validate(
        const XPublishPayload(text: 'Valid short tweet within standard limits'),
      );
      expect(valid, isEmpty);

      // Long text (> 280 chars)
      final longText = 'A' * 281;
      final overLimit = XUserAssistedPublisher.validate(
        XPublishPayload(text: longText),
      );
      expect(overLimit.any((issue) => issue.contains('280 characters')), isTrue);
    });

    test('RedditUserAssistedPublisher validates required post title', () {
      // Empty title
      final emptyTitle = RedditUserAssistedPublisher.validate(
        const RedditPublishPayload(title: '  '),
      );
      expect(emptyTitle, contains('Post title is required for Reddit.'));

      // Valid title
      final valid = RedditUserAssistedPublisher.validate(
        const RedditPublishPayload(title: 'Valid Reddit Discussion Title'),
      );
      expect(valid, isEmpty);
    });
  });

  group('Platform Capability Registry', () {
    test('X and Reddit are identified as user-assisted platforms', () {
      final xCap = PlatformCapabilityRegistry.getCapabilities(SocialPlatform.x);
      expect(xCap.userAssistedPublishing, isTrue);
      expect(xCap.apiPublishing, isFalse);
      expect(xCap.requiresExternalPostButton, isTrue);

      final redditCap = PlatformCapabilityRegistry.getCapabilities(SocialPlatform.reddit);
      expect(redditCap.userAssistedPublishing, isTrue);
      expect(redditCap.apiPublishing, isFalse);
      expect(redditCap.requiresExternalPostButton, isTrue);
    });

    test('Builds official web fallback URLs accurately', () {
      final xUrl = PlatformCapabilityRegistry.getXWebComposeUrl(text: 'Hello World & Friends');
      expect(xUrl.toString(), 'https://x.com/intent/post?text=Hello%20World%20%26%20Friends');

      final redditUrl = PlatformCapabilityRegistry.getRedditWebComposeUrl(
        subreddit: 'r/technology',
        title: 'Title with spaces',
        body: 'Body text',
      );
      expect(redditUrl.scheme, 'https');
      expect(redditUrl.host, 'www.reddit.com');
      expect(redditUrl.path, '/r/technology/submit');
      expect(redditUrl.queryParameters['title'], 'Title with spaces');
      expect(redditUrl.queryParameters['text'], 'Body text');
    });
  });

  group('UI & Dialog Interactions', () {
    testWidgets('PostPublishReturnDialog responds accurately to user choices', (tester) async {
      String? recordedStatus;

      await tester.pumpWidget(
        MaterialApp(
          home: Builder(
            builder: (ctx) => ElevatedButton(
              onPressed: () => PostPublishReturnDialog.show(
                ctx,
                platform: 'X',
                onConfirm: (status) async => recordedStatus = status,
              ),
              child: const Text('Show Dialog'),
            ),
          ),
        ),
      );

      // Open dialog
      await tester.tap(find.text('Show Dialog'));
      await tester.pumpAndSettle();

      expect(find.text('Did you publish on X?'), findsOneWidget);
      expect(find.text('Yes, I posted'), findsOneWidget);
      expect(find.text('Not yet'), findsOneWidget);
      expect(find.text('Cancel'), findsOneWidget);

      // Tap Yes, I posted
      await tester.tap(find.text('Yes, I posted'));
      await tester.pumpAndSettle();

      expect(recordedStatus, 'user_confirmed');
    });

    testWidgets('FinishPublishingSheet displays X and Reddit sections', (tester) async {
      final package = UserAssistedPublishPackage(
        id: 'post_test_ui',
        projectId: 'proj_ui',
        title: 'Test Discussion Title',
        caption: 'This is the test copy for publishing.',
        xPayload: const XPublishPayload(text: 'This is the test copy for publishing.'),
        redditPayload: const RedditPublishPayload(
          subreddit: 'socialmedia',
          title: 'Test Discussion Title',
          body: 'This is the test copy for publishing.',
        ),
      );

      await tester.pumpWidget(
        ProviderScope(
          child: MaterialApp(
            home: Scaffold(
              body: FinishPublishingSheet(package: package),
            ),
          ),
        ),
      );
      await tester.pumpAndSettle();

      expect(find.text('Finish Publishing'), findsOneWidget);
      expect(find.text('Post on X'), findsWidgets);
      expect(find.text('Post on Reddit'), findsWidgets);
      expect(find.text('r/socialmedia'), findsWidgets);
      expect(find.text('180 Workspace never automatically clicks the final platform Post button. You review and confirm publication in the native app.'), findsOneWidget);
    });
  });
}
