import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/providers.dart';
import '../../data/models/content_calendar.dart';

final calendarsProvider = FutureProvider.autoDispose<List<ContentCalendar>>((ref) {
  ref.watch(currentUserIdProvider);
  return ref.watch(socialApiProvider).listCalendars();
});

final calendarDetailProvider = FutureProvider.autoDispose.family<ContentCalendar, String>((ref, id) {
  return ref.watch(socialApiProvider).getCalendar(id);
});
