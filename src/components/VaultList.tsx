import { useAppStore, type Vault } from "../stores/authStore";

interface VaultListProps {
  vaults: Vault[];
  onVaultSelect: (vaultId: string) => void;
}

const VaultList = ({ vaults, onVaultSelect }: VaultListProps) => {
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
