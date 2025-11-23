import { useState, useEffect } from "react";
import { useAppStore } from "../stores/authStore";
import './AuthPage.css';

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
      <div className="auth-page">
        <div className="auth-container">
          <h1 className="auth-title">Unlock Vault</h1>
          <p className="auth-subtitle">{user.email}</p>
          <form onSubmit={handleSubmit}>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your master password"
              className="auth-input"
              required
            />
            <button type="submit" className="auth-button" disabled={isLoading}>
              {isLoading ? "Unlocking..." : "Unlock"}
            </button>
            {error && <p className="auth-error">{error}</p>}
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <div className="auth-container">
        <h1 className="auth-title">{isLogin ? "Welcome Back" : "Create Account"}</h1>
        <p className="auth-subtitle">
          {isLogin ? "Sign in to your HushKey vault" : "A new vault, just for you"}
        </p>
        <form onSubmit={handleSubmit}>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email address"
            className="auth-input"
            required
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Master password"
            className="auth-input"
            required
          />
          <button type="submit" className="auth-button" disabled={isLoading}>
            {isLoading ? "Loading..." : isLogin ? "Sign In" : "Sign Up"}
          </button>
          {error && <p className="auth-error">{error}</p>}
        </form>
        <p className="auth-toggle">
          {isLogin ? "Don't have an account?" : "Already have an account?"}{" "}
          <button onClick={() => setIsLogin(!isLogin)}>
            {isLogin ? "Sign Up" : "Sign In"}
          </button>
        </p>
      </div>
    </div>
  );
};

export default AuthPage;
