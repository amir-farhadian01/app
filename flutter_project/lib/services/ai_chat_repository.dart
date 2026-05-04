import 'package:shared_preferences/shared_preferences.dart';

import '../models/ai_chat_models.dart';

/// Persists AI chat sessions locally (titles, text history, model id per session).
class AiChatRepository {
  static const _k = 'ai-consultant-sessions-v1';

  Future<({List<AiChatSession> sessions, String? currentId})> load() async {
    final prefs = await SharedPreferences.getInstance();
    final raw = prefs.getString(_k);
    if (raw == null || raw.isEmpty) {
      return (sessions: <AiChatSession>[], currentId: null);
    }
    return decodeAiSessionsPayload(raw);
  }

  Future<void> save(List<AiChatSession> sessions, String? currentId) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_k, encodeAiSessionsPayload(sessions, currentId));
  }
}
