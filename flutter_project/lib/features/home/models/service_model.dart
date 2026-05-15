/// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/// Home Service Model — for the Home & Explore screens
/// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
///
/// Maps to the backend `Service` model from Prisma.
/// Backend endpoint: GET /api/services
///
/// Response shape:
///   {
///     id, title, category, price (float), description,
///     providerId, createdAt, updatedAt,
///     provider: { id, displayName, avatarUrl, companyId }
///   }
///
/// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/// Lightweight service model used by HomeScreen and ExploreScreen.
class ServiceModel {
  final String id;
  final String title;
  final String description;
  final double price; // raw price from backend (float, dollars)
  final String category;
  final String providerName;
  final String? providerAvatar;
  final String? imageUrl;
  final double rating;
  final int reviewCount;

  const ServiceModel({
    required this.id,
    required this.title,
    this.description = '',
    this.price = 0.0,
    this.category = '',
    this.providerName = '',
    this.providerAvatar,
    this.imageUrl,
    this.rating = 0.0,
    this.reviewCount = 0,
  });

  /// Formatted price string, e.g. "$12.50".
  String get formattedPrice => '\$${price.toStringAsFixed(2)}';

  factory ServiceModel.fromJson(Map<String, dynamic> json) {
    // Extract provider info
    final provider = json['provider'] as Map<String, dynamic>?;
    final providerName = provider?['displayName'] as String? ?? '';
    final providerAvatar = provider?['avatarUrl'] as String?;

    // Price from backend is a float in dollars
    final price = (json['price'] as num?)?.toDouble() ?? 0.0;

    // Rating & review count
    final rating = (json['rating'] as num?)?.toDouble() ?? 0.0;
    final reviewCount = json['reviewsCount'] as int? ?? 0;

    // Image — backend may not have imageUrl on Service model directly
    final imageUrl = json['imageUrl'] as String?;

    return ServiceModel(
      id: json['id'] as String? ?? '',
      title: json['title'] as String? ?? '',
      description: json['description'] as String? ?? '',
      price: price,
      category: json['category'] as String? ?? '',
      providerName: providerName,
      providerAvatar: providerAvatar,
      imageUrl: imageUrl,
      rating: rating,
      reviewCount: reviewCount,
    );
  }
}
