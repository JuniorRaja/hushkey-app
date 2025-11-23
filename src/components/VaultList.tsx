import { useAppStore, type Vault } from "../stores/authStore";
import './VaultList.css';

interface VaultListProps {
  vaults: Vault[];
  onVaultSelect: (vaultId: string) => void;
  simple?: boolean;
}

const VaultList = ({ vaults, onVaultSelect, simple = false }: VaultListProps) => {
  const { currentVaultId } = useAppStore();

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
          onClick={() => onVaultSelect(vault.id)}
          style={{ animationDelay: `${index * 50}ms` }}
        >
          <div className="vault-icon">🔐</div>
          <div className="vault-info">
            <h3>{vault.name}</h3>
            <span>
              {vault.items.length} {vault.items.length === 1 ? "item" : "items"}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
};

export default VaultList;
