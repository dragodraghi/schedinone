import { useState } from "react";

interface Props {
  onLogin: (name: string, code: string) => void;
}

export default function LoginPage({ onLogin }: Props) {
  const [name, setName] = useState("");
  const [code, setCode] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onLogin(name.trim(), code.trim());
  };

  const isValid = name.trim().length > 0 && code.trim().length > 0;

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4">
      <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-6 text-center">
        <div>
          <h1 className="text-4xl font-extrabold text-white tracking-tight">SCHEDINONE</h1>
          <p className="text-slate-400 mt-2">Mondiali 2026</p>
        </div>
        <div className="space-y-3">
          <input
            type="text"
            placeholder="Il tuo nome"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
          />
          <input
            type="text"
            placeholder="Codice gioco"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
          />
        </div>
        <button
          type="submit"
          disabled={!isValid}
          className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 disabled:text-slate-500 text-white font-bold rounded-xl transition-colors"
        >
          ENTRA
        </button>
      </form>
    </div>
  );
}
