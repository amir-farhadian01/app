import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:provider/provider.dart';

import '../models/user_model.dart';
import '../services/neighborly_api_service.dart';

/// KYC Verification Screen - Identity verification with security warnings
class KycScreen extends StatefulWidget {
  const KycScreen({super.key});

  @override
  State<KycScreen> createState() => _KycScreenState();
}

class _KycScreenState extends State<KycScreen> {
  String? _selectedDocumentType;
  bool _isUploading = false;

  final List<Map<String, dynamic>> _documentTypes = [
    {
      'id': 'passport',
      'name': 'Passport',
      'icon': LucideIcons.globe,
      'description': 'International passport',
    },
    {
      'id': 'drivers_license',
      'name': 'Driver\'s License',
      'icon': LucideIcons.car,
      'description': 'Valid driver\'s license',
    },
    {
      'id': 'national_id',
      'name': 'National ID Card',
      'icon': LucideIcons.fileText,
      'description': 'Government-issued ID card',
    },
  ];

  Future<void> _uploadDocument() async {
    if (_selectedDocumentType == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            'Please select a document type first',
            style: GoogleFonts.inter(),
          ),
          backgroundColor: Theme.of(context).colorScheme.error,
        ),
      );
      return;
    }

    setState(() => _isUploading = true);

    final api = context.read<NeighborlyApiService>();
    try {
      // Simulate document upload - in real implementation, use image picker
      await Future.delayed(const Duration(seconds: 2));

      if (!mounted) return;

      // Submit KYC
      await api.submitKycDocument(
        documentType: _selectedDocumentType!,
        // documentFile: selectedFile,
      );

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
              'Document submitted successfully! We\'ll review it within 24 hours.',
              style: GoogleFonts.inter(),
            ),
            backgroundColor: Colors.green,
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
              'Failed to upload: ${e.toString()}',
              style: GoogleFonts.inter(),
            ),
            backgroundColor: Theme.of(context).colorScheme.error,
          ),
        );
      }
    } finally {
      if (mounted) {
        setState(() => _isUploading = false);
      }
    }
  }

  Future<void> _verifyEmail() async {
    try {
      final api = context.read<NeighborlyApiService>();
      await api.requestEmailVerification();

      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            'Verification email sent! Please check your inbox.',
            style: GoogleFonts.inter(),
          ),
          backgroundColor: Colors.green,
        ),
      );
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            'Failed to send verification email: ${e.toString()}',
            style: GoogleFonts.inter(),
          ),
          backgroundColor: Theme.of(context).colorScheme.error,
        ),
      );
    }
  }

  Future<void> _verifyPhone() async {
    // Show phone verification dialog
    showDialog(
      context: context,
      builder: (context) => const PhoneVerificationDialog(),
    );
  }

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    final user = context.watch<NeighborlyApiService>().user;
    final kyc = user?.kyc ?? const KycStatus();

    return Scaffold(
      backgroundColor: cs.surface,
      appBar: AppBar(
        backgroundColor: cs.surface,
        elevation: 0,
        centerTitle: true,
        title: Text(
          'Identity Verification (KYC)',
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
      ),
      body: ListView(
        padding: const EdgeInsets.all(20),
        children: [
          // Status Card
          _buildStatusCard(kyc, cs),
          const SizedBox(height: 24),

          // Security Warning
          _buildSecurityWarning(cs),
          const SizedBox(height: 24),

          // Level 1: Email + Phone
          _buildLevel1Section(kyc, cs),
          const SizedBox(height: 24),

          // Level 2: Identity Verification
          _buildLevel2Section(kyc, cs),
          const SizedBox(height: 32),

          // KYC Info
          _buildKycInfoSection(cs),
        ],
      ),
    );
  }

  Widget _buildStatusCard(KycStatus kyc, ColorScheme cs) {
    Color statusColor;
    IconData statusIcon;
    String statusText;
    String description;

    switch (kyc.status.toLowerCase()) {
      case 'verified':
        statusColor = Colors.green;
        statusIcon = LucideIcons.shieldCheck;
        statusText = 'Verified';
        description = 'Your identity has been verified. You can place orders.';
        break;
      case 'pending':
        statusColor = Colors.orange;
        statusIcon = LucideIcons.clock;
        statusText = 'Pending Review';
        description = 'Your documents are under review. Please wait 24-48 hours.';
        break;
      case 'rejected':
        statusColor = Colors.red;
        statusIcon = LucideIcons.xCircle;
        statusText = 'Rejected';
        description = 'Your verification was rejected. Please check your email for details.';
        break;
      default:
        statusColor = cs.primary;
        statusIcon = LucideIcons.shield;
        statusText = 'Not Started';
        description = 'Complete verification to place orders and access all features.';
    }

    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [statusColor.withValues(alpha: 0.1), cs.surfaceContainerHighest],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: statusColor.withValues(alpha: 0.3)),
      ),
      child: Column(
        children: [
          Row(
            children: [
              Container(
                width: 56,
                height: 56,
                decoration: BoxDecoration(
                  color: statusColor.withValues(alpha: 0.2),
                  shape: BoxShape.circle,
                ),
                child: Icon(statusIcon, color: statusColor, size: 28),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'KYC Status',
                      style: GoogleFonts.inter(
                        fontSize: 14,
                        color: cs.secondary,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      statusText,
                      style: GoogleFonts.inter(
                        fontSize: 20,
                        fontWeight: FontWeight.w800,
                        color: statusColor,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      kyc.kycLevelText,
                      style: GoogleFonts.inter(
                        fontSize: 13,
                        color: cs.onSurface,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          Text(
            description,
            style: GoogleFonts.inter(
              fontSize: 14,
              color: cs.onSurfaceVariant,
              height: 1.5,
            ),
          ),
          if (!kyc.canPlaceOrder) ...[
            const SizedBox(height: 12),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
              decoration: BoxDecoration(
                color: Colors.red.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Row(
                children: [
                  const Icon(LucideIcons.alertTriangle, size: 16, color: Colors.red),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      'KYC Level 2 required to place orders',
                      style: GoogleFonts.inter(
                        fontSize: 12,
                        color: Colors.red,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildSecurityWarning(ColorScheme cs) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.red.withValues(alpha: 0.05),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.red.withValues(alpha: 0.2)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Icon(LucideIcons.shieldAlert, color: Colors.red, size: 20),
              const SizedBox(width: 8),
              Text(
                'Security Warning',
                style: GoogleFonts.inter(
                  fontSize: 15,
                  fontWeight: FontWeight.w700,
                  color: Colors.red,
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Text(
            'For your security, NEVER upload the following documents:',
            style: GoogleFonts.inter(
              fontSize: 13,
              color: cs.onSurface,
              fontWeight: FontWeight.w600,
            ),
          ),
          const SizedBox(height: 8),
          _buildWarningItem('Bank cards or credit cards', cs),
          _buildWarningItem('Bank account numbers or IBAN', cs),
          _buildWarningItem('Any financial documents', cs),
          _buildWarningItem('Social security numbers (if not required)', cs),
          const SizedBox(height: 12),
          Text(
            'We only need a valid ID (Passport, Driver\'s License, or National ID) for identity verification. '
            'All uploads are encrypted and stored securely.',
            style: GoogleFonts.inter(
              fontSize: 12,
              color: cs.secondary,
              height: 1.5,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildWarningItem(String text, ColorScheme cs) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        children: [
          const Icon(LucideIcons.x, color: Colors.red, size: 16),
          const SizedBox(width: 8),
          Text(
            text,
            style: GoogleFonts.inter(
              fontSize: 13,
              color: cs.onSurfaceVariant,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildLevel1Section(KycStatus kyc, ColorScheme cs) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Container(
              width: 32,
              height: 32,
              decoration: BoxDecoration(
                color: kyc.emailVerified && kyc.phoneVerified
                    ? Colors.green.withValues(alpha: 0.2)
                    : cs.primaryContainer,
                borderRadius: BorderRadius.circular(8),
              ),
              child: kyc.emailVerified && kyc.phoneVerified
                  ? const Icon(LucideIcons.check, color: Colors.green, size: 18)
                  : Text(
                      '1',
                      style: GoogleFonts.inter(
                        fontSize: 16,
                        fontWeight: FontWeight.w700,
                        color: cs.onPrimaryContainer,
                      ),
                    ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Level 1: Basic Verification',
                    style: GoogleFonts.inter(
                      fontSize: 16,
                      fontWeight: FontWeight.w700,
                      color: cs.onSurface,
                    ),
                  ),
                  Text(
                    'Email and Phone Verification',
                    style: GoogleFonts.inter(
                      fontSize: 13,
                      color: cs.secondary,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
        const SizedBox(height: 16),
        _buildVerificationItem(
          icon: LucideIcons.mail,
          title: 'Email Verification',
          status: kyc.emailVerified,
          onTap: kyc.emailVerified ? null : _verifyEmail,
          cs: cs,
        ),
        const SizedBox(height: 12),
        _buildVerificationItem(
          icon: LucideIcons.phone,
          title: 'Phone Verification',
          status: kyc.phoneVerified,
          onTap: kyc.phoneVerified ? null : _verifyPhone,
          cs: cs,
        ),
      ],
    );
  }

  Widget _buildLevel2Section(KycStatus kyc, ColorScheme cs) {
    final isLevel1Complete = kyc.emailVerified && kyc.phoneVerified;
    final isVerified = kyc.identityVerified;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Container(
              width: 32,
              height: 32,
              decoration: BoxDecoration(
                color: isVerified
                    ? Colors.green.withValues(alpha: 0.2)
                    : isLevel1Complete
                        ? cs.primaryContainer
                        : cs.surfaceContainerHighest,
                borderRadius: BorderRadius.circular(8),
              ),
              child: isVerified
                  ? const Icon(LucideIcons.check, color: Colors.green, size: 18)
                  : Text(
                      '2',
                      style: GoogleFonts.inter(
                        fontSize: 16,
                        fontWeight: FontWeight.w700,
                        color: isLevel1Complete
                            ? cs.onPrimaryContainer
                            : cs.secondary,
                      ),
                    ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Level 2: Identity Verification',
                    style: GoogleFonts.inter(
                      fontSize: 16,
                      fontWeight: FontWeight.w700,
                      color: isLevel1Complete ? cs.onSurface : cs.secondary,
                    ),
                  ),
                  Text(
                    'Government-issued ID Required',
                    style: GoogleFonts.inter(
                      fontSize: 13,
                      color: cs.secondary,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
        const SizedBox(height: 16),
        if (!isLevel1Complete)
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: cs.surfaceContainerHighest,
              borderRadius: BorderRadius.circular(12),
            ),
            child: Row(
              children: [
                Icon(LucideIcons.info, size: 18, color: cs.secondary),
                const SizedBox(width: 12),
                Expanded(
                  child: Text(
                    'Complete Level 1 first to unlock Level 2',
                    style: GoogleFonts.inter(
                      fontSize: 13,
                      color: cs.secondary,
                    ),
                  ),
                ),
              ],
            ),
          )
        else if (isVerified)
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Colors.green.withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: Colors.green.withValues(alpha: 0.3)),
            ),
            child: Row(
              children: [
                const Icon(LucideIcons.checkCircle, color: Colors.green, size: 24),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Identity Verified',
                        style: GoogleFonts.inter(
                          fontSize: 15,
                          fontWeight: FontWeight.w700,
                          color: Colors.green,
                        ),
                      ),
                      Text(
                        'You can now place orders and access all features.',
                        style: GoogleFonts.inter(
                          fontSize: 13,
                          color: cs.onSurfaceVariant,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          )
        else
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Select Document Type:',
                style: GoogleFonts.inter(
                  fontSize: 14,
                  fontWeight: FontWeight.w600,
                  color: cs.onSurface,
                ),
              ),
              const SizedBox(height: 12),
              ..._documentTypes.map((doc) => _buildDocumentTypeCard(doc, cs)),
              const SizedBox(height: 20),
              SizedBox(
                width: double.infinity,
                child: FilledButton.icon(
                  onPressed: _isUploading ? null : _uploadDocument,
                  icon: _isUploading
                      ? const SizedBox(
                          width: 18,
                          height: 18,
                          child: CircularProgressIndicator(strokeWidth: 2),
                        )
                      : const Icon(LucideIcons.upload, size: 18),
                  label: Text(
                    _isUploading ? 'Uploading...' : 'Upload Document',
                    style: GoogleFonts.inter(fontWeight: FontWeight.w600),
                  ),
                ),
              ),
            ],
          ),
      ],
    );
  }

  Widget _buildVerificationItem({
    required IconData icon,
    required String title,
    required bool status,
    required VoidCallback? onTap,
    required ColorScheme cs,
  }) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      decoration: BoxDecoration(
        color: cs.surface,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: status
              ? Colors.green.withValues(alpha: 0.3)
              : cs.outline.withValues(alpha: 0.2),
        ),
      ),
      child: Row(
        children: [
          Container(
            width: 40,
            height: 40,
            decoration: BoxDecoration(
              color: status
                  ? Colors.green.withValues(alpha: 0.1)
                  : cs.surfaceContainerHighest,
              borderRadius: BorderRadius.circular(10),
            ),
            child: Icon(
              icon,
              color: status ? Colors.green : cs.secondary,
              size: 20,
            ),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: GoogleFonts.inter(
                    fontSize: 14,
                    fontWeight: FontWeight.w600,
                    color: cs.onSurface,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  status ? 'Verified' : 'Not verified',
                  style: GoogleFonts.inter(
                    fontSize: 12,
                    color: status ? Colors.green : cs.secondary,
                    fontWeight: status ? FontWeight.w600 : FontWeight.normal,
                  ),
                ),
              ],
            ),
          ),
          if (status)
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
              decoration: BoxDecoration(
                color: Colors.green.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(20),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Icon(LucideIcons.check, size: 12, color: Colors.green),
                  const SizedBox(width: 4),
                  Text(
                    'Done',
                    style: GoogleFonts.inter(
                      fontSize: 11,
                      fontWeight: FontWeight.w600,
                      color: Colors.green,
                    ),
                  ),
                ],
              ),
            )
          else
            TextButton(
              onPressed: onTap,
              child: Text(
                'Verify',
                style: GoogleFonts.inter(
                  fontWeight: FontWeight.w700,
                ),
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildDocumentTypeCard(Map<String, dynamic> doc, ColorScheme cs) {
    final isSelected = _selectedDocumentType == doc['id'];

    return GestureDetector(
      onTap: () => setState(() => _selectedDocumentType = doc['id']),
      child: Container(
        margin: const EdgeInsets.only(bottom: 10),
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: isSelected ? cs.primaryContainer : cs.surface,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: isSelected
                ? cs.primary
                : cs.outline.withValues(alpha: 0.2),
            width: isSelected ? 2 : 1,
          ),
        ),
        child: Row(
          children: [
            Container(
              width: 44,
              height: 44,
              decoration: BoxDecoration(
                color: isSelected
                    ? cs.primary.withValues(alpha: 0.2)
                    : cs.surfaceContainerHighest,
                borderRadius: BorderRadius.circular(10),
              ),
              child: Icon(
                doc['icon'] as IconData,
                color: isSelected ? cs.primary : cs.secondary,
                size: 22,
              ),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    doc['name'] as String,
                    style: GoogleFonts.inter(
                      fontSize: 15,
                      fontWeight: FontWeight.w700,
                      color: cs.onSurface,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    doc['description'] as String,
                    style: GoogleFonts.inter(
                      fontSize: 12,
                      color: cs.secondary,
                    ),
                  ),
                ],
              ),
            ),
            if (isSelected)
              Icon(LucideIcons.checkCircle, color: cs.primary, size: 24)
            else
              Icon(LucideIcons.circle, color: cs.outline, size: 24),
          ],
        ),
      ),
    );
  }

  Widget _buildKycInfoSection(ColorScheme cs) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: cs.surfaceContainerHighest.withValues(alpha: 0.5),
        borderRadius: BorderRadius.circular(16),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(LucideIcons.info, size: 18, color: cs.primary),
              const SizedBox(width: 8),
              Text(
                'Why do we need KYC?',
                style: GoogleFonts.inter(
                  fontSize: 14,
                  fontWeight: FontWeight.w700,
                  color: cs.onSurface,
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          _buildInfoItem('Build trust between customers and providers', cs),
          _buildInfoItem('Prevent fraud and ensure platform safety', cs),
          _buildInfoItem('Comply with legal requirements', cs),
          _buildInfoItem('Required for placing orders', cs),
          const SizedBox(height: 12),
          Text(
            'Your documents are encrypted and stored securely. We never share your information with third parties.',
            style: GoogleFonts.inter(
              fontSize: 12,
              color: cs.secondary,
              height: 1.5,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildInfoItem(String text, ColorScheme cs) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(
            LucideIcons.check,
            size: 16,
            color: cs.primary,
          ),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              text,
              style: GoogleFonts.inter(
                fontSize: 13,
                color: cs.onSurfaceVariant,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

/// Phone Verification Dialog
class PhoneVerificationDialog extends StatefulWidget {
  const PhoneVerificationDialog({super.key});

  @override
  State<PhoneVerificationDialog> createState() => _PhoneVerificationDialogState();
}

class _PhoneVerificationDialogState extends State<PhoneVerificationDialog> {
  final _codeController = TextEditingController();
  bool _isLoading = false;
  bool _codeSent = false;

  Future<void> _sendCode() async {
    setState(() => _isLoading = true);
    // Simulate sending code
    await Future.delayed(const Duration(seconds: 1));
    setState(() {
      _isLoading = false;
      _codeSent = true;
    });
  }

  Future<void> _verifyCode() async {
    setState(() => _isLoading = true);
    try {
      final api = context.read<NeighborlyApiService>();
      await api.verifyPhoneCode(_codeController.text);

      if (mounted) {
        Navigator.pop(context);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
              'Phone verified successfully!',
              style: GoogleFonts.inter(),
            ),
            backgroundColor: Colors.green,
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
              'Invalid code. Please try again.',
              style: GoogleFonts.inter(),
            ),
            backgroundColor: Colors.red,
          ),
        );
      }
    } finally {
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: Text(
        'Phone Verification',
        style: GoogleFonts.inter(fontWeight: FontWeight.w700),
      ),
      content: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (!_codeSent)
            Text(
              'We\'ll send a verification code to your phone number.',
              style: GoogleFonts.inter(),
            )
          else ...[
            Text(
              'Enter the 6-digit code sent to your phone:',
              style: GoogleFonts.inter(),
            ),
            const SizedBox(height: 16),
            TextField(
              controller: _codeController,
              keyboardType: TextInputType.number,
              maxLength: 6,
              textAlign: TextAlign.center,
              style: GoogleFonts.inter(
                fontSize: 24,
                fontWeight: FontWeight.w700,
                letterSpacing: 8,
              ),
              decoration: InputDecoration(
                hintText: '000000',
                counterText: '',
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
              ),
            ),
          ],
        ],
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.pop(context),
          child: Text('Cancel', style: GoogleFonts.inter()),
        ),
        FilledButton(
          onPressed: _isLoading
              ? null
              : _codeSent
                  ? _verifyCode
                  : _sendCode,
          child: _isLoading
              ? const SizedBox(
                  width: 18,
                  height: 18,
                  child: CircularProgressIndicator(strokeWidth: 2),
                )
              : Text(
                  _codeSent ? 'Verify' : 'Send Code',
                  style: GoogleFonts.inter(fontWeight: FontWeight.w700),
                ),
        ),
      ],
    );
  }
}