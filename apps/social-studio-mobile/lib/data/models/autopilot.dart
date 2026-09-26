import 'dart:convert';

import '../../core/util/json.dart';

/// `GET /projects/:id/autopilot/jobs/:jobId`. The server's multi-agent calendar run.
class AutopilotJob {
  const AutopilotJob({
    required this.jobId,
    required this.calendarId,
    required this.status,
    required this.stage,
    required this.progress,
    this.detail,
    this.errorCode,
    this.errorMessage,
    this.totalPieces,
  });

  final String jobId;
  final String calendarId;

  /// queued | running | completed | failed
  final String status;

  /// queued | research | strategy | hooks_scripts | copy | critic | saving | done
  final String stage;

  /// 0–100.
  final int progress;
  final String? detail;
  final String? errorCode;
  final String? errorMessage;
  final int? totalPieces;

  bool get isDone => status == 'completed';
  bool get isFailed => status == 'failed';
  bool get isFinished => isDone || isFailed;

  static const stageLabels = {
    'queued': 'Waiting to start',
    'research': 'Researching your niche',
    'strategy': 'Planning the strategy',
    'hooks_scripts': 'Writing hooks and scripts',
    'copy': 'Writing captions',
    'critic': 'Reviewing quality',
    'saving': 'Saving your calendar',
    'done': 'Done',
  };

  String get stageLabel => stageLabels[stage] ?? stage;

  factory AutopilotJob.fromJson(Json j) {
    final err = jMap(j['error']);
    return AutopilotJob(
      jobId: jStrOr(j['jobId'], ''),
      calendarId: jStrOr(j['calendarId'], ''),
      status: jStrOr(j['status'], 'queued'),
      stage: jStrOr(j['stage'], 'queued'),
      progress: (jInt(j['progress']) ?? 0).clamp(0, 100).toInt(),
      detail: jStr(j['detail']),
      errorCode: jStr(err['code']),
      errorMessage: jStr(err['message']),
      totalPieces: jInt(j['totalPieces']),
    );
  }
}

class CreativeSlide {
  const CreativeSlide({required this.index, required this.url, this.headline});
  final int index;
  final String url;
  final String? headline;
}

/// `GET /projects/:id/creative/jobs/:jobId` → `job`. Carousel or single static post render.
class CreativeJob {
  const CreativeJob({
    required this.id,
    required this.kind,
    required this.status,
    required this.step,
    required this.done,
    required this.total,
    this.slides = const [],
    this.coverUrl,
    this.warnings = const [],
    this.errorCode,
    this.errorMessage,
    this.postId,
  });

  final String id;
  final String kind;
  final String status;
  final String step;
  final int done;
  final int total;
  final List<CreativeSlide> slides;
  final String? coverUrl;
  final List<String> warnings;
  final String? errorCode;
  final String? errorMessage;
  final String? postId;

  bool get isDone => status == 'completed';
  bool get isFailed => status == 'failed';
  bool get isFinished => isDone || isFailed;
  double? get fraction => total > 0 ? (done / total).clamp(0, 1).toDouble() : null;

  factory CreativeJob.fromJson(Json j) {
    final result = jMap(j['result']);
    final progress = jMap(j['progress']);
    final err = jMap(j['error']);
    final urls = jStrList(result['mediaUrls']);
    final rawSlides = result['slides'] is List ? result['slides'] as List : const [];
    final slides = <CreativeSlide>[];
    for (var i = 0; i < rawSlides.length; i++) {
      final s = jMap(rawSlides[i]);
      final url = jStr(s['url']) ?? jStr(s['imageUrl']) ?? (i < urls.length ? urls[i] : null);
      if (url == null || url.isEmpty) continue;
      slides.add(CreativeSlide(index: jInt(s['index']) ?? i, url: url, headline: jStr(s['headline'])));
    }
    if (slides.isEmpty) {
      for (var i = 0; i < urls.length; i++) {
        slides.add(CreativeSlide(index: i, url: urls[i]));
      }
    }
    return CreativeJob(
      id: jStrOr(j['id'], ''),
      kind: jStrOr(j['kind'], 'carousel'),
      status: jStrOr(j['status'], 'queued'),
      step: jStrOr(j['step'], ''),
      done: jInt(progress['done']) ?? 0,
      total: jInt(progress['total']) ?? 0,
      slides: slides,
      coverUrl: jStr(result['coverUrl']),
      warnings: jStrList(j['warnings']),
      errorCode: jStr(err['code']),
      errorMessage: jStr(err['message']),
      postId: jStr(j['postId']),
    );
  }
}

class ScriptBeat {
  const ScriptBeat(this.beat, [this.retentionDevice]);
  final String beat;
  final String? retentionDevice;
}

/// The autopilot piece payload the server stores as JSON in `videoScriptOrHooks`.
/// [PieceBrief.parse] returns null for plain-text scripts (older calendars, user edits).
class PieceBrief {
  const PieceBrief({
    this.format,
    this.spokenHook,
    this.onScreenHook,
    this.hook,
    this.body = const [],
    this.retentionLoop,
    this.cta,
    this.durationSec,
    this.shotNotes = const [],
    this.carouselTitle,
    this.carouselSlides = const [],
    this.visualBrief,
    this.raw = const {},
  });

  final String? format;
  final String? spokenHook;
  final String? onScreenHook;
  final String? hook;
  final List<ScriptBeat> body;
  final String? retentionLoop;
  final String? cta;
  final int? durationSec;
  final List<String> shotNotes;
  final String? carouselTitle;
  final List<({String? role, String headline, String? body})> carouselSlides;
  final String? visualBrief;
  final Json raw;

  static PieceBrief? parse(String text) {
    final t = text.trim();
    if (!t.startsWith('{')) return null;
    Object? decoded;
    try {
      decoded = jsonDecode(t);
    } catch (_) {
      return null;
    }
    if (decoded is! Map) return null;
    final j = decoded.cast<String, dynamic>();
    final script = jMap(j['script']);
    final carousel = jMap(j['carouselBrief']);
    final body = <ScriptBeat>[];
    for (final b in script['body'] is List ? script['body'] as List : const []) {
      if (b is String && b.trim().isNotEmpty) {
        body.add(ScriptBeat(b.trim()));
      } else if (b is Map) {
        final m = b.cast<String, dynamic>();
        final beat = jStr(m['beat']);
        if (beat != null && beat.isNotEmpty) body.add(ScriptBeat(beat, jStr(m['retentionDevice'])));
      }
    }
    final visual = j['visualBrief'];
    return PieceBrief(
      format: jStr(j['format']),
      spokenHook: jStr(j['spokenHook']),
      onScreenHook: jStr(j['onScreenHook']),
      hook: jStr(script['hook']),
      body: body,
      retentionLoop: jStr(script['retentionLoop']),
      cta: jStr(script['cta']),
      durationSec: jInt(script['estimatedDurationSec']),
      shotNotes: jStrList(j['shotNotes']),
      carouselTitle: jStr(carousel['title']),
      carouselSlides: [
        for (final s in jList(carousel['slides'], (m) => m))
          (role: jStr(s['role']), headline: jStrOr(s['headline'], ''), body: jStr(s['body'])),
      ],
      visualBrief: visual is String ? visual : (visual is Map ? jStr(visual['summary']) ?? jsonEncode(visual) : null),
      raw: j,
    );
  }

  /// The best line to open a recording with.
  String? get openingHook => spokenHook ?? hook ?? onScreenHook;

  bool get hasScript => openingHook != null || body.isNotEmpty || cta != null;

  /// Plain words for the teleprompter: hook, beats, loop, CTA. No labels, nothing the creator shouldn't say.
  String get teleprompterText => [
        ?openingHook,
        for (final b in body) b.beat,
        ?retentionLoop,
        ?cta,
      ].where((s) => s.trim().isNotEmpty).join('\n\n');
}

/// `GET/PUT /projects/:id/brand-consciousness` → `brand`. Only what the user entered; nulls are "not set".
class BrandConsciousness {
  const BrandConsciousness({
    this.brandName,
    this.brandType,
    this.website,
    this.industry,
    this.country,
    this.language,
    this.positioning,
    this.tagline,
    this.description,
    this.ideation,
    this.ideology,
    this.backgroundColor,
    this.textColor,
    this.secondaryColor,
    this.targetPlatforms = const [],
    this.watermarkEnabled,
    this.customGuidelines,
    this.postsPerWeek,
    this.claimsToAvoid = const [],
    this.primaryObjective,
    this.editingAutonomy,
    this.publishingAutonomy,
    this.percent = 0,
    this.missingRequired = const [],
  });

  final String? brandName;
  final String? brandType;
  final String? website;
  final String? industry;
  final String? country;
  final String? language;
  final String? positioning;
  final String? tagline;
  final String? description;
  final String? ideation;
  final String? ideology;
  final String? backgroundColor;
  final String? textColor;
  final String? secondaryColor;
  final List<String> targetPlatforms;
  final bool? watermarkEnabled;
  final String? customGuidelines;
  final int? postsPerWeek;
  final List<String> claimsToAvoid;
  final String? primaryObjective;
  final String? editingAutonomy;
  final String? publishingAutonomy;
  final int percent;
  final List<String> missingRequired;

  static const brandTypes = {'company': 'Company', 'creator': 'Creator', 'agency': 'Agency'};
  static const platforms = {
    'instagram': 'Instagram',
    'facebook': 'Facebook',
    'tiktok': 'TikTok',
    'youtube': 'YouTube',
    'linkedin': 'LinkedIn',
    'twitter': 'X',
  };

  static const fieldLabels = {
    'brandType': 'Brand type',
    'positioning': 'Positioning',
    'description': 'What the brand does',
    'colors.primary': 'Primary colour',
    'tone': 'Tone',
    'audience': 'Audience',
    'targetPlatforms': 'Target platforms',
  };

  factory BrandConsciousness.fromJson(Json j) {
    final colors = jMap(j['colors']);
    final c = jMap(j['completeness']);
    final freq = jMap(j['postingFrequency']);
    final restr = jMap(j['restrictions']);
    final obj = jMap(j['objectives']);
    final aut = jMap(j['autonomy']);
    return BrandConsciousness(
      brandName: jStr(j['brandName']),
      brandType: jStr(j['brandType']),
      website: jStr(j['website']),
      industry: jStr(j['industry']),
      country: jStr(j['country']),
      language: jStr(j['language']),
      positioning: jStr(j['positioning']),
      tagline: jStr(j['tagline']),
      description: jStr(j['description']),
      ideation: jStr(j['ideation']),
      ideology: jStr(j['ideology']),
      backgroundColor: jStr(colors['background']),
      textColor: jStr(colors['text']),
      secondaryColor: jStr(colors['secondary']),
      targetPlatforms: jStrList(j['targetPlatforms']),
      watermarkEnabled: j['watermarkEnabled'] is bool ? j['watermarkEnabled'] as bool : null,
      customGuidelines: jStr(j['customGuidelines']),
      postsPerWeek: jInt(freq['perWeek']),
      claimsToAvoid: jStrList(restr['claimsToAvoid']),
      primaryObjective: jStr(obj['primary']),
      editingAutonomy: jStr(aut['editing']),
      publishingAutonomy: jStr(aut['publishing']),
      percent: jInt(c['percent']) ?? 0,
      missingRequired: jStrList(c['missingRequired']),
    );
  }

  /// Partial PUT body for the identity fields this screen owns. Empty strings clear a field on the server.
  Json toIdentityJson() => {
        'brandName': brandName ?? '',
        'brandType': brandType,
        if (website != null) 'website': website,
        if (industry != null) 'industry': industry,
        if (country != null) 'country': country,
        if (language != null) 'language': language,
        'positioning': positioning ?? '',
        'tagline': tagline ?? '',
        'description': description ?? '',
        'ideation': ideation ?? '',
        'ideology': ideology ?? '',
        'colors': {
          'background': backgroundColor,
          'text': textColor,
          if (secondaryColor != null) 'secondary': secondaryColor,
        },
        'targetPlatforms': targetPlatforms,
        'watermarkEnabled': watermarkEnabled,
        'customGuidelines': customGuidelines ?? '',
        if (postsPerWeek != null) 'postingFrequency': {'perWeek': postsPerWeek},
        if (claimsToAvoid.isNotEmpty) 'restrictions': {'claimsToAvoid': claimsToAvoid},
        if (primaryObjective != null) 'objectives': {'primary': primaryObjective},
        if (editingAutonomy != null || publishingAutonomy != null)
          'autonomy': {
            if (editingAutonomy != null) 'editing': editingAutonomy,
            if (publishingAutonomy != null) 'publishing': publishingAutonomy,
          },
      };
}
