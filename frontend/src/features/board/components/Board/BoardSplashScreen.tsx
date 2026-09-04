"use client";

import { useEffect, useState } from "react";
interface IBoardSplashScreenProps {
  ready: boolean;
}

const LETTERS: {
  char: string;
  x: number;
  startX: number;
  startY: number;
  startRotate: number;
}[] = [
  { char: "n", x: 10, startX: -18, startY: -14, startRotate: -18 },
  { char: "o", x: 22, startX: 12, startY: 16, startRotate: 22 },
  { char: "v", x: 34, startX: -8, startY: -20, startRotate: -14 },
  { char: "a", x: 45, startX: 16, startY: 12, startRotate: 20 },
];

export function BoardSplashScreen({ ready }: IBoardSplashScreenProps) {
  const [visible, setVisible] = useState(true);
  const [fadeOut, setFadeOut] = useState(false);
  useEffect(() => {
    if (!ready) return;
    const holdTimer = setTimeout(() => setFadeOut(true), 2000);
    return () => clearTimeout(holdTimer);
  }, [ready]);
  useEffect(() => {
    if (!fadeOut) return;
    const removeTimer = setTimeout(() => setVisible(false), 800);
    return () => clearTimeout(removeTimer);
  }, [fadeOut]);
  if (!visible) return null;
  
  return (
    <div
      className={`
        fixed inset-0 z-[10000] flex items-center justify-center bg-white
        transition-all duration-700 ease-[cubic-bezier(0.4,0,0,1)]
        ${fadeOut ? "opacity-0 scale-[1.02]" : "opacity-100 scale-100"}
      `}
    >
      <div className="absolute splash-glow" />

      <div className="relative splash-float">
        <svg className="w-40 h-16" viewBox="0 0 80 32" fill="none">
          <rect
            className="splash-badge"
            width="80"
            height="32"
            rx="4"
            fill="#FFD02F"
          />

          {LETTERS.map((l, i) => (
            <text
              key={l.char}
              className="splash-letter"
              x={l.x}
              y={22}
              fontFamily="Inter"
              fontWeight="700"
              fontSize="18"
              fill="#050038"
              style={{
                ["--start-x" as string]: `${l.startX}px`,
                ["--start-y" as string]: `${l.startY}px`,
                ["--start-r" as string]: `${l.startRotate}deg`,
                animationDelay: `${0.3 + i * 0.1}s`,
              }}
            >
              {l.char}
            </text>
          ))}
        </svg>
      </div>

      <style jsx>{`
        .splash-glow {
          width: 240px;
          height: 240px;
          border-radius: 9999px;
          background: radial-gradient(
            circle,
            rgba(255, 208, 47, 0.18) 0%,
            transparent 70%
          );
          animation: glow-breathe 3.5s ease-in-out infinite;
        }

        .splash-badge {
          opacity: 0;
          transform-origin: center;
          animation: badge-in 0.5s cubic-bezier(0.16, 1, 0.3, 1) 0.05s both;
        }

        .splash-letter {
          opacity: 0;
          transform-origin: center;
          animation: letter-assemble 0.7s cubic-bezier(0.16, 1, 0.3, 1) both;
        }

        .splash-float {
          animation: float 4s ease-in-out 1.2s infinite;
        }

        @keyframes badge-in {
          0% {
            opacity: 0;
            transform: scale(0.6);
            filter: blur(6px);
          }
          100% {
            opacity: 1;
            transform: scale(1);
            filter: blur(0px);
          }
        }

        @keyframes letter-assemble {
          0% {
            opacity: 0;
            transform: translate(var(--start-x), var(--start-y))
              rotate(var(--start-r));
            filter: blur(4px);
          }
          60% {
            opacity: 1;
            filter: blur(0px);
          }
          100% {
            opacity: 1;
            transform: translate(0, 0) rotate(0deg);
            filter: blur(0px);
          }
        }

        @keyframes float {
          0%,
          100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-8px);
          }
        }

        @keyframes glow-breathe {
          0%,
          100% {
            opacity: 0;
            transform: scale(0.8);
          }
          50% {
            opacity: 1;
            transform: scale(1.2);
          }
        }
      `}</style>
    </div>
  );
}
