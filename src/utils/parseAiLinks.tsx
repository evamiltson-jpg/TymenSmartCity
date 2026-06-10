import React from 'react';

const LINK_PATTERN = /(\[\[(?:проект|сервис|команда):[\w-]+\|.+?\]\])/g;

export interface AiLinkClickPayload {
  type: 'проект' | 'сервис' | 'команда';
  id: string;
  label: string;
}

interface ParseAiLinksOptions {
  onLinkClick: (payload: AiLinkClickPayload) => void;
}

export function parseAiLinks(text: string, { onLinkClick }: ParseAiLinksOptions): React.ReactNode[] {
  const cleanText = text.replace(/\*\*/g, '');
  const parts = cleanText.split(LINK_PATTERN);

  return parts.map((part, i) => {
    if (!part.startsWith('[[') || !part.includes('|')) {
      return <React.Fragment key={i}>{part}</React.Fragment>;
    }

    const content = part.slice(2, -2);
    const pipeIdx = content.indexOf('|');
    if (pipeIdx === -1) return <React.Fragment key={i}>{part}</React.Fragment>;

    const meta = content.slice(0, pipeIdx);
    const label = content.slice(pipeIdx + 1);
    const metaMatch = meta.match(/^(проект|сервис|команда):([\w-]+)$/);
    if (!metaMatch) return <React.Fragment key={i}>{part}</React.Fragment>;

    const type = metaMatch[1] as AiLinkClickPayload['type'];
    const id = metaMatch[2];
    const isProject = type === 'проект';

    return (
      <button
        key={i}
        type="button"
        onClick={() => onLinkClick({ type, id, label })}
        className={`mx-1 px-3 py-1.5 rounded-lg text-[13px] font-bold transition-all inline-flex items-center gap-2 shadow-sm border whitespace-nowrap my-1 ${
          isProject
            ? 'bg-yellow-400/10 text-yellow-400 border-yellow-400/30 hover:bg-yellow-400 hover:text-black'
            : 'bg-sky-400/10 text-sky-300 border-sky-400/30 hover:bg-sky-500 hover:text-white'
        }`}
      >
        {isProject ? '🚀' : type === 'команда' ? '👥' : '🏛'} {label}
        <span className="opacity-50 text-[10px]">↗</span>
      </button>
    );
  });
}
