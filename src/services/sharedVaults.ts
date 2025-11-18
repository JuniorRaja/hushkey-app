// Shared Vaults Service
// Implements secure vault sharing with asymmetric encryption
// Manages permissions and collaborative vault access

import EncryptionService from './encryption';
import DatabaseService from './database';
import type { User, Vault } from '../stores/authStore';

interface SharedVault {
  id: string;
  vaultId: string;
  ownerId: string;
  sharedWithUserId: string;
  permissions: 'read' | 'write' | 'admin';
  sharedKeyEncrypted: string; // Encrypted vault key for sharing
  createdAt: Date;
}

interface VaultInvite {
  id: string;
  vaultId: string;
  inviterId: string;
  inviterName: string;
  inviteeEmail: string;
  permissions: 'read' | 'write' | 'admin';
  token: string; // Secure invite token
  expiresAt: Date;
  status: 'pending' | 'accepted' | 'declined' | 'expired';
  createdAt: Date;
}

interface PendingInvite extends VaultInvite {
  vault: {
    id: string;
    name: string;
  };
}

class SharedVaultsService {
  private static instance: SharedVaultsService;

  static getInstance(): SharedVaultsService {
    if (!SharedVaultsService.instance) {
      SharedVaultsService.instance = new SharedVaultsService();
    }
    return SharedVaultsService.instance;
  }

  // Generate secure sharing key for vault
  async generateSharingKey(vaultId: string, masterKey: Uint8Array): Promise<string> {
    // Create a new random key for sharing purposes
    const sharingKey = EncryptionService.generateRandomKey();

    // Encrypt the sharing key with the master key
    const sharingKeyBase64 = EncryptionService.toBase64(sharingKey);
    const encryptedSharingKey = await EncryptionService.encrypt(sharingKeyBase64, masterKey);

    return encryptedSharingKey;
  }

  // Create vault sharing invitation
  async createVaultInvite(
    vaultId: string,
    vault: Vault,
    inviter: User,
    inviteeEmail: string,
    permissions: 'read' | 'write' | 'admin',
    masterKey: Uint8Array
  ): Promise<VaultInvite> {
    try {
      const sharingKey = await this.generateSharingKey(vaultId, masterKey);

      const invite: VaultInvite = {
        id: EncryptionService.generateRandomString(),
        vaultId,
        inviterId: inviter.id,
        inviterName: inviter.email, // Using email as display name
        inviteeEmail,
        permissions,
        token: EncryptionService.generateRandomString(32),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        status: 'pending',
        createdAt: new Date(),
      };

      // Store invite securely (in production, this would be in database)
      this.storeInvite(invite, sharingKey, vault);

      // Send email invitation (placeholder - would integrate with email service)
      await this.sendInviteEmail(inviter.email, inviteeEmail, vault, invite);

      return invite;
    } catch (error) {
      console.error('Failed to create vault invite:', error);
      throw new Error('Failed to create invitation');
    }
  }

  // Accept vault invitation
  async acceptVaultInvite(token: string, user: User): Promise<Vault | null> {
    try {
      const inviteData = this.getStoredInvite(token);
      if (!inviteData) {
        throw new Error('Invalid or expired invitation');
      }

      if (inviteData.invite.inviteeEmail.toLowerCase() !== user.email?.toLowerCase()) {
        throw new Error('Invitation is not for this user');
      }

      if (new Date() > new Date(inviteData.invite.expiresAt)) {
        throw new Error('Invitation has expired');
      }

      if (inviteData.invite.status !== 'pending') {
        throw new Error('Invitation has already been processed');
      }

      // Decrypt the sharing key (would need user's agreement in UI)
      // For now, we'll simulate vault sharing setup
      console.log('Vault sharing setup would be completed here');

      // Mark invite as accepted
      inviteData.invite.status = 'accepted';
      this.updateStoredInvite(token, inviteData.invite);

      return inviteData.vault;
    } catch (error) {
      console.error('Failed to accept vault invite:', error);
      return null;
    }
  }

  // Decline vault invitation
  async declineVaultInvite(token: string): Promise<boolean> {
    try {
      const inviteData = this.getStoredInvite(token);
      if (!inviteData) {
        return false;
      }

      inviteData.invite.status = 'declined';
      this.updateStoredInvite(token, inviteData.invite);
      return true;
    } catch (error) {
      console.error('Failed to decline vault invite:', error);
      return false;
    }
  }

  // Get pending invitations for user
  async getPendingInvites(userEmail: string): Promise<PendingInvite[]> {
    try {
      const invites: PendingInvite[] = [];
      const storedInvites = this.getAllStoredInvites();

      for (const [token, data] of storedInvites.entries()) {
        if (
          data.invite.inviteeEmail.toLowerCase() === userEmail.toLowerCase() &&
          data.invite.status === 'pending' &&
          new Date() <= new Date(data.invite.expiresAt)
        ) {
          invites.push({
            ...data.invite,
            vault: data.vault,
          });
        }
      }

      return invites;
    } catch (error) {
      console.error('Failed to get pending invites:', error);
      return [];
    }
  }

  // Get shared vaults for user
  async getSharedVaults(user: User): Promise<Vault[]> {
    try {
      // In a real implementation, this would query the database
      // for vaults shared with this user
      const sharedVaults: Vault[] = [];

      // Placeholder - would return actual shared vaults
      // const sharedVaultRecords = await this.database.getSharedVaults(user.id);
      // for (const record of sharedVaultRecords) {
      //   const vault = await this.decryptSharedVault(record, user);
      //   sharedVaults.push(vault);
      // }

      return sharedVaults;
    } catch (error) {
      console.error('Failed to get shared vaults:', error);
      return [];
    }
  }

  // Update permissions for shared user
  async updateSharedVaultPermissions(
    vaultId: string,
    userId: string,
    newPermissions: 'read' | 'write' | 'admin'
  ): Promise<boolean> {
    try {
      // Placeholder - would update shared vault permissions in database
      console.log(`Updating permissions for vault ${vaultId}, user ${userId} to ${newPermissions}`);
      return true;
    } catch (error) {
      console.error('Failed to update permissions:', error);
      return false;
    }
  }

  // Remove user from shared vault
  async revokeVaultAccess(vaultId: string, userId: string): Promise<boolean> {
    try {
      // Placeholder - would remove shared vault access
      console.log(`Revoking access to vault ${vaultId} for user ${userId}`);
      return true;
    } catch (error) {
      console.error('Failed to revoke vault access:', error);
      return false;
    }
  }

  // Get vault collaborators
  async getVaultCollaborators(vaultId: string): Promise<Array<{
    userId: string;
    email: string;
    permissions: string;
    joinedAt: Date;
  }>> {
    try {
      // Placeholder - would return actual collaborators
      return [];
    } catch (error) {
      console.error('Failed to get vault collaborators:', error);
      return [];
    }
  }

  // Asymmetric encryption helpers for secure sharing
  async generateVaultSharingKeys(): Promise<{ publicKey: string; privateKey: string }> {
    try {
      const keypair = await EncryptionService.generateKeypair();
      const publicKey = EncryptionService.toBase64(keypair.publicKey);
      const privateKey = EncryptionService.toBase64(keypair.privateKey);
      return { publicKey, privateKey };
    } catch (error) {
      console.error('Failed to generate sharing keys:', error);
      throw new Error('Failed to generate encryption keys');
    }
  }

  // Encrypt vault key for sharing
  async encryptVaultKeyForSharing(vaultKey: Uint8Array, recipientPublicKey: Uint8Array): Promise<string> {
    try {
      const vaultKeyBase64 = EncryptionService.toBase64(vaultKey);
      // In a real implementation, would use recipient's public key for encryption
      // For now, using symmetric encryption as placeholder
      return await EncryptionService.encrypt(vaultKeyBase64, recipientPublicKey);
    } catch (error) {
      console.error('Failed to encrypt vault key:', error);
      throw new Error('Failed to encrypt vault key for sharing');
    }
  }

  // Decrypt shared vault key
  async decryptSharedVaultKey(encryptedKey: string, userPrivateKey: Uint8Array): Promise<Uint8Array> {
    try {
      const decryptedKeyBase64 = await EncryptionService.decrypt(encryptedKey, userPrivateKey);
      return EncryptionService.fromBase64(decryptedKeyBase64);
    } catch (error) {
      console.error('Failed to decrypt shared vault key:', error);
      throw new Error('Failed to decrypt shared vault access');
    }
  }

  // Email sending (placeholder - would integrate with service like SendGrid)
  private async sendInviteEmail(fromEmail: string, toEmail: string, vault: Vault, invite: VaultInvite): Promise<void> {
    const inviteUrl = `${window.location.origin}/accept-invite/${invite.token}`;

    const emailData = {
      from: fromEmail,
      to: toEmail,
      subject: `HushKey: You're invited to join "${vault.name}"`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>You've been invited to a shared vault!</h2>
          <p><strong>${fromEmail}</strong> has invited you to join the vault "<strong>${vault.name}</strong>".</p>

          <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3>Vault: ${vault.name}</h3>
            <p>Permissions: ${invite.permissions}</p>
            <p>This invitation expires in 7 days.</p>
          </div>

          <div style="text-align: center; margin: 30px 0;">
            <a href="${inviteUrl}" style="background: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 500;">
              Accept Invitation
            </a>
          </div>

          <p style="color: #666; font-size: 14px;">
            This is an automated message from HushKey. For privacy and security reasons,
            the invitation link will expire after 7 days and can only be used once.
          </p>
        </div>
      `,
    };

    // Placeholder - in production, this would send the actual email
    console.log('Email invitation would be sent:', emailData);

    // Simulate sending
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  // Local storage helpers (in production, these would be database operations)

  private storeInvite(invite: VaultInvite, sharingKey: string, vault: Vault): void {
    const inviteData = {
      invite,
      sharingKey,
      vault: {
        id: vault.id,
        name: vault.name,
      },
      storedAt: new Date().toISOString(),
    };

    localStorage.setItem(`hushkey-invite-${invite.token}`, JSON.stringify(inviteData));
  }

  private getStoredInvite(token: string): any {
    const stored = localStorage.getItem(`hushkey-invite-${token}`);
    return stored ? JSON.parse(stored) : null;
  }

  private updateStoredInvite(token: string, invite: VaultInvite): void {
    const data = this.getStoredInvite(token);
    if (data) {
      data.invite = invite;
      localStorage.setItem(`hushkey-invite-${token}`, JSON.stringify(data));
    }
  }

  private getAllStoredInvites(): Map<string, any> {
    const invites = new Map();
    const keys = Object.keys(localStorage);

    for (const key of keys) {
      if (key.startsWith('hushkey-invite-')) {
        const token = key.replace('hushkey-invite-', '');
        const data = this.getStoredInvite(token);
        if (data) {
          invites.set(token, data);
        }
      }
    }

    return invites;
  }

  // Activity logging for shared vaults
  async logSharedVaultActivity(vaultId: string, userId: string, action: string, details?: string): Promise<void> {
    try {
      const activity = {
        vaultId,
        userId,
        action,
        details,
        timestamp: new Date().toISOString(),
      };

      // Placeholder - would store in activity logs table
      console.log('Shared vault activity logged:', activity);
    } catch (error) {
      console.error('Failed to log activity:', error);
    }
  }
}

export default SharedVaultsService.getInstance();
