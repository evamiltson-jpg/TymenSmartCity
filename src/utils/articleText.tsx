import React from 'react';

const BOILERPLATE_MARKERS = [
  'Комментарии не найдены',
  'Подпишитесь на рассылку',
  'Оставить комментарий',
  'Читать оригинал',
];

export function normalizeArticleText(text: string): string {
  if (!text) return '';

  let normalized = text.replace(/\r\n?/g, '\n').replace(/\u00a0/g, ' ');

  for (const marker of BOILERPLATE_MARKERS) {
    const index = normalized.indexOf(marker);
    if (index > 0) {
      normalized = normalized.slice(0, index);
    }
  }

  normalized = normalized.replace(/[ \t]+\n/g, '\n');
  normalized = normalized.replace(/\n[ \t]+/g, '\n');
  normalized = normalized.replace(/\n{3,}/g, '\n\n');

  if (!normalized.includes('\n\n') && normalized.length > 280) {
    normalized = normalized.replace(/(?<=[.!?…])\s+(?=[А-ЯA-Z«""])/g, '\n\n');
  }

  return normalized.trim();
}

export function splitArticleParagraphs(text: string): string[] {
  return normalizeArticleText(text)
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.replace(/\n/g, ' ').trim())
    .filter((paragraph) => paragraph.length > 0);
}

interface ArticleBodyProps {
  text: string;
  className?: string;
}

export const ArticleBody: React.FC<ArticleBodyProps> = ({ text, className = '' }) => {
  const paragraphs = splitArticleParagraphs(text);

  if (paragraphs.length === 0) {
    return <p className={`text-gray-400 ${className}`}>Текст недоступен.</p>;
  }

  return (
    <div className={`space-y-5 ${className}`}>
      {paragraphs.map((paragraph, index) => (
        <p key={index} className="text-gray-300 leading-relaxed text-base">
          {paragraph}
        </p>
      ))}
    </div>
  );
};
