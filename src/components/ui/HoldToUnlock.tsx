"use client";

import { useCallback, useRef, useState } from "react";
import { hapticProgressive, hapticSuccess } from "@/lib/haptics";
import { playLock, playThrum, resumeAudio } from "@/lib/audio";

interface HoldToUnlockProps {
  onUnlock: () => void;
  holdDuration?: number; // ms
}

export function HoldToUnlock({ onUnlock, holdDuration = 1200 }: HoldToUnlockProps) {
  const [progress, setProgress] = useState(0);
  const [isHolding, setIsHolding] = useState(false);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);
  const lastHapticRef = useRef<number>(0);

  const startHold = useCallback(async () => {
    if (isUnlocked) return;
    
    await resumeAudio();
    setIsHolding(true);
    startTimeRef.current = Date.now();
    lastHapticRef.current = 0;

    const updateInterval = 16; // ~60fps
    intervalRef.current = setInterval(() => {
      const elapsed = Date.now() - startTimeRef.current;
      const newProgress = Math.min(1, elapsed / holdDuration);
      setProgress(newProgress);

      // Progressive haptic feedback every 100ms
      const hapticThreshold = Math.floor(elapsed / 100);
      if (hapticThreshold > lastHapticRef.current) {
        lastHapticRef.current = hapticThreshold;
        hapticProgressive(newProgress);
        playThrum(newProgress);
      }

      if (newProgress >= 1) {
        // Unlock complete
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
        setIsUnlocked(true);
        hapticSuccess();
        playLock();
        setTimeout(onUnlock, 300);
      }
    }, updateInterval);
  }, [holdDuration, isUnlocked, onUnlock]);

  const endHold = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (!isUnlocked) {
      setIsHolding(false);
      setProgress(0);
    }
  }, [isUnlocked]);

  return (
    <div className="min-h-dvh bg-kl-black flex flex-col items-center justify-center p-8 select-none">
      {/* Oath text */}
      <div className="absolute top-1/4 text-center px-8">
        <p
          className={`font-body text-white/80 text-lg tracking-wide transition-opacity duration-500 ${
            isUnlocked ? "opacity-0" : "opacity-100"
          }`}
        >
          Serve the High Table.
        </p>
      </div>

      {/* Fingerprint button */}
      <button
        onPointerDown={startHold}
        onPointerUp={endHold}
        onPointerLeave={endHold}
        onPointerCancel={endHold}
        disabled={isUnlocked}
        className={`relative w-32 h-32 transition-transform duration-200 ${
          isHolding && !isUnlocked ? "scale-95" : "scale-100"
        } ${isUnlocked ? "scale-110" : ""}`}
        aria-label="Hold to unlock"
      >
        {/* Background glow */}
        <div
          className={`absolute inset-0 rounded-lg transition-all duration-300 ${
            isUnlocked
              ? "bg-kl-crimson/30 shadow-[0_0_40px_rgba(153,0,0,0.6)]"
              : isHolding
              ? "bg-kl-crimson/20 shadow-[0_0_30px_rgba(153,0,0,0.4)]"
              : "bg-transparent"
          }`}
        />

        {/* Fingerprint container */}
        <div className="absolute inset-0 flex items-center justify-center">
          {/* Base fingerprint (dim) */}
          <svg
            viewBox="0 0 64 64"
            className={`w-20 h-20 transition-opacity duration-300 ${
              isUnlocked ? "opacity-0" : "opacity-40"
            }`}
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          >
            <FingerprintPath className="text-kl-crimson" />
          </svg>

          {/* Filled fingerprint (red liquid effect) */}
          <svg
            viewBox="0 0 64 64"
            className="w-20 h-20 absolute"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            style={{
              clipPath: `inset(${100 - progress * 100}% 0 0 0)`,
            }}
          >
            <FingerprintPath className="text-kl-crimson" />
          </svg>

          {/* Unlocked state */}
          {isUnlocked && (
            <div className="absolute inset-0 flex items-center justify-center animate-pulse-crimson">
              <svg
                viewBox="0 0 64 64"
                className="w-20 h-20 text-kl-crimson"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <FingerprintPath className="text-kl-crimson" />
              </svg>
            </div>
          )}
        </div>

        {/* Pulse animation when idle */}
        {!isHolding && !isUnlocked && (
          <div className="absolute inset-0 rounded-lg animate-pulse-gold opacity-20 bg-kl-crimson/10" />
        )}
      </button>

      {/* Instruction text */}
      <div className="absolute bottom-1/4 text-center px-8">
        <p
          className={`font-body text-kl-gold-dim text-sm transition-all duration-500 ${
            isUnlocked ? "opacity-0 translate-y-4" : "opacity-60"
          }`}
        >
          {isHolding ? "Confirming identity..." : "Press and hold to confirm"}
        </p>
      </div>
    </div>
  );
}

// Fingerprint SVG path component
function FingerprintPath({ className }: { className?: string }) {
  return (
    <g className={className}>
      {/* Center spiral */}
      <path d="M32 24c-4 0-7 3-7 7s3 7 7 7" />
      <path d="M32 20c-6 0-11 5-11 11s5 11 11 11" />
      <path d="M32 16c-8 0-15 7-15 15s7 15 15 15" />
      
      {/* Outer ridges */}
      <path d="M32 12c-11 0-19 8-19 19s8 19 19 19" />
      <path d="M32 8c-14 0-24 10-24 24" />
      
      {/* Inner detail */}
      <path d="M32 28c-1.5 0-3 1.5-3 3s1.5 3 3 3" />
      
      {/* Right side arcs */}
      <path d="M39 31c0-4-3-7-7-7" />
      <path d="M43 31c0-6-5-11-11-11" />
      <path d="M47 31c0-8-7-15-15-15" />
      <path d="M51 31c0-11-8-19-19-19" />
    </g>
  );
}

