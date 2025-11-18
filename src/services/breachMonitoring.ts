// Breach Monitoring Service
// Integrates with Have I Been Pwned API for password breach detection
// RFC 9166 - Integrity Checksums

interface BreachInfo {
  name: string; // Breach/incident name
  title: string; // Breach title
  domain: string; // Domain
  breachDate: string; // When the breach occurred
  addedDate: string; // When added to HIBP
  modifiedDate: string; // Last modified date
  pwnCount: number; // Number of affected accounts
  description: string; // Breach description
  logoPath: string; // Path to logo image
  dataClasses: string[]; // Types of data exposed
  isVerified: boolean; // Verified breach
  isFabricated: boolean; // Fabricated data
  isSensitive: boolean; // Sensitive breach
  isRetired: boolean; // Breach is retired
  isSpamList: boolean; // Spam list
}

interface PasswordBreachCheck {
  hashPrefix: string;
  hashSuffixes: string[];
}

interface BreachResult {
  breached: boolean;
  count?: number; // Number of times password was found
  breaches?: BreachInfo[]; // Associated breaches
  checkedAt: Date;
  passwordHash: string;
}

class BreachMonitoringService {
  private static instance: BreachMonitoringService;
  private readonly HIBP_API_BASE = 'https://api.pwnedpasswords.com';
  private readonly CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

  constructor() {
    if (!BreachMonitoringService.instance) {
      BreachMonitoringService.instance = this;
    }
    return BreachMonitoringService.instance;
  }

  static getInstance(): BreachMonitoringService {
    if (!BreachMonitoringService.instance) {
      BreachMonitoringService.instance = new BreachMonitoringService();
    }
    return BreachMonitoringService.instance;
  }

  // Check if password has been breached (k-anonymity model)
  // Sends only first 5 characters of SHA-1 hash to HIBP API
  async checkPassword(password: string): Promise<BreachResult> {
    try {
      // Create SHA-1 hash of password
      const hash = await this.sha1(password);
      const hashUpper = hash.toUpperCase();

      // Split into prefix (first 5 chars) and suffix
      const hashPrefix = hashUpper.substring(0, 5);
      const hashSuffix = hashUpper.substring(5);

      // Check cache first
      const cached = this.getCachedResult(hash);
      if (cached && Date.now() - cached.checkedAt.getTime() < this.CACHE_DURATION) {
        return cached;
      }

      // Query HIBP API with k-anonymity
      const response = await fetch(`${this.HIBP_API_BASE}/range/${hashPrefix}`, {
        headers: {
          'User-Agent': 'HushKey-Password-Manager/1.0',
          'Add-Padding': 'true', // Enable padding for better privacy
        },
      });

      if (!response.ok) {
        throw new Error(`HIBP API error: ${response.status}`);
      }

      const apiResponse = await response.text();
      const lines = apiResponse.split('\n');
      let foundCount = 0;

      // Check if our password hash suffix exists in response
      for (const line of lines) {
        const [suffix, count] = line.trim().split(':');
        if (suffix === hashSuffix) {
          foundCount = parseInt(count);
          break;
        }
      }

      const result: BreachResult = {
        breached: foundCount > 0,
        count: foundCount || undefined,
        checkedAt: new Date(),
        passwordHash: hashUpper,
      };

      // Cache the result
      this.cacheResult(hash, result);

      return result;
    } catch (error) {
      console.error('Breach monitoring failed:', error);
      throw new Error(`Failed to check password breach status: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Get breach information for an account
  async getAccountBreaches(email: string): Promise<BreachInfo[]> {
    try {
      // Note: Account breaches API requires API key for official use
      // For demo purposes, we'll use a placeholder
      console.log('Account breach checking not fully implemented - would require HIBP API key');

      // Placeholder response - in production, this would query the HIBP breaches API
      return [];
    } catch (error) {
      console.error('Account breach check failed:', error);
      return [];
    }
  }

  // Get all breaches (general info)
  async getAllBreaches(): Promise<BreachInfo[]> {
    try {
      const response = await fetch('https://haveibeenpwned.com/api/v3/breaches', {
        headers: {
          'User-Agent': 'HushKey-Password-Manager/1.0',
        },
      });

      if (!response.ok) {
        throw new Error(`Breaches API error: ${response.status}`);
      }

      const breaches: BreachInfo[] = await response.json();
      return breaches;
    } catch (error) {
      console.error('Failed to fetch breaches:', error);
      return [];
    }
  }

  // Check if website/domain has been breached
  async checkDomainBreach(domain: string): Promise<BreachInfo[]> {
    try {
      const breaches = await this.getAllBreaches();
      return breaches.filter(breach =>
        breach.domain?.toLowerCase() === domain.toLowerCase()
      );
    } catch (error) {
      console.error('Domain breach check failed:', error);
      return [];
    }
  }

  // Generate secure hash for caching
  private async sha1(input: string): Promise<string> {
    if (crypto && crypto.subtle) {
      const encoder = new TextEncoder();
      const data = encoder.encode(input);
      const hashBuffer = await crypto.subtle.digest('SHA-1', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    } else {
      // Fallback (not cryptographically secure)
      throw new Error('SHA-1 not available');
    }
  }

  // Cache management
  private cacheResult(hash: string, result: BreachResult): void {
    try {
      const cacheKey = `hushkey-breach-${hash.substring(0, 10)}`;
      localStorage.setItem(cacheKey, JSON.stringify(result));
    } catch (error) {
      console.warn('Failed to cache breach result:', error);
    }
  }

  private getCachedResult(hash: string): BreachResult | null {
    try {
      const cacheKey = `hushkey-breach-${hash.substring(0, 10)}`;
      const cached = localStorage.getItem(cacheKey);
      return cached ? JSON.parse(cached) : null;
    } catch (error) {
      console.warn('Failed to get cached breach result:', error);
      return null;
    }
  }

  // Clear cache
  clearCache(): void {
    try {
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.startsWith('hushkey-breach-')) {
          localStorage.removeItem(key);
        }
      });
    } catch (error) {
      console.warn('Failed to clear breach cache:', error);
    }
  }

  // Get privacy information for user education
  getPrivacyInfo(): {
    description: string;
    whatWeCheck: string[];
    howItWorks: string;
    privacyGuarantees: string[];
  } {
    return {
      description: 'HushKey uses "k-anonymity" to check if your passwords have been exposed in data breaches.',
      whatWeCheck: [
        'Passwords are checked against known breach databases',
        'Only the first 5 characters of a password hash are sent to external APIs',
        'Private information is never transmitted in plain text'
      ],
      howItWorks: 'A "k-anonymity" algorithm ensures that your specific password cannot be identified from the transmitted data. Only statistical information is exchanged.',
      privacyGuarantees: [
        'No passwords are sent to external services',
        'Only cryptographic hashes are used for checking',
        'Privacy-preserving algorithms protect your data',
        'All checks happen locally when possible'
      ]
    };
  }

  // Anonymized statistics (for future features)
  getBreachStatistics(): Promise<{
    totalBreaches: number;
    checkedPasswords: number;
    compromisedPasswords: number;
    lastUpdated: Date;
  }> {
    // Would track local statistics about user's breach checking
    // This is a placeholder for future implementation
    return Promise.resolve({
      totalBreaches: 0,
      checkedPasswords: 0,
      compromisedPasswords: 0,
      lastUpdated: new Date(),
    });
  }
}

export default BreachMonitoringService.getInstance();
