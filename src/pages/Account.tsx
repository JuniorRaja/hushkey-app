import React, { useState } from 'react';
import { useAppStore } from '../stores/authStore';
import { useTheme } from '../components/ThemeProvider';
import './Account.css';

const AccountPage = () => {
  const { user, signOut } = useAppStore();
  const { theme, setTheme } = useTheme();
  const [notifications, setNotifications] = useState(true);
  const [biometric, setBiometric] = useState(false);
  const [autoLock, setAutoLock] = useState(true);

  const getUserInitials = (email: string) => {
    return email.split('@')[0].substring(0, 2).toUpperCase();
  };

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <div className="account-page">
      {/* User Profile Header */}
      <div className="account-header">
        <div className="account-avatar">
          {user?.email ? getUserInitials(user.email) : '?'}
        </div>
        <div className="account-info">
          <h2>Account</h2>
          <p>{user?.email || 'Not signed in'}</p>
        </div>
      </div>

      <div className="account-sections">
        {/* Appearance Settings */}
        <div className="account-section">
          <div className="account-section-header">
            <h3>Appearance</h3>
          </div>
          <div className="account-section-content">
            <div className="settings-group">
              <div className="setting-item">
                <div className="setting-label">
                  <h4 className="setting-title">Theme</h4>
                  <p className="setting-description">Choose your preferred theme</p>
                </div>
                <div className="theme-selector">
                  <button
                    className={`theme-option ${theme === 'light' ? 'active' : ''}`}
                    onClick={() => setTheme('light')}
                  >
                    <span className="theme-option-icon">☀️</span>
                    <span className="theme-option-label">Light</span>
                  </button>
                  <button
                    className={`theme-option ${theme === 'dark' ? 'active' : ''}`}
                    onClick={() => setTheme('dark')}
                  >
                    <span className="theme-option-icon">🌙</span>
                    <span className="theme-option-label">Dark</span>
                  </button>
                  <button
                    className={`theme-option ${theme === 'auto' ? 'active' : ''}`}
                    onClick={() => setTheme('auto')}
                  >
                    <span className="theme-option-icon">⚡</span>
                    <span className="theme-option-label">Auto</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Security Settings */}
        <div className="account-section">
          <div className="account-section-header">
            <h3>Security</h3>
          </div>
          <div className="account-section-content">
            <div className="settings-group">
              <div className="setting-item">
                <div className="setting-label">
                  <h4 className="setting-title">Push Notifications</h4>
                  <p className="setting-description">Receive notifications about security events</p>
                </div>
                <div className="setting-control">
                  <div
                    className={`toggle-switch ${notifications ? 'active' : ''}`}
                    onClick={() => setNotifications(!notifications)}
                  >
                    <div className="toggle-knob"></div>
                  </div>
                </div>
              </div>

              <div className="setting-item">
                <div className="setting-label">
                  <h4 className="setting-title">Biometric Unlock</h4>
                  <p className="setting-description">Use fingerprint or face recognition</p>
                </div>
                <div className="setting-control">
                  <div
                    className={`toggle-switch ${biometric ? 'active' : ''}`}
                    onClick={() => setBiometric(!biometric)}
                  >
                    <div className="toggle-knob"></div>
                  </div>
                </div>
              </div>

              <div className="setting-item">
                <div className="setting-label">
                  <h4 className="setting-title">Auto-lock</h4>
                  <p className="setting-description">Automatically lock vault when inactive</p>
                </div>
                <div className="setting-control">
                  <div
                    className={`toggle-switch ${autoLock ? 'active' : ''}`}
                    onClick={() => setAutoLock(!autoLock)}
                  >
                    <div className="toggle-knob"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Account Actions */}
        <div className="account-section">
          <div className="account-section-header">
            <h3>Account Actions</h3>
          </div>
          <div className="account-section-content">
            <div className="action-buttons">
              <button className="action-button secondary">
                <span>📧</span>
                Change Email
              </button>
              <button className="action-button secondary">
                <span>🔒</span>
                Change Password
              </button>
              <button className="action-button secondary">
                <span>📱</span>
                Export Data
              </button>
              <button className="action-button danger" onClick={handleSignOut}>
                <span>🚪</span>
                Sign Out
              </button>
            </div>
          </div>
        </div>

        {/* App Information */}
        <div className="account-section">
          <div className="account-section-content">
            <div className="settings-group">
              <div className="setting-item">
                <div className="setting-label">
                  <h4 className="setting-title">Version</h4>
                  <p className="setting-description">HushKey v1.0.0</p>
                </div>
              </div>
              <div className="setting-item">
                <div className="setting-label">
                  <h4 className="setting-title">Privacy Policy</h4>
                  <p className="setting-description">Read our privacy policy</p>
                </div>
                <div className="setting-control">
                  <span>→</span>
                </div>
              </div>
              <div className="setting-item">
                <div className="setting-label">
                  <h4 className="setting-title">Terms of Service</h4>
                  <p className="setting-description">Read our terms of service</p>
                </div>
                <div className="setting-control">
                  <span>→</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AccountPage;
