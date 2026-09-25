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
import '../studio/studio_screen.dart';
import '../studio/studio_session_screen.dart';
import '../workspace/project_workspace_screen.dart';

String? _q(GoRouterState s, String k) {
  final v = s.uri.queryParameters[k];
  return v == null || v.isEmpty ? null : v;
}

Json _extra(GoRouterState s) => s.extra is Map ? (s.extra as Map).cast<String, dynamic>() : const {};

/// Bottom-nav branches after Home, in [AppShell] order: Planner, Inbox, Library, Studio.
List<StatefulShellBranch> shellBranches() => [
      StatefulShellBranch(routes: [GoRoute(path: '/planner', builder: (_, _) => const PlannerScreen())]),
      StatefulShellBranch(routes: [GoRoute(path: '/inbox', builder: (_, _) => const InboxScreen())]),
      StatefulShellBranch(routes: [GoRoute(path: '/library', builder: (_, _) => const LibraryScreen())]),
      StatefulShellBranch(routes: [GoRoute(path: '/studio', builder: (_, _) => const StudioScreen())]),
    ];

/// Full-screen routes outside the bottom navigation.
List<RouteBase> extraRoutes() => [
      GoRoute(path: '/settings', builder: (_, _) => const SettingsScreen()),
      GoRoute(path: '/projects', builder: (_, _) => const ProjectsListScreen()),
      GoRoute(path: '/projects/new', builder: (_, _) => const CreateProjectScreen()),
      GoRoute(
        path: '/projects/:id/:tab',
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
            hook: jStr(x['hook']),
            script: jStr(x['script']),
            projectId: _q(s, 'projectId') ?? jStr(x['projectId']),
            postId: _q(s, 'postId'),
          );
        },
      ),
      GoRoute(
        path: '/studio/session',
        builder: (_, s) => studioSupported
            ? StudioSessionScreen(
                sourcePath: jStr(_extra(s)['sourcePath']),
                postId: _q(s, 'postId'),
                projectId: _q(s, 'projectId'),
              )
            : const StudioScreen(),
      ),
      GoRoute(path: '/review/:token', builder: (_, s) => PublicReviewScreen(token: s.pathParameters['token']!)),
    ];
