/// Resolve marketing [homeCategory] slug/name to category path ids (root → … → match),
/// aligned with web [src/lib/homeOrderDeepLink.ts].

class CategoryTreeNode {
  const CategoryTreeNode({
    required this.id,
    required this.name,
    required this.parentId,
    required this.children,
  });

  final String id;
  final String name;
  final String? parentId;
  final List<CategoryTreeNode> children;

  static CategoryTreeNode fromMap(Map<String, dynamic> map) {
    final rawKids = map['children'];
    final kids = <CategoryTreeNode>[];
    if (rawKids is List) {
      for (final item in rawKids) {
        if (item is Map) {
          kids.add(CategoryTreeNode.fromMap(Map<String, dynamic>.from(item)));
        }
      }
    }
    return CategoryTreeNode(
      id: map['id']?.toString() ?? '',
      name: map['name']?.toString() ?? '',
      parentId: map['parentId']?.toString(),
      children: kids,
    );
  }
}

void _collectPaths(
  List<CategoryTreeNode> nodes,
  List<CategoryTreeNode> prefix,
  String slug,
  List<List<CategoryTreeNode>> out,
) {
  final s = slug.trim().toLowerCase();
  if (s.isEmpty) return;
  for (final n in nodes) {
    final chain = [...prefix, n];
    final nm = n.name.toLowerCase();
    final words = nm.split(RegExp(r'\s+')).where((w) => w.isNotEmpty).toList();
    final firstWord = words.isEmpty ? '' : words.first;
    final match = nm == s ||
        nm.contains(s) ||
        (firstWord.isNotEmpty && s.contains(firstWord)) ||
        (s.length >= 4 && words.any((w) => w.startsWith(s) || s.startsWith(w)));
    if (match) {
      out.add(chain);
    }
    if (n.children.isNotEmpty) {
      _collectPaths(n.children, chain, slug, out);
    }
  }
}

/// Returns path ids from root to best-matching node, or empty if none.
List<String> resolveHomeCategoryPathIds(List<CategoryTreeNode> tree, String homeCategory) {
  final buckets = <List<CategoryTreeNode>>[];
  _collectPaths(tree, [], homeCategory.trim(), buckets);
  if (buckets.isEmpty) return const [];
  buckets.sort((a, b) => b.length.compareTo(a.length));
  return buckets.first.map((n) => n.id).toList();
}
