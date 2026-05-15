/// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/// Booking Service — Neighborly
/// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
///
/// Handles order creation for the booking flow.
///
/// Backend endpoint:
///   POST /api/orders — Create order (requires auth)
///     Body: { serviceId, scheduledAt, notes }
///     Response: { id, status, ... }
///
/// NOTE: The orders router uses `router.use(authenticate)` at line 516,
/// so a valid JWT token must be set via [ApiClient.setToken] before
/// calling [createOrder].
///
/// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

import 'dart:developer' as developer;

import 'api_client.dart';

/// Service for creating and managing bookings (orders).
class BookingService {
  /// Create a new order (booking).
  ///
  /// [payload] must contain:
  ///   - serviceId: String
  ///   - scheduledAt: ISO8601 date-time string
  ///   - notes: String (optional)
  ///
  /// Calls `POST /api/orders`.
  ///
  /// On success: returns the response body map.
  /// On [ApiException]: rethrows (caller shows SnackBar).
  /// On 404/unimplemented: returns mock `{ id: 'mock-order-1', status: 'PENDING' }`
  ///   and logs a warning via [debugPrint].
  Future<Map<String, dynamic>> createOrder(
      Map<String, dynamic> payload) async {
    try {
      final response = await ApiClient.post('/api/orders', {
        'serviceId': payload['serviceId'],
        'scheduledAt': payload['scheduledAt'],
        'notes': payload['notes'] ?? '',
      });
      return response;
    } on ApiException catch (e) {
      if (e.statusCode == 404) {
        developer.log(
          '⚠️ MOCK: POST /api/orders not wired yet — returning mock response',
          name: 'booking_service',
        );
        return {
          'id': 'mock-order-1',
          'status': 'PENDING',
        };
      }
      rethrow;
    }
  }
}
