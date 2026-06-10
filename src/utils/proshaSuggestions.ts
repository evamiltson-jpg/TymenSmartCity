export type ProposalField = 'title' | 'description' | 'problem' | 'expected_result' | 'status';

export interface ProshaProposal {
  field: ProposalField;
  value: string;
  label: string;
}

const FIELD_LABELS: Record<ProposalField, string> = {
  title: 'Название',
  description: 'Описание',
  problem: 'Проблема',
  expected_result: 'Ожидаемый результат',
  status: 'Статус',
};

const PROPOSAL_RE = /\{\{предложение\|(title|description|problem|expected_result|status)\|([\s\S]*?)\}\}/g;

export function extractProposals(text: string): ProshaProposal[] {
  const items: ProshaProposal[] = [];
  let match: RegExpExecArray | null;
  const re = new RegExp(PROPOSAL_RE);
  while ((match = re.exec(text)) !== null) {
    const field = match[1] as ProposalField;
    items.push({
      field,
      value: match[2].trim(),
      label: FIELD_LABELS[field],
    });
  }
  return items;
}

const ANY_PROPOSAL_RE = /\{\{предложение\|[^}|]+\|[\s\S]*?\}\}/g;

export function stripProposals(text: string): string {
  return text.replace(ANY_PROPOSAL_RE, '').trim();
}

export function extractTimelineItems(text: string): { week: string; title: string }[] {
  const items: { week: string; title: string }[] = [];
  for (const line of text.split('\n')) {
    const trimmed = line.trim();
    const weekLine = trimmed.match(
      /^(?:[-•*]\s*)?недел[яи]\s*(\d+)\s*[-–—:]\s*(.+)$/i,
    );
    if (weekLine) {
      items.push({ week: weekLine[1], title: weekLine[2].trim() });
      continue;
    }
    const rangeLine = trimmed.match(
      /^(?:[-•*]\s*)?(\d+)\s*[-–]\s*(\d+)\s+недел[яи]?\s*[-–—:]\s*(.+)$/i,
    );
    if (rangeLine) {
      items.push({ week: `${rangeLine[1]}–${rangeLine[2]}`, title: rangeLine[3].trim() });
    }
  }
  return items.slice(0, 8);
}
