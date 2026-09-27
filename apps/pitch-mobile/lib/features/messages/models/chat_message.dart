class ChatMessage {
  final String id;
  final String conversationId;
  final String senderId;
  final String senderName;
  final String? senderAvatar;
  final String text;
  final DateTime timestamp;
  final bool isMe;
  final bool isRead;
  final String? attachedPitchId;
  final String? attachedPitchTitle;
  final String? attachedPitchThumbnail;

  const ChatMessage({
    required this.id,
    required this.conversationId,
    required this.senderId,
    required this.senderName,
    this.senderAvatar,
    required this.text,
    required this.timestamp,
    required this.isMe,
    this.isRead = true,
    this.attachedPitchId,
    this.attachedPitchTitle,
    this.attachedPitchThumbnail,
  });

  ChatMessage copyWith({
    String? id,
    String? conversationId,
    String? senderId,
    String? senderName,
    String? senderAvatar,
    String? text,
    DateTime? timestamp,
    bool? isMe,
    bool? isRead,
    String? attachedPitchId,
    String? attachedPitchTitle,
    String? attachedPitchThumbnail,
  }) {
    return ChatMessage(
      id: id ?? this.id,
      conversationId: conversationId ?? this.conversationId,
      senderId: senderId ?? this.senderId,
      senderName: senderName ?? this.senderName,
      senderAvatar: senderAvatar ?? this.senderAvatar,
      text: text ?? this.text,
      timestamp: timestamp ?? this.timestamp,
      isMe: isMe ?? this.isMe,
      isRead: isRead ?? this.isRead,
      attachedPitchId: attachedPitchId ?? this.attachedPitchId,
      attachedPitchTitle: attachedPitchTitle ?? this.attachedPitchTitle,
      attachedPitchThumbnail:
          attachedPitchThumbnail ?? this.attachedPitchThumbnail,
    );
  }
}

class Conversation {
  final String id;
  final String otherUserId;
  final String otherUserName;
  final String otherUserAvatar;
  final String otherUserHeadline;
  final bool isOnline;
  final String lastMessage;
  final DateTime lastMessageTime;
  final int unreadCount;
  final String? pinnedPitchId;

  const Conversation({
    required this.id,
    required this.otherUserId,
    required this.otherUserName,
    required this.otherUserAvatar,
    required this.otherUserHeadline,
    required this.isOnline,
    required this.lastMessage,
    required this.lastMessageTime,
    required this.unreadCount,
    this.pinnedPitchId,
  });

  Conversation copyWith({
    String? id,
    String? otherUserId,
    String? otherUserName,
    String? otherUserAvatar,
    String? otherUserHeadline,
    bool? isOnline,
    String? lastMessage,
    DateTime? lastMessageTime,
    int? unreadCount,
    String? pinnedPitchId,
  }) {
    return Conversation(
      id: id ?? this.id,
      otherUserId: otherUserId ?? this.otherUserId,
      otherUserName: otherUserName ?? this.otherUserName,
      otherUserAvatar: otherUserAvatar ?? this.otherUserAvatar,
      otherUserHeadline: otherUserHeadline ?? this.otherUserHeadline,
      isOnline: isOnline ?? this.isOnline,
      lastMessage: lastMessage ?? this.lastMessage,
      lastMessageTime: lastMessageTime ?? this.lastMessageTime,
      unreadCount: unreadCount ?? this.unreadCount,
      pinnedPitchId: pinnedPitchId ?? this.pinnedPitchId,
    );
  }
}

class ConnectionRequest {
  final String id;
  final String fromUserId;
  final String fromUserName;
  final String fromUserAvatar;
  final String fromUserHeadline;
  final String note;
  final String pitchTitle;
  final String pitchThumbnail;
  final double pitchDuration;
  final DateTime createdAt;
  String status; // 'pending', 'accepted', 'ignored'

  ConnectionRequest({
    required this.id,
    required this.fromUserId,
    required this.fromUserName,
    required this.fromUserAvatar,
    required this.fromUserHeadline,
    required this.note,
    required this.pitchTitle,
    required this.pitchThumbnail,
    required this.pitchDuration,
    required this.createdAt,
    this.status = 'pending',
  });
}
