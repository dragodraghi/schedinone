import { Component, type ErrorInfo, type ReactNode } from "react";
import { hardRefreshApp } from "../lib/appRefresh";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: unknown, info: ErrorInfo) {
    console.error("[app-crash]", error, info);
  }

  private reload = () => {
    window.location.reload();
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div
        className="min-h-screen flex items-center justify-center px-4"
        style={{ background: "var(--bg-deep)", color: "var(--text-primary)" }}
      >
        <div className="glass rounded-2xl p-6 w-full max-w-sm text-center space-y-4">
          <div>
            <h1 className="text-xl font-black" style={{ fontFamily: "Outfit, sans-serif" }}>
              Serve ricaricare l'app
            </h1>
            <p className="text-sm mt-2" style={{ color: "var(--text-muted)" }}>
              Se sei da telefono, potrebbe essere rimasta in cache una versione vecchia.
            </p>
          </div>
          <div className="space-y-2">
            <button
              onClick={this.reload}
              className="w-full py-3 rounded-xl font-bold text-sm"
              style={{
                fontFamily: "Outfit, sans-serif",
                background: "linear-gradient(135deg, #00d4ff, #0099cc)",
                color: "#040810",
              }}
            >
              Ricarica
            </button>
            <button
              onClick={hardRefreshApp}
              className="glass w-full py-3 rounded-xl font-bold text-sm"
              style={{ fontFamily: "Outfit, sans-serif", color: "var(--gold)" }}
            >
              Aggiorna app
            </button>
          </div>
        </div>
      </div>
    );
  }
}
