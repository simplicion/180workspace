import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:social_studio_mobile/core/widgets/universal_skeleton.dart';
import 'package:social_studio_mobile/features/inbox/conversation_screen.dart';
import 'package:social_studio_mobile/features/workspace/project_workspace_screen.dart';

import '../support/app_harness.dart';
import '../support/fixtures.dart';

void main() {
  group('Inbox', () {
    appTest('skeleton, then conversations; tapping one opens the thread', (tester) async {
      final b = seededBackend();
      final gate = b.hold('GET', '$sm/inbox/conversations', {'success': true, 'conversations': [conversationJson()]});
      final h = await pumpApp(tester, b);
      h.router.go('/inbox');
      await settle(tester);
      expect(find.byType(UniversalSkeleton), findsWidgets);
      gate.complete();
      await settle(tester);
      await tester.tap(find.text('Jordan Fan'));
      await settle(tester);
      expect(find.byType(ConversationScreen), findsOneWidget);
      expect(find.text('Do you ship to Canada?'), findsWidgets);
    });

    appTest('empty inbox offers "Manage channels" for the active project', (tester) async {
      final b = seededBackend()..json('GET', '$sm/inbox/conversations', {'success': true, 'conversations': []});
      await pumpApp(tester, b, location: '/inbox');
      expect(find.text('Inbox zero'), findsOneWidget);
      await tester.tap(find.widgetWithText(ElevatedButton, 'Manage channels'));
      await settle(tester);
      expect(find.byType(ProjectWorkspaceScreen), findsOneWidget);
      expect(find.descendant(of: find.byType(AppBar), matching: find.text('Channels')), findsOneWidget);
    });

    appTest('list error offers retry', (tester) async {
      final b = seededBackend()..fail('GET', '$sm/inbox/conversations', 400, 'Invalid platform');
      await pumpApp(tester, b, location: '/inbox');
      expect(find.text('Invalid platform'), findsOneWidget);
      expect(find.text('Try again'), findsOneWidget);
    });

    appTest('reply posts {content, senderType:agent} and reloads the thread', (tester) async {
      final b = seededBackend()
        ..json('POST', '$sm/inbox/conversations/:id/messages', {'success': true, 'message': {'id': 'm2', 'senderType': 'agent', 'content': 'Yes we do!'}}, status: 201);
      await pumpApp(tester, b, location: '/inbox/conv1');
      await tester.enterText(find.widgetWithText(TextField, 'Reply'), 'Yes we do!');
      await tester.tap(find.byTooltip('Send'));
      await settle(tester);
      expect(b.last('POST', '$sm/inbox/conversations/conv1/messages')!.json, {'content': 'Yes we do!', 'senderType': 'agent'});
      expect(b.calls('GET', '$sm/inbox/conversations/conv1'), hasLength(2));
    });

    appTest('AI suggestions fill the reply box', (tester) async {
      final b = seededBackend()
        ..json('GET', '$sm/inbox/conversations/:id/ai-suggestions', {
          'success': true,
          'suggestions': [
            {'tone': 'friendly', 'text': 'We ship to Canada in 3-5 days!'},
          ],
          'brandToneApplied': 'Friendly & conversational',
        });
      await pumpApp(tester, b, location: '/inbox/conv1');
      await tester.tap(find.byTooltip('Suggest replies in brand voice'));
      await settle(tester);
      await tester.tap(find.text('We ship to Canada in 3-5 days!'));
      await settle(tester);
      final field = tester.widget<TextField>(find.widgetWithText(TextField, 'Reply'));
      expect(field.controller!.text, 'We ship to Canada in 3-5 days!');
    });

    appTest('offline reply is queued and shown as waiting to send', (tester) async {
      final b = seededBackend()..networkError('POST', '$sm/inbox/conversations/:id/messages');
      final h = await pumpApp(tester, b, location: '/inbox/conv1');
      await tester.enterText(find.widgetWithText(TextField, 'Reply'), 'Back soon');
      await tester.tap(find.byTooltip('Send'));
      await settle(tester);
      expect(find.text('Waiting to send'), findsOneWidget);
      expect(h.outboxStorage.rows.single['label'], 'Send inbox reply');
      // Going offline must not reload every screen (regression: SocialApi watched the outbox).
      expect(b.calls('GET', '$sm/inbox/conversations/conv1'), hasLength(1));
      expect(b.calls('POST', '$sm/inbox/conversations/conv1/messages'), hasLength(1));
    });
  });

  group('Library', () {
    appTest('assets list hides hashtag/hook bank rows', (tester) async {
      await pumpApp(tester, seededBackend(), location: '/library');
      expect(find.text('Brand kit'), findsOneWidget);
      expect(find.text('Core'), findsNothing);
    });

    appTest('empty assets offers "Link an asset"; linking posts url/type/title', (tester) async {
      final b = seededBackend()
        ..json('GET', '$sm/assets', {'success': true, 'assets': []})
        ..json('POST', '$sm/assets', {'success': true, 'asset': {'id': 'as9'}}, status: 201);
      await pumpApp(tester, b, location: '/library');
      expect(find.text('No linked assets'), findsOneWidget);
      await tester.tap(find.widgetWithText(ElevatedButton, 'Link an asset'));
      await settle(tester);
      await tester.enterText(find.widgetWithText(TextField, 'URL *'), 'https://dropbox.com/logo.png');
      await tester.enterText(find.widgetWithText(TextField, 'Title'), 'Logo');
      await tester.tap(find.widgetWithText(TextButton, 'Save'));
      await settle(tester);
      expect(tester.takeException(), isNull);
      expect(b.last('POST', '$sm/assets')!.json, {'url': 'https://dropbox.com/logo.png', 'type': 'image', 'title': 'Logo', 'tags': []});
      expect(find.text('Asset linked'), findsOneWidget);
      expect(b.calls('GET', '$sm/assets'), hasLength(2));
    });

    appTest('an invalid URL is rejected locally', (tester) async {
      final b = seededBackend();
      await pumpApp(tester, b, location: '/library');
      await tester.tap(find.byTooltip('Link an asset'));
      await settle(tester);
      await tester.enterText(find.widgetWithText(TextField, 'URL *'), 'not a url');
      await tester.tap(find.widgetWithText(TextButton, 'Save'));
      await settle(tester);
      expect(find.text('Enter a full URL starting with https://'), findsOneWidget);
      expect(b.calls('POST', '$sm/assets'), isEmpty);
    });

    appTest('hashtag bank: list, and create posts {type,name,content,tags}', (tester) async {
      final b = seededBackend()..json('POST', '$sm/saved-banks', {'success': true, 'bank': {'id': 'bk9'}});
      await pumpApp(tester, b, location: '/library');
      await tester.tap(find.text('Hashtags'));
      await settle(tester);
      expect(find.text('Core tags'), findsOneWidget);
      expect(find.text('Myth opener'), findsNothing);
      await tester.tap(find.byTooltip('New hashtag set'));
      await settle(tester);
      await tester.enterText(find.byType(TextField).last, 'Fitness');
      await tester.tap(find.widgetWithText(TextButton, 'Next'));
      await settle(tester);
      await tester.enterText(find.byType(TextField).last, '#gym #fit');
      await tester.tap(find.widgetWithText(TextButton, 'Save'));
      await settle(tester);
      expect(b.last('POST', '$sm/saved-banks')!.json, {'type': 'hashtag', 'name': 'Fitness', 'content': '#gym #fit', 'tags': []});
    });

    appTest('assets load error offers retry', (tester) async {
      final b = seededBackend()..fail('GET', '$sm/assets', 500, 'Storage offline');
      await pumpApp(tester, b, location: '/library');
      expect(find.text('Storage offline'), findsOneWidget);
      expect(find.text('Try again'), findsOneWidget);
    });
  });
}
