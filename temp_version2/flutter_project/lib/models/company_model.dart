class CompanyModel {
  final String id;
  final String ownerId;
  final String name;
  final String slug;
  final String type;
  final String kycStatus;
  final List<String> members;

  CompanyModel({
    required this.id,
    required this.ownerId,
    required this.name,
    required this.slug,
    required this.type,
    this.kycStatus = 'pending',
    this.members = const [],
  });

  factory CompanyModel.fromMap(Map<String, dynamic> map, String id) {
    return CompanyModel(
      id: id,
      ownerId: map['ownerId'] ?? '',
      name: map['name'] ?? '',
      slug: map['slug'] ?? '',
      type: map['type'] ?? 'solo',
      kycStatus: map['kycStatus'] ?? 'pending',
      members: List<String>.from(map['members'] ?? []),
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'ownerId': ownerId,
      'name': name,
      'slug': slug,
      'type': type,
      'kycStatus': kycStatus,
      'members': members,
    };
  }
}
