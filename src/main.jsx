import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import "./index.css";

class AppErrorBoundary extends React.Component {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error) {
    console.error("SokoSafi failed to render.", error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <main style={{ maxWidth: 640, margin: "12vh auto", padding: 24, fontFamily: "system-ui, sans-serif", color: "#1e293b" }}>
          <h1>SokoSafi could not load</h1>
          <p>An app error occurred. Refresh the page. If it continues, check the Cloudflare Pages deployment logs and confirm the build output directory is <code>dist</code>.</p>
          <button onClick={() => window.location.reload()} style={{ padding: "10px 16px", cursor: "pointer" }}>Refresh</button>
        </main>
      );
    }
    return this.props.children;
  }
}

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <AppErrorBoundary>
      <App />
    </AppErrorBoundary>
  </React.StrictMode>,
);
