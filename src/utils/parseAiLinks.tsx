import React from 'react';

const LINK_PATTERN =
  /(\[\[(?:проект|сервис|команда|раздел|событие):[\w-]+\|.+?\]\])/g;

export type AiLinkType = 'проект' | 'сервис' | 'команда' | 'раздел' | 'событие';

export interface AiLinkClickPayload {
  type: AiLinkType;
  id: string;
  label: string;
}

interface ParseAiLinksOptions {
  onLinkClick: (payload: AiLinkClickPayload) => void;
}

const linkStyle = (type: AiLinkType) => {
  if (type === 'проект') {
    return 'bg-yellow-400/10 text-yellow-400 border-yellow-400/30 hover:bg-yellow-400 hover:text-black';
  }
  if (type === 'раздел') {
    return 'bg-emerald-400/10 text-emerald-300 border-emerald-400/30 hover:bg-emerald-400 hover:text-black';
  }
  if (type === 'событие') {
    return 'bg-violet-400/10 text-violet-300 border-violet-400/30 hover:bg-violet-500 hover:text-white';
  }
  if (type === 'команда') {
    return 'bg-orange-400/10 text-orange-300 border-orange-400/30 hover:bg-orange-400 hover:text-black';
  }
  return 'bg-sky-400/10 text-sky-300 border-sky-400/30 hover:bg-sky-500 hover:text-white';
};

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
    const metaMatch = meta.match(/^(проект|сервис|команда|раздел|событие):([\w-]+)$/);
    if (!metaMatch) return <React.Fragment key={i}>{part}</React.Fragment>;

    const type = metaMatch[1] as AiLinkType;
    const id = metaMatch[2];

    return (
      <button
        key={i}
        type="button"
        onClick={() => onLinkClick({ type, id, label })}
        className={`mx-1 my-1 inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg border px-3 py-1.5 text-[13px] font-bold shadow-sm transition-all ${linkStyle(type)}`}
      >
        {label}
        <span className="text-[10px] opacity-50">↗</span>
      </button>
    );
  });
}
