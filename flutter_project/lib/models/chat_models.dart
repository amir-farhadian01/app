/// Typed model for a single order chat message.
class ChatMessage {
  const ChatMessage({
    required this.id,
    required this.orderId,
    required this.senderId,
    required this.senderRole,
    required this.text,
    required this.displayText,
    required this.createdAt,
    this.flagged = false,
  });

  final String id;
  final String orderId;
  final String senderId;
  final String senderRole;
  final String text;
  final String displayText;
  final String createdAt;
  final bool flagged;

  factory ChatMessage.fromJson(Map<String, dynamic> j) => ChatMessage(
        id: j['id']?.toString() ?? '',
        orderId: j['orderId']?.toString() ?? '',
        senderId: j['senderId']?.toString() ?? '',
        senderRole: j['senderRole']?.toString() ?? 'customer',
        text: j['text']?.toString() ?? '',
        displayText: j['displayText']?.toString() ?? j['text']?.toString() ?? '',
        createdAt: j['createdAt']?.toString() ?? '',
        flagged: j['flagged'] == true,
      );

  Map<String, dynamic> toJson() => {
        'id': id,
        'orderId': orderId,
        'senderId': senderId,
        'senderRole': senderRole,
        'text': text,
        'displayText': displayText,
        'createdAt': createdAt,
        'flagged': flagged,
      };
}

/// Thread envelope returned by GET /api/orders/:id/chat/thread.
class ChatThread {
  const ChatThread({
    required this.orderId,
    required this.messages,
    required this.readOnly,
  });

  final String orderId;
  final List<ChatMessage> messages;
  final bool readOnly;

  factory ChatThread.fromJson(Map<String, dynamic> j) {
    final raw = j['messages'];
    final msgs = raw is List
        ? raw
            .whereType<Map>()
            .map((e) => ChatMessage.fromJson(Map<String, dynamic>.from(e)))
            .toList()
        : <ChatMessage>[];
    return ChatThread(
      orderId: j['orderId']?.toString() ?? '',
      messages: msgs,
      readOnly: j['readOnly'] == true,
    );
  }
}
