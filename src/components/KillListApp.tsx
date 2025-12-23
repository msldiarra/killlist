"use client";

import { useState, useEffect, useCallback } from "react";
import { getSettings, completeOnboarding } from "@/lib/db";
import { stopTicking } from "@/lib/audio";
import { MobileOnlyGuard } from "./ui/MobileOnlyGuard";
import { HoldToUnlock } from "./ui/HoldToUnlock";
import { ContractsScreen } from "./ContractsScreen";

export function KillListApp() {
  const [isOnboarded, setIsOnboarded] = useState<boolean | null>(null);

  // Check onboarding status
  useEffect(() => {
    const checkOnboarding = async () => {
      const settings = await getSettings();
      setIsOnboarded(settings.onboardingComplete);
    };

    checkOnboarding();
  }, []);

  // Ensure ticking stops when app unmounts or switches screens
  useEffect(() => {
    return () => {
      stopTicking();
    };
  }, []);

  const handleUnlock = useCallback(async () => {
    await completeOnboarding();
    // Small delay for animation
    setTimeout(() => {
      setIsOnboarded(true);
    }, 100);
  }, []);

  // Loading state
  if (isOnboarded === null) {
    return (
      <div className="min-h-dvh bg-kl-black flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-kl-gold border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <MobileOnlyGuard>
      {isOnboarded ? (
        <ContractsScreen />
      ) : (
        <HoldToUnlock onUnlock={handleUnlock} />
      )}
    </MobileOnlyGuard>
  );
}

