import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:image_picker/image_picker.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:uuid/uuid.dart';

import '../models/ai_chat_models.dart';
import '../services/ai_chat_repository.dart';
import '../services/gemini_ai_backend.dart';

String _guessMime(XFile x, {required bool image}) {
  final m = x.mimeType;
  if (m != null && m.isNotEmpty) return m;
  final p = x.path.toLowerCase();
  if (image) {
    if (p.endsWith('.png')) return 'image/png';
    if (p.endsWith('.gif')) return 'image/gif';
    if (p.endsWith('.webp')) return 'image/webp';
    return 'image/jpeg';
  }
  return 'application/octet-stream';
}

/// Google Gemini–style layout: persistent left rail (never hidden in a drawer), dark surfaces.
class _GeminiPalette {
  // Keep AI screen aligned with app light palette (no forced dark look in light mode).
  static const bg = Color(0xFFF8FAFC);
  static const panel = Color(0xFFD9EAFD);
  static const border = Color(0xFFBCCCDC);
  static const text = Color(0xFF1B3C53);
  static const textSecondary = Color(0xFF456882);
  static const selectedChip = Color(0xFFBCCCDC);
  static const accent = Color(0xFF1B3C53);
}

/// AI consultant: Gemini-like chrome, model picker, session rail, attachments.
class AiConsultantScreen extends StatefulWidget {
  const AiConsultantScreen({super.key});

  @override
  State<AiConsultantScreen> createState() => _AiConsultantScreenState();
}

class _AiConsultantScreenState extends State<AiConsultantScreen> {
  final _scroll = ScrollController();
  final _sidebarScroll = ScrollController();
  final _input = TextEditingController();
  final _picker = ImagePicker();
  final _repo = AiChatRepository();
  final _backend = GeminiAiBackend();

  List<AiChatSession> _sessions = [];
  String? _currentId;
  bool _loadingDisk = true;
  bool _sending = false;
  Uint8List? _pendingBytes;
  String? _pendingMime;

  static const _kNewChatTitle = 'New chat';

  @override
  void initState() {
    super.initState();
    _input.addListener(() {
      if (mounted) setState(() {});
    });
    _hydrate();
  }

  Future<void> _hydrate() async {
    final r = await _repo.load();
    if (!mounted) return;
    setState(() {
      _sessions = r.sessions;
      _currentId = r.currentId;
      _loadingDisk = false;
    });
    if (_sessions.isEmpty) {
      _newSession();
    } else if (_currentId == null || !_sessions.any((e) => e.id == _currentId)) {
      _currentId = _sessions.first.id;
      await _persist();
      setState(() {});
    }
  }

  AiChatSession? get _current {
    if (_currentId == null) return null;
    try {
      return _sessions.firstWhere((e) => e.id == _currentId);
    } catch (_) {
      return null;
    }
  }

  Future<void> _persist() async {
    await _repo.save(_sessions, _currentId);
  }

  void _newSession() {
    const uuid = Uuid();
    final s = AiChatSession(
      id: uuid.v4(),
      title: _kNewChatTitle,
      modelId: AiChatModelOption.defaultModelId,
      updatedAt: DateTime.now(),
      messages: [],
    );
    setState(() {
      _sessions = [s, ..._sessions];
      _currentId = s.id;
      _pendingBytes = null;
      _pendingMime = null;
    });
    _persist();
    _scrollToEnd();
  }

  void _selectSession(String id) {
    setState(() {
      _currentId = id;
      _pendingBytes = null;
      _pendingMime = null;
    });
    _persist();
    _scrollToEnd();
  }

  Future<void> _renameSession(AiChatSession s) async {
    final ctrl = TextEditingController(text: s.title);
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: _GeminiPalette.panel,
        title: Text('Rename chat', style: GoogleFonts.notoSans(fontWeight: FontWeight.w700, color: _GeminiPalette.text)),
        content: TextField(
          controller: ctrl,
          autofocus: true,
          style: GoogleFonts.notoSans(color: _GeminiPalette.text),
          decoration: InputDecoration(
            hintText: 'e.g. Kitchen reno quote',
            hintStyle: GoogleFonts.notoSans(color: _GeminiPalette.textSecondary),
            filled: true,
            fillColor: _GeminiPalette.bg,
            border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
          ),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: Text('Cancel', style: GoogleFonts.notoSans(color: _GeminiPalette.accent))),
          FilledButton(onPressed: () => Navigator.pop(ctx, true), child: const Text('Save')),
        ],
      ),
    );
    if (ok == true && mounted) {
      s.title = ctrl.text.trim().isEmpty ? 'Chat' : ctrl.text.trim();
      s.updatedAt = DateTime.now();
      setState(() {});
      await _persist();
    }
    ctrl.dispose();
  }

  Future<void> _deleteSession(AiChatSession s) async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: _GeminiPalette.panel,
        title: Text('Delete chat?', style: GoogleFonts.notoSans(fontWeight: FontWeight.w700, color: _GeminiPalette.text)),
        content: Text('This chat will be removed from history permanently.', style: GoogleFonts.notoSans(color: _GeminiPalette.textSecondary)),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: Text('Cancel', style: GoogleFonts.notoSans(color: _GeminiPalette.accent))),
          FilledButton(
            style: FilledButton.styleFrom(backgroundColor: Colors.red.shade700),
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('Delete'),
          ),
        ],
      ),
    );
    if (ok != true || !mounted) return;
    setState(() {
      _sessions.removeWhere((e) => e.id == s.id);
      if (_currentId == s.id) {
        _currentId = _sessions.isNotEmpty ? _sessions.first.id : null;
      }
      if (_sessions.isEmpty) _newSession();
    });
    await _persist();
  }

  Future<void> _pickImage(ImageSource source) async {
    try {
      final x = await _picker.pickImage(source: source, maxWidth: 1600, imageQuality: 85);
      if (x == null) return;
      final bytes = await x.readAsBytes();
      final mime = _guessMime(x, image: true);
      if (bytes.length > 4 * 1024 * 1024) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Image must be under ~4 MB.')),
          );
        }
        return;
      }
      setState(() {
        _pendingBytes = bytes;
        _pendingMime = mime;
      });
    } on PlatformException catch (e) {
      if (mounted) {
        final denied = e.code.toLowerCase().contains('denied');
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
              denied
                  ? 'Camera/gallery permission denied. Please allow access in system settings.'
                  : 'Could not open ${source == ImageSource.camera ? 'camera' : 'gallery'}: ${e.message ?? e.code}',
            ),
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Could not pick image: $e')));
      }
    }
  }

  void _clearPending() {
    setState(() {
      _pendingBytes = null;
      _pendingMime = null;
    });
  }

  Future<void> _send() async {
    final s = _current;
    if (s == null || _sending) return;
    final text = _input.text.trim();
    if (text.isEmpty && (_pendingBytes == null || _pendingBytes!.isEmpty)) return;

    final userTurn = AiChatTurn(
      role: 'user',
      text: text,
      mediaBytes: _pendingBytes,
      mediaMime: _pendingMime,
      at: DateTime.now(),
    );

    setState(() {
      s.messages.add(userTurn);
      if (s.title == _kNewChatTitle && text.isNotEmpty) {
        s.title = text.length > 36 ? '${text.substring(0, 36)}…' : text;
      }
      s.updatedAt = DateTime.now();
      _input.clear();
      _pendingBytes = null;
      _pendingMime = null;
      _sending = true;
    });
    await _persist();
    _scrollToEnd();

    final historyForModel = List<AiChatTurn>.from(s.messages);
    final reply = await _backend.reply(
      modelId: s.modelId,
      historyIncludingLatest: historyForModel,
    );

    if (!mounted) return;
    setState(() {
      s.messages.add(AiChatTurn(role: 'model', text: reply, at: DateTime.now()));
      s.updatedAt = DateTime.now();
      _sending = false;
    });
    await _persist();
    _scrollToEnd();
  }

  void _scrollToEnd() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      if (!_scroll.hasClients) return;
      _scroll.animateTo(
        _scroll.position.maxScrollExtent + 80,
        duration: const Duration(milliseconds: 280),
        curve: Curves.easeOutCubic,
      );
    });
  }

  double _sidebarWidth(BuildContext context) {
    final w = MediaQuery.sizeOf(context).width;
    if (w >= 1100) return 288;
    if (w >= 720) return 260;
    return 220;
  }

  @override
  void dispose() {
    _input.dispose();
    _scroll.dispose();
    _sidebarScroll.dispose();
    super.dispose();
  }

  Widget _geminiLogo() {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 14, 16, 6),
      child: Row(
        children: [
          ShaderMask(
            blendMode: BlendMode.srcIn,
            shaderCallback: (bounds) => const LinearGradient(
              colors: [
                Color(0xFF4285F4),
                Color(0xFF9B72CB),
                Color(0xFFD96570),
              ],
            ).createShader(Rect.fromLTWH(0, 0, bounds.width, bounds.height)),
            child: Text(
              'Gemini',
              style: GoogleFonts.notoSans(
                fontSize: 22,
                fontWeight: FontWeight.w500,
                letterSpacing: -0.3,
                color: Colors.white,
                height: 1,
              ),
            ),
          ),
          const SizedBox(width: 8),
          Text(
            '· Neighborly',
            style: GoogleFonts.notoSans(
              fontSize: 13,
              fontWeight: FontWeight.w400,
              color: _GeminiPalette.textSecondary,
            ),
          ),
        ],
      ),
    );
  }

  Widget _newChatPill() {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: _newSession,
          borderRadius: BorderRadius.circular(24),
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(24),
              border: Border.all(color: _GeminiPalette.border),
              color: _GeminiPalette.panel,
            ),
            child: Row(
              children: [
                const Icon(LucideIcons.plus, size: 18, color: _GeminiPalette.text),
                const SizedBox(width: 10),
                Text(
                  'New chat',
                  style: GoogleFonts.notoSans(
                    fontWeight: FontWeight.w500,
                    fontSize: 14,
                    color: _GeminiPalette.text,
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _sessionRail(List<AiChatSession> sorted) {
    return Expanded(
      child: ScrollConfiguration(
        behavior: ScrollConfiguration.of(context).copyWith(scrollbars: true),
        child: ListView.builder(
          controller: _sidebarScroll,
          padding: const EdgeInsets.fromLTRB(8, 4, 8, 16),
          itemCount: sorted.length,
          itemBuilder: (ctx, i) {
            final item = sorted[i];
            final active = item.id == _currentId;
            return Padding(
              padding: const EdgeInsets.only(bottom: 4),
              child: Material(
                color: active ? _GeminiPalette.selectedChip.withValues(alpha: 0.55) : Colors.transparent,
                borderRadius: BorderRadius.circular(20),
                child: InkWell(
                  borderRadius: BorderRadius.circular(20),
                  onTap: () => _selectSession(item.id),
                  child: Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                    child: Row(
                      children: [
                        Icon(
                          LucideIcons.messageSquare,
                          size: 16,
                          color: active ? _GeminiPalette.text : _GeminiPalette.textSecondary,
                        ),
                        const SizedBox(width: 10),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                item.title,
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                                style: GoogleFonts.notoSans(
                                  fontSize: 13.5,
                                  fontWeight: FontWeight.w500,
                                  color: _GeminiPalette.text,
                                ),
                              ),
                              Text(
                                '${item.updatedAt.year}/${item.updatedAt.month}/${item.updatedAt.day}',
                                style: GoogleFonts.notoSans(fontSize: 11, color: _GeminiPalette.textSecondary),
                              ),
                            ],
                          ),
                        ),
                        PopupMenuButton<String>(
                          padding: EdgeInsets.zero,
                          icon: const Icon(LucideIcons.moreHorizontal, size: 18, color: _GeminiPalette.textSecondary),
                          color: _GeminiPalette.panel,
                          onSelected: (v) {
                            if (v == 'rename') _renameSession(item);
                            if (v == 'delete') _deleteSession(item);
                          },
                          itemBuilder: (ctx) => [
                            const PopupMenuItem(value: 'rename', child: Text('Rename')),
                            const PopupMenuItem(value: 'delete', child: Text('Delete')),
                          ],
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            );
          },
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    if (_loadingDisk) {
      return const ColoredBox(
        color: _GeminiPalette.bg,
        child: Center(child: CircularProgressIndicator(color: _GeminiPalette.accent)),
      );
    }

    final s = _current;
    if (s == null) {
      return ColoredBox(
        color: _GeminiPalette.bg,
        child: Center(child: Text('Could not load chat', style: GoogleFonts.notoSans(color: _GeminiPalette.text))),
      );
    }

    final sorted = List<AiChatSession>.from(_sessions)..sort((a, b) => b.updatedAt.compareTo(a.updatedAt));
    final railW = _sidebarWidth(context);

    return ColoredBox(
      color: _GeminiPalette.bg,
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Container(
            width: railW,
            decoration: const BoxDecoration(
              color: _GeminiPalette.panel,
              border: Border(right: BorderSide(color: _GeminiPalette.border, width: 1)),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                _geminiLogo(),
                _newChatPill(),
                Padding(
                  padding: const EdgeInsets.fromLTRB(16, 8, 16, 4),
                  child: Text(
                    'RECENTS',
                    style: GoogleFonts.notoSans(
                      fontSize: 11,
                      fontWeight: FontWeight.w600,
                      letterSpacing: 0.6,
                      color: _GeminiPalette.textSecondary,
                      fontFeatures: const [FontFeature.enable('smcp')],
                    ),
                  ),
                ),
                _sessionRail(sorted),
              ],
            ),
          ),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                  decoration: const BoxDecoration(
                    border: Border(bottom: BorderSide(color: _GeminiPalette.border)),
                  ),
                  child: Row(
                    children: [
                      Icon(LucideIcons.sparkles, size: 20, color: Theme.of(context).colorScheme.primary),
                      const SizedBox(width: 10),
                      Expanded(
                        child: Text(
                          'AI Assistant',
                          style: GoogleFonts.notoSans(
                            fontWeight: FontWeight.w700,
                            fontSize: 17,
                            color: _GeminiPalette.text,
                          ),
                        ),
                      ),
                      DropdownButtonHideUnderline(
                        child: Theme(
                          data: Theme.of(context).copyWith(canvasColor: _GeminiPalette.panel),
                          child: DropdownButton<String>(
                            value: s.modelId,
                            isDense: true,
                            dropdownColor: _GeminiPalette.panel,
                            style: GoogleFonts.notoSans(fontSize: 13, color: _GeminiPalette.text),
                            iconEnabledColor: _GeminiPalette.textSecondary,
                            alignment: AlignmentDirectional.centerEnd,
                            items: [
                              for (final m in AiChatModelOption.all)
                                DropdownMenuItem(
                                  value: m.id,
                                  child: Text(m.label, style: GoogleFonts.notoSans(fontSize: 13)),
                                ),
                            ],
                            onChanged: (v) {
                              if (v == null) return;
                              setState(() => s.modelId = v);
                              _persist();
                            },
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
                if (!_backend.hasApiKey)
                  Container(
                    width: double.infinity,
                    color: const Color(0xFF3D2E00).withValues(alpha: 0.55),
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                    child: Text(
                      'No API key — placeholders only. Run with --dart-define=GEMINI_API_KEY=...',
                      style: GoogleFonts.notoSans(fontSize: 12, height: 1.35, color: _GeminiPalette.textSecondary),
                    ),
                  ),
                Expanded(
                  child: s.messages.isEmpty && !_sending
                      ? _AiEmptyChat(
                          onTrySample: () {
                            setState(() {
                              _input.text = 'How do I book a plumber?';
                            });
                          },
                          onCreateOrder: () {
                            Navigator.of(context).pushNamed('/orders/new?entryPoint=ai_suggestion');
                          },
                        )
                      : ListView.builder(
                          controller: _scroll,
                          padding: const EdgeInsets.fromLTRB(20, 20, 20, 16),
                          itemCount: s.messages.length + (_sending ? 1 : 0),
                          itemBuilder: (ctx, i) {
                            if (_sending && i == s.messages.length) {
                              return const Padding(
                                padding: EdgeInsets.symmetric(vertical: 8, horizontal: 4),
                                child: _AiConsultantShimmer(),
                              );
                            }
                            final m = s.messages[i];
                            final isUser = m.role == 'user';
                            return _ConsultantBubble(turn: m, isUser: isUser);
                          },
                        ),
                ),
                if (_pendingBytes != null && _pendingBytes!.isNotEmpty)
                  Padding(
                    padding: const EdgeInsets.fromLTRB(20, 0, 20, 8),
                    child: Row(
                      children: [
                        ClipRRect(
                          borderRadius: BorderRadius.circular(12),
                          child: Image.memory(_pendingBytes!, width: 72, height: 72, fit: BoxFit.cover),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Text(
                            'Image attached',
                            style: GoogleFonts.notoSans(fontWeight: FontWeight.w500, color: _GeminiPalette.text),
                          ),
                        ),
                        IconButton(
                          icon: const Icon(LucideIcons.x, color: _GeminiPalette.textSecondary),
                          onPressed: _clearPending,
                        ),
                      ],
                    ),
                  ),
                SafeArea(
                  top: false,
                  child: AnimatedBuilder(
                    animation: _input,
                    builder: (context, _) {
                      final cs = Theme.of(context).colorScheme;
                      final hasText = _input.text.trim().isNotEmpty;
                      final hasMedia = _pendingBytes != null && _pendingBytes!.isNotEmpty;
                      final canSend = (hasText || hasMedia) && !_sending;
                      return Container(
                        constraints: const BoxConstraints(minHeight: 56),
                        decoration: BoxDecoration(
                          color: cs.surface,
                          border: Border(top: BorderSide(color: cs.outline)),
                        ),
                        padding: const EdgeInsets.fromLTRB(8, 8, 12, 10),
                        child: Row(
                          crossAxisAlignment: CrossAxisAlignment.end,
                          children: [
                            PopupMenuButton<String>(
                              icon: Icon(LucideIcons.paperclip, color: cs.secondary),
                              color: _GeminiPalette.panel,
                              onSelected: (v) {
                                if (v == 'gallery') _pickImage(ImageSource.gallery);
                                if (v == 'camera') _pickImage(ImageSource.camera);
                              },
                              itemBuilder: (ctx) => [
                                const PopupMenuItem(value: 'gallery', child: Text('Gallery')),
                                if (!kIsWeb) const PopupMenuItem(value: 'camera', child: Text('Camera')),
                              ],
                            ),
                            Expanded(
                              child: TextField(
                                controller: _input,
                                minLines: 1,
                                maxLines: 5,
                                style: GoogleFonts.notoSans(color: cs.onSurface, fontSize: 15),
                                cursorColor: cs.primary,
                                decoration: InputDecoration(
                                  hintText: 'Message…',
                                  hintStyle: GoogleFonts.notoSans(color: cs.secondary, fontSize: 15),
                                  filled: false,
                                  border: InputBorder.none,
                                  isDense: true,
                                  contentPadding: const EdgeInsets.symmetric(horizontal: 8, vertical: 14),
                                ),
                                onSubmitted: (_) => canSend ? _send() : null,
                              ),
                            ),
                            const SizedBox(width: 6),
                            Material(
                              color: Colors.transparent,
                              child: InkWell(
                                onTap: canSend ? _send : null,
                                customBorder: const CircleBorder(),
                                child: Ink(
                                  width: 44,
                                  height: 44,
                                  decoration: BoxDecoration(
                                    shape: BoxShape.circle,
                                    color: canSend ? cs.primary : cs.surface,
                                    border: Border.all(color: canSend ? cs.primary : cs.outline, width: 1.5),
                                  ),
                                  child: Icon(
                                    LucideIcons.send,
                                    size: 20,
                                    color: canSend ? cs.onPrimary : cs.secondary,
                                  ),
                                ),
                              ),
                            ),
                          ],
                        ),
                      );
                    },
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _AiEmptyChat extends StatelessWidget {
  const _AiEmptyChat({required this.onTrySample, required this.onCreateOrder});

  final VoidCallback onTrySample;
  final VoidCallback onCreateOrder;

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    return ListView(
      physics: const AlwaysScrollableScrollPhysics(),
      children: [
        SizedBox(height: MediaQuery.sizeOf(context).height * 0.12),
        Icon(LucideIcons.sparkles, size: 64, color: cs.primary.withValues(alpha: 0.85)),
        const SizedBox(height: 20),
        Text(
          'Ask me anything',
          textAlign: TextAlign.center,
          style: GoogleFonts.notoSans(fontSize: 22, fontWeight: FontWeight.w700, color: _GeminiPalette.text),
        ),
        const SizedBox(height: 12),
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 32),
          child: Text(
            'I can help you find the right service, explain the booking process, or answer questions.',
            textAlign: TextAlign.center,
            style: GoogleFonts.notoSans(fontSize: 15, height: 1.45, color: _GeminiPalette.textSecondary),
          ),
        ),
        const SizedBox(height: 28),
        Center(
          child: Material(
            color: cs.surfaceContainerHighest.withValues(alpha: 0.35),
            borderRadius: BorderRadius.circular(100),
            child: InkWell(
              onTap: onTrySample,
              borderRadius: BorderRadius.circular(100),
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 12),
                child: Text(
                  'Try asking: \'How do I book a plumber?\'',
                  style: GoogleFonts.notoSans(fontSize: 13, fontWeight: FontWeight.w600, color: cs.primary),
                ),
              ),
            ),
          ),
        ),
        const SizedBox(height: 12),
        Center(
          child: FilledButton(
            onPressed: onCreateOrder,
            child: const Text('Create order from AI suggestion'),
          ),
        ),
      ],
    );
  }
}

class _AiConsultantShimmer extends StatefulWidget {
  const _AiConsultantShimmer();

  @override
  State<_AiConsultantShimmer> createState() => _AiConsultantShimmerState();
}

class _AiConsultantShimmerState extends State<_AiConsultantShimmer> with SingleTickerProviderStateMixin {
  late AnimationController _c;

  @override
  void initState() {
    super.initState();
    _c = AnimationController(vsync: this, duration: const Duration(milliseconds: 900))..repeat(reverse: true);
  }

  @override
  void dispose() {
    _c.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    return FadeTransition(
      opacity: Tween<double>(begin: 0.42, end: 0.95).animate(CurvedAnimation(parent: _c, curve: Curves.easeInOut)),
      child: Material(
        color: cs.surfaceContainerHighest.withValues(alpha: 0.25),
        borderRadius: BorderRadius.circular(16),
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
          child: Row(
            children: [
              CircleAvatar(radius: 22, backgroundColor: cs.surfaceContainerHighest),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Container(
                      height: 14,
                      margin: const EdgeInsets.only(right: 40),
                      decoration: BoxDecoration(color: cs.surfaceContainerHighest, borderRadius: BorderRadius.circular(8)),
                    ),
                    const SizedBox(height: 10),
                    Container(
                      height: 12,
                      margin: const EdgeInsets.only(right: 80),
                      decoration: BoxDecoration(color: cs.surfaceContainerHighest, borderRadius: BorderRadius.circular(8)),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _ConsultantBubble extends StatelessWidget {
  const _ConsultantBubble({required this.turn, required this.isUser});

  final AiChatTurn turn;
  final bool isUser;

  String? _timeLabel(BuildContext context) {
    final t = turn.at;
    if (t == null) return null;
    final tod = TimeOfDay.fromDateTime(t);
    return MaterialLocalizations.of(context).formatTimeOfDay(tod, alwaysUse24HourFormat: false);
  }

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    final maxW = MediaQuery.sizeOf(context).width * 0.8;
    final time = _timeLabel(context);

    final bubbleDecoration = BoxDecoration(
      color: isUser ? cs.primary : cs.surfaceContainerHighest,
      borderRadius: isUser
          ? const BorderRadius.only(
              topLeft: Radius.circular(16),
              topRight: Radius.zero,
              bottomLeft: Radius.circular(16),
              bottomRight: Radius.circular(16),
            )
          : const BorderRadius.only(
              topLeft: Radius.zero,
              topRight: Radius.circular(16),
              bottomLeft: Radius.circular(16),
              bottomRight: Radius.circular(16),
            ),
    );

    final textStyle = GoogleFonts.notoSans(
      color: isUser ? cs.onPrimary : cs.onSurface,
      height: 1.5,
      fontSize: 15,
    );

    Widget bubbleContent = Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      mainAxisSize: MainAxisSize.min,
      children: [
        if (turn.mediaBytes != null && turn.mediaBytes!.isNotEmpty)
          Padding(
            padding: const EdgeInsets.only(bottom: 10),
            child: ClipRRect(
              borderRadius: BorderRadius.circular(12),
              child: turn.mediaMime != null && turn.mediaMime!.startsWith('video/')
                  ? Container(
                      constraints: const BoxConstraints(maxHeight: 160),
                      color: isUser ? cs.onPrimary.withValues(alpha: 0.12) : cs.surfaceContainerHigh,
                      padding: const EdgeInsets.all(12),
                      child: Row(
                        children: [
                          Icon(LucideIcons.video, color: isUser ? cs.onPrimary : cs.onSurface),
                          const SizedBox(width: 8),
                          Expanded(
                            child: Text('Video', style: GoogleFonts.notoSans(color: isUser ? cs.onPrimary : cs.onSurface, fontSize: 13)),
                          ),
                        ],
                      ),
                    )
                  : Image.memory(turn.mediaBytes!, fit: BoxFit.cover),
            ),
          ),
        if (turn.text.isNotEmpty)
          SelectableText(
            turn.text,
            style: textStyle,
          ),
      ],
    );

    final column = Column(
      crossAxisAlignment: isUser ? CrossAxisAlignment.end : CrossAxisAlignment.start,
      children: [
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
          decoration: bubbleDecoration,
          child: bubbleContent,
        ),
        if (time != null) ...[
          const SizedBox(height: 4),
          Text(
            time,
            style: GoogleFonts.notoSans(fontSize: 11, color: cs.secondary),
          ),
        ],
      ],
    );

    return Align(
      alignment: isUser ? Alignment.centerRight : Alignment.centerLeft,
      child: ConstrainedBox(
        constraints: BoxConstraints(maxWidth: maxW),
        child: Padding(
          padding: const EdgeInsets.only(bottom: 18),
          child: column,
        ),
      ),
    );
  }
}
