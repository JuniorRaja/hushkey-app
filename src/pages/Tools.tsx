import React, { useState } from 'react';
import PasswordGenerator from '../components/PasswordGenerator';
import './Tools.css';

const ToolsPage = () => {
  const [activeTool, setActiveTool] = useState<string | null>(null);

  const tools = [
    {
      id: 'password-generator',
      name: 'Password Generator',
      description: 'Generate secure passwords with customizable options',
      icon: '🛡️',
      component: PasswordGenerator,
    },
    {
      id: 'password-strength',
      name: 'Password Strength Checker',
      description: 'Analyze and improve password security',
      icon: '🔍',
      component: null,
    },
    {
      id: 'data-encryption',
      name: 'Data Encryption',
      description: 'Encrypt and decrypt sensitive data',
      icon: '🔐',
      component: null,
    },
    {
      id: 'security-audit',
      name: 'Security Audit',
      description: 'Run security checks on your accounts',
      icon: '📊',
      component: null,
    },
    {
      id: 'qr-generator',
      name: 'QR Code Generator',
      description: 'Generate QR codes for secure sharing',
      icon: '📱',
      component: null,
    },
    {
      id: 'random-token',
      name: 'Random Token Generator',
      description: 'Create secure random tokens and keys',
      icon: '🎲',
      component: null,
    },
  ];

  const handleToolClick = (toolId: string) => {
    setActiveTool(activeTool === toolId ? null : toolId);
  };

  const renderActiveTool = () => {
    if (!activeTool) return null;

    const tool = tools.find(t => t.id === activeTool);
    if (!tool || !tool.component) return null;

    const ToolComponent = tool.component;
    return (
      <div className="active-tool-section">
        <ToolComponent onClose={() => setActiveTool(null)} />
      </div>
    );
  };

  return (
    <div className="tools-page">
      <div className="tools-header">
        <h1>Security Tools</h1>
        <p>Powerful utilities to enhance your digital security</p>
      </div>

      {!activeTool && (
        <div className="tools-grid">
          {tools.map((tool) => (
            <div
              key={tool.id}
              className={`tool-card ${activeTool === tool.id ? 'active' : ''}`}
              onClick={() => handleToolClick(tool.id)}
            >
              <div className="tool-card-header">
                <span className="tool-icon">{tool.icon}</span>
                <h3>{tool.name}</h3>
                <p>{tool.description}</p>
              </div>
              {tool.id === 'password-generator' && (
                <div className="tool-content">
                  <div className="tool-placeholder">
                    <h4>Ready to use</h4>
                    <p>Click to open the password generator</p>
                  </div>
                </div>
              )}
              {!tool.component && (
                <div className="tool-content">
                  <div className="tool-placeholder">
                    <h4>Coming Soon</h4>
                    <p>This tool is under development</p>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {renderActiveTool()}
    </div>
  );
};

export default ToolsPage;
