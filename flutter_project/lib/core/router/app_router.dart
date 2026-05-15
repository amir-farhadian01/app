import 'package:flutter/material.dart';

import '../../features/splash/splash_screen.dart';
import '../../features/onboarding/onboarding_screen.dart';
import '../../features/shell/main_shell.dart';

/// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/// Neighborly App Router
/// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/// Named routes used with [Navigator.pushNamed].
///
/// Routes:
///   /            → SplashScreen
///   /onboarding  → OnboardingScreen
///   /home        → MainShell (bottom nav / sidebar)
/// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

abstract final class AppRoutes {
  static const String splash     = '/';
  static const String onboarding = '/onboarding';
  static const String home       = '/home';
}

/// Generate a [Route] for a given [RouteSettings].
///
/// Usage: Pass this as [MaterialApp.onGenerateRoute].
Route<dynamic>? onGenerateAppRoute(RouteSettings settings) {
  switch (settings.name) {
    case AppRoutes.splash:
      return MaterialPageRoute<void>(
        settings: settings,
        builder: (_) => const SplashScreen(),
      );
    case AppRoutes.onboarding:
      return MaterialPageRoute<void>(
        settings: settings,
        builder: (_) => const OnboardingScreen(),
      );
    case AppRoutes.home:
      return MaterialPageRoute<void>(
        settings: settings,
        builder: (_) => const MainShell(),
      );
    default:
      // Fallback to splash
      return MaterialPageRoute<void>(
        settings: settings,
        builder: (_) => const SplashScreen(),
      );
  }
}
