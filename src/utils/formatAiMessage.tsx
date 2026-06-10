import React from 'react';
import { parseAiLinks, type ParseAiLinksOptions } from './parseAiLinks';

const LINK_PATTERN =
  /(\[\[(?:проект|сервис|команда|раздел|событие):[\w-]+\|.+?\]\])/g;

const LIST_LINE_RE = /^[*\-•]\s+(.+)$/;

function formatPlainBlock(text: string, keyPrefix: string): React.ReactNode {
  const lines = text.split('\n');
  const nodes: React.ReactNode[] = [];
  let listItems: string[] = [];
  let blockIdx = 0;

  const flushList = () => {
    if (!listItems.length) return;
    nodes.push(
      <ul key={`${keyPrefix}-ul-${blockIdx++}`} className="my-2 list-disc space-y-1 pl-5">
        {listItems.map((item, li) => (
          <li key={li}>{item}</li>
        ))}
      </ul>,
    );
    listItems = [];
  };

  for (const line of lines) {
    const trimmed = line.trimEnd();
    if (!trimmed) {
      flushList();
      continue;
    }

    const listMatch = trimmed.match(LIST_LINE_RE);
    if (listMatch) {
      listItems.push(listMatch[1]);
      continue;
    }

    flushList();
    nodes.push(
      <p key={`${keyPrefix}-p-${blockIdx++}`} className="mb-2 last:mb-0">
        {trimmed}
      </p>,
    );
  }

  flushList();

  if (!nodes.length) return null;
  if (nodes.length === 1) return nodes[0];
  return <>{nodes}</>;
}

/** Текст с маркерами списков (* / -) и абзацами + кликабельные ссылки */
export function renderAiMessage(text: string, linkOptions: ParseAiLinksOptions): React.ReactNode {
  const cleanText = text.replace(/\*\*/g, '');
  const parts = cleanText.split(LINK_PATTERN);

  return parts.map((part, i) => {
    if (part.startsWith('[[') && part.includes('|')) {
      const linkNodes = parseAiLinks(part, linkOptions);
      return <React.Fragment key={i}>{linkNodes}</React.Fragment>;
    }

    if (!part) return null;

    const formatted = formatPlainBlock(part, `part-${i}`);
    return formatted ? <React.Fragment key={i}>{formatted}</React.Fragment> : null;
  });
}
