import React from 'react';
import type { ProshaProposal } from '../../utils/proshaSuggestions';

interface ProshaProposalCardProps {
  proposal: ProshaProposal;
  onAccept: () => void;
  onReject: () => void;
  saving?: boolean;
  linkedProject?: boolean;
}

export const ProshaProposalCard: React.FC<ProshaProposalCardProps> = ({
  proposal,
  onAccept,
  onReject,
  saving,
  linkedProject,
}) => (
  <div className="mt-3 rounded-xl border border-yellow-400/25 bg-yellow-400/5 p-3">
    <p className="mb-1 text-[10px] font-black uppercase tracking-widest text-yellow-400/80">
      Записать в проект · {proposal.label}
    </p>
    <p className="mb-2 text-[10px] text-gray-500">
      {linkedProject ? 'Сохранится в ваш проект на портале' : 'Сохранится в форму слева'}
    </p>
    <p className="mb-3 text-sm text-white/90">{proposal.value}</p>
    <div className="flex gap-2">
      <button
        type="button"
        disabled={saving}
        onClick={onAccept}
        className="rounded-lg bg-yellow-400 px-3 py-1.5 text-[11px] font-bold text-black transition-colors hover:bg-yellow-300 disabled:opacity-50"
      >
        {saving ? 'Сохраняю...' : 'Принять'}
      </button>
      <button
        type="button"
        disabled={saving}
        onClick={onReject}
        className="rounded-lg border border-white/10 px-3 py-1.5 text-[11px] font-bold text-gray-400 hover:text-white"
      >
        Не сейчас
      </button>
    </div>
  </div>
);
