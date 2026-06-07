/**
 * Lightweight, framework-free "new version available" banner shown when the
 * service worker has fetched a fresh build. Kept out of React so it can be
 * triggered straight from the SW registration in main.tsx without plumbing
 * global state through the component tree.
 */
export function showUpdateBanner(onUpdate: () => void): void {
  if (typeof document === "undefined") return;

  const existing = document.getElementById("pwa-update-banner");
  if (existing) return;

  const banner = document.createElement("div");
  banner.id = "pwa-update-banner";
  banner.setAttribute("role", "status");
  banner.setAttribute("aria-live", "polite");
  banner.style.cssText = [
    "position:fixed",
    "left:50%",
    "transform:translateX(-50%)",
    "top:max(12px, env(safe-area-inset-top))",
    "z-index:60",
    "display:flex",
    "align-items:center",
    "gap:12px",
    "padding:10px 14px",
    "border-radius:14px",
    "font-family:Outfit, sans-serif",
    "font-size:13px",
    "font-weight:700",
    "color:#040810",
    "background:linear-gradient(135deg, #00d4ff, #ffd700)",
    "box-shadow:0 6px 24px rgba(0,212,255,0.35)",
  ].join(";");

  const label = document.createElement("span");
  label.textContent = "Nuova versione disponibile";

  const button = document.createElement("button");
  button.type = "button";
  button.textContent = "Aggiorna";
  button.style.cssText = [
    "padding:6px 12px",
    "border-radius:10px",
    "border:none",
    "cursor:pointer",
    "font-family:Outfit, sans-serif",
    "font-weight:800",
    "font-size:12px",
    "color:#ffffff",
    "background:rgba(4,8,16,0.85)",
  ].join(";");
  button.addEventListener("click", () => {
    button.disabled = true;
    button.textContent = "Aggiorno…";
    onUpdate();
  });

  banner.appendChild(label);
  banner.appendChild(button);
  document.body.appendChild(banner);
}
