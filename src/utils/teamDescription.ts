export interface TeamCreatePayload {
  team_name: string;
  mission: string;
  linked_project?: string;
  linked_project_id?: string;
  required_skills: string[];
  looking_for?: string;
}

export const buildTeamDescription = (payload: TeamCreatePayload) => {
  const descriptionParts = [
    payload.mission.trim(),
    payload.linked_project?.trim() ? `Проект: ${payload.linked_project.trim()}` : '',
    payload.required_skills.length ? `Роли: ${payload.required_skills.join(', ')}` : '',
    payload.looking_for?.trim() ? `Вакансии: ${payload.looking_for.trim()}` : '',
  ].filter(Boolean);

  return descriptionParts.join('\n');
};

export const parseTeamDescription = (description: string) => {
  const lines = description.split('\n');
  const missionLines: string[] = [];
  let linked_project = '';
  let required_skills: string[] = [];
  let looking_for = '';

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    if (trimmed.startsWith('Проект: ')) {
      linked_project = trimmed.slice(8).trim();
      continue;
    }

    if (trimmed.startsWith('Навыки: ') || trimmed.startsWith('Роли: ')) {
      const prefix = trimmed.startsWith('Навыки: ') ? 'Навыки: ' : 'Роли: ';
      required_skills = trimmed
        .slice(prefix.length)
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);
      continue;
    }

    if (trimmed.startsWith('Ищем: ') || trimmed.startsWith('Вакансии: ')) {
      const prefix = trimmed.startsWith('Ищем: ') ? 'Ищем: ' : 'Вакансии: ';
      looking_for = trimmed.slice(prefix.length).trim();
      continue;
    }

    missionLines.push(trimmed);
  }

  return {
    mission: missionLines.join('\n'),
    linked_project,
    required_skills,
    looking_for,
  };
};
