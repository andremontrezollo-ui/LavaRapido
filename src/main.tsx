import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Validate required environment variables at startup
const REQUIRED_ENV_VARS = ["VITE_SUPABASE_URL", "VITE_SUPABASE_PUBLISHABLE_KEY"] as const;
const missing = REQUIRED_ENV_VARS.filter(
  (key) => !import.meta.env[key]
);

if (missing.length > 0) {
  document.getElementById("root")!.innerHTML = `
    <div style="min-height:100vh;display:flex;align-items:center;justify-content:center;background:#0a0a0a;font-family:sans-serif;color:#f1f1f1;padding:2rem;text-align:center">
      <div>
        <h1 style="font-size:1.5rem;margin-bottom:1rem;color:#ef4444">⚠️ Configuration Error</h1>
        <p style="color:#a1a1aa;margin-bottom:1rem">The following required environment variables are missing:</p>
        <pre style="background:#1a1a1a;border:1px solid #333;padding:1rem;border-radius:0.5rem;text-align:left;color:#fbbf24;font-size:0.875rem">${missing.join("\n")}</pre>
        <p style="color:#a1a1aa;margin-top:1rem">Copy <code style="color:#60a5fa">.env.example</code> to <code style="color:#60a5fa">.env</code> and fill in the values.</p>
      </div>
    </div>
  `;
} else {
  createRoot(document.getElementById("root")!).render(<App />);
}
