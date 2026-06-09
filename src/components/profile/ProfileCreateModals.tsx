import React, { useEffect, useMemo, useState } from 'react';
import { VACANCY_ROLE_PRESETS } from '../../constants/projectForm';
import {
  fetchUserTeams,
  type TeamCreatePayload,
  validateTeamPayload,
} from '../../services/projectService';

interface CreateProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (payload: { title: string; description: string; role: string }) => Promise<void>;
}

export const CreateProjectModal: React.FC<CreateProjectModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [role, setRole] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async () => {
    if (!title.trim()) {
      setError('Укажите название проекта');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await onSubmit({ title: title.trim(), description: description.trim(), role: role.trim() });
      setTitle('');
      setDescription('');
      setRole('');
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка создания проекта');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-[#122e41] border border-white/10 w-full max-w-lg rounded-[32px] p-8">
        <h3 className="text-xl font-bold text-white mb-6">Создать проект</h3>
        <div className="space-y-4">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Название проекта"
            className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-yellow-400"
          />
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Краткое описание"
            rows={4}
            className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-yellow-400 resize-none"
          />
          <input
            value={role}
            onChange={(e) => setRole(e.target.value)}
            placeholder="Ваша роль (например, Frontend)"
            className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-yellow-400"
          />
          {error && <p className="text-red-400 text-xs font-bold">{error}</p>}
        </div>
        <div className="flex gap-3 mt-8">
          <button
            onClick={onClose}
            className="flex-1 py-3 bg-white/5 hover:bg-white/10 text-white font-bold rounded-xl text-xs uppercase"
          >
            Отмена
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="flex-1 py-3 bg-yellow-400 hover:bg-yellow-500 disabled:opacity-50 text-black font-bold rounded-xl text-xs uppercase"
          >
            {saving ? 'Создание...' : 'Создать'}
          </button>
        </div>
      </div>
    </div>
  );
};

interface CreateTeamModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId?: string;
  onSubmit: (payload: TeamCreatePayload) => Promise<void>;
}

export const CreateTeamModal: React.FC<CreateTeamModalProps> = ({
  isOpen,
  onClose,
  userId,
  onSubmit,
}) => {
  const [teamName, setTeamName] = useState('');
  const [mission, setMission] = useState('');
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [lookingFor, setLookingFor] = useState('');
  const [existingTeams, setExistingTeams] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen || !userId) return;
    void fetchUserTeams(userId)
      .then((teams) => setExistingTeams(teams.map((team) => team.team_name)))
      .catch((loadError) => console.error('CreateTeamModal preload:', loadError));
  }, [isOpen, userId]);

  const nameConflict = useMemo(() => {
    const normalized = teamName.trim().toLowerCase();
    if (!normalized) return false;
    return existingTeams.some((name) => name.trim().toLowerCase() === normalized);
  }, [existingTeams, teamName]);

  if (!isOpen) return null;

  const toggleSkill = (skill: string) => {
    setSelectedSkills((prev) =>
      prev.includes(skill) ? prev.filter((item) => item !== skill) : [...prev, skill],
    );
  };

  const handleSubmit = async () => {
    const payload: TeamCreatePayload = {
      team_name: teamName.trim(),
      mission: mission.trim(),
      required_skills: selectedSkills,
      looking_for: lookingFor.trim() || undefined,
    };

    const validationError = validateTeamPayload(payload);
    if (validationError) {
      setError(validationError);
      return;
    }

    if (nameConflict) {
      setError('У вас уже есть команда с таким названием');
      return;
    }

    setSaving(true);
    setError('');
    try {
      await onSubmit(payload);
      setTeamName('');
      setMission('');
      setSelectedSkills([]);
      setLookingFor('');
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка создания команды');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-[#122e41] border border-white/10 w-full max-w-2xl rounded-[32px] p-8 max-h-[90vh] overflow-y-auto">
        <h3 className="text-xl font-bold text-white mb-2">Создать команду</h3>
        <p className="text-sm text-gray-400 mb-6">
          Укажите миссию и нужные роли — команда появится в профиле и будет доступна при создании проекта.
        </p>

        <div className="space-y-4">
          <input
            value={teamName}
            onChange={(e) => setTeamName(e.target.value)}
            maxLength={80}
            placeholder="Название команды"
            className={`w-full px-4 py-3 rounded-xl bg-white/5 border text-white text-sm focus:outline-none focus:border-yellow-400 ${
              nameConflict ? 'border-rose-500/60' : 'border-white/10'
            }`}
          />
          {nameConflict && <p className="text-xs text-rose-300">Команда с таким названием уже есть</p>}

          <textarea
            value={mission}
            onChange={(e) => setMission(e.target.value)}
            placeholder="Миссия и цели команды"
            rows={4}
            maxLength={2000}
            className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-yellow-400 resize-none"
          />

          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Нужные роли</p>
            <div className="flex flex-wrap gap-2">
              {VACANCY_ROLE_PRESETS.slice(0, 8).map((skill) => (
                <button
                  key={skill}
                  type="button"
                  onClick={() => toggleSkill(skill)}
                  className={`px-3 py-1.5 rounded-full text-xs transition-colors ${
                    selectedSkills.includes(skill)
                      ? 'bg-yellow-400 text-black font-bold'
                      : 'bg-white/5 text-gray-300 hover:bg-white/10'
                  }`}
                >
                  {skill}
                </button>
              ))}
            </div>
          </div>

          <input
            value={lookingFor}
            onChange={(e) => setLookingFor(e.target.value)}
            placeholder="Кого ищете? Например: backend-разработчик"
            className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-yellow-400"
          />

          {error && <p className="text-red-400 text-xs font-bold">{error}</p>}
        </div>

        <div className="flex gap-3 mt-8">
          <button
            onClick={onClose}
            className="flex-1 py-3 bg-white/5 hover:bg-white/10 text-white font-bold rounded-xl text-xs uppercase"
          >
            Отмена
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving || nameConflict}
            className="flex-1 py-3 bg-yellow-400 hover:bg-yellow-500 disabled:opacity-50 text-black font-bold rounded-xl text-xs uppercase"
          >
            {saving ? 'Создание...' : 'Создать'}
          </button>
        </div>
      </div>
    </div>
  );
};
