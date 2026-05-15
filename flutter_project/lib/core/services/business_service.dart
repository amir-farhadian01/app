/// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/// Business Service — Neighborly
/// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
///
/// Fetches business profile, services, dashboard stats, and appointments
/// from the backend. Falls back to mock data when endpoints return 404.
///
/// Backend endpoints used:
///   GET  /api/companies/:id              — Get company by ID
///   GET  /api/services?providerId=:id    — Get services by provider ID
///
/// Mocked (no backend endpoint yet):
///   GET  /api/companies/:id/stats        — Dashboard stats
///   GET  /api/orders?companyId=:id       — Appointments
///
/// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

import 'dart:developer' as developer;

import '../models/business_model.dart';
import '../models/service_model.dart';
import 'api_client.dart';

/// Service for fetching business-related data.
class BusinessService {
  /// Fetch the business profile for [businessId].
  ///
  /// Calls `GET /api/companies/:businessId`.
  /// On 404, returns [BusinessModel.mock].
  Future<BusinessModel> getBusinessProfile(String businessId) async {
    try {
      final response = await ApiClient.get('/api/companies/$businessId');
      final map = response as Map<String, dynamic>;
      return BusinessModel.fromJson(map);
    } on ApiException catch (e) {
      if (e.statusCode == 404) {
        developer.log(
          '⚠️ MOCK: GET /api/companies/$businessId returned 404 — using mock data',
          name: 'business_service',
        );
        return BusinessModel.mock();
      }
      rethrow;
    }
  }

  /// Fetch the list of services for a business.
  ///
  /// Calls `GET /api/services?providerId=:businessId`.
  /// On 404, returns [ServiceModel.mockList].
  Future<List<ServiceModel>> getBusinessServices(String businessId) async {
    try {
      final response =
          await ApiClient.get('/api/services?providerId=$businessId');
      final list = response as List<dynamic>;
      return list
          .map((e) => ServiceModel.fromJson(e as Map<String, dynamic>))
          .toList();
    } on ApiException catch (e) {
      if (e.statusCode == 404) {
        developer.log(
          '⚠️ MOCK: GET /api/services?providerId=$businessId returned 404 — using mock data',
          name: 'business_service',
        );
        return ServiceModel.mockList();
      }
      rethrow;
    }
  }

  /// Fetch dashboard statistics for a business.
  ///
  /// **MOCKED** — no backend endpoint exists yet.
  /// Returns: `{ totalRevenue, pendingOrders, completedOrders, activeClients }`
  Future<Map<String, dynamic>> getBusinessDashboardStats(
      String businessId) async {
    try {
      final response =
          await ApiClient.get('/api/companies/$businessId/stats');
      return response as Map<String, dynamic>;
    } on ApiException catch (e) {
      if (e.statusCode == 404) {
        developer.log(
          '⚠️ MOCK: GET /api/companies/$businessId/stats not implemented — using mock data',
          name: 'business_service',
        );
        return {
          'totalRevenue': 0,
          'pendingOrders': 3,
          'completedOrders': 12,
          'activeClients': 7,
        };
      }
      rethrow;
    }
  }

  /// Fetch appointments (orders) for a business.
  ///
  /// **MOCKED** — no backend endpoint exists yet.
  /// Returns a list of appointment maps.
  Future<List<Map<String, dynamic>>> getAppointments(
      String businessId) async {
    try {
      final response =
          await ApiClient.get('/api/orders?companyId=$businessId&status=PENDING');
      final data = response;
      if (data is List) {
        return data.cast<Map<String, dynamic>>();
      }
      if (data is Map && data.containsKey('items')) {
        return (data['items'] as List).cast<Map<String, dynamic>>();
      }
      return _mockAppointments();
    } on ApiException catch (e) {
      if (e.statusCode == 404) {
        developer.log(
          '⚠️ MOCK: GET /api/orders?companyId=$businessId not implemented — using mock data',
          name: 'business_service',
        );
        return _mockAppointments();
      }
      rethrow;
    }
  }

  /// Returns 3 mock appointment maps.
  List<Map<String, dynamic>> _mockAppointments() {
    return [
      {
        'time': '9:00 AM',
        'clientName': 'John M.',
        'service': 'Standard Oil Change',
        'price': '\$69',
        'status': 'Confirmed',
      },
      {
        'time': '10:30 AM',
        'clientName': 'Sarah K.',
        'service': 'Full Vehicle Service',
        'price': '\$149',
        'status': 'Pending',
      },
      {
        'time': '8:00 AM',
        'clientName': 'Mike L.',
        'service': 'Tire Rotation',
        'price': '\$40',
        'status': 'Done',
      },
    ];
  }
}
