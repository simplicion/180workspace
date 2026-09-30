import 'dart:convert';
import 'package:shared_preferences/shared_preferences.dart';
import '../../data/models/vault_item.dart';

class VaultStorageService {
  String _folderKey(String? companyId, String? projectId) =>
      '180_vault_folders_${companyId ?? 'global'}_${projectId ?? 'global'}_v2';
  String _itemsKey(String? companyId, String? projectId) =>
      '180_vault_items_${companyId ?? 'global'}_${projectId ?? 'global'}_v2';

  Future<List<VaultFolder>> loadFolders({String? companyId, String? projectId}) async {
    final prefs = await SharedPreferences.getInstance();
    final raw = prefs.getString(_folderKey(companyId, projectId));
    if (raw == null || raw.isEmpty) return _seedDefaultFolders();
    try {
      final list = jsonDecode(raw);
      if (list is List) {
        return list.map((e) => VaultFolder.fromJson((e as Map).cast<String, dynamic>())).toList();
      }
    } catch (_) {}
    return _seedDefaultFolders();
  }

  Future<void> saveFolders(List<VaultFolder> folders, {String? companyId, String? projectId}) async {
    final prefs = await SharedPreferences.getInstance();
    final raw = jsonEncode(folders.map((f) => f.toJson()).toList());
    await prefs.setString(_folderKey(companyId, projectId), raw);
  }

  Future<List<VaultItem>> loadItems({String? companyId, String? projectId}) async {
    final prefs = await SharedPreferences.getInstance();
    final raw = prefs.getString(_itemsKey(companyId, projectId));
    if (raw == null || raw.isEmpty) return _seedDefaultItems();
    try {
      final list = jsonDecode(raw);
      if (list is List) {
        return list.map((e) => VaultItem.fromJson((e as Map).cast<String, dynamic>())).toList();
      }
    } catch (_) {}
    return _seedDefaultItems();
  }

  Future<void> saveItems(List<VaultItem> items, {String? companyId, String? projectId}) async {
    final prefs = await SharedPreferences.getInstance();
    final raw = jsonEncode(items.map((i) => i.toJson()).toList());
    await prefs.setString(_itemsKey(companyId, projectId), raw);
  }

  List<VaultFolder> _seedDefaultFolders() {
    return [
      VaultFolder(
        id: 'folder-reels',
        name: 'Viral Reels & Shorts',
        colorValue: 0xFF4F46E5, // Indigo
      ),
      VaultFolder(
        id: 'folder-hooks',
        name: 'High-Converting Hooks',
        colorValue: 0xFFF59E0B, // Amber
      ),
      VaultFolder(
        id: 'folder-broll',
        name: 'B-Roll & Product Takes',
        colorValue: 0xFF10B981, // Emerald
      ),
    ];
  }

  List<VaultItem> _seedDefaultItems() {
    return [
      VaultItem(
        id: 'item-hook-1',
        folderId: 'folder-hooks',
        name: '3-Sec Curiosity Pattern Interrupt',
        type: VaultItemType.note,
        noteCategory: VaultNoteCategory.hook,
        noteContent: 'Stop scrolling if you are still making this 1 common mistake with your content in 2026...',
        tags: ['viral', 'hook', 'pattern-interrupt'],
      ),
      VaultItem(
        id: 'item-hashtag-1',
        folderId: 'folder-hooks',
        name: 'Growth & Business Core Tags',
        type: VaultItemType.note,
        noteCategory: VaultNoteCategory.hashtag,
        noteContent: '#contentcreator #socialmediamarketing #videoediting #reelsstrategy #businessgrowth',
        tags: ['hashtags', 'growth'],
      ),
      VaultItem(
        id: 'item-script-1',
        folderId: 'folder-reels',
        name: 'High-Converting Product Teaser Script',
        type: VaultItemType.note,
        noteCategory: VaultNoteCategory.script,
        noteContent: 'HOOK: "Ever wondered why some creators grow 10x faster?"\n\nBODY: "It comes down to their first 3 seconds and clean pacing. Here is the exact framework..."\n\nCTA: "Comment WORKSPACE below and I will send over our complete production template."',
        tags: ['script', 'reels', 'framework'],
      ),
    ];
  }
}
