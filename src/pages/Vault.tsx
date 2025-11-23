import { useAppStore } from "../stores/authStore";
import VaultView from "../components/VaultView";

const VaultPage = () => {
  const { vaults, currentVaultId } = useAppStore();
  const currentVault = vaults.find(v => v.id === currentVaultId);

  return (
    <div>
      {currentVault ? (
        <VaultView vault={currentVault} />
      ) : (
        <p>Select a vault to view its items.</p>
      )}
    </div>
  );
};

export default VaultPage;
