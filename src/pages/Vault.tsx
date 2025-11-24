import { useAppStore } from "../stores/authStore";
import VaultList from "../components/VaultList";

const VaultPage = () => {
  const { vaults, selectVault } = useAppStore();

  const handleVaultSelect = (vaultId: string) => {
    selectVault(vaultId);
    // Optionally navigate back to dashboard or stay here - user can decide
  };

  return (
    <div className="vault-page" style={{ padding: '1rem' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ margin: '0 0 0.5rem 0', padding: '0' }}>Your Vaults</h1>
        <p style={{ color: '#666', margin: '0', fontSize: '0.9rem' }}>
          Manage your password vaults - click on a vault to view items, or use the menu to edit or delete
        </p>
      </div>
      <VaultList
        vaults={vaults}
        onVaultSelect={handleVaultSelect}
      />
    </div>
  );
};

export default VaultPage;
