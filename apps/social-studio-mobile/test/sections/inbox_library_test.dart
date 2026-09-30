import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
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

  group('Library Vault', () {
    appTest('vault lists seeded folders and categorized notes', (tester) async {
      await pumpApp(tester, seededBackend(), location: '/library');
      expect(find.text('Viral Reels & Shorts'), findsOneWidget);
      expect(find.text('High-Converting Hooks'), findsOneWidget);
      expect(find.text('3-Sec Curiosity Pattern Interrupt'), findsOneWidget);
      expect(find.text('HOOK'), findsOneWidget);
    });

    appTest('tapping a folder navigates inside it with breadcrumb', (tester) async {
      await pumpApp(tester, seededBackend(), location: '/library');
      await tester.tap(find.text('Viral Reels & Shorts'));
      await settle(tester);
      expect(find.text('Vault Root'), findsOneWidget);
      expect(find.text('High-Converting Product Teaser Script'), findsOneWidget);
    });

    appTest('filtering by notes shows only notes', (tester) async {
      await pumpApp(tester, seededBackend(), location: '/library');
      await tester.tap(find.text('Notes & Hooks'), warnIfMissed: false);
      await settle(tester);
      expect(find.text('3-Sec Curiosity Pattern Interrupt'), findsOneWidget);
      await tester.drag(find.byType(CustomScrollView), const Offset(0, -300));
      await settle(tester);
      expect(find.text('High-Converting Product Teaser Script'), findsOneWidget);
    });

    appTest('copying a note copies its content', (tester) async {
      String? copiedText;
      tester.binding.defaultBinaryMessenger.setMockMethodCallHandler(SystemChannels.platform, (call) async {
        if (call.method == 'Clipboard.setData') {
          copiedText = (call.arguments as Map)['text'] as String?;
        }
        return null;
      });
      await pumpApp(tester, seededBackend(), location: '/library');
      expect(find.byTooltip('Copy Note Content'), findsWidgets);
      await tester.tap(find.byTooltip('Copy Note Content').first, warnIfMissed: false);
      await settle(tester);
      expect(copiedText, isNotEmpty);
    });
  });
}
