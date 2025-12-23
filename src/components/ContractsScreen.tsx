"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { 
  type Contract, 
  type AppSettings,
  getActiveContracts,
  getArchivedContracts,
  getSettings, 
  createContract, 
  completeContract 
} from "@/lib/db";
import { hasOverdueContracts } from "@/lib/contracts";
import { startTicking, stopTicking } from "@/lib/audio";
import { VaultCounter } from "./ui/VaultCounter";
import { ContractCard } from "./ui/ContractCard";
import { Fab } from "./ui/Fab";
import { BottomSheet } from "./ui/BottomSheet";
import { CreateContractForm } from "./ui/CreateContractForm";
import { ArchivedContractCard } from "./ui/ArchivedContractCard";

export function ContractsScreen() {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [archivedContracts, setArchivedContracts] = useState<Contract[]>([]);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const vaultRef = useRef<HTMLDivElement>(null);

  // Load all data (active + archived + settings)
  const loadAllData = useCallback(async () => {
    const [loadedContracts, loadedArchived, loadedSettings] = await Promise.all([
      getActiveContracts(),
      getArchivedContracts(),
      getSettings(),
    ]);
    setContracts(loadedContracts);
    setArchivedContracts(loadedArchived);
    setSettings(loadedSettings);
    return { loadedContracts, loadedArchived, loadedSettings };
  }, []);

  // Initial load
  useEffect(() => {
    loadAllData().then(() => setIsLoading(false));
  }, [loadAllData]);

  // Refresh contracts periodically (for countdown updates)
  useEffect(() => {
    const interval = setInterval(async () => {
      const [loadedContracts, loadedArchived] = await Promise.all([
        getActiveContracts(),
        getArchivedContracts(),
      ]);
      setContracts(loadedContracts);
      setArchivedContracts(loadedArchived);
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Handle Excommunicado state (global theme shift + ticking)
  const hasOverdue = hasOverdueContracts(contracts);
  
  useEffect(() => {
    const root = document.documentElement;
    
    if (hasOverdue) {
      root.classList.add("excommunicado");
      startTicking();
    } else {
      root.classList.remove("excommunicado");
      stopTicking();
    }

    // Cleanup on unmount or when hasOverdue changes
    return () => {
      root.classList.remove("excommunicado");
      stopTicking();
    };
  }, [hasOverdue]);

  // Ensure ticking stops when component unmounts
  useEffect(() => {
    return () => {
      stopTicking();
    };
  }, []);

  // Get vault position for coin animation
  const getVaultPosition = useCallback(() => {
    if (!vaultRef.current) return undefined;
    const rect = vaultRef.current.getBoundingClientRect();
    return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
  }, []);

  // Handlers
  const handleCreateContract = useCallback(async (title: string, deadline: Date, isHighTable: boolean) => {
    await createContract(title, deadline, isHighTable ? "highTable" : "normal");
    await loadAllData();
    setIsCreateOpen(false);
  }, [loadAllData]);

  const handleCompleteContract = useCallback(async (id: string) => {
    await completeContract(id);
    await loadAllData();
  }, [loadAllData]);

  if (isLoading || !settings) {
    return (
      <div className="min-h-dvh bg-kl-black flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-kl-gold border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-kl-black flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-kl-black/95 backdrop-blur-sm border-b border-kl-gold/10">
        <div className="px-4 py-4 flex items-center justify-between">
          <h1 className="font-heading text-2xl text-accent tracking-wider">
            KILL LIST
          </h1>
          
          <div ref={vaultRef}>
            <VaultCounter count={settings.vaultCount} />
          </div>
        </div>

        {/* Excommunicado banner */}
        {hasOverdue && (
          <div className="px-4 py-2 bg-kl-crimson/20 border-t border-kl-crimson/30">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-kl-crimson animate-pulse" />
              <span className="font-body text-sm text-kl-crimson uppercase tracking-wider font-semibold">
                Excommunicado
              </span>
            </div>
          </div>
        )}
      </header>

      {/* Main content */}
      <main className="flex-1 px-4 py-6 pb-24 space-y-8">
        {/* ACTIVE CONTRACTS Section */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-body text-xs text-kl-gold-dim uppercase tracking-widest">
              Active Contracts
            </h2>
            <span className="font-body text-xs text-kl-gold tabular-nums">
              {contracts.length} OPEN
            </span>
          </div>

          {/* Dotted separator */}
          <div className="border-t border-dotted border-kl-gold/20 mb-4" />

          {contracts.length === 0 ? (
            /* Empty state for active */
            <div className="text-center py-12">
              <p className="font-body text-kl-gold-dim/60 text-sm uppercase tracking-wider">
                You are currently retired
              </p>
            </div>
          ) : (
            /* Active contracts list */
            <div className="space-y-3">
              {contracts.map((contract) => (
                <ContractCard
                  key={contract.id}
                  contract={contract}
                  onComplete={handleCompleteContract}
                  excommunicadoDurationMs={settings.excommunicadoDurationMs}
                  vaultPosition={getVaultPosition()}
                />
              ))}
            </div>
          )}
        </section>

        {/* ARCHIVE Section */}
        {archivedContracts.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-body text-xs text-kl-gold-dim/60 uppercase tracking-widest">
                Archive
              </h2>
            </div>

            {/* Dotted separator */}
            <div className="border-t border-dotted border-kl-gold/10 mb-4" />

            {/* Archived contracts list */}
            <div className="space-y-2">
              {archivedContracts.map((contract) => (
                <ArchivedContractCard
                  key={contract.id}
                  contract={contract}
                />
              ))}
            </div>
          </section>
        )}
      </main>

      {/* FAB */}
      <Fab onClick={() => setIsCreateOpen(true)} />

      {/* Create contract sheet */}
      <BottomSheet
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="ISSUE NEW CONTRACT"
      >
        <CreateContractForm
          onSubmit={handleCreateContract}
          onCancel={() => setIsCreateOpen(false)}
        />
      </BottomSheet>
    </div>
  );
}

