/// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/// Category Model — for the Home & Explore screens
/// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
///
/// Backend shape (GET /api/categories):
///   {
///     id, name, parentId, description, icon,
///     children: [{ id, name, ... }]
///   }
///
/// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

class CategoryModel {
  final String id;
  final String name;
  final String? parentId;
  final String? description;
  final String? icon;

  const CategoryModel({
    required this.id,
    required this.name,
    this.parentId,
    this.description,
    this.icon,
  });

  factory CategoryModel.fromJson(Map<String, dynamic> json) {
    return CategoryModel(
      id: json['id'] as String? ?? '',
      name: json['name'] as String? ?? '',
      parentId: json['parentId'] as String?,
      description: json['description'] as String?,
      icon: json['icon'] as String?,
    );
  }
}
