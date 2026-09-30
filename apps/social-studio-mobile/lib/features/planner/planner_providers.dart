import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/providers.dart';
import '../../data/models/content_calendar.dart';

import '../projects/project_provider.dart';

final projectCalendarsProvider = FutureProvider.autoDispose.family<List<ContentCalendar>, String>((ref, projectId) {
  ref.watch(currentUserIdProvider);
  return ref.watch(socialApiProvider).listCalendars(projectId: projectId);
});

final calendarsProvider = FutureProvider.autoDispose<List<ContentCalendar>>((ref) {
  ref.watch(currentUserIdProvider);
  final activeProject = ref.watch(activeProjectProvider).valueOrNull;
  if (activeProject != null) {
    return ref.watch(socialApiProvider).listCalendars(projectId: activeProject.id);
  }
  return const [];
});

final calendarDetailProvider = FutureProvider.autoDispose.family<ContentCalendar, String>((ref, id) {
  return ref.watch(socialApiProvider).getCalendar(id);
});
