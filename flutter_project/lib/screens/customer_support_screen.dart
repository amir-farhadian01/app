import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:lucide_icons/lucide_icons.dart';

String _formatDate(dynamic raw) {
  if (raw == null) return '—';
  if (raw is String) {
    final d = DateTime.tryParse(raw);
    return d != null ? d.toLocal().toString().split(' ').first : raw;
  }
  return raw.toString();
}

class CustomerSupportScreen extends StatefulWidget {
  const CustomerSupportScreen({
    super.key,
    required this.initialTickets,
    required this.reloadTickets,
  });

  final List<Map<String, dynamic>> initialTickets;
  final Future<List<Map<String, dynamic>>> Function() reloadTickets;

  @override
  State<CustomerSupportScreen> createState() => _CustomerSupportScreenState();
}

class _CustomerSupportScreenState extends State<CustomerSupportScreen> {
  late List<Map<String, dynamic>> _tickets;

  @override
  void initState() {
    super.initState();
    _tickets = List<Map<String, dynamic>>.from(widget.initialTickets);
  }

  List<Map<String, dynamic>> get _openTickets =>
      _tickets.where((t) => t['status']?.toString() == 'open').toList();

  Future<void> _pull() async {
    final next = await widget.reloadTickets();
    if (!mounted) return;
    setState(() => _tickets = next);
  }

  void _showFaq(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    showModalBottomSheet<void>(
      context: context,
      backgroundColor: cs.surface,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) {
        return SafeArea(
          child: Padding(
            padding: const EdgeInsets.fromLTRB(20, 16, 20, 24),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Text(
                  'Frequently asked questions',
                  style: GoogleFonts.inter(fontSize: 18, fontWeight: FontWeight.w700, color: cs.onSurface),
                ),
                const SizedBox(height: 16),
                _FaqItem(
                  q: 'How do I book a service?',
                  a: 'Open Book a Service, pick a category, choose a provider, and follow the steps to confirm your order.',
                  cs: cs,
                ),
                _FaqItem(
                  q: 'How do I cancel?',
                  a: 'Go to My Orders, open the order, and use cancel if the flow allows it for that job.',
                  cs: cs,
                ),
                _FaqItem(
                  q: 'How does payment work?',
                  a: 'Payments are handled securely in the app. You will see charges in My Spending after work is completed or per your agreement.',
                  cs: cs,
                ),
                _FaqItem(
                  q: 'How do I get help?',
                  a: 'Use Contact Support to view your tickets, or start a new conversation with our team from the web app if needed.',
                  cs: cs,
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  void _contactSupport(BuildContext context) {
    final open = _openTickets;
    final cs = Theme.of(context).colorScheme;
    if (open.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            'No open tickets yet. Create a support request from the web app if you need help.',
            style: GoogleFonts.inter(fontWeight: FontWeight.w600, fontSize: 15),
          ),
        ),
      );
      return;
    }
    showModalBottomSheet<void>(
      context: context,
      backgroundColor: cs.surface,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) {
        return SafeArea(
          child: SizedBox(
            height: MediaQuery.of(ctx).size.height * 0.45,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Padding(
                  padding: const EdgeInsets.all(20),
                  child: Text(
                    'Your open tickets',
                    style: GoogleFonts.inter(fontSize: 18, fontWeight: FontWeight.w700, color: cs.onSurface),
                  ),
                ),
                Expanded(
                  child: ListView.builder(
                    itemCount: open.length,
                    itemBuilder: (_, i) {
                      final t = open[i];
                      return ListTile(
                        title: Text(
                          t['subject']?.toString() ?? 'Ticket',
                          style: GoogleFonts.inter(fontWeight: FontWeight.w700, fontSize: 15),
                        ),
                        subtitle: Text(
                          _formatDate(t['createdAt']),
                          style: GoogleFonts.inter(fontSize: 13, color: cs.secondary),
                        ),
                        trailing: const Icon(LucideIcons.chevronRight, size: 16),
                        onTap: () {
                          Navigator.pop(ctx);
                          ScaffoldMessenger.of(context).showSnackBar(
                            SnackBar(
                              content: Text(
                                'Full ticket thread: use the web app for id ${t['id']}',
                                style: GoogleFonts.inter(fontWeight: FontWeight.w600),
                              ),
                            ),
                          );
                        },
                      );
                    },
                  ),
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    final open = _openTickets;

    return Scaffold(
      backgroundColor: cs.surface,
      appBar: AppBar(
        elevation: 0,
        backgroundColor: cs.surface,
        foregroundColor: cs.onSurface,
        title: Text(
          'Help & Support',
          style: GoogleFonts.inter(fontSize: 18, fontWeight: FontWeight.w700, color: cs.onSurface),
        ),
      ),
      body: RefreshIndicator(
        onRefresh: _pull,
        child: ListView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.fromLTRB(16, 8, 16, 96),
          children: [
            Row(
              children: [
                Expanded(
                  child: _BigSupportCard(
                    title: 'Contact Support',
                    subtitle: open.isEmpty ? 'View tickets' : '${open.length} open ticket${open.length == 1 ? '' : 's'}',
                    icon: LucideIcons.messageCircle,
                    onTap: () => _contactSupport(context),
                    cs: cs,
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: _BigSupportCard(
                    title: 'FAQ',
                    subtitle: 'Common questions',
                    icon: LucideIcons.helpCircle,
                    onTap: () => _showFaq(context),
                    cs: cs,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 24),
            Text(
              'Open tickets',
              style: GoogleFonts.inter(fontSize: 18, fontWeight: FontWeight.w700, color: cs.onSurface),
            ),
            const SizedBox(height: 12),
            if (open.isEmpty)
              _SupportEmpty(cs: cs)
            else
              ...open.map((t) => _TicketCard(ticket: t, cs: cs)),
          ],
        ),
      ),
    );
  }
}

class _BigSupportCard extends StatelessWidget {
  const _BigSupportCard({
    required this.title,
    required this.subtitle,
    required this.icon,
    required this.onTap,
    required this.cs,
  });

  final String title;
  final String subtitle;
  final IconData icon;
  final VoidCallback onTap;
  final ColorScheme cs;

  @override
  Widget build(BuildContext context) {
    return Semantics(
      label: '$title. $subtitle',
      button: true,
      child: Material(
        color: cs.surface,
        elevation: 0,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(20),
          side: BorderSide(color: cs.outline.withValues(alpha: 0.35)),
        ),
        clipBehavior: Clip.antiAlias,
        child: InkWell(
          onTap: onTap,
          child: SizedBox(
            height: 120,
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Container(
                    width: 44,
                    height: 44,
                    decoration: BoxDecoration(
                      color: cs.surfaceContainerHighest,
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Icon(icon, size: 22, color: cs.onSurface),
                  ),
                  const Spacer(),
                  Text(
                    title,
                    style: GoogleFonts.inter(fontSize: 16, fontWeight: FontWeight.w700, color: cs.onSurface),
                  ),
                  Text(
                    subtitle,
                    style: GoogleFonts.inter(fontSize: 13, color: cs.secondary),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _FaqItem extends StatelessWidget {
  const _FaqItem({required this.q, required this.a, required this.cs});

  final String q;
  final String a;
  final ColorScheme cs;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(q, style: GoogleFonts.inter(fontSize: 15, fontWeight: FontWeight.w700, color: cs.onSurface)),
          const SizedBox(height: 6),
          Text(a, style: GoogleFonts.inter(fontSize: 15, color: cs.secondary, height: 1.35)),
        ],
      ),
    );
  }
}

class _TicketCard extends StatelessWidget {
  const _TicketCard({required this.ticket, required this.cs});

  final Map<String, dynamic> ticket;
  final ColorScheme cs;

  @override
  Widget build(BuildContext context) {
    final st = ticket['status']?.toString() ?? '';
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Material(
        color: cs.surface,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(20),
          side: BorderSide(color: cs.outline.withValues(alpha: 0.35)),
        ),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                ticket['subject']?.toString() ?? 'Ticket',
                style: GoogleFonts.inter(fontSize: 15, fontWeight: FontWeight.w700, color: cs.onSurface),
              ),
              const SizedBox(height: 8),
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                    decoration: BoxDecoration(
                      color: cs.secondaryContainer,
                      borderRadius: BorderRadius.circular(100),
                    ),
                    child: Text(
                      st,
                      style: GoogleFonts.inter(fontSize: 12, fontWeight: FontWeight.w700, color: cs.onSecondaryContainer),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Text(
                    _formatDate(ticket['createdAt']),
                    style: GoogleFonts.inter(fontSize: 13, color: cs.secondary),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _SupportEmpty extends StatelessWidget {
  const _SupportEmpty({required this.cs});

  final ColorScheme cs;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 24),
      child: Column(
        children: [
          Icon(LucideIcons.ticket, size: 48, color: cs.secondary),
          const SizedBox(height: 16),
          Text(
            'No open tickets',
            style: GoogleFonts.inter(fontSize: 18, fontWeight: FontWeight.w700, color: cs.onSurface),
          ),
          const SizedBox(height: 8),
          Text(
            'If something goes wrong, contact support from the web app or check back here after you open a ticket.',
            textAlign: TextAlign.center,
            style: GoogleFonts.inter(fontSize: 15, color: cs.secondary, height: 1.35),
          ),
        ],
      ),
    );
  }
}
