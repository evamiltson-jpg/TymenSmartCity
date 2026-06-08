import React, { useState } from 'react';

interface FieldHintProps {
  text: string;
}

export const FieldHint: React.FC<FieldHintProps> = ({ text }) => {
  const [open, setOpen] = useState(false);

  return (
    <div className="inline-flex flex-col">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-sky-500/20 text-sky-200 border border-sky-400/40 hover:bg-sky-500/30 transition-colors"
        aria-expanded={open}
      >
        <span className="w-4 h-4 rounded-full bg-sky-400/30 flex items-center justify-center text-[10px]">?</span>
        Подсказка
      </button>
      {open && (
        <p className="mt-2 text-xs leading-relaxed text-sky-100/90 bg-sky-500/10 border border-sky-400/25 rounded-xl px-3 py-2 max-w-md">
          {text}
        </p>
      )}
    </div>
  );
};
