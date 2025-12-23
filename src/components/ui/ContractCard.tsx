"use client";

import { useCallback, useRef, useState, useEffect } from "react";
import type { Contract } from "@/lib/db";
import { 
  formatDeadline, 
  formatCountdown, 
  getExcommunicadoRemainingMs, 
  isOverdue,
  hasFailed 
} from "@/lib/contracts";
import { hapticImpact, hapticMedium } from "@/lib/haptics";
import { playExecute, playCoin } from "@/lib/audio";

interface ContractCardProps {
  contract: Contract;
  onComplete: (id: string) => void;
  excommunicadoDurationMs?: number;
  vaultPosition?: { x: number; y: number };
}

const SWIPE_THRESHOLD = 120; // px to trigger completion
const VELOCITY_THRESHOLD = 0.5; // px/ms

export function ContractCard({ 
  contract, 
  onComplete, 
  excommunicadoDurationMs = 45 * 60 * 1000,
  vaultPosition 
}: ContractCardProps) {
  const [offsetX, setOffsetX] = useState(0);
  const [isCompleting, setIsCompleting] = useState(false);
  const [showCoin, setShowCoin] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  
  const cardRef = useRef<HTMLDivElement>(null);
  const startXRef = useRef(0);
  const startTimeRef = useRef(0);
  const isDraggingRef = useRef(false);

  const contractIsOverdue = isOverdue(contract);
  const contractHasFailed = hasFailed(contract, excommunicadoDurationMs);

  // Update countdown timer
  useEffect(() => {
    if (!contractIsOverdue || contractHasFailed) {
      setCountdown(null);
      return;
    }

    const updateCountdown = () => {
      const remaining = getExcommunicadoRemainingMs(contract, excommunicadoDurationMs);
      setCountdown(remaining);
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);

    return () => clearInterval(interval);
  }, [contract, contractIsOverdue, contractHasFailed, excommunicadoDurationMs]);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (isCompleting) return;
    
    isDraggingRef.current = true;
    startXRef.current = e.clientX;
    startTimeRef.current = Date.now();
    
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, [isCompleting]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDraggingRef.current || isCompleting) return;
    
    const deltaX = e.clientX - startXRef.current;
    // Only allow swipe right
    const newOffset = Math.max(0, deltaX);
    setOffsetX(newOffset);

    // Haptic feedback as approaching threshold
    if (newOffset > SWIPE_THRESHOLD * 0.7 && newOffset < SWIPE_THRESHOLD) {
      hapticMedium();
    }
  }, [isCompleting]);

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    if (!isDraggingRef.current || isCompleting) return;
    
    isDraggingRef.current = false;
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);

    const elapsed = Date.now() - startTimeRef.current;
    const velocity = offsetX / elapsed;

    // Check if swipe was aggressive enough
    if (offsetX > SWIPE_THRESHOLD || velocity > VELOCITY_THRESHOLD) {
      // Execute completion
      setIsCompleting(true);
      hapticImpact();
      playExecute();

      // Show slash animation briefly
      setTimeout(() => {
        setShowCoin(true);
        playCoin();
        
        // Trigger completion after coin animation
        setTimeout(() => {
          onComplete(contract.id);
        }, 600);
      }, 200);
    } else {
      // Spring back
      setOffsetX(0);
    }
  }, [offsetX, isCompleting, contract.id, onComplete]);

  const handlePointerCancel = useCallback(() => {
    isDraggingRef.current = false;
    setOffsetX(0);
  }, []);

  // Calculate coin animation target
  const coinStyle = vaultPosition ? {
    "--coin-target-x": `${vaultPosition.x}px`,
  } as React.CSSProperties : {};

  return (
    <div 
      className="relative overflow-hidden"
      style={{ touchAction: "pan-y" }}
    >
      {/* Swipe reveal background */}
      <div className="absolute inset-0 bg-gradient-to-r from-kl-gold/20 to-kl-gold/5 flex items-center pl-4">
        <svg 
          viewBox="0 0 24 24" 
          className="w-6 h-6 text-kl-gold"
          fill="currentColor"
        >
          <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
        </svg>
      </div>

      {/* Card */}
      <div
        ref={cardRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
        className={`relative bg-kl-gunmetal border transition-all duration-200 cursor-grab active:cursor-grabbing
          ${contractIsOverdue 
            ? "border-kl-crimson shadow-[0_0_15px_rgba(153,0,0,0.3)]" 
            : "border-kl-gold/20 hover:border-kl-gold/40"
          }
          ${isCompleting ? "opacity-50" : ""}
          ${contractHasFailed ? "opacity-60" : ""}
        `}
        style={{
          transform: `translateX(${offsetX}px)`,
          transition: isDraggingRef.current ? "none" : "transform 0.3s ease-out",
        }}
      >
        <div className="p-4 flex items-center gap-4">
          {/* Status icon */}
          <div
            className={`w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center
              ${contract.priority === "highTable" 
                ? "bg-kl-crimson/20 border border-kl-crimson" 
                : "bg-kl-gold/10 border border-kl-gold/30"
              }
              ${contractIsOverdue ? "animate-pulse-crimson" : ""}
            `}
          >
            {/* Coin icon */}
            <svg
              viewBox="0 0 24 24"
              className={`w-5 h-5 ${contractIsOverdue ? "text-kl-crimson" : "text-kl-gold"}`}
              fill="currentColor"
            >
              <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="1.5" />
              <path d="M12 6v12M6 12h12" strokeWidth="1.5" stroke="currentColor" />
            </svg>
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="relative">
              <h3 
                className={`font-body text-base font-medium truncate
                  ${contractIsOverdue ? "text-kl-crimson" : "text-white"}
                  ${isCompleting ? "line-through opacity-50" : ""}
                `}
              >
                {contract.title}
              </h3>
              
              {/* Slash animation overlay */}
              {isCompleting && !showCoin && (
                <div className="absolute top-1/2 left-0 h-0.5 bg-kl-gold animate-slash" />
              )}
            </div>
            
            {/* Deadline / Countdown */}
            <p 
              className={`font-body text-sm mt-1
                ${contractIsOverdue ? "text-kl-crimson font-semibold" : "text-kl-gold-dim"}
              `}
            >
              {contractHasFailed ? (
                <span className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-kl-crimson animate-pulse" />
                  FAILED
                </span>
              ) : contractIsOverdue && countdown !== null ? (
                <span className="font-mono tabular-nums">
                  {formatCountdown(countdown)}
                </span>
              ) : (
                formatDeadline(contract.deadlineAt)
              )}
            </p>
          </div>

          {/* Priority badge */}
          {contract.priority === "highTable" && (
            <div 
              className={`px-2 py-1 text-xs font-body font-semibold uppercase tracking-wider
                ${contractIsOverdue 
                  ? "bg-kl-crimson/20 text-kl-crimson" 
                  : "bg-kl-crimson/10 text-kl-crimson"
                }
              `}
            >
              High Table
            </div>
          )}
        </div>
      </div>

      {/* Flying coin animation */}
      {showCoin && (
        <div
          className="absolute left-1/2 top-1/2 w-10 h-10 rounded-full bg-gradient-to-br from-kl-gold to-kl-gold-dim
            flex items-center justify-center animate-coin-fly pointer-events-none z-50"
          style={coinStyle}
        >
          <svg
            viewBox="0 0 24 24"
            className="w-6 h-6 text-kl-black"
            fill="currentColor"
          >
            <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="1.5" />
            <path d="M12 6v12M6 12h12" strokeWidth="1.5" stroke="currentColor" />
          </svg>
        </div>
      )}
    </div>
  );
}

