class KycModel {
  final String id;
  final String userId;
  final String type;
  final String status;
  final Map<String, dynamic> details;
  final DateTime createdAt;

  KycModel({
    required this.id,
    required this.userId,
    required this.type,
    required this.status,
    required this.details,
    required this.createdAt,
  });

  factory KycModel.fromMap(Map<String, dynamic> map, String id) {
    return KycModel(
      id: id,
      userId: map['userId'] ?? '',
      type: map['type'] ?? 'personal',
      status: map['status'] ?? 'pending',
      details: map['details'] ?? {},
      createdAt: DateTime.parse(map['createdAt']),
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'userId': userId,
      'type': type,
      'status': status,
      'details': details,
      'createdAt': createdAt.toIso8601String(),
    };
  }
}
