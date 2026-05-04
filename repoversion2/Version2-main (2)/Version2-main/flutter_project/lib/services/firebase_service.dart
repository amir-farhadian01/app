import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';
import '../models/user_model.dart';
import '../models/service_model.dart';
import '../models/request_model.dart';
import '../models/company_model.dart';
import '../models/kyc_model.dart';

class FirebaseService {
  final FirebaseAuth _auth = FirebaseAuth.instance;
  final FirebaseFirestore _db = FirebaseFirestore.instance;

  // Auth
  Stream<User?> get user => _auth.authStateChanges();

  Future<UserModel?> getUserModel(String uid) async {
    final doc = await _db.collection('users').doc(uid).get();
    if (doc.exists) {
      return UserModel.fromMap(doc.data()!);
    }
    return null;
  }

  // Services
  Stream<List<ServiceModel>> getServices({String? category}) {
    Query query = _db.collection('services');
    if (category != null) {
      query = query.where('category', isEqualTo: category);
    }
    return query.snapshots().map((snapshot) => snapshot.docs
        .map((doc) => ServiceModel.fromMap(doc.data() as Map<String, dynamic>, doc.id))
        .toList());
  }

  Future<void> addService(ServiceModel service) {
    return _db.collection('services').add(service.toMap());
  }

  // Requests
  Stream<List<RequestModel>> getRequests(String userId, String role) {
    Query query = _db.collection('requests');
    if (role == 'customer') {
      query = query.where('customerId', isEqualTo: userId);
    } else if (role == 'provider') {
      query = query.where('providerId', isEqualTo: userId);
    }
    return query.snapshots().map((snapshot) => snapshot.docs
        .map((doc) => RequestModel.fromMap(doc.data() as Map<String, dynamic>, doc.id))
        .toList());
  }

  Future<void> addRequest(RequestModel request) {
    return _db.collection('requests').add(request.toMap());
  }

  Future<void> updateRequestStatus(String requestId, String status) {
    return _db.collection('requests').doc(requestId).update({'status': status});
  }

  // Companies
  Future<CompanyModel?> getCompany(String companyId) async {
    final doc = await _db.collection('companies').doc(companyId).get();
    if (doc.exists) {
      return CompanyModel.fromMap(doc.data()!, doc.id);
    }
    return null;
  }

  // KYC
  Stream<KycModel?> getKycStatus(String userId) {
    return _db
        .collection('kyc')
        .where('userId', isEqualTo: userId)
        .snapshots()
        .map((snapshot) {
      if (snapshot.docs.isNotEmpty) {
        return KycModel.fromMap(
            snapshot.docs[0].data() as Map<String, dynamic>, snapshot.docs[0].id);
      }
      return null;
    });
  }

  Future<void> submitKyc(KycModel kyc) {
    return _db.collection('kyc').add(kyc.toMap());
  }

  // Become Provider
  Future<void> becomeProvider(String userId) async {
    // Check KYC first
    final kycSnap = await _db
        .collection('kyc')
        .where('userId', isEqualTo: userId)
        .where('status', isEqualTo: 'verified')
        .get();

    if (kycSnap.docs.isEmpty) {
      throw Exception("KYC Level 1 verification required.");
    }

    return _db.collection('users').doc(userId).update({
      'role': 'provider',
      'status': 'pending_verification',
    });
  }

  // Audit Logs
  Future<void> logAction(String action, String resourceType, String resourceId, Map<String, dynamic> metadata) {
    return _db.collection('audit_logs').add({
      'actorId': _auth.currentUser?.uid,
      'action': action,
      'resourceType': resourceType,
      'resourceId': resourceId,
      'metadata': metadata,
      'timestamp': DateTime.now().toIso8601String(),
    });
  }
}
