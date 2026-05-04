class UserStats {
  final int totalRequests;
  final int completedRequests;
  final int activeContracts;
  final double rating;
  final int reviewsCount;
  final int servicesCount;

  UserStats({
    this.totalRequests = 0,
    this.completedRequests = 0,
    this.activeContracts = 0,
    this.rating = 0.0,
    this.reviewsCount = 0,
    this.servicesCount = 0,
  });

  factory UserStats.fromMap(Map<String, dynamic> map) {
    return UserStats(
      totalRequests: map['totalRequests'] ?? 0,
      completedRequests: map['completedRequests'] ?? 0,
      activeContracts: map['activeContracts'] ?? 0,
      rating: (map['rating'] ?? 0).toDouble(),
      reviewsCount: map['reviewsCount'] ?? 0,
      servicesCount: map['servicesCount'] ?? 0,
    );
  }
}

class KycStatus {
  final int level; // 0 = none, 1 = email+phone, 2 = identity verified
  final String status; // pending, verified, rejected
  final bool emailVerified;
  final bool phoneVerified;
  final bool identityVerified;
  final String? identityDocumentUrl;
  final String? identityDocumentType; // passport, drivers_license, national_id
  final DateTime? kycSubmittedAt;
  final DateTime? kycVerifiedAt;
  final String? reviewNote;

  const KycStatus({
    this.level = 0,
    this.status = 'pending',
    this.emailVerified = false,
    this.phoneVerified = false,
    this.identityVerified = false,
    this.identityDocumentUrl,
    this.identityDocumentType,
    this.kycSubmittedAt,
    this.kycVerifiedAt,
    this.reviewNote,
  });

  factory KycStatus.fromMap(Map<String, dynamic>? map) {
    if (map == null) return const KycStatus();

    return KycStatus(
      level: map['level'] ?? 0,
      status: map['status']?.toString() ?? 'pending',
      emailVerified: map['emailVerified'] == true,
      phoneVerified: map['phoneVerified'] == true,
      identityVerified: map['identityVerified'] == true,
      identityDocumentUrl: map['identityDocumentUrl']?.toString(),
      identityDocumentType: map['identityDocumentType']?.toString(),
      kycSubmittedAt: map['kycSubmittedAt'] != null
          ? DateTime.tryParse(map['kycSubmittedAt'].toString())
          : null,
      kycVerifiedAt: map['kycVerifiedAt'] != null
          ? DateTime.tryParse(map['kycVerifiedAt'].toString())
          : null,
      reviewNote: map['reviewNote']?.toString(),
    );
  }

  bool get canPlaceOrder => level >= 2 && status == 'verified';

  String get kycLevelText {
    switch (level) {
      case 0:
        return 'Not Started';
      case 1:
        return 'Level 1 (Basic)';
      case 2:
        return 'Level 2 (Verified)';
      default:
        return 'Unknown';
    }
  }
}

class UserModel {
  final String uid;
  final String email;
  final String displayName;
  final String? firstName;
  final String? lastName;
  final String role;
  final String? photoURL;
  final String? bio;
  final String? location;
  final String? phone;
  final String? companyId;
  final String status;
  final bool isVerified;
  final bool mfaEnabled;
  final bool googleLinked;
  final Map<String, dynamic>? accountPreferences;
  final DateTime createdAt;
  final DateTime? updatedAt;
  final UserStats? stats;
  final KycStatus kyc;

  UserModel({
    required this.uid,
    required this.email,
    required this.displayName,
    this.firstName,
    this.lastName,
    required this.role,
    this.photoURL,
    this.bio,
    this.location,
    this.phone,
    this.companyId,
    this.status = 'active',
    this.isVerified = false,
    this.mfaEnabled = false,
    this.googleLinked = false,
    this.accountPreferences,
    required this.createdAt,
    this.updatedAt,
    this.stats,
    this.kyc = const KycStatus(),
  });

  factory UserModel.fromMap(Map<String, dynamic> map) {
    final id = map['id']?.toString() ?? map['uid']?.toString() ?? '';
    final createdRaw = map['createdAt'];
    DateTime createdAt;
    if (createdRaw is String) {
      createdAt = DateTime.tryParse(createdRaw) ?? DateTime.now();
    } else if (createdRaw != null) {
      createdAt = DateTime.tryParse(createdRaw.toString()) ?? DateTime.now();
    } else {
      createdAt = DateTime.now();
    }

    final updatedRaw = map['updatedAt'];
    DateTime? updatedAt;
    if (updatedRaw is String) {
      updatedAt = DateTime.tryParse(updatedRaw);
    } else if (updatedRaw != null) {
      updatedAt = DateTime.tryParse(updatedRaw.toString());
    }

    return UserModel(
      uid: id,
      email: map['email']?.toString() ?? '',
      displayName: map['displayName']?.toString() ?? '',
      firstName: map['firstName']?.toString(),
      lastName: map['lastName']?.toString(),
      role: map['role']?.toString() ?? 'customer',
      photoURL: map['photoURL']?.toString() ?? map['avatarUrl']?.toString(),
      bio: map['bio']?.toString(),
      location: map['location']?.toString(),
      phone: map['phone']?.toString(),
      companyId: map['companyId']?.toString(),
      status: map['status']?.toString() ?? 'active',
      isVerified: map['isVerified'] == true,
      mfaEnabled: map['mfaEnabled'] == true,
      googleLinked: map['googleLinked'] == true,
      accountPreferences: map['accountPreferences'] is Map
          ? Map<String, dynamic>.from(map['accountPreferences'] as Map)
          : null,
      createdAt: createdAt,
      updatedAt: updatedAt,
      stats: map['stats'] != null ? UserStats.fromMap(map['stats']) : null,
      kyc: KycStatus.fromMap(map['kyc'] ?? map),
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'uid': uid,
      'email': email,
      'displayName': displayName,
      if (firstName != null) 'firstName': firstName,
      if (lastName != null) 'lastName': lastName,
      'role': role,
      'photoURL': photoURL,
      'bio': bio,
      'location': location,
      'phone': phone,
      'companyId': companyId,
      'status': status,
      'isVerified': isVerified,
      'mfaEnabled': mfaEnabled,
      'createdAt': createdAt.toIso8601String(),
      if (updatedAt != null) 'updatedAt': updatedAt!.toIso8601String(),
      if (stats != null) 'stats': {
        'totalRequests': stats!.totalRequests,
        'completedRequests': stats!.completedRequests,
        'activeContracts': stats!.activeContracts,
        'rating': stats!.rating,
        'reviewsCount': stats!.reviewsCount,
        'servicesCount': stats!.servicesCount,
      },
      'kyc': {
        'level': kyc.level,
        'status': kyc.status,
        'emailVerified': kyc.emailVerified,
        'phoneVerified': kyc.phoneVerified,
        'identityVerified': kyc.identityVerified,
        if (kyc.identityDocumentUrl != null) 'identityDocumentUrl': kyc.identityDocumentUrl,
        if (kyc.identityDocumentType != null) 'identityDocumentType': kyc.identityDocumentType,
        if (kyc.kycSubmittedAt != null) 'kycSubmittedAt': kyc.kycSubmittedAt!.toIso8601String(),
        if (kyc.kycVerifiedAt != null) 'kycVerifiedAt': kyc.kycVerifiedAt!.toIso8601String(),
      },
    };
  }

  UserModel copyWith({
    String? displayName,
    String? firstName,
    String? lastName,
    String? photoURL,
    String? bio,
    String? location,
    String? phone,
    bool? googleLinked,
    Map<String, dynamic>? accountPreferences,
    UserStats? stats,
    KycStatus? kyc,
  }) {
    return UserModel(
      uid: uid,
      email: email,
      displayName: displayName ?? this.displayName,
      firstName: firstName ?? this.firstName,
      lastName: lastName ?? this.lastName,
      role: role,
      photoURL: photoURL ?? this.photoURL,
      bio: bio ?? this.bio,
      location: location ?? this.location,
      phone: phone ?? this.phone,
      companyId: companyId,
      status: status,
      isVerified: isVerified,
      mfaEnabled: mfaEnabled,
      googleLinked: googleLinked ?? this.googleLinked,
      accountPreferences: accountPreferences ?? this.accountPreferences,
      createdAt: createdAt,
      updatedAt: updatedAt,
      stats: stats ?? this.stats,
      kyc: kyc ?? this.kyc,
    );
  }
}
