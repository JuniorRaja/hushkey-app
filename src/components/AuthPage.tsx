import { useState, useEffect } from "react";
import { useAppStore } from "../stores/authStore";

const AuthPage = () => {
  const {
    user,
    isLoading,
    signIn,
    signUp,
    unlockVault,
    unlockWithPin,
    encryptedPinKey,
  } = useAppStore();
  const [mode, setMode] = useState<"signin" | "signup" | "unlock" | "pin">(
    "signin"
  );
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    // Determine the default mode based on user state
    if (user && encryptedPinKey) {
      setMode("pin");
    } else if (user) {
      setMode("unlock");
    } else {
      setMode("signin");
    }
  }, [user, encryptedPinKey]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    try {
      await signIn(email, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign in failed");
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    try {
      await signUp(email, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign up failed");
    }
  };

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    try {
      await unlockVault(password);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unlock failed");
    }
  };

  const handlePinUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    try {
      await unlockWithPin(pin);
    } catch (err) {
      setError(err instanceof Error ? err.message : "PIN unlock failed");
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-container">
        <div className="auth-header">
          <h1>🔐 HushKey</h1>
          <p>Secure. Private. Zero-Knowledge.</p>
        </div>

        <div className="auth-form">
          {mode === "signin" && (
            <form onSubmit={handleSignIn} className="form-group">
              <h2>Sign In</h2>
              <div className="form-field">
                <label htmlFor="email">Email</label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  placeholder="your@email.com"
                />
              </div>
              <div className="form-field">
                <label htmlFor="password">Master Password</label>
                <div className="password-field">
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                    placeholder="Enter your master password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label="Toggle password visibility"
                  >
                    {showPassword ? "🙈" : "👁️"}
                  </button>
                </div>
              </div>
              <button
                type="submit"
                className="auth-button"
                disabled={isLoading}
              >
                {isLoading ? "🔄 Signing in..." : "Sign In"}
              </button>
              <button
                type="button"
                className="auth-link"
                onClick={() => setMode("signup")}
              >
                Don't have an account? Sign up
              </button>
            </form>
          )}

          {mode === "signup" && (
            <form onSubmit={handleSignUp} className="form-group">
              <h2>Create Account</h2>
              <div className="form-field">
                <label htmlFor="email">Email</label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  placeholder="your@email.com"
                />
              </div>
              <div className="form-field">
                <label htmlFor="password">Master Password</label>
                <div className="password-field">
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="new-password"
                    placeholder="At least 8 characters"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label="Toggle password visibility"
                  >
                    {showPassword ? "🙈" : "👁️"}
                  </button>
                </div>
              </div>
              <div className="form-field">
                <label htmlFor="confirmPassword">Confirm Master Password</label>
                <input
                  id="confirmPassword"
                  type={showPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  autoComplete="new-password"
                  placeholder="Re-enter password"
                />
              </div>
              <button
                type="submit"
                className="auth-button"
                disabled={isLoading}
              >
                {isLoading ? "🔄 Creating account..." : "Create Account"}
              </button>
              <button
                type="button"
                className="auth-link"
                onClick={() => setMode("signin")}
              >
                Already have an account? Sign in
              </button>
            </form>
          )}

          {mode === "unlock" && (
            <form onSubmit={handleUnlock} className="form-group">
              <h2>Welcome Back</h2>
              <p
                style={{
                  textAlign: "center",
                  color: "var(--text-secondary)",
                  marginBottom: "1.5rem",
                }}
              >
                {user?.email}
              </p>
              <div className="form-field">
                <label htmlFor="password">Master Password</label>
                <div className="password-field">
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                    autoFocus
                    placeholder="Enter your master password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label="Toggle password visibility"
                  >
                    {showPassword ? "🙈" : "👁️"}
                  </button>
                </div>
              </div>
              <button
                type="submit"
                className="auth-button"
                disabled={isLoading}
              >
                {isLoading ? "🔄 Unlocking..." : "🔓 Unlock Vault"}
              </button>
              <button
                type="button"
                className="auth-link"
                onClick={() => setMode("signin")}
              >
                Switch account
              </button>
            </form>
          )}

          {mode === "pin" && (
            <form onSubmit={handlePinUnlock} className="form-group">
              <h2>Enter PIN</h2>
              <div className="form-field">
                <label htmlFor="pin">4-6 Digit PIN</label>
                <input
                  id="pin"
                  type="password"
                  inputMode="numeric"
                  pattern="[0-9]{4,6}"
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  required
                  autoComplete="current-password"
                  autoFocus
                  maxLength={6}
                  placeholder="Enter your PIN"
                  style={{
                    textAlign: "center",
                    fontSize: "1.5rem",
                    letterSpacing: "0.5rem",
                  }}
                />
              </div>
              <button
                type="submit"
                className="auth-button"
                disabled={isLoading}
              >
                {isLoading ? "🔄 Unlocking..." : "🔓 Unlock Vault"}
              </button>
              <button
                type="button"
                className="auth-link"
                onClick={() => setMode("unlock")}
              >
                Use master password instead
              </button>
            </form>
          )}

          {error && <div className="error-message">⚠️ {error}</div>}
        </div>

        <div className="auth-footer">
          Your data is encrypted locally. Only you can access it.
        </div>
      </div>
    </div>
  );
};

export default AuthPage;
