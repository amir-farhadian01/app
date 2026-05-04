import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:provider/provider.dart';

import '../services/neighborly_api_service.dart';

class AuthScreen extends StatefulWidget {
  const AuthScreen({
    super.key,
    this.resumeAfterAuth = false,
    this.returnToPath,
    this.returnToPostId,
  });

  /// When true, after a successful session the navigator pops with `true`
  /// so the caller (e.g. Explorer) can retry the gated action.
  final bool resumeAfterAuth;
  final String? returnToPath;
  final String? returnToPostId;

  @override
  State<AuthScreen> createState() => _AuthScreenState();
}

class _AuthScreenState extends State<AuthScreen> {
  bool isLogin = true;
  String role = 'customer';
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  final _nameController = TextEditingController();
  bool _busy = false;
  String? _error;
  bool _obscurePassword = true;

  @override
  void dispose() {
    _emailController.dispose();
    _passwordController.dispose();
    _nameController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    setState(() {
      _error = null;
      _busy = true;
    });
    final api = context.read<NeighborlyApiService>();
    try {
      if (isLogin) {
        await api.login(_emailController.text.trim(), _passwordController.text);
      } else {
        await api.register(
          email: _emailController.text.trim(),
          password: _passwordController.text,
          displayName: _nameController.text.trim(),
          role: role,
        );
      }
      if (!mounted) return;
      if (widget.resumeAfterAuth && Navigator.of(context).canPop()) {
        Navigator.of(context).pop(true);
      } else if ((widget.returnToPath ?? '').isNotEmpty) {
        final qp = <String, String>{};
        if ((widget.returnToPostId ?? '').isNotEmpty) {
          qp['post'] = widget.returnToPostId!;
        }
        final base = widget.returnToPath!.trim();
        final hasQuery = base.contains('?');
        final target = qp.isEmpty
            ? base
            : hasQuery
                ? '$base&${Uri(queryParameters: qp).query}'
                : '$base?${Uri(queryParameters: qp).query}';
        Navigator.of(context).pushNamedAndRemoveUntil(target, (r) => false);
      } else {
        Navigator.of(context).pushNamedAndRemoveUntil('/dashboard', (r) => false);
      }
    } catch (e) {
      setState(() => _error = _prettyAuthError(e));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  String _prettyAuthError(Object error) {
    if (error is NeighborlyApiException) {
      if (error.code == 'EMAIL_NOT_FOUND') return 'This email does not exist.';
      if (error.code == 'INVALID_PASSWORD') return 'Password is incorrect.';
      return error.message;
    }
    return error.toString();
  }

  Future<void> _showResetPasswordDialog() async {
    final emailCtrl = TextEditingController(text: _emailController.text.trim());
    final passCtrl = TextEditingController();
    final confirmCtrl = TextEditingController();
    bool obscure = true;
    String? localError;
    bool localBusy = false;

    await showDialog<void>(
      context: context,
      builder: (ctx) {
        final cs = Theme.of(ctx).colorScheme;
        return StatefulBuilder(
          builder: (ctx, setLocalState) => AlertDialog(
            title: Text('Reset password', style: GoogleFonts.inter(fontWeight: FontWeight.w700)),
            content: SizedBox(
              width: 420,
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  TextField(
                    controller: emailCtrl,
                    keyboardType: TextInputType.emailAddress,
                    decoration: InputDecoration(
                      labelText: 'Email Address',
                      prefixIcon: const Icon(LucideIcons.mail),
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(14)),
                    ),
                  ),
                  const SizedBox(height: 12),
                  TextField(
                    controller: passCtrl,
                    obscureText: obscure,
                    decoration: InputDecoration(
                      labelText: 'New Password',
                      prefixIcon: const Icon(LucideIcons.lock),
                      suffixIcon: IconButton(
                        onPressed: () => setLocalState(() => obscure = !obscure),
                        icon: Icon(obscure ? LucideIcons.eye : LucideIcons.eyeOff),
                      ),
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(14)),
                    ),
                  ),
                  const SizedBox(height: 12),
                  TextField(
                    controller: confirmCtrl,
                    obscureText: obscure,
                    decoration: InputDecoration(
                      labelText: 'Confirm New Password',
                      prefixIcon: const Icon(LucideIcons.lock),
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(14)),
                    ),
                  ),
                  if (localError != null) ...[
                    const SizedBox(height: 12),
                    Align(
                      alignment: Alignment.centerLeft,
                      child: Text(localError!, style: GoogleFonts.inter(color: Colors.red, fontSize: 13)),
                    ),
                  ],
                ],
              ),
            ),
            actions: [
              TextButton(
                onPressed: localBusy ? null : () => Navigator.of(ctx).pop(),
                child: const Text('Cancel'),
              ),
              FilledButton(
                onPressed: localBusy
                    ? null
                    : () async {
                        setLocalState(() => localError = null);
                        final email = emailCtrl.text.trim();
                        final password = passCtrl.text;
                        final confirm = confirmCtrl.text;
                        if (email.isEmpty) {
                          setLocalState(() => localError = 'Please enter your email address.');
                          return;
                        }
                        if (password.length < 8) {
                          setLocalState(() => localError = 'New password must be at least 8 characters.');
                          return;
                        }
                        if (password != confirm) {
                          setLocalState(() => localError = 'Password confirmation does not match.');
                          return;
                        }
                        setLocalState(() => localBusy = true);
                        try {
                          final api = context.read<NeighborlyApiService>();
                          await api.forgotPassword(email);
                          await api.resetPassword(email: email, newPassword: password);
                          if (!mounted || !context.mounted) return;
                          _emailController.text = email;
                          ScaffoldMessenger.of(context).showSnackBar(
                            const SnackBar(content: Text('Password reset successfully. Please sign in.')),
                          );
                          Navigator.of(ctx).pop();
                        } catch (e) {
                          setLocalState(() => localError = _prettyAuthError(e));
                        } finally {
                          setLocalState(() => localBusy = false);
                        }
                      },
                style: FilledButton.styleFrom(backgroundColor: cs.primary),
                child: localBusy
                    ? const SizedBox(
                        height: 16,
                        width: 16,
                        child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                      )
                    : const Text('Reset'),
              ),
            ],
          ),
        );
      },
    );
    emailCtrl.dispose();
    passCtrl.dispose();
    confirmCtrl.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    return Scaffold(
      backgroundColor: Theme.of(context).scaffoldBackgroundColor,
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(24),
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 440),
              child: Card(
                elevation: 0,
                color: cs.surface,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(40),
                  side: BorderSide(color: cs.outline),
                ),
                child: Padding(
                  padding: const EdgeInsets.all(28),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      Align(
                        alignment: Alignment.centerLeft,
                        child: IconButton(
                          icon: const Icon(LucideIcons.arrowLeft),
                          onPressed: () {
                            if (Navigator.of(context).canPop()) {
                              Navigator.of(context).pop();
                            } else {
                              Navigator.of(context).pushReplacementNamed('/');
                            }
                          },
                        ),
                      ),
                      Text(
                        isLogin ? 'WELCOME BACK' : 'CREATE ACCOUNT',
                        style: GoogleFonts.inter(
                          fontSize: 28,
                          fontWeight: FontWeight.w900,
                          fontStyle: FontStyle.italic,
                          letterSpacing: -0.5,
                          color: cs.onSurface,
                        ),
                      ),
                      const SizedBox(height: 8),
                      Text(
                        isLogin ? 'Enter your details to access your account' : 'Join our community of neighbors today',
                        style: GoogleFonts.inter(color: cs.secondary, fontSize: 14),
                      ),
                      if (_error != null) ...[
                        const SizedBox(height: 16),
                        Text(_error!, style: GoogleFonts.inter(color: Colors.red, fontSize: 13)),
                      ],
                      const SizedBox(height: 28),
                      if (!isLogin) ...[
                        Row(
                          children: [
                            Expanded(
                              child: ChoiceChip(
                                label: const Text('Customer'),
                                selected: role == 'customer',
                                onSelected: (s) => setState(() => role = 'customer'),
                              ),
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: ChoiceChip(
                                label: const Text('Provider'),
                                selected: role == 'provider',
                                onSelected: (s) => setState(() => role = 'provider'),
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 24),
                        TextField(
                          controller: _nameController,
                          decoration: InputDecoration(
                            labelText: 'Full Name',
                            prefixIcon: const Icon(LucideIcons.user),
                            border: OutlineInputBorder(borderRadius: BorderRadius.circular(16)),
                          ),
                        ),
                        const SizedBox(height: 16),
                      ],
                      TextField(
                        controller: _emailController,
                        keyboardType: TextInputType.emailAddress,
                        decoration: InputDecoration(
                          labelText: 'Email Address',
                          prefixIcon: const Icon(LucideIcons.mail),
                          border: OutlineInputBorder(borderRadius: BorderRadius.circular(16)),
                        ),
                      ),
                      const SizedBox(height: 16),
                      TextField(
                        controller: _passwordController,
                        obscureText: _obscurePassword,
                        decoration: InputDecoration(
                          labelText: 'Password',
                          prefixIcon: const Icon(LucideIcons.lock),
                          suffixIcon: IconButton(
                            onPressed: () => setState(() => _obscurePassword = !_obscurePassword),
                            icon: Icon(_obscurePassword ? LucideIcons.eye : LucideIcons.eyeOff),
                          ),
                          border: OutlineInputBorder(borderRadius: BorderRadius.circular(16)),
                        ),
                      ),
                      if (isLogin)
                        Align(
                          alignment: Alignment.centerRight,
                          child: TextButton(
                            onPressed: _busy ? null : _showResetPasswordDialog,
                            child: const Text('Forgot password?'),
                          ),
                        ),
                      const SizedBox(height: 28),
                      FilledButton(
                        onPressed: _busy ? null : _submit,
                        child: _busy
                            ? const SizedBox(
                                height: 22,
                                width: 22,
                                child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                              )
                            : Text(isLogin ? 'Sign In' : 'Create Account', style: GoogleFonts.inter(fontWeight: FontWeight.w800)),
                      ),
                      const SizedBox(height: 16),
                      Center(
                        child: TextButton(
                          onPressed: _busy ? null : () => setState(() => isLogin = !isLogin),
                          child: Text(
                            isLogin ? "Don't have an account? Sign Up" : "Already have an account? Sign In",
                            style: GoogleFonts.inter(fontWeight: FontWeight.w700, color: cs.secondary),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
