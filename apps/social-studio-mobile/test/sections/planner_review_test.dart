import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:social_studio_mobile/core/widgets/universal_skeleton.dart';
import 'package:social_studio_mobile/features/auth/login_screen.dart';
import 'package:social_studio_mobile/features/planner/calendar_detail_screen.dart';
import 'package:social_studio_mobile/features/planner/calendar_generator_screen.dart';
import 'package:social_studio_mobile/features/reviews/public_review_screen.dart';

import '../support/app_harness.dart';
import '../support/fake_backend.dart';
import '../support/fixtures.dart';

Map<String, dynamic> publicReviewJson({String status = 'pending'}) => {
      'success': true,
      'session': {
        'id': 'rs1',
        'token': 'tok123',
        'name': 'October review',
        'status': status,
        'startDate': '2026-10-01T00:00:00.000Z',
        'endDate': '2026-10-31T00:00:00.000Z',
        'expiresAt': DateTime.now().add(const Duration(days: 10)).toUtc().toIso8601String(),
        'company': {'name': 'Northwind Agency'},
      },
      'posts': [postJson(status: 'in_review', scheduledFor: '2026-10-05T10:00:00.000Z')],
    };

void main() {
  group('Planner', () {
    appTest('skeleton, then calendars; tapping one opens pieces by week', (tester) async {
      final b = seededBackend();
      final gate = b.hold('GET', '$sm/content-calendar', {'calendars': [calendarJson()]});
      final h = await pumpApp(tester, b);
      h.router.go('/planner');
      await settle(tester);
      expect(find.byType(UniversalSkeleton), findsWidgets);
      gate.complete();
      await settle(tester);
      await tester.tap(find.text('Acme').first);
      await settle(tester);
      expect(find.byType(CalendarDetailScreen), findsOneWidget);
      expect(find.text('WEEK 1'), findsOneWidget);
      expect(find.text('3 myths about shipping'), findsOneWidget);
    });

    appTest('empty planner offers "Generate calendar"', (tester) async {
      final b = seededBackend()..json('GET', '$sm/content-calendar', {'calendars': []});
      await pumpApp(tester, b, location: '/planner');
      expect(find.text('No content calendars yet'), findsOneWidget);
      await tester.tap(find.widgetWithText(ElevatedButton, 'Generate calendar'));
      await settle(tester);
      expect(find.byType(CalendarGeneratorScreen), findsOneWidget);
    });

    appTest('planner error offers retry', (tester) async {
      final b = seededBackend()..on('GET', '$sm/content-calendar', (_) => FakeResponse.json({'error': 'LLM quota exceeded'}, status: 500));
      await pumpApp(tester, b, location: '/planner');
      expect(find.text('LLM quota exceeded'), findsOneWidget);
      expect(find.text('Try again'), findsOneWidget);
    });

    appTest('piece status change PUTs to the piece', (tester) async {
      final b = seededBackend()..json('PUT', '$sm/content-calendar/:id/pieces/:pieceId', {'piece': pieceJson()});
      await pumpApp(tester, b, location: '/planner/cal1');
      await tester.tap(find.text('3 myths about shipping'));
      await settle(tester);
      await tester.tap(find.text('Ready').last);
      await settle(tester);
      await tester.tap(find.text('In progress').last);
      await settle(tester);
      expect(b.last('PUT', '$sm/content-calendar/cal1/pieces/piece1')!.json, {'status': 'in_progress'});
    });
  });

  group('Public review portal', () {
    appTest('works signed out: no Authorization header, approve-all posts the batch', (tester) async {
      final b = seededBackend()
        ..json('GET', '$sm/reviews/public/:token', publicReviewJson())
        ..json('POST', '$sm/reviews/public/:token/approve-batch', {'success': true, 'approvedCount': 1});
      final h = await pumpApp(tester, b, store: const {});
      expect(find.byType(LoginScreen), findsOneWidget);
      h.router.go('/review/tok123');
      await settle(tester);
      expect(find.byType(PublicReviewScreen), findsOneWidget);
      expect(find.text('Northwind Agency'), findsOneWidget);

      await tapVisible(tester, find.text('Approve all'));
      await tester.enterText(find.byType(TextField).last, 'Looks great');
      await tester.tap(find.widgetWithText(TextButton, 'Approve'));
      await settle(tester);

      final get = b.last('GET', '$sm/reviews/public/tok123')!;
      final post = b.last('POST', '$sm/reviews/public/tok123/approve-batch')!;
      expect(get.authorization, isNull);
      expect(post.authorization, isNull);
      expect(post.json, {'clientNotes': 'Looks great'});
      expect(find.text('Approved. Thank you!'), findsOneWidget);
    });

    appTest('never sends the staff token even when a staff user is signed in', (tester) async {
      final b = seededBackend()..json('GET', '$sm/reviews/public/:token', publicReviewJson());
      await pumpApp(tester, b, location: '/review/tok123');
      expect(b.last('GET', '$sm/reviews/public/tok123')!.authorization, isNull);
    });

    appTest('request changes posts a client comment', (tester) async {
      final b = seededBackend()
        ..json('GET', '$sm/reviews/public/:token', publicReviewJson())
        ..json('POST', '$sm/reviews/public/:token/comments', {'success': true, 'comment': {'id': 'rc1', 'commentText': 'Shorter caption'}}, status: 201);
      await pumpApp(tester, b, location: '/review/tok123');
      await tester.enterText(find.widgetWithText(TextField, 'Your name'), 'Dana (Acme)');
      await tapVisible(tester, find.text('Request changes'));
      await tester.enterText(find.byType(TextField).last, 'Shorter caption');
      await tester.tap(find.widgetWithText(TextButton, 'Send'));
      await settle(tester);
      expect(b.last('POST', '$sm/reviews/public/tok123/comments')!.json,
          {'postId': 'post1', 'commentText': 'Shorter caption', 'authorName': 'Dana (Acme)', 'authorType': 'client'});
    });

    appTest('an invalid link shows the server error with retry, without a login wall', (tester) async {
      final b = seededBackend()..fail('GET', '$sm/reviews/public/:token', 404, 'Review session not found or expired');
      await pumpApp(tester, b, store: const {}, location: '/review/bad');
      expect(find.text('Review session not found or expired'), findsOneWidget);
      expect(find.text('Try again'), findsOneWidget);
      expect(find.byType(LoginScreen), findsNothing);
    });
  });
}
