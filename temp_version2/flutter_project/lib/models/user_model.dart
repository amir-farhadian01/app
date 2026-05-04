class UserModel {
  final String uid;
  final String email;
  final String displayName;
  final String role;
  final String? photoURL;
  final String? bio;
  final String? location;
  final String? companyId;
  final String status;
  final bool isVerified;
  final DateTime createdAt;

  UserModel({
    required this.uid,
    required this.email,
    required this.displayName,
    required this.role,
    this.photoURL,
    this.bio,
    this.location,
    this.companyId,
    this.status = 'active',
    this.isVerified = false,
    required this.createdAt,
  });

  factory UserModel.fromMap(Map<String, dynamic> map) {
    return UserModel(
      uid: map['uid'] ?? '',
      email: map['email'] ?? '',
      displayName: map['displayName'] ?? '',
      role: map['role'] ?? 'customer',
      photoURL: map['photoURL'],
      bio: map['bio'],
      location: map['location'],
      companyId: map['companyId'],
      status: map['status'] ?? 'active',
      isVerified: map['isVerified'] ?? false,
      createdAt: DateTime.parse(map['createdAt']),
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'uid': uid,
      'email': email,
      'displayName': displayName,
      'role': role,
      'photoURL': photoURL,
      'bio': bio,
      'location': location,
      'companyId': companyId,
      'status': status,
      'isVerified': isVerified,
      'createdAt': createdAt.toIso8601String(),
    };
  }
}
