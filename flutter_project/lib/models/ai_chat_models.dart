import 'dart:convert';
import 'dart:typed_data';

/// One turn in the UI / persisted history (media bytes are not persisted).
class AiChatTurn {
  AiChatTurn({
    required this.role,
    required this.text,
    this.mediaBytes,
    this.mediaMime,
    this.at,
  });

  final String role; // 'user' | 'model'
  final String text;
  final Uint8List? mediaBytes;
  final String? mediaMime;
  final DateTime? at;

  AiChatTurn copyWith({
    String? role,
    String? text,
    Uint8List? mediaBytes,
    String? mediaMime,
    DateTime? at,
  }) {
    return AiChatTurn(
      role: role ?? this.role,
      text: text ?? this.text,
      mediaBytes: mediaBytes ?? this.mediaBytes,
      mediaMime: mediaMime ?? this.mediaMime,
      at: at ?? this.at,
    );
  }

  Map<String, dynamic> toJsonPersisted() {
    var t = text;
    if (mediaBytes != null && mediaBytes!.isNotEmpty) {
      final tag = _mediaTag(mediaMime);
      if (!t.contains(tag)) t = t.isEmpty ? tag : '$t\n$tag';
    }
    return {
      'role': role,
      'text': t,
      if (at != null) 'at': at!.toIso8601String(),
    };
  }

  static String _mediaTag(String? mime) {
    if (mime == null) return '[attachment]';
    if (mime.startsWith('video/')) return '[video attached]';
    return '[image attached]';
  }

  factory AiChatTurn.fromJson(Map<String, dynamic> m) {
    return AiChatTurn(
      role: m['role']?.toString() ?? 'user',
      text: m['text']?.toString() ?? '',
      at: DateTime.tryParse(m['at']?.toString() ?? ''),
    );
  }
}

class AiChatSession {
  AiChatSession({
    required this.id,
    required this.title,
    required this.modelId,
    required this.updatedAt,
    required this.messages,
  });

  final String id;
  String title;
  String modelId;
  DateTime updatedAt;
  List<AiChatTurn> messages;

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'title': title,
      'modelId': modelId,
      'updatedAt': updatedAt.toIso8601String(),
      'messages': messages.map((e) => e.toJsonPersisted()).toList(),
    };
  }

  factory AiChatSession.fromJson(Map<String, dynamic> m) {
    final raw = m['messages'];
    final list = <AiChatTurn>[];
    if (raw is List) {
      for (final e in raw) {
        if (e is Map) list.add(AiChatTurn.fromJson(Map<String, dynamic>.from(e)));
      }
    }
    return AiChatSession(
      id: m['id']?.toString() ?? '',
      title: m['title']?.toString() ?? 'Chat',
      modelId: m['modelId']?.toString() ?? AiChatModelOption.defaultModelId,
      updatedAt: DateTime.tryParse(m['updatedAt']?.toString() ?? '') ?? DateTime.now(),
      messages: list,
    );
  }

}

class AiChatModelOption {
  const AiChatModelOption({required this.id, required this.label});

  final String id;
  final String label;

  static const defaultModelId = 'gemini-2.0-flash';

  static const List<AiChatModelOption> all = [
    AiChatModelOption(id: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash'),
    AiChatModelOption(id: 'gemini-1.5-flash', label: 'Gemini 1.5 Flash'),
    AiChatModelOption(id: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro'),
  ];
}

String encodeAiSessionsPayload(List<AiChatSession> sessions, String? currentId) {
  return jsonEncode({
    'sessions': sessions.map((e) => e.toJson()).toList(),
    'currentSessionId': currentId,
  });
}

({List<AiChatSession> sessions, String? currentId}) decodeAiSessionsPayload(String raw) {
  try {
    final m = jsonDecode(raw) as Map<String, dynamic>;
    final list = <AiChatSession>[];
    final s = m['sessions'];
    if (s is List) {
      for (final e in s) {
        if (e is Map) list.add(AiChatSession.fromJson(Map<String, dynamic>.from(e)));
      }
    }
    return (sessions: list, currentId: m['currentSessionId']?.toString());
  } catch (_) {
    return (sessions: <AiChatSession>[], currentId: null);
  }
}
