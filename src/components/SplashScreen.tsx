import { useState, useEffect } from "react";

interface Props {
  onComplete: () => void;
}

export default function SplashScreen({ onComplete }: Props) {
  const [phase, setPhase] = useState<"flash" | "logo" | "subtitle" | "exit">("flash");

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase("logo"), 200),
      setTimeout(() => setPhase("subtitle"), 900),
      setTimeout(() => setPhase("exit"), 1800),
      setTimeout(() => onComplete(), 2300),
    ];
    return () => timers.forEach(clearTimeout);
  }, [onComplete]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden"
      style={{
        background: 'var(--bg-deep)',
        opacity: phase === "exit" ? 0 : 1,
        transition: 'opacity 0.5s ease',
      }}
    >
      {/* Radial flash effect */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(circle at center, rgba(0, 212, 255, 0.15), transparent 70%)',
          opacity: phase === "flash" ? 1 : 0,
          transition: 'opacity 0.3s ease',
        }}
      />

      {/* Horizontal light streak */}
      <div
        className="absolute top-1/2 -translate-y-1/2 h-px w-full pointer-events-none"
        style={{
          background: 'linear-gradient(90deg, transparent 10%, rgba(0, 212, 255, 0.6) 50%, transparent 90%)',
          opacity: phase === "flash" ? 0 : phase === "exit" ? 0 : 1,
          transform: `translateY(-50%) scaleX(${phase === "logo" || phase === "subtitle" ? 1 : 0})`,
          transition: 'transform 0.6s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.3s ease',
        }}
      />

      {/* Main content */}
      <div className="relative text-center">
        {/* SCHEDINONE title */}
        <h1
          style={{
            fontFamily: 'Outfit, sans-serif',
            fontWeight: 900,
            fontSize: 'clamp(2.5rem, 8vw, 5rem)',
            letterSpacing: '-0.02em',
            background: 'linear-gradient(135deg, #00d4ff 0%, #ffffff 40%, #ffd700 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            transform: phase === "flash" ? 'scale(1.5)' : 'scale(1)',
            opacity: phase === "flash" ? 0 : 1,
            transition: 'transform 0.7s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.3s ease',
            filter: phase === "logo" ? 'drop-shadow(0 0 30px rgba(0, 212, 255, 0.4))' : 'drop-shadow(0 0 15px rgba(0, 212, 255, 0.2))',
          }}
        >
          SCHEDINONE
        </h1>

        {/* 2026 subtitle */}
        <div
          style={{
            fontFamily: 'Outfit, sans-serif',
            fontWeight: 700,
            fontSize: 'clamp(0.8rem, 2.5vw, 1.2rem)',
            letterSpacing: '0.5em',
            color: 'var(--gold)',
            marginTop: '0.5rem',
            opacity: phase === "subtitle" || phase === "exit" ? 1 : 0,
            transform: phase === "subtitle" || phase === "exit" ? 'translateY(0)' : 'translateY(10px)',
            transition: 'all 0.5s cubic-bezier(0.16, 1, 0.3, 1)',
            textShadow: '0 0 20px rgba(255, 215, 0, 0.3)',
          }}
        >
          MONDIALI 2026
        </div>

        {/* Decorative line under */}
        <div
          style={{
            margin: '1rem auto 0',
            height: '2px',
            width: phase === "subtitle" || phase === "exit" ? '120px' : '0px',
            background: 'linear-gradient(90deg, transparent, var(--accent), var(--gold), transparent)',
            transition: 'width 0.6s cubic-bezier(0.16, 1, 0.3, 1)',
          }}
        />
      </div>

      {/* Corner accents */}
      <div className="absolute top-8 left-8 w-12 h-12 border-t-2 border-l-2 rounded-tl-lg"
        style={{ borderColor: 'rgba(0, 212, 255, 0.3)', opacity: phase !== "flash" ? 1 : 0, transition: 'opacity 0.5s ease 0.3s' }} />
      <div className="absolute top-8 right-8 w-12 h-12 border-t-2 border-r-2 rounded-tr-lg"
        style={{ borderColor: 'rgba(0, 212, 255, 0.3)', opacity: phase !== "flash" ? 1 : 0, transition: 'opacity 0.5s ease 0.3s' }} />
      <div className="absolute bottom-8 left-8 w-12 h-12 border-b-2 border-l-2 rounded-bl-lg"
        style={{ borderColor: 'rgba(255, 215, 0, 0.2)', opacity: phase !== "flash" ? 1 : 0, transition: 'opacity 0.5s ease 0.3s' }} />
      <div className="absolute bottom-8 right-8 w-12 h-12 border-b-2 border-r-2 rounded-br-lg"
        style={{ borderColor: 'rgba(255, 215, 0, 0.2)', opacity: phase !== "flash" ? 1 : 0, transition: 'opacity 0.5s ease 0.3s' }} />
    </div>
  );
}
