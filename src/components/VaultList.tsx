import { useState } from "react";
import { useAppStore, type Vault } from "../stores/authStore";
import './VaultList.css';

interface VaultListProps {
  vaults: Vault[];
  onVaultSelect: (vaultId: string) => void;
  simple?: boolean;
}

const VaultList = ({ vaults, onVaultSelect, simple = false }: VaultListProps) => {
  const { currentVaultId, updateVault, deleteVault } = useAppStore();
  const [editingVault, setEditingVault] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [menuOpen, setMenuOpen] = useState<string | null>(null);

  const handleEdit = (vault: Vault) => {
    setEditingVault(vault.id);
    setEditingName(vault.name);
    setMenuOpen(null);
  };

  const handleEditSave = async () => {
    if (editingVault && editingName.trim()) {
      try {
        await updateVault(editingVault, editingName.trim());
        setEditingVault(null);
        setEditingName('');
      } catch (error) {
        console.error('Error updating vault:', error);
        alert('Failed to update vault');
      }
    }
  };

  const handleEditCancel = () => {
    setEditingVault(null);
    setEditingName('');
  };

  const handleDelete = async (vaultId: string) => {
    if (window.confirm('Are you sure you want to delete this vault? This action cannot be undone.')) {
      try {
        await deleteVault(vaultId);
        setMenuOpen(null);
      } catch (error) {
        console.error('Error deleting vault:', error);
        alert('Failed to delete vault');
      }
    }
  };

  const toggleMenu = (vaultId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setMenuOpen(menuOpen === vaultId ? null : vaultId);
  };

  if (vaults.length === 0) {
    return (
      <div className="empty-vaults">
        <p>No vaults yet</p>
        <p style={{ fontSize: "0.875rem", marginTop: "-1rem" }}>
          Create your first vault to get started
        </p>
      </div>
    );
  }

  if (simple) {
    return (
      <div className="vault-items-simple">
        {vaults.map((vault) => (
          <div
            key={vault.id}
            className="vault-item-simple"
            onClick={() => onVaultSelect(vault.id)}
          >
            <div className="vault-icon">
              <img src={`https://via.placeholder.com/32/${vault.id.slice(0, 6)}/FFFFFF?text=${vault.name.charAt(0)}`} alt={vault.name} />
            </div>
            <div className="vault-info-simple">
              <h3>{vault.name}</h3>
              <span>{vault.items.length} items</span>
            </div>
            <button className="login-btn">Login</button>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="vault-items">
      {vaults.map((vault, index) => (
        <div
          key={vault.id}
          className={`vault-item ${
            currentVaultId === vault.id ? "active" : ""
          }`}
          onClick={() => editingVault === vault.id ? undefined : onVaultSelect(vault.id)}
          style={{ animationDelay: `${index * 50}ms` }}
        >
          <div className="vault-icon">🔐</div>
          <div className="vault-info">
            {editingVault === vault.id ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <input
                  type="text"
                  value={editingName}
                  onChange={(e) => setEditingName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleEditSave();
                    if (e.key === 'Escape') handleEditCancel();
                  }}
                  autoFocus
                  style={{
                    padding: '0.2rem',
                    border: '1px solid #ccc',
                    borderRadius: '4px',
                    fontSize: '1rem',
                    fontWeight: 'bold'
                  }}
                />
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    onClick={handleEditSave}
                    style={{
                      padding: '0.2rem 0.5rem',
                      backgroundColor: '#007bff',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '0.875rem'
                    }}
                  >
                    Save
                  </button>
                  <button
                    onClick={handleEditCancel}
                    style={{
                      padding: '0.2rem 0.5rem',
                      backgroundColor: '#6c757d',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '0.875rem'
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <>
                <h3>{vault.name}</h3>
                <span>
                  {vault.items.length} {vault.items.length === 1 ? "item" : "items"}
                </span>
              </>
            )}
          </div>
          <button
            className="vault-menu-btn"
            onClick={(e) => toggleMenu(vault.id, e)}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '1.2rem',
              cursor: 'pointer',
              padding: '0.5rem',
              borderRadius: '4px'
            }}
          >
            ⋮
          </button>
          {menuOpen === vault.id && (
            <div
              style={{
                position: 'absolute',
                right: '1rem',
                backgroundColor: 'white',
                border: '1px solid #ccc',
                borderRadius: '8px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                zIndex: 1000,
                minWidth: '100px'
              }}
            >
              <button
                onClick={() => handleEdit(vault)}
                style={{
                  display: 'block',
                  width: '100%',
                  padding: '0.5rem 1rem',
                  background: 'none',
                  border: 'none',
                  textAlign: 'left',
                  cursor: 'pointer',
                  borderRadius: '4px 4px 0 0'
                }}
                onMouseEnter={(e) => (e.target as HTMLElement).style.backgroundColor = '#f8f9fa'}
                onMouseLeave={(e) => (e.target as HTMLElement).style.backgroundColor = 'transparent'}
              >
                Edit
              </button>
              <button
                onClick={() => handleDelete(vault.id)}
                style={{
                  display: 'block',
                  width: '100%',
                  padding: '0.5rem 1rem',
                  background: 'none',
                  border: 'none',
                  textAlign: 'left',
                  cursor: 'pointer',
                  color: '#dc3545',
                  borderRadius: '0 0 4px 4px'
                }}
                onMouseEnter={(e) => (e.target as HTMLElement).style.backgroundColor = '#f8f9fa'}
                onMouseLeave={(e) => (e.target as HTMLElement).style.backgroundColor = 'transparent'}
              >
                Delete
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default VaultList;
