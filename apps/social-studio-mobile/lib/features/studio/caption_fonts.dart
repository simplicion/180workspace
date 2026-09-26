import 'dart:io';

import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:path_provider/path_provider.dart';

import '../../core/native_engine/edit_ir.dart';

/// Caption fonts: the same Google Fonts family drives the in-app preview and the Android export.
///
/// The preview loads fonts through `google_fonts`, which caches every downloaded file in the app
/// support directory as `<Family>_<variant>_<hash>.ttf`. Export reuses exactly those files, so the
/// rendered video uses the font the user saw. Inter ships inside the APK and never needs a download.
class CaptionFonts {
  CaptionFonts._();

  /// Families the caption presets use and that export fetches before rendering.
  static const exportFamilies = {'Anton', 'Montserrat', 'Poppins', 'Syne', 'Outfit', 'Inter', 'Roboto', 'Bebas Neue'};

  static FontWeight weightOf(Object? w) {
    final v = ((w as num?)?.toInt() ?? 800).clamp(100, 900);
    return FontWeight.values[(v / 100).round() - 1];
  }

  /// Preview text style for a caption style map (family, weight, glow). Unknown families use Inter.
  static TextStyle textStyle(Map<String, dynamic> st, {required double fontSize, Color? color, List<Shadow>? shadows}) {
    final family = st['fontFamily'] as String? ?? 'Inter';
    final weight = weightOf(st['fontWeight']);
    try {
      return GoogleFonts.getFont(family, fontSize: fontSize, fontWeight: weight, color: color, shadows: shadows);
    } catch (_) {
      return GoogleFonts.inter(fontSize: fontSize, fontWeight: weight, color: color, shadows: shadows);
    }
  }

  /// Local font files for every non-Inter caption family used by [ir], keyed `family:weight` and
  /// `family` (the renderer's lookup keys). A family that cannot be fetched is left out and reported
  /// in the returned warnings; the renderer then draws it with the bundled Inter.
  static Future<(Map<String, String>, List<String>)> resolveForExport(
    MobileEditIr ir, {
    Duration timeout = const Duration(seconds: 20),
  }) async {
    final wanted = <(String, int)>{
      for (final c in ir.captions)
        ((c.style['fontFamily'] as String?) ?? 'Inter', weightOf(c.style['fontWeight']).value),
    }.where((f) => f.$1.toLowerCase() != 'inter').toList();
    final paths = <String, String>{};
    final warnings = <String>[];
    if (wanted.isEmpty) return (paths, warnings);
    Directory? dir;
    try {
      dir = await getApplicationSupportDirectory();
    } catch (_) {}
    for (final (family, weight) in wanted) {
      String? path;
      try {
        final style = GoogleFonts.getFont(family, fontWeight: weightOf(weight));
        await GoogleFonts.pendingFonts([style]).timeout(timeout);
        if (dir != null) path = await _cachedFile(dir, family, weight);
      } catch (_) {
        path = null;
      }
      if (path == null) {
        warnings.add('The "$family" caption font could not be downloaded, so captions use Inter instead.');
        continue;
      }
      paths['$family:$weight'] = path;
      paths.putIfAbsent(family, () => path!);
    }
    return (paths, warnings);
  }

  /// google_fonts writes the file without awaiting it, so poll briefly for it to appear.
  static Future<String?> _cachedFile(Directory dir, String family, int weight) async {
    final prefix = '${family.replaceAll(' ', '')}_';
    for (var attempt = 0; attempt < 15; attempt++) {
      final best = _closest(dir, prefix, weight);
      if (best != null) return best;
      await Future<void>.delayed(const Duration(milliseconds: 200));
    }
    return null;
  }

  /// The cached non-italic variant closest to [weight] (google_fonts also picks the closest one).
  static String? _closest(Directory dir, String prefix, int weight) {
    if (!dir.existsSync()) return null;
    String? best;
    var bestD = 1 << 30;
    for (final f in dir.listSync().whereType<File>()) {
      final name = f.uri.pathSegments.last;
      if (!name.startsWith(prefix) || !name.endsWith('.ttf') || f.lengthSync() == 0) continue;
      final variant = name.substring(prefix.length).split('_').first;
      final w = variant == 'regular' ? 400 : int.tryParse(variant);
      if (w == null) continue; // italic variants
      final d = (w - weight).abs();
      if (d < bestD) {
        bestD = d;
        best = f.path;
      }
    }
    return best;
  }
}
