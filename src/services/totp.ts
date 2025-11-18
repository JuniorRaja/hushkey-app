// TOTP (Time-Based One-Time Password) implementation
// RFC 6238 - TOTP: Time-Based One-Time Password Algorithm
// RFC 4226 - HOTP: An HMAC-Based One-Time Password Algorithm

class TOTPService {
  private static instance: TOTPService;

  static getInstance(): TOTPService {
    if (!TOTPService.instance) {
      TOTPService.instance = new TOTPService();
    }
    return TOTPService.instance;
  }

  // Generate TOTP code from secret
  async generateTOTP(secret: string, timeStep: number = 30, digits: number = 6): Promise<string> {
    const epoch = Math.floor(Date.now() / 1000);
    const timeWindow = Math.floor(epoch / timeStep);

    const hmac = await this.hmacSHA1(this.base32ToBytes(secret), this.longToBytes(timeWindow));

    // Get offset from last byte
    const offset = hmac[hmac.length - 1] & 0xf;

    // Get 4 bytes starting from offset
    const code = ((hmac[offset] & 0x7f) << 24) |
                 ((hmac[offset + 1] & 0xff) << 16) |
                 ((hmac[offset + 2] & 0xff) << 8) |
                 (hmac[offset + 3] & 0xff);

    // Truncate to specified digits
    const token = (code % Math.pow(10, digits)).toString().padStart(digits, '0');

    return token;
  }

  // Generate HOTP (counter-based) code
  async generateHOTP(secret: string, counter: number, digits: number = 6): Promise<string> {
    const hmac = await this.hmacSHA1(this.base32ToBytes(secret), this.longToBytes(counter));

    const offset = hmac[hmac.length - 1] & 0xf;

    const code = ((hmac[offset] & 0x7f) << 24) |
                 ((hmac[offset + 1] & 0xff) << 16) |
                 ((hmac[offset + 2] & 0xff) << 8) |
                 (hmac[offset + 3] & 0xff);

    return (code % Math.pow(10, digits)).toString().padStart(digits, '0');
  }

  // Get remaining seconds in current time window
  getRemainingSeconds(timeStep: number = 30): number {
    const epoch = Math.floor(Date.now() / 1000);
    return timeStep - (epoch % timeStep);
  }

  // Parse TOTP URI (otpauth://totp/label?parameters=values)
  parseTOTPUri(uri: string): { label: string; secret: string; issuer: string; algorithm: string; digits: number; period: number } | null {
    try {
      const url = new URL(uri);
      if (url.protocol !== 'otpauth:' || url.host !== 'totp') {
        return null;
      }

      const label = decodeURIComponent(url.pathname.slice(1));
      const params = new URLSearchParams(url.search);

      return {
        label,
        secret: params.get('secret') || '',
        issuer: params.get('issuer') || '',
        algorithm: params.get('algorithm') || 'SHA1',
        digits: parseInt(params.get('digits') || '6'),
        period: parseInt(params.get('period') || '30'),
      };
    } catch (error) {
      return null;
    }
  }

  // Generate provisioning URI for TOTP
  generateTOTPUri(label: string, secret: string, issuer?: string, digits: number = 6, period: number = 30): string {
    const params = new URLSearchParams({
      secret,
      digits: digits.toString(),
      period: period.toString(),
    });

    if (issuer) {
      params.set('issuer', issuer);
    }

    return `otpauth://totp/${encodeURIComponent(label)}?${params.toString()}`;
  }

  // Generate a random secret key
  generateSecret(): string {
    const bytes = new Uint8Array(20); // 160 bits for SHA1
    crypto.getRandomValues(bytes);
    return this.bytesToBase32(bytes);
  }

  // Base32 encoding/decoding
  private bytesToBase32(bytes: Uint8Array): string {
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    let result = '';
    let bits = 0;
    let value = 0;

    for (let i = 0; i < bytes.length; i++) {
      value = (value << 8) | bytes[i];
      bits += 8;

      while (bits >= 5) {
        result += alphabet[(value >>> (bits - 5)) & 31];
        bits -= 5;
        value &= (1 << bits) - 1;
      }
    }

    if (bits > 0) {
      result += alphabet[(value << (5 - bits)) & 31];
    }

    return result;
  }

  private base32ToBytes(base32: string): Uint8Array {
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    const cleaned = base32.toUpperCase().replace(/[^A-Z2-7]/g, '');

    let bits = 0;
    let value = 0;
    const result: number[] = [];

    for (let i = 0; i < cleaned.length; i++) {
      const char = cleaned[i];
      const charIndex = alphabet.indexOf(char);
      if (charIndex === -1) continue;

      value = (value << 5) | charIndex;
      bits += 5;

      if (bits >= 8) {
        result.push((value >>> (bits - 8)) & 0xff);
        bits -= 8;
        value &= (1 << bits) - 1;
      }
    }

    return new Uint8Array(result);
  }

  // Convert number to 8-byte big-endian array
  private longToBytes(value: number): Uint8Array {
    const result = new Uint8Array(8);
    for (let i = 7; i >= 0; i--) {
      result[i] = value & 0xff;
      value = Math.floor(value / 256);
    }
    return result;
  }

  // HMAC-SHA1 implementation using Web Crypto API
  private async hmacSHA1(key: Uint8Array, message: Uint8Array): Promise<Uint8Array> {
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      key,
      { name: 'HMAC', hash: 'SHA-1' },
      false,
      ['sign']
    );

    const signature = await crypto.subtle.sign('HMAC', cryptoKey, message);
    return new Uint8Array(signature);
  }

  // Validate TOTP code
  async validateTOTP(secret: string, code: string, timeStep: number = 30, window: number = 1): Promise<boolean> {
    const epoch = Math.floor(Date.now() / 1000);
    const currentWindow = Math.floor(epoch / timeStep);

    // Check current window and adjacent windows
    for (let i = -window; i <= window; i++) {
      const checkWindow = currentWindow + i;
      const generatedCode = await this.generateTOTP(secret, timeStep, code.length);
      if (generatedCode === code) {
        return true;
      }
    }

    return false;
  }

  // Get list of common TOTP apps
  getSupportedApps(): Array<{ name: string; uri: string }> {
    return [
      { name: 'Google Authenticator', uri: 'https://play.google.com/store/apps/details?id=com.google.android.apps.authenticator2' },
      { name: 'Microsoft Authenticator', uri: 'https://www.microsoft.com/en-us/security/mobile-authenticator-app' },
      { name: 'Authy', uri: 'https://authy.com/download/' },
      { name: '1Password', uri: 'https://1password.com/downloads/' },
      { name: 'LastPass Authenticator', uri: 'https://lastpass.com/auth' },
      { name: 'Bitwarden Authenticator', uri: 'https://bitwarden.com/download/' },
    ];
  }
}

export default TOTPService.getInstance();
