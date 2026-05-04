class ServiceModel {
  final String id;
  final String providerId;
  final String title;
  final String description;
  final String category;
  final double price;
  final double rating;
  final int reviewsCount;

  ServiceModel({
    required this.id,
    required this.providerId,
    required this.title,
    required this.description,
    required this.category,
    required this.price,
    this.rating = 0.0,
    this.reviewsCount = 0,
  });

  factory ServiceModel.fromMap(Map<String, dynamic> map, String id) {
    return ServiceModel(
      id: id,
      providerId: map['providerId'] ?? '',
      title: map['title'] ?? '',
      description: map['description'] ?? '',
      category: map['category'] ?? '',
      price: (map['price'] ?? 0.0).toDouble(),
      rating: (map['rating'] ?? 0.0).toDouble(),
      reviewsCount: map['reviewsCount'] ?? 0,
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'providerId': providerId,
      'title': title,
      'description': description,
      'category': category,
      'price': price,
      'rating': rating,
      'reviewsCount': reviewsCount,
    };
  }
}
