class RequestModel {
  final String id;
  final String customerId;
  final String providerId;
  final String serviceId;
  final String status;
  final String details;
  final DateTime createdAt;

  RequestModel({
    required this.id,
    required this.customerId,
    required this.providerId,
    required this.serviceId,
    required this.status,
    required this.details,
    required this.createdAt,
  });

  factory RequestModel.fromMap(Map<String, dynamic> map, String id) {
    return RequestModel(
      id: id,
      customerId: map['customerId'] ?? '',
      providerId: map['providerId'] ?? '',
      serviceId: map['serviceId'] ?? '',
      status: map['status'] ?? 'pending',
      details: map['details'] ?? '',
      createdAt: DateTime.parse(map['createdAt']),
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'customerId': customerId,
      'providerId': providerId,
      'serviceId': serviceId,
      'status': status,
      'details': details,
      'createdAt': createdAt.toIso8601String(),
    };
  }
}
