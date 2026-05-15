import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';

import '../core/app_theme.dart';
import '../core/services/booking_service.dart';

/// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/// Booking Screen — Phase 3 Entry Point
/// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/// Route: '/booking'
/// Arguments: { serviceId, serviceName, priceInCents, bookingMode }
///
/// Layout:
///   AppBar with "← Back" and "Book Service" title
///   Service name (text-xl, bold)
///   Price (accent color, text-lg)
///   Booking mode badge pill
///   📅 Select Date (DatePicker on tap)
///   ⏰ Select Time (TimePicker on tap)
///   📝 Notes (optional, multiline TextField)
///   [CONFIRM BOOKING] full-width button
/// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

class BookingScreen extends StatefulWidget {
  const BookingScreen({super.key});

  @override
  State<BookingScreen> createState() => _BookingScreenState();
}

class _BookingScreenState extends State<BookingScreen> {
  final BookingService _bookingService = BookingService();
  final TextEditingController _notesController = TextEditingController();

  DateTime? _selectedDate;
  TimeOfDay? _selectedTime;
  bool _isSubmitting = false;

  // Route arguments
  String _serviceId = '';
  String _serviceName = '';
  int _priceInCents = 0;
  String _bookingMode = 'FIXED';

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    final args = ModalRoute.of(context)?.settings.arguments;
    if (args is Map) {
      _serviceId = (args['serviceId'] as String?) ?? '';
      _serviceName = (args['serviceName'] as String?) ?? '';
      _priceInCents = (args['priceInCents'] as int?) ?? 0;
      _bookingMode = (args['bookingMode'] as String?) ?? 'FIXED';
    }
  }

  @override
  void dispose() {
    _notesController.dispose();
    super.dispose();
  }

  String get _formattedPrice {
    final dollars = _priceInCents / 100;
    return '\$${dollars.toStringAsFixed(2)}';
  }

  Future<void> _pickDate() async {
    final now = DateTime.now();
    final picked = await showDatePicker(
      context: context,
      initialDate: _selectedDate ?? now.add(const Duration(days: 1)),
      firstDate: now,
      lastDate: now.add(const Duration(days: 365)),
      builder: (context, child) {
        return Theme(
          data: Theme.of(context).copyWith(
            colorScheme: Theme.of(context).colorScheme.copyWith(
                  primary: NeighborlyColors.accent,
                ),
          ),
          child: child!,
        );
      },
    );
    if (picked != null) {
      setState(() => _selectedDate = picked);
    }
  }

  Future<void> _pickTime() async {
    final picked = await showTimePicker(
      context: context,
      initialTime: _selectedTime ?? const TimeOfDay(hour: 9, minute: 0),
      builder: (context, child) {
        return Theme(
          data: Theme.of(context).copyWith(
            colorScheme: Theme.of(context).colorScheme.copyWith(
                  primary: NeighborlyColors.accent,
                ),
          ),
          child: child!,
        );
      },
    );
    if (picked != null) {
      setState(() => _selectedTime = picked);
    }
  }

  Future<void> _confirmBooking() async {
    // Validate: date and time must be selected
    if (_selectedDate == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please select a date')),
      );
      return;
    }
    if (_selectedTime == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please select a time')),
      );
      return;
    }

    setState(() => _isSubmitting = true);

    try {
      // Combine date and time into ISO8601
      final scheduledAt = DateTime(
        _selectedDate!.year,
        _selectedDate!.month,
        _selectedDate!.day,
        _selectedTime!.hour,
        _selectedTime!.minute,
      );

      final result = await _bookingService.createOrder({
        'serviceId': _serviceId,
        'scheduledAt': scheduledAt.toIso8601String(),
        'notes': _notesController.text.trim(),
      });

      if (!mounted) return;

      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            result['status'] == 'PENDING'
                ? 'Booking confirmed!'
                : 'Booking submitted',
          ),
          backgroundColor: NeighborlyColors.success,
        ),
      );
      Navigator.pop(context);
    } catch (e) {
      if (!mounted) return;
      setState(() => _isSubmitting = false);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Error: $e'),
          backgroundColor: NeighborlyColors.error,
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final dateFormat = DateFormat('EEEE, MMMM d, yyyy');
    final timeFormat = _selectedTime != null
        ? _selectedTime!.format(context)
        : 'Select time';

    return Scaffold(
      backgroundColor: NeighborlyColors.bgPrimary,
      appBar: AppBar(
        backgroundColor: NeighborlyColors.bgPrimary,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, color: NeighborlyColors.textPrimary),
          onPressed: () => Navigator.pop(context),
        ),
        title: Text(
          'Book Service',
          style: GoogleFonts.inter(
            fontSize: 18,
            fontWeight: FontWeight.w600,
            color: NeighborlyColors.textPrimary,
          ),
        ),
        elevation: 0,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.fromLTRB(16, 8, 16, 100),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // ── Service Info ──────────────────────────────────────
            Text(
              _serviceName,
              style: GoogleFonts.inter(
                fontSize: 22,
                fontWeight: FontWeight.bold,
                color: NeighborlyColors.textPrimary,
              ),
            ),
            const SizedBox(height: 4),
            Text(
              _formattedPrice,
              style: GoogleFonts.inter(
                fontSize: 18,
                fontWeight: FontWeight.w600,
                color: NeighborlyColors.accent,
              ),
            ),
            const SizedBox(height: 8),
            // Booking mode badge pill
            Container(
              width: 120,
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
              decoration: BoxDecoration(
                color: NeighborlyColors.accent.withValues(alpha: 0.15),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Text(
                _bookingMode,
                textAlign: TextAlign.center,
                style: GoogleFonts.inter(
                  fontSize: 11,
                  fontWeight: FontWeight.w600,
                  color: NeighborlyColors.accent,
                ),
              ),
            ),
            const SizedBox(height: 24),

            // ── Date Selector ─────────────────────────────────────
            _buildSelector(
              icon: Icons.calendar_today,
              label: 'Select Date',
              value: _selectedDate != null
                  ? dateFormat.format(_selectedDate!)
                  : null,
              onTap: _pickDate,
            ),
            const SizedBox(height: 12),

            // ── Time Selector ─────────────────────────────────────
            _buildSelector(
              icon: Icons.access_time,
              label: 'Select Time',
              value: _selectedTime != null ? timeFormat : null,
              onTap: _pickTime,
            ),
            const SizedBox(height: 24),

            // ── Notes ─────────────────────────────────────────────
            Text(
              'Notes (optional)',
              style: GoogleFonts.inter(
                fontSize: 14,
                fontWeight: FontWeight.w500,
                color: NeighborlyColors.textPrimary,
              ),
            ),
            const SizedBox(height: 8),
            TextField(
              controller: _notesController,
              maxLines: 4,
              maxLength: 500,
              decoration: InputDecoration(
                hintText: 'Add any special requests or notes...',
                hintStyle: GoogleFonts.inter(
                  fontSize: 14,
                  color: NeighborlyColors.textFaint,
                ),
                filled: true,
                fillColor: NeighborlyColors.bgCard,
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: const BorderSide(color: NeighborlyColors.textFaint),
                ),
                enabledBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: const BorderSide(color: NeighborlyColors.textFaint),
                ),
                focusedBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: const BorderSide(color: NeighborlyColors.accent, width: 2),
                ),
              ),
              style: GoogleFonts.inter(
                fontSize: 14,
                color: NeighborlyColors.textPrimary,
              ),
            ),
            const SizedBox(height: 32),

            // ── Confirm Button ────────────────────────────────────
            SizedBox(
              height: 52,
              child: FilledButton(
                onPressed: _isSubmitting ? null : _confirmBooking,
                style: FilledButton.styleFrom(
                  backgroundColor: NeighborlyColors.accent,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                ),
                child: _isSubmitting
                    ? const SizedBox(
                        width: 24,
                        height: 24,
                        child: CircularProgressIndicator(
                          strokeWidth: 2.5,
                          color: Colors.white,
                        ),
                      )
                    : Text(
                        'CONFIRM BOOKING',
                        style: GoogleFonts.inter(
                          fontSize: 15,
                          fontWeight: FontWeight.w600,
                          color: Colors.white,
                        ),
                      ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildSelector({
    required IconData icon,
    required String label,
    required String? value,
    required VoidCallback onTap,
  }) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(12),
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: NeighborlyColors.bgCard,
          borderRadius: BorderRadius.circular(12),
        ),
        child: Row(
          children: [
            Icon(icon, color: NeighborlyColors.accent, size: 22),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    label,
                    style: GoogleFonts.inter(
                      fontSize: 12,
                      fontWeight: FontWeight.w500,
                      color: NeighborlyColors.textSecondary,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    value ?? 'Tap to select',
                    style: GoogleFonts.inter(
                      fontSize: 15,
                      fontWeight: FontWeight.w600,
                      color: value != null
                          ? NeighborlyColors.textPrimary
                          : NeighborlyColors.textFaint,
                    ),
                  ),
                ],
              ),
            ),
            const Icon(Icons.chevron_right,
                color: NeighborlyColors.textSecondary, size: 20),
          ],
        ),
      ),
    );
  }
}
