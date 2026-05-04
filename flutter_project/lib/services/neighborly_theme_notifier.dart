import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// Persists `theme-mode` like web `ThemeContext` (`light` | `dark`).
class NeighborlyThemeNotifier extends ChangeNotifier {
  static const _k = 'theme-mode';

  ThemeMode _mode = ThemeMode.light;

  ThemeMode get themeMode => _mode;
  bool get isDark => _mode == ThemeMode.dark;

  NeighborlyThemeNotifier() {
    _load();
  }

  Future<void> _load() async {
    final prefs = await SharedPreferences.getInstance();
    final raw = prefs.getString(_k);
    _mode = raw == 'dark' ? ThemeMode.dark : ThemeMode.light;
    notifyListeners();
  }

  Future<void> toggleTheme() async {
    _mode = _mode == ThemeMode.light ? ThemeMode.dark : ThemeMode.light;
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_k, _mode == ThemeMode.dark ? 'dark' : 'light');
    notifyListeners();
  }
}
