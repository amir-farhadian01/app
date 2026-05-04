import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:google_fonts/google_fonts.dart';
import 'services/auth_provider.dart';
import 'screens/auth_screen.dart';
import 'screens/main_app_screen.dart';

// ─── Theme Notifier ───────────────────────────────────────────────────────────
class ThemeNotifier extends ChangeNotifier {
  ThemeMode _mode = ThemeMode.light;

  ThemeMode get mode => _mode;
  bool get isDark => _mode == ThemeMode.dark;

  void toggleTheme() {
    _mode = _mode == ThemeMode.light ? ThemeMode.dark : ThemeMode.light;
    notifyListeners();
  }
}

// ─── Entry Point ──────────────────────────────────────────────────────────────
void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(
    MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => AuthProvider()..init()),
        ChangeNotifierProvider(create: (_) => ThemeNotifier()),
      ],
      child: const NeighborlyApp(),
    ),
  );
}

// ─── App Root ─────────────────────────────────────────────────────────────────
class NeighborlyApp extends StatelessWidget {
  const NeighborlyApp({super.key});

  @override
  Widget build(BuildContext context) {
    final themeNotifier = context.watch<ThemeNotifier>();

    return MaterialApp(
      title: 'Neighborly',
      debugShowCheckedModeBanner: false,
      themeMode: themeNotifier.mode,
      theme: _buildLightTheme(),
      darkTheme: _buildDarkTheme(),
      home: const AuthWrapper(),
    );
  }

  // ── Light Theme ──────────────────────────────────────────────────
  static ThemeData _buildLightTheme() {
    return ThemeData(
      useMaterial3: true,
      brightness: Brightness.light,
      scaffoldBackgroundColor: const Color(0xFFF9FAFB),
      colorScheme: const ColorScheme(
        brightness: Brightness.light,
        primary: Color(0xFF141414),
        onPrimary: Colors.white,
        secondary: Color(0xFF8E9299),
        onSecondary: Colors.white,
        error: Color(0xFFEF4444),
        onError: Colors.white,
        surface: Color(0xFFFFFFFF),
        onSurface: Color(0xFF171717),
        surfaceContainerHighest: Color(0xFFF9FAFB),
        outline: Color(0xFFF5F5F5),
      ),
      textTheme: GoogleFonts.interTextTheme(),
      cardTheme: CardThemeData(
        elevation: 0,
        color: Colors.white,
        surfaceTintColor: Colors.transparent,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(20),
          side: const BorderSide(color: Color(0xFFF5F5F5)),
        ),
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: const Color(0xFF141414),
          foregroundColor: Colors.white,
          elevation: 0,
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
          textStyle: GoogleFonts.inter(fontWeight: FontWeight.w700, fontSize: 14),
        ),
      ),
      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(
          foregroundColor: const Color(0xFF141414),
          side: const BorderSide(color: Color(0xFFE5E5E5)),
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
          textStyle: GoogleFonts.inter(fontWeight: FontWeight.w700, fontSize: 14),
        ),
      ),
      appBarTheme: AppBarTheme(
        backgroundColor: Colors.white,
        foregroundColor: const Color(0xFF141414),
        elevation: 0,
        scrolledUnderElevation: 0,
        surfaceTintColor: Colors.transparent,
        centerTitle: false,
        titleTextStyle: GoogleFonts.inter(
          fontWeight: FontWeight.w900,
          fontSize: 16,
          fontStyle: FontStyle.italic,
          letterSpacing: 0.5,
          color: const Color(0xFF141414),
        ),
      ),
      navigationBarTheme: NavigationBarThemeData(
        backgroundColor: Colors.white,
        surfaceTintColor: Colors.transparent,
        elevation: 0,
        indicatorColor: const Color(0xFF141414),
        iconTheme: WidgetStateProperty.resolveWith((states) {
          if (states.contains(WidgetState.selected)) {
            return const IconThemeData(color: Colors.white, size: 22);
          }
          return const IconThemeData(color: Color(0xFF8E9299), size: 22);
        }),
        labelTextStyle: WidgetStateProperty.resolveWith((states) {
          if (states.contains(WidgetState.selected)) {
            return GoogleFonts.inter(fontWeight: FontWeight.w700, fontSize: 11, color: const Color(0xFF141414));
          }
          return GoogleFonts.inter(fontSize: 11, color: const Color(0xFF8E9299));
        }),
      ),
      dividerTheme: const DividerThemeData(color: Color(0xFFF5F5F5)),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: const Color(0xFFF9FAFB),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(14),
          borderSide: const BorderSide(color: Color(0xFFE5E5E5)),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(14),
          borderSide: const BorderSide(color: Color(0xFFE5E5E5)),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(14),
          borderSide: const BorderSide(color: Color(0xFF141414), width: 2),
        ),
        labelStyle: GoogleFonts.inter(color: const Color(0xFF8E9299)),
        hintStyle: GoogleFonts.inter(color: const Color(0xFF8E9299)),
      ),
    );
  }

  // ── Dark Theme ───────────────────────────────────────────────────
  static ThemeData _buildDarkTheme() {
    return ThemeData(
      useMaterial3: true,
      brightness: Brightness.dark,
      scaffoldBackgroundColor: const Color(0xFF0A0A0A),
      colorScheme: const ColorScheme(
        brightness: Brightness.dark,
        primary: Colors.white,
        onPrimary: Color(0xFF141414),
        secondary: Color(0xFF8E9299),
        onSecondary: Color(0xFF141414),
        error: Color(0xFFEF4444),
        onError: Colors.white,
        surface: Color(0xFF171717),
        onSurface: Color(0xFFF5F5F5),
        surfaceContainerHighest: Color(0xFF0A0A0A),
        outline: Color(0xFF262626),
      ),
      textTheme: GoogleFonts.interTextTheme(
        ThemeData(brightness: Brightness.dark).textTheme,
      ),
      cardTheme: CardThemeData(
        elevation: 0,
        color: const Color(0xFF171717),
        surfaceTintColor: Colors.transparent,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(20),
          side: const BorderSide(color: Color(0xFF262626)),
        ),
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: Colors.white,
          foregroundColor: const Color(0xFF141414),
          elevation: 0,
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
          textStyle: GoogleFonts.inter(fontWeight: FontWeight.w700, fontSize: 14),
        ),
      ),
      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(
          foregroundColor: Colors.white,
          side: const BorderSide(color: Color(0xFF262626)),
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
          textStyle: GoogleFonts.inter(fontWeight: FontWeight.w700, fontSize: 14),
        ),
      ),
      appBarTheme: AppBarTheme(
        backgroundColor: const Color(0xFF171717),
        foregroundColor: Colors.white,
        elevation: 0,
        scrolledUnderElevation: 0,
        surfaceTintColor: Colors.transparent,
        centerTitle: false,
        titleTextStyle: GoogleFonts.inter(
          fontWeight: FontWeight.w900,
          fontSize: 16,
          fontStyle: FontStyle.italic,
          letterSpacing: 0.5,
          color: Colors.white,
        ),
      ),
      navigationBarTheme: NavigationBarThemeData(
        backgroundColor: const Color(0xFF171717),
        surfaceTintColor: Colors.transparent,
        elevation: 0,
        indicatorColor: Colors.white,
        iconTheme: WidgetStateProperty.resolveWith((states) {
          if (states.contains(WidgetState.selected)) {
            return const IconThemeData(color: Color(0xFF141414), size: 22);
          }
          return const IconThemeData(color: Color(0xFF8E9299), size: 22);
        }),
        labelTextStyle: WidgetStateProperty.resolveWith((states) {
          if (states.contains(WidgetState.selected)) {
            return GoogleFonts.inter(fontWeight: FontWeight.w700, fontSize: 11, color: Colors.white);
          }
          return GoogleFonts.inter(fontSize: 11, color: const Color(0xFF8E9299));
        }),
      ),
      dividerTheme: const DividerThemeData(color: Color(0xFF262626)),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: const Color(0xFF1C1C1C),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(14),
          borderSide: const BorderSide(color: Color(0xFF262626)),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(14),
          borderSide: const BorderSide(color: Color(0xFF262626)),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(14),
          borderSide: const BorderSide(color: Colors.white, width: 2),
        ),
        labelStyle: GoogleFonts.inter(color: const Color(0xFF8E9299)),
        hintStyle: GoogleFonts.inter(color: const Color(0xFF8E9299)),
      ),
    );
  }
}

// ─── Auth Wrapper ─────────────────────────────────────────────────────────────
class AuthWrapper extends StatelessWidget {
  const AuthWrapper({super.key});

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();

    if (auth.loading) {
      return const Scaffold(
        body: Center(child: CircularProgressIndicator()),
      );
    }

    if (!auth.isLoggedIn) return const AuthScreen();

    if (auth.isAdmin) return const AdminRedirectScreen();

    return const MainAppScreen();
  }
}

// ─── Admin Redirect ───────────────────────────────────────────────────────────
class AdminRedirectScreen extends StatelessWidget {
  const AdminRedirectScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final auth = context.read<AuthProvider>();
    final cs = Theme.of(context).colorScheme;

    return Scaffold(
      body: Center(
        child: Padding(
          padding: const EdgeInsets.all(32),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Container(
                width: 80, height: 80,
                decoration: BoxDecoration(
                  color: cs.primary,
                  borderRadius: BorderRadius.circular(20),
                ),
                child: Icon(Icons.admin_panel_settings, color: cs.onPrimary, size: 40),
              ),
              const SizedBox(height: 24),
              Text(
                'Admin Panel',
                style: GoogleFonts.inter(fontSize: 24, fontWeight: FontWeight.w900, color: cs.onSurface),
              ),
              const SizedBox(height: 8),
              Text(
                'Use the web browser to access the admin dashboard.',
                textAlign: TextAlign.center,
                style: GoogleFonts.inter(color: cs.secondary),
              ),
              const SizedBox(height: 32),
              ElevatedButton(
                onPressed: () => auth.logout(),
                child: const Text('Sign Out'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
