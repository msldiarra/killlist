"use client";

import { useEffect, useState } from "react";

interface VaultCounterProps {
  count: number;
  className?: string;
}

export function VaultCounter({ count, className = "" }: VaultCounterProps) {
  const [displayCount, setDisplayCount] = useState(count);
  const [isPulsing, setIsPulsing] = useState(false);

  useEffect(() => {
    if (count !== displayCount) {
      setIsPulsing(true);
      setDisplayCount(count);
      
      const timeout = setTimeout(() => {
        setIsPulsing(false);
      }, 300);
      
      return () => clearTimeout(timeout);
    }
  }, [count, displayCount]);

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {/* Coin icon */}
      <div
        className={`w-8 h-8 rounded-full bg-gradient-to-br from-kl-gold to-kl-gold-dim 
          flex items-center justify-center shadow-lg transition-transform duration-300
          ${isPulsing ? "animate-vault-pulse" : ""}`}
      >
        <svg
          viewBox="0 0 24 24"
          className="w-5 h-5 text-kl-black"
          fill="currentColor"
        >
          {/* Continental cross / marker */}
          <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1" fill="none" />
          <path d="M12 6v12M6 12h12" strokeWidth="1.5" stroke="currentColor" />
        </svg>
      </div>
      
      {/* Count */}
      <span
        className={`font-body text-lg font-semibold tabular-nums transition-all duration-300
          ${isPulsing ? "text-kl-gold scale-110" : "text-kl-gold-dim"}`}
      >
        {displayCount}
      </span>
    </div>
  );
}

