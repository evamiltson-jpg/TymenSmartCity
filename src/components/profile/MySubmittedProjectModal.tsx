import React, { useEffect, useState } from 'react';
import { PROJECT_STATUSES } from '../../constants/projectForm';
import {
  deleteMyProject,
  fetchMyProjectById,
  formatProjectError,
  getProjectImageUrl,
  getProjectModerationInfo,
  updateMyProject,
  type MyProjectDetail,
  type MyProjectUpdatePayload,
} from '../../services/projectService';

interface MySubmittedProjectModalProps {
  projectId: string;
  userId: string;
  mode: 'view' | 'edit';
  onClose: () => void;
  onUpdated: () => void;
  onDeleted: () => void;
}

const inputClass =
  'w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-yellow-400';
const labelClass = 'block text-xs font-bold text-gray-400 mb-2 uppercase tracking-wider';
const actionButtonClass =
  'inline-flex justify-center bg-yellow-400/10 hover:bg-yellow-400 text-yellow-400 hover:text-black py-2.5 px-5 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all disabled:opacity-50';
const dangerButtonClass =
  'inline-flex justify-center border border-red-500/30 text-red-400 hover:bg-red-500/10 py-2.5 px-5 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all disabled:opacity-50';

export const MySubmittedProjectModal: React.FC<MySubmittedProjectModalProps> = ({
  projectId,
  userId,
  mode: initialMode,
  onClose,
  onUpdated,
  onDeleted,
}) => {
  const [mode, setMode] = useState<'view' | 'edit'>(initialMode);
  const [project, setProject] = useState<MyProjectDetail | null>(null);
  const [form, setForm] = useState<MyProjectUpdatePayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    setError('');
    fetchMyProjectById(projectId, userId)
      .then((data) => {
        if (!data) {
          setError('Проект не найден');
          return;
        }
        setProject(data);
        setForm({
          title: data.title,
          problem: data.problem,
          description: data.description,
          expected_result: data.expected_result,
          note: data.note,
          category: data.category,
          status: data.status,
        });
      })
      .catch((err) => setError(formatProjectError(err)))
      .finally(() => setLoading(false));
  }, [projectId, userId]);

  const handleSave = async () => {
    if (!form) return;
    if (!form.title.trim() || !form.description.trim()) {
      setError('Заполните название и описание');
      return;
    }

    setSaving(true);
    setError('');
    try {
      await updateMyProject(projectId, userId, form);
      onUpdated();
      onClose();
    } catch (err) {
      setError(formatProjectError(err));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Удалить проект без возможности восстановления?')) return;

    setDeleting(true);
    setError('');
    try {
      await deleteMyProject(projectId, userId);
      onDeleted();
      onClose();
    } catch (err) {
      setError(formatProjectError(err));
    } finally {
      setDeleting(false);
    }
  };

  const moderation = project ? getProjectModerationInfo(project) : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-[#0b2234] border border-white/10 rounded-[28px] w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="sticky top-0 bg-[#0b2234] border-b border-white/10 px-6 py-4 flex items-center justify-between gap-4 z-10">
          <h2 className="text-xl font-bold text-white">
            {mode === 'edit' ? 'Редактирование проекта' : 'Мой проект'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-white text-2xl leading-none"
            aria-label="Закрыть"
          >
            ×
          </button>
        </div>

        <div className="p-6 space-y-6">
          {loading && <p className="text-gray-400 text-sm">Загрузка...</p>}
          {error && (
            <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
              {error}
            </div>
          )}

          {!loading && project && mode === 'view' && (
            <>
              {project.image_url && (
                <img
                  src={getProjectImageUrl(project.image_url)}
                  alt={project.title}
                  className="w-full h-48 object-cover rounded-2xl border border-white/10"
                  onError={(e) => {
                    e.currentTarget.src = getProjectImageUrl('');
                  }}
                />
              )}

              <div className="flex flex-wrap items-center gap-2">
                <span className="text-yellow-400 text-xs font-bold uppercase">{project.category}</span>
                {moderation && (
                  <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded-lg border ${moderation.tone}`}>
                    {moderation.label}
                  </span>
                )}
              </div>

              <h3 className="text-2xl font-bold text-white">{project.title}</h3>

              {project.problem && (
                <div>
                  <p className={labelClass}>Проблема</p>
                  <p className="text-gray-300 text-sm whitespace-pre-wrap">{project.problem}</p>
                </div>
              )}

              <div>
                <p className={labelClass}>Описание</p>
                <p className="text-gray-300 text-sm whitespace-pre-wrap">{project.description}</p>
              </div>

              {project.expected_result && (
                <div>
                  <p className={labelClass}>Ожидаемый результат</p>
                  <p className="text-gray-300 text-sm whitespace-pre-wrap">{project.expected_result}</p>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div>
                  <p className={labelClass}>Статус</p>
                  <p className="text-white">{project.status}</p>
                </div>
                <div>
                  <p className={labelClass}>Направление</p>
                  <p className="text-white">{project.direction || '—'}</p>
                </div>
                <div>
                  <p className={labelClass}>Автор</p>
                  <p className="text-white">{project.author_name || '—'}</p>
                </div>
                <div>
                  <p className={labelClass}>Команда</p>
                  <p className="text-white">{project.team_name || '—'}</p>
                </div>
              </div>

              {project.co_authors.length > 0 && (
                <div>
                  <p className={labelClass}>Соавторы</p>
                  <p className="text-gray-300 text-sm">{project.co_authors.join(', ')}</p>
                </div>
              )}

              {project.technologies.length > 0 && (
                <div>
                  <p className={labelClass}>Технологии</p>
                  <div className="flex flex-wrap gap-2">
                    {project.technologies.map((tech) => (
                      <span key={tech} className="bg-white/5 px-2 py-1 rounded-lg text-xs text-gray-300">
                        {tech}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {project.note && (
                <div>
                  <p className={labelClass}>Примечание</p>
                  <p className="text-gray-300 text-sm whitespace-pre-wrap">{project.note}</p>
                </div>
              )}

              {moderation?.hint && <p className="text-xs text-gray-500">{moderation.hint}</p>}
            </>
          )}

          {!loading && project && form && mode === 'edit' && (
            <div className="space-y-4">
              <div>
                <label className={labelClass}>Название</label>
                <input
                  className={inputClass}
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                />
              </div>
              <div>
                <label className={labelClass}>Категория</label>
                <input
                  className={inputClass}
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                />
              </div>
              <div>
                <label className={labelClass}>Статус</label>
                <select
                  className={inputClass}
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value })}
                >
                  {PROJECT_STATUSES.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelClass}>Проблема</label>
                <textarea
                  className={`${inputClass} min-h-[80px]`}
                  value={form.problem}
                  onChange={(e) => setForm({ ...form, problem: e.target.value })}
                />
              </div>
              <div>
                <label className={labelClass}>Описание</label>
                <textarea
                  className={`${inputClass} min-h-[100px]`}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
              </div>
              <div>
                <label className={labelClass}>Ожидаемый результат</label>
                <textarea
                  className={`${inputClass} min-h-[80px]`}
                  value={form.expected_result}
                  onChange={(e) => setForm({ ...form, expected_result: e.target.value })}
                />
              </div>
              <div>
                <label className={labelClass}>Примечание</label>
                <textarea
                  className={`${inputClass} min-h-[60px]`}
                  value={form.note || ''}
                  onChange={(e) => setForm({ ...form, note: e.target.value })}
                />
              </div>
            </div>
          )}
        </div>

        {!loading && project && (
          <div className="sticky bottom-0 bg-[#0b2234] border-t border-white/10 px-6 py-4 flex flex-wrap gap-3 justify-end">
            {mode === 'view' ? (
              <>
                <button type="button" onClick={handleDelete} disabled={deleting} className={dangerButtonClass}>
                  {deleting ? 'Удаление...' : 'Удалить'}
                </button>
                <button type="button" onClick={() => setMode('edit')} className={actionButtonClass}>
                  Редактировать
                </button>
                <button type="button" onClick={onClose} className={actionButtonClass}>
                  Закрыть
                </button>
              </>
            ) : (
              <>
                <button type="button" onClick={() => setMode('view')} className={actionButtonClass}>
                  Отмена
                </button>
                <button type="button" onClick={handleSave} disabled={saving} className={actionButtonClass}>
                  {saving ? 'Сохранение...' : 'Сохранить'}
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
