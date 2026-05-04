# Neighborly Flutter Project

A comprehensive community service-sharing platform built with Flutter and Firebase.

## Features
- **Customer Dashboard**: Browse services, view details, book service.
- **Provider Dashboard**: Manage services and requests.
- **Admin Flow**: Manage users and services.
- **Real-time Backend**: Firebase Firestore and Auth integration.

## Getting Started
1. Install Flutter (>=3.0.0).
2. Run `flutter pub get` to install dependencies.
3. Configure Firebase for Android and iOS in the Firebase Console.
4. Download and place `google-services.json` (Android) and `GoogleService-Info.plist` (iOS) in the appropriate directories.
5. Run `flutter run`.

## Project Structure
- `lib/models`: Data models for User, Service, and Request.
- `lib/services`: Firebase integration service.
- `lib/screens`: UI screens for Auth, Home, Dashboard, and Service Details.
- `lib/widgets`: Reusable UI components.
