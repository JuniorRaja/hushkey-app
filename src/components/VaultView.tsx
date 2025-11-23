import { useState } from "react";
import { useAppStore, type Vault, type VaultItem } from "../stores/authStore";
import PasswordGenerator from "./PasswordGenerator";
import TOTPDisplay from "./TOTPDisplay";
import SearchBar from "./SearchBar";
import TOTPService from "../services/totp";
import type { SearchResult } from "../services/search";

interface VaultViewProps {
  vault: Vault;
}

const VaultView = ({ vault }: VaultViewProps) => {
  const { createItem, updateItem, deleteItem, copyToClipboard } = useAppStore();
  const [selectedItem, setSelectedItem] = useState<VaultItem | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showPasswordGenerator, setShowPasswordGenerator] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const handleSearchResults = (results: SearchResult[]) => {
    setSearchResults(results);
    setIsSearching(results.length > 0);
  };

  const handleCreateItem = async (type: VaultItem["type"]) => {
    const name = prompt(`Enter ${type} name:`);
    if (!name) return;

    let itemData: any = { type, name };

    if (type === "login") {
      itemData.url = prompt("Website URL:") || undefined;
      itemData.username = prompt("Username:") || undefined;
      itemData.password = prompt("Password:") || undefined;
    } else if (type === "totp") {
      const secretInput = prompt(
        "Enter TOTP secret (leave empty to generate new):"
      );
      const secret = secretInput || TOTPService.generateSecret();
      const issuer = prompt("Issuer (e.g., Google, GitHub):") || undefined;
      const uri = TOTPService.generateTOTPUri(name, secret, issuer);

      itemData.notes = `otpauth:// URI: ${uri}\nSecret: ${secret}`;
      itemData.url = uri; // Store URI for QR code generation later
    } else if (type === "note") {
      itemData.notes = prompt("Note content:") || undefined;
    } else if (type === "card") {
      // Simplified - in real app, more fields
      itemData.notes = "Credit card - placeholder";
    }

    try {
      await createItem(vault.id, itemData);
      setShowCreateForm(false);
    } catch (error) {
      alert("Failed to create item");
    }
  };

  const handleCopyValue = (value: string, type: "password" | "username") => {
    copyToClipboard(value, type);
  };

  // Display either search results or all vault items
  const displayItems = isSearching
    ? searchResults.map((result) => result.item)
    : vault.items;

  return (
    <div className="vault-view">
      <div className="vault-header-row">
        <h2>{vault.name}</h2>
        <div className="vault-actions">
          <button
            className="action-btn"
            onClick={() => setShowPasswordGenerator(true)}
            title="Generate Password"
          >
            🎲 Generate
          </button>
          <button
            className="add-item-btn"
            onClick={() => setShowCreateForm(!showCreateForm)}
          >
            <span>+</span> Add Item
          </button>
        </div>
      </div>

      <SearchBar onResultsChange={handleSearchResults} />

      {showPasswordGenerator && (
        <PasswordGenerator onClose={() => setShowPasswordGenerator(false)} />
      )}

      {showCreateForm && (
        <div className="create-form">
          <div className="generator-header">
            <h3>Create New Item</h3>
            <button
              className="close-btn"
              onClick={() => setShowCreateForm(false)}
            >
              ✕
            </button>
          </div>
          <div className="item-types">
            <button onClick={() => handleCreateItem("login")}>
              <span className="icon">🔐</span>
              <span>Login</span>
            </button>
            <button onClick={() => handleCreateItem("totp")}>
              <span className="icon">⏰</span>
              <span>TOTP</span>
            </button>
            <button onClick={() => handleCreateItem("note")}>
              <span className="icon">📝</span>
              <span>Note</span>
            </button>
            <button onClick={() => handleCreateItem("card")}>
              <span className="icon">💳</span>
              <span>Card</span>
            </button>
          </div>
        </div>
      )}

      <div className="vault-content">
        {displayItems.length === 0 ? (
          <div className="empty-state">
            <p>
              {isSearching
                ? "No items match your search"
                : "No items in this vault yet"}
            </p>
            {!isSearching && (
              <p style={{ fontSize: "0.875rem", marginTop: "-1rem" }}>
                Add your first item to get started
              </p>
            )}
          </div>
        ) : (
          <>
            <div className="item-list">
              {displayItems.map((item, index) => (
                <div
                  key={item.id}
                  className={`item-row ${
                    selectedItem?.id === item.id ? "selected" : ""
                  }`}
                  onClick={() => setSelectedItem(item)}
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <div className="item-icon">
                    {item.type === "login" && "🔐"}
                    {item.type === "note" && "📝"}
                    {item.type === "card" && "💳"}
                    {item.type === "totp" && "⏰"}
                  </div>
                  <div className="item-info">
                    <h4>{item.name}</h4>
                    {item.username && <small>{item.username}</small>}
                    {item.url && !item.username && <small>{item.url}</small>}
                  </div>
                </div>
              ))}
            </div>

            {selectedItem && (
              <div className="item-details">
                <h3>{selectedItem.name}</h3>

                {selectedItem.type === "totp" && selectedItem.url ? (
                  <TOTPDisplay
                    secret={
                      selectedItem.url.split("secret=")[1]?.split("&")[0] || ""
                    }
                    label={selectedItem.name}
                    issuer={
                      selectedItem.url.split("issuer=")[1]?.split("&")[0] ||
                      undefined
                    }
                  />
                ) : (
                  <div className="item-fields">
                    {selectedItem.type === "login" && (
                      <>
                        {selectedItem.url && (
                          <div className="field">
                            <label>Website</label>
                            <div className="field-value">
                              {selectedItem.url}
                            </div>
                          </div>
                        )}
                        {selectedItem.username && (
                          <div className="field">
                            <label>Username</label>
                            <div style={{ display: "flex", gap: "0.5rem" }}>
                              <div className="field-value" style={{ flex: 1 }}>
                                {selectedItem.username}
                              </div>
                              <button
                                className="icon-btn"
                                onClick={() =>
                                  handleCopyValue(
                                    selectedItem.username!,
                                    "username"
                                  )
                                }
                                title="Copy username"
                              >
                                📋
                              </button>
                            </div>
                          </div>
                        )}
                        {selectedItem.password && (
                          <div className="field">
                            <label>Password</label>
                            <div style={{ display: "flex", gap: "0.5rem" }}>
                              <div className="field-value" style={{ flex: 1 }}>
                                ••••••••••••
                              </div>
                              <button
                                className="icon-btn"
                                onClick={() =>
                                  handleCopyValue(
                                    selectedItem.password!,
                                    "password"
                                  )
                                }
                                title="Copy password"
                              >
                                📋
                              </button>
                            </div>
                          </div>
                        )}
                      </>
                    )}
                    {selectedItem.notes && (
                      <div className="field">
                        <label>Notes</label>
                        <textarea
                          readOnly
                          value={selectedItem.notes}
                        ></textarea>
                      </div>
                    )}
                  </div>
                )}

                <div
                  className="vault-actions"
                  style={{ marginTop: "2rem", justifyContent: "flex-start" }}
                >
                  <button
                    className="action-btn"
                    onClick={() => {
                      if (confirm("Delete this item?")) {
                        deleteItem(vault.id, selectedItem.id);
                        setSelectedItem(null);
                      }
                    }}
                    style={{ background: "var(--error)", color: "white" }}
                  >
                    🗑️ Delete
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default VaultView;
