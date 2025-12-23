"use client";

import { useState, useEffect, useCallback } from "react";
import { hapticMedium, hapticSuccess } from "@/lib/haptics";
import { resumeAudio } from "@/lib/audio";

interface CreateContractFormProps {
  onSubmit: (title: string, deadline: Date, isHighTable: boolean) => void;
  onCancel: () => void;
}

export function CreateContractForm({ onSubmit, onCancel }: CreateContractFormProps) {
  const [title, setTitle] = useState("");
  const [deadlineDate, setDeadlineDate] = useState("");
  const [deadlineTime, setDeadlineTime] = useState("");
  const [isHighTable, setIsHighTable] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  // Set default deadline to today + 1 hour (client-only to avoid hydration mismatch)
  useEffect(() => {
    setIsMounted(true);
    const now = new Date();
    now.setHours(now.getHours() + 1, 0, 0, 0);
    
    const dateStr = now.toISOString().split("T")[0];
    const timeStr = now.toTimeString().slice(0, 5);
    
    setDeadlineDate(dateStr);
    setDeadlineTime(timeStr);
  }, []);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim() || !deadlineDate || !deadlineTime) return;

    await resumeAudio();
    hapticSuccess();

    const deadline = new Date(`${deadlineDate}T${deadlineTime}`);
    onSubmit(title.trim(), deadline, isHighTable);
  }, [title, deadlineDate, deadlineTime, isHighTable, onSubmit]);

  const toggleHighTable = useCallback(() => {
    hapticMedium();
    setIsHighTable((prev) => !prev);
  }, []);

  const isValid = title.trim() && deadlineDate && deadlineTime && isMounted;

  // Don't render form inputs until mounted to avoid hydration mismatch
  if (!isMounted) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="w-6 h-6 border-2 border-kl-gold border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Target name input */}
      <div className="space-y-2">
        <label htmlFor="title" className="font-body text-sm text-kl-gold-dim uppercase tracking-wider">
          Target Name
        </label>
        <input
          id="title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Enter Target Name..."
          autoFocus
          autoComplete="off"
          className="w-full bg-kl-black border border-kl-gold/30 px-4 py-3
            font-body text-white placeholder:text-kl-gold-dim/50
            focus:outline-none focus:border-kl-gold transition-colors"
        />
      </div>

      {/* Terminus Date inputs */}
      <div className="space-y-2">
        <label className="font-body text-sm text-kl-gold-dim uppercase tracking-wider">
          Terminus Date
        </label>
        <div className="flex gap-3">
          <input
            type="date"
            value={deadlineDate}
            onChange={(e) => setDeadlineDate(e.target.value)}
            className="flex-1 bg-kl-black border border-kl-gold/30 px-4 py-3
              font-body text-white
              focus:outline-none focus:border-kl-gold transition-colors
              [color-scheme:dark]"
          />
          <input
            type="time"
            value={deadlineTime}
            onChange={(e) => setDeadlineTime(e.target.value)}
            className="w-28 bg-kl-black border border-kl-gold/30 px-4 py-3
              font-body text-white
              focus:outline-none focus:border-kl-gold transition-colors
              [color-scheme:dark]"
          />
        </div>
      </div>

      {/* High Table toggle */}
      <button
        type="button"
        onClick={toggleHighTable}
        className={`w-full flex items-center justify-between p-4 border transition-all
          ${isHighTable 
            ? "bg-kl-crimson/20 border-kl-crimson" 
            : "bg-kl-black border-kl-gold/30 hover:border-kl-gold/50"
          }`}
      >
        <span className={`font-body text-sm uppercase tracking-wider
          ${isHighTable ? "text-kl-crimson" : "text-kl-gold-dim"}`}
        >
          High Table Order
        </span>
        
        {/* Toggle switch */}
        <div className={`w-12 h-6 rounded-full relative transition-colors
          ${isHighTable ? "bg-kl-crimson" : "bg-kl-gunmetal border border-kl-gold/30"}`}
        >
          <div className={`absolute top-1 w-4 h-4 rounded-full transition-all
            ${isHighTable 
              ? "right-1 bg-white" 
              : "left-1 bg-kl-gold-dim"
            }`}
          />
        </div>
      </button>

      {/* Action buttons */}
      <div className="flex gap-3 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 py-3 border border-kl-gold/30 font-body text-kl-gold-dim
            hover:border-kl-gold/50 hover:text-kl-gold transition-colors
            active:scale-98"
        >
          [ABORT]
        </button>
        <button
          type="submit"
          disabled={!isValid}
          className={`flex-1 py-3 font-body font-semibold transition-all active:scale-98
            ${isValid 
              ? "bg-kl-gold text-kl-black hover:shadow-glow-gold" 
              : "bg-kl-gold/30 text-kl-black/50 cursor-not-allowed"
            }`}
        >
          RATIFY CONTRACT
        </button>
      </div>
    </form>
  );
}

