import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { VACANCY_ROLE_PRESETS } from '../constants/projectForm';
import {
  createProjectTeam,
  fetchMySubmittedProjects,
  fetchUserTeams,
  formatProjectError,
  type SubmittedProject,
  type TeamCreatePayload,
  validateTeamPayload,
} from '../services/projectService';

const inputClass =
  'w-full bg-[#0b2234] border border-white/10 rounded-lg px-4 py-3 text-white focus:border-yellow-500 outline-none transition-all';
const textareaClass = `${inputClass} resize-none`;

const FormSection: React.FC<{ title: string; children: React.ReactNode; required?: boolean; hint?: string }> = ({
  title,
  children,
  required,
  hint,
}) => (
  <div className="mb-8">
    <label className="text-white font-bold text-sm mb-2 block">
      {title}
      {required && <span className="text-red-500 ml-1">*</span>}
    </label>
    {hint && <p className="text-xs text-gray-500 mb-2">{hint}</p>}
    {children}
  </div>
);

interface ProjectTeamCreateFormProps {
  onTeamCreated?: (teamName: string) => void;
  onNavigate?: (page: string) => void;
}

export const ProjectTeamCreateForm: React.FC<ProjectTeamCreateFormProps> = ({
  onTeamCreated,
  onNavigate,
}) => {
  const { user, isAuthenticated } = useAuth();
  const [teamName, setTeamName] = useState('');
  const [linkedProjectId, setLinkedProjectId] = useState('');
  const [linkedProjectTitle, setLinkedProjectTitle] = useState('');
  const [mission, setMission] = useState('');
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [customSkill, setCustomSkill] = useState('');
  const [lookingFor, setLookingFor] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successTeamName, setSuccessTeamName] = useState('');
  const [myProjects, setMyProjects] = useState<SubmittedProject[]>([]);
  const [existingTeams, setExistingTeams] = useState<string[]>([]);

  useEffect(() => {
    if (!user) return;

    void Promise.all([fetchMySubmittedProjects(user.id), fetchUserTeams(user.id)])
      .then(([projects, teams]) => {
        setMyProjects(projects);
        setExistingTeams(teams.map((team) => team.team_name));
      })
      .catch((loadError) => console.error('Team form preload:', loadError));
  }, [user]);

  const nameConflict = useMemo(() => {
    const normalized = teamName.trim().toLowerCase();
    if (!normalized) return false;
    return existingTeams.some((name) => name.trim().toLowerCase() === normalized);
  }, [existingTeams, teamName]);

  const toggleSkill = (skill: string) => {
    setSelectedSkills((prev) =>
      prev.includes(skill) ? prev.filter((item) => item !== skill) : [...prev, skill],
    );
  };

  const removeSkill = (skill: string) => {
    setSelectedSkills((prev) => prev.filter((item) => item !== skill));
  };

  const addCustomSkill = () => {
    const value = customSkill.trim();
    if (!value || selectedSkills.includes(value)) return;
    setSelectedSkills((prev) => [...prev, value]);
    setCustomSkill('');
  };

  const resetForm = () => {
    setTeamName('');
    setLinkedProjectId('');
    setLinkedProjectTitle('');
    setMission('');
    setSelectedSkills([]);
    setCustomSkill('');
    setLookingFor('');
    setError('');
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');

    if (!isAuthenticated || !user) {
      setError('Войдите в аккаунт, чтобы создать команду.');
      return;
    }

    const payload: TeamCreatePayload = {
      team_name: teamName.trim(),
      mission: mission.trim(),
      linked_project: linkedProjectTitle.trim() || undefined,
      linked_project_id: linkedProjectId || undefined,
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

    setLoading(true);
    try {
      await createProjectTeam(user.id, payload);
      setSuccessTeamName(payload.team_name);
      setExistingTeams((prev) => [...prev, payload.team_name]);
      resetForm();
      onTeamCreated?.(payload.team_name);
    } catch (submitError) {
      setError(formatProjectError(submitError));
    } finally {
      setLoading(false);
    }
  };

  if (successTeamName) {
    return (
      <div className="bg-[#122e41] rounded-[32px] p-8 md:p-12 border border-emerald-500/20 animate-in fade-in duration-500">
        <div className="max-w-2xl mx-auto text-center">
          <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-400 text-2xl mb-5 mx-auto">
            ✓
          </div>
          <h2 className="text-2xl font-bold text-white mb-3">Команда «{successTeamName}» создана</h2>
          <p className="text-sm text-gray-400 mb-8 leading-relaxed">
            Команда появилась в вашем профиле. Теперь её можно выбрать при создании проекта на вкладке
            «Создать проект».
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <button
              type="button"
              onClick={() => setSuccessTeamName('')}
              className="px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl font-bold text-sm"
            >
              Создать ещё одну
            </button>
            <button
              type="button"
              onClick={() => onTeamCreated?.(successTeamName)}
              className="px-6 py-3 bg-yellow-400 hover:bg-yellow-500 text-black rounded-xl font-bold text-sm"
            >
              Перейти к созданию проекта
            </button>
            {onNavigate && (
              <button
                type="button"
                onClick={() => onNavigate('profile')}
                className="px-6 py-3 text-yellow-400 border border-yellow-500/30 rounded-xl font-bold text-sm"
              >
                Открыть профиль
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#122e41] rounded-[32px] p-8 md:p-12 border border-white/5 animate-in fade-in duration-500">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-white mb-2">Создание проектной команды</h2>
        <p className="text-gray-400 text-sm">
          Соберите команду заранее — потом её можно привязать к проекту на вкладке «Создать проект».
        </p>
      </div>

      {!isAuthenticated && (
        <div className="mb-8 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-5 text-sm text-amber-100">
          <p className="font-bold mb-2">Требуется вход в аккаунт</p>
          <p className="text-amber-100/80 mb-4">
            Авторизуйтесь, чтобы создать команду и управлять ей в личном кабинете.
          </p>
          {onNavigate && (
            <button
              type="button"
              onClick={() => onNavigate('profile')}
              className="px-5 py-2.5 bg-yellow-400 hover:bg-yellow-500 text-black rounded-xl font-bold text-xs uppercase"
            >
              Войти в профиль
            </button>
          )}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
          <FormSection title="Название команды" required hint="От 2 до 80 символов. Должно быть уникальным среди ваших команд.">
            <input
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              type="text"
              maxLength={80}
              placeholder="Например: EcoWarriors"
              className={`${inputClass} ${nameConflict ? 'border-rose-500/60' : ''}`}
              disabled={!isAuthenticated}
            />
            {nameConflict && (
              <p className="text-xs text-rose-300 mt-2">Команда с таким названием уже есть в вашем профиле</p>
            )}
          </FormSection>

          <FormSection title="Связанный проект" hint="Выберите один из ваших проектов или оставьте поле пустым.">
            <select
              value={linkedProjectId}
              onChange={(e) => {
                const nextId = e.target.value;
                setLinkedProjectId(nextId);
                const project = myProjects.find((item) => item.id === nextId);
                setLinkedProjectTitle(project?.title || '');
              }}
              className={inputClass}
              disabled={!isAuthenticated}
            >
              <option value="">Без привязки к проекту</option>
              {myProjects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.title}
                </option>
              ))}
            </select>
            {isAuthenticated && myProjects.length === 0 && (
              <p className="text-xs text-gray-500 mt-2">
                У вас пока нет проектов. Можно создать команду сейчас и привязать проект позже.
              </p>
            )}
          </FormSection>
        </div>

        <FormSection title="Миссия и цели" required hint="Минимум 10 символов. Опишите задачу, цель и ожидаемый результат.">
          <textarea
            rows={4}
            value={mission}
            onChange={(e) => setMission(e.target.value)}
            maxLength={2000}
            placeholder="Над чем работает команда и какой результат хотите получить"
            className={textareaClass}
            disabled={!isAuthenticated}
          />
          <p className="text-xs text-gray-500 mt-2 text-right">{mission.length}/2000</p>
        </FormSection>

        <FormSection
          title="Состав команды (роли)"
          hint="Отметьте специалистов, которые уже есть в команде или планируются в ближайшее время."
        >
          <div className="rounded-xl border border-white/10 bg-[#0b2234]/70 p-4">
          <div className="flex flex-wrap gap-2 mb-3">
            {VACANCY_ROLE_PRESETS.map((skill) => (
              <button
                key={skill}
                type="button"
                onClick={() => toggleSkill(skill)}
                disabled={!isAuthenticated}
                className={`px-4 py-2 rounded-full text-sm transition-colors disabled:opacity-50 ${
                  selectedSkills.includes(skill)
                    ? 'bg-yellow-500 text-black font-bold'
                    : 'bg-black/40 text-gray-300 hover:bg-black/60 hover:text-white'
                }`}
              >
                {skill}
              </button>
            ))}
          </div>

          {selectedSkills.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-3">
              {selectedSkills.map((skill) => (
                <span
                  key={skill}
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-yellow-400/10 border border-yellow-400/30 text-yellow-100 text-xs"
                >
                  {skill}
                  <button
                    type="button"
                    onClick={() => removeSkill(skill)}
                    className="text-yellow-200 hover:text-white"
                    aria-label={`Удалить ${skill}`}
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}

          <div className="flex gap-2">
            <input
              value={customSkill}
              onChange={(e) => setCustomSkill(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addCustomSkill();
                }
              }}
              type="text"
              placeholder="Свой навык или роль"
              className={inputClass}
              disabled={!isAuthenticated}
            />
            <button
              type="button"
              onClick={addCustomSkill}
              disabled={!isAuthenticated}
              className="shrink-0 px-4 py-2 rounded-lg text-yellow-400 border border-yellow-500/30 text-sm disabled:opacity-50"
            >
              Добавить роль
            </button>
          </div>
          </div>
        </FormSection>

        <FormSection
          title="Открытые вакансии"
          hint="Опишите, кого хотите пригласить в команду: количество людей, уровень и условия участия."
        >
          <div className="rounded-xl border border-sky-500/20 bg-sky-500/5 p-4">
            <textarea
              value={lookingFor}
              onChange={(e) => setLookingFor(e.target.value)}
              rows={4}
              placeholder="Например: ищем 2 frontend-разработчиков (React, от 1 года опыта). Готовы взять студентов на стажировку."
              className={textareaClass}
              disabled={!isAuthenticated}
            />
          </div>
        </FormSection>

        {error && (
          <div className="mb-6 rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-100">
            {error}
          </div>
        )}

        <div className="flex justify-end mt-8 pt-8 border-t border-white/10">
          <button
            type="submit"
            disabled={loading || !isAuthenticated || nameConflict}
            className="bg-yellow-500 text-black font-bold py-3 px-8 rounded-lg hover:bg-yellow-600 transition-colors disabled:opacity-50"
          >
            {loading ? 'Создание...' : 'Создать команду'}
          </button>
        </div>
      </form>
    </div>
  );
};
