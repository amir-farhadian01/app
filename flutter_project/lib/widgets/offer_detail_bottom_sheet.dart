import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:provider/provider.dart';

import '../models/inbox_models.dart';
import '../services/neighborly_api_service.dart';
import '../services/provider_inbox_service.dart';
import '../widgets/order_chat_widget.dart';

/// Shows full offer details + action buttons + chat in a DraggableScrollableSheet.
/// [onActioned] is called after a successful acknowledge/decline/accept so the
/// parent list can refresh.
Future<void> showOfferDetailBottomSheet({
  required BuildContext context,
  required InboxAttempt attempt,
  required String workspaceId,
  required VoidCallback onActioned,
}) {
  return showModalBottomSheet<void>(
    context: context,
    isScrollControlled: true,
    backgroundColor: Colors.transparent,
    builder: (_) => _OfferDetailSheet(
      attempt: attempt,
      workspaceId: workspaceId,
      onActioned: onActioned,
    ),
  );
}

class _OfferDetailSheet extends StatefulWidget {
  const _OfferDetailSheet({
    required this.attempt,
    required this.workspaceId,
    required this.onActioned,
  });

  final InboxAttempt attempt;
  final String workspaceId;
  final VoidCallback onActioned;

  @override
  State<_OfferDetailSheet> createState() => _OfferDetailSheetState();
}

class _OfferDetailSheetState extends State<_OfferDetailSheet>
    with SingleTickerProviderStateMixin {
  late final TabController _tabs;
  bool _busy = false;
  final TextEditingController _declineNote = TextEditingController();

  @override
  void initState() {
    super.initState();
    _tabs = TabController(length: 2, vsync: this);
  }

  @override
  void dispose() {
    _tabs.dispose();
    _declineNote.dispose();
    super.dispose();
  }

  Future<void> _act(Future<void> Function() action) async {
    // Loading guard — prevents duplicate calls on double-tap.
    if (_busy) return;
    setState(() => _busy = true);
    try {
      await action();
      if (!mounted) return;
      Navigator.of(context).pop();
      widget.onActioned();
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context)
          .showSnackBar(SnackBar(content: Text(e.toString())));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  void _acknowledge() {
    final svc = ProviderInboxService(context.read<NeighborlyApiService>());
    _act(() => svc.acknowledge(widget.workspaceId, widget.attempt.attemptId));
  }

  void _accept() {
    final svc = ProviderInboxService(context.read<NeighborlyApiService>());
    _act(() => svc.accept(widget.workspaceId, widget.attempt.attemptId));
  }

  void _showDeclineDialog() {
    showDialog<void>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text('Decline offer',
            style: GoogleFonts.inter(fontWeight: FontWeight.w700)),
        content: TextField(
          controller: _declineNote,
          maxLines: 3,
          decoration: const InputDecoration(
            hintText: 'Reason (optional)',
            border: OutlineInputBorder(),
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () {
              Navigator.pop(ctx);
              final svc =
                  ProviderInboxService(context.read<NeighborlyApiService>());
              _act(() => svc.decline(
                    widget.workspaceId,
                    widget.attempt.attemptId,
                    reason: _declineNote.text.trim().isEmpty
                        ? 'No reason provided'
                        : _declineNote.text.trim(),
                  ));
            },
            child: const Text('Decline'),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    final attempt = widget.attempt;

    return DraggableScrollableSheet(
      initialChildSize: 0.88,
      minChildSize: 0.5,
      maxChildSize: 0.95,
      builder: (_, scrollCtrl) => Container(
        decoration: BoxDecoration(
          color: Theme.of(context).scaffoldBackgroundColor,
          borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
        ),
        child: Column(
          children: [
            // Drag handle
            Padding(
              padding: const EdgeInsets.only(top: 12, bottom: 4),
              child: Container(
                width: 40,
                height: 4,
                decoration: BoxDecoration(
                  color: cs.outline.withValues(alpha: 0.4),
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
            ),
            // Header
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 8, 20, 0),
              child: Row(
                children: [
                  Expanded(
                    child: Text(
                      attempt.serviceName,
                      style: GoogleFonts.inter(
                          fontSize: 18, fontWeight: FontWeight.w700),
                    ),
                  ),
                  _StatusChip(status: attempt.status),
                ],
              ),
            ),
            // Tabs
            TabBar(
              controller: _tabs,
              tabs: const [Tab(text: 'Details'), Tab(text: 'Chat')],
            ),
            // Tab content
            Expanded(
              child: TabBarView(
                controller: _tabs,
                children: [
                  _DetailsTab(
                    attempt: attempt,
                    scrollCtrl: scrollCtrl,
                  ),
                  OrderChatWidget(
                    orderId: attempt.orderId,
                    isActive: true,
                  ),
                ],
              ),
            ),
            // Action bar
            _ActionBar(
              attempt: attempt,
              busy: _busy,
              onAcknowledge: _acknowledge,
              onAccept: _accept,
              onDecline: _showDeclineDialog,
            ),
          ],
        ),
      ),
    );
  }
}

class _DetailsTab extends StatelessWidget {
  const _DetailsTab({required this.attempt, required this.scrollCtrl});

  final InboxAttempt attempt;
  final ScrollController scrollCtrl;

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    return ListView(
      controller: scrollCtrl,
      padding: const EdgeInsets.fromLTRB(20, 16, 20, 24),
      children: [
        _kv(context, 'Area', attempt.customerArea),
        if (attempt.description.isNotEmpty)
          _kv(context, 'Description', attempt.description),
        if (attempt.budgetMin != null || attempt.budgetMax != null)
          _kv(
            context,
            'Budget',
            _budgetLabel(attempt),
          ),
        if (attempt.expiresAt != null)
          _kv(context, 'Expires', _formatDate(attempt.expiresAt!)),
        if (attempt.lostReason != null)
          _kv(context, 'Lost reason', attempt.lostReason!),
        if (attempt.answers.isNotEmpty) ...[
          const SizedBox(height: 8),
          Text('Customer answers',
              style: GoogleFonts.inter(
                  fontSize: 14,
                  fontWeight: FontWeight.w700,
                  color: cs.secondary)),
          const SizedBox(height: 8),
          ...attempt.answers.entries.map(
            (e) => _kv(context, e.key, '${e.value}'),
          ),
        ],
      ],
    );
  }

  static Widget _kv(BuildContext context, String k, String v) {
    final cs = Theme.of(context).colorScheme;
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(k,
              style: GoogleFonts.inter(
                  fontSize: 12,
                  fontWeight: FontWeight.w700,
                  color: cs.secondary)),
          const SizedBox(height: 2),
          Text(v,
              style: GoogleFonts.inter(fontSize: 14, color: cs.onSurface)),
        ],
      ),
    );
  }

  static String _budgetLabel(InboxAttempt a) {
    if (a.budgetMin != null && a.budgetMax != null) {
      return '\$${a.budgetMin!.toStringAsFixed(0)}–\$${a.budgetMax!.toStringAsFixed(0)}';
    }
    if (a.budgetMin != null) return 'From \$${a.budgetMin!.toStringAsFixed(0)}';
    if (a.budgetMax != null) return 'Up to \$${a.budgetMax!.toStringAsFixed(0)}';
    return '—';
  }

  static String _formatDate(String raw) {
    final dt = DateTime.tryParse(raw)?.toLocal();
    if (dt == null) return raw;
    return '${dt.year}-${dt.month.toString().padLeft(2, '0')}-${dt.day.toString().padLeft(2, '0')} '
        '${dt.hour.toString().padLeft(2, '0')}:${dt.minute.toString().padLeft(2, '0')}';
  }
}

class _ActionBar extends StatelessWidget {
  const _ActionBar({
    required this.attempt,
    required this.busy,
    required this.onAcknowledge,
    required this.onAccept,
    required this.onDecline,
  });

  final InboxAttempt attempt;
  final bool busy;
  final VoidCallback onAcknowledge;
  final VoidCallback onAccept;
  final VoidCallback onDecline;

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    // No actions for lost/declined/accepted attempts.
    if (attempt.isLost ||
        attempt.status == 'declined' ||
        attempt.status == 'accepted') {
      return const SizedBox.shrink();
    }

    return SafeArea(
      top: false,
      child: Container(
        decoration: BoxDecoration(
          color: cs.surface,
          border:
              Border(top: BorderSide(color: cs.outline.withValues(alpha: 0.2))),
        ),
        padding: const EdgeInsets.fromLTRB(16, 12, 16, 12),
        child: Row(
          children: [
            // Decline always available for awaiting/acknowledged
            Expanded(
              child: OutlinedButton.icon(
                onPressed: busy ? null : onDecline,
                icon: const Icon(LucideIcons.x, size: 16),
                label: Text('Decline',
                    style: GoogleFonts.inter(fontWeight: FontWeight.w700)),
                style: OutlinedButton.styleFrom(
                  foregroundColor: cs.error,
                  side: BorderSide(color: cs.error.withValues(alpha: 0.6)),
                ),
              ),
            ),
            const SizedBox(width: 10),
            // Acknowledge (awaiting only) or Accept (acknowledged)
            if (attempt.isAwaiting)
              Expanded(
                child: FilledButton.icon(
                  onPressed: busy ? null : onAcknowledge,
                  icon: busy
                      ? const SizedBox(
                          width: 14,
                          height: 14,
                          child: CircularProgressIndicator(strokeWidth: 2),
                        )
                      : const Icon(LucideIcons.check, size: 16),
                  label: Text('Acknowledge',
                      style: GoogleFonts.inter(fontWeight: FontWeight.w700)),
                ),
              )
            else if (attempt.isAcknowledged)
              Expanded(
                child: FilledButton.icon(
                  onPressed: busy ? null : onAccept,
                  icon: busy
                      ? const SizedBox(
                          width: 14,
                          height: 14,
                          child: CircularProgressIndicator(strokeWidth: 2),
                        )
                      : const Icon(LucideIcons.checkCheck, size: 16),
                  label: Text('Accept',
                      style: GoogleFonts.inter(fontWeight: FontWeight.w700)),
                ),
              ),
          ],
        ),
      ),
    );
  }
}

class _StatusChip extends StatelessWidget {
  const _StatusChip({required this.status});

  final String status;

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    final (Color fg, Color bg) = switch (status) {
      'accepted' => (cs.onTertiaryContainer, cs.tertiaryContainer),
      'declined' || 'lost' || 'expired' || 'superseded' =>
        (cs.onErrorContainer, cs.errorContainer),
      'acknowledged' => (cs.onPrimaryContainer, cs.primaryContainer),
      _ => (cs.onSecondaryContainer, cs.secondaryContainer),
    };
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration:
          BoxDecoration(color: bg, borderRadius: BorderRadius.circular(100)),
      child: Text(
        status,
        style: GoogleFonts.inter(
            fontSize: 11, fontWeight: FontWeight.w700, color: fg),
      ),
    );
  }
}
