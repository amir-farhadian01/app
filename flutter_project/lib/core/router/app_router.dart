import 'package:flutter/material.dart';

import '../../features/splash/splash_screen.dart';
import '../../features/onboarding/onboarding_screen.dart';
import '../../screens/auth_screen.dart';
import '../../screens/booking_screen.dart';
import '../../screens/business_profile_screen.dart';
import '../../widgets/main_scaffold.dart';

/// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/// Neighborly App Router
/// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/// Named routes used with [Navigator.pushNamed].
///
/// Routes:
///   /                → SplashScreen
///   /onboarding      → OnboardingScreen
///   /auth            → AuthScreen (3-step phone/otp/username)
///   /home            → MainScaffold (bottom nav / sidebar)
///   /business-profile → BusinessProfileScreen
///   /booking         → BookingScreen (Phase 3 entry point)
/// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

abstract final class AppRoutes {
  static const String splash           = '/';
  static const String onboarding       = '/onboarding';
  static const String auth             = '/auth';
  static const String home             = '/home';
  static const String businessProfile  = '/business-profile';
  static const String booking          = '/booking';
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
    case AppRoutes.auth:
      return MaterialPageRoute<void>(
        settings: settings,
        builder: (_) => const AuthScreen(),
      );
    case AppRoutes.home:
      return MaterialPageRoute<void>(
        settings: settings,
        builder: (_) => const MainScaffold(),
      );
    case AppRoutes.businessProfile:
      return MaterialPageRoute<void>(
        settings: settings,
        builder: (_) => const BusinessProfileScreen(),
      );
    case AppRoutes.booking:
      return MaterialPageRoute<void>(
        settings: settings,
        builder: (_) => const BookingScreen(),
      );
    default:
      // Fallback to splash
      return MaterialPageRoute<void>(
        settings: settings,
        builder: (_) => const SplashScreen(),
      );
  }
}
