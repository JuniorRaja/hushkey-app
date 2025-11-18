import { ready as sodiumReady, crypto_secretbox_easy, crypto_secretbox_open_easy, crypto_pwhash, crypto_kx_keypair, crypto_kx_client_session_keys, crypto_kx_server_session_keys, crypto_box_easy, crypto_box_open_easy, crypto_sign_keypair, randombytes_buf, crypto_generichash } from 'libsodium-wrappers';

class EncryptionService {
  private static instance: EncryptionService;
  private sodium: any = null;

  private constructor() {}

  static getInstance(): EncryptionService {
    if (!EncryptionService.instance) {
      EncryptionService.instance = new EncryptionService();
    }
    return EncryptionService.instance;
  }

  async initialize(): Promise<void> {
    await sodiumReady;
    this.sodium = {
      crypto_secretbox_easy,
      crypto_secretbox_open_easy,
      crypto_pwhash,
      crypto_kx_keypair,
      crypto_kx_client_session_keys,
      crypto_kx_server_session_keys,
      crypto_box_easy,
      crypto_box_open_easy,
      crypto_sign_keypair,
      randombytes_buf,
      crypto_generichash,
    };
  }

  // Key derivation using Argon2id
  async deriveMasterKey(password: string, salt: Uint8Array): Promise<Uint8Array> {
    if (!this.sodium) await this.initialize();

    const keyLength = 32; // 256 bits
    const opsLimit = this.sodium.crypto_pwhash.OPSLIMIT_SENSITIVE;
    const memLimit = this.sodium.crypto_pwhash.MEMLIMIT_SENSITIVE;
    const algorithm = this.sodium.crypto_pwhash.ALG_ARGON2ID13;

    return this.sodium.crypto_pwhash(
      keyLength,
      password,
      salt,
      opsLimit,
      memLimit,
      algorithm
    );
  }

  // Derive PIN key
  async derivePinKey(pin: string, userId: string): Promise<string> {
    if (!this.sodium) await this.initialize();

    const combinedInput = `${pin}:${userId}`;
    return this.sodium.crypto_generichash(32, combinedInput).toString();
  }

  // Encrypt data using AES-256-GCM equivalent with libsodium
  async encrypt(data: string, key: Uint8Array): Promise<string> {
    if (!this.sodium) await this.initialize();

    const nonce = this.generateNonce();
    const ciphertext = this.sodium.crypto_secretbox_easy(data, nonce, key);
    const result = new Uint8Array(nonce.length + ciphertext.length);
    result.set(nonce);
    result.set(ciphertext, nonce.length);

    return this.toBase64(result);
  }

  // Decrypt data
  async decrypt(encryptedData: string, key: Uint8Array): Promise<string> {
    if (!this.sodium) await this.initialize();

    const cipherBytes = this.fromBase64(encryptedData);
    const nonce = cipherBytes.slice(0, 24); // libsodium nonce size
    const ciphertext = cipherBytes.slice(24);

    return this.sodium.crypto_secretbox_open_easy(ciphertext, nonce, key);
  }

  // Generate a random salt
  generateSalt(length: number = 16): Uint8Array {
    if (!this.sodium) return randombytes_buf(length);
    return this.sodium.randombytes_buf(length);
  }

  // Generate a random key
  generateRandomKey(): Uint8Array {
    return this.generateSalt(32);
  }

  // Generate a random string (for IDs)
  generateRandomString(length: number = 32): string {
    if (!this.sodium) return randombytes_buf(length).toString();
    return this.sodium.randombytes_buf(length).toString();
  }

  // Generate nonce for encryption
  generateNonce(): Uint8Array {
    return this.generateSalt(24); // libsodium nonce size
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
    if (!this.sodium) await this.initialize();
    return this.sodium.crypto_kx_keypair();
  }

  // TOTP related (for later phase)
  generateTOTP(secret: string, timeStep: number = 30, digits: number = 6): string {
    const epoch = Math.floor(Date.now() / 1000);
    const timeWindow = Math.floor(epoch / timeStep);

    // HMAC-SHA1 calculation would go here
    // For now, simplified implementation
    const hmac = this.simpleHMAC(secret, timeWindow.toString());
    const offset = hmac[hmac.length - 1] & 0xf;
    const code = (hmac[offset] & 0x7f) << 24 |
                (hmac[offset + 1] & 0xff) << 16 |
                (hmac[offset + 2] & 0xff) << 8 |
                (hmac[offset + 3] & 0xff);

    return (code % Math.pow(10, digits)).toString().padStart(digits, '0');
  }

  private simpleHMAC(key: string, message: string): number[] {
    // Simplified HMAC for demonstration - in production use proper crypto
    // This should use Web Crypto API or libsodium
    const keyBytes = new TextEncoder().encode(key);
    const messageBytes = new TextEncoder().encode(message);

    // Very basic hash combination - NOT secure for production!
    const combined = new Uint8Array(keyBytes.length + messageBytes.length);
    combined.set(keyBytes);
    combined.set(messageBytes, keyBytes.length);

    const hash = this.sodium ? this.sodium.crypto_generichash(32, combined) :
                               crypto.getRandomValues(new Uint8Array(32));

    return Array.from(hash);
  }
}

export default EncryptionService.getInstance();
