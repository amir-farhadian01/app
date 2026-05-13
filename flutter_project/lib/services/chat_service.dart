import '../models/chat_models.dart';
import 'neighborly_api_service.dart';

/// Facade over [NeighborlyApiService] for order chat operations.
class ChatService {
  const ChatService(this._api);

  final NeighborlyApiService _api;

  Future<ChatThread> getThread(String orderId) async {
    final raw = await _api.fetchOrderChatThread(orderId);
    return ChatThread.fromJson(raw);
  }

  Future<ChatMessage> sendMessage(String orderId, String text) async {
    final raw = await _api.sendOrderChatMessage(orderId: orderId, text: text);
    // API returns the new message object directly.
    if (raw['id'] != null) return ChatMessage.fromJson(raw);
    // Fallback: re-fetch thread and return last message.
    final thread = await getThread(orderId);
    if (thread.messages.isNotEmpty) return thread.messages.last;
    return ChatMessage(
      id: '',
      orderId: orderId,
      senderId: '',
      senderRole: 'customer',
      text: text,
      displayText: text,
      createdAt: DateTime.now().toIso8601String(),
    );
  }
}
