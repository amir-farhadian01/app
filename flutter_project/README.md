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

### Flutter web on WSL2 (devtools / WebSocket)
- **Recommended for daily dev** (DDC + stable tooling): run with Chrome instead of `web-server`:
  `flutter run -d chrome --web-port=9088 --dart-define=API_BASE_URL=http://localhost:8077`
- **Script**: `./run-web.sh` uses `web-server` on `0.0.0.0` for LAN access. If you see `DartDevelopmentServiceException` / WebSocket not upgraded, use Chrome as above, or run **release** mode (no DDC):  
  `flutter run -d web-server --web-hostname=0.0.0.0 --web-port=9088 --release --dart-define=API_BASE_URL=http://localhost:8077`  
  The tool process may exit while the app is still served at `http://127.0.0.1:9088` in some setups; prefer **Chrome device** when the CLI crashes.

## Project Structure
- `lib/models`: Data models for User, Service, and Request.
- `lib/services`: Firebase integration service.
- `lib/screens`: UI screens for Auth, Home, Dashboard, and Service Details.
- `lib/widgets`: Reusable UI components.
