import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { VACANCY_ROLE_PRESETS } from '../constants/projectForm';
import { createProjectTeam, formatProjectError } from '../services/projectService';

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

export const ProjectTeamCreateForm: React.FC = () => {
  const { user, isAuthenticated } = useAuth();
  const [teamName, setTeamName] = useState('');
  const [linkedProject, setLinkedProject] = useState('');
  const [mission, setMission] = useState('');
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [customSkill, setCustomSkill] = useState('');
  const [lookingFor, setLookingFor] = useState('');
  const [loading, setLoading] = useState(false);

  const toggleSkill = (skill: string) => {
    setSelectedSkills((prev) =>
      prev.includes(skill) ? prev.filter((item) => item !== skill) : [...prev, skill],
    );
  };

  const addCustomSkill = () => {
    const value = customSkill.trim();
    if (!value || selectedSkills.includes(value)) return;
    setSelectedSkills((prev) => [...prev, value]);
    setCustomSkill('');
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!isAuthenticated || !user) {
      alert('Войдите в аккаунт, чтобы создать команду.');
      return;
    }

    if (!teamName.trim() || !mission.trim()) {
      alert('Укажите название команды и миссию.');
      return;
    }

    setLoading(true);
    try {
      await createProjectTeam(user.id, {
        team_name: teamName.trim(),
        mission: mission.trim(),
        linked_project: linkedProject.trim(),
        required_skills: selectedSkills,
        looking_for: lookingFor.trim(),
      });

      alert('Команда успешно создана! Она появится в вашем профиле и её можно выбрать при создании проекта.');
      setTeamName('');
      setLinkedProject('');
      setMission('');
      setSelectedSkills([]);
      setLookingFor('');
    } catch (error) {
      alert(`Ошибка: ${formatProjectError(error)}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-[#122e41] rounded-[32px] p-8 md:p-12 border border-white/5 animate-in fade-in duration-500">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-white mb-2">Создание проектной команды</h2>
        <p className="text-gray-400 text-sm">
          Соберите команду заранее — потом её можно привязать к проекту на вкладке «Создание проектов».
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
          <FormSection title="Название команды" required>
            <input
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              type="text"
              placeholder="Например: EcoWarriors"
              className={inputClass}
            />
          </FormSection>

          <FormSection title="Связанный проект" hint="Необязательно. Можно указать позже.">
            <input
              value={linkedProject}
              onChange={(e) => setLinkedProject(e.target.value)}
              type="text"
              placeholder="Название проекта команды"
              className={inputClass}
            />
          </FormSection>
        </div>

        <FormSection title="Миссия и цели" required>
          <textarea
            rows={4}
            value={mission}
            onChange={(e) => setMission(e.target.value)}
            placeholder="Над чем работает команда и какой результат хотите получить"
            className={textareaClass}
          />
        </FormSection>

        <FormSection title="Требуемые роли и навыки">
          <div className="flex flex-wrap gap-2 mb-3">
            {VACANCY_ROLE_PRESETS.map((skill) => (
              <button
                key={skill}
                type="button"
                onClick={() => toggleSkill(skill)}
                className={`px-4 py-2 rounded-full text-sm transition-colors ${
                  selectedSkills.includes(skill)
                    ? 'bg-yellow-500 text-black font-bold'
                    : 'bg-black/40 text-gray-300 hover:bg-black/60 hover:text-white'
                }`}
              >
                {skill}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              value={customSkill}
              onChange={(e) => setCustomSkill(e.target.value)}
              type="text"
              placeholder="Свой навык или роль"
              className={inputClass}
            />
            <button
              type="button"
              onClick={addCustomSkill}
              className="shrink-0 px-4 py-2 rounded-lg text-yellow-400 border border-yellow-500/30 text-sm"
            >
              Добавить
            </button>
          </div>
        </FormSection>

        <FormSection title="Кого мы ищем?">
          <input
            value={lookingFor}
            onChange={(e) => setLookingFor(e.target.value)}
            type="text"
            placeholder="Например: 2 frontend-разработчика с опытом React"
            className={inputClass}
          />
        </FormSection>

        <div className="flex justify-end mt-8 pt-8 border-t border-white/10">
          <button
            type="submit"
            disabled={loading}
            className="bg-yellow-500 text-black font-bold py-3 px-8 rounded-lg hover:bg-yellow-600 transition-colors disabled:opacity-50"
          >
            {loading ? 'Создание...' : 'Создать команду'}
          </button>
        </div>
      </form>
    </div>
  );
};
