import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_web_plugins/flutter_web_plugins.dart';
import 'package:provider/provider.dart';

import 'routing/app_navigator.dart' show NeighborlyRouteObserver, neighborlyNavigatorKey;
import 'routing/app_paths.dart';
import 'models/order_models.dart';
import 'screens/admin_dashboard_screen.dart';
import 'routing/auth_route_args.dart';
import 'screens/auth_screen.dart';
import 'screens/contract_screen.dart';
import 'screens/explorer_screen.dart';
import 'screens/home_screen.dart';
import 'screens/create_order_wizard_screen.dart';
import 'screens/notifications_screen.dart';
import 'screens/order_detail_screen.dart';
import 'screens/provider_order_detail_screen.dart';
import 'screens/provider_dashboard_screen.dart';
import 'screens/customer_home_screen.dart';
import 'screens/my_orders_screen.dart';
import 'screens/orders_list_screen.dart';
import 'screens/provider_workspace_company_screen.dart';
import 'screens/provider_workspace_inventory_screen.dart';
import 'screens/provider_workspace_packages_screen.dart';
import 'screens/neighborly_settings_screen.dart';
import 'screens/profile_screen.dart';
import 'screens/provider/account_screen.dart';
import 'screens/role_dashboard_gate.dart';
import 'screens/service_loader_screen.dart';
import 'services/neighborly_api_service.dart';
import 'services/neighborly_theme_notifier.dart';
import 'theme/neighborly_theme.dart';
import 'widgets/neighborly_shell.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  usePathUrlStrategy();
  final api = NeighborlyApiService();
  // Never block the first frame on network/refresh — blank white screen until runApp().
  runApp(_NeighborlyBootstrap(api: api));
}

/// Loads prefs + `/api/auth/me` after first paint so the browser never sits on a white screen.
class _NeighborlyBootstrap extends StatefulWidget {
  const _NeighborlyBootstrap({required this.api});

  final NeighborlyApiService api;

  @override
  State<_NeighborlyBootstrap> createState() => _NeighborlyBootstrapState();
}

class _NeighborlyBootstrapState extends State<_NeighborlyBootstrap> {
  bool _ready = false;
  String? _fatal;

  @override
  void initState() {
    super.initState();
    _start();
  }

  Future<void> _start() async {
    try {
      await widget.api.init();
      if (mounted) setState(() => _ready = true);
    } catch (e) {
      if (mounted) setState(() => _fatal = e.toString());
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_fatal != null) {
      return MaterialApp(
        debugShowCheckedModeBanner: false,
        locale: const Locale('en', 'CA'),
        supportedLocales: const [Locale('en', 'CA'), Locale('en', 'US'), Locale('en')],
        localizationsDelegates: const [
          GlobalMaterialLocalizations.delegate,
          GlobalWidgetsLocalizations.delegate,
          GlobalCupertinoLocalizations.delegate,
        ],
        theme: NeighborlyTheme.dark(),
        home: Scaffold(
          backgroundColor: NeighborlyTheme.dark().scaffoldBackgroundColor,
          body: Center(
            child: Padding(
              padding: const EdgeInsets.all(24),
              child: SelectableText(
                'Could not start app:\n$_fatal',
                textAlign: TextAlign.center,
              ),
            ),
          ),
        ),
      );
    }
    if (!_ready) {
      final bg = NeighborlyTheme.dark().scaffoldBackgroundColor;
      return MaterialApp(
        debugShowCheckedModeBanner: false,
        locale: const Locale('en', 'CA'),
        supportedLocales: const [Locale('en', 'CA'), Locale('en', 'US'), Locale('en')],
        localizationsDelegates: const [
          GlobalMaterialLocalizations.delegate,
          GlobalWidgetsLocalizations.delegate,
          GlobalCupertinoLocalizations.delegate,
        ],
        theme: NeighborlyTheme.dark(),
        home: Scaffold(
          backgroundColor: bg,
          body: Center(
            child: CircularProgressIndicator(color: NeighborlyTheme.dark().colorScheme.primary),
          ),
        ),
      );
    }
    return NeighborlyApp(api: widget.api);
  }
}

/// Entry for `/dashboard`: requires session (same as React `/dashboard`).
class _DashboardEntry extends StatelessWidget {
  const _DashboardEntry();

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: context.watch<NeighborlyApiService>(),
      builder: (context, _) {
        final api = context.read<NeighborlyApiService>();
        if (api.user == null) {
          return const AuthScreen();
        }
        return const RoleDashboardGate();
      },
    );
  }
}

/// Entry for specific admin pages with initial page selection
class _AdminDashboardEntry extends StatelessWidget {
  final AdminPage initialPage;

  const _AdminDashboardEntry({required this.initialPage});

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: context.watch<NeighborlyApiService>(),
      builder: (context, _) {
        final api = context.read<NeighborlyApiService>();
        if (api.user == null) {
          return const AuthScreen();
        }
        // Check if user has admin role
        final adminRoles = {'owner', 'platform_admin', 'support', 'finance'};
        if (!adminRoles.contains(api.user?.role)) {
          return const RoleDashboardGate();
        }
        return AdminDashboardScreen(initialPage: initialPage);
      },
    );
  }
}

class NeighborlyApp extends StatelessWidget {
  const NeighborlyApp({super.key, required this.api});

  final NeighborlyApiService api;

  static Route<dynamic>? onGenerateRoute(RouteSettings settings) {
    var name = settings.name ?? '/';
    name = stripFlutterBase(name);
    final uri = Uri.tryParse(name) ?? Uri(path: name);
    final path = uri.path.isEmpty ? '/' : uri.path;

    Widget page;
    switch (path) {
      case '/auth':
      case '/login':
        final args = settings.arguments is AuthRouteArgs
            ? settings.arguments as AuthRouteArgs
            : null;
        final resume = args?.resumeAfterAuth == true ||
            uri.queryParameters['resumeAfterAuth'] == '1';
        page = AuthScreen(
          resumeAfterAuth: resume,
          returnToPath: args?.returnToPath ?? uri.queryParameters['returnTo'],
          returnToPostId: args?.postId ?? uri.queryParameters['post'],
        );
        break;
      case '/dashboard':
      case '/admin':
      case '/admin/overview':
        page = const _DashboardEntry();
        break;
      case '/admin/users':
        page = const _AdminDashboardEntry(initialPage: AdminPage.users);
        break;
      case '/admin/kyc':
        page = const _AdminDashboardEntry(initialPage: AdminPage.kycReview);
        break;
      case '/admin/services':
        page = const _AdminDashboardEntry(initialPage: AdminPage.services);
        break;
      case '/admin/teams':
        page = const _AdminDashboardEntry(initialPage: AdminPage.teams);
        break;
      case '/admin/cms':
        page = const _AdminDashboardEntry(initialPage: AdminPage.cms);
        break;
      case '/home':
        String? explorerInitCategory;
        final arg = settings.arguments;
        if (arg is Map) {
          final s = arg['initialCategorySlug']?.toString();
          if (s != null && s.isNotEmpty) explorerInitCategory = s;
        }
        page = ExplorerScreen(initialCategorySlug: explorerInitCategory);
        break;
      case '/':
        page = const HomeScreen();
        break;
      case '/profile':
      case '/account':
        page = const ProfileScreen();
        break;
      case '/workspace/packages':
        page = const ProviderWorkspacePackagesScreen();
        break;
      case '/workspace/inventory':
        page = const ProviderWorkspaceInventoryScreen();
        break;
      case '/workspace/company':
        page = const ProviderWorkspaceCompanyScreen();
        break;
      case '/customer-home':
        page = const CustomerHomeScreen();
        break;
      case '/my-orders':
        page = const MyOrdersScreen();
        break;
      case '/orders':
        page = const OrdersListScreen();
        break;
      case '/provider/account':
        page = const ProviderAccountScreen();
        break;
      case '/provider/orders':
        page = const OrdersListScreen();
        break;
      case '/provider/dashboard':
        page = const ProviderDashboardScreen();
        break;
      case '/provider/notifications':
        page = const NotificationsScreen();
        break;
      case '/provider/settings':
        page = const NeighborlySettingsScreen();
        break;
      case '/orders/new':
        final fromQuery = uri.queryParameters['entryPoint'];
        final entryPoint = switch (fromQuery) {
          'ai_suggestion' => OrderEntryPoint.aiSuggestion,
          'direct' => OrderEntryPoint.direct,
          _ => OrderEntryPoint.explorer,
        };
        page = CreateOrderWizardScreen(
          entryPoint: entryPoint,
          prefillServiceCatalogId: uri.queryParameters['serviceCatalogId'],
          homeCategorySlug: uri.queryParameters['homeCategory'],
          prefillProviderId: uri.queryParameters['prefillProviderId'],
          newOffer: uri.queryParameters['newOffer'] == '1',
          initialBookingMode: uri.queryParameters['bookingMode'],
        );
        break;
      default:
        if (path.startsWith('/provider/orders/')) {
          final id = path.substring('/provider/orders/'.length);
          if (id.isNotEmpty && !id.contains('/')) {
            page = ProviderOrderDetailScreen(orderId: id);
            break;
          }
        }
        if (path.startsWith('/orders/')) {
          final id = path.substring('/orders/'.length);
          if (id.isNotEmpty && !id.contains('/')) {
            page = OrderDetailScreen(orderId: id);
            break;
          }
        }
        if (path.startsWith('/contract/')) {
          final id = path.substring('/contract/'.length);
          if (id.isNotEmpty && !id.contains('/')) {
            page = ContractScreen(contractId: id);
            break;
          }
        }
        if (path.startsWith('/service/')) {
          final id = path.substring('/service/'.length);
          if (id.isNotEmpty && !id.contains('/')) {
            page = ServiceLoaderScreen(serviceId: id);
            break;
          }
        }
        page = const HomeScreen();
        break;
    }
    return MaterialPageRoute<void>(
      settings: RouteSettings(name: path, arguments: settings.arguments),
      builder: (_) => page,
    );
  }

  @override
  Widget build(BuildContext context) {
    var initial = stripFlutterBase(Uri.base.path);
    if (initial.contains('?')) {
      initial = initial.split('?').first;
    }

    return MultiProvider(
      providers: [
        ChangeNotifierProvider<NeighborlyApiService>.value(value: api),
        ChangeNotifierProvider<NeighborlyThemeNotifier>(create: (_) => NeighborlyThemeNotifier()),
      ],
      child: Consumer<NeighborlyThemeNotifier>(
        builder: (context, themeNotifier, _) {
          return MaterialApp(
            title: 'Neighborly',
            debugShowCheckedModeBanner: false,
            navigatorKey: neighborlyNavigatorKey,
            navigatorObservers: [NeighborlyRouteObserver()],
            locale: const Locale('en', 'CA'),
            supportedLocales: const [
              Locale('en', 'CA'),
              Locale('en', 'US'),
              Locale('en'),
            ],
            localizationsDelegates: const [
              GlobalMaterialLocalizations.delegate,
              GlobalWidgetsLocalizations.delegate,
              GlobalCupertinoLocalizations.delegate,
            ],
            initialRoute: initial,
            onGenerateRoute: onGenerateRoute,
            theme: NeighborlyTheme.light(),
            darkTheme: NeighborlyTheme.dark(),
            themeMode: themeNotifier.themeMode,
            builder: (context, child) => NeighborlyShell(child: child),
          );
        },
      ),
    );
  }
}
