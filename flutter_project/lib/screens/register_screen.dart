import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:go_router/go_router.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../core/theme/app_theme.dart';
import '../core/widgets/app_button.dart';
import '../features/auth/auth_provider.dart';
import '../features/auth/auth_repository.dart';

class RegisterScreen extends ConsumerStatefulWidget {
  const RegisterScreen({super.key});

  @override
  ConsumerState<RegisterScreen> createState() => _RegisterScreenState();
}

class _RegisterScreenState extends ConsumerState<RegisterScreen> {
  final _nameController = TextEditingController();
  final _emailController = TextEditingController();
  final _phoneController = TextEditingController();
  final _passwordController = TextEditingController();
  String _selectedRole = 'Customer';
  bool _isLoading = false;

  final List<String> _roles = ['Customer', 'Provider', 'Business'];

  @override
  void dispose() {
    _nameController.dispose();
    _emailController.dispose();
    _phoneController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  String _mapRoleToApi(String role) {
    switch (role) {
      case 'Customer':
        return 'CUSTOMER';
      case 'Provider':
        return 'SOLO_PROVIDER';
      case 'Business':
        return 'BUSINESS_OWNER';
      default:
        return 'CUSTOMER';
    }
  }

  Future<void> _handleRegister() async {
    final name = _nameController.text.trim();
    final email = _emailController.text.trim();
    final phone = _phoneController.text.trim();
    final password = _passwordController.text;

    // Validate fields
    if (name.isEmpty || email.isEmpty || phone.isEmpty || password.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please fill in all fields')),
      );
      return;
    }

    // Validate email format
    final emailRegex = RegExp(r'^[^@\s]+@[^@\s]+\.[^@\s]+$');
    if (!emailRegex.hasMatch(email)) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please enter a valid email address')),
      );
      return;
    }

    setState(() => _isLoading = true);

    final request = RegisterRequest(
      name: name,
      email: email,
      phone: phone,
      password: password,
      role: _mapRoleToApi(_selectedRole),
    );

    await ref.read(authStateProvider.notifier).register(request);

    if (!mounted) return;

    final state = ref.read(authStateProvider);
    if (state is AuthAuthenticated) {
      context.go('/home');
    } else if (state is AuthUnauthenticated && state.error != null) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(state.error!)),
      );
    }

    setState(() => _isLoading = false);
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      backgroundColor: Theme.of(context).scaffoldBackgroundColor,
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(AppSpacing.xxl),
          child: Column(
            children: [
              const SizedBox(height: 32),
              Text(
                'Create Account',
                style: GoogleFonts.plusJakartaSans(
                  fontSize: 24,
                  fontWeight: FontWeight.w700,
                  color: isDark ? AppColors.darkTextPrimary : AppColors.textPrimary,
                ),
              ),
              const SizedBox(height: 8),
              Text(
                'Join your neighbourhood today',
                style: GoogleFonts.plusJakartaSans(
                  fontSize: 15,
                  fontWeight: FontWeight.w400,
                  color: isDark ? AppColors.darkTextMuted : AppColors.textMuted,
                ),
              ),
              const SizedBox(height: 32),
              _buildTextField('Full name', Icons.person_outlined, isDark, controller: _nameController),
              const SizedBox(height: 16),
              _buildTextField('Email address', Icons.email_outlined, isDark, controller: _emailController),
              const SizedBox(height: 16),
              _buildTextField('Phone number', Icons.phone_outlined, isDark, controller: _phoneController),
              const SizedBox(height: 16),
              _buildTextField('Password', Icons.lock_outlined, isDark, obscure: true, controller: _passwordController),
              const SizedBox(height: 24),
              // Role selector
              Text(
                'I want to join as',
                style: GoogleFonts.plusJakartaSans(
                  fontSize: 14,
                  fontWeight: FontWeight.w600,
                  color: isDark ? AppColors.darkTextPrimary : AppColors.textPrimary,
                ),
              ),
              const SizedBox(height: 12),
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: _roles.map((role) {
                  final selected = _selectedRole == role;
                  return ChoiceChip(
                    label: Text(role),
                    selected: selected,
                    onSelected: (_) => setState(() => _selectedRole = role),
                    selectedColor: AppColors.primary,
                    backgroundColor: isDark ? AppColors.darkSurface2 : AppColors.background,
                    labelStyle: GoogleFonts.plusJakartaSans(
                      fontSize: 13,
                      fontWeight: FontWeight.w500,
                      color: selected ? Colors.white : (isDark ? AppColors.darkTextPrimary : AppColors.textPrimary),
                    ),
                    side: BorderSide(
                      color: selected ? AppColors.primary : (isDark ? AppColors.darkDivider : AppColors.divider),
                    ),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(AppRadius.chip),
                    ),
                  );
                }).toList(),
              ),
              const SizedBox(height: 32),
              AppButton(
                label: _isLoading ? 'Creating account...' : 'Create Account',
                onPressed: _isLoading ? null : _handleRegister,
              ),
              const SizedBox(height: 16),
              AppButton(
                label: 'Already have an account? Sign In',
                variant: AppButtonVariant.ghost,
                onPressed: () => context.go('/login'),
              ),
              const SizedBox(height: 32),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildTextField(
    String hint,
    IconData icon,
    bool isDark, {
    bool obscure = false,
    required TextEditingController controller,
  }) {
    return TextField(
      controller: controller,
      decoration: InputDecoration(
        hintText: hint,
        prefixIcon: Icon(icon),
        filled: true,
        fillColor: isDark ? AppColors.darkSurface2 : AppColors.background,
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(AppRadius.button),
          borderSide: BorderSide(color: isDark ? AppColors.darkDivider : AppColors.divider),
        ),
      ),
      obscureText: obscure,
    );
  }
}
