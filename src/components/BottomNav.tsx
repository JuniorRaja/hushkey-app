import React from 'react';
import './BottomNav.css';

interface BottomNavProps {
  activePage: string;
  setActivePage: (page: string) => void;
}

const BottomNav = ({ activePage, setActivePage }: BottomNavProps) => {
  const navItems = [
    { id: 'home', label: 'Home', icon: '🏠' },
    { id: 'vault', label: 'Vault', icon: '🔐' },
    { id: 'tools', label: 'Tools', icon: '🔧' },
    { id: 'account', label: 'Account', icon: '👤' },
  ];

  return (
    <nav className="bottom-nav">
      {navItems.map(item => (
        <button
          key={item.id}
          className={`nav-item ${activePage === item.id ? 'active' : ''}`}
          onClick={() => setActivePage(item.id)}
          data-page={item.id}
        >
          <span className="nav-icon" role="img" aria-label={item.label}>{item.icon}</span>
          <span className="nav-label">{item.label}</span>
        </button>
      ))}
    </nav>
  );
};

export default BottomNav;
