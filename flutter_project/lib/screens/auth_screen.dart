import 'dart:async';

import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import '../core/app_theme.dart';
import '../core/services/api_client.dart';
import '../core/services/auth_service.dart';

/// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/// Auth / Onboarding Screen — 3 steps (Phone → OTP → Username)
/// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
class AuthScreen extends StatefulWidget {
  const AuthScreen({super.key});

  @override
  State<AuthScreen> createState() => _AuthScreenState();
}

class _AuthScreenState extends State<AuthScreen> {
  final PageController _pageController = PageController();
  int _currentStep = 0;
  bool _isLoading = false;

  // Step 1 controllers
  final TextEditingController _phoneController = TextEditingController();

  // Step 2 controllers
  final List<TextEditingController> _otpControllers = List.generate(3, (_) => TextEditingController());
  final List<FocusNode> _otpFocusNodes = List.generate(3, (_) => FocusNode());
  int _resendSeconds = 165; // 2:45
  Timer? _resendTimer;

  // Step 3 controllers
  final TextEditingController _usernameController = TextEditingController(text: 'amir_farhadian');

  final AuthService _authService = AuthService();

  @override
  void initState() {
    super.initState();
    _startResendTimer();
  }

  @override
  void dispose() {
    _pageController.dispose();
    _phoneController.dispose();
    for (final c in _otpControllers) { c.dispose(); }
    for (final f in _otpFocusNodes) { f.dispose(); }
    _usernameController.dispose();
    _resendTimer?.cancel();
    super.dispose();
  }

  void _startResendTimer() {
    _resendTimer?.cancel();
    setState(() => _resendSeconds = 165);
    _resendTimer = Timer.periodic(const Duration(seconds: 1), (timer) {
      if (_resendSeconds <= 0) {
        timer.cancel();
        return;
      }
      setState(() => _resendSeconds--);
    });
  }

  void _goToStep(int step) {
    _pageController.animateToPage(
      step,
      duration: const Duration(milliseconds: 350),
      curve: Curves.easeInOut,
    );
    setState(() => _currentStep = step);
  }

  /// Handle "Send Verification Code" button tap (Step 1).
  Future<void> _handleSendOtp() async {
    final phone = _phoneController.text.trim();
    if (phone.isEmpty) {
      _showSnackBar('Please enter your phone number');
      return;
    }

    setState(() => _isLoading = true);
    try {
      await _authService.sendOtp(phone);
      _goToStep(1);
    } on ApiException catch (e) {
      _showSnackBar(e.message);
    } catch (e) {
      _showSnackBar('An unexpected error occurred. Please try again.');
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  /// Handle "Verify & Continue" button tap (Step 2).
  Future<void> _handleVerifyOtp() async {
    final otp = _otpControllers.map((c) => c.text).join();
    if (otp.length < 3) {
      _showSnackBar('Please enter the full verification code');
      return;
    }

    final phone = _phoneController.text.trim();

    setState(() => _isLoading = true);
    try {
      await _authService.verifyOtp(phone, otp);
      _goToStep(2);
    } on ApiException catch (e) {
      _showSnackBar(e.message);
    } catch (e) {
      _showSnackBar('Verification failed. Please try again.');
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  /// Handle "Create My Account" button tap (Step 3).
  Future<void> _handleSetUsername() async {
    final username = _usernameController.text.trim();
    if (username.isEmpty) {
      _showSnackBar('Please enter a username');
      return;
    }

    setState(() => _isLoading = true);
    try {
      await _authService.setUsername(username);
      if (mounted) {
        Navigator.of(context).pushReplacementNamed('/home');
      }
    } on ApiException catch (e) {
      _showSnackBar(e.message);
    } catch (e) {
      _showSnackBar('Failed to set username. Please try again.');
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  /// Show a SnackBar with the given message.
  void _showSnackBar(String message) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(message),
        behavior: SnackBarBehavior.floating,
      ),
    );
  }

  String get _resendFormatted {
    final minutes = (_resendSeconds ~/ 60).toString().padLeft(2, '0');
    final seconds = (_resendSeconds % 60).toString().padLeft(2, '0');
    return '$minutes:$seconds';
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: NeighborlyColors.bgPrimary,
      body: SafeArea(
        child: Column(
          children: [
            // Step indicator
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: List.generate(3, (i) {
                  final isActive = i == _currentStep;
                  final isDone = i < _currentStep;
                  return Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Container(
                        width: 32,
                        height: 32,
                        decoration: BoxDecoration(
                          color: isDone
                              ? NeighborlyColors.success
                              : isActive
                                  ? NeighborlyColors.accent
                                  : NeighborlyColors.bgCard,
                          shape: BoxShape.circle,
                          border: Border.all(
                            color: isActive || isDone
                                ? Colors.transparent
                                : NeighborlyColors.textFaint,
                          ),
                        ),
                        child: Center(
                          child: isDone
                              ? const Icon(Icons.check, size: 18, color: Colors.white)
                              : Text(
                                  '${i + 1}',
                                  style: GoogleFonts.inter(
                                    fontSize: 14,
                                    fontWeight: FontWeight.w600,
                                    color: isActive ? Colors.white : NeighborlyColors.textSecondary,
                                  ),
                                ),
                        ),
                      ),
                      if (i < 2)
                        Container(
                          width: 40,
                          height: 2,
                          color: i < _currentStep
                              ? NeighborlyColors.accent
                              : NeighborlyColors.textFaint,
                        ),
                    ],
                  );
                }),
              ),
            ),
            // Pages
            Expanded(
              child: PageView(
                controller: _pageController,
                physics: const NeverScrollableScrollPhysics(),
                children: [
                  _buildPhoneStep(),
                  _buildOtpStep(),
                  _buildUsernameStep(),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  // ── Step 1: Phone Entry ──────────────────────────────────────────

  Widget _buildPhoneStep() {
    return SingleChildScrollView(
      padding: const EdgeInsets.symmetric(horizontal: 24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const SizedBox(height: 48),
          // Logo — stylized "N" in purple gradient circle
          Center(
            child: Container(
              width: 80,
              height: 80,
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                  colors: [NeighborlyColors.accent, NeighborlyColors.accent],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
                shape: BoxShape.circle,
                boxShadow: [
                  BoxShadow(
                    color: NeighborlyColors.textFaint.withValues(alpha: 0.15),
                    blurRadius: 12,
                    offset: const Offset(0, 4),
                  ),
                ],
              ),
              child: const Center(
                child: Text(
                  'N',
                  style: TextStyle(
                    fontSize: 36,
                    fontWeight: FontWeight.w800,
                    color: Colors.white,
                  ),
                ),
              ),
            ),
          ),
          const SizedBox(height: 16),
          // "Neighborly" title — gradient text
          ShaderMask(
            shaderCallback: (bounds) => const LinearGradient(
              colors: [NeighborlyColors.accent, NeighborlyColors.accentTeal],
              begin: Alignment.centerLeft,
              end: Alignment.centerRight,
            ).createShader(bounds),
            child: Text(
              'Neighborly',
              textAlign: TextAlign.center,
              style: GoogleFonts.plusJakartaSans(
                fontSize: 28,
                fontWeight: FontWeight.w700,
                color: Colors.white, // used by ShaderMask
              ),
            ),
          ),
          const SizedBox(height: 8),
          // Subtitle
          Text(
            'Your neighborhood, connected.',
            textAlign: TextAlign.center,
            style: GoogleFonts.inter(
              fontSize: 14,
              fontWeight: FontWeight.w400,
              color: NeighborlyColors.textSecondary,
            ),
          ),
          const SizedBox(height: 48),
          // Country code + phone
          Container(
            decoration: BoxDecoration(
              color: NeighborlyColors.bgCard,
              borderRadius: BorderRadius.circular(NeighborlyRadius.md),
              border: Border.all(color: NeighborlyColors.textFaint),
            ),
            child: Row(
              children: [
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
                  decoration: const BoxDecoration(
                    border: Border(
                      right: BorderSide(color: NeighborlyColors.textFaint),
                    ),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const Text('🇨🇦', style: TextStyle(fontSize: 20)),
                      const SizedBox(width: 8),
                      Text(
                        '+1',
                        style: GoogleFonts.inter(
                          fontSize: 15,
                          fontWeight: FontWeight.w600,
                          color: NeighborlyColors.textPrimary,
                        ),
                      ),
                      const SizedBox(width: 4),
                      const Icon(Icons.keyboard_arrow_down, color: NeighborlyColors.textSecondary, size: 20),
                    ],
                  ),
                ),
                Expanded(
                  child: TextField(
                    controller: _phoneController,
                    keyboardType: TextInputType.phone,
                    decoration: InputDecoration(
                      hintText: '647 ··· ····',
                      hintStyle: GoogleFonts.inter(
                        fontSize: 15,
                        fontWeight: FontWeight.w400,
                        color: NeighborlyColors.textFaint,
                      ),
                      border: InputBorder.none,
                      contentPadding: const EdgeInsets.symmetric(horizontal: 16),
                    ),
                    style: GoogleFonts.inter(
                      fontSize: 15,
                      fontWeight: FontWeight.w600,
                      color: NeighborlyColors.textPrimary,
                    ),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 24),
          // Primary CTA — gradient button
          SizedBox(
            height: 52,
            child: DecoratedBox(
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                  colors: [NeighborlyColors.accent, NeighborlyColors.accent],
                  begin: Alignment.centerLeft,
                  end: Alignment.centerRight,
                ),
                borderRadius: BorderRadius.circular(NeighborlyRadius.md),
              ),
              child: FilledButton(
                onPressed: _isLoading ? null : _handleSendOtp,
                style: FilledButton.styleFrom(
                  backgroundColor: Colors.transparent,
                  shadowColor: Colors.transparent,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(NeighborlyRadius.md),
                  ),
                ),
                child: Text(
                  'Send Verification Code',
                  style: GoogleFonts.inter(
                    fontSize: 16,
                    fontWeight: FontWeight.w600,
                    color: Colors.white,
                  ),
                ),
              ),
            ),
          ),
          const SizedBox(height: 16),
          // Ghost button — Accent color
          TextButton(
            onPressed: () {},
            child: Text(
              'Continue with Email',
              style: GoogleFonts.inter(
                fontSize: 14,
                fontWeight: FontWeight.w600,
                color: NeighborlyColors.accentTeal,
              ),
            ),
          ),
        ],
      ),
    );
  }

  // ── Step 2: OTP Verification ─────────────────────────────────────

  Widget _buildOtpStep() {
    return SingleChildScrollView(
      padding: const EdgeInsets.symmetric(horizontal: 24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const SizedBox(height: 48),
          Text(
            'Code sent to +1 647 ··· ··78',
            textAlign: TextAlign.center,
            style: GoogleFonts.inter(
              fontSize: 20,
              fontWeight: FontWeight.w600,
              color: NeighborlyColors.textPrimary,
            ),
          ),
          const SizedBox(height: 48),
          // OTP fields
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: List.generate(3, (i) {
              return Container(
                width: 72,
                height: 80,
                margin: const EdgeInsets.symmetric(horizontal: 8),
                decoration: BoxDecoration(
                  color: NeighborlyColors.bgCard,
                  borderRadius: BorderRadius.circular(NeighborlyRadius.md),
                  border: Border.all(
                    color: _otpControllers[i].text.isNotEmpty
                        ? NeighborlyColors.accent
                        : NeighborlyColors.textFaint,
                    width: _otpControllers[i].text.isNotEmpty ? 2 : 1,
                  ),
                ),
                child: Center(
                  child: TextField(
                    controller: _otpControllers[i],
                    focusNode: _otpFocusNodes[i],
                    textAlign: TextAlign.center,
                    keyboardType: TextInputType.number,
                    maxLength: 1,
                    style: GoogleFonts.inter(
                      fontSize: 28,
                      fontWeight: FontWeight.bold,
                      color: NeighborlyColors.textPrimary,
                    ),
                    decoration: const InputDecoration(
                      counterText: '',
                      border: InputBorder.none,
                    ),
                    onChanged: (v) {
                      setState(() {});
                      if (v.isNotEmpty && i < 2) {
                        _otpFocusNodes[i + 1].requestFocus();
                      }
                    },
                  ),
                ),
              );
            }),
          ),
          const SizedBox(height: 32),
          // Verify button
          SizedBox(
            height: 52,
            child: FilledButton(
              onPressed: _isLoading ? null : _handleVerifyOtp,
              style: FilledButton.styleFrom(
                backgroundColor: NeighborlyColors.accent,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(NeighborlyRadius.md),
                ),
              ),
              child: Text(
                'Verify & Continue',
                style: GoogleFonts.inter(
                  fontSize: 16,
                  fontWeight: FontWeight.w600,
                  color: Colors.white,
                ),
              ),
            ),
          ),
          const SizedBox(height: 16),
          // Resend timer
          Center(
            child: GestureDetector(
              onTap: _resendSeconds <= 0 ? _startResendTimer : null,
              child: Text(
                _resendSeconds > 0 ? 'Resend code in $_resendFormatted' : 'Resend code',
                style: GoogleFonts.inter(
                  fontSize: 14,
                  fontWeight: FontWeight.w500,
                  color: _resendSeconds > 0
                      ? NeighborlyColors.textFaint
                      : NeighborlyColors.accentTeal,
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  // ── Step 3: Username ─────────────────────────────────────────────

  Widget _buildUsernameStep() {
    return SingleChildScrollView(
      padding: const EdgeInsets.symmetric(horizontal: 24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const SizedBox(height: 48),
          Text(
            'CHOOSE YOUR USERNAME',
            textAlign: TextAlign.center,
            style: GoogleFonts.inter(
              fontSize: 20,
              fontWeight: FontWeight.w600,
              color: NeighborlyColors.textPrimary,
              letterSpacing: 1.2,
            ),
          ),
          const SizedBox(height: 48),
          // Username field
          Container(
            decoration: BoxDecoration(
              color: NeighborlyColors.bgCard,
              borderRadius: BorderRadius.circular(NeighborlyRadius.md),
              border: Border.all(
                color: NeighborlyColors.success,
                width: 2,
              ),
            ),
            child: TextField(
              controller: _usernameController,
              style: GoogleFonts.inter(
                fontSize: 18,
                fontWeight: FontWeight.w600,
                color: NeighborlyColors.textPrimary,
              ),
              decoration: const InputDecoration(
                prefixIcon: Padding(
                  padding: EdgeInsets.only(left: 16),
                  child: Icon(Icons.alternate_email, color: NeighborlyColors.textSecondary),
                ),
                border: InputBorder.none,
                contentPadding: EdgeInsets.symmetric(horizontal: 16, vertical: 18),
              ),
            ),
          ),
          const SizedBox(height: 12),
          // Available indicator
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(Icons.check_circle, color: NeighborlyColors.success, size: 18),
              const SizedBox(width: 8),
              Text(
                'Username is available!',
                style: GoogleFonts.inter(
                  fontSize: 14,
                  fontWeight: FontWeight.w500,
                  color: NeighborlyColors.success,
                ),
              ),
            ],
          ),
          const SizedBox(height: 32),
          // Create account button
          SizedBox(
            height: 52,
            child: FilledButton(
              onPressed: _isLoading ? null : _handleSetUsername,
              style: FilledButton.styleFrom(
                backgroundColor: NeighborlyColors.accent,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(NeighborlyRadius.md),
                ),
              ),
              child: Text(
                'Create My Account →',
                style: GoogleFonts.inter(
                  fontSize: 16,
                  fontWeight: FontWeight.w600,
                  color: Colors.white,
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
