import React, { useEffect, useRef, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import {
  PROJECT_DIRECTIONS,
  PROJECT_STATUSES,
  TASKS_BY_DIRECTION,
  TECHNOLOGY_PRESETS,
  VACANCY_ROLE_PRESETS,
} from '../constants/projectForm';
import { EconomicEffectCalculator } from './EconomicEffectCalculator';
import { FieldHint } from './FieldHint';
import { TagMultiSelect } from './TagMultiSelect';
import {
  attachProjectImage,
  createProject,
  invalidateProjectsCache,
  invalidateSubmittedProjectsCache,
  formatProjectError,
  fetchUserTeams,
  LOCAL_PROJECT_IMAGE,
  type UserTeamOption,
} from '../services/projectService';

const inputClass =
  'w-full bg-[#0b2234] border border-white/10 rounded-lg px-4 py-3 text-white focus:border-yellow-500 outline-none transition-all';
const textareaClass = `${inputClass} resize-none`;

const FormField: React.FC<{
  label: string;
  required?: boolean;
  hint?: string;
  children: React.ReactNode;
}> = ({ label, required, hint, children }) => (
  <div className="mb-6">
    <div className="flex flex-wrap items-center gap-3 mb-2">
      <label className="text-white font-bold text-sm">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      {hint && <FieldHint text={hint} />}
    </div>
    {children}
  </div>
);

export const ProjectCreateForm: React.FC = () => {
  const { user, userProfile, isAuthenticated } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const submitLockRef = useRef(false);

  const [loading, setLoading] = useState(false);
  const [loadingStage, setLoadingStage] = useState('');
  const [teams, setTeams] = useState<UserTeamOption[]>([]);
  const [showTeamPicker, setShowTeamPicker] = useState(false);
  const [showCalculator, setShowCalculator] = useState(false);

  const [authorName, setAuthorName] = useState('');
  const [coAuthors, setCoAuthors] = useState<string[]>([]);
  const [coAuthorInput, setCoAuthorInput] = useState('');
  const [projectStatus, setProjectStatus] = useState('Идея');
  const [title, setTitle] = useState('');
  const [problem, setProblem] = useState('');
  const [description, setDescription] = useState('');
  const [expectedResult, setExpectedResult] = useState('');
  const [direction, setDirection] = useState('');
  const [customDirection, setCustomDirection] = useState('');
  const [task, setTask] = useState('');
  const [customTask, setCustomTask] = useState('');
  const [technologies, setTechnologies] = useState<string[]>([]);
  const [lookingForTeam, setLookingForTeam] = useState(false);
  const [neededRoles, setNeededRoles] = useState<string[]>([]);
  const [vacancyNote, setVacancyNote] = useState('');
  const [economicEffect, setEconomicEffect] = useState('');
  const [note, setNote] = useState('');
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [selectedTeamName, setSelectedTeamName] = useState('');
  const [ratingEnabled, setRatingEnabled] = useState(true);
  const [imagePreview, setImagePreview] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);

  useEffect(() => {
    setAuthorName(userProfile?.full_name?.trim() || user?.email || '');
  }, [user, userProfile]);

  useEffect(() => {
    if (!user?.id) return;
    fetchUserTeams(user.id)
      .then(setTeams)
      .catch((error) => console.error('Не удалось загрузить команды:', error));
  }, [user?.id]);

  const availableTasks = direction && direction !== 'Другое' ? TASKS_BY_DIRECTION[direction] || [] : [];
  const resolvedDirection = direction === 'Другое' ? customDirection.trim() : direction;
  const resolvedTask = task === 'Другое' ? customTask.trim() : task;

  const addCoAuthor = () => {
    const value = coAuthorInput.trim();
    if (!value || coAuthors.includes(value)) return;
    setCoAuthors((prev) => [...prev, value]);
    setCoAuthorInput('');
  };

  const removeCoAuthor = (name: string) => {
    setCoAuthors((prev) => prev.filter((item) => item !== name));
  };

  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const resetForm = () => {
    setTitle('');
    setProblem('');
    setDescription('');
    setExpectedResult('');
    setDirection('');
    setCustomDirection('');
    setTask('');
    setCustomTask('');
    setTechnologies([]);
    setLookingForTeam(false);
    setNeededRoles([]);
    setVacancyNote('');
    setEconomicEffect('');
    setNote('');
    setCoAuthors([]);
    setCoAuthorInput('');
    setProjectStatus('Идея');
    setSelectedTeamId(null);
    setSelectedTeamName('');
    setRatingEnabled(true);
    setImageFile(null);
    setImagePreview('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (submitLockRef.current || loading) return;

    if (!isAuthenticated || !user) {
      alert('Войдите в аккаунт, чтобы создать проект.');
      return;
    }

    if (!title.trim() || !problem.trim() || !description.trim() || !expectedResult.trim() || !direction) {
      alert('Заполните обязательные поля, отмеченные *');
      return;
    }

    if (direction === 'Другое' && !customDirection.trim()) {
      alert('Укажите своё направление проекта.');
      return;
    }

    if (description.trim().length < 100) {
      alert('Описание идеи должно содержать минимум 100 символов.');
      return;
    }

    submitLockRef.current = true;
    setLoading(true);
    const clientRequestId = crypto.randomUUID();
    let imageWarning = '';
    const pendingImage = imageFile;

    try {
      setLoadingStage('Сохранение проекта...');
      const created = await createProject({
        created_by: user.id,
        title: title.trim(),
        problem: problem.trim(),
        description: description.trim(),
        expected_result: expectedResult.trim(),
        direction: resolvedDirection,
        custom_direction: direction === 'Другое' ? customDirection.trim() : null,
        task: resolvedTask || null,
        custom_task: task === 'Другое' ? customTask.trim() : null,
        economic_effect: economicEffect ? Number(economicEffect) : null,
        note: note.trim() || null,
        category: resolvedDirection,
        author_name: authorName.trim() || user.email,
        co_authors: coAuthors,
        ready_to_implement: projectStatus === 'Готов к внедрению' || projectStatus === 'Внедрён',
        team_id: selectedTeamId,
        team_name: selectedTeamName || authorName.trim() || 'Частная инициатива',
        rating_enabled: ratingEnabled,
        image_url: LOCAL_PROJECT_IMAGE,
        status: projectStatus,
        technologies,
        looking_for_team: lookingForTeam,
        needed_roles: lookingForTeam ? neededRoles : [],
        vacancy_note: lookingForTeam ? vacancyNote.trim() || null : null,
      }, clientRequestId);

      invalidateProjectsCache();
      invalidateSubmittedProjectsCache(user.id);

      if (pendingImage) {
        try {
          setLoadingStage('Загрузка обложки...');
          await attachProjectImage(created.id, user.id, pendingImage);
        } catch (uploadError) {
          imageWarning = formatProjectError(uploadError);
        }
      }

      if (imageWarning) {
        alert(
          `Проект принят и отправлен на модерацию.\nОн появится в портфолио примерно через 1 час.\n\nОбложку загрузить не удалось: ${imageWarning}\n\nПроект уже в личном кабинете — обновите страницу профиля.`,
        );
      } else {
        alert(
          'Проект принят!\n\nСтатус: «На модерации». Он появится в портфолио примерно через 1 час. Следите за статусом в личном кабинете.',
        );
      }
      resetForm();
    } catch (err: unknown) {
      alert(`Ошибка при создании: ${formatProjectError(err)}`);
    } finally {
      setLoading(false);
      setLoadingStage('');
      submitLockRef.current = false;
    }
  };

  return (
    <div className="bg-[#122e41] rounded-[32px] p-8 md:p-12 border border-white/5 animate-in fade-in duration-500">
      <form onSubmit={handleSubmit}>
        <FormField label="Аватар проекта" hint="Обложка отображается в ленте проектов. Большие файлы автоматически сжимаются перед загрузкой.">
          <div className="flex items-center gap-4">
            <div className="w-24 h-24 rounded-2xl overflow-hidden bg-[#0b2234] border border-white/10 flex items-center justify-center">
              {imagePreview ? (
                <img src={imagePreview} alt="" className="w-full h-full object-cover" />
              ) : (
                <span className="text-gray-500 text-xs text-center px-2">Нет изображения</span>
              )}
            </div>
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={handleImageChange}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-2 rounded-lg bg-white/5 text-white text-sm hover:bg-white/10"
              >
                Загрузить обложку
              </button>
              <p className="text-xs text-gray-500 mt-2">JPG, PNG или WebP, до 3 МБ</p>
            </div>
          </div>
        </FormField>

        <FormField label="Статус проекта" required hint="Выберите текущую стадию — цветной индикатор будет виден в карточке проекта.">
          <div className="flex flex-wrap gap-3">
            {PROJECT_STATUSES.map((status) => (
              <button
                key={status.value}
                type="button"
                onClick={() => setProjectStatus(status.value)}
                title={status.hint}
                className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold border transition-all ${
                  projectStatus === status.value
                    ? `${status.color} ring-2`
                    : 'bg-white/5 text-gray-300 border-white/10 hover:bg-white/10'
                }`}
              >
                <span className={`w-2.5 h-2.5 rounded-full ${status.dot}`} />
                {status.label}
              </button>
            ))}
          </div>
          <p className="text-xs text-gray-500 mt-2">
            {PROJECT_STATUSES.find((item) => item.value === projectStatus)?.hint}
          </p>
        </FormField>

        <FormField label="Автор идеи" required>
          <div className="flex flex-wrap gap-2 mb-3">
            {authorName && (
              <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-yellow-500/20 text-yellow-300 text-sm border border-yellow-500/30">
                {authorName}
              </span>
            )}
            {coAuthors.map((name) => (
              <span
                key={name}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 text-gray-200 text-sm border border-white/10"
              >
                {name}
                <button type="button" onClick={() => removeCoAuthor(name)} className="text-gray-400 hover:text-white">
                  ×
                </button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              value={coAuthorInput}
              onChange={(e) => setCoAuthorInput(e.target.value)}
              type="text"
              placeholder="ФИО соавтора"
              className={inputClass}
            />
            <button
              type="button"
              onClick={addCoAuthor}
              className="shrink-0 px-4 py-2 rounded-lg text-yellow-400 hover:text-white text-sm border border-yellow-500/30"
            >
              + Добавить соавтора
            </button>
          </div>
        </FormField>

        <FormField label="Команда" hint="Привяжите проект к уже созданной команде из профиля. Если команды нет — можно добавить позже.">
          <div className="space-y-3">
            {selectedTeamName ? (
              <div className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-white">
                {selectedTeamName}
                <button
                  type="button"
                  onClick={() => {
                    setSelectedTeamId(null);
                    setSelectedTeamName('');
                  }}
                  className="text-gray-400 hover:text-white"
                >
                  ×
                </button>
              </div>
            ) : (
              <p className="text-sm text-gray-500">Команда не выбрана</p>
            )}
            <button
              type="button"
              onClick={() => setShowTeamPicker((value) => !value)}
              className="text-yellow-400 hover:text-white text-sm font-medium"
            >
              + Добавить команду
            </button>
            {showTeamPicker && (
              <div className="rounded-xl border border-white/10 bg-[#0b2234] p-3 space-y-2">
                {teams.length === 0 ? (
                  <p className="text-sm text-gray-400">
                    У вас пока нет команд. Создайте команду в профиле или во вкладке «Создание проектной команды».
                  </p>
                ) : (
                  teams.map((team) => (
                    <button
                      key={team.team_id}
                      type="button"
                      onClick={() => {
                        setSelectedTeamId(team.team_id);
                        setSelectedTeamName(team.team_name);
                        setShowTeamPicker(false);
                      }}
                      className="w-full text-left px-3 py-2 rounded-lg hover:bg-white/5 text-white text-sm"
                    >
                      {team.team_name}
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
        </FormField>

        <FormField label="Название идеи" required>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            type="text"
            placeholder="Лаконичное наименование вашей идеи"
            className={inputClass}
          />
        </FormField>

        <FormField label="Решаемая проблема" required>
          <textarea
            rows={4}
            value={problem}
            onChange={(e) => setProblem(e.target.value)}
            placeholder="Какая проблема будет решена после реализации вашей идеи?"
            className={textareaClass}
          />
        </FormField>

        <FormField label="Описание идеи" required>
          <textarea
            rows={5}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Подробное описание идеи"
            className={textareaClass}
          />
          <p className="text-xs text-gray-500 mt-2">Минимум 100 символов. Сейчас: {description.length}</p>
        </FormField>

        <FormField label="Ожидаемый результат" required>
          <textarea
            rows={4}
            value={expectedResult}
            onChange={(e) => setExpectedResult(e.target.value)}
            placeholder="Ожидаемый результат"
            className={textareaClass}
          />
        </FormField>

        <TagMultiSelect
          label="Технологии проекта"
          hint="стек, инструменты, платформы"
          placeholder="Например: Vue, PostgreSQL, Telegram Bot..."
          presets={TECHNOLOGY_PRESETS}
          values={technologies}
          onChange={setTechnologies}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            label="Направление"
            required
            hint="Основная сфера проекта: цифровизация, экология, образование и др. Если нет подходящего — выберите «Другое»."
          >
            <select
              value={direction}
              onChange={(e) => {
                setDirection(e.target.value);
                setTask('');
                setCustomTask('');
              }}
              className={inputClass}
            >
              <option value="">Выберите направление</option>
              {PROJECT_DIRECTIONS.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
            {direction === 'Другое' && (
              <input
                value={customDirection}
                onChange={(e) => setCustomDirection(e.target.value)}
                type="text"
                placeholder="Укажите своё направление"
                className={`${inputClass} mt-3`}
              />
            )}
          </FormField>

          <FormField
            label="Задача"
            hint="Уточните тип работ внутри направления: приложение, исследование, сервис и т.д."
          >
            <select
              value={task}
              onChange={(e) => setTask(e.target.value)}
              className={inputClass}
              disabled={!direction || direction === 'Другое'}
            >
              <option value="">Выберите задачу</option>
              {availableTasks.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
            {task === 'Другое' && (
              <input
                value={customTask}
                onChange={(e) => setCustomTask(e.target.value)}
                type="text"
                placeholder="Опишите задачу своими словами"
                className={`${inputClass} mt-3`}
              />
            )}
          </FormField>
        </div>

        <FormField
          label="Экономический эффект"
          hint="Примерная оценка в рублях за период проекта. Можно посчитать в калькуляторе — результат ориентировочный."
        >
          <div className="flex gap-2">
            <div className="relative flex-1">
              <input
                value={economicEffect}
                onChange={(e) => setEconomicEffect(e.target.value.replace(/[^\d]/g, ''))}
                type="text"
                placeholder="0"
                className={inputClass}
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400">₽</span>
            </div>
            <button
              type="button"
              onClick={() => setShowCalculator(true)}
              title="Открыть калькулятор"
              className="shrink-0 px-4 h-12 rounded-lg bg-yellow-500/20 border border-yellow-500/40 text-yellow-300 hover:bg-yellow-500/30 text-sm font-semibold"
            >
              🧮 Калькулятор
            </button>
          </div>
        </FormField>

        <div className="mb-6 rounded-xl border border-white/10 bg-[#0b2234] p-4 space-y-4">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={lookingForTeam}
              onChange={(e) => setLookingForTeam(e.target.checked)}
              className="mt-1 rounded border-white/20"
            />
            <div>
              <span className="text-white font-medium text-sm">Ищем людей в команду</span>
              <p className="text-xs text-gray-500 mt-1">
                Отметьте, если проекту нужны дополнительные специалисты.
              </p>
            </div>
          </label>

          {lookingForTeam && (
            <>
              <TagMultiSelect
                label="Нужные специалисты"
                hint="роли в команде"
                placeholder="Например: Data Scientist, SMM..."
                presets={VACANCY_ROLE_PRESETS}
                values={neededRoles}
                onChange={setNeededRoles}
              />
              <FormField label="Комментарий к вакансии" hint="Уточните формат участия: удалённо, part-time, для диплома и т.д.">
                <textarea
                  rows={3}
                  value={vacancyNote}
                  onChange={(e) => setVacancyNote(e.target.value)}
                  placeholder="Кого ищем и на каких условиях"
                  className={textareaClass}
                />
              </FormField>
            </>
          )}
        </div>

        <FormField label="Примечание">
          <textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} className={textareaClass} />
        </FormField>

        <div className="mb-8 rounded-xl border border-white/10 bg-[#0b2234] p-4">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={!ratingEnabled}
              onChange={(e) => setRatingEnabled(!e.target.checked)}
              className="mt-1 rounded border-white/20"
            />
            <div>
              <span className="text-white font-medium text-sm">Отключить возможность оценивать</span>
              {!ratingEnabled && (
                <p className="text-amber-300 text-xs mt-2">
                  Если отключить рейтинг, проект будет менее заметен в ленте и его увидит меньше людей.
                </p>
              )}
            </div>
          </label>
        </div>

        <div className="flex justify-end items-center gap-4 mt-8 border-t border-white/10 pt-8">
          <button
            disabled={loading}
            type="submit"
            className="bg-yellow-500 text-black font-bold py-3 px-8 rounded-lg hover:bg-yellow-600 transition-colors flex items-center gap-2 disabled:opacity-50"
          >
            {loading ? loadingStage || 'Создание...' : 'Создать проект'}
          </button>
        </div>
      </form>

      {showCalculator && (
        <EconomicEffectCalculator
          onApply={(value) => setEconomicEffect(String(Math.max(0, value)))}
          onClose={() => setShowCalculator(false)}
        />
      )}
    </div>
  );
};
