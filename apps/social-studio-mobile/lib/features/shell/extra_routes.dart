import 'package:go_router/go_router.dart';

import '../../core/util/json.dart';
import '../../data/models/content_calendar.dart';
import '../inbox/conversation_screen.dart';
import '../inbox/inbox_screen.dart';
import '../library/library_screen.dart';
import '../planner/calendar_detail_screen.dart';
import '../planner/calendar_generator_screen.dart';
import '../planner/planner_screen.dart';
import '../posts/post_composer_screen.dart';
import '../posts/post_detail_screen.dart';
import '../projects/create_project_screen.dart';
import '../projects/projects_list_screen.dart';
import '../reviews/public_review_screen.dart';
import '../settings/settings_screen.dart';
import '../studio/camera_screen.dart';
import '../studio/studio_drafts_service.dart';
import '../studio/studio_screen.dart';
import '../studio/studio_session_screen.dart';
import '../workspace/oauth_callback_screen.dart';
import '../workspace/project_workspace_screen.dart';

String? _q(GoRouterState s, String k) {
  final v = s.uri.queryParameters[k];
  return v == null || v.isEmpty ? null : v;
}

Json _extra(GoRouterState s) => s.extra is Map ? (s.extra as Map).cast<String, dynamic>() : {};

/// Bottom-nav branches after Home, in [AppShell] order: Planner, Inbox, Library, Studio.
List<StatefulShellBranch> shellBranches() => [
      StatefulShellBranch(routes: [GoRoute(path: '/planner', builder: (_, _) => PlannerScreen())]),
      StatefulShellBranch(routes: [
        GoRoute(
          path: '/inbox',
          // Deep link from the 180 Manager / notifications: /inbox?conversationId=… opens that thread.
          redirect: (_, s) {
            final id = s.uri.queryParameters['conversationId'];
            return id == null || id.isEmpty ? null : '/inbox/${Uri.encodeComponent(id)}';
          },
          builder: (_, _) => InboxScreen(),
        ),
      ]),
      StatefulShellBranch(routes: [GoRoute(path: '/library', builder: (_, _) => LibraryScreen())]),
      StatefulShellBranch(routes: [GoRoute(path: '/studio', builder: (_, _) => StudioScreen())]),
    ];

/// Full-screen routes outside the bottom navigation.
List<RouteBase> extraRoutes() => [
      GoRoute(path: '/settings', builder: (_, _) => SettingsScreen()),
      GoRoute(path: '/projects', builder: (_, _) => ProjectsListScreen()),
      GoRoute(path: '/projects/new', builder: (_, _) => CreateProjectScreen()),
      GoRoute(
        path: '/projects/:id/:tab',
        redirect: (_, s) => s.pathParameters['tab'] == 'media' ? '/library' : null,
        builder: (_, s) => ProjectWorkspaceScreen(
          projectId: s.pathParameters['id']!,
          tab: s.pathParameters['tab']!,
          query: s.uri.queryParameters,
        ),
      ),
      GoRoute(
        path: '/posts/new',
        builder: (_, s) => PostComposerScreen(
          projectId: _q(s, 'projectId'),
          date: DateTime.tryParse(_q(s, 'date') ?? ''),
          calendarId: _q(s, 'calendarId'),
          pieceId: _q(s, 'pieceId'),
          prefill: _extra(s),
        ),
      ),
      GoRoute(path: '/posts/:id', builder: (_, s) => PostDetailScreen(postId: s.pathParameters['id']!)),
      GoRoute(path: '/posts/:id/edit', builder: (_, s) => PostComposerScreen(postId: s.pathParameters['id']!)),
      GoRoute(
        path: '/planner/new',
        builder: (_, s) => CalendarGeneratorScreen(extendFrom: s.extra is ContentCalendar ? s.extra as ContentCalendar : null),
      ),
      GoRoute(path: '/planner/:id', builder: (_, s) => CalendarDetailScreen(calendarId: s.pathParameters['id']!)),
      GoRoute(path: '/inbox/:id', builder: (_, s) => ConversationScreen(conversationId: s.pathParameters['id']!)),
      GoRoute(
        path: '/camera',
        builder: (_, s) {
          final x = _extra(s);
          return CameraScreen(
            hook: _q(s, 'hook') ?? jStr(x['hook']),
            script: _q(s, 'script') ?? jStr(x['script']),
            projectId: _q(s, 'projectId') ?? jStr(x['projectId']),
            postId: _q(s, 'postId'),
            pieceId: _q(s, 'pieceId') ?? jStr(x['pieceId']),
            folderId: _q(s, 'folderId') ?? jStr(x['folderId']),
            folderName: _q(s, 'folderName') ?? jStr(x['folderName']),
            speed: double.tryParse(_q(s, 'speed') ?? '') ?? (x['speed'] as num?)?.toDouble() ?? 1.2,
            fontSize: double.tryParse(_q(s, 'fontSize') ?? '') ?? (x['fontSize'] as num?)?.toDouble() ?? 22.0,
          );
        },
      ),
      GoRoute(
        path: '/studio/session',
        builder: (_, s) {
          final x = _extra(s);
          return studioSupported
              ? StudioSessionScreen(
                  sourcePath: jStr(x['sourcePath']),
                  sourcePaths: jStrList(x['sourcePaths']),
                  postId: _q(s, 'postId') ?? jStr(x['postId']),
                  projectId: _q(s, 'projectId') ?? jStr(x['projectId']),
                  pieceId: _q(s, 'pieceId') ?? jStr(x['pieceId']),
                  hook: jStr(x['hook']),
                  script: jStr(x['script']),
                  folderId: _q(s, 'folderId') ?? jStr(x['folderId']),
                  folderName: _q(s, 'folderName') ?? jStr(x['folderName']),
                  draftId: _q(s, 'draftId') ?? jStr(x['draftId']),
                  draft: x['draft'] is StudioDraft ? x['draft'] as StudioDraft : null,
                )
              : StudioScreen();
        },
      ),
      GoRoute(path: '/review/:token', builder: (_, s) => PublicReviewScreen(token: s.pathParameters['token']!)),
      GoRoute(path: '/oauth-callback', builder: (_, s) => OAuthCallbackScreen(query: s.uri.queryParameters)),
      GoRoute(path: '/oauth/callback', builder: (_, s) => OAuthCallbackScreen(query: s.uri.queryParameters)),
    ];
