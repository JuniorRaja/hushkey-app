import { useEffect, useState } from 'react';
import TOTPService from '../services/totp';

interface TOTPDisplayProps {
  secret: string;
  label: string;
  issuer?: string;
}

const TOTPDisplay = ({ secret, label, issuer }: TOTPDisplayProps) => {
  const [code, setCode] = useState('');
  const [remaining, setRemaining] = useState(30);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const updateCode = async () => {
      try {
        setIsLoading(true);
        const newCode = await TOTPService.generateTOTP(secret);
        setCode(newCode);
        setRemaining(TOTPService.getRemainingSeconds());
      } catch (error) {
        console.error('Error generating TOTP:', error);
        setCode('ERROR');
      } finally {
        setIsLoading(false);
      }
    };

    updateCode();
    const interval = setInterval(updateCode, 1000);
    return () => clearInterval(interval);
  }, [secret]);

  const copyCode = () => {
    navigator.clipboard.writeText(code);
  };

  const progressPercentage = (remaining / 30) * 100;

  return (
    <div className="totp-display">
      <div className="totp-header">
        <h4>{label}</h4>
        {issuer && <span className="totp-issuer">{issuer}</span>}
      </div>

      <div className="totp-code-container">
        <div className="totp-code">
          {isLoading ? (
            <span>...</span>
          ) : (
            <span className="code-digits">
              {code.split('').map((digit, index) => (
                <span key={index} className="digit">{digit}</span>
              ))}
            </span>
          )}
        </div>

        <button onClick={copyCode} className="copy-code-btn" disabled={isLoading}>
          📋
        </button>
      </div>

      <div className="totp-progress">
        <div className="progress-bar">
          <div
            className="progress-fill"
            style={{ width: `${progressPercentage}%` }}
          ></div>
        </div>
        <span className="time-remaining">{remaining}s</span>
      </div>

      <div className="totp-apps">
        <small>Compatible with most authenticator apps</small>
      </div>
    </div>
  );
};

export default TOTPDisplay;
