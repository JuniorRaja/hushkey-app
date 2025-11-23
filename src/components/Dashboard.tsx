import { useAppStore } from "../stores/authStore";
import { useTheme } from "./ThemeProvider";
import AuthPage from "./AuthPage";
import HealthScore from "./HealthScore";
import VaultList from "./VaultList";
import BottomNav from "./BottomNav";
import './Dashboard.css';

const Dashboard = () => {
  const { user, isUnlocked, vaults } = useAppStore();
  const { theme, actualTheme, toggleTheme } = useTheme();

  if (!user || !isUnlocked) {
    return <AuthPage />;
  }

  const summaryData = {
    total: vaults.reduce((acc, vault) => acc + vault.items.length, 0),
    compromised: vaults.reduce((acc, vault) => acc + vault.items.filter(i => i.tags?.includes('compromised')).length, 0),
    weak: vaults.reduce((acc, vault) => acc + vault.items.filter(i => i.tags?.includes('weak')).length, 0),
    reused: vaults.reduce((acc, vault) => acc + vault.items.filter(i => i.tags?.includes('reused')).length, 0),
  };

  const calculateHealthScore = () => {
    let score = 100;
    score -= summaryData.weak * 5;
    score -= summaryData.compromised * 10;
    return Math.max(0, score);
  };

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <div className="user-info">
          <img src={`https://i.pravatar.cc/40?u=${user.id}`} alt="User" className="user-avatar" />
          <div>
            <p className="welcome-back">Welcome back,</p>
            <h1 className="user-name">{user.email}</h1>
          </div>
        </div>
        <div className="header-actions">
          <button
            className="theme-toggle"
            onClick={toggleTheme}
            aria-label="Toggle theme"
            title={`Current: ${theme} (${actualTheme})`}
          >
            {actualTheme === "dark" ? "🌙" : "☀️"}
          </button>
          <button className="notifications-btn">
            <span role="img" aria-label="notifications">🔔</span>
          </button>
        </div>
      </header>

      <main className="dashboard-content">
        <HealthScore score={calculateHealthScore()} />
        <div className="summary-cards">
          <div className="card">
            <h3>{summaryData.total}</h3>
            <p>Total</p>
          </div>
          <div className="card">
            <h3>{summaryData.compromised}</h3>
            <p>Compromised</p>
          </div>
          <div className="card">
            <h3>{summaryData.weak}</h3>
            <p>Weak</p>
          </div>
          <div className="card">
            <h3>{summaryData.reused}</h3>
            <p>Reused</p>
          </div>
        </div>
        <div className="top-vault">
          <h2>Top Vault</h2>
          <VaultList vaults={vaults.slice(0, 2)} onVaultSelect={(vaultId) => {
            const { selectVault } = useAppStore.getState();
            selectVault(vaultId);
            // This is a bit of a hack, ideally we'd have a router
            (document.querySelector('.nav-item[data-page="vault"]') as HTMLButtonElement)?.click();
          }} simple />
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
