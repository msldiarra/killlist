"use client";

import { hapticMedium } from "@/lib/haptics";

interface FabProps {
  onClick: () => void;
  className?: string;
}

export function Fab({ onClick, className = "" }: FabProps) {
  const handleClick = () => {
    hapticMedium();
    onClick();
  };

  return (
    <button
      onClick={handleClick}
      className={`fixed bottom-6 right-6 w-14 h-14 bg-kl-gold text-kl-black
        flex items-center justify-center shadow-heavy
        active:scale-95 transition-transform duration-150
        hover:shadow-glow-gold focus:outline-none focus:ring-2 focus:ring-kl-gold/50
        ${className}`}
      aria-label="Open new contract"
    >
      <svg
        viewBox="0 0 24 24"
        className="w-8 h-8"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="square"
      >
        <path d="M12 5v14M5 12h14" />
      </svg>
    </button>
  );
}

