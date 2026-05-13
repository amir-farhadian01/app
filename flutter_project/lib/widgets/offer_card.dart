import 'dart:async';

import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:lucide_icons/lucide_icons.dart';

import '../models/inbox_models.dart';

/// Card for a single provider inbox attempt.
/// Renders service name, masked customer area, budget range, and an expiry
/// countdown that turns red when < 2 hours remain.
/// The internal [Timer] is cancelled in [dispose] — no setState-after-dispose.
class OfferCard extends StatefulWidget {
  const OfferCard({
    super.key,
    required this.attempt,
    required this.onTap,
  });

  final InboxAttempt attempt;
  final VoidCallback onTap;

  @override
  State<OfferCard> createState() => _OfferCardState();
}

class _OfferCardState extends State<OfferCard> {
  Timer? _ticker;
  Duration? _remaining;

  @override
  void initState() {
    super.initState();
    _updateRemaining();
    if (widget.attempt.expiresAt != null) {
      _ticker = Timer.periodic(const Duration(seconds: 1), (_) {
        if (!mounted) return;
        _updateRemaining();
      });
    }
  }

  void _updateRemaining() {
    final r = widget.attempt.timeUntilExpiry;
    if (mounted) setState(() => _remaining = r);
  }

  @override
  void dispose() {
    _ticker?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    final attempt = widget.attempt;

    return Semantics(
      label: '${attempt.serviceName}, ${attempt.status}',
      button: true,
      child: Material(
        color: Theme.of(context).cardColor,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16),
          side: BorderSide(color: cs.outline.withValues(alpha: 0.28)),
        ),
        clipBehavior: Clip.antiAlias,
        child: InkWell(
          onTap: widget.onTap,
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Title row
                Row(
                  children: [
                    Expanded(
                      child: Text(
                        attempt.serviceName,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: GoogleFonts.inter(
                          fontWeight: FontWeight.w700,
                          fontSize: 15,
                          color: cs.onSurface,
                        ),
                      ),
                    ),
                    const SizedBox(width: 8),
                    _StatusChip(status: attempt.status),
                  ],
                ),
                const SizedBox(height: 8),
                // Area
                Row(
                  children: [
                    Icon(LucideIcons.mapPin, size: 13, color: cs.secondary),
                    const SizedBox(width: 4),
                    Expanded(
                      child: Text(
                        attempt.customerArea,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: GoogleFonts.inter(
                            fontSize: 13, color: cs.secondary),
                      ),
                    ),
                  ],
                ),
                // Budget
                if (attempt.budgetMin != null || attempt.budgetMax != null) ...[
                  const SizedBox(height: 4),
                  Row(
                    children: [
                      Icon(LucideIcons.dollarSign,
                          size: 13, color: cs.secondary),
                      const SizedBox(width: 4),
                      Text(
                        _budgetLabel(attempt),
                        style: GoogleFonts.inter(
                            fontSize: 13, color: cs.secondary),
                      ),
                    ],
                  ),
                ],
                // Expiry countdown
                if (_remaining != null) ...[
                  const SizedBox(height: 6),
                  _ExpiryBadge(remaining: _remaining!),
                ],
                // Lost reason chip
                if (attempt.isLost && attempt.lostReason != null) ...[
                  const SizedBox(height: 6),
                  _LostReasonChip(reason: attempt.lostReason!),
                ],
              ],
            ),
          ),
        ),
      ),
    );
  }

  static String _budgetLabel(InboxAttempt a) {
    if (a.budgetMin != null && a.budgetMax != null) {
      return '\$${a.budgetMin!.toStringAsFixed(0)}–\$${a.budgetMax!.toStringAsFixed(0)}';
    }
    if (a.budgetMin != null) return 'From \$${a.budgetMin!.toStringAsFixed(0)}';
    if (a.budgetMax != null) return 'Up to \$${a.budgetMax!.toStringAsFixed(0)}';
    return '';
  }
}

class _ExpiryBadge extends StatelessWidget {
  const _ExpiryBadge({required this.remaining});

  final Duration remaining;

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    final urgent = remaining.inHours < 2;
    final color = urgent ? cs.error : cs.secondary;
    final label = remaining == Duration.zero
        ? 'Expired'
        : _format(remaining);

    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(LucideIcons.clock, size: 13, color: color),
        const SizedBox(width: 4),
        Text(
          label,
          style: GoogleFonts.inter(
            fontSize: 12,
            fontWeight: urgent ? FontWeight.w700 : FontWeight.w500,
            color: color,
          ),
        ),
      ],
    );
  }

  static String _format(Duration d) {
    if (d.inHours >= 1) {
      final h = d.inHours;
      final m = d.inMinutes.remainder(60);
      return '${h}h ${m}m left';
    }
    final m = d.inMinutes;
    final s = d.inSeconds.remainder(60);
    return '${m}m ${s}s left';
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
      padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 3),
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

class _LostReasonChip extends StatelessWidget {
  const _LostReasonChip({required this.reason});

  final String reason;

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 3),
      decoration: BoxDecoration(
        color: cs.errorContainer.withValues(alpha: 0.5),
        borderRadius: BorderRadius.circular(100),
      ),
      child: Text(
        reason,
        style: GoogleFonts.inter(
            fontSize: 11,
            fontWeight: FontWeight.w600,
            color: cs.onErrorContainer),
      ),
    );
  }
}
