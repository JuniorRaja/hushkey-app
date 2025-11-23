import { useEffect } from "react";
import { ThemeProvider } from "./components/ThemeProvider";
import Dashboard from "./components/Dashboard";
import PWAService from "./services/pwa";
import "./App.css";

function App() {
  useEffect(() => {
    // Initialize PWA functionality
    PWAService.initialize().catch(console.error);
  }, []);

  return (
    <ThemeProvider>
      <Dashboard />
    </ThemeProvider>
  );
}

export default App;
