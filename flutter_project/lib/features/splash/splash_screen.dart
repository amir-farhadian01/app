import 'package:flutter/material.dart';

import '../../core/app_theme.dart';

/// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/// Splash Screen
/// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/// Animated splash with brand logo, then navigates to onboarding.
/// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

class SplashScreen extends StatefulWidget {
  const SplashScreen({super.key});

  @override
  State<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends State<SplashScreen> {
  @override
  void initState() {
    super.initState();

    Future.delayed(const Duration(seconds: 2), () {
      if (mounted) {
        Navigator.pushReplacementNamed(context, '/onboarding');
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Scaffold(
      backgroundColor: NeighborlyColors.bgPrimary,
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            // Logo "N" with accent gradient
            ShaderMask(
              shaderCallback: (bounds) => const LinearGradient(
                colors: [NeighborlyColors.accent, NeighborlyColors.accentTeal],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ).createShader(bounds),
              child: const Text(
                'N',
                style: TextStyle(
                  fontSize: 72,
                  fontWeight: FontWeight.bold,
                  color: Colors.white,
                ),
              ),
            ),
            const SizedBox(height: NeighborlySpacing.s8),
            // App name
            Text(
              'Neighborly',
              style: theme.textTheme.displayLarge?.copyWith(
                color: NeighborlyColors.textPrimary,
              ),
            ),
            const SizedBox(height: NeighborlySpacing.s8),
            // Tagline
            Text(
              'Your neighbourhood marketplace',
              style: theme.textTheme.bodySmall?.copyWith(
                color: NeighborlyColors.textSecondary,
                letterSpacing: 1.2,
              ),
            ),
            const SizedBox(height: NeighborlySpacing.s48),
            // Progress indicator
            const SizedBox(
              width: 200,
              child: LinearProgressIndicator(
                valueColor: AlwaysStoppedAnimation<Color>(NeighborlyColors.accent),
                backgroundColor: Color(0x335B5FEF), // accent.withValues(alpha: 0.2)
              ),
            ),
          ],
        ),
      ),
    );
  }
}
