import Dexie from 'dexie';
import { type Vault, type VaultItem } from '../stores/authStore';

interface EncryptedData {
  id: string;
  vaultId: string;
  data: string; // Encrypted JSON
  type: string;
  timestamp: string;
}

interface VaultMetadata {
  id: string;
  name: string; // Encrypted
  createdAt: string;
  updatedAt: string;
}

class IndexedDBService {
  private static instance: IndexedDBService;
  private db: Dexie;
  private isInitialized = false;

  constructor() {
    this.db = new Dexie('HushKey-Vault');

    this.db.version(1).stores({
      vaults: 'id, name, createdAt, updatedAt',
      items: 'id, vaultId, data, type, timestamp',
      sync: 'id, lastSynced, pendingChanges',
    });
  }

  static getInstance(): IndexedDBService {
    if (!IndexedDBService.instance) {
      IndexedDBService.instance = new IndexedDBService();
    }
    return IndexedDBService.instance;
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      await this.db.open();
      this.isInitialized = true;
    } catch (error) {
      console.error('Failed to initialize IndexedDB:', error);
      throw error;
    }
  }

  // Vault operations
  async saveVault(vault: Vault): Promise<void> {
    await this.initialize();

    const metadata: VaultMetadata = {
      id: vault.id,
      name: vault.name, // Should be decrypted when saved
      createdAt: vault.createdAt.toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await this.db.table('vaults').put(metadata);
  }

  async getVaults(): Promise<VaultMetadata[]> {
    await this.initialize();
    return this.db.table('vaults').toArray();
  }

  async deleteVault(vaultId: string): Promise<void> {
    await this.initialize();
    await this.db.table('vaults').delete(vaultId);
    await this.db.table('items').where('vaultId').equals(vaultId).delete();
  }

  // Item operations
  async saveVaultItem(item: VaultItem): Promise<void> {
    await this.initialize();

    const encryptedData: EncryptedData = {
      id: item.id,
      vaultId: item.vaultId,
      data: JSON.stringify({
        type: item.type,
        name: item.name,
        url: item.url,
        username: item.username,
        password: item.password,
        notes: item.notes,
        tags: item.tags,
      }),
      type: item.type,
      timestamp: item.updatedAt.toISOString(),
    };

    await this.db.table('items').put(encryptedData);
  }

  async getVaultItems(vaultId: string): Promise<EncryptedData[]> {
    await this.initialize();
    return this.db.table('items').where('vaultId').equals(vaultId).toArray();
  }

  async getAllItems(): Promise<EncryptedData[]> {
    await this.initialize();
    return this.db.table('items').toArray();
  }

  async deleteVaultItem(itemId: string): Promise<void> {
    await this.initialize();
    await this.db.table('items').delete(itemId);
  }

  // Sync operations
  async getLastSync(): Promise<{ id: string; lastSynced: string; pendingChanges: string[] } | null> {
    await this.initialize();
    const syncData = await this.db.table('sync').get('main');
    return syncData || null;
  }

  async updateLastSync(lastSynced: string, pendingChanges: string[] = []): Promise<void> {
    await this.initialize();
    await this.db.table('sync').put({
      id: 'main',
      lastSynced,
      pendingChanges,
    });
  }

  // Bulk operations for sync
  async bulkSaveVaults(vaults: VaultMetadata[]): Promise<void> {
    await this.initialize();
    await this.db.table('vaults').bulkPut(vaults);
  }

  async bulkSaveItems(items: EncryptedData[]): Promise<void> {
    await this.initialize();
    await this.db.table('items').bulkPut(items);
  }

  // Clear all data (for logout/reset)
  async clearAll(): Promise<void> {
    if (!this.isInitialized) return;

    await this.db.table('vaults').clear();
    await this.db.table('items').clear();
    await this.db.table('sync').clear();
  }

  // Get storage information
  async getStorageStats(): Promise<{ vaults: number; items: number; size: number }> {
    await this.initialize();

    const vaults = await this.db.table('vaults').count();
    const items = await this.db.table('items').count();

    return {
      vaults,
      items,
      size: 0, // Estimating size would require more complex logic
    };
  }

  // Check if online data needs sync
  async getPendingSync(): Promise<Vault[]> {
    // This would be implemented to check what needs to be synced
    // For now, return empty array
    return [];
  }
}

export default IndexedDBService.getInstance();
