import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:google_fonts/google_fonts.dart';
import '../main.dart';
import '../services/auth_provider.dart';
import '../services/api_service.dart';

class AuthScreen extends StatefulWidget {
  const AuthScreen({super.key});

  @override
  State<AuthScreen> createState() => _AuthScreenState();
}

class _AuthScreenState extends State<AuthScreen> {
  bool _isLogin = true;
  String _role = 'customer';
  final _emailCtrl = TextEditingController();
  final _passwordCtrl = TextEditingController();
  final _nameCtrl = TextEditingController();
  bool _loading = false;
  String? _error;

  bool get _isDark => Theme.of(context).brightness == Brightness.dark;
  Color get _textColor => Theme.of(context).colorScheme.onSurface;
  Color get _subtleText => const Color(0xFF737373);
  Color get _cardColor => Theme.of(context).cardColor;
  Color get _borderColor => _isDark ? const Color(0xFF262626) : const Color(0xFFE5E5E5);

  Future<void> _submit() async {
    if (_emailCtrl.text.isEmpty || _passwordCtrl.text.isEmpty) {
      setState(() => _error = 'Please fill in all fields');
      return;
    }
    setState(() { _loading = true; _error = null; });

    try {
      final auth = context.read<AuthProvider>();
      if (_isLogin) {
        await auth.login(_emailCtrl.text.trim(), _passwordCtrl.text);
      } else {
        if (_nameCtrl.text.isEmpty) {
          setState(() { _error = 'Please enter your name'; _loading = false; });
          return;
        }
        await auth.register(_emailCtrl.text.trim(), _passwordCtrl.text, _nameCtrl.text.trim(), _role);
      }
    } on ApiException catch (e) {
      setState(() => _error = e.message);
    } catch (e) {
      setState(() => _error = e.toString());
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final themeNotifier = context.watch<ThemeNotifier>();
    final cs = Theme.of(context).colorScheme;

    return Scaffold(
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: 24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const SizedBox(height: 40),

              // ── Brand ──────────────────────────────────
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Row(
                    children: [
                      Container(
                        width: 40, height: 40,
                        decoration: BoxDecoration(
                          color: cs.primary,
                          borderRadius: BorderRadius.circular(10),
                        ),
                        child: Center(
                          child: Transform.rotate(
                            angle: 0.785,
                            child: Container(
                              width: 18, height: 18,
                              decoration: BoxDecoration(
                                color: cs.onPrimary,
                                borderRadius: BorderRadius.circular(4),
                              ),
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(width: 10),
                      Text(
                        'NEIGHBORLY',
                        style: GoogleFonts.inter(
                          fontWeight: FontWeight.w900,
                          fontSize: 20,
                          fontStyle: FontStyle.italic,
                          letterSpacing: 0.5,
                          color: _textColor,
                        ),
                      ),
                    ],
                  ),
                  // Theme toggle on auth screen
                  IconButton(
                    icon: Icon(
                      themeNotifier.isDark ? Icons.wb_sunny_rounded : Icons.nightlight_round,
                      color: _subtleText,
                    ),
                    onPressed: () => themeNotifier.toggleTheme(),
                  ),
                ],
              ),
              const SizedBox(height: 52),

              // ── Heading ────────────────────────────────
              Text(
                _isLogin ? 'Welcome back' : 'Create account',
                style: GoogleFonts.inter(fontSize: 30, fontWeight: FontWeight.w900, color: _textColor),
              ),
              const SizedBox(height: 8),
              Text(
                _isLogin ? 'Sign in to your account' : 'Join your neighborhood community',
                style: GoogleFonts.inter(color: _subtleText, fontSize: 14),
              ),
              const SizedBox(height: 32),

              // ── Role Selector (Register only) ──────────
              if (!_isLogin) ...[
                Container(
                  padding: const EdgeInsets.all(4),
                  decoration: BoxDecoration(
                    color: _isDark ? const Color(0xFF1C1C1C) : const Color(0xFFF5F5F5),
                    borderRadius: BorderRadius.circular(14),
                  ),
                  child: Row(children: [
                    _roleBtn('Customer', 'customer'),
                    _roleBtn('Provider', 'provider'),
                  ]),
                ),
                const SizedBox(height: 20),
                _textField(_nameCtrl, 'Full Name', Icons.person_outline_rounded),
                const SizedBox(height: 14),
              ],

              // ── Email & Password ───────────────────────
              _textField(_emailCtrl, 'Email Address', Icons.email_outlined, type: TextInputType.emailAddress),
              const SizedBox(height: 14),
              _textField(_passwordCtrl, 'Password', Icons.lock_outline_rounded, obscure: true),
              const SizedBox(height: 20),

              // ── Error Message ──────────────────────────
              if (_error != null)
                Container(
                  margin: const EdgeInsets.only(bottom: 16),
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(
                    color: const Color(0xFFEF4444).withOpacity(0.08),
                    borderRadius: BorderRadius.circular(14),
                    border: Border.all(color: const Color(0xFFEF4444).withOpacity(0.2)),
                  ),
                  child: Text(_error!, style: GoogleFonts.inter(color: const Color(0xFFEF4444), fontSize: 13)),
                ),

              // ── Submit Button ──────────────────────────
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: _loading ? null : _submit,
                  child: _loading
                      ? SizedBox(
                          width: 20, height: 20,
                          child: CircularProgressIndicator(strokeWidth: 2, color: cs.onPrimary),
                        )
                      : Text(
                          _isLogin ? 'Sign In' : 'Create Account',
                          style: GoogleFonts.inter(fontWeight: FontWeight.w700),
                        ),
                ),
              ),

              const SizedBox(height: 28),
              // ── Toggle Login / Register ────────────────
              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Text(
                    _isLogin ? "Don't have an account? " : 'Already have an account? ',
                    style: GoogleFonts.inter(color: _subtleText, fontSize: 14),
                  ),
                  GestureDetector(
                    onTap: () => setState(() { _isLogin = !_isLogin; _error = null; }),
                    child: Text(
                      _isLogin ? 'Sign Up' : 'Sign In',
                      style: GoogleFonts.inter(
                        fontWeight: FontWeight.w800,
                        fontSize: 14,
                        color: _textColor,
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 32),
            ],
          ),
        ),
      ),
    );
  }

  Widget _roleBtn(String label, String value) {
    final selected = _role == value;
    final cs = Theme.of(context).colorScheme;
    return Expanded(
      child: GestureDetector(
        onTap: () => setState(() => _role = value),
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 200),
          padding: const EdgeInsets.symmetric(vertical: 10),
          decoration: BoxDecoration(
            color: selected ? cs.primary : Colors.transparent,
            borderRadius: BorderRadius.circular(10),
          ),
          child: Text(
            label,
            textAlign: TextAlign.center,
            style: GoogleFonts.inter(
              fontWeight: FontWeight.w700,
              fontSize: 13,
              color: selected ? cs.onPrimary : _subtleText,
            ),
          ),
        ),
      ),
    );
  }

  Widget _textField(
    TextEditingController ctrl,
    String label,
    IconData icon, {
    TextInputType type = TextInputType.text,
    bool obscure = false,
  }) {
    return TextField(
      controller: ctrl,
      keyboardType: type,
      obscureText: obscure,
      style: GoogleFonts.inter(color: _textColor, fontSize: 15),
      decoration: InputDecoration(
        labelText: label,
        prefixIcon: Icon(icon, size: 20, color: _subtleText),
      ),
    );
  }
}
