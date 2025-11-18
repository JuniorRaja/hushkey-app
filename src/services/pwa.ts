// PWA Service for managing service worker registration and install prompts

interface PWAInstallPrompt extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

// PWA Service class
class PWAService {
  private static instance: PWAService;
  private deferredPrompt: PWAInstallPrompt | null = null;
  private isInstalled = false;
  private serviceWorkerRegistration: ServiceWorkerRegistration | null = null;

  static getInstance(): PWAService {
    if (!PWAService.instance) {
      PWAService.instance = new PWAService();
    }
    return PWAService.instance;
  }

  // Initialize PWA functionality
  async initialize(): Promise<void> {
    if (!this.isPWACompatible()) {
      console.log('[PWA] Browser does not support PWA features');
      return;
    }

    this.registerServiceWorker();
    this.setupInstallPrompt();
    this.checkInstallStatus();
    this.setupNetworkListeners();
    this.setupServiceWorkerMessages();
  }

  // Check if browser supports PWA features
  isPWACompatible(): boolean {
    return 'serviceWorker' in navigator && 'BeforeInstallPromptEvent' in window;
  }

  // Check if app is already installed
  isAppInstalled(): boolean {
    return this.isInstalled || window.matchMedia('(display-mode: standalone)').matches;
  }

  // Register service worker
  private async registerServiceWorker(): Promise<void> {
    if ('serviceWorker' in navigator) {
      try {
        console.log('[PWA] Registering service worker...');
        const registration = await navigator.serviceWorker.register('/sw.js', {
          scope: '/'
        });

        this.serviceWorkerRegistration = registration;

        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                this.showUpdateNotification();
              }
            });
          }
        });

        console.log('[PWA] Service worker registered successfully');
      } catch (error) {
        console.error('[PWA] Service worker registration failed:', error);
      }
    }
  }

  // Setup install prompt handling
  private setupInstallPrompt(): void {
    window.addEventListener('beforeinstallprompt', (e: Event) => {
      console.log('[PWA] Install prompt available');
      e.preventDefault();
      this.deferredPrompt = e as PWAInstallPrompt;
      this.showInstallPrompt();
    });

    window.addEventListener('appinstalled', () => {
      console.log('[PWA] App installed successfully');
      this.isInstalled = true;
      this.hideInstallPrompt();
      this.deferredPrompt = null;
    });
  }

  // Check current install status
  private checkInstallStatus(): void {
    // Check if running in standalone mode
    if (window.matchMedia('(display-mode: standalone)').matches) {
      this.isInstalled = true;
      return;
    }

    // Check if app was installed before
    const wasInstalled = localStorage.getItem('pwa-installed') === 'true';
    if (wasInstalled) {
      this.isInstalled = true;
    }
  }

  // Show install prompt to user
  private showInstallPrompt(): void {
    const promptElement = document.getElementById('pwa-install-prompt');
    if (promptElement) {
      promptElement.style.display = 'block';

      const installBtn = document.getElementById('install-btn');
      const dismissBtn = document.getElementById('dismiss-btn');

      installBtn?.addEventListener('click', () => {
        this.installPWA();
      });

      dismissBtn?.addEventListener('click', () => {
        this.hideInstallPrompt();
        // Remember dismissal for 7 days
        localStorage.setItem('pwa-install-dismissed', Date.now().toString());
      });
    }
  }

  // Hide install prompt
  private hideInstallPrompt(): void {
    const promptElement = document.getElementById('pwa-install-prompt');
    if (promptElement) {
      promptElement.style.display = 'none';
    }
  }

  // Trigger PWA installation
  async installPWA(): Promise<void> {
    if (!this.deferredPrompt) {
      console.log('[PWA] No install prompt available');
      return;
    }

    try {
      await this.deferredPrompt.prompt();
      const { outcome } = await this.deferredPrompt.userChoice;

      if (outcome === 'accepted') {
        console.log('[PWA] User accepted installation');
        localStorage.setItem('pwa-installed', 'true');
      } else {
        console.log('[PWA] User dismissed installation');
      }

      this.deferredPrompt = null;
      this.hideInstallPrompt();
    } catch (error) {
      console.error('[PWA] Installation failed:', error);
    }
  }

  // Show update notification
  private showUpdateNotification(): void {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = 'update-notification';
    notification.innerHTML = `
      <div class="update-content">
        <span>A new version of HushKey is available!</span>
        <button id="update-btn">Update Now</button>
        <button id="dismiss-update-btn">Later</button>
      </div>
    `;

    document.body.appendChild(notification);

    // Handle update button
    document.getElementById('update-btn')?.addEventListener('click', () => {
      this.updateApp();
      notification.remove();
    });

    // Handle dismiss button
    document.getElementById('dismiss-update-btn')?.addEventListener('click', () => {
      notification.remove();
    });
  }

  // Update the app
  private async updateApp(): Promise<void> {
    if (this.serviceWorkerRegistration) {
      const newWorker = this.serviceWorkerRegistration.waiting;
      if (newWorker) {
        // Tell service worker to skip waiting
        newWorker.postMessage({ type: 'SKIP_WAITING' });

        // Listen for controller change
        navigator.serviceWorker.addEventListener('controllerchange', () => {
          window.location.reload();
        });
      }
    }
  }

  // Setup network status listeners
  private setupNetworkListeners(): void {
    window.addEventListener('online', () => {
      console.log('[PWA] Back online');
      this.triggerSync();
    });

    window.addEventListener('offline', () => {
      console.log('[PWA] Gone offline');
    });
  }

  // Setup service worker message handling
  private setupServiceWorkerMessages(): void {
    navigator.serviceWorker?.addEventListener('message', (event) => {
      const { type, data } = event.data;

      switch (type) {
        case 'SYNC_COMPLETE':
          if (data.success) {
            console.log('[PWA] Background sync completed');
          } else {
            console.error('[PWA] Background sync failed:', data.error);
          }
          break;
        default:
          console.log('[PWA] Unknown service worker message:', type);
      }
    });
  }

  // Trigger background sync
  private async triggerSync(): Promise<void> {
    if (this.serviceWorkerRegistration && 'sync' in this.serviceWorkerRegistration) {
      try {
        await this.serviceWorkerRegistration.sync.register('vault-sync');
        console.log('[PWA] Background sync registered');
      } catch (error) {
        console.error('[PWA] Failed to register background sync:', error);
      }
    } else {
      // Fallback: trigger sync via service worker message
      navigator.serviceWorker.controller?.postMessage({
        type: 'SYNC_DATA'
      });
    }
  }

  // Handle periodic sync (if supported)
  async registerPeriodicSync(): Promise<void> {
    if (this.serviceWorkerRegistration && 'periodicSync' in this.serviceWorkerRegistration) {
      try {
        await (this.serviceWorkerRegistration as any).periodicSync.register('vault-periodic-sync', {
          minInterval: 24 * 60 * 60 * 1000, // 24 hours
        });
        console.log('[PWA] Periodic sync registered');
      } catch (error) {
        console.error('[PWA] Failed to register periodic sync:', error);
      }
    }
  }

  // Get cache statistics
  async getCacheStats(): Promise<{ static: number; data: number; total: number }> {
    const caches = await window.caches.keys();
    const staticCache = caches.find(name => name.includes('static'));
    const dataCache = caches.find(name => name.includes('data'));

    let staticSize = 0;
    let dataSize = 0;

    if (staticCache) {
      const cache = await window.caches.open(staticCache);
      const keys = await cache.keys();
      staticSize = (keys as Request[]).length;
    }

    if (dataCache) {
      const cache = await window.caches.open(dataCache);
      const keys = await cache.keys();
      dataSize = keys.length;
    }

    return {
      static: staticSize,
      data: dataSize,
      total: staticSize + dataSize
    };
  }

  // Clear all caches
  async clearCaches(): Promise<void> {
    if (navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: 'CLEAR_CACHE'
      });
    }

    // Also clear from main thread
    const cacheNames = await window.caches.keys();
    await Promise.all(
      cacheNames.map(name => window.caches.delete(name))
    );
  }

  // Check for updates
  async checkForUpdates(): Promise<boolean> {
    if (this.serviceWorkerRegistration) {
      await this.serviceWorkerRegistration.update();
      const newWorker = this.serviceWorkerRegistration.installing ||
                       this.serviceWorkerRegistration.waiting;
      return !!newWorker;
    }
    return false;
  }
}

export default PWAService.getInstance();
