import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// Persists `theme-mode` like web `ThemeContext` (`light` | `dark`).
/// Default is now DARK to match the port 8077 reference UI.
class NeighborlyThemeNotifier extends ChangeNotifier {
  static const _k = 'theme-mode';

  ThemeMode _mode = ThemeMode.dark;

  ThemeMode get themeMode => _mode;
  bool get isDark => _mode == ThemeMode.dark;

  NeighborlyThemeNotifier() {
    _load();
  }

  Future<void> _load() async {
    final prefs = await SharedPreferences.getInstance();
    final raw = prefs.getString(_k);
    _mode = raw == 'dark' ? ThemeMode.dark : ThemeMode.dark; // Default to dark
    notifyListeners();
  }

  Future<void> toggleTheme() async {
    _mode = _mode == ThemeMode.light ? ThemeMode.dark : ThemeMode.light;
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_k, _mode == ThemeMode.dark ? 'dark' : 'light');
    notifyListeners();
  }
}
