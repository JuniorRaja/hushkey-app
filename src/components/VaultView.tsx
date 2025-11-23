import { useState } from "react";
import { useAppStore, type Vault, type VaultItem } from "../stores/authStore";
import SearchBar from "./SearchBar";
import './VaultView.css';

interface VaultViewProps {
  vault: Vault;
}

const VaultView = ({ vault }: VaultViewProps) => {
  const { copyToClipboard, deleteItem } = useAppStore();
  const [selectedItem, setSelectedItem] = useState<VaultItem | null>(vault.items[0] || null);
  const [filter, setFilter] = useState('All');

  const filteredItems = vault.items.filter(item => {
    if (filter === 'All') return true;
    return item.type.toLowerCase() === filter.toLowerCase().replace(' ', '');
  });

  const renderItemDetails = () => {
    if (!selectedItem) return <div className="no-item-selected">Select an item to view details</div>;

    return (
      <div className="item-details-view">
        <header className="item-details-header">
          <img src={`https://via.placeholder.com/40/${selectedItem.id.slice(0, 6)}/FFFFFF?text=${selectedItem.name.charAt(0)}`} alt={selectedItem.name} className="item-icon-large" />
          <h2>{selectedItem.name}</h2>
          <button className="close-details-btn">&times;</button>
        </header>

        <div className="item-info-section">
          <div className="info-row">
            <span className="info-label">Login</span>
            <span className="info-value">{selectedItem.username}</span>
          </div>
          <div className="info-row">
            <span className="info-label">Password</span>
            <span className="info-value">••••••••••</span>
          </div>
          <div className="info-row">
            <span className="info-label">Login URL</span>
            <a href={selectedItem.url} target="_blank" rel="noopener noreferrer" className="info-value url">{selectedItem.url}</a>
          </div>
        </div>
        
        {selectedItem.tags && selectedItem.tags.length > 0 && (
          <div className="item-tags">
            <h3>Tags</h3>
            <div className="tags-container">
              {selectedItem.tags.map(tag => <span key={tag} className="tag">{tag}</span>)}
            </div>
          </div>
        )}

        {selectedItem.tags?.includes('weak') && (
          <div className="vulnerability-alert">
            <h3>Vulnerability Alert</h3>
            <p>This password is weak.</p>
          </div>
        )}
        
        <div className="item-details-actions">
          <button className="edit-btn">Edit Vault Item</button>
          <button className="delete-btn" onClick={() => deleteItem(selectedItem.id)}>🗑️</button>
        </div>
      </div>
    );
  };
  
  return (
    <div className="vault-view-container">
      <h1 className="vault-title">Vault</h1>
      <SearchBar onResultsChange={() => {}} />
      <div className="filters">
        {['All', 'Login', 'Secure Note', 'Identity'].map(f => (
          <button key={f} className={`filter-btn ${filter === f ? 'active' : ''}`} onClick={() => setFilter(f)}>{f}</button>
        ))}
      </div>
      
      <div className="vault-items-list">
        {filteredItems.map(item => (
          <div key={item.id} className={`vault-list-item ${selectedItem?.id === item.id ? 'selected' : ''}`} onClick={() => setSelectedItem(item)}>
            <img src={`https://via.placeholder.com/32/${item.id.slice(0, 6)}/FFFFFF?text=${item.name.charAt(0)}`} alt={item.name} className="item-icon" />
            <div className="item-summary">
              <h4>{item.name}</h4>
              <p>{item.username}</p>
            </div>
            <span className="item-type">{item.type}</span>
          </div>
        ))}
      </div>
      
      {/* This would be a modal or a separate panel in a tablet/desktop view */}
      {selectedItem && renderItemDetails()}
    </div>
  );
};

export default VaultView;
