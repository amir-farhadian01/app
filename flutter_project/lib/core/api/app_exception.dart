/// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/// App Exception — Typed error for the API layer
/// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/// Categorises the nature of an API failure so UI code can
/// display a human-readable message without parsing raw HTTP.
enum AppExceptionType {
  network,
  unauthorized,
  notFound,
  serverError,
  unknown,
}

/// Wraps a [DioException] (or any API error) into a typed exception
/// that carries a human-readable [message] and an optional [statusCode].
class AppException implements Exception {
  final String message;
  final int? statusCode;
  final AppExceptionType type;

  const AppException({
    required this.message,
    this.statusCode,
    this.type = AppExceptionType.unknown,
  });

  @override
  String toString() => 'AppException(${type.name}): $message';
}
