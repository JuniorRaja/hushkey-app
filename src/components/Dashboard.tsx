import { useAppStore } from "../stores/authStore";
import { useTheme } from "./ThemeProvider";
import AuthPage from "./AuthPage";
import HealthScore from "./HealthScore";
import VaultList from "./VaultList";
import { ShieldIcon, BellIcon, LoginIcon, CardIcon, IdentityIcon, FilesIcon } from "./FaviconIcon";
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
        <div className="header-left">
          <ShieldIcon size={32} className="app-logo" />
          <h1 className="app-name">HushKey</h1>
        </div>
        <div className="header-right">
          <button className="notification-btn">
            <BellIcon size={20} />
          </button>
        </div>
      </header>

      <main className="dashboard-content">
        <div className="dashboard-stats">
          <div className="score-section">
            <HealthScore score={calculateHealthScore()} />
          </div>
          <div className="kpi-grid">
            <div className="kpi-card">
              <span className="kpi-value">{summaryData.total}</span>
              <span className="kpi-label">Total Items</span>
            </div>
            <div className="kpi-card">
              <span className="kpi-value">{summaryData.compromised}</span>
              <span className="kpi-label">Compromised</span>
            </div>
            <div className="kpi-card">
              <span className="kpi-value">{summaryData.weak}</span>
              <span className="kpi-label">Weak</span>
            </div>
            <div className="kpi-card">
              <span className="kpi-value">{summaryData.reused}</span>
              <span className="kpi-label">Reused</span>
            </div>
          </div>
        </div>

        <div className="category-cards">
          <div className="category-card logins-card">
            <div className="card-icon">
              <LoginIcon size={24} />
            </div>
            <h3>Logins</h3>
            <p>{vaults.reduce((acc, v) => acc + v.items.filter(i => i.type === 'login').length, 0)} items</p>
          </div>
          <div className="category-card cards-card">
            <div className="card-icon">
              <CardIcon size={24} />
            </div>
            <h3>Cards</h3>
            <p>{vaults.reduce((acc, v) => acc + v.items.filter(i => i.type === 'card').length, 0)} items</p>
          </div>
          <div className="category-card identity-card">
            <div className="card-icon">
              <IdentityIcon size={24} />
            </div>
            <h3>Identity</h3>
            <p>{vaults.reduce((acc, v) => acc + v.items.filter(i => i.type === 'identity').length, 0)} items</p>
          </div>
          <div className="category-card files-card">
            <div className="card-icon">
              <FilesIcon size={24} />
            </div>
            <h3>Files</h3>
            <p>{vaults.reduce((acc, v) => acc + v.items.filter(i => i.type === 'note').length, 0)} items</p>
          </div>
        </div>

        <div className="vaults-section">
          <h2>Your Vaults</h2>
          <VaultList vaults={vaults} onVaultSelect={(vaultId) => {
            const { selectVault } = useAppStore.getState();
            selectVault(vaultId);
            (document.querySelector('.nav-item[data-page="vault"]') as HTMLButtonElement)?.click();
          }} />
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
