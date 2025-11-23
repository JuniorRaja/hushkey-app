import { useEffect } from "react";
import { useAppStore, type User, type Vault } from "../stores/authStore";
import { useTheme } from "./ThemeProvider";
import AuthPage from "./AuthPage";
import VaultList from "./VaultList";
import VaultView from "./VaultView";

const Dashboard = () => {
  const {
    user,
    isLoading,
    isUnlocked,
    vaults,
    currentVaultId,
    createVault,
    selectVault,
    signOut,
    hydrate,
    updateActivity,
    // Import all state updating functions needed
    ...store
  } = useAppStore();

  const { theme, actualTheme, toggleTheme } = useTheme();

  // Track activity for auto-lock and session management
  useEffect(() => {
    const handleActivity = () => updateActivity();

    // Add event listeners for activity tracking
    window.addEventListener("mousedown", handleActivity);
    window.addEventListener("keydown", handleActivity);
    window.addEventListener("scroll", handleActivity);

    // Auto-lock timer - check every 30 seconds
    const autoLockInterval = setInterval(() => {
      // TODO: Implement proper auto-lock with lastActivity from store
      // For now, simplified auto-lock after 5 minutes from component mount
      if (isUnlocked) {
        const fiveMinutes = 5 * 60 * 1000;
        const timeSinceMount = Date.now() - Date.now(); // This is placeholder
        // Auto-lock logic would go here
      }
    }, 30000); // Check every 30 seconds

    return () => {
      window.removeEventListener("mousedown", handleActivity);
      window.removeEventListener("keydown", handleActivity);
      window.removeEventListener("scroll", handleActivity);
      clearInterval(autoLockInterval);
    };
  }, [updateActivity, isUnlocked]);

  // Hydrate on mount
  useEffect(() => {
    hydrate();
  }, [hydrate]);

  const handleCreateVault = async () => {
    const name = prompt("Enter vault name:");
    if (name) {
      try {
        await createVault(name);
      } catch (error) {
        alert("Failed to create vault");
      }
    }
  };

  const handleSignOut = async () => {
    await signOut();
  };

  // Show auth page if no user or not unlocked
  if (!user || !isUnlocked) {
    return <AuthPage />;
  }

  const currentVault = vaults.find((v) => v.id === currentVaultId);

  return (
    <div className="dashboard">
      <header className="app-header">
        <div className="header-left">
          <h1>🔐 HushKey</h1>
        </div>
        <div className="header-right">
          <span>{user.email}</span>
          <button
            className="theme-toggle"
            onClick={toggleTheme}
            aria-label="Toggle theme"
            title={`Current: ${theme} (${actualTheme})`}
          >
            {actualTheme === "dark" ? "🌙" : "☀️"}
          </button>
          <button onClick={handleSignOut}>Sign Out</button>
        </div>
      </header>

      <div className="app-container">
        <aside className="sidebar">
          <div className="sidebar-header">
            <h2>Vaults</h2>
            <button className="add-vault-btn" onClick={handleCreateVault}>
              <span>+</span> New
            </button>
          </div>
          <VaultList vaults={vaults} onVaultSelect={selectVault} />
        </aside>

        <main className="main-content">
          {isLoading ? (
            <div className="loading">
              <div className="loading-spinner"></div>
              <p>Loading your secure vault...</p>
            </div>
          ) : currentVault ? (
            <VaultView vault={currentVault} />
          ) : (
            <div className="welcome">
              <h2>Welcome to HushKey</h2>
              <p>Your privacy-first password manager</p>
              <div className="welcome-stats">
                <div className="stat">
                  <strong>{vaults.length}</strong>
                  <span>Vaults</span>
                </div>
                <div className="stat">
                  <strong>
                    {vaults.reduce(
                      (total, vault) => total + vault.items.length,
                      0
                    )}
                  </strong>
                  <span>Total Items</span>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default Dashboard;
