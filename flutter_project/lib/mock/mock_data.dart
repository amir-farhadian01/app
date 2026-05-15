/// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/// Neighborly Mock Data
/// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/// All hardcoded mock data for the UI shell. No backend calls.
/// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

import 'package:flutter/material.dart';

enum MockUserRole { customer, soloProvider, businessOwner, admin }

class MockUser {
  final String id;
  final String name;
  final String avatar;
  final MockUserRole role;
  final double rating;

  const MockUser({
    required this.id,
    required this.name,
    required this.avatar,
    required this.role,
    this.rating = 0.0,
  });
}

class MockService {
  final String id;
  final String title;
  final String category;
  final double price;
  final String providerName;
  final String providerAvatar;
  final String imageUrl;
  final double rating;
  final int reviewCount;
  final String description;
  final List<String> includes;

  const MockService({
    required this.id,
    required this.title,
    required this.category,
    required this.price,
    required this.providerName,
    required this.providerAvatar,
    required this.imageUrl,
    this.rating = 5.0,
    this.reviewCount = 0,
    this.description = '',
    this.includes = const [],
  });
}

enum MockOrderStatus { active, past, cancelled }

class MockOrder {
  final String id;
  final String serviceName;
  final String providerName;
  final MockOrderStatus status;
  final String date;
  final double price;

  const MockOrder({
    required this.id,
    required this.serviceName,
    required this.providerName,
    required this.status,
    required this.date,
    required this.price,
  });
}

class MockPost {
  final String id;
  final String authorName;
  final String authorAvatar;
  final String imageUrl;
  final String caption;
  final int likes;
  final int comments;

  const MockPost({
    required this.id,
    required this.authorName,
    required this.authorAvatar,
    required this.imageUrl,
    required this.caption,
    this.likes = 0,
    this.comments = 0,
  });
}

// ── Mock Users ────────────────────────────────────────────────────────

const mockUsers = [
  MockUser(
    id: 'u1',
    name: 'Alex Johnson',
    avatar: 'https://picsum.photos/seed/avatar1/200/200',
    role: MockUserRole.customer,
    rating: 4.8,
  ),
  MockUser(
    id: 'u2',
    name: 'Maria Garcia',
    avatar: 'https://picsum.photos/seed/avatar2/200/200',
    role: MockUserRole.soloProvider,
    rating: 4.9,
  ),
  MockUser(
    id: 'u3',
    name: 'CleanPro Services',
    avatar: 'https://picsum.photos/seed/avatar3/200/200',
    role: MockUserRole.businessOwner,
    rating: 4.7,
  ),
  MockUser(
    id: 'u4',
    name: 'Admin User',
    avatar: 'https://picsum.photos/seed/avatar4/200/200',
    role: MockUserRole.admin,
    rating: 5.0,
  ),
  MockUser(
    id: 'u5',
    name: 'Sarah Williams',
    avatar: 'https://picsum.photos/seed/avatar5/200/200',
    role: MockUserRole.customer,
    rating: 4.5,
  ),
];

// ── Mock Services ─────────────────────────────────────────────────────

const mockServices = [
  MockService(
    id: 's1',
    title: 'Professional Home Cleaning',
    category: 'Home',
    price: 79.99,
    providerName: 'CleanPro Services',
    providerAvatar: 'https://picsum.photos/seed/avatar3/200/200',
    imageUrl: 'https://picsum.photos/seed/cleaning/400/300',
    rating: 4.8,
    reviewCount: 124,
    description:
        'A thorough top-to-bottom cleaning of your entire home. Our experienced team uses eco-friendly products to leave your space sparkling clean. Perfect for weekly, bi-weekly, or monthly maintenance.',
    includes: ['Dusting all surfaces', 'Vacuuming & mopping floors', 'Kitchen & bathroom deep clean', 'Trash removal'],
  ),
  MockService(
    id: 's2',
    title: 'Hair Styling & Cut',
    category: 'Beauty',
    price: 45.00,
    providerName: 'Maria Garcia',
    providerAvatar: 'https://picsum.photos/seed/avatar2/200/200',
    imageUrl: 'https://picsum.photos/seed/hair/400/300',
    rating: 4.9,
    reviewCount: 89,
    description:
        'Professional haircut and styling tailored to your preferences. Consultation included to find the perfect look for your face shape and lifestyle.',
    includes: ['Consultation', 'Hair wash', 'Cut & style', 'Product recommendations'],
  ),
  MockService(
    id: 's3',
    title: 'Auto Detailing Package',
    category: 'Auto',
    price: 129.99,
    providerName: 'Elite Auto Care',
    providerAvatar: 'https://picsum.photos/seed/avatar6/200/200',
    imageUrl: 'https://picsum.photos/seed/auto/400/300',
    rating: 4.7,
    reviewCount: 56,
    description:
        'Complete auto detailing service including exterior wash, wax, interior vacuum, and dashboard conditioning. Your car will look showroom-ready.',
    includes: ['Exterior hand wash & wax', 'Interior vacuum & wipe-down', 'Window cleaning', 'Tire shine'],
  ),
  MockService(
    id: 's4',
    title: 'Gourmet Meal Prep',
    category: 'Food',
    price: 35.00,
    providerName: 'Chef Marco',
    providerAvatar: 'https://picsum.photos/seed/avatar7/200/200',
    imageUrl: 'https://picsum.photos/seed/food/400/300',
    rating: 4.6,
    reviewCount: 203,
    description:
        'Weekly meal prep service with fresh, locally-sourced ingredients. Choose from 10+ rotating menus including vegetarian, keto, and gluten-free options.',
    includes: ['5 prepared meals', 'Nutrition info card', 'Reusable packaging', 'Delivery included'],
  ),
  MockService(
    id: 's5',
    title: 'Event Photography',
    category: 'Events',
    price: 199.00,
    providerName: 'Lens & Light Studio',
    providerAvatar: 'https://picsum.photos/seed/avatar8/200/200',
    imageUrl: 'https://picsum.photos/seed/photo/400/300',
    rating: 4.9,
    reviewCount: 78,
    description:
        'Professional event photography for birthdays, anniversaries, and small gatherings. High-resolution edited photos delivered within 48 hours.',
    includes: ['2 hours coverage', '50+ edited photos', 'Online gallery', 'Print release'],
  ),
];

// ── Mock Orders ───────────────────────────────────────────────────────

const mockOrders = [
  MockOrder(
    id: 'o1',
    serviceName: 'Professional Home Cleaning',
    providerName: 'CleanPro Services',
    status: MockOrderStatus.active,
    date: 'May 20, 2026 at 10:00 AM',
    price: 79.99,
  ),
  MockOrder(
    id: 'o2',
    serviceName: 'Hair Styling & Cut',
    providerName: 'Maria Garcia',
    status: MockOrderStatus.active,
    date: 'May 22, 2026 at 2:30 PM',
    price: 45.00,
  ),
  MockOrder(
    id: 'o3',
    serviceName: 'Auto Detailing Package',
    providerName: 'Elite Auto Care',
    status: MockOrderStatus.past,
    date: 'May 10, 2026 at 9:00 AM',
    price: 129.99,
  ),
  MockOrder(
    id: 'o4',
    serviceName: 'Gourmet Meal Prep',
    providerName: 'Chef Marco',
    status: MockOrderStatus.cancelled,
    date: 'May 5, 2026 at 11:00 AM',
    price: 35.00,
  ),
];

// ── Mock Posts (Social Feed) ──────────────────────────────────────────

const mockPosts = [
  MockPost(
    id: 'p1',
    authorName: 'Sarah Williams',
    authorAvatar: 'https://picsum.photos/seed/avatar5/200/200',
    imageUrl: 'https://picsum.photos/seed/post1/600/400',
    caption: 'Just had the most amazing home cleaning service! My house has never looked better. Highly recommend CleanPro! 🧹✨',
    likes: 24,
    comments: 5,
  ),
  MockPost(
    id: 'p2',
    authorName: 'Mike Thompson',
    authorAvatar: 'https://picsum.photos/seed/avatar9/200/200',
    imageUrl: 'https://picsum.photos/seed/post2/600/400',
    caption: 'Tried the gourmet meal prep from Chef Marco this week. The lemon herb chicken is incredible! 🍗🥗',
    likes: 18,
    comments: 3,
  ),
  MockPost(
    id: 'p3',
    authorName: 'Emily Chen',
    authorAvatar: 'https://picsum.photos/seed/avatar10/200/200',
    imageUrl: 'https://picsum.photos/seed/post3/600/400',
    caption: 'Great experience with Maria for a haircut. She really listened to what I wanted. New look, who dis? 💇‍♀️',
    likes: 32,
    comments: 8,
  ),
];

// ── Featured Banners ──────────────────────────────────────────────────

class MockBanner {
  final String title;
  final String subtitle;
  final String imageUrl;
  final Color backgroundColor;

  const MockBanner({
    required this.title,
    required this.subtitle,
    required this.imageUrl,
    required this.backgroundColor,
  });
}

const mockBanners = [
  MockBanner(
    title: 'Summer Special',
    subtitle: '20% off all home services',
    imageUrl: 'https://picsum.photos/seed/banner1/800/300',
    backgroundColor: Color(0xFF01696F),
  ),
  MockBanner(
    title: 'New on Neighborly',
    subtitle: 'Book event photographers near you',
    imageUrl: 'https://picsum.photos/seed/banner2/800/300',
    backgroundColor: Color(0xFF4F98A3),
  ),
  MockBanner(
    title: 'Refer a Friend',
    subtitle: 'Get \$15 credit for each referral',
    imageUrl: 'https://picsum.photos/seed/banner3/800/300',
    backgroundColor: Color(0xFFF97316),
  ),
];

// ── Categories ────────────────────────────────────────────────────────

class MockCategory {
  final String name;
  final String icon;

  const MockCategory({required this.name, required this.icon});
}

const mockCategories = [
  MockCategory(name: 'All', icon: 'grid_view'),
  MockCategory(name: 'Beauty', icon: 'spa'),
  MockCategory(name: 'Auto', icon: 'directions_car'),
  MockCategory(name: 'Home', icon: 'home'),
  MockCategory(name: 'Food', icon: 'restaurant'),
  MockCategory(name: 'Events', icon: 'celebration'),
  MockCategory(name: 'Transport', icon: 'local_shipping'),
  MockCategory(name: 'Health', icon: 'favorite'),
  MockCategory(name: 'Education', icon: 'school'),
  MockCategory(name: 'Tech', icon: 'computer'),
];

// ── KYC Queue (Admin) ─────────────────────────────────────────────────

class MockKycUser {
  final String name;
  final String email;
  final String status; // 'pending', 'approved', 'rejected'
  final String avatar;

  const MockKycUser({
    required this.name,
    required this.email,
    required this.status,
    required this.avatar,
  });
}

const mockKycQueue = [
  MockKycUser(
    name: 'John Doe',
    email: 'john@example.com',
    status: 'pending',
    avatar: 'https://picsum.photos/seed/kyc1/200/200',
  ),
  MockKycUser(
    name: 'Jane Smith',
    email: 'jane@example.com',
    status: 'pending',
    avatar: 'https://picsum.photos/seed/kyc2/200/200',
  ),
  MockKycUser(
    name: 'Bob Wilson',
    email: 'bob@example.com',
    status: 'pending',
    avatar: 'https://picsum.photos/seed/kyc3/200/200',
  ),
];
