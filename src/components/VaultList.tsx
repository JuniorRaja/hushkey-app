import { useAppStore, type Vault } from '../stores/authStore';

interface VaultListProps {
  vaults: Vault[];
  onVaultSelect: (vaultId: string) => void;
}

const VaultList = ({ vaults, onVaultSelect }: VaultListProps) => {
  const { currentVaultId } = useAppStore();

  return (
    <div className="vault-list">
      <div className="vault-list-header">
        <h2>Vaults</h2>
        <button
          className="add-vault-btn"
          onClick={() => {
            const name = prompt('Enter vault name:');
            if (name) {
              // This will be handled by parent component
            }
          }}
        >
          <span>+</span> New Vault
        </button>
      </div>

      <div className="vault-items">
        {vaults.length === 0 ? (
          <div className="empty-state">
            <p>No vaults yet. Create your first vault to get started.</p>
          </div>
        ) : (
          vaults.map((vault) => (
            <div
              key={vault.id}
              className={`vault-item ${currentVaultId === vault.id ? 'active' : ''}`}
              onClick={() => onVaultSelect(vault.id)}
            >
              <div className="vault-icon">🔐</div>
              <div className="vault-info">
                <h3>{vault.name}</h3>
                <span>{vault.items.length} items</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default VaultList;
