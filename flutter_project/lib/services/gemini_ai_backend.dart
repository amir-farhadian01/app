import 'package:google_generative_ai/google_generative_ai.dart';

import '../models/ai_chat_models.dart';

/// Calls Gemini when `GEMINI_API_KEY` is set (e.g. `--dart-define=GEMINI_API_KEY=...`).
/// Without a key, returns a local placeholder so the UI still works.
class GeminiAiBackend {
  static const apiKey = String.fromEnvironment('GEMINI_API_KEY', defaultValue: '');

  static const _system = 'You are the Neighborly AI assistant. You help users choose local '
      'services, estimate jobs, and give practical home and neighborhood advice. '
      'Be concise and friendly. If the user sends an image or video, describe what you see '
      'and relate it to home services when relevant.';

  bool get hasApiKey => apiKey.isNotEmpty;

  Future<String> reply({
    required String modelId,
    required List<AiChatTurn> historyIncludingLatest,
  }) async {
    if (!hasApiKey) {
      return _mock(historyIncludingLatest.last);
    }

    final model = GenerativeModel(
      model: modelId,
      apiKey: apiKey,
      systemInstruction: Content.system(_system),
      generationConfig: GenerationConfig(temperature: 0.7),
    );

    final contents = <Content>[];
    for (final turn in historyIncludingLatest) {
      if (turn.role == 'model') {
        contents.add(Content.model([TextPart(turn.text)]));
        continue;
      }
      final parts = <Part>[];
      if (turn.text.trim().isNotEmpty) {
        parts.add(TextPart(turn.text));
      }
      if (turn.mediaBytes != null &&
          turn.mediaBytes!.isNotEmpty &&
          turn.mediaMime != null &&
          turn.mediaMime!.isNotEmpty) {
        parts.add(DataPart(turn.mediaMime!, turn.mediaBytes!));
      }
      if (parts.isEmpty) {
        parts.add(TextPart('(empty)'));
      }
      contents.add(Content('user', parts));
    }

    try {
      final res = await model.generateContent(contents);
      final t = res.text;
      if (t != null && t.trim().isNotEmpty) return t.trim();
      return 'No response from the model. Please try again.';
    } catch (e) {
      return 'Model error: $e\nCheck your API key and model name.';
    }
  }

  String _mock(AiChatTurn lastUser) {
    final hasMedia = lastUser.mediaBytes != null && lastUser.mediaBytes!.isNotEmpty;
    const base = 'Offline mode: `GEMINI_API_KEY` is not set.\n\n'
        'For real answers, run with:\n'
        '`flutter run --dart-define=GEMINI_API_KEY=your_key`\n'
        '(or add the same `--dart-define` to your Docker/web build).\n\n';
    if (hasMedia) {
      return '${base}Your message with media was received; after you enable the API, image/video analysis will work.\n'
          'Your text: ${lastUser.text.isEmpty ? "(no text)" : lastUser.text}';
    }
    final preview = lastUser.text.length > 80 ? '${lastUser.text.substring(0, 80)}…' : lastUser.text;
    return '${base}Preview reply to “$preview”:\n'
        '— Browse Explorer for nearby pros for repairs, cleaning, or landscaping.';
  }
}
