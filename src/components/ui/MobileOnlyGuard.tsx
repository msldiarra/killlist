"use client";

import { useEffect, useState } from "react";

interface MobileOnlyGuardProps {
  children: React.ReactNode;
}

export function MobileOnlyGuard({ children }: MobileOnlyGuardProps) {
  const [isMobile, setIsMobile] = useState<boolean | null>(null);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    const checkMobile = () => {
      // Check viewport width and touch capability
      if (typeof window === "undefined") return;
      const width = window.innerWidth;
      const isTouchDevice = "ontouchstart" in window || (typeof navigator !== "undefined" && navigator.maxTouchPoints > 0);
      setIsMobile(width <= 768 || isTouchDevice);
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Loading state - render consistently on server and client
  if (!isMounted || isMobile === null) {
    return (
      <div className="min-h-dvh bg-kl-black flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-kl-gold border-t-transparent animate-spin" />
      </div>
    );
  }

  // Desktop guard
  if (!isMobile) {
    return (
      <div className="min-h-screen bg-kl-black flex flex-col items-center justify-center p-8 text-center">
        <div className="max-w-md space-y-8">
          {/* Continental coin icon */}
          <div className="mx-auto w-24 h-24 rounded-full bg-kl-gunmetal border-2 border-kl-gold flex items-center justify-center">
            <svg
              viewBox="0 0 24 24"
              className="w-12 h-12 text-kl-gold"
              fill="currentColor"
            >
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
            </svg>
          </div>

          <h1 className="font-heading text-3xl text-kl-gold tracking-wider">
            KILL LIST
          </h1>

          <div className="space-y-4 font-body text-kl-gold-dim">
            <p className="text-lg">
              This experience is designed for mobile devices.
            </p>
            <p className="text-sm opacity-70">
              Access this page on your phone to proceed with your contracts.
            </p>
          </div>

          {/* QR code placeholder */}
          <div className="mx-auto w-32 h-32 bg-kl-gunmetal border border-kl-gold-dim flex items-center justify-center">
            <span className="text-xs text-kl-gold-dim opacity-50">
              MOBILE ONLY
            </span>
          </div>

          <p className="text-xs text-kl-gold-dim opacity-50 font-body">
            The Continental does not serve desktop clients.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

