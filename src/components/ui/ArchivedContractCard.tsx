"use client";

import type { Contract } from "@/lib/db";

interface ArchivedContractCardProps {
  contract: Contract;
}

/**
 * Format time for archive display (e.g., "23:59 HRS")
 */
function formatArchiveTime(dateStr: string): string {
  const date = new Date(dateStr);
  const hours = date.getHours().toString().padStart(2, "0");
  const minutes = date.getMinutes().toString().padStart(2, "0");
  return `${hours}:${minutes} HRS`;
}

export function ArchivedContractCard({ contract }: ArchivedContractCardProps) {
  const isFailed = contract.status === "failed";
  const displayTime = contract.completedAt || contract.deadlineAt;

  return (
    <div className="bg-kl-black/50 border-l-4 transition-none cursor-default select-none"
      style={{
        borderLeftColor: isFailed ? "var(--kl-crimson)" : "var(--kl-gold)",
      }}
    >
      <div className="p-4 flex items-center gap-4">
        {/* Status icon */}
        <div
          className={`w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center border
            ${isFailed 
              ? "bg-kl-crimson/10 border-kl-crimson/50" 
              : "bg-kl-gold/10 border-kl-gold/30"
            }`}
        >
          {/* Coin icon with line-through for terminated */}
          <svg
            viewBox="0 0 24 24"
            className={`w-5 h-5 ${isFailed ? "text-kl-crimson/60" : "text-kl-gold/60"}`}
            fill="currentColor"
          >
            <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="1.5" />
            <path d="M12 6v12M6 12h12" strokeWidth="1.5" stroke="currentColor" />
            {/* Strike-through line */}
            <line x1="4" y1="4" x2="20" y2="20" stroke="currentColor" strokeWidth="1.5" />
          </svg>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <h3 
            className={`font-body text-base font-medium line-through
              ${isFailed ? "text-kl-crimson/50" : "text-kl-gold-dim/70"}`}
          >
            {contract.title}
          </h3>
          
          <p className={`font-body text-xs mt-1 uppercase tracking-wider
            ${isFailed ? "text-kl-crimson/40" : "text-kl-gold-dim/50"}`}
          >
            STATUS: {isFailed ? "FAILED" : "TERMINATED"}
          </p>
        </div>

        {/* Time */}
        <div className="text-right flex-shrink-0">
          <p className={`font-body text-sm font-mono tabular-nums
            ${isFailed ? "text-kl-crimson/40" : "text-kl-gold-dim/50"}`}
          >
            {formatArchiveTime(displayTime)}
          </p>
        </div>
      </div>
    </div>
  );
}

