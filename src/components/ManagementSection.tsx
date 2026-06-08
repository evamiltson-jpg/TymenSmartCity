import React, { useState } from 'react';
import { MANAGEMENT_STEPS } from '../constants';
import { InitiativeModal } from './InitiativeModal';

export const ManagementSection: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const initiative = MANAGEMENT_STEPS[0];

  return (
    <section className="py-12">
      {/* Мониторинг и Безопасность временно скрыты — настроим позже (MANAGEMENT_STEPS id 2, 3) */}
      <div className="relative overflow-hidden rounded-[32px] border border-yellow-400/25 bg-gradient-to-br from-[#1e3a4c] via-[#122e41] to-[#0a1c2a] p-10 md:p-14 shadow-2xl">
        <div className="absolute -top-24 -right-24 w-64 h-64 rounded-full bg-yellow-400/10 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -left-16 w-56 h-56 rounded-full bg-sky-400/10 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-10">
          <div className="max-w-2xl">
            <span className="inline-block mb-4 px-3 py-1 rounded-full bg-yellow-400/15 text-yellow-400 text-[10px] font-black uppercase tracking-[0.2em]">
              Участие граждан
            </span>
            <div className="mb-5 scale-125 origin-left">{initiative.icon}</div>
            <h3 className="text-3xl md:text-4xl font-bold text-white mb-4">{initiative.title}</h3>
            <p className="text-gray-300 text-base leading-relaxed mb-8">{initiative.description}</p>

            <div className="flex flex-wrap gap-8">
              <div>
                <p className="font-bold text-3xl text-yellow-400">{initiative.stat1_val}</p>
                <p className="text-gray-400 text-xs uppercase tracking-widest">{initiative.stat1_desc}</p>
              </div>
              <div>
                <p className="font-bold text-3xl text-yellow-400">{initiative.stat2_val}</p>
                <p className="text-gray-400 text-xs uppercase tracking-widest">{initiative.stat2_desc}</p>
              </div>
            </div>
          </div>

          <button
            onClick={() => setIsModalOpen(true)}
            className="shrink-0 px-10 py-5 rounded-2xl font-black text-lg uppercase tracking-wider bg-yellow-400 text-black hover:bg-yellow-300 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-[0_0_40px_rgba(250,204,21,0.35)]"
          >
            {initiative.buttonText}
          </button>
        </div>
      </div>

      <InitiativeModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </section>
  );
};
