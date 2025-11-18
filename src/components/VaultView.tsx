import { useState } from 'react';
import { useAppStore, type Vault, type VaultItem } from '../stores/authStore';
import PasswordGenerator from './PasswordGenerator';
import TOTPDisplay from './TOTPDisplay';
import TOTPService from '../services/totp';

interface VaultViewProps {
  vault: Vault;
}

const VaultView = ({ vault }: VaultViewProps) => {
  const { createItem, updateItem, deleteItem, copyToClipboard } = useAppStore();
  const [selectedItem, setSelectedItem] = useState<VaultItem | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showPasswordGenerator, setShowPasswordGenerator] = useState(false);

  const handleCreateItem = async (type: VaultItem['type']) => {
    const name = prompt(`Enter ${type} name:`);
    if (!name) return;

    let itemData: any = { type, name };

    if (type === 'login') {
      itemData.url = prompt('Website URL:') || undefined;
      itemData.username = prompt('Username:') || undefined;
      itemData.password = prompt('Password:') || undefined;
    } else if (type === 'totp') {
      const secretInput = prompt('Enter TOTP secret (leave empty to generate new):');
      const secret = secretInput || TOTPService.generateSecret();
      const issuer = prompt('Issuer (e.g., Google, GitHub):') || undefined;
      const uri = TOTPService.generateTOTPUri(name, secret, issuer);

      itemData.notes = `otpauth:// URI: ${uri}\nSecret: ${secret}`;
      itemData.url = uri; // Store URI for QR code generation later
    } else if (type === 'note') {
      itemData.notes = prompt('Note content:') || undefined;
    } else if (type === 'card') {
      // Simplified - in real app, more fields
      itemData.notes = 'Credit card - placeholder';
    }

    try {
      await createItem(vault.id, itemData);
      setShowCreateForm(false);
    } catch (error) {
      alert('Failed to create item');
    }
  };

  const handleCopyValue = (value: string, type: 'password' | 'username') => {
    copyToClipboard(value, type);
  };

  return (
    <div className="vault-view">
      <div className="vault-header">
        <h2>{vault.name}</h2>
        <div className="vault-actions">
          <button
            className="action-btn"
            onClick={() => setShowPasswordGenerator(true)}
          >
            🎲 Generate Password
          </button>
          <button
            className="add-item-btn"
            onClick={() => setShowCreateForm(!showCreateForm)}
          >
            <span>+</span> Add Item
          </button>
        </div>
      </div>

      {showPasswordGenerator && (
        <PasswordGenerator onClose={() => setShowPasswordGenerator(false)} />
      )}

      {showCreateForm && (
        <div className="create-form">
          <h3>Create New Item</h3>
          <div className="item-types">
            <button onClick={() => handleCreateItem('login')}>
              🔐 Login
            </button>
            <button onClick={() => handleCreateItem('totp')}>
              ⏰ TOTP Code
            </button>
            <button onClick={() => handleCreateItem('note')}>
              📝 Secure Note
            </button>
            <button onClick={() => handleCreateItem('card')}>
              💳 Card
            </button>
          </div>
        </div>
      )}

      <div className="vault-content">
        <div className="item-list">
          {vault.items.length === 0 ? (
            <div className="empty-state">
              <p>No items in this vault yet. Add your first item to get started.</p>
            </div>
          ) : (
            vault.items.map((item) => (
              <div
                key={item.id}
                className={`item-row ${selectedItem?.id === item.id ? 'selected' : ''}`}
                onClick={() => setSelectedItem(item)}
              >
                <div className="item-icon">
                  {item.type === 'login' && '🔐'}
                  {item.type === 'note' && '📝'}
                  {item.type === 'card' && '💳'}
                  {item.type === 'totp' && '⏰'}
                </div>
                <div className="item-info">
                  <h4>{item.name}</h4>
                  {item.username && <small>Username: {item.username}</small>}
                  {item.url && <small>URL: {item.url}</small>}
                </div>
              </div>
            ))
          )}
        </div>

        {selectedItem && (
          <div className="item-details">
            <h3>{selectedItem.name}</h3>

            {selectedItem.type === 'totp' && selectedItem.url ? (
              <TOTPDisplay
                secret={selectedItem.url.split('secret=')[1]?.split('&')[0] || ''}
                label={selectedItem.name}
                issuer={selectedItem.url.split('issuer=')[1]?.split('&')[0] || undefined}
              />
            ) : (
              <div className="item-fields">
                {selectedItem.type === 'login' && (
                  <>
                    {selectedItem.url && (
                      <div className="field">
                        <label>Website:</label>
                        <span>{selectedItem.url}</span>
                      </div>
                    )}
                    {selectedItem.username && (
                      <div className="field">
                        <label>Username:</label>
                        <span>{selectedItem.username}</span>
                        <button onClick={() => handleCopyValue(selectedItem.username!, 'username')}>
                          📋 Copy
                        </button>
                      </div>
                    )}
                    {selectedItem.password && (
                      <div className="field">
                        <label>Password:</label>
                        <span>••••••••</span>
                        <button onClick={() => handleCopyValue(selectedItem.password!, 'password')}>
                          📋 Copy
                        </button>
                      </div>
                    )}
                  </>
                )}
                {selectedItem.notes && (
                  <div className="field">
                    <label>Notes:</label>
                    <textarea readOnly value={selectedItem.notes}></textarea>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default VaultView;
