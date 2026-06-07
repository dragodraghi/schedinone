import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { registerSW } from "virtual:pwa-register";
import App from "./App";
import ErrorBoundary from "./components/ErrorBoundary";
import { showUpdateBanner } from "./lib/pwaUpdate";
import "./index.css";

// Controlled PWA updates: instead of silently swapping the app shell, prompt
// the user to apply a freshly downloaded build (avoids the stale-cache issues
// the autoUpdate strategy used to cause).
const updateSW = registerSW({
  onNeedRefresh() {
    showUpdateBanner(() => updateSW(true));
  },
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>
);
