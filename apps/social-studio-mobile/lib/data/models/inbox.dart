import '../../core/util/json.dart';
import 'platform.dart';

class InboxMessage {
  const InboxMessage({required this.id, required this.senderType, required this.content, this.createdAt});
  final String id;

  /// `participant`, `agent` or `ai_bot`.
  final String senderType;
  final String content;
  final DateTime? createdAt;

  bool get isOutbound => senderType == 'agent' || senderType == 'ai_bot';

  factory InboxMessage.fromJson(Json j) => InboxMessage(
        id: jStrOr(j['id'], ''),
        senderType: jStrOr(j['senderType'], 'participant'),
        content: jStrOr(j['content'], ''),
        createdAt: jDate(j['createdAt']),
      );
}

class Conversation {
  const Conversation({
    required this.id,
    required this.platform,
    required this.participantName,
    this.participantHandle,
    this.participantAvatar,
    this.lastMessageSnippet,
    this.lastMessageAt,
    this.isRead = false,
    this.convertedLeadId,
    this.projectId,
    this.projectName,
    this.accountName,
    this.aiAgentActive = false,
    this.isHumanTakeover = false,
    this.messages = const [],
  });

  final String id;
  final SocialPlatform platform;
  final String participantName;
  final String? participantHandle;
  final String? participantAvatar;
  final String? lastMessageSnippet;
  final DateTime? lastMessageAt;
  final bool isRead;
  final String? convertedLeadId;
  final String? projectId;
  final String? projectName;
  final String? accountName;
  final bool aiAgentActive;
  final bool isHumanTakeover;
  final List<InboxMessage> messages;

  factory Conversation.fromJson(Json j) {
    final account = jMapOrNull(j['socialAccount']);
    final project = jMapOrNull(j['project']);
    return Conversation(
      id: jStrOr(j['id'], ''),
      platform: SocialPlatform.parse(j['platform']),
      participantName: jStr(j['participantName']) ?? jStr(j['participantHandle']) ?? 'Unknown',
      participantHandle: jStr(j['participantHandle']),
      participantAvatar: jStr(j['participantAvatar']),
      lastMessageSnippet: jStr(j['lastMessageSnippet']),
      lastMessageAt: jDate(j['lastMessageAt']),
      isRead: jBool(j['isRead']),
      convertedLeadId: jStr(j['convertedLeadId']),
      projectId: jStr(j['projectId']),
      projectName: project == null ? null : jStr(project['name']),
      accountName: account == null ? null : jStr(account['accountName']),
      aiAgentActive: jBool(j['aiAgentActive']),
      isHumanTakeover: jBool(j['isHumanTakeover']),
      messages: jList(j['messages'], InboxMessage.fromJson),
    );
  }
}

class ReplySuggestion {
  const ReplySuggestion({required this.tone, required this.text});
  final String tone;
  final String text;

  factory ReplySuggestion.fromJson(Json j) =>
      ReplySuggestion(tone: jStrOr(j['tone'], ''), text: jStrOr(j['text'], ''));
}
