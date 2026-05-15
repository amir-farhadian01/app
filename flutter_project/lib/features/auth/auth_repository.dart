/// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/// Auth Repository — Plain Dart data-access layer for auth endpoints
/// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

import 'package:dio/dio.dart';

import '../../core/api/api_client.dart';
import '../../core/api/app_exception.dart';

// ─── Data Transfer Objects ─────────────────────────────────────────

/// Request body for `POST /api/auth/register`.
class RegisterRequest {
  final String name;
  final String email;
  final String phone;
  final String password;
  final String role;

  const RegisterRequest({
    required this.name,
    required this.email,
    required this.phone,
    required this.password,
    required this.role,
  });

  Map<String, dynamic> toJson() => {
        'displayName': name,
        'email': email,
        'phone': phone,
        'password': password,
        'role': role,
      };
}

/// User profile returned by the backend.
class UserProfile {
  final String id;
  final String email;
  final String displayName;
  final String role;
  final String? companyId;
  final String? status;
  final bool? isVerified;
  final String? avatarUrl;
  final String? bio;
  final String? location;
  final String? phone;
  final String? address;
  final bool? mfaEnabled;
  final String? createdAt;
  final bool? googleLinked;

  const UserProfile({
    required this.id,
    required this.email,
    required this.displayName,
    required this.role,
    this.companyId,
    this.status,
    this.isVerified,
    this.avatarUrl,
    this.bio,
    this.location,
    this.phone,
    this.address,
    this.mfaEnabled,
    this.createdAt,
    this.googleLinked,
  });

  factory UserProfile.fromJson(Map<String, dynamic> json) {
    return UserProfile(
      id: json['id'] as String,
      email: json['email'] as String,
      displayName: json['displayName'] as String? ?? '',
      role: json['role'] as String? ?? 'customer',
      companyId: json['companyId'] as String?,
      status: json['status'] as String?,
      isVerified: json['isVerified'] as bool?,
      avatarUrl: json['avatarUrl'] as String?,
      bio: json['bio'] as String?,
      location: json['location'] as String?,
      phone: json['phone'] as String?,
      address: json['address'] as String?,
      mfaEnabled: json['mfaEnabled'] as bool?,
      createdAt: json['createdAt'] as String?,
      googleLinked: json['googleLinked'] as bool?,
    );
  }
}

/// Response returned by login / register endpoints.
class AuthResponse {
  final String accessToken;
  final String? refreshToken;
  final UserProfile user;

  const AuthResponse({
    required this.accessToken,
    this.refreshToken,
    required this.user,
  });

  factory AuthResponse.fromJson(Map<String, dynamic> json) {
    return AuthResponse(
      accessToken: json['accessToken'] as String,
      refreshToken: json['refreshToken'] as String?,
      user: UserProfile.fromJson(json['user'] as Map<String, dynamic>),
    );
  }
}

// ─── Repository ────────────────────────────────────────────────────

/// Repository for all auth-related API calls.
///
/// Every method throws [AppException] on failure. Callers should
/// catch and display the [AppException.message] to the user.
class AuthRepository {
  const AuthRepository(this._dio);

  final Dio _dio;

  /// `POST /api/auth/login`
  Future<AuthResponse> login(String email, String password) async {
    try {
      final response = await _dio.post<Map<String, dynamic>>(
        '/api/auth/login',
        data: {'email': email, 'password': password},
      );
      return AuthResponse.fromJson(response.data!);
    } on DioException catch (e) {
      throw mapDioError(e);
    }
  }

  /// `POST /api/auth/register`
  Future<AuthResponse> register(RegisterRequest req) async {
    try {
      final response = await _dio.post<Map<String, dynamic>>(
        '/api/auth/register',
        data: req.toJson(),
      );
      return AuthResponse.fromJson(response.data!);
    } on DioException catch (e) {
      throw mapDioError(e);
    }
  }

  /// `GET /api/auth/me`
  Future<UserProfile> getMe() async {
    try {
      final response = await _dio.get<Map<String, dynamic>>('/api/auth/me');
      return UserProfile.fromJson(response.data!);
    } on DioException catch (e) {
      throw mapDioError(e);
    }
  }

  /// `POST /api/auth/logout`
  Future<void> logout() async {
    try {
      await _dio.post<Map<String, dynamic>>('/api/auth/logout');
    } on DioException catch (e) {
      // Even if the server call fails, we still clear tokens locally.
      throw mapDioError(e);
    }
  }

  /// `POST /api/auth/refresh`
  Future<AuthResponse> refreshToken(String token) async {
    try {
      final response = await _dio.post<Map<String, dynamic>>(
        '/api/auth/refresh',
        data: {'refreshToken': token},
      );
      return AuthResponse.fromJson(response.data!);
    } on DioException catch (e) {
      throw mapDioError(e);
    }
  }
}
