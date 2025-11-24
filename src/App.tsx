import { useState, useEffect } from "react";
import { ThemeProvider } from "./components/ThemeProvider";
import Dashboard from "./components/Dashboard";
import VaultPage from "./pages/Vault";
import ToolsPage from "./pages/Tools";
import AccountPage from "./pages/Account";
import BottomNav from "./components/BottomNav";
import AuthPage from "./components/AuthPage";
import { useAppStore } from "./stores/authStore";
import PWAService from "./services/pwa";
import "./App.css";

function App() {
  const [activePage, setActivePage] = useState('home');
  const { user, isUnlocked, vaults, selectVault, createVault, createItem } = useAppStore();
  const [showAddModal, setShowAddModal] = useState(false);
  const [modalMode, setModalMode] = useState<'menu' | 'vault' | 'item'>('menu');
  const [formData, setFormData] = useState({
    vaultName: '',
    itemName: '',
    username: '',
    password: '',
    url: ''
  });
  const [formErrors, setFormErrors] = useState<{[key: string]: string}>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    PWAService.initialize().catch(console.error);
    if (isUnlocked && vaults.length > 0 && !useAppStore.getState().currentVaultId) {
      selectVault(vaults[0].id);
    }
  }, [isUnlocked, vaults, selectVault]);

  const renderPage = () => {
    switch (activePage) {
      case 'home':
        return <Dashboard />;
      case 'vault':
        return <VaultPage />;
      case 'tools':
        return <ToolsPage />;
      case 'account':
        return <AccountPage />;
      default:
        return <Dashboard />;
    }
  };

  const validateForm = () => {
    const errors: {[key: string]: string} = {};

    if (modalMode === 'vault') {
      if (!formData.vaultName.trim()) {
        errors.vaultName = 'Vault name is required';
      } else if (formData.vaultName.length < 2) {
        errors.vaultName = 'Vault name must be at least 2 characters';
      }
    } else if (modalMode === 'item') {
      if (!formData.itemName.trim()) {
        errors.itemName = 'Name is required';
      }
      if (!formData.username.trim()) {
        errors.username = 'Username is required';
      }
      if (!formData.password.trim()) {
        errors.password = 'Password is required';
      }
      if (formData.url && !formData.url.match(/^https?:\/\/.+\..+/)) {
        errors.url = 'Please enter a valid URL';
      }
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleCreateVault = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      await createVault(formData.vaultName.trim());
      setShowAddModal(false);
      resetForm();
    } catch (error) {
      setFormErrors({ general: 'Failed to create vault' });
    } finally {
      setLoading(false);
    }
  };

  const handleAddItem = async () => {
    if (!validateForm()) return;

    const currentVault = vaults.find(v => v.id === useAppStore.getState().currentVaultId);
    if (!currentVault) {
      setFormErrors({ general: 'Please select a vault first' });
      return;
    }

    setLoading(true);
    try {
      await createItem(currentVault.id, {
        name: formData.itemName.trim(),
        username: formData.username.trim(),
        password: formData.password.trim(),
        url: formData.url.trim(),
        type: 'login',
        tags: []
      });
      setShowAddModal(false);
      resetForm();
    } catch (error) {
      setFormErrors({ general: 'Failed to add item' });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      vaultName: '',
      itemName: '',
      username: '',
      password: '',
      url: ''
    });
    setFormErrors({});
    setModalMode('menu');
  };

  const closeModal = () => {
    setShowAddModal(false);
    resetForm();
  };

  if (!user || !isUnlocked) {
    return (
      <ThemeProvider>
        <AuthPage />
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider>
      <div className="app-container">
        <main className="main-content">
          {renderPage()}
        </main>
        <BottomNav activePage={activePage} setActivePage={setActivePage} />
        <button
          className="fab"
          onClick={() => setShowAddModal(true)}
          aria-label="Add new item">
          +
        </button>
        {showAddModal && (
          <div className="modal-overlay" onClick={closeModal}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <button className="modal-close" onClick={closeModal}>&times;</button>

              {modalMode === 'menu' && (
                <>
                  <h2>Add New</h2>
                  <div className="add-menu-options">
                    <button
                      className="add-option"
                      onClick={() => setModalMode('vault')}>
                      <span className="add-option-icon">🗄️</span>
                      <div className="add-option-text">
                        <span className="add-option-title">New Vault</span>
                        <span className="add-option-description">Create a new secure container</span>
                      </div>
                    </button>
                    <button
                      className="add-option"
                      onClick={() => setModalMode('item')}>
                      <span className="add-option-icon">🔐</span>
                      <div className="add-option-text">
                        <span className="add-option-title">New Item</span>
                        <span className="add-option-description">Add login credentials</span>
                      </div>
                    </button>
                  </div>
                </>
              )}

              {modalMode === 'vault' && (
                <>
                  <h2>Create New Vault</h2>
                  {formErrors.general && <div className="error-message">{formErrors.general}</div>}
                  <form className="add-form" onSubmit={(e) => { e.preventDefault(); handleCreateVault(); }}>
                    <div className="form-group">
                      <label htmlFor="vaultName">Vault Name</label>
                      <input
                        id="vaultName"
                        type="text"
                        value={formData.vaultName}
                        onChange={(e) => setFormData(prev => ({ ...prev, vaultName: e.target.value }))}
                        placeholder="Enter vault name"
                        className={formErrors.vaultName ? 'error' : ''}
                      />
                      {formErrors.vaultName && <div className="field-error">{formErrors.vaultName}</div>}
                    </div>
                    <div className="modal-actions">
                      <button type="button" className="cancel-btn" onClick={() => setModalMode('menu')}>Back</button>
                      <button type="submit" disabled={loading} className="primary-btn">
                        {loading ? 'Creating...' : 'Create Vault'}
                      </button>
                    </div>
                  </form>
                </>
              )}

              {modalMode === 'item' && (
                <>
                  <h2>Add New Item</h2>
                  {formErrors.general && <div className="error-message">{formErrors.general}</div>}
                  <form className="add-form" onSubmit={(e) => { e.preventDefault(); handleAddItem(); }}>
                    <div className="form-group">
                      <label htmlFor="itemName">Name</label>
                      <input
                        id="itemName"
                        type="text"
                        value={formData.itemName}
                        onChange={(e) => setFormData(prev => ({ ...prev, itemName: e.target.value }))}
                        placeholder="e.g. Gmail, Facebook"
                        className={formErrors.itemName ? 'error' : ''}
                      />
                      {formErrors.itemName && <div className="field-error">{formErrors.itemName}</div>}
                    </div>
                    <div className="form-group">
                      <label htmlFor="username">Username</label>
                      <input
                        id="username"
                        type="text"
                        value={formData.username}
                        onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
                        placeholder="Enter username or email"
                        className={formErrors.username ? 'error' : ''}
                      />
                      {formErrors.username && <div className="field-error">{formErrors.username}</div>}
                    </div>
                    <div className="form-group">
                      <label htmlFor="password">Password</label>
                      <input
                        id="password"
                        type="password"
                        value={formData.password}
                        onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                        placeholder="Enter password"
                        className={formErrors.password ? 'error' : ''}
                      />
                      {formErrors.password && <div className="field-error">{formErrors.password}</div>}
                    </div>
                    <div className="form-group">
                      <label htmlFor="url">Website URL (optional)</label>
                      <input
                        id="url"
                        type="url"
                        value={formData.url}
                        onChange={(e) => setFormData(prev => ({ ...prev, url: e.target.value }))}
                        placeholder="https://example.com"
                        className={formErrors.url ? 'error' : ''}
                      />
                      {formErrors.url && <div className="field-error">{formErrors.url}</div>}
                    </div>
                    <div className="modal-actions">
                      <button type="button" className="cancel-btn" onClick={() => setModalMode('menu')}>Back</button>
                      <button type="submit" disabled={loading} className="primary-btn">
                        {loading ? 'Adding...' : 'Add Item'}
                      </button>
                    </div>
                  </form>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </ThemeProvider>
  );
}

export default App;
