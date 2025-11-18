import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from '../supabaseClient';
import EncryptionService from '../services/encryption';
import DatabaseService from '../services/database';
import IndexedDBService from '../services/indexedDB';

// Initialize services
EncryptionService.initialize().catch(console.error);
IndexedDBService.initialize().catch(console.error);

// Type definitions
export interface User {
  id: string;
  email: string;
}

export interface AuthState {
  user: User | null;
  isLoading: boolean;
  masterKey: Uint8Array | null;
  encryptedPinKey: string | null; // Encrypted version of the master key using PIN
  isUnlocked: boolean;
  lastActivity: Date | null;
  deviceId: string;
}

// UI state for mount points
export interface VaultItem {
  id: string;
  vaultId: string;
  type: 'login' | 'note' | 'card' | 'totp';
  name: string; // Decrypted name
  url?: string;
  username?: string;
  password?: string;
  notes?: string;
  tags?: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface Vault {
  id: string;
  name: string; // Decrypted name
  items: VaultItem[];
  createdAt: Date;
}

export interface VaultUIState {
  vaults: Vault[];
  currentVaultId: string | null;
  isLoading: boolean;
  error: string | null;
}

export interface AuthActions {
  // Authentication
  signUp: (email: string, password: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  unlockVault: (password: string) => Promise<void>;
  unlockWithPin: (pin: string) => Promise<void>;
  setPin: (pin: string) => Promise<void>;
  reset: () => void;

  // Utility methods
  hydrate: () => Promise<void>;
  getCurrentUser: () => Promise<User | null>;
  checkSession: () => Promise<void>;
}

export interface VaultUIActions {
  // Vault management
  createVault: (name: string) => Promise<Vault>;
  loadVaults: () => Promise<void>;
  selectVault: (vaultId: string) => void;

  // Item management
  createItem: (vaultId: string, item: Omit<VaultItem, 'id' | 'vaultId' | 'createdAt' | 'updatedAt'>) => Promise<VaultItem>;
  updateItem: (itemId: string, updates: Partial<VaultItem>) => Promise<void>;
  deleteItem: (itemId: string) => Promise<void>;
  copyToClipboard: (text: string, type: 'password' | 'username') => Promise<void>;
}

// Combined store interface
export interface AppStore extends AuthState, VaultUIState, AuthActions, VaultUIActions {
  // Activity tracking
  updateActivity: () => void;
}

// Initial state
const initialAuthState: AuthState = {
  user: null,
  isLoading: true,
  masterKey: null,
  encryptedPinKey: null,
  isUnlocked: false,
  lastActivity: null,
  deviceId: '',
};

const initialVaultState: VaultUIState = {
  vaults: [],
  currentVaultId: null,
  isLoading: false,
  error: null,
};

// Store implementation
export const useAppStore = create<AppStore>()(
  persist(
    (set, get) => ({
      ...initialAuthState,
      ...initialVaultState,
      ...vaultUIActions(set, get),
      ...authActions(set, get),
      updateActivity: () => set({ lastActivity: new Date() }),
    }),
    {
      name: 'hushkey-store',
      partialize: (state) => ({
        // Only persist certain auth state
        user: state.user,
        encryptedPinKey: state.encryptedPinKey,
        deviceId: state.deviceId,
        lastActivity: state.lastActivity,
      }),
    }
  )
);

// Authentication actions
function authActions(set: any, get: () => AppStore): AuthActions {
  return {
    async signUp(email: string, password: string) {
      set({ isLoading: true });

      try {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
        });

        if (error) throw error;

        if (data.user) {
          const salt = EncryptionService.generateSalt();
          const masterKey = await EncryptionService.deriveMasterKey(password, salt);

          // Save profile with salt
          await DatabaseService.saveUserProfile(data.user.id, salt);

          // Save device
          const deviceId = EncryptionService.generateRandomString();
          await DatabaseService.saveDevice(data.user.id, deviceId);

          set({
            user: { id: data.user.id, email: data.user.email! },
            masterKey,
            isUnlocked: true,
            lastActivity: new Date(),
            deviceId,
          });
        }
      } finally {
        set({ isLoading: false });
      }
    },

    async signIn(email: string, password: string) {
      set({ isLoading: true });

      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;

        await get().unlockVault(password);
      } finally {
        set({ isLoading: false });
      }
    },

    async signOut() {
      const { error } = await supabase.auth.signOut();
      if (error) console.error('Sign out error:', error);

      // Clear IndexedDB
      try {
        await IndexedDBService.clearAll();
      } catch (error) {
        console.error('Error clearing IndexedDB:', error);
      }

      set({
        user: null,
        masterKey: null,
        isUnlocked: false,
        lastActivity: null,
        vaults: [],
        currentVaultId: null,
      });
    },

    async unlockVault(password: string) {
      if (!get().user) throw new Error('No user logged in');

      const userId = get().user!.id;
      const profile = await DatabaseService.getUserProfile(userId);
      const salt = profile ? profile.salt : EncryptionService.generateSalt();

      const masterKey = await EncryptionService.deriveMasterKey(password, salt);

      // Update device last seen
      await DatabaseService.updateDeviceLastSeen(get().deviceId);

      set({
        masterKey,
        isUnlocked: true,
        lastActivity: new Date(),
      });

      // Load user's vaults after unlock
      await get().loadVaults();
    },

    async unlockWithPin(pin: string) {
      const encryptedPinKey = get().encryptedPinKey;
      if (!encryptedPinKey || !get().user) throw new Error('PIN not set or no user');

      const userId = get().user!.id;
      const pinDerivedKey = await EncryptionService.deriveMasterKey(pin, EncryptionService.generateSalt());
      const masterKeyBase64 = await EncryptionService.decrypt(encryptedPinKey, pinDerivedKey);
      const masterKey = EncryptionService.fromBase64(masterKeyBase64);

      set({
        masterKey,
        isUnlocked: true,
        lastActivity: new Date(),
      });

      await get().loadVaults();
    },

    async setPin(pin: string) {
      if (!get().masterKey || !get().user) throw new Error('Not unlocked or no user');

      const pinDerivedKey = await EncryptionService.deriveMasterKey(pin, EncryptionService.generateSalt());
      const masterKeyBase64 = EncryptionService.toBase64(get().masterKey!);
      const encryptedMasterKey = await EncryptionService.encrypt(masterKeyBase64, pinDerivedKey);

      set({ encryptedPinKey: encryptedMasterKey });
    },

    reset() {
      set({
        ...initialAuthState,
        ...initialVaultState,
      });
    },

    async hydrate() {
      set({ isLoading: true });

      try {
        const user = await get().getCurrentUser();
        if (user) {
          set({ user });
          await get().checkSession();
        }
      } catch (error) {
        console.error('Hydration error:', error);
      } finally {
        set({ isLoading: false });
      }
    },

    async getCurrentUser() {
      const { data: { user } } = await supabase.auth.getUser();
      return user ? { id: user.id, email: user.email! } : null;
    },

    async checkSession() {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error) console.error('Session check error:', error);
      // Session validation logic here if needed
    },
  };
}

// Vault UI actions
function vaultUIActions(set: any, get: () => AppStore): VaultUIActions {
  return {
    async createVault(name: string) {
      const masterKey = get().masterKey!;
      const userId = get().user!.id;

      const vault = await DatabaseService.createVault(userId, name, masterKey);

      // Refresh vaults in state
      await get().loadVaults();

      return vault;
    },

    async loadVaults() {
      set({ isLoading: true });
      try {
        const masterKey = get().masterKey!;
        const userId = get().user!.id;

        const vaults = await DatabaseService.getVaults(userId, masterKey);

        set({ vaults, error: null });
      } catch (error) {
        console.error('Error loading vaults:', error);
        set({ error: error instanceof Error ? error.message : 'Failed to load vaults' });
      } finally {
        set({ isLoading: false });
      }
    },

    selectVault(vaultId: string) {
      set({ currentVaultId: vaultId });
    },

    async createItem(vaultId: string, itemData: Omit<VaultItem, 'id' | 'vaultId' | 'createdAt' | 'updatedAt'>) {
      const masterKey = get().masterKey!;

      const item = await DatabaseService.createVaultItem(vaultId, itemData, masterKey);

      // Refresh local state
      await get().loadVaults();

      return item;
    },

    async updateItem(itemId: string, updates: Partial<VaultItem>) {
      const masterKey = get().masterKey!;

      await DatabaseService.updateVaultItem(itemId, updates, masterKey);

      // Refresh local state
      await get().loadVaults();
    },

    async deleteItem(itemId: string) {
      await DatabaseService.deleteVaultItem(itemId);

      // Refresh local state
      await get().loadVaults();
    },

    async copyToClipboard(text: string, type: 'password' | 'username') {
      try {
        await navigator.clipboard.writeText(text);

        // Auto-clear after 30 seconds for passwords
        if (type === 'password') {
          setTimeout(() => {
            navigator.clipboard.writeText('');
          }, 30000);
        }
      } catch (error) {
        console.error('Clipboard error:', error);
      }
    },
  };
}
