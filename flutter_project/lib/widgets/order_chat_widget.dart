import 'dart:async';

import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:provider/provider.dart';

import '../models/chat_models.dart';
import '../services/chat_service.dart';
import '../services/neighborly_api_service.dart';

/// Full chat panel for an order. Polls every 30 s while mounted.
/// Uses [AutomaticKeepAliveClientMixin] so the tab controller keeps it alive
/// without re-fetching when switching tabs — polling is paused via [_active].
class OrderChatWidget extends StatefulWidget {
  const OrderChatWidget({
    super.key,
    required this.orderId,
    required this.isActive,
  });

  final String orderId;
  /// Set to false when the tab is not visible so polling stops.
  final bool isActive;

  @override
  State<OrderChatWidget> createState() => _OrderChatWidgetState();
}

class _OrderChatWidgetState extends State<OrderChatWidget>
    with AutomaticKeepAliveClientMixin {
  @override
  bool get wantKeepAlive => true;

  ChatThread? _thread;
  bool _loading = true;
  bool _sending = false;
  String? _error;
  Timer? _pollTimer;
  final TextEditingController _input = TextEditingController();
  final ScrollController _scroll = ScrollController();

  @override
  void initState() {
    super.initState();
    _fetch();
    _startPolling();
  }

  @override
  void didUpdateWidget(OrderChatWidget old) {
    super.didUpdateWidget(old);
    if (widget.isActive && !old.isActive) {
      // Tab became visible — fetch immediately then restart polling.
      _fetch(silent: true);
      _startPolling();
    } else if (!widget.isActive && old.isActive) {
      _stopPolling();
    }
  }

  @override
  void dispose() {
    _stopPolling();
    _input.dispose();
    _scroll.dispose();
    super.dispose();
  }

  void _startPolling() {
    _stopPolling();
    if (!widget.isActive) return;
    _pollTimer = Timer.periodic(const Duration(seconds: 30), (_) {
      if (mounted && widget.isActive) _fetch(silent: true);
    });
  }

  void _stopPolling() {
    _pollTimer?.cancel();
    _pollTimer = null;
  }

  Future<void> _fetch({bool silent = false}) async {
    if (!silent) setState(() => _loading = true);
    try {
      final svc = ChatService(context.read<NeighborlyApiService>());
      final thread = await svc.getThread(widget.orderId);
      if (!mounted) return;
      setState(() {
        _thread = thread;
        _loading = false;
        _error = null;
      });
      _scrollToBottom();
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _error = e.toString();
        _loading = false;
      });
    }
  }

  void _scrollToBottom() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_scroll.hasClients) {
        _scroll.animateTo(
          _scroll.position.maxScrollExtent,
          duration: const Duration(milliseconds: 200),
          curve: Curves.easeOut,
        );
      }
    });
  }

  Future<void> _send() async {
    final text = _input.text.trim();
    if (text.isEmpty || _sending) return;
    setState(() => _sending = true);
    try {
      final svc = ChatService(context.read<NeighborlyApiService>());
      await svc.sendMessage(widget.orderId, text);
      _input.clear();
      await _fetch(silent: true);
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context)
          .showSnackBar(SnackBar(content: Text(e.toString())));
    } finally {
      if (mounted) setState(() => _sending = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    super.build(context);
    final cs = Theme.of(context).colorScheme;
    final myId = context.read<NeighborlyApiService>().user?.uid ?? '';
    final readOnly = _thread?.readOnly ?? false;

    if (_loading) return const Center(child: CircularProgressIndicator());
    if (_error != null) {
      return Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(_error!, textAlign: TextAlign.center),
            const SizedBox(height: 12),
            FilledButton(onPressed: _fetch, child: const Text('Retry')),
          ],
        ),
      );
    }

    final messages = _thread?.messages ?? [];

    return Column(
      children: [
        if (readOnly)
          Material(
            color: cs.secondaryContainer,
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
              child: Row(
                children: [
                  Icon(LucideIcons.lock, size: 14, color: cs.onSecondaryContainer),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      'Messaging unlocks after a provider is matched.',
                      style: GoogleFonts.inter(
                        fontSize: 13,
                        color: cs.onSecondaryContainer,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        Expanded(
          child: messages.isEmpty
              ? Center(
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(LucideIcons.messageCircle, size: 40, color: cs.secondary),
                      const SizedBox(height: 12),
                      Text(
                        'No messages yet.',
                        style: GoogleFonts.inter(color: cs.secondary),
                      ),
                    ],
                  ),
                )
              : ListView.builder(
                  controller: _scroll,
                  padding: const EdgeInsets.fromLTRB(12, 12, 12, 8),
                  itemCount: messages.length,
                  itemBuilder: (_, i) =>
                      _MessageBubble(msg: messages[i], myId: myId),
                ),
        ),
        _InputBar(
          controller: _input,
          readOnly: readOnly,
          sending: _sending,
          onSend: _send,
        ),
      ],
    );
  }
}

class _MessageBubble extends StatelessWidget {
  const _MessageBubble({required this.msg, required this.myId});

  final ChatMessage msg;
  final String myId;

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    final isMine = msg.senderId == myId;
    final bubbleColor =
        isMine ? cs.primaryContainer : cs.surfaceContainerHighest;
    final textColor = isMine ? cs.onPrimaryContainer : cs.onSurface;
    final dt = DateTime.tryParse(msg.createdAt)?.toLocal();
    final timeLabel = dt != null
        ? '${dt.hour.toString().padLeft(2, '0')}:${dt.minute.toString().padLeft(2, '0')}'
        : '';

    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: Align(
        alignment: isMine ? Alignment.centerRight : Alignment.centerLeft,
        child: ConstrainedBox(
          constraints: BoxConstraints(
            maxWidth: MediaQuery.sizeOf(context).width * 0.72,
          ),
          child: Column(
            crossAxisAlignment:
                isMine ? CrossAxisAlignment.end : CrossAxisAlignment.start,
            children: [
              if (!isMine)
                Padding(
                  padding: const EdgeInsets.only(bottom: 2, left: 4),
                  child: Text(
                    msg.senderRole,
                    style: GoogleFonts.inter(
                      fontSize: 11,
                      fontWeight: FontWeight.w600,
                      color: cs.secondary,
                    ),
                  ),
                ),
              Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                decoration: BoxDecoration(
                  color: bubbleColor,
                  borderRadius: BorderRadius.only(
                    topLeft: const Radius.circular(16),
                    topRight: const Radius.circular(16),
                    bottomLeft: Radius.circular(isMine ? 16 : 4),
                    bottomRight: Radius.circular(isMine ? 4 : 16),
                  ),
                ),
                child: Text(
                  msg.displayText,
                  style: GoogleFonts.inter(fontSize: 14, color: textColor),
                ),
              ),
              Padding(
                padding: const EdgeInsets.only(top: 2, left: 4, right: 4),
                child: Text(
                  timeLabel,
                  style: GoogleFonts.inter(fontSize: 10, color: cs.secondary),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _InputBar extends StatelessWidget {
  const _InputBar({
    required this.controller,
    required this.readOnly,
    required this.sending,
    required this.onSend,
  });

  final TextEditingController controller;
  final bool readOnly;
  final bool sending;
  final VoidCallback onSend;

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    return SafeArea(
      top: false,
      child: Container(
        decoration: BoxDecoration(
          color: cs.surface,
          border: Border(top: BorderSide(color: cs.outline.withValues(alpha: 0.25))),
        ),
        padding: const EdgeInsets.fromLTRB(12, 8, 8, 8),
        child: Row(
          children: [
            Expanded(
              child: TextField(
                controller: controller,
                readOnly: readOnly,
                minLines: 1,
                maxLines: 4,
                textInputAction: TextInputAction.newline,
                style: GoogleFonts.inter(fontSize: 14),
                decoration: InputDecoration(
                  hintText: readOnly
                      ? 'Messaging unlocks after match'
                      : 'Type a message…',
                  hintStyle: GoogleFonts.inter(
                      fontSize: 14, color: cs.onSurface.withValues(alpha: 0.4)),
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(22),
                    borderSide: BorderSide(color: cs.outline.withValues(alpha: 0.3)),
                  ),
                  enabledBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(22),
                    borderSide: BorderSide(color: cs.outline.withValues(alpha: 0.3)),
                  ),
                  contentPadding:
                      const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                  isDense: true,
                ),
              ),
            ),
            const SizedBox(width: 8),
            _SendButton(
              enabled: !readOnly && !sending,
              sending: sending,
              onTap: onSend,
            ),
          ],
        ),
      ),
    );
  }
}

class _SendButton extends StatelessWidget {
  const _SendButton({
    required this.enabled,
    required this.sending,
    required this.onTap,
  });

  final bool enabled;
  final bool sending;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    return Semantics(
      label: 'Send message',
      button: true,
      child: Material(
        color: enabled ? cs.primary : cs.surfaceContainerHighest,
        shape: const CircleBorder(),
        clipBehavior: Clip.antiAlias,
        child: InkWell(
          onTap: enabled ? onTap : null,
          child: SizedBox(
            width: 44,
            height: 44,
            child: Center(
              child: sending
                  ? SizedBox(
                      width: 18,
                      height: 18,
                      child: CircularProgressIndicator(
                        strokeWidth: 2,
                        color: cs.onPrimary,
                      ),
                    )
                  : Icon(
                      LucideIcons.send,
                      size: 18,
                      color: enabled ? cs.onPrimary : cs.secondary,
                    ),
            ),
          ),
        ),
      ),
    );
  }
}
