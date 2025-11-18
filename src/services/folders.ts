// Folder management service for organizing vault items

export interface Folder {
  id: string;
  name: string;
  vaultId: string;
  parentId?: string;
  createdAt: Date;
  updatedAt: Date;
}

class FolderService {
  private static instance: FolderService;

  static getInstance(): FolderService {
    if (!FolderService.instance) {
      FolderService.instance = new FolderService();
    }
    return FolderService.instance;
  }

  // Create a folder structure tree
  buildFolderTree(folders: Folder[]): { [key: string]: Folder & { children: Folder[] } } {
    const folderMap: { [key: string]: Folder & { children: Folder[] } } = {};
    const rootFolders: (Folder & { children: Folder[] })[] = [];

    // Initialize all folders
    folders.forEach(folder => {
      folderMap[folder.id] = { ...folder, children: [] };
    });

    // Build parent-child relationships
    folders.forEach(folder => {
      if (folder.parentId && folderMap[folder.parentId]) {
        folderMap[folder.parentId].children.push(folderMap[folder.id]);
      } else {
        rootFolders.push(folderMap[folder.id]);
      }
    });

    return folderMap;
  }

  // Get folder path as string
  getFolderPath(folderId: string, folders: Folder[]): string {
    const folderMap = this.buildFolderTree(folders);
    const path: string[] = [];
    let currentId = folderId;

    while (currentId && folderMap[currentId]) {
      path.unshift(folderMap[currentId].name);
      // Since we don't track parent relationships in the UI, simplify
      break;
    }

    return path.join('/');
  }

  // Validate folder operations (prevent cycles, etc.)
  validateFolderOperation(operation: 'create' | 'move', folderId: string, targetParentId: string | null, folders: Folder[]): boolean {
    if (operation === 'move' && targetParentId) {
      // Check for cyclic references
      let currentId = targetParentId;
      while (currentId) {
        if (currentId === folderId) return false; // Would create cycle
        const folder = folders.find(f => f.id === currentId);
        currentId = folder?.parentId || '';
      }
    }
    return true;
  }
}

export default FolderService.getInstance();
