import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:provider/provider.dart';

import '../services/neighborly_api_service.dart';

/// Notifications Screen with 3 tabs: Provider, Admin, Notifications
class NotificationsScreen extends StatefulWidget {
  const NotificationsScreen({super.key});

  @override
  State<NotificationsScreen> createState() => _NotificationsScreenState();
}

class _NotificationsScreenState extends State<NotificationsScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;
  bool _isLoading = true;

  // Data lists
  List<Map<String, dynamic>> _providerMessages = [];
  List<Map<String, dynamic>> _adminTickets = [];
  List<Map<String, dynamic>> _notifications = [];

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
    _loadAllData();
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  Future<void> _loadAllData() async {
    setState(() => _isLoading = true);
    try {
      await Future.wait([
        _loadProviderMessages(),
        _loadAdminTickets(),
        _loadNotifications(),
      ]);
    } finally {
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }

  Future<void> _loadProviderMessages() async {
    try {
      final api = context.read<NeighborlyApiService>();
      final data = await api.fetchProviderMessages();
      setState(() => _providerMessages = data);
    } catch (_) {
      // Silently fail
    }
  }

  Future<void> _loadAdminTickets() async {
    try {
      final api = context.read<NeighborlyApiService>();
      final data = await api.fetchAdminTickets();
      setState(() => _adminTickets = data);
    } catch (_) {
      // Silently fail
    }
  }

  Future<void> _loadNotifications() async {
    try {
      final api = context.read<NeighborlyApiService>();
      final data = await api.fetchNotifications();
      setState(() => _notifications = data);
    } catch (_) {
      // Silently fail
    }
  }

  int get _totalUnread {
    final providerUnread = _providerMessages
        .where((m) => !(m['read'] as bool? ?? false))
        .length;
    final adminUnread = _adminTickets
        .where((t) => !(t['read'] as bool? ?? false))
        .length;
    final notifUnread = _notifications
        .where((n) => !(n['read'] as bool? ?? false))
        .length;
    return providerUnread + adminUnread + notifUnread;
  }

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;

    return Scaffold(
      backgroundColor: cs.surface,
      appBar: AppBar(
        backgroundColor: cs.surface,
        elevation: 0,
        centerTitle: true,
        title: Text(
          'Messages & Notifications',
          style: GoogleFonts.inter(
            fontSize: 18,
            fontWeight: FontWeight.w700,
            color: cs.onSurface,
          ),
        ),
        leading: IconButton(
          icon: Icon(LucideIcons.chevronLeft, color: cs.onSurface),
          onPressed: () => Navigator.pop(context),
        ),
        actions: [
          if (_totalUnread > 0)
            TextButton(
              onPressed: _markAllAsRead,
              child: Text(
                'Mark all read',
                style: GoogleFonts.inter(
                  fontSize: 13,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ),
        ],
        bottom: TabBar(
          controller: _tabController,
          labelStyle: GoogleFonts.inter(fontWeight: FontWeight.w700),
          unselectedLabelStyle: GoogleFonts.inter(fontWeight: FontWeight.w500),
          indicatorColor: cs.primary,
          labelColor: cs.primary,
          unselectedLabelColor: cs.secondary,
          tabs: [
            _buildTab('Providers', _providerMessages),
            _buildTab('Admin', _adminTickets),
            _buildTab('Notifications', _notifications),
          ],
        ),
      ),
      body: TabBarView(
        controller: _tabController,
        children: [
          _buildProviderTab(cs),
          _buildAdminTab(cs),
          _buildNotificationsTab(cs),
        ],
      ),
    );
  }

  Widget _buildTab(String label, List<Map<String, dynamic>> items) {
    final unreadCount = items.where((i) => !(i['read'] as bool? ?? false)).length;
    return Tab(
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(label),
          if (unreadCount > 0) ...[
            const SizedBox(width: 6),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
              decoration: BoxDecoration(
                color: Colors.red,
                borderRadius: BorderRadius.circular(10),
              ),
              child: Text(
                unreadCount.toString(),
                style: GoogleFonts.inter(
                  fontSize: 11,
                  fontWeight: FontWeight.w700,
                  color: Colors.white,
                ),
              ),
            ),
          ],
        ],
      ),
    );
  }

  // ─── Provider Tab ─────────────────────────────────────────────────────────
  Widget _buildProviderTab(ColorScheme cs) {
    if (_isLoading) {
      return const Center(child: CircularProgressIndicator());
    }

    if (_providerMessages.isEmpty) {
      return _buildEmptyState(
        cs,
        icon: LucideIcons.messageSquare,
        title: 'No Provider Messages',
        subtitle: 'You can only message providers after booking a service or when they contact you first.',
      );
    }

    return RefreshIndicator(
      onRefresh: _loadProviderMessages,
      child: ListView.builder(
        padding: const EdgeInsets.all(16),
        itemCount: _providerMessages.length,
        itemBuilder: (context, index) {
          final message = _providerMessages[index];
          return _buildProviderMessageCard(message, cs);
        },
      ),
    );
  }

  Widget _buildProviderMessageCard(Map<String, dynamic> message, ColorScheme cs) {
    final providerName = message['provider']?['displayName']?.toString() ?? 'Provider';
    final lastMessage = message['lastMessage']?.toString() ?? 'No messages yet';
    final timestamp = message['timestamp'] != null
        ? DateTime.tryParse(message['timestamp'].toString())
        : null;
    final isRead = message['read'] as bool? ?? false;
    final serviceTitle = message['service']?['title']?.toString() ?? 'Unknown Service';

    return GestureDetector(
      onTap: () => _openProviderChat(message),
      child: Container(
        margin: const EdgeInsets.only(bottom: 12),
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: isRead ? cs.surface : cs.primaryContainer.withValues(alpha: 0.3),
          borderRadius: BorderRadius.circular(16),
          border: Border.all(
            color: isRead
                ? cs.outline.withValues(alpha: 0.1)
                : cs.primary.withValues(alpha: 0.3),
          ),
        ),
        child: Row(
          children: [
            Container(
              width: 50,
              height: 50,
              decoration: BoxDecoration(
                color: cs.primaryContainer,
                shape: BoxShape.circle,
              ),
              child: Center(
                child: Text(
                  providerName.isNotEmpty ? providerName[0].toUpperCase() : 'P',
                  style: GoogleFonts.inter(
                    fontSize: 20,
                    fontWeight: FontWeight.w700,
                    color: cs.onPrimaryContainer,
                  ),
                ),
              ),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Expanded(
                        child: Text(
                          providerName,
                          style: GoogleFonts.inter(
                            fontSize: 15,
                            fontWeight: isRead ? FontWeight.w600 : FontWeight.w800,
                            color: cs.onSurface,
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                      if (!isRead)
                        Container(
                          width: 8,
                          height: 8,
                          decoration: BoxDecoration(
                            color: cs.primary,
                            shape: BoxShape.circle,
                          ),
                        ),
                    ],
                  ),
                  const SizedBox(height: 4),
                  Text(
                    'Service: $serviceTitle',
                    style: GoogleFonts.inter(
                      fontSize: 12,
                      color: cs.secondary,
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                  const SizedBox(height: 4),
                  Text(
                    lastMessage,
                    style: GoogleFonts.inter(
                      fontSize: 13,
                      color: cs.onSurfaceVariant,
                    ),
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                  ),
                  if (timestamp != null) ...[
                    const SizedBox(height: 6),
                    Text(
                      _formatTime(timestamp),
                      style: GoogleFonts.inter(
                        fontSize: 11,
                        color: cs.secondary,
                      ),
                    ),
                  ],
                ],
              ),
            ),
            Icon(
              LucideIcons.chevronRight,
              color: cs.secondary,
              size: 20,
            ),
          ],
        ),
      ),
    );
  }

  // ─── Admin Tab ────────────────────────────────────────────────────────────
  Widget _buildAdminTab(ColorScheme cs) {
    if (_isLoading) {
      return const Center(child: CircularProgressIndicator());
    }

    if (_adminTickets.isEmpty) {
      return _buildEmptyState(
        cs,
        icon: LucideIcons.headphones,
        title: 'No Support Tickets',
        subtitle: 'Contact admin for KYC issues, technical problems, or complaints about providers.',
      );
    }

    return RefreshIndicator(
      onRefresh: _loadAdminTickets,
      child: ListView.builder(
        padding: const EdgeInsets.all(16),
        itemCount: _adminTickets.length,
        itemBuilder: (context, index) {
          final ticket = _adminTickets[index];
          return _buildAdminTicketCard(ticket, cs);
        },
      ),
    );
  }

  Widget _buildAdminTicketCard(Map<String, dynamic> ticket, ColorScheme cs) {
    final subject = ticket['subject']?.toString() ?? 'No Subject';
    final type = ticket['type']?.toString() ?? 'general';
    final status = ticket['status']?.toString() ?? 'open';
    final createdAt = ticket['createdAt'] != null
        ? DateTime.tryParse(ticket['createdAt'].toString())
        : null;
    final isRead = ticket['read'] as bool? ?? false;

    Color typeColor;
    IconData typeIcon;
    String typeLabel;

    switch (type.toLowerCase()) {
      case 'kyc':
        typeColor = Colors.blue;
        typeIcon = LucideIcons.shield;
        typeLabel = 'KYC';
        break;
      case 'technical':
        typeColor = Colors.purple;
        typeIcon = LucideIcons.wrench;
        typeLabel = 'Technical';
        break;
      case 'complaint':
        typeColor = Colors.red;
        typeIcon = LucideIcons.alertTriangle;
        typeLabel = 'Complaint';
        break;
      default:
        typeColor = cs.primary;
        typeIcon = LucideIcons.helpCircle;
        typeLabel = 'Support';
    }

    return GestureDetector(
      onTap: () => _openAdminTicket(ticket),
      child: Container(
        margin: const EdgeInsets.only(bottom: 12),
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: isRead ? cs.surface : typeColor.withValues(alpha: 0.1),
          borderRadius: BorderRadius.circular(16),
          border: Border.all(
            color: status == 'open'
                ? typeColor.withValues(alpha: 0.5)
                : cs.outline.withValues(alpha: 0.1),
          ),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(
                    color: typeColor.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(typeIcon, size: 14, color: typeColor),
                      const SizedBox(width: 4),
                      Text(
                        typeLabel,
                        style: GoogleFonts.inter(
                          fontSize: 11,
                          fontWeight: FontWeight.w600,
                          color: typeColor,
                        ),
                      ),
                    ],
                  ),
                ),
                const Spacer(),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(
                    color: status == 'open'
                        ? Colors.orange.withValues(alpha: 0.1)
                        : Colors.green.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Text(
                    status.toUpperCase(),
                    style: GoogleFonts.inter(
                      fontSize: 10,
                      fontWeight: FontWeight.w700,
                      color: status == 'open' ? Colors.orange : Colors.green,
                    ),
                  ),
                ),
                if (!isRead) ...[
                  const SizedBox(width: 8),
                  Container(
                    width: 8,
                    height: 8,
                    decoration: BoxDecoration(
                      color: cs.primary,
                      shape: BoxShape.circle,
                    ),
                  ),
                ],
              ],
            ),
            const SizedBox(height: 12),
            Text(
              subject,
              style: GoogleFonts.inter(
                fontSize: 15,
                fontWeight: isRead ? FontWeight.w600 : FontWeight.w800,
                color: cs.onSurface,
              ),
            ),
            if (createdAt != null) ...[
              const SizedBox(height: 8),
              Row(
                children: [
                  Icon(LucideIcons.calendar, size: 14, color: cs.secondary),
                  const SizedBox(width: 6),
                  Text(
                    DateFormat('MMM dd, yyyy').format(createdAt),
                    style: GoogleFonts.inter(
                      fontSize: 12,
                      color: cs.secondary,
                    ),
                  ),
                ],
              ),
            ],
          ],
        ),
      ),
    );
  }

  // ─── Notifications Tab ────────────────────────────────────────────────────
  Widget _buildNotificationsTab(ColorScheme cs) {
    if (_isLoading) {
      return const Center(child: CircularProgressIndicator());
    }

    if (_notifications.isEmpty) {
      return _buildEmptyState(
        cs,
        icon: LucideIcons.bell,
        title: 'No Notifications',
        subtitle: 'You\'ll receive reminders, security alerts, and payment notifications here.',
      );
    }

    return RefreshIndicator(
      onRefresh: _loadNotifications,
      child: ListView.builder(
        padding: const EdgeInsets.all(16),
        itemCount: _notifications.length,
        itemBuilder: (context, index) {
          final notification = _notifications[index];
          return _buildNotificationCard(notification, cs);
        },
      ),
    );
  }

  Widget _buildNotificationCard(Map<String, dynamic> notification, ColorScheme cs) {
    final title = notification['title']?.toString() ?? 'Notification';
    final message = notification['message']?.toString() ?? '';
    final type = notification['type']?.toString() ?? 'system';
    final createdAt = notification['createdAt'] != null
        ? DateTime.tryParse(notification['createdAt'].toString())
        : null;
    final isRead = notification['read'] as bool? ?? false;

    Color typeColor;
    IconData typeIcon;

    switch (type.toLowerCase()) {
      case 'reminder':
        typeColor = Colors.blue;
        typeIcon = LucideIcons.clock;
        break;
      case 'security':
        typeColor = Colors.red;
        typeIcon = LucideIcons.shieldAlert;
        break;
      case 'payment':
        typeColor = Colors.green;
        typeIcon = LucideIcons.creditCard;
        break;
      case 'request':
        typeColor = Colors.purple;
        typeIcon = LucideIcons.clipboardList;
        break;
      default:
        typeColor = cs.secondary;
        typeIcon = LucideIcons.bell;
    }

    final notificationId = notification['id']?.toString() ??
        '${notification['title']?.hashCode}-${notification['createdAt']?.hashCode}';

    return Dismissible(
      key: Key(notificationId),
      direction: DismissDirection.endToStart,
      background: Container(
        alignment: Alignment.centerRight,
        padding: const EdgeInsets.only(right: 20),
        decoration: BoxDecoration(
          color: cs.error,
          borderRadius: BorderRadius.circular(16),
        ),
        child: Icon(LucideIcons.trash2, color: cs.onError),
      ),
      onDismissed: (_) => _deleteNotification(notification['id']?.toString()),
      child: GestureDetector(
        onTap: () => _markNotificationAsRead(notification['id']?.toString()),
        child: Container(
          margin: const EdgeInsets.only(bottom: 12),
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: isRead ? cs.surface : typeColor.withValues(alpha: 0.1),
            borderRadius: BorderRadius.circular(16),
            border: Border.all(
              color: isRead
                  ? cs.outline.withValues(alpha: 0.1)
                  : typeColor.withValues(alpha: 0.3),
            ),
          ),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                width: 44,
                height: 44,
                decoration: BoxDecoration(
                  color: typeColor.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Icon(typeIcon, color: typeColor, size: 22),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Expanded(
                          child: Text(
                            title,
                            style: GoogleFonts.inter(
                              fontSize: 15,
                              fontWeight: isRead ? FontWeight.w600 : FontWeight.w800,
                              color: cs.onSurface,
                            ),
                          ),
                        ),
                        if (!isRead)
                          Container(
                            width: 8,
                            height: 8,
                            decoration: BoxDecoration(
                              color: typeColor,
                              shape: BoxShape.circle,
                            ),
                          ),
                      ],
                    ),
                    const SizedBox(height: 4),
                    Text(
                      message,
                      style: GoogleFonts.inter(
                        fontSize: 13,
                        color: cs.onSurfaceVariant,
                        height: 1.5,
                      ),
                    ),
                    if (createdAt != null) ...[
                      const SizedBox(height: 8),
                      Text(
                        _formatTime(createdAt),
                        style: GoogleFonts.inter(
                          fontSize: 11,
                          color: cs.secondary,
                        ),
                      ),
                    ],
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildEmptyState(
    ColorScheme cs, {
    required IconData icon,
    required String title,
    required String subtitle,
  }) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(40),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              width: 100,
              height: 100,
              decoration: BoxDecoration(
                color: cs.surfaceContainerHighest,
                borderRadius: BorderRadius.circular(24),
              ),
              child: Icon(icon, size: 48, color: cs.secondary.withValues(alpha: 0.5)),
            ),
            const SizedBox(height: 24),
            Text(
              title,
              style: GoogleFonts.inter(
                fontSize: 20,
                fontWeight: FontWeight.w700,
                color: cs.onSurface,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              subtitle,
              textAlign: TextAlign.center,
              style: GoogleFonts.inter(
                fontSize: 14,
                color: cs.secondary,
                height: 1.5,
              ),
            ),
          ],
        ),
      ),
    );
  }

  String _formatTime(DateTime date) {
    final now = DateTime.now();
    final diff = now.difference(date);

    if (diff.inMinutes < 1) {
      return 'Just now';
    } else if (diff.inHours < 1) {
      return '${diff.inMinutes}m ago';
    } else if (diff.inDays < 1) {
      return '${diff.inHours}h ago';
    } else if (diff.inDays < 7) {
      return '${diff.inDays}d ago';
    } else {
      return DateFormat('MMM dd, yyyy').format(date);
    }
  }

  Future<void> _markAllAsRead() async {
    try {
      final api = context.read<NeighborlyApiService>();
      await api.markAllNotificationsRead();
      await _loadAllData();
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to mark as read: $e')),
        );
      }
    }
  }

  Future<void> _markNotificationAsRead(String? id) async {
    if (id == null) return;
    try {
      final api = context.read<NeighborlyApiService>();
      await api.markNotificationRead(id);
      await _loadNotifications();
    } catch (_) {}
  }

  Future<void> _deleteNotification(String? id) async {
    if (id == null) return;
    try {
      final api = context.read<NeighborlyApiService>();
      await api.deleteNotification(id);
      await _loadNotifications();
    } catch (_) {}
  }

  void _openProviderChat(Map<String, dynamic> message) {
    // Navigate to provider chat screen
    Navigator.pushNamed(
      context,
      '/chat',
      arguments: {
        'providerId': message['providerId'],
        'providerName': message['provider']?['displayName'],
        'serviceId': message['serviceId'],
        'serviceTitle': message['service']?['title'],
      },
    );
  }

  void _openAdminTicket(Map<String, dynamic> ticket) {
    // Navigate to ticket detail screen
    Navigator.pushNamed(
      context,
      '/tickets',
      arguments: {'ticketId': ticket['id']},
    );
  }
}