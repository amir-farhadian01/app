import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:geolocator/geolocator.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:provider/provider.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:uuid/uuid.dart';

import '../models/place_prediction.dart';
import '../models/user_model.dart';
import '../services/neighborly_api_service.dart';

const _kNaPhoneRegionPref = 'profile_na_phone_region';

/// North American dial country for +1; both share the same code, only the flag differs.
enum _NaPhoneRegion { us, ca }

extension on _NaPhoneRegion {
  String get emoji => switch (this) {
        _NaPhoneRegion.us => '🇺🇸',
        _NaPhoneRegion.ca => '🇨🇦',
      };
}

/// Phone number formatter - formats as user types
/// Example: +1 (555) 123-4567 or +98 912 345 6789
class PhoneNumberFormatter extends TextInputFormatter {
  @override
  TextEditingValue formatEditUpdate(
    TextEditingValue oldValue,
    TextEditingValue newValue,
  ) {
    final text = newValue.text.replaceAll(RegExp(r'[^\d+]'), '');
    if (text.isEmpty) return newValue;

    // Keep the + at the start if present
    final hasPlus = text.startsWith('+');
    final digits = text.replaceAll(RegExp(r'[^\d]'), '');

    if (digits.isEmpty) {
      return newValue.copyWith(
        text: hasPlus ? '+' : '',
        selection: TextSelection.collapsed(offset: hasPlus ? 1 : 0),
      );
    }

    // Format based on common patterns
    String formatted;
    if (hasPlus) {
      // International format
      if (digits.length <= 1) {
        formatted = '+$digits';
      } else if (digits.length <= 4) {
        formatted = '+${digits.substring(0, 1)} ${digits.substring(1)}';
      } else if (digits.length <= 7) {
        formatted = '+${digits.substring(0, 1)} ${digits.substring(1, 4)} ${digits.substring(4)}';
      } else if (digits.length <= 10) {
        formatted = '+${digits.substring(0, 1)} ${digits.substring(1, 4)} ${digits.substring(4, 7)} ${digits.substring(7)}';
      } else {
        formatted = '+${digits.substring(0, 1)} ${digits.substring(1, 4)} ${digits.substring(4, 7)} ${digits.substring(7, 10)} ${digits.substring(10)}';
      }
    } else {
      // Local format (US style by default, or just groups of 3)
      if (digits.length <= 3) {
        formatted = digits;
      } else if (digits.length <= 6) {
        formatted = '(${digits.substring(0, 3)}) ${digits.substring(3)}';
      } else if (digits.length <= 10) {
        formatted = '(${digits.substring(0, 3)}) ${digits.substring(3, 6)}-${digits.substring(6)}';
      } else {
        formatted = '(${digits.substring(0, 3)}) ${digits.substring(3, 6)}-${digits.substring(6, 10)}';
      }
    }

    return TextEditingValue(
      text: formatted,
      selection: TextSelection.collapsed(offset: formatted.length),
    );
  }
}

/// Profile Edit Screen - allows users to update their profile information.
/// When [embedInAccountCenter] is true, renders without [Scaffold] (for the Personal tab in Account & Security).
class ProfileEditScreen extends StatefulWidget {
  const ProfileEditScreen({super.key, this.embedInAccountCenter = false, this.onSaved});

  final bool embedInAccountCenter;
  final VoidCallback? onSaved;

  @override
  State<ProfileEditScreen> createState() => _ProfileEditScreenState();
}

class _ProfileEditScreenState extends State<ProfileEditScreen> {
  final _formKey = GlobalKey<FormState>();
  late TextEditingController _firstNameController;
  late TextEditingController _lastNameController;
  late TextEditingController _phoneController;
  late TextEditingController _bioController;
  late TextEditingController _locationController;

  bool _isLoading = false;
  bool _hasChanges = false;
  _NaPhoneRegion _naPhoneRegion = _NaPhoneRegion.ca;
  _NaPhoneRegion? _initialNaPhoneRegion;
  bool _naRegionLoaded = false;
  bool _controllersInitialized = false;
  String? _lastUserId;

  String _placesSession = const Uuid().v4();
  final List<PlacePrediction> _placeSuggestions = [];
  Timer? _placesDebounce;
  bool _locationSearchEnabled = false;
  bool _locationFromGpsBusy = false;

  @override
  void initState() {
    super.initState();
    _firstNameController = TextEditingController();
    _lastNameController = TextEditingController();
    _phoneController = TextEditingController();
    _bioController = TextEditingController();
    _locationController = TextEditingController();

    _firstNameController.addListener(_onTextChanged);
    _lastNameController.addListener(_onTextChanged);
    _phoneController.addListener(_onTextChanged);
    _phoneController.addListener(_onPhoneTextChanged);
    _bioController.addListener(_onTextChanged);
    _locationController.addListener(_onTextChanged);
    _locationController.addListener(_onLocationInputChanged);

    _loadNaPhoneRegion();
    _loadLocationSearchFlag();
  }

  void _syncControllersWithUser(UserModel? user) {
    if (user == null) return;
    if (_lastUserId == user.uid && _controllersInitialized) return;

    final displayName = user.displayName;
    final nameParts = displayName.split(' ');
    final firstName = user.firstName ?? (nameParts.isNotEmpty ? nameParts.first : '');
    final lastName = user.lastName ?? (nameParts.length > 1 ? nameParts.sublist(1).join(' ') : '');

    _firstNameController.text = firstName;
    _lastNameController.text = lastName;
    _phoneController.text = _phoneForDisplay(user.phone);
    _bioController.text = user.bio ?? '';
    _locationController.text = user.location ?? '';

    _lastUserId = user.uid;
    _controllersInitialized = true;
    _hasChanges = false;
  }

  Future<void> _loadLocationSearchFlag() async {
    final api = context.read<NeighborlyApiService>();
    final on = await api.fetchLocationSearchEnabled();
    if (mounted) setState(() => _locationSearchEnabled = on);
  }

  void _onLocationInputChanged() {
    _placesDebounce?.cancel();
    if (!_locationSearchEnabled) {
      if (_placeSuggestions.isNotEmpty) setState(() => _placeSuggestions.clear());
      return;
    }
    final t = _locationController.text;
    if (t.length < 2) {
      if (_placeSuggestions.isNotEmpty) setState(() => _placeSuggestions.clear());
      return;
    }
    _placesDebounce = Timer(const Duration(milliseconds: 400), () async {
      if (!mounted) return;
      final api = context.read<NeighborlyApiService>();
      try {
        final list = await api.fetchPlaceAutocomplete(t, _placesSession);
        if (!mounted) return;
        setState(() {
          _placeSuggestions
            ..clear()
            ..addAll(list);
        });
      } catch (_) {
        if (mounted && _placeSuggestions.isNotEmpty) {
          setState(() => _placeSuggestions.clear());
        }
      }
    });
  }

  Future<void> _onSelectPlacePrediction(PlacePrediction p) async {
    setState(() => _placeSuggestions.clear());
    final api = context.read<NeighborlyApiService>();
    final addr = await api.fetchPlaceFormattedAddress(p.placeId, _placesSession);
    if (!mounted) return;
    if (addr != null && addr.isNotEmpty) {
      _locationController.value = TextEditingValue(
        text: addr,
        selection: TextSelection.collapsed(offset: addr.length),
      );
    } else {
      _locationController.value = TextEditingValue(
        text: p.description,
        selection: TextSelection.collapsed(offset: p.description.length),
      );
    }
    setState(() => _placesSession = const Uuid().v4());
  }

  Future<void> _useDeviceLocation() async {
    setState(() => _locationFromGpsBusy = true);
    final api = context.read<NeighborlyApiService>();
    final ms = ScaffoldMessenger.of(context);
    final cs = Theme.of(context).colorScheme;
    try {
      var perm = await Geolocator.checkPermission();
      if (perm == LocationPermission.denied) {
        perm = await Geolocator.requestPermission();
      }
      if (perm == LocationPermission.denied || perm == LocationPermission.deniedForever) {
        if (mounted) {
          ms.showSnackBar(
            SnackBar(
              content: Text('Location permission is required.', style: GoogleFonts.inter()),
              backgroundColor: cs.error,
            ),
          );
        }
        return;
      }
      final pos = await Geolocator.getCurrentPosition(
        locationSettings: const LocationSettings(accuracy: LocationAccuracy.medium),
      );
      if (!mounted) return;
      final addr = await api.fetchReverseGeocode(pos.latitude, pos.longitude);
      if (!mounted) return;
      if (addr != null && addr.isNotEmpty) {
        _locationController.value = TextEditingValue(
          text: addr,
          selection: TextSelection.collapsed(offset: addr.length),
        );
      } else {
        ms.showSnackBar(
          SnackBar(
            content: Text(
              'Could not resolve address. Add a Google Maps key in Admin or type your address manually.',
              style: GoogleFonts.inter(),
            ),
            backgroundColor: cs.errorContainer,
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ms.showSnackBar(
          SnackBar(
            content: Text('Location error: $e', style: GoogleFonts.inter()),
            backgroundColor: cs.error,
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _locationFromGpsBusy = false);
    }
  }

  Future<void> _loadNaPhoneRegion() async {
    final prefs = await SharedPreferences.getInstance();
    final raw = prefs.getString(_kNaPhoneRegionPref);
    if (!mounted) return;
    setState(() {
      _naPhoneRegion = raw == 'us' ? _NaPhoneRegion.us : _NaPhoneRegion.ca;
      _initialNaPhoneRegion = _naPhoneRegion;
      _naRegionLoaded = true;
    });
  }

  void _onPhoneTextChanged() {
    if (mounted) setState(() {});
  }

  static String _digitsOnly(String s) => s.replaceAll(RegExp(r'[^\d]'), '');

  /// Show local-style field when number is +1 (US/CA) or empty; keep full string for other countries.
  static String _phoneForDisplay(String? stored) {
    if (stored == null || stored.isEmpty) return '';
    final d = _digitsOnly(stored);
    if (d.length == 11 && d.startsWith('1')) {
      return _formatUsLocal(d.substring(1));
    }
    if (d.length == 10) {
      return _formatUsLocal(d);
    }
    return stored;
  }

  static String _formatUsLocal(String tenDigits) {
    if (tenDigits.length != 10) return tenDigits;
    return '(${tenDigits.substring(0, 3)}) ${tenDigits.substring(3, 6)}-${tenDigits.substring(6)}';
  }

  bool get _isNorthAmericanPhoneField {
    final t = _phoneController.text;
    if (t.trim().isEmpty) return true;
    final d = _digitsOnly(t);
    if (d.isEmpty) return true;
    if (d.length == 10) return true;
    if (d.length == 11 && d.startsWith('1')) return true;
    return false;
  }

  String _phoneForApi() {
    final raw = _phoneController.text.trim();
    if (raw.isEmpty) return '';
    if (!_isNorthAmericanPhoneField) return raw;
    var d = _digitsOnly(raw);
    if (d.length == 11 && d.startsWith('1')) d = d.substring(1);
    if (d.length == 10) return '+1$d';
    if (d.isEmpty) return '';
    return raw.startsWith('+') ? raw : '+$d';
  }

  Future<void> _persistNaPhoneRegion(_NaPhoneRegion r) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_kNaPhoneRegionPref, r == _NaPhoneRegion.us ? 'us' : 'ca');
  }

  void _onNaRegionSelected(_NaPhoneRegion r) {
    setState(() {
      _naPhoneRegion = r;
    });
    _persistNaPhoneRegion(r);
    _onTextChanged();
  }

  void _onTextChanged() {
    final user = context.read<NeighborlyApiService>().user;
    final displayName = '${_firstNameController.text.trim()} ${_lastNameController.text.trim()}'.trim();
    final originalDisplayName = user?.displayName ?? '';

    final phoneChanged = _e164ish(_phoneForApi()) != _e164ish(user?.phone);
    final regionChanged = _naRegionLoaded &&
        _initialNaPhoneRegion != null &&
        _naPhoneRegion != _initialNaPhoneRegion;

    final hasChanges = displayName != originalDisplayName ||
        phoneChanged ||
        regionChanged ||
        _bioController.text != (user?.bio ?? '') ||
        _locationController.text != (user?.location ?? '');

    if (hasChanges != _hasChanges) {
      setState(() => _hasChanges = hasChanges);
    }
  }

  static String? _e164ish(String? s) {
    if (s == null || s.trim().isEmpty) return null;
    final d = _digitsOnly(s);
    if (d.isEmpty) return null;
    if (d.length == 11 && d.startsWith('1')) return '+1${d.substring(1)}';
    if (d.length == 10) return '+1$d';
    if (s.contains('+') || s.startsWith('00')) return '+$d';
    return s.replaceAll(RegExp(r'\s'), '');
  }

  @override
  void dispose() {
    _placesDebounce?.cancel();
    _firstNameController.dispose();
    _lastNameController.dispose();
    _phoneController.dispose();
    _bioController.dispose();
    _locationController.dispose();
    super.dispose();
  }

  Future<void> _saveProfile() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() => _isLoading = true);

    try {
      final api = context.read<NeighborlyApiService>();

      // Combine first and last name for display name
      final firstName = _firstNameController.text.trim();
      final lastName = _lastNameController.text.trim();
      final displayName = '$firstName $lastName'.trim();

      final phoneOut = _phoneForApi();

      await api.updateProfile({
        'displayName': displayName.isEmpty ? null : displayName,
        'firstName': firstName.isEmpty ? null : firstName,
        'lastName': lastName.isEmpty ? null : lastName,
        'phone': phoneOut.isEmpty ? null : phoneOut,
        'bio': _bioController.text.trim().isEmpty
            ? null
            : _bioController.text.trim(),
        'location': _locationController.text.trim().isEmpty
            ? null
            : _locationController.text.trim(),
      });

      if (mounted) {
        setState(() {
          _initialNaPhoneRegion = _naPhoneRegion;
          _hasChanges = false;
        });
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
              'Profile updated successfully',
              style: GoogleFonts.inter(),
            ),
            behavior: SnackBarBehavior.floating,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
            backgroundColor: Theme.of(context).colorScheme.primaryContainer,
          ),
        );
        if (widget.embedInAccountCenter) {
          widget.onSaved?.call();
        } else {
          Navigator.pop(context);
        }
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
              'Failed to update profile: ${e.toString()}',
              style: GoogleFonts.inter(),
            ),
            behavior: SnackBarBehavior.floating,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
            backgroundColor: Theme.of(context).colorScheme.error,
          ),
        );
      }
    } finally {
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }

  List<Widget> _buildProfileFormChildren(ColorScheme cs, dynamic user) {
    return [
      _buildAvatarSection(user, cs),
      const SizedBox(height: 32),
      _buildSectionTitle('Personal Information', cs),
      const SizedBox(height: 16),
      Row(
        children: [
          Expanded(
            child: _buildTextField(
              controller: _firstNameController,
              label: 'First Name',
              hint: 'John',
              icon: LucideIcons.user,
              validator: (v) {
                if (v == null || v.trim().isEmpty) {
                  return 'Required';
                }
                if (v.trim().length < 2) {
                  return 'Too short';
                }
                return null;
              },
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: _buildTextField(
              controller: _lastNameController,
              label: 'Last Name (Surname)',
              hint: 'Doe',
              icon: LucideIcons.users,
              validator: (v) {
                if (v == null || v.trim().isEmpty) {
                  return 'Required';
                }
                if (v.trim().length < 2) {
                  return 'Too short';
                }
                return null;
              },
            ),
          ),
        ],
      ),
      const SizedBox(height: 16),
      _buildPhoneField(cs),
      const SizedBox(height: 16),
      _buildLocationField(cs),
      const SizedBox(height: 32),
      _buildSectionTitle('About', cs),
      const SizedBox(height: 16),
      _buildBioField(cs),
      const SizedBox(height: 32),
      _buildEmailSection(user, cs),
      if (widget.embedInAccountCenter) ...[
        const SizedBox(height: 24),
        FilledButton(
          onPressed: _isLoading ? null : (_hasChanges ? _saveProfile : null),
          child: _isLoading
              ? const SizedBox(
                  width: 22,
                  height: 22,
                  child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                )
              : Text('Save personal info', style: GoogleFonts.inter(fontWeight: FontWeight.w800)),
        ),
        const SizedBox(height: 8),
      ] else
        const SizedBox(height: 40),
    ];
  }

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    final user = context.watch<NeighborlyApiService>().user;

    // Sync controllers when user data becomes available
    if (user != null) {
      _syncControllersWithUser(user);
    }

    final children = _buildProfileFormChildren(cs, user);

    if (widget.embedInAccountCenter) {
      // Use Column with shrink wrap for embedded mode (inside another ListView)
      return Form(
        key: _formKey,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisSize: MainAxisSize.min,
          children: children,
        ),
      );
    }

    final form = Form(
      key: _formKey,
      child: ListView(
        padding: const EdgeInsets.all(20),
        children: children,
      ),
    );

    return Scaffold(
      backgroundColor: cs.surface,
      appBar: AppBar(
        backgroundColor: cs.surface,
        elevation: 0,
        centerTitle: true,
        title: Text(
          'Edit Profile',
          style: GoogleFonts.inter(
            fontSize: 18,
            fontWeight: FontWeight.w700,
            color: cs.onSurface,
          ),
        ),
        leading: IconButton(
          icon: Icon(LucideIcons.chevronLeft, color: cs.onSurface),
          onPressed: () => Navigator.pop(context),
        ),
        actions: [
          if (_isLoading)
            const Center(
              child: Padding(
                padding: EdgeInsets.only(right: 16),
                child: SizedBox(
                  width: 20,
                  height: 20,
                  child: CircularProgressIndicator(strokeWidth: 2),
                ),
              ),
            )
          else
            TextButton(
              onPressed: _hasChanges ? _saveProfile : null,
              child: Text(
                'Save',
                style: GoogleFonts.inter(
                  fontWeight: FontWeight.w700,
                  color: _hasChanges ? cs.primary : cs.secondary,
                ),
              ),
            ),
        ],
      ),
      body: form,
    );
  }

  Widget _buildAvatarSection(dynamic user, ColorScheme cs) {
    final name = user?.displayName?.toString() ?? '';

    return Center(
      child: Column(
        children: [
          Container(
            width: 100,
            height: 100,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              color: cs.primaryContainer,
              border: Border.all(
                color: cs.primary.withValues(alpha: 0.2),
                width: 2,
              ),
            ),
            child: user?.photoURL != null && user.photoURL.toString().isNotEmpty
                ? ClipOval(
                    child: Image.network(
                      user.photoURL.toString(),
                      fit: BoxFit.cover,
                      errorBuilder: (_, __, ___) => _buildAvatarFallback(name, cs),
                    ),
                  )
                : _buildAvatarFallback(name, cs),
          ),
          const SizedBox(height: 12),
          TextButton.icon(
            onPressed: () => _showAvatarOptions(),
            icon: Icon(LucideIcons.camera, size: 16, color: cs.primary),
            label: Text(
              'Change Photo',
              style: GoogleFonts.inter(
                fontSize: 13,
                fontWeight: FontWeight.w600,
                color: cs.primary,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildAvatarFallback(String name, ColorScheme cs) {
    return Center(
      child: Text(
        name.isNotEmpty ? name[0].toUpperCase() : '?',
        style: GoogleFonts.inter(
          fontSize: 40,
          fontWeight: FontWeight.w800,
          color: cs.onPrimaryContainer,
        ),
      ),
    );
  }

  Widget _buildSectionTitle(String title, ColorScheme cs) {
    return Text(
      title,
      style: GoogleFonts.inter(
        fontSize: 14,
        fontWeight: FontWeight.w800,
        color: cs.secondary,
        letterSpacing: 0.5,
      ),
    );
  }

  Widget _buildTextField({
    required TextEditingController controller,
    required String label,
    required String hint,
    required IconData icon,
    TextInputType? keyboardType,
    String? Function(String?)? validator,
    List<TextInputFormatter>? inputFormatters,
  }) {
    final cs = Theme.of(context).colorScheme;

    return TextFormField(
      controller: controller,
      keyboardType: keyboardType,
      validator: validator,
      inputFormatters: inputFormatters,
      style: GoogleFonts.inter(fontSize: 15),
      decoration: InputDecoration(
        labelText: label,
        labelStyle: GoogleFonts.inter(
          fontSize: 14,
          color: cs.secondary,
        ),
        hintText: hint,
        hintStyle: GoogleFonts.inter(
          fontSize: 14,
          color: cs.onSurface.withValues(alpha: 0.4),
        ),
        prefixIcon: Icon(icon, size: 20, color: cs.secondary),
        filled: true,
        fillColor: cs.surfaceContainerHighest.withValues(alpha: 0.3),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: BorderSide.none,
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: BorderSide(color: cs.outline.withValues(alpha: 0.1)),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: BorderSide(color: cs.primary, width: 1.5),
        ),
        errorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: BorderSide(color: cs.error, width: 1),
        ),
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
        errorStyle: GoogleFonts.inter(fontSize: 11),
      ),
    );
  }

  Widget _buildLocationField(ColorScheme cs) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        TextFormField(
          controller: _locationController,
          minLines: 1,
          maxLines: 3,
          textCapitalization: TextCapitalization.sentences,
          style: GoogleFonts.inter(fontSize: 15),
          onTapOutside: (_) {
            if (_placeSuggestions.isNotEmpty) {
              setState(() => _placeSuggestions.clear());
            }
          },
          decoration: InputDecoration(
            labelText: 'Location',
            labelStyle: GoogleFonts.inter(
              fontSize: 14,
              color: cs.secondary,
            ),
            hintText: _locationSearchEnabled
                ? 'Start typing an address (e.g. 100 Eag…)'
                : 'City, neighbourhood, or full address',
            hintStyle: GoogleFonts.inter(
              fontSize: 14,
              color: cs.onSurface.withValues(alpha: 0.4),
            ),
            prefixIcon: Icon(LucideIcons.mapPin, size: 20, color: cs.secondary),
            suffixIcon: Padding(
              padding: const EdgeInsets.only(right: 4),
              child: IconButton.filledTonal(
                onPressed: _locationFromGpsBusy ? null : _useDeviceLocation,
                style: IconButton.styleFrom(
                  padding: const EdgeInsets.all(8),
                  minimumSize: const Size(40, 40),
                ),
                tooltip: 'Use this device’s location (GPS)',
                icon: _locationFromGpsBusy
                    ? SizedBox(
                        width: 20,
                        height: 20,
                        child: CircularProgressIndicator(
                          strokeWidth: 2,
                          color: cs.primary,
                        ),
                      )
                    : Icon(LucideIcons.locateFixed, size: 20, color: cs.primary),
              ),
            ),
            filled: true,
            fillColor: cs.surfaceContainerHighest.withValues(alpha: 0.3),
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: BorderSide.none,
            ),
            enabledBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: BorderSide(color: cs.outline.withValues(alpha: 0.1)),
            ),
            focusedBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: BorderSide(color: cs.primary, width: 1.5),
            ),
            contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 16),
            helperText: _locationSearchEnabled
                ? 'Address suggestions use Google (configured in Admin). You can also type the full address yourself.'
                : 'Configure a Google Maps server key in Admin to enable address search. You can type any address manually.',
            helperStyle: GoogleFonts.inter(
              fontSize: 11,
              color: cs.secondary,
            ),
            helperMaxLines: 3,
          ),
        ),
        if (_placeSuggestions.isNotEmpty) ...[
          const SizedBox(height: 4),
          Material(
            elevation: 2,
            borderRadius: BorderRadius.circular(12),
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxHeight: 220),
              child: ListView.separated(
                shrinkWrap: true,
                padding: EdgeInsets.zero,
                itemCount: _placeSuggestions.length,
                separatorBuilder: (_, __) => Divider(height: 1, color: cs.outline.withValues(alpha: 0.2)),
                itemBuilder: (context, i) {
                  final p = _placeSuggestions[i];
                  return ListTile(
                    dense: true,
                    title: Text(
                      p.description,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: GoogleFonts.inter(fontSize: 14),
                    ),
                    onTap: () => _onSelectPlacePrediction(p),
                  );
                },
              ),
            ),
          ),
        ],
      ],
    );
  }

  Widget _buildPhoneField(ColorScheme cs) {
    final na = _isNorthAmericanPhoneField;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        TextFormField(
          controller: _phoneController,
          keyboardType: TextInputType.phone,
          inputFormatters: [
            PhoneNumberFormatter(),
            LengthLimitingTextInputFormatter(25),
          ],
          style: GoogleFonts.inter(fontSize: 15),
          decoration: InputDecoration(
            labelText: 'Phone Number',
            labelStyle: GoogleFonts.inter(
              fontSize: 14,
              color: cs.secondary,
            ),
            hintText: na ? '(555) 123-4567' : '+1 (555) 123-4567',
            hintStyle: GoogleFonts.inter(
              fontSize: 14,
              color: cs.onSurface.withValues(alpha: 0.4),
            ),
            prefixIcon: na ? _naPhoneFlagMenu() : _phoneFallbackPrefix(cs),
            filled: true,
            fillColor: cs.surfaceContainerHighest.withValues(alpha: 0.3),
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: BorderSide.none,
            ),
            enabledBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: BorderSide(color: cs.outline.withValues(alpha: 0.1)),
            ),
            focusedBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: BorderSide(color: cs.primary, width: 1.5),
            ),
            contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
            helperText: na
                ? 'US & Canada use +1. Tap the flag to choose your country.'
                : 'Use your full international number with country code.',
            helperStyle: GoogleFonts.inter(
              fontSize: 11,
              color: cs.secondary,
            ),
          ),
        ),
      ],
    );
  }

  /// Flag replaces numeric country code for +1; tap to pick US or Canada.
  Widget _naPhoneFlagMenu() {
    return PopupMenuButton<_NaPhoneRegion>(
      tooltip: 'Country (US/Canada, +1)',
      initialValue: _naPhoneRegion,
      onSelected: _onNaRegionSelected,
      offset: const Offset(0, 40),
      child: SizedBox(
        width: 48,
        height: 48,
        child: Center(
          child: Text(
            _naPhoneRegion.emoji,
            style: const TextStyle(fontSize: 24, height: 1),
          ),
        ),
      ),
      itemBuilder: (context) => [
        PopupMenuItem(
          value: _NaPhoneRegion.us,
          child: Row(
            children: [
              const Text('🇺🇸 ', style: TextStyle(fontSize: 18)),
              Text('United States', style: GoogleFonts.inter()),
            ],
          ),
        ),
        PopupMenuItem(
          value: _NaPhoneRegion.ca,
          child: Row(
            children: [
              const Text('🇨🇦 ', style: TextStyle(fontSize: 18)),
              Text('Canada', style: GoogleFonts.inter()),
            ],
          ),
        ),
      ],
    );
  }

  Widget _phoneFallbackPrefix(ColorScheme cs) {
    return Icon(
      LucideIcons.phone,
      size: 20,
      color: cs.secondary,
    );
  }

  Widget _buildBioField(ColorScheme cs) {
    return TextFormField(
      controller: _bioController,
      maxLines: 4,
      maxLength: 500,
      style: GoogleFonts.inter(fontSize: 15),
      decoration: InputDecoration(
        labelText: 'Bio',
        labelStyle: GoogleFonts.inter(
          fontSize: 14,
          color: cs.secondary,
        ),
        hintText: 'Tell others about yourself, your skills, and experience...',
        hintStyle: GoogleFonts.inter(
          fontSize: 14,
          color: cs.onSurface.withValues(alpha: 0.4),
        ),
        alignLabelWithHint: true,
        filled: true,
        fillColor: cs.surfaceContainerHighest.withValues(alpha: 0.3),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: BorderSide.none,
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: BorderSide(color: cs.outline.withValues(alpha: 0.1)),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: BorderSide(color: cs.primary, width: 1.5),
        ),
        contentPadding: const EdgeInsets.all(16),
      ),
    );
  }

  Widget _buildEmailSection(dynamic user, ColorScheme cs) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: cs.surfaceContainerHighest.withValues(alpha: 0.3),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Row(
        children: [
          Icon(LucideIcons.mail, size: 20, color: cs.secondary),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Email Address',
                  style: GoogleFonts.inter(
                    fontSize: 12,
                    color: cs.secondary,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  user?.email?.toString() ?? 'Not available',
                  style: GoogleFonts.inter(
                    fontSize: 14,
                    fontWeight: FontWeight.w600,
                    color: cs.onSurface,
                  ),
                ),
              ],
            ),
          ),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
            decoration: BoxDecoration(
              color: user?.isVerified == true
                  ? cs.tertiaryContainer
                  : cs.errorContainer,
              borderRadius: BorderRadius.circular(20),
            ),
            child: Text(
              user?.isVerified == true ? 'Verified' : 'Unverified',
              style: GoogleFonts.inter(
                fontSize: 11,
                fontWeight: FontWeight.w600,
                color: user?.isVerified == true
                    ? cs.onTertiaryContainer
                    : cs.onErrorContainer,
              ),
            ),
          ),
        ],
      ),
    );
  }

  void _showAvatarOptions() {
    final cs = Theme.of(context).colorScheme;
    showModalBottomSheet(
      context: context,
      backgroundColor: cs.surface,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (context) => SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: 20),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                width: 40,
                height: 4,
                decoration: BoxDecoration(
                  color: cs.outline.withValues(alpha: 0.3),
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
              const SizedBox(height: 20),
              Text(
                'Change Profile Photo',
                style: GoogleFonts.inter(
                  fontSize: 18,
                  fontWeight: FontWeight.w700,
                ),
              ),
              const SizedBox(height: 20),
              ListTile(
                leading: Icon(LucideIcons.camera, color: cs.primary),
                title: Text(
                  'Take Photo',
                  style: GoogleFonts.inter(fontWeight: FontWeight.w600),
                ),
                onTap: () {
                  Navigator.pop(context);
                  _showComingSoon('Camera');
                },
              ),
              ListTile(
                leading: Icon(LucideIcons.image, color: cs.primary),
                title: Text(
                  'Choose from Gallery',
                  style: GoogleFonts.inter(fontWeight: FontWeight.w600),
                ),
                onTap: () {
                  Navigator.pop(context);
                  _showComingSoon('Gallery');
                },
              ),
              ListTile(
                leading: Icon(LucideIcons.trash2, color: cs.error),
                title: Text(
                  'Remove Photo',
                  style: GoogleFonts.inter(
                    fontWeight: FontWeight.w600,
                    color: cs.error,
                  ),
                ),
                onTap: () {
                  Navigator.pop(context);
                  _showComingSoon('Remove Photo');
                },
              ),
            ],
          ),
        ),
      ),
    );
  }

  void _showComingSoon(String feature) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(
          '$feature coming soon!',
          style: GoogleFonts.inter(),
        ),
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      ),
    );
  }
}