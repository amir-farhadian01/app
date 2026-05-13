import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:lucide_icons/lucide_icons.dart';

import '../models/order_models.dart';

/// Full-width card for a single order row in [MyOrdersScreen] tabs.
class OrderCard extends StatelessWidget {
  const OrderCard({
    super.key,
    required this.order,
    required this.onTap,
  });

  final OrderSummary order;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    return Semantics(
      label: '${order.serviceName}, ${order.status}',
      button: true,
      child: Material(
        color: Theme.of(context).cardColor,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16),
          side: BorderSide(color: cs.outline.withValues(alpha: 0.3)),
        ),
        clipBehavior: Clip.antiAlias,
        child: InkWell(
          onTap: onTap,
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Expanded(
                      child: Text(
                        order.serviceName,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: GoogleFonts.inter(fontWeight: FontWeight.w700, fontSize: 15, color: cs.onSurface),
                      ),
                    ),
                    const SizedBox(width: 8),
                    _OrderStatusChip(status: order.status),
                  ],
                ),
                if (order.breadcrumb.isNotEmpty) ...[
                  const SizedBox(height: 4),
                  Text(
                    order.breadcrumb.join(' › '),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: GoogleFonts.inter(fontSize: 12, color: cs.secondary),
                  ),
                ],
                const SizedBox(height: 8),
                Row(
                  children: [
                    Icon(LucideIcons.calendar, size: 13, color: cs.secondary),
                    const SizedBox(width: 4),
                    Text(
                      _relativeDate(order.createdAt),
                      style: GoogleFonts.inter(fontSize: 12, color: cs.secondary),
                    ),
                    const Spacer(),
                    _ActionButton(order: order, onTap: onTap),
                  ],
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  static String _relativeDate(String raw) {
    final dt = DateTime.tryParse(raw)?.toLocal();
    if (dt == null) return raw;
    final diff = DateTime.now().difference(dt);
    if (diff.inDays == 0) return 'Today';
    if (diff.inDays == 1) return 'Yesterday';
    if (diff.inDays < 7) return '${diff.inDays}d ago';
    if (diff.inDays < 30) return '${(diff.inDays / 7).floor()}w ago';
    return '${(diff.inDays / 30).floor()}mo ago';
  }
}

class _OrderStatusChip extends StatelessWidget {
  const _OrderStatusChip({required this.status});

  final String status;

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    final (Color fg, Color bg) = switch (status) {
      'completed' => (cs.onTertiaryContainer, cs.tertiaryContainer),
      'cancelled' => (cs.onErrorContainer, cs.errorContainer),
      'matched' || 'contracted' || 'paid' || 'in_progress' =>
        (cs.onPrimaryContainer, cs.primaryContainer),
      _ => (cs.onSecondaryContainer, cs.secondaryContainer),
    };
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(color: bg, borderRadius: BorderRadius.circular(100)),
      child: Text(
        status,
        style: GoogleFonts.inter(fontSize: 11, fontWeight: FontWeight.w700, color: fg),
      ),
    );
  }
}

class _ActionButton extends StatelessWidget {
  const _ActionButton({required this.order, required this.onTap});

  final OrderSummary order;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final label = switch (order.status) {
      'submitted' => 'Track',
      'matching' => 'View Offers',
      'matched' || 'contracted' => 'View Contract',
      'paid' || 'in_progress' => 'View Job',
      'completed' => 'Details',
      _ => 'View',
    };
    return TextButton(
      onPressed: onTap,
      style: TextButton.styleFrom(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
        minimumSize: Size.zero,
        tapTargetSize: MaterialTapTargetSize.shrinkWrap,
      ),
      child: Text(label, style: GoogleFonts.inter(fontSize: 12, fontWeight: FontWeight.w700)),
    );
  }
}
