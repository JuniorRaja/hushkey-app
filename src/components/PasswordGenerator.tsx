import { useState } from 'react';
import { useAppStore } from '../stores/authStore';

// Enhanced password generator using crypto.getRandomValues
const PasswordGenerator = ({ onClose }: { onClose: () => void }) => {
  const [options, setOptions] = useState({
    length: 16,
    uppercase: true,
    lowercase: true,
    numbers: true,
    symbols: true,
    memorable: false,
    avoidAmbiguous: false,
  });

  const [generatedPassword, setGeneratedPassword] = useState('');

  const generatePassword = () => {
    const { length, uppercase, lowercase, numbers, symbols, avoidAmbiguous } = options;

    // Character sets
    const uppercaseChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const lowercaseChars = 'abcdefghijklmnopqrstuvwxyz';
    const numberChars = '0123456789';
    const symbolChars = '!@#$%^&*()_+-=[]{}|;:,.<>?';

    let charSet = '';
    if (uppercase) charSet += uppercaseChars;
    if (lowercase) charSet += lowercaseChars;
    if (numbers) charSet += numberChars;
    if (symbols) charSet += symbolChars;

    // Remove ambiguous characters if requested
    if (avoidAmbiguous) {
      charSet = charSet.replace(/[0OIl1]/g, '');
    }

    if (charSet.length === 0) {
      alert('Please select at least one character type!');
      return;
    }

    // Generate password using cryptographically secure random
    const password = [];
    const array = new Uint8Array(length);

    crypto.getRandomValues(array);

    for (let i = 0; i < length; i++) {
      password.push(charSet[array[i] % charSet.length]);
    }

    // Ensure at least one character from each selected set
    const selectedSets = [];
    if (uppercase) selectedSets.push(uppercaseChars);
    if (lowercase) selectedSets.push(lowercaseChars);
    if (numbers) selectedSets.push(numberChars);
    if (symbols) selectedSets.push(symbolChars);

    selectedSets.forEach(charSet => {
      const randomIndex = crypto.getRandomValues(new Uint8Array(1))[0] % length;
      password[randomIndex] = charSet[crypto.getRandomValues(new Uint8Array(1))[0] % charSet.length];
    });

    setGeneratedPassword(password.join(''));
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(generatedPassword);
    // Don't auto-clear generator output like passwords
    alert('Password copied to clipboard!');
  };

  return (
    <div className="password-generator">
      <div className="generator-header">
        <h3>Password Generator</h3>
        <button onClick={onClose} className="close-btn">×</button>
      </div>

      <div className="generator-options">
        <div className="option-group">
          <label>Length: {options.length}</label>
          <input
            type="range"
            min="8"
            max="64"
            value={options.length}
            onChange={(e) => setOptions({ ...options, length: parseInt(e.target.value) })}
          />
        </div>

        <div className="checkboxes">
          <label>
            <input
              type="checkbox"
              checked={options.uppercase}
              onChange={(e) => setOptions({ ...options, uppercase: e.target.checked })}
            />
            Uppercase (A-Z)
          </label>

          <label>
            <input
              type="checkbox"
              checked={options.lowercase}
              onChange={(e) => setOptions({ ...options, lowercase: e.target.checked })}
            />
            Lowercase (a-z)
          </label>

          <label>
            <input
              type="checkbox"
              checked={options.numbers}
              onChange={(e) => setOptions({ ...options, numbers: e.target.checked })}
            />
            Numbers (0-9)
          </label>

          <label>
            <input
              type="checkbox"
              checked={options.symbols}
              onChange={(e) => setOptions({ ...options, symbols: e.target.checked })}
            />
            Symbols (!@#$%^&*)
          </label>

          <label>
            <input
              type="checkbox"
              checked={options.avoidAmbiguous}
              onChange={(e) => setOptions({ ...options, avoidAmbiguous: e.target.checked })}
            />
            Avoid ambiguous chars (0OIl1)
          </label>
        </div>
      </div>

      <div className="generator-actions">
        <button onClick={generatePassword} className="generate-btn">
          Generate Password
        </button>

        {generatedPassword && (
          <div className="generated-password">
            <div className="password-display">
              <code>{generatedPassword}</code>
              <button onClick={copyToClipboard} className="copy-btn">📋 Copy</button>
            </div>
            <div className="password-strength">
              <span>Strength: </span>
              <span className={`strength-${getPasswordStrength(generatedPassword)}`}>
                {getPasswordStrength(generatedPassword).toUpperCase()}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const getPasswordStrength = (password: string): string => {
  let score = 0;

  // Length check
  if (password.length >= 12) score += 1;
  if (password.length >= 16) score += 1;

  // Character variety
  if (/[a-z]/.test(password)) score += 1;
  if (/[A-Z]/.test(password)) score += 1;
  if (/[0-9]/.test(password)) score += 1;
  if (/[^a-zA-Z0-9]/.test(password)) score += 1;

  // Complexity patterns
  if (/(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[^a-zA-Z0-9])/.test(password)) score += 1;

  if (score < 3) return 'weak';
  if (score < 5) return 'medium';
  return 'strong';
};

export default PasswordGenerator;
