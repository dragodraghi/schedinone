import { useState } from 'react';

export type Player = { uid: string; name: string };

export function TargetPicker({
  players, value, onChange,
}: {
  players: Player[];
  value: string[] | null;
  onChange: (v: string[] | null) => void;
}) {
  const [mode, setMode] = useState<'all' | 'some'>(value === null ? 'all' : 'some');
  const set = new Set(value ?? []);
  return (
    <div className="space-y-2">
      <label className="flex items-center gap-2">
        <input type="radio" checked={mode === 'all'} onChange={() => { setMode('all'); onChange(null); }} />
        Tutti i giocatori
      </label>
      <label className="flex items-center gap-2">
        <input type="radio" checked={mode === 'some'} onChange={() => { setMode('some'); onChange([]); }} />
        Seleziona giocatori
      </label>
      {mode === 'some' && (
        <ul className="ml-6 max-h-48 overflow-auto border rounded p-2">
          {players.map((p) => (
            <li key={p.uid}>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={set.has(p.uid)}
                  onChange={(e) => {
                    const next = new Set(set);
                    if (e.target.checked) next.add(p.uid); else next.delete(p.uid);
                    onChange(Array.from(next));
                  }}
                />
                {p.name}
              </label>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
