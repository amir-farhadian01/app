import 'dart:async';

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../models/order_models.dart';
import '../order/category_path_resolve.dart';
import '../order/step2_booking_form.dart';
import '../routing/app_navigator.dart';
import '../routing/auth_route_args.dart';
import '../services/neighborly_api_service.dart';

class CreateOrderWizardScreen extends StatefulWidget {
  const CreateOrderWizardScreen({
    super.key,
    this.prefillServiceCatalogId,
    required this.entryPoint,
    this.homeCategorySlug,
    this.prefillProviderId,
    this.newOffer = false,
    this.initialBookingMode,
  });

  final String? prefillServiceCatalogId;
  final OrderEntryPoint entryPoint;
  final String? homeCategorySlug;
  final String? prefillProviderId;
  final bool newOffer;
  /// Optional override from `/orders/new?bookingMode=` (must match backend wire values).
  final String? initialBookingMode;

  @override
  State<CreateOrderWizardScreen> createState() => _CreateOrderWizardScreenState();
}

class _CreateOrderWizardScreenState extends State<CreateOrderWizardScreen> {
  final _descController = TextEditingController();
  final _addressController = TextEditingController();
  final _categorySuggestController = TextEditingController();
  final _otherBodyController = TextEditingController();

  Timer? _suggestDebounce;
  bool _submitting = false;
  String? _error;
  String? _categoryNote;
  List<CategorySearchHit> _categorySuggestHits = const [];

  List<CategoryTreeNode> _tree = const [];
  bool _treeLoading = false;

  String? _selectedRootCategoryId;
  List<ServiceCatalogTile> _catalogTiles = const [];
  bool _catalogsLoading = false;
  String? _selectedCatalogId;
  OrderWizardArgs? _wizardArgs;

  bool _otherServiceMode = false;
  bool _otherTicketBusy = false;

  @override
  void initState() {
    super.initState();
    final pre = widget.prefillServiceCatalogId?.trim();
    if (pre != null && pre.isNotEmpty) {
      _selectedCatalogId = pre;
    }
    _categorySuggestController.addListener(_onCategorySuggestChanged);
    WidgetsBinding.instance.addPostFrameCallback((_) async {
      await _ensureTreeLoaded();
      if (!mounted) return;
      await _applyHomeCategoryDeepLink();
      if (!mounted) return;
      _syncWizardArgsFromCatalog();
    });
  }

  void _onCategorySuggestChanged() {
    _suggestDebounce?.cancel();
    _suggestDebounce = Timer(const Duration(milliseconds: 400), () {
      if (!mounted) return;
      final q = _categorySuggestController.text.trim();
      if (q.length < 2) {
        setState(() => _categorySuggestHits = const []);
        return;
      }
      void run() async {
        try {
          final api = context.read<NeighborlyApiService>();
          final list = await api.searchCategories(q.length > 120 ? q.substring(0, 120) : q, limit: 12);
          if (!mounted) return;
          setState(() => _categorySuggestHits = list.take(3).toList());
        } catch (_) {
          if (!mounted) return;
          setState(() => _categorySuggestHits = const []);
        }
      }

      run();
    });
  }

  Future<void> _ensureTreeLoaded() async {
    if (_tree.isNotEmpty || _treeLoading) return;
    setState(() => _treeLoading = true);
    try {
      final t = await context.read<NeighborlyApiService>().fetchCategoryTree();
      if (!mounted) return;
      setState(() {
        _tree = t;
        _treeLoading = false;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _tree = const [];
        _treeLoading = false;
        _categoryNote = 'Could not load categories. Check connection and retry.';
      });
    }
  }

  Future<void> _applyHomeCategoryDeepLink() async {
    if (widget.newOffer) return;
    final slug = widget.homeCategorySlug?.trim();
    if (slug == null || slug.isEmpty) return;
    if (_tree.isEmpty) return;

    try {
      final api = context.read<NeighborlyApiService>();
      final hits = await api.searchCategories(slug, limit: 12);
      if (!mounted) return;
      CategorySearchHit? withPath;
      for (final h in hits) {
        if (h.pathIds.isNotEmpty) {
          withPath = h;
          break;
        }
      }
      if (withPath != null && withPath.pathIds.isNotEmpty) {
        final rootId = withPath.pathIds.first;
        setState(() {
          _categoryNote = null;
          _selectedRootCategoryId = rootId;
        });
        await _loadCatalogTilesForRoot(rootId);
        if (!mounted) return;
        final pre = widget.prefillServiceCatalogId?.trim();
        if (pre != null && pre.isNotEmpty) {
          final exists = _catalogTiles.any((t) => t.id == pre);
          if (!exists && _catalogTiles.isNotEmpty) {
            setState(() => _categoryNote = 'Pre-filled catalog is outside this branch; pick a service type below.');
          }
        }
        return;
      }
    } catch (_) {
      /* fall through */
    }

    final pathIds = resolveHomeCategoryPathIds(_tree, slug);
    if (pathIds.isEmpty) {
      setState(() => _categoryNote = 'Unknown category "$slug". Pick a main category below.');
      return;
    }
    final rootId = pathIds.first;
    setState(() {
      _categoryNote = null;
      _selectedRootCategoryId = rootId;
    });
    await _loadCatalogTilesForRoot(rootId);
    if (!mounted) return;
    final pre = widget.prefillServiceCatalogId?.trim();
    if (pre != null && pre.isNotEmpty) {
      final exists = _catalogTiles.any((t) => t.id == pre);
      if (!exists && _catalogTiles.isNotEmpty) {
        setState(() => _categoryNote = 'Pre-filled catalog is outside this branch; pick a service type below.');
      }
    }
  }

  Future<void> _loadCatalogTilesForRoot(String rootId) async {
    setState(() {
      _catalogsLoading = true;
      _catalogTiles = const [];
    });
    try {
      final list = await context.read<NeighborlyApiService>().fetchServiceCatalogsByCategory(rootId, deep: true);
      if (!mounted) return;
      setState(() {
        _catalogTiles = list;
        _catalogsLoading = false;
        final pre = widget.prefillServiceCatalogId?.trim();
        if (_selectedCatalogId != null && _selectedCatalogId!.isNotEmpty) {
          final ok = list.any((t) => t.id == _selectedCatalogId);
          if (!ok && pre != null && pre.isNotEmpty) {
            /* keep orphan prefill id */
          } else if (!ok) {
            _selectedCatalogId = null;
          }
        }
        final sid = _selectedCatalogId?.trim();
        if (sid != null && sid.isNotEmpty && !_otherServiceMode) {
          _wizardArgs = _buildWizardArgs(_tileForCurrentSelection(), _wizardArgs);
        } else {
          _wizardArgs = null;
        }
      });
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _catalogTiles = const [];
        _catalogsLoading = false;
        _categoryNote = 'Could not load service types for this category.';
      });
    }
  }

  @override
  void dispose() {
    _suggestDebounce?.cancel();
    _categorySuggestController.removeListener(_onCategorySuggestChanged);
    _descController.dispose();
    _addressController.dispose();
    _categorySuggestController.dispose();
    _otherBodyController.dispose();
    super.dispose();
  }

  static String _slugifyMarketing(String raw) {
    final t = raw.trim().toLowerCase().replaceAll(RegExp(r'\s+'), '-');
    final s = t.replaceAll(RegExp(r'[^a-z0-9-]'), '');
    return s.isEmpty ? 'services' : s;
  }

  CategoryTreeNode? _findNodeById(String id) {
    CategoryTreeNode? walk(List<CategoryTreeNode> nodes) {
      for (final n in nodes) {
        if (n.id == id) return n;
        final found = walk(n.children);
        if (found != null) return found;
      }
      return null;
    }

    return walk(_tree);
  }

  /// Marketing slug for `homeCategory` query (root of branch, same as Home chips).
  String _resolvedHomeSlugForCatalogHit(ServiceCatalogSearchHit hit) {
    final catId = hit.categoryId?.trim();
    if (catId != null && catId.isNotEmpty && _tree.isNotEmpty) {
      final path = _pathIdsForCategory(catId);
      if (path.isNotEmpty) {
        final root = _findNodeById(path.first);
        if (root != null) return _slugifyMarketing(root.name);
      }
    }
    if (hit.breadcrumb.isNotEmpty) {
      return _slugifyMarketing(hit.breadcrumb.first);
    }
    return _slugifyMarketing(hit.name);
  }

  String _resolvedHomeSlugFromPathIds(List<String> pathIds) {
    if (pathIds.isEmpty) return 'services';
    final root = _findNodeById(pathIds.first);
    if (root != null) return _slugifyMarketing(root.name);
    return 'services';
  }

  void _replaceWizardRoute({required String homeCategory, String? serviceCatalogId}) {
    final q = <String, String>{
      'entryPoint': widget.entryPoint.wireValue,
      'homeCategory': homeCategory,
      if (serviceCatalogId != null && serviceCatalogId.trim().isNotEmpty)
        'serviceCatalogId': serviceCatalogId.trim(),
      if (widget.prefillProviderId != null && widget.prefillProviderId!.trim().isNotEmpty)
        'prefillProviderId': widget.prefillProviderId!.trim(),
      if (widget.newOffer) 'newOffer': '1',
    };
    neighborlyNavigatorKey.currentState?.pushReplacementNamed(
      '/orders/new?${Uri(queryParameters: q).query}',
    );
  }

  Future<void> _suggestCatalogFromDescription() async {
    final q = _descController.text.trim();
    if (q.length < 4) {
      setState(() => _error = 'Enter at least 4 characters, then suggest a service type.');
      return;
    }
    setState(() => _error = null);
    try {
      if (_tree.isEmpty) await _ensureTreeLoaded();
      if (!mounted) return;

      final slice = q.length > 120 ? q.substring(0, 120) : q;
      final list = await context.read<NeighborlyApiService>().searchServiceCatalogs(slice);
      if (!mounted) return;
      if (list.isEmpty) {
        setState(() => _error = 'No catalog matches — pick a main category or try different words.');
        return;
      }
      final first = list.first;
      final catId = first.categoryId?.trim();
      setState(() {
        _selectedCatalogId = first.id;
        _error = null;
        if (catId != null && catId.isNotEmpty) {
          final path = _pathIdsForCategory(catId);
          if (path.isNotEmpty) {
            _selectedRootCategoryId = path.first;
          }
        }
      });
      if (catId != null && catId.isNotEmpty) {
        final path = _pathIdsForCategory(catId);
        if (path.isNotEmpty) {
          await _loadCatalogTilesForRoot(path.first);
        }
      }
      if (!mounted) return;
      final homeSlug = _resolvedHomeSlugForCatalogHit(first);
      _replaceWizardRoute(homeCategory: homeSlug, serviceCatalogId: first.id);
    } catch (_) {
      if (!mounted) return;
      setState(() => _error = 'Could not search catalogs.');
    }
  }

  String _defaultAppointmentDate() {
    final t = DateTime.now().add(const Duration(days: 1));
    final m = t.month.toString().padLeft(2, '0');
    final d = t.day.toString().padLeft(2, '0');
    return '${t.year}-$m-$d';
  }

  ServiceCatalogTile _tileForCurrentSelection() {
    final id = _selectedCatalogId?.trim() ?? '';
    for (final t in _catalogTiles) {
      if (t.id == id) return t;
    }
    return ServiceCatalogTile(
      id: id.isEmpty ? 'unknown' : id,
      name: 'Selected service',
      slug: null,
      categoryId: null,
      lockedBookingMode: null,
    );
  }

  OrderWizardArgs _buildWizardArgs(ServiceCatalogTile tile, OrderWizardArgs? prev) {
    final reuse = prev != null && prev.serviceCatalogId == tile.id ? prev : null;
    final m = tile.resolvedBookingMode();
    final pid = widget.prefillProviderId?.trim();
    final prefillPid = (pid == null || pid.isEmpty) ? null : pid;

    final OrderWizardArgs built;
    switch (m) {
      case WizardBookingMode.autoAppointment:
        built = OrderWizardArgs(
          bookingMode: m.wireValue,
          catalogName: tile.name,
          serviceCatalogId: tile.id,
          prefillProviderId: prefillPid,
          datePreference: reuse?.datePreference ?? 'today',
          timeWindow: reuse?.timeWindow ?? 'morning',
          urgency: reuse?.urgency ?? 'immediate',
          contactPreference: reuse?.contactPreference ?? 'in_app',
          accessNotes: reuse?.accessNotes,
          serviceAddress: reuse?.serviceAddress,
          notes: reuse?.notes,
          careerName: reuse?.careerName,
          providerName: reuse?.providerName ?? reuse?.prefillProviderName,
          bookingDate: reuse?.bookingDate,
          bookingTime: reuse?.bookingTime,
          budgetMin: reuse?.budgetMin,
          budgetMax: reuse?.budgetMax,
        );
        break;
      case WizardBookingMode.inheritFromCatalog:
        final addr = reuse?.serviceAddress ?? _addressController.text.trim();
        built = OrderWizardArgs(
          bookingMode: m.wireValue,
          catalogName: tile.name,
          serviceCatalogId: tile.id,
          prefillProviderId: prefillPid,
          bookingDate: reuse?.bookingDate ?? _defaultAppointmentDate(),
          bookingTime: reuse?.bookingTime ?? '09:00',
          serviceAddress: addr.isEmpty ? null : addr,
          accessNotes: reuse?.accessNotes,
          contactPreference: reuse?.contactPreference ?? 'in_app',
          notes: reuse?.notes,
          careerName: reuse?.careerName,
          providerName: reuse?.providerName ?? reuse?.prefillProviderName,
          datePreference: reuse?.datePreference,
          timeWindow: reuse?.timeWindow,
          urgency: reuse?.urgency,
        );
        break;
      case WizardBookingMode.negotiation:
        built = OrderWizardArgs(
          bookingMode: m.wireValue,
          catalogName: tile.name,
          serviceCatalogId: tile.id,
          prefillProviderId: prefillPid,
          urgency: reuse?.urgency ?? 'this_week',
          budgetMin: reuse?.budgetMin,
          budgetMax: reuse?.budgetMax,
          notes: reuse?.notes,
          accessNotes: reuse?.accessNotes,
          contactPreference: reuse?.contactPreference ?? 'in_app',
          careerName: reuse?.careerName,
          providerName: reuse?.providerName ?? reuse?.prefillProviderName,
          serviceAddress: reuse?.serviceAddress,
        );
        break;
    }

    final ob = widget.initialBookingMode?.trim();
    if (ob != null && const {'auto_appointment', 'inherit_from_catalog', 'negotiation'}.contains(ob)) {
      return built.copyWith(bookingMode: ob);
    }
    return built;
  }

  void _syncWizardArgsFromCatalog() {
    final id = _selectedCatalogId?.trim();
    if (id == null || id.isEmpty || _otherServiceMode) {
      setState(() => _wizardArgs = null);
      return;
    }
    final tile = _tileForCurrentSelection();
    setState(() {
      _wizardArgs = _buildWizardArgs(tile, _wizardArgs);
    });
  }

  List<String> _pathIdsForCategory(String leafId) {
    final byId = <String, CategoryTreeNode>{};
    void walk(List<CategoryTreeNode> nodes) {
      for (final n in nodes) {
        byId[n.id] = n;
        walk(n.children);
      }
    }

    walk(_tree);
    final ids = <String>[];
    String? id = leafId;
    final seen = <String>{};
    for (var i = 0; i < 8 && id != null && !seen.contains(id); i++) {
      seen.add(id);
      final row = byId[id];
      if (row == null) break;
      ids.insert(0, row.id);
      id = row.parentId;
    }
    return ids;
  }

  Future<void> _applySuggestChip(CategorySearchHit hit) async {
    if (hit.pathIds.isEmpty) return;
    final root = hit.pathIds.first;
    setState(() {
      _selectedRootCategoryId = root;
      _categorySuggestHits = const [];
      _categorySuggestController.clear();
    });
    await _loadCatalogTilesForRoot(root);
    if (!mounted) return;
    final homeSlug = _resolvedHomeSlugFromPathIds(hit.pathIds);
    _replaceWizardRoute(homeCategory: homeSlug, serviceCatalogId: null);
  }

  String _wizardReturnToPath() {
    final q = <String, String>{
      'entryPoint': widget.entryPoint.wireValue,
      if (widget.homeCategorySlug != null && widget.homeCategorySlug!.trim().isNotEmpty)
        'homeCategory': widget.homeCategorySlug!.trim(),
      if (widget.prefillProviderId != null && widget.prefillProviderId!.trim().isNotEmpty)
        'prefillProviderId': widget.prefillProviderId!.trim(),
      if (widget.newOffer) 'newOffer': '1',
      if (_selectedCatalogId != null && _selectedCatalogId!.trim().isNotEmpty)
        'serviceCatalogId': _selectedCatalogId!.trim(),
    };
    return '/orders/new?${Uri(queryParameters: q).query}';
  }

  Future<void> _submitOtherTicket() async {
    final body = _otherBodyController.text.trim();
    if (body.length < 10) {
      setState(() => _error = 'Please enter at least 10 characters for the service request.');
      return;
    }
    final api = context.read<NeighborlyApiService>();
    if (!api.hasActiveSession) {
      neighborlyNavigatorKey.currentState?.pushNamed(
        '/auth',
        arguments: AuthRouteArgs(returnToPath: _wizardReturnToPath()),
      );
      return;
    }
    setState(() {
      _otherTicketBusy = true;
      _error = null;
    });
    try {
      await api.createAdminTicket(
        subject: 'Request a new service type',
        type: 'general',
        message: body,
      );
      if (!mounted) return;
      setState(() {
        _otherServiceMode = false;
        _otherBodyController.clear();
        _otherTicketBusy = false;
      });
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Thanks — our team will review your request.')),
      );
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _error = e.toString();
        _otherTicketBusy = false;
      });
    }
  }

  String _effectiveSubmitAddress() {
    final top = _addressController.text.trim();
    if (top.isNotEmpty) return top;
    return (_wizardArgs?.serviceAddress ?? '').trim();
  }

  Future<void> _submit() async {
    if (_otherServiceMode) {
      await _submitOtherTicket();
      return;
    }
    final serviceCatalogId = _selectedCatalogId?.trim() ?? '';
    if (serviceCatalogId.isEmpty) {
      setState(() => _error = 'Select a service type from the list (or use Suggest).');
      return;
    }
    final desc = _descController.text.trim();
    if (desc.length < 20) {
      setState(() => _error = 'Description must be at least 20 characters.');
      return;
    }
    final w = _wizardArgs;
    if (w?.bookingMode == 'negotiation') {
      final n = (w!.notes ?? '').trim();
      if (n.length < 10) {
        setState(() => _error = 'Negotiation booking: enter at least 10 characters under Scope & context.');
        return;
      }
    }
    if (w?.bookingMode == 'inherit_from_catalog') {
      final addr = _effectiveSubmitAddress();
      if (addr.length < 5) {
        setState(() => _error = 'Enter a service address (at least 5 characters) or fill it under Booking preferences.');
        return;
      }
    }
    setState(() {
      _submitting = true;
      _error = null;
    });
    try {
      final api = context.read<NeighborlyApiService>();
      final addr = _effectiveSubmitAddress();
      final mergedPrefill = <String, dynamic>{
        'description': desc,
        'careerName': desc,
        'address': addr,
        'scheduleFlexibility': 'asap',
        if (_wizardArgs != null) ..._wizardArgs!.toJson(),
      };
      final draft = await api.createOrderDraft(
        serviceCatalogId: serviceCatalogId,
        entryPoint: widget.entryPoint,
        prefill: mergedPrefill,
      );
      await api.submitOrderDraft(draft.id, {
        'description': desc,
        'address': addr,
        'scheduleFlexibility': 'asap',
        if (_wizardArgs != null) ..._wizardArgs!.toJson(),
      });
      if (!mounted) return;
      Navigator.of(context).pushReplacementNamed('/orders/${draft.id}');
    } catch (e) {
      if (!mounted) return;
      if (e is NeighborlyApiException && (e.statusCode == 401 || e.statusCode == 403)) {
        neighborlyNavigatorKey.currentState?.pushNamed(
          '/auth',
          arguments: AuthRouteArgs(returnToPath: _wizardReturnToPath()),
        );
        setState(() => _submitting = false);
        return;
      }
      setState(() {
        _error = e.toString();
        _submitting = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    final roots = _tree;
    final prePid = widget.prefillProviderId?.trim();

    return Scaffold(
      appBar: AppBar(
        title: const Text('Create Order'),
        bottom: prePid != null && prePid.isNotEmpty
            ? PreferredSize(
                preferredSize: const Size.fromHeight(40),
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(16, 0, 16, 8),
                  child: Align(
                    alignment: Alignment.centerLeft,
                    child: Material(
                      color: cs.primaryContainer.withValues(alpha: 0.25),
                      borderRadius: BorderRadius.circular(20),
                      child: Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                        child: Text(
                          'Requested provider: ${prePid.length > 10 ? '${prePid.substring(0, 8)}…' : prePid}',
                          style: TextStyle(fontSize: 12, color: cs.onSurface.withValues(alpha: 0.88)),
                        ),
                      ),
                    ),
                  ),
                ),
              )
            : null,
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          if (widget.newOffer)
            Padding(
              padding: const EdgeInsets.only(bottom: 12),
              child: Material(
                color: cs.surfaceContainerHighest.withValues(alpha: 0.35),
                borderRadius: BorderRadius.circular(12),
                child: Padding(
                  padding: const EdgeInsets.all(12),
                  child: Text(
                    'New offer: pick a main category and service type. Use Other if we do not list your service yet.',
                    style: TextStyle(fontSize: 13, height: 1.35, color: cs.onSurface.withValues(alpha: 0.85)),
                  ),
                ),
              ),
            ),
          Text('Describe what you need', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: cs.onSurface)),
          const SizedBox(height: 8),
          TextField(
            controller: _descController,
            minLines: 4,
            maxLines: 8,
            decoration: const InputDecoration(
              hintText: 'Describe what you need (20+ chars to submit)',
              border: OutlineInputBorder(),
            ),
          ),
          const SizedBox(height: 8),
          Align(
            alignment: Alignment.centerLeft,
            child: FilledButton.tonalIcon(
              onPressed: _submitting ? null : _suggestCatalogFromDescription,
              icon: const Icon(Icons.auto_awesome, size: 18),
              label: const Text('Suggest service type from text'),
            ),
          ),
          const SizedBox(height: 20),
          Text('Service selection', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: cs.onSurface)),
          const SizedBox(height: 8),
          TextField(
            controller: _categorySuggestController,
            decoration: const InputDecoration(
              hintText: 'Describe what you need...',
              border: OutlineInputBorder(),
            ),
          ),
          if (_categorySuggestHits.isNotEmpty) ...[
            const SizedBox(height: 8),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: _categorySuggestHits
                  .map(
                    (h) => FilterChip(
                      label: Text(h.name),
                      onSelected: (_) {
                        unawaited(_applySuggestChip(h));
                      },
                    ),
                  )
                  .toList(),
            ),
          ],
          const SizedBox(height: 12),
          if (_treeLoading)
            const Padding(
              padding: EdgeInsets.symmetric(vertical: 8),
              child: Center(child: CircularProgressIndicator()),
            )
          else
            DropdownButtonFormField<String>(
              value: _selectedRootCategoryId != null && roots.any((r) => r.id == _selectedRootCategoryId)
                  ? _selectedRootCategoryId
                  : null,
              decoration: const InputDecoration(
                labelText: 'Main category',
                border: OutlineInputBorder(),
              ),
              hint: const Text('Select a main category'),
              items: [
                for (final r in roots) DropdownMenuItem(value: r.id, child: Text(r.name)),
                const DropdownMenuItem(
                  value: '__other__',
                  child: Text('Other — Request a new service type'),
                ),
              ],
              onChanged: _submitting
                  ? null
                  : (v) async {
                      if (v == null) return;
                      if (v == '__other__') {
                        setState(() {
                          _otherServiceMode = true;
                          _selectedRootCategoryId = null;
                          _selectedCatalogId = null;
                          _catalogTiles = const [];
                          _wizardArgs = null;
                        });
                        return;
                      }
                      setState(() {
                        _otherServiceMode = false;
                        _selectedRootCategoryId = v;
                        _selectedCatalogId = null;
                      });
                      await _loadCatalogTilesForRoot(v);
                      if (!mounted) return;
                      final pre = widget.prefillServiceCatalogId?.trim();
                      if (pre != null && pre.isNotEmpty && _catalogTiles.any((t) => t.id == pre)) {
                        setState(() {
                          _selectedCatalogId = pre;
                          _wizardArgs = _buildWizardArgs(_tileForCurrentSelection(), _wizardArgs);
                        });
                      }
                    },
            ),
          if (_otherServiceMode) ...[
            const SizedBox(height: 16),
            TextFormField(
              controller: _otherBodyController,
              minLines: 3,
              maxLines: 6,
              decoration: const InputDecoration(
                labelText: 'Describe the service you need',
                border: OutlineInputBorder(),
              ),
            ),
            const SizedBox(height: 8),
            Text(
              'Submit sends a support ticket when you are signed in.',
              style: TextStyle(fontSize: 12, color: cs.onSurface.withValues(alpha: 0.65)),
            ),
          ],
          const SizedBox(height: 12),
          if (!_otherServiceMode) ...[
            if (_catalogsLoading)
              const Padding(
                padding: EdgeInsets.symmetric(vertical: 8),
                child: Center(child: CircularProgressIndicator()),
              )
            else if (_selectedRootCategoryId == null && !_catalogsLoading)
              Padding(
                padding: const EdgeInsets.only(top: 4),
                child: Text(
                  'Select a main category to list service types.',
                  style: TextStyle(fontSize: 12, color: cs.onSurface.withValues(alpha: 0.65)),
                ),
              )
            else
              Builder(
                builder: (context) {
                  final pre = widget.prefillServiceCatalogId?.trim();
                  final orphanPrefill = pre != null &&
                      pre.isNotEmpty &&
                      _selectedCatalogId == pre &&
                      _catalogTiles.every((t) => t.id != pre);
                  final hasTiles = _catalogTiles.isNotEmpty;
                  if (_selectedRootCategoryId != null && !hasTiles && !orphanPrefill) {
                    return Padding(
                      padding: const EdgeInsets.symmetric(vertical: 8),
                      child: Text(
                        'No active service types under this category yet.',
                        style: TextStyle(fontSize: 13, color: cs.onSurface.withValues(alpha: 0.7)),
                      ),
                    );
                  }
                  if (_selectedRootCategoryId == null) {
                    return const SizedBox.shrink();
                  }
                  return DropdownButtonFormField<String>(
                    value: _selectedCatalogId != null &&
                            (_catalogTiles.any((t) => t.id == _selectedCatalogId) || orphanPrefill)
                        ? _selectedCatalogId
                        : null,
                    decoration: const InputDecoration(
                      labelText: 'Service type (catalog)',
                      border: OutlineInputBorder(),
                    ),
                    hint: const Text('Select a service type'),
                    items: [
                      for (final t in _catalogTiles)
                        DropdownMenuItem(
                          value: t.id,
                          child: Text(t.name, overflow: TextOverflow.ellipsis),
                        ),
                      if (orphanPrefill)
                        DropdownMenuItem(
                          value: pre,
                          child: const Text('Suggested catalog (from Home)'),
                        ),
                    ],
                    onChanged: _submitting
                        ? null
                        : (v) {
                            setState(() {
                              _selectedCatalogId = v;
                              final id = v?.trim();
                              if (id != null && id.isNotEmpty) {
                                _wizardArgs = _buildWizardArgs(_tileForCurrentSelection(), _wizardArgs);
                              } else {
                                _wizardArgs = null;
                              }
                            });
                          },
                  );
                },
              ),
            if (!_otherServiceMode &&
                _wizardArgs != null &&
                (_selectedCatalogId ?? '').trim().isNotEmpty) ...[
              const SizedBox(height: 20),
              Text(
                'Booking preferences',
                style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: cs.onSurface),
              ),
              const SizedBox(height: 8),
              Step2BookingForm(
                args: _wizardArgs!,
                onPatch: (next) => setState(() => _wizardArgs = next),
                onBack: () {
                  setState(() {
                    _selectedCatalogId = null;
                    _wizardArgs = null;
                  });
                },
                onNext: () {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('Booking preferences saved. Continue below to submit.')),
                  );
                },
              ),
            ],
          ],
          if (_categoryNote != null)
            Padding(
              padding: const EdgeInsets.only(top: 8),
              child: Text(_categoryNote!, style: TextStyle(fontSize: 12, color: cs.secondary)),
            ),
          if (!_otherServiceMode) ...[
            const SizedBox(height: 16),
            TextField(
              controller: _addressController,
              decoration: const InputDecoration(
                hintText: 'Service address',
                border: OutlineInputBorder(),
              ),
            ),
          ],
          if (_error != null) ...[
            const SizedBox(height: 12),
            Text(_error!, style: const TextStyle(color: Colors.red)),
          ],
          const SizedBox(height: 20),
          SizedBox(
            height: 52,
            child: FilledButton(
              onPressed: (_submitting || _otherTicketBusy) ? null : _submit,
              child: Text(
                _submitting || _otherTicketBusy
                    ? 'Submitting...'
                    : (_otherServiceMode ? 'Submit service request' : 'Create & Submit Order'),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
