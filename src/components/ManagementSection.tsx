import React from 'react';
import { MANAGEMENT_STEPS } from '../constants';
import { formatInitiativeStat } from '../services/initiativeService';

interface ManagementSectionProps {
  onOpenSubmit?: () => void;
  totalProposals?: number;
  completedCount?: number;
  statsLoading?: boolean;
}

export const ManagementSection: React.FC<ManagementSectionProps> = ({
  onOpenSubmit,
  totalProposals = 0,
  completedCount = 0,
  statsLoading = false,
}) => {
  const initiative = MANAGEMENT_STEPS[0];

  return (
    <section className="py-8 sm:py-10">
      <div className="relative overflow-hidden rounded-[18px] sm:rounded-[28px] border border-yellow-400/25 bg-gradient-to-br from-[#1e3a4c] via-[#122e41] to-[#0a1c2a] p-5 sm:p-8 md:p-10 shadow-xl">
        <div className="absolute -top-20 -right-20 w-48 h-48 rounded-full bg-yellow-400/10 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 -left-12 w-44 h-44 rounded-full bg-sky-400/10 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 lg:gap-8">
          <div className="max-w-2xl">
            <span className="inline-block mb-3 px-3 py-1 rounded-full bg-yellow-400/15 text-yellow-400 text-[10px] font-black uppercase tracking-[0.2em]">
              Участие граждан
            </span>
            <div className="mb-3 text-3xl origin-left">{initiative.icon}</div>
            <h3 className="text-2xl sm:text-3xl font-bold text-white mb-3">{initiative.title}</h3>
            <p className="text-gray-300 text-sm sm:text-base leading-relaxed mb-6">{initiative.description}</p>

            <div className="flex flex-wrap gap-6 sm:gap-8">
              <div>
                <p className="font-bold text-2xl sm:text-3xl text-yellow-400 tabular-nums">
                  {statsLoading ? '…' : formatInitiativeStat(totalProposals)}
                </p>
                <p className="text-gray-400 text-[10px] sm:text-xs uppercase tracking-widest">
                  {initiative.stat1_desc}
                </p>
              </div>
              <div>
                <p className="font-bold text-2xl sm:text-3xl text-yellow-400 tabular-nums">
                  {statsLoading ? '…' : formatInitiativeStat(completedCount)}
                </p>
                <p className="text-gray-400 text-[10px] sm:text-xs uppercase tracking-widest">
                  {initiative.stat2_desc}
                </p>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onOpenSubmit}
            className="w-full sm:w-auto shrink-0 px-5 sm:px-8 py-3.5 sm:py-4 rounded-2xl font-black text-sm sm:text-base uppercase tracking-wider bg-yellow-400 text-black hover:bg-yellow-300 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-[0_0_32px_rgba(250,204,21,0.28)]"
          >
            {initiative.buttonText}
          </button>
        </div>
      </div>
    </section>
  );
};
