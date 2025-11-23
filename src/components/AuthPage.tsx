import { useState, useEffect } from "react";
import { useAppStore } from "../stores/authStore";
import './AuthPage.css';
import { ShieldIcon, LockIcon, KeyIcon, EmailIcon } from './FaviconIcon';

const AuthPage = () => {
  const { user, isLoading, signIn, signUp, unlockVault } = useAppStore();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (user) {
      // If user is logged in, show unlock screen
    } else {
      setIsLogin(true);
    }
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      if (user) {
        await unlockVault(password);
      } else if (isLogin) {
        await signIn(email, password);
      } else {
        await signUp(email, password);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    }
  };

  if (user) {
    return (
      <div className="auth-page unlock-page">
        <div className="auth-bg-pattern">
          <div className="floating-icon icon-1">
            <ShieldIcon size={48} />
          </div>
          <div className="floating-icon icon-2">
            <KeyIcon size={48} />
          </div>
          <div className="floating-icon icon-3">
            <LockIcon size={48} />
          </div>
        </div>
        
        <div className="auth-container unlock-container">
          <div className="auth-header">
            <div className="auth-logo">
              <ShieldIcon size={40} className="logo-icon" />
            </div>
            <h1 className="auth-title">Welcome Back</h1>
            <p className="auth-subtitle">{user.email}</p>
          </div>
          
          <form onSubmit={handleSubmit} className="auth-form">
            <div className="form-group">
              <div className="input-wrapper">
                <LockIcon size={20} className="input-icon" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your master password"
                  className="auth-input"
                  required
                />
              </div>
            </div>
            
            <button type="submit" className="auth-button unlock-button" disabled={isLoading}>
              <KeyIcon size={20} className="button-icon" />
              {isLoading ? "Unlocking..." : "Unlock Vault"}
            </button>
            
            {error && (
              <div className="auth-error">
                <span className="error-icon">⚠</span>
                {error}
              </div>
            )}
          </form>
          
          <div className="auth-footer">
            <ShieldIcon size={16} className="footer-icon" />
            Your data is encrypted and secure
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page login-page">
      <div className="auth-bg-pattern">
        <div className="floating-icon icon-1">
          <ShieldIcon size={48} />
        </div>
        <div className="floating-icon icon-2">
          <KeyIcon size={48} />
        </div>
        <div className="floating-icon icon-3">
          <LockIcon size={48} />
        </div>
        <div className="floating-icon icon-4">
          <EmailIcon size={48} />
        </div>
      </div>
      
      <div className="auth-container login-container">
        <div className="auth-header">
          <div className="auth-logo">
            <ShieldIcon size={40} className="logo-icon" />
          </div>
          <h1 className="auth-title">{isLogin ? "Welcome Back" : "Create Account"}</h1>
          <p className="auth-subtitle">
            {isLogin ? "Sign in to your secure vault" : "Start your secure journey"}
          </p>
        </div>
        
        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <div className="input-wrapper">
              <EmailIcon size={20} className="input-icon" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email address"
                className="auth-input"
                required
              />
            </div>
          </div>
          
          <div className="form-group">
            <div className="input-wrapper">
              <LockIcon size={20} className="input-icon" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Master password"
                className="auth-input"
                required
              />
            </div>
          </div>
          
          <button type="submit" className="auth-button login-button" disabled={isLoading}>
            {isLogin ? <KeyIcon size={20} className="button-icon" /> : <ShieldIcon size={20} className="button-icon" />}
            {isLoading ? "Loading..." : isLogin ? "Sign In" : "Create Vault"}
          </button>
          
          {error && (
            <div className="auth-error">
              <span className="error-icon">⚠</span>
              {error}
            </div>
          )}
        </form>
        
        <div className="auth-toggle">
          <span>{isLogin ? "Don't have an account?" : "Already have an account?"}</span>
          <button onClick={() => setIsLogin(!isLogin)} className="toggle-button">
            {isLogin ? "Sign Up" : "Sign In"}
          </button>
        </div>
        
        <div className="auth-footer">
          <ShieldIcon size={16} className="footer-icon" />
          End-to-end encrypted • Zero-knowledge security
        </div>
      </div>
    </div>
  );
};

export default AuthPage;
