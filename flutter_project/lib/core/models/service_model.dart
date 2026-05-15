/// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/// Service Model — Neighborly
/// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
///
/// Maps to the backend `Service` model from Prisma.
/// Backend endpoint: GET /api/services?providerId=:id
///
/// Response shape:
///   [{
///     id, title, category, price (float), description,
///     providerId, createdAt, updatedAt,
///     provider: { id, displayName, avatarUrl, companyId }
///   }]
///
/// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/// Represents a service/package offered by a business.
class ServiceModel {
  final String id;
  final String name;
  final String description;
  final int priceInCents; // stored as cents, display by dividing by 100
  final String bookingMode; // 'FIXED' | 'NEGOTIABLE' | 'INVENTORY'
  final int durationMinutes;
  final String? imageUrl;
  final bool isAvailable;

  const ServiceModel({
    required this.id,
    required this.name,
    this.description = '',
    this.priceInCents = 0,
    this.bookingMode = 'FIXED',
    this.durationMinutes = 60,
    this.imageUrl,
    this.isAvailable = true,
  });

  /// Returns a formatted price string, e.g. "$12.50".
  String get formattedPrice {
    final dollars = priceInCents / 100;
    return '\$${dollars.toStringAsFixed(2)}';
  }

  factory ServiceModel.fromJson(Map<String, dynamic> json) {
    // Backend stores price as a float (dollars), convert to cents
    final priceDouble = (json['price'] as num?)?.toDouble() ?? 0.0;
    final priceInCents = (priceDouble * 100).round();

    return ServiceModel(
      id: json['id'] as String? ?? '',
      name: json['title'] as String? ?? json['name'] as String? ?? '',
      description: json['description'] as String? ?? '',
      priceInCents: priceInCents,
      bookingMode: _mapBookingMode(json['bookingMode'] as String?),
      durationMinutes: json['durationMinutes'] as int? ?? 60,
      imageUrl: json['imageUrl'] as String?,
      isAvailable: json['isAvailable'] != false,
    );
  }

  static String _mapBookingMode(String? mode) {
    switch (mode?.toUpperCase()) {
      case 'FIXED':
        return 'FIXED';
      case 'NEGOTIABLE':
        return 'NEGOTIABLE';
      case 'INVENTORY':
        return 'INVENTORY';
      default:
        return 'FIXED';
    }
  }

  /// Returns a list of 3 realistic mock services for development/testing.
  static List<ServiceModel> mockList() {
    return const [
      ServiceModel(
        id: 'mock-svc-001',
        name: 'Standard Oil Change',
        description:
            'Full synthetic oil change with filter replacement. Includes fluid top-up.',
        priceInCents: 6900,
        bookingMode: 'FIXED',
        durationMinutes: 45,
        isAvailable: true,
      ),
      ServiceModel(
        id: 'mock-svc-002',
        name: 'Full Vehicle Service',
        description:
            'Complete 21-point inspection, oil change, tire rotation, brake check.',
        priceInCents: 14900,
        bookingMode: 'FIXED',
        durationMinutes: 120,
        isAvailable: true,
      ),
      ServiceModel(
        id: 'mock-svc-003',
        name: 'Winter Prep Package',
        description:
            'Winter tire swap, antifreeze check, battery test, and emergency kit.',
        priceInCents: 19900,
        bookingMode: 'FIXED',
        durationMinutes: 90,
        isAvailable: true,
      ),
    ];
  }
}
