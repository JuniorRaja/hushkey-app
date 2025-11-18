import { supabase } from '../supabaseClient';
import EncryptionService from './encryption';
import type { Vault, VaultItem } from '../stores/authStore';

// Database service for handling all Supabase operations
class DatabaseService {
  private static instance: DatabaseService;

  static getInstance(): DatabaseService {
    if (!DatabaseService.instance) {
      DatabaseService.instance = new DatabaseService();
    }
    return DatabaseService.instance;
  }

  // User Profile operations
  async saveUserProfile(userId: string, salt: Uint8Array): Promise<void> {
    const saltBase64 = EncryptionService.toBase64(salt);

    const { error } = await supabase
      .from('user_profiles')
      .upsert({
        user_id: userId,
        salt: saltBase64,
      });

    if (error) {
      console.error('Error saving user profile:', error);
      throw error;
    }
  }

  async getUserProfile(userId: string): Promise<{ salt: Uint8Array } | null> {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('salt')
      .eq('user_id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // No profile found
      console.error('Error getting user profile:', error);
      throw error;
    }

    return {
      salt: EncryptionService.fromBase64(data.salt),
    };
  }

  // Device management
  async saveDevice(userId: string, deviceId: string, deviceName?: string): Promise<void> {
    const { error } = await supabase
      .from('devices')
      .upsert({
        user_id: userId,
        device_id: deviceId,
        device_name: deviceName || navigator.userAgent,
        last_seen: new Date().toISOString(),
      });

    if (error) {
      console.error('Error saving device:', error);
      throw error;
    }
  }

  async updateDeviceLastSeen(deviceId: string): Promise<void> {
    const { error } = await supabase
      .from('devices')
      .update({ last_seen: new Date().toISOString() })
      .eq('device_id', deviceId);

    if (error) {
      console.error('Error updating device last seen:', error);
    }
  }

  // Vault operations
  async createVault(userId: string, name: string, masterKey: Uint8Array): Promise<Vault> {
    const encryptedName = await EncryptionService.encrypt(name, masterKey);
    const vaultId = EncryptionService.generateRandomString(32);

    const { error } = await supabase
      .from('vaults')
      .insert({
        id: vaultId,
        user_id: userId,
        name_encrypted: encryptedName,
      });

    if (error) {
      console.error('Error creating vault:', error);
      throw error;
    }

    return {
      id: vaultId,
      name, // Keep decrypted for UI
      items: [],
      createdAt: new Date(),
    };
  }

  async getVaults(userId: string, masterKey: Uint8Array): Promise<Vault[]> {
    const { data: vaultData, error: vaultsError } = await supabase
      .from('vaults')
      .select('id, name_encrypted, created_at, updated_at')
      .eq('user_id', userId);

    if (vaultsError) {
      console.error('Error getting vaults:', vaultsError);
      throw vaultsError;
    }

    const vaults: Vault[] = [];

    for (const vaultRow of vaultData) {
      try {
        const decryptedName = await EncryptionService.decrypt(vaultRow.name_encrypted, masterKey);

        const vault: Vault = {
          id: vaultRow.id,
          name: decryptedName,
          items: [],
          createdAt: new Date(vaultRow.created_at),
        };

        vaults.push(vault);
      } catch (error) {
        console.error(`Error decrypting vault ${vaultRow.id}:`, error);
        // Skip vaults that can't be decrypted
      }
    }

    // Load items for each vault
    for (const vault of vaults) {
      const items = await this.getVaultItems(vault.id, masterKey);
      vault.items = items;
    }

    return vaults;
  }

  async updateVault(vaultId: string, name: string, masterKey: Uint8Array): Promise<void> {
    const encryptedName = await EncryptionService.encrypt(name, masterKey);

    const { error } = await supabase
      .from('vaults')
      .update({
        name_encrypted: encryptedName,
      })
      .eq('id', vaultId);

    if (error) {
      console.error('Error updating vault:', error);
      throw error;
    }
  }

  async deleteVault(vaultId: string): Promise<void> {
    const { error } = await supabase
      .from('vaults')
      .delete()
      .eq('id', vaultId);

    if (error) {
      console.error('Error deleting vault:', error);
      throw error;
    }
  }

  // Item operations
  async createVaultItem(vaultId: string, itemData: Omit<VaultItem, 'id' | 'vaultId' | 'createdAt' | 'updatedAt'>, masterKey: Uint8Array): Promise<VaultItem> {
    const itemId = EncryptionService.generateRandomString(32);

    // Encrypt the item data as JSON
    const itemJson = JSON.stringify({
      type: itemData.type,
      name: itemData.name,
      url: itemData.url,
      username: itemData.username,
      password: itemData.password,
      notes: itemData.notes,
    });

    const encryptedData = await EncryptionService.encrypt(itemJson, masterKey);

    // Save item history for versioning
    const { error: historyError } = await supabase
      .from('item_history')
      .insert({
        item_id: itemId,
        data_encrypted: encryptedData,
      });

    if (historyError) {
      console.error('Error saving item history:', historyError);
      // Continue anyway
    }

    // Create the item
    const { error } = await supabase
      .from('items')
      .insert({
        id: itemId,
        vault_id: vaultId,
        type: itemData.type,
        data_encrypted: encryptedData,
        tags: [], // Will be implemented later
      });

    if (error) {
      console.error('Error creating vault item:', error);
      throw error;
    }

    const item: VaultItem = {
      ...itemData,
      id: itemId,
      vaultId,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    return item;
  }

  async getVaultItems(vaultId: string, masterKey: Uint8Array): Promise<VaultItem[]> {
    const { data: itemData, error } = await supabase
      .from('items')
      .select('id, vault_id, type, data_encrypted, created_at, updated_at, tags')
      .eq('vault_id', vaultId);

    if (error) {
      console.error('Error getting vault items:', error);
      throw error;
    }

    const items: VaultItem[] = [];

    for (const itemRow of itemData) {
      try {
        const decryptedJson = await EncryptionService.decrypt(itemRow.data_encrypted, masterKey);
        const itemData = JSON.parse(decryptedJson);

        const item: VaultItem = {
          id: itemRow.id,
          vaultId: itemRow.vault_id,
          type: itemRow.type,
          name: itemData.name,
          url: itemData.url,
          username: itemData.username,
          password: itemData.password,
          notes: itemData.notes,
          createdAt: new Date(itemRow.created_at),
          updatedAt: new Date(itemRow.updated_at),
        };

        items.push(item);
      } catch (error) {
        console.error(`Error decrypting item ${itemRow.id}:`, error);
        // Skip items that can't be decrypted
      }
    }

    return items;
  }

  async updateVaultItem(itemId: string, updates: Partial<VaultItem>, masterKey: Uint8Array): Promise<void> {
    // First, get the current item to merge updates
    const { data: currentItem, error: fetchError } = await supabase
      .from('items')
      .select('data_encrypted, vault_id, type')
      .eq('id', itemId)
      .single();

    if (fetchError) {
      console.error('Error fetching current item:', fetchError);
      throw fetchError;
    }

    // Decrypt current data
    const decryptedJson = await EncryptionService.decrypt(currentItem.data_encrypted, masterKey);
    const currentData = JSON.parse(decryptedJson);

    // Merge updates
    const updatedData = {
      ...currentData,
      ...updates,
    };

    // Update name field if it was changed
    if (updates.name) {
      updatedData.name = updates.name;
    }

    // Re-encrypt and save history
    const encryptedData = await EncryptionService.encrypt(JSON.stringify(updatedData), masterKey);

    const { error: historyError } = await supabase
      .from('item_history')
      .insert({
        item_id: itemId,
        data_encrypted: encryptedData,
      });

    if (historyError) {
      console.error('Error saving item history:', historyError);
      // Continue anyway
    }

    // Update the item
    const updateObj: any = {
      data_encrypted: encryptedData,
    };

    // Update tags if provided (Phase 2 feature)
    if (updates.hasOwnProperty('tags')) {
      updateObj.tags = updates.tags || [];
    }

    const { error } = await supabase
      .from('items')
      .update(updateObj)
      .eq('id', itemId);

    if (error) {
      console.error('Error updating vault item:', error);
      throw error;
    }
  }

  async deleteVaultItem(itemId: string): Promise<void> {
    const { error } = await supabase
      .from('items')
      .delete()
      .eq('id', itemId);

    if (error) {
      console.error('Error deleting vault item:', error);
      throw error;
    }
  }

  // Sync operations for real-time updates
  subscribeToVaultUpdates(userId: string, callback: (payload: any) => void) {
    return supabase
      .channel(`vaults_${userId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'vaults',
        filter: `user_id=eq.${userId}`,
      }, callback)
      .subscribe();
  }

  subscribeToItemUpdates(vaultId: string, callback: (payload: any) => void) {
    return supabase
      .channel(`items_${vaultId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'items',
        filter: `vault_id=eq.${vaultId}`,
      }, callback)
      .subscribe();
  }
}

export default DatabaseService.getInstance();
