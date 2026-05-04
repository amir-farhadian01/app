class ServiceProviderSummary {
  const ServiceProviderSummary({
    required this.id,
    required this.displayName,
    this.avatarUrl,
  });

  final String id;
  final String displayName;
  final String? avatarUrl;
}

class ServiceModel {
  final String id;
  final String providerId;
  final String? serviceCatalogId;
  final String title;
  final String description;
  final String category;
  final double price;
  final double rating;
  final int reviewsCount;
  final ServiceProviderSummary? provider;

  ServiceModel({
    required this.id,
    required this.providerId,
    this.serviceCatalogId,
    required this.title,
    required this.description,
    required this.category,
    required this.price,
    this.rating = 0.0,
    this.reviewsCount = 0,
    this.provider,
  });

  factory ServiceModel.fromMap(Map<String, dynamic> map, String id) {
    ServiceProviderSummary? providerSummary;
    final raw = map['provider'];
    if (raw is Map) {
      final pm = Map<String, dynamic>.from(raw);
      providerSummary = ServiceProviderSummary(
        id: pm['id']?.toString() ?? '',
        displayName: pm['displayName']?.toString() ?? 'Provider',
        avatarUrl: pm['avatarUrl']?.toString(),
      );
    }
    return ServiceModel(
      id: id,
      providerId: map['providerId'] ?? '',
      serviceCatalogId: map['serviceCatalogId']?.toString(),
      title: map['title'] ?? '',
      description: map['description'] ?? '',
      category: map['category'] ?? '',
      price: (map['price'] ?? 0.0).toDouble(),
      rating: (map['rating'] ?? 0.0).toDouble(),
      reviewsCount: map['reviewsCount'] ?? 0,
      provider: providerSummary,
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'providerId': providerId,
      'serviceCatalogId': serviceCatalogId,
      'title': title,
      'description': description,
      'category': category,
      'price': price,
      'rating': rating,
      'reviewsCount': reviewsCount,
    };
  }
}
