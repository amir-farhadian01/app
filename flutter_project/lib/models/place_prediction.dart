class PlacePrediction {
  final String description;
  final String placeId;

  const PlacePrediction({
    required this.description,
    required this.placeId,
  });

  factory PlacePrediction.fromJson(Map<String, dynamic> m) {
    return PlacePrediction(
      description: m['description'] as String? ?? '',
      placeId: m['place_id'] as String? ?? '',
    );
  }
}
