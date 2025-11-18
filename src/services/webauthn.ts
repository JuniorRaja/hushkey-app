// WebAuthn (FIDO2) Authentication Service for Hardware Key Support
// Implements RFC 8152 / W3C Web Authentication API

interface PublicKeyCredential extends Credential {
  rawId: ArrayBuffer;
  response: {
    attestationObject: ArrayBuffer;
    clientDataJSON: ArrayBuffer;
    authenticatorData?: ArrayBuffer;
    signature?: ArrayBuffer;
    userHandle?: ArrayBuffer;
    getTransports?: () => string[];
  };
  getClientExtensionResults(): AuthenticationExtensionsClientOutputs;
}

interface WebAuthnCredential {
  id: string;
  publicKey: string; // Base64 encoded
  algorithm: string;
  transports?: string[];
  createdAt: Date;
  lastUsed: Date;
  name: string;
}

class WebAuthnService {
  private static instance: WebAuthnService;

  static getInstance(): WebAuthnService {
    if (!WebAuthnService.instance) {
      WebAuthnService.instance = new WebAuthnService();
    }
    return WebAuthnService.instance;
  }

  // Check if WebAuthn is supported
  isSupported(): boolean {
    return !!window.PublicKeyCredential;
  }

  // Check if platform authenticator is available
  async isPlatformAuthenticatorAvailable(): Promise<boolean> {
    if (!PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable) {
      return false;
    }

    try {
      return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable!();
    } catch {
      return false;
    }
  }

  // Convert ArrayBuffer to base64url
  private arrayBufferToBase64Url(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let str = '';
    for (const byte of bytes) {
      str += String.fromCharCode(byte);
    }
    return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }

  // Convert base64url to ArrayBuffer
  private base64UrlToArrayBuffer(base64Url: string): ArrayBuffer {
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
  }

  // Generate random challenge
  private generateChallenge(length: number = 32): ArrayBuffer {
    const array = new Uint8Array(length);
    crypto.getRandomValues(array);
    return array.buffer;
  }

  // Create new WebAuthn credential for user
  async createCredential(userId: string, userName: string, userDisplayName: string): Promise<WebAuthnCredential> {
    const challenge = this.generateChallenge();

    const createCredentialOptions: PublicKeyCredentialCreationOptions = {
      challenge,
      rp: {
        name: 'HushKey',
        id: window.location.hostname,
      },
      user: {
        id: new TextEncoder().encode(userId),
        name: userName,
        displayName: userDisplayName,
      },
      pubKeyCredParams: [
        { alg: -7, type: 'public-key' }, // ES256
        { alg: -257, type: 'public-key' }, // RS256
      ],
      authenticatorSelection: {
        authenticatorAttachment: 'cross-platform', // Allow any authenticator
        requireResidentKey: false,
        userVerification: 'preferred',
      },
      timeout: 60000,
      attestation: 'direct',
    };

    try {
      const credential = await navigator.credentials.create({
        publicKey: createCredentialOptions
      }) as PublicKeyCredential;

      const newCredential: WebAuthnCredential = {
        id: this.arrayBufferToBase64Url(credential.rawId),
        publicKey: this.arrayBufferToBase64Url(credential.response.attestationObject),
        algorithm: 'ES256', // Default, could extract from credential
        transports: credential.response.getTransports ? credential.response.getTransports() : [],
        createdAt: new Date(),
        lastUsed: new Date(),
        name: `${credential.id.slice(0, 8)}...`,
      };

      return newCredential;
    } catch (error) {
      console.error('WebAuthn credential creation failed:', error);
      throw new Error(`Failed to create WebAuthn credential: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Authenticate with WebAuthn credential
  async authenticateWithCredential(credentialId: string): Promise<boolean> {
    const challenge = this.generateChallenge();

    const requestOptions: PublicKeyCredentialRequestOptions = {
      challenge,
      allowCredentials: [{
        id: this.base64UrlToArrayBuffer(credentialId),
        type: 'public-key',
        transports: ['usb', 'nfc', 'ble', 'internal'],
      }],
      timeout: 60000,
      userVerification: 'preferred',
    };

    try {
      const assertion = await navigator.credentials.get({
        publicKey: requestOptions
      }) as PublicKeyCredential;

      // Verify the assertion (in production, this should be done server-side)
      const clientDataJSON = JSON.parse(new TextDecoder().decode(assertion.response.clientDataJSON));

      // Check challenge
      if (this.arrayBufferToBase64Url(assertion.response.clientDataJSON) !== this.arrayBufferToBase64Url(challenge)) {
        throw new Error('Challenge verification failed');
      }

      // Check origin
      if (clientDataJSON.origin !== window.location.origin) {
        throw new Error('Origin verification failed');
      }

      return true;
    } catch (error) {
      console.error('WebAuthn authentication failed:', error);
      return false;
    }
  }

  // List available authenticators (browsers may not support this consistently)
  async getAvailableAuthenticators(): Promise<AuthenticatorInfo[]> {
    // This is not well supported; most browsers don't expose this information
    return [];
  }

  // Store WebAuthn credential (would typically save to database)
  async saveCredential(userId: string, credential: WebAuthnCredential): Promise<void> {
    const credentials = JSON.parse(localStorage.getItem(`hushkey-webauthn-${userId}`) || '[]');
    credentials.push(credential);
    localStorage.setItem(`hushkey-webauthn-${userId}`, JSON.stringify(credentials));
  }

  // Get user's WebAuthn credentials
  async getUserCredentials(userId: string): Promise<WebAuthnCredential[]> {
    const stored = localStorage.getItem(`hushkey-webauthn-${userId}`);
    if (!stored) return [];
    return JSON.parse(stored);
  }

  // Remove WebAuthn credential
  async removeCredential(userId: string, credentialId: string): Promise<void> {
    const credentials = await this.getUserCredentials(userId);
    const filtered = credentials.filter(c => c.id !== credentialId);
    localStorage.setItem(`hushkey-webauthn-${userId}`, JSON.stringify(filtered));
  }

  // Update last used timestamp
  async updateLastUsed(userId: string, credentialId: string): Promise<void> {
    const credentials = await this.getUserCredentials(userId);
    const updated = credentials.map(c =>
      c.id === credentialId ? { ...c, lastUsed: new Date() } : c
    );
    localStorage.setItem(`hushkey-webauthn-${userId}`, JSON.stringify(updated));
  }
}

// Interface for authenticator information (limited browser support)
interface AuthenticatorInfo {
  id: string;
  name: string;
  attachment: 'platform' | 'cross-platform';
  supportsResidentKeys: boolean;
  supportsUserVerification: boolean;
}

export default WebAuthnService.getInstance();
