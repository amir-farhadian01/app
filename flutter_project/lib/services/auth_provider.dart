import 'package:flutter/foundation.dart';

import '../models/user_model.dart';
import 'api_service.dart';

class AppUser {
  final String id;
  final String email;
  final String displayName;
  final String role;
  final String? companyId;
  final String? avatarUrl;
  final bool isVerified;

  AppUser({
    required this.id,
    required this.email,
    required this.displayName,
    required this.role,
    this.companyId,
    this.avatarUrl,
    required this.isVerified,
  });

  factory AppUser.fromMap(Map<String, dynamic> map) {
    return AppUser(
      id: map['id'] ?? '',
      email: map['email'] ?? '',
      displayName: map['displayName'] ?? map['email'] ?? '',
      role: map['role'] ?? 'customer',
      companyId: map['companyId'],
      avatarUrl: map['avatarUrl'],
      isVerified: map['isVerified'] ?? false,
    );
  }

  factory AppUser.fromUserModel(UserModel u) {
    return AppUser(
      id: u.uid,
      email: u.email,
      displayName: u.displayName.trim().isEmpty ? u.email : u.displayName,
      role: u.role,
      companyId: u.companyId,
      avatarUrl: u.photoURL,
      isVerified: u.isVerified,
    );
  }
}

class AuthProvider extends ChangeNotifier {
  AppUser? _user;
  bool _loading = true;

  AppUser? get user => _user;
  bool get loading => _loading;
  bool get isLoggedIn => _user != null;

  String get role => _user?.role ?? '';
  bool get isAdmin => ['owner', 'platform_admin', 'support', 'finance'].contains(role);
  bool get isProvider => role == 'provider';
  bool get isCustomer => role == 'customer';

  Future<void> init() async {
    final token = await ApiService.getToken();
    if (token == null) {
      _loading = false;
      notifyListeners();
      return;
    }
    final userData = await ApiService.getMe();
    if (userData != null) {
      _user = AppUser.fromMap(userData);
    } else {
      await ApiService.clearToken();
    }
    _loading = false;
    notifyListeners();
  }

  Future<void> login(String email, String password) async {
    final data = await ApiService.login(email, password);
    _user = AppUser.fromMap(data['user'] as Map<String, dynamic>);
    notifyListeners();
  }

  Future<void> register(String email, String password, String displayName, String role) async {
    final data = await ApiService.register(email, password, displayName, role);
    _user = AppUser.fromMap(data['user'] as Map<String, dynamic>);
    notifyListeners();
  }

  Future<void> logout() async {
    await ApiService.logout();
    _user = null;
    notifyListeners();
  }

  Future<void> refreshUser() async {
    final userData = await ApiService.getMe();
    if (userData != null) {
      _user = AppUser.fromMap(userData);
      notifyListeners();
    }
  }
}
