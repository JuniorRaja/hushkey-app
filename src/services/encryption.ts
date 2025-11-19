class EncryptionService {
  private static instance: EncryptionService;

  private constructor() {}

  static getInstance(): EncryptionService {
    if (!EncryptionService.instance) {
      EncryptionService.instance = new EncryptionService();
    }
    return EncryptionService.instance;
  }

  async initialize(): Promise<void> {
    // No initialization needed for Web Crypto API
  }

  // Key derivation using PBKDF2
  async deriveMasterKey(password: string, salt: Uint8Array): Promise<Uint8Array> {
    const passwordBytes = new TextEncoder().encode(password);
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      passwordBytes,
      'PBKDF2',
      false,
      ['deriveBits']
    );

    const derivedBits = await crypto.subtle.deriveBits(
      {
        name: 'PBKDF2',
        salt: salt,
        iterations: 600000,
        hash: 'SHA-256'
      },
      keyMaterial,
      256
    );

    return new Uint8Array(derivedBits);
  }

  // Derive PIN key
  async derivePinKey(pin: string, userId: string): Promise<string> {
    const combinedInput = `${pin}:${userId}`;
    const inputBytes = new TextEncoder().encode(combinedInput);
    const hashBuffer = await crypto.subtle.digest('SHA-256', inputBytes);
    return Array.from(new Uint8Array(hashBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }

  // Encrypt data using AES-256-GCM
  async encrypt(data: string, key: Uint8Array): Promise<string> {
    const iv = this.generateNonce();
    const dataBytes = new TextEncoder().encode(data);
    
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      key,
      'AES-GCM',
      false,
      ['encrypt']
    );

    const ciphertext = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv: iv },
      cryptoKey,
      dataBytes
    );

    const result = new Uint8Array(iv.length + ciphertext.byteLength);
    result.set(iv);
    result.set(new Uint8Array(ciphertext), iv.length);

    return this.toBase64(result);
  }

  // Decrypt data
  async decrypt(encryptedData: string, key: Uint8Array): Promise<string> {
    const cipherBytes = this.fromBase64(encryptedData);
    const iv = cipherBytes.slice(0, 12);
    const ciphertext = cipherBytes.slice(12);

    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      key,
      'AES-GCM',
      false,
      ['decrypt']
    );

    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: iv },
      cryptoKey,
      ciphertext
    );

    return new TextDecoder().decode(decrypted);
  }

  // Generate a random salt
  generateSalt(length: number = 16): Uint8Array {
    return crypto.getRandomValues(new Uint8Array(length));
  }

  // Generate a random key
  generateRandomKey(): Uint8Array {
    return this.generateSalt(32);
  }

  // Generate a random string (for IDs)
  generateRandomString(length: number = 32): string {
    const bytes = this.generateSalt(length);
    return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
  }

  // Generate UUID v4
  generateUUID(): string {
    return crypto.randomUUID();
  }

  // Generate nonce for encryption
  generateNonce(): Uint8Array {
    return this.generateSalt(12); // AES-GCM IV size
  }

  // Utility methods for base64 encoding
  toBase64(data: Uint8Array): string {
    return btoa(String.fromCharCode(...data));
  }

  fromBase64(base64: string): Uint8Array {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  }

  // Generate asymmetric keypair for secure sharing
  async generateKeypair(): Promise<{ publicKey: Uint8Array; privateKey: Uint8Array }> {
    const keypair = await crypto.subtle.generateKey(
      {
        name: 'ECDH',
        namedCurve: 'P-256'
      },
      true,
      ['deriveBits']
    );

    const publicKey = await crypto.subtle.exportKey('raw', keypair.publicKey);
    const privateKey = await crypto.subtle.exportKey('pkcs8', keypair.privateKey);

    return {
      publicKey: new Uint8Array(publicKey),
      privateKey: new Uint8Array(privateKey)
    };
  }

  // TOTP related (for later phase)
  async generateTOTP(secret: string, timeStep: number = 30, digits: number = 6): Promise<string> {
    const epoch = Math.floor(Date.now() / 1000);
    const timeWindow = Math.floor(epoch / timeStep);

    const hmac = await this.simpleHMAC(secret, timeWindow.toString());
    const offset = hmac[hmac.length - 1] & 0xf;
    const code = (hmac[offset] & 0x7f) << 24 |
                (hmac[offset + 1] & 0xff) << 16 |
                (hmac[offset + 2] & 0xff) << 8 |
                (hmac[offset + 3] & 0xff);

    return (code % Math.pow(10, digits)).toString().padStart(digits, '0');
  }

  private async simpleHMAC(key: string, message: string): Promise<number[]> {
    const keyBytes = new TextEncoder().encode(key);
    const messageBytes = new TextEncoder().encode(message);

    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      keyBytes,
      { name: 'HMAC', hash: 'SHA-1' },
      false,
      ['sign']
    );

    const signature = await crypto.subtle.sign('HMAC', cryptoKey, messageBytes);
    return Array.from(new Uint8Array(signature));
  }
}

export default EncryptionService.getInstance();
