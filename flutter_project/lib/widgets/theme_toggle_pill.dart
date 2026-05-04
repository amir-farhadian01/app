import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';

import '../services/neighborly_theme_notifier.dart';

/// Segmented control: Light | Dark. Uses [NeighborlyThemeNotifier] from context.
class ThemeTogglePill extends StatelessWidget {
  const ThemeTogglePill({super.key});

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    final notifier = context.watch<NeighborlyThemeNotifier>();
    final isDark = notifier.isDark;

    return Semantics(
      label: 'Theme mode',
      child: Container(
        height: 48,
        padding: const EdgeInsets.all(4),
        decoration: BoxDecoration(
          color: cs.surfaceContainerHighest.withValues(alpha: 0.5),
          borderRadius: BorderRadius.circular(100),
          border: Border.all(color: cs.outline.withValues(alpha: 0.35)),
        ),
        child: Row(
          children: [
            Expanded(
              child: _ThemeSegment(
                label: '☀ Light',
                selected: !isDark,
                onTap: () {
                  if (isDark) notifier.toggleTheme();
                },
              ),
            ),
            Expanded(
              child: _ThemeSegment(
                label: '🌙 Dark',
                selected: isDark,
                onTap: () {
                  if (!isDark) notifier.toggleTheme();
                },
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _ThemeSegment extends StatelessWidget {
  const _ThemeSegment({
    required this.label,
    required this.selected,
    required this.onTap,
  });

  final String label;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;

    return Semantics(
      label: label,
      button: true,
      selected: selected,
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(100),
          child: AnimatedContainer(
            duration: const Duration(milliseconds: 200),
            curve: Curves.easeOutCubic,
            alignment: Alignment.center,
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
            decoration: BoxDecoration(
              color: selected ? cs.primary : Colors.transparent,
              borderRadius: BorderRadius.circular(100),
            ),
            child: Text(
              label,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: GoogleFonts.inter(
                fontSize: 15,
                fontWeight: FontWeight.w700,
                color: selected ? cs.onPrimary : cs.secondary,
              ),
            ),
          ),
        ),
      ),
    );
  }
}
