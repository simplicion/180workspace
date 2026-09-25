import '../../core/util/json.dart';

/// Per-project brand identity (`BrandVoiceProfile`).
///
/// The backend stores `tone, targetAudience, sampleViralPosts, forbiddenWords, defaultHashtags,
/// standardCtas, metadata`. Content pillars and the hook style have no column, so they live in
/// `metadata.contentPillars` / `metadata.hookStyle` / `metadata.hooks`.
class BrandVoice {
  const BrandVoice({
    this.id,
    required this.projectId,
    this.tone = '',
    this.targetAudience = '',
    this.sampleViralPosts = const [],
    this.forbiddenWords = const [],
    this.defaultHashtags = const [],
    this.standardCtas = const [],
    this.contentPillars = const [],
    this.hookStyle = '',
    this.hooks = const [],
    this.logoUrl,
    this.primaryColor,
    this.accentColor,
    this.font,
    this.captionStylePreset,
    this.metadata = const {},
  });

  final String? id;
  final String projectId;
  final String tone;
  final String targetAudience;
  final List<String> sampleViralPosts;
  final List<String> forbiddenWords;
  final List<String> defaultHashtags;
  final List<String> standardCtas;
  final List<String> contentPillars;
  final String hookStyle;
  final List<String> hooks;
  final String? logoUrl;
  final String? primaryColor;
  final String? accentColor;
  final String? font;
  final String? captionStylePreset;
  final Json metadata;

  /// True when the server returned its synthetic default (no row yet).
  bool get isUnsaved => id == null;

  factory BrandVoice.fromJson(Json j, {String? projectId}) {
    final meta = jMap(j['metadata']);
    final colors = jMap(j['colors'] ?? meta['colors']);
    return BrandVoice(
      id: jStr(j['id']),
      projectId: jStr(j['projectId']) ?? projectId ?? '',
      tone: jStr(j['tone']) ?? '',
      targetAudience: jStr(j['targetAudience']) ?? '',
      sampleViralPosts: jStrList(j['sampleViralPosts']),
      forbiddenWords: jStrList(j['forbiddenWords']),
      defaultHashtags: jStrList(j['defaultHashtags']),
      standardCtas: jStrList(j['standardCtas']),
      contentPillars: jStrList(meta['contentPillars'] ?? j['contentPillars']),
      hookStyle: jStr(meta['hookStyle']) ?? '',
      hooks: jStrList(meta['hooks']),
      logoUrl: jStr(j['logoUrl'] ?? meta['logoUrl']),
      primaryColor: jStr(colors['primary'] ?? meta['primaryColor']),
      accentColor: jStr(colors['accent'] ?? meta['accentColor']),
      font: jStr(j['font'] ?? meta['font']),
      captionStylePreset: jStr(j['captionStylePreset'] ?? meta['captionStylePreset']),
      metadata: meta,
    );
  }

  /// Body for `POST /brand-voice/:projectId` (and `brandProfile` in project create).
  Json toJson() => {
        'tone': tone,
        'targetAudience': targetAudience,
        'sampleViralPosts': sampleViralPosts,
        'forbiddenWords': forbiddenWords,
        'defaultHashtags': defaultHashtags,
        'standardCtas': standardCtas,
        'logoUrl': logoUrl,
        'font': font,
        'captionStylePreset': captionStylePreset,
        'colors': {
          if (primaryColor != null) 'primary': primaryColor,
          if (accentColor != null) 'accent': accentColor,
        },
        'metadata': {
          ...metadata,
          'contentPillars': contentPillars,
          'hookStyle': hookStyle,
          'hooks': hooks,
          if (logoUrl != null) 'logoUrl': logoUrl,
          if (primaryColor != null) 'primaryColor': primaryColor,
          if (accentColor != null) 'accentColor': accentColor,
          if (font != null) 'font': font,
          if (captionStylePreset != null) 'captionStylePreset': captionStylePreset,
        },
      };

  BrandVoice copyWith({
    String? tone,
    String? targetAudience,
    List<String>? sampleViralPosts,
    List<String>? forbiddenWords,
    List<String>? defaultHashtags,
    List<String>? standardCtas,
    List<String>? contentPillars,
    String? hookStyle,
    List<String>? hooks,
    String? logoUrl,
    String? primaryColor,
    String? accentColor,
    String? font,
    String? captionStylePreset,
  }) =>
      BrandVoice(
        id: id,
        projectId: projectId,
        tone: tone ?? this.tone,
        targetAudience: targetAudience ?? this.targetAudience,
        sampleViralPosts: sampleViralPosts ?? this.sampleViralPosts,
        forbiddenWords: forbiddenWords ?? this.forbiddenWords,
        defaultHashtags: defaultHashtags ?? this.defaultHashtags,
        standardCtas: standardCtas ?? this.standardCtas,
        contentPillars: contentPillars ?? this.contentPillars,
        hookStyle: hookStyle ?? this.hookStyle,
        hooks: hooks ?? this.hooks,
        logoUrl: logoUrl ?? this.logoUrl,
        primaryColor: primaryColor ?? this.primaryColor,
        accentColor: accentColor ?? this.accentColor,
        font: font ?? this.font,
        captionStylePreset: captionStylePreset ?? this.captionStylePreset,
        metadata: metadata,
      );

  static const tonePresets = [
    'Professional & authoritative',
    'Friendly & conversational',
    'Bold & energetic',
    'Witty & playful',
    'Inspirational',
    'Educational',
  ];

  static const captionStylePresets = [
    'HORMOZI_BOUNCE',
    'ALI_ABDAAL_CLEAN',
    'MINIMAL_SUBTITLE',
    'BOLD_CENTER',
  ];

  static const fontPresets = [
    'Inter',
    'Outfit',
    'Poppins',
    'Montserrat',
    'Roboto',
    'Playfair Display',
  ];
}
