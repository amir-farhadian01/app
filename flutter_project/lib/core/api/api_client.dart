/// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/// API Client — Dio-based HTTP client with auth interceptors
/// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../storage/secure_storage.dart';
import 'app_exception.dart';

/// Base URL for the Neighborly backend (local dev).
const String kBaseUrl = 'http://localhost:3000';

/// Provider that exposes the configured [Dio] instance.
final apiClientProvider = Provider<Dio>((ref) {
  final secureStorage = ref.watch(secureStorageProvider);
  final dio = _createDio(secureStorage);
  return dio;
});

/// Build the Dio instance with interceptors for auth token injection,
/// automatic token refresh on 401, and error mapping.
Dio _createDio(SecureStorage secureStorage) {
  final dio = Dio(
    BaseOptions(
      baseUrl: kBaseUrl,
      connectTimeout: const Duration(seconds: 10),
      receiveTimeout: const Duration(seconds: 10),
      headers: {
        'Content-Type': 'application/json',
      },
    ),
  );

  // ── Request interceptor: attach Bearer token ──────────────────────
  dio.interceptors.add(
    InterceptorsWrapper(
      onRequest: (options, handler) async {
        final token = await secureStorage.getAccessToken();
        if (token != null && token.isNotEmpty) {
          options.headers['Authorization'] = 'Bearer $token';
        }
        handler.next(options);
      },
      onError: (error, handler) async {
        // ── 401 → attempt token refresh ────────────────────────────
        if (error.response?.statusCode == 401) {
          try {
            final refreshToken = await secureStorage.getRefreshToken();
            if (refreshToken == null || refreshToken.isEmpty) {
              // No refresh token stored → force logout
              await secureStorage.clearTokens();
              return handler.reject(error);
            }

            // Call refresh endpoint
            final refreshResponse = await dio.post<Map<String, dynamic>>(
              '/api/auth/refresh',
              data: {'refreshToken': refreshToken},
            );

            final newAccessToken =
                refreshResponse.data?['accessToken'] as String?;
            if (newAccessToken == null) {
              throw Exception('No accessToken in refresh response');
            }

            // Persist the new access token (refresh token stays the same)
            await secureStorage.saveTokens(
              newAccessToken,
              refreshToken,
            );

            // Retry the original request with the new token
            final retryOptions = error.requestOptions;
            retryOptions.headers['Authorization'] = 'Bearer $newAccessToken';
            final retryResponse = await dio.fetch(retryOptions);
            return handler.resolve(retryResponse);
          } catch (_) {
            // Refresh failed → clear everything
            await secureStorage.clearTokens();
            return handler.reject(error);
          }
        }

        // ── Map DioException to AppException ───────────────────────
        handler.reject(error);
      },
    ),
  );

  return dio;
}

/// Map a [DioException] to a human-readable [AppException].
///
/// Call this from repository methods so callers always receive
/// typed exceptions instead of raw Dio errors.
AppException mapDioError(DioException e) {
  final statusCode = e.response?.statusCode;
  final serverMessage =
      (e.response?.data is Map)
          ? (e.response!.data as Map)['error'] as String?
          : null;

  switch (e.type) {
    case DioExceptionType.connectionTimeout:
    case DioExceptionType.sendTimeout:
    case DioExceptionType.receiveTimeout:
    case DioExceptionType.connectionError:
      return const AppException(
        message: 'Network error. Please check your connection and try again.',
        type: AppExceptionType.network,
      );
    case DioExceptionType.badResponse:
      final sc = statusCode ?? 0;
      switch (sc) {
        case 401:
          return AppException(
            message: serverMessage ?? 'Invalid credentials.',
            statusCode: sc,
            type: AppExceptionType.unauthorized,
          );
        case 403:
          return AppException(
            message: serverMessage ?? 'Access denied.',
            statusCode: sc,
            type: AppExceptionType.unauthorized,
          );
        case 404:
          return AppException(
            message: serverMessage ?? 'Resource not found.',
            statusCode: sc,
            type: AppExceptionType.notFound,
          );
        case 409:
          return AppException(
            message: serverMessage ?? 'Conflict.',
            statusCode: sc,
            type: AppExceptionType.unknown,
          );
        case >= 500:
          return AppException(
            message: serverMessage ?? 'Server error. Please try again later.',
            statusCode: sc,
            type: AppExceptionType.serverError,
          );
        default:
          return AppException(
            message: serverMessage ?? 'Something went wrong.',
            statusCode: sc,
            type: AppExceptionType.unknown,
          );
      }
    default:
      return const AppException(
        message: 'Unexpected error occurred.',
        type: AppExceptionType.unknown,
      );
  }
}
