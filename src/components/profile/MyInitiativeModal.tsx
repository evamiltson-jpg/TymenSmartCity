import React, { useEffect, useRef, useState } from 'react';
import {
  INITIATIVE_CATEGORIES,
  INITIATIVE_PHOTO_LIMITS,
  INITIATIVE_STATUS_COLORS,
  INITIATIVE_STATUS_LABELS,
  type InitiativeCategory,
} from '../../constants/initiatives';
import {
  canDeleteInitiative,
  canEditInitiative,
  deleteCitizenInitiative,
  fetchMyInitiativeById,
  updateCitizenInitiative,
  uploadInitiativePhoto,
  validateInitiativePhoto,
  type CitizenInitiative,
} from '../../services/initiativeService';

interface MyInitiativeModalProps {
  initiativeId: string;
  userId: string;
  mode: 'view' | 'edit';
  onClose: () => void;
  onUpdated: () => void;
  onDeleted: () => void;
}

const inputClass =
  'w-full bg-[#0b2234] border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:border-yellow-500 outline-none transition-all';
const labelClass = 'block text-xs font-bold text-gray-400 mb-2 uppercase tracking-wider';
const actionButtonClass =
  'inline-flex justify-center bg-yellow-400/10 hover:bg-yellow-400 text-yellow-400 hover:text-black py-2.5 px-5 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all disabled:opacity-50';
const dangerButtonClass =
  'inline-flex justify-center border border-red-500/30 text-red-400 hover:bg-red-500/10 py-2.5 px-5 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all disabled:opacity-50';

export const MyInitiativeModal: React.FC<MyInitiativeModalProps> = ({
  initiativeId,
  userId,
  mode: initialMode,
  onClose,
  onUpdated,
  onDeleted,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [mode, setMode] = useState<'view' | 'edit'>(initialMode);
  const [initiative, setInitiative] = useState<CitizenInitiative | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');
  const [existingPhotos, setExistingPhotos] = useState<string[]>([]);
  const [newPhotos, setNewPhotos] = useState<File[]>([]);
  const [newPreviews, setNewPreviews] = useState<string[]>([]);
  const [form, setForm] = useState({
    title: '',
    description: '',
    address: '',
    category: INITIATIVE_CATEGORIES[0] as InitiativeCategory,
  });

  useEffect(() => {
    setLoading(true);
    setError('');
    fetchMyInitiativeById(initiativeId, userId)
      .then((data) => {
        if (!data) {
          setError('Инициатива не найдена');
          return;
        }
        setInitiative(data);
        setExistingPhotos(data.photo_urls ?? []);
        setForm({
          title: data.title,
          description: data.description,
          address: data.address ?? '',
          category: data.category as InitiativeCategory,
        });
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Ошибка загрузки'))
      .finally(() => setLoading(false));
  }, [initiativeId, userId]);

  const totalPhotos = existingPhotos.length + newPhotos.length;

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    e.target.value = '';
    if (!files.length) return;

    const remaining = INITIATIVE_PHOTO_LIMITS.maxFiles - totalPhotos;
    if (remaining <= 0) {
      setError(`Можно приложить не более ${INITIATIVE_PHOTO_LIMITS.maxFiles} фото.`);
      return;
    }

    const toAdd = files.slice(0, remaining);
    for (const file of toAdd) {
      const check = validateInitiativePhoto(file);
      if (!check.ok) {
        setError(check.error ?? 'Недопустимый файл.');
        return;
      }
    }

    setError('');
    setNewPhotos((prev) => [...prev, ...toAdd]);
    setNewPreviews((prev) => [...prev, ...toAdd.map((f) => URL.createObjectURL(f))]);
  };

  const removeExistingPhoto = (index: number) => {
    setExistingPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  const removeNewPhoto = (index: number) => {
    URL.revokeObjectURL(newPreviews[index]);
    setNewPhotos((prev) => prev.filter((_, i) => i !== index));
    setNewPreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    if (!form.title.trim() || form.description.trim().length < 10) {
      setError('Заполните название и описание (минимум 10 символов).');
      return;
    }

    setSaving(true);
    setError('');
    try {
      const uploaded: string[] = [];
      for (const file of newPhotos) {
        uploaded.push(await uploadInitiativePhoto(userId, file));
      }

      await updateCitizenInitiative(initiativeId, userId, {
        title: form.title,
        description: form.description,
        address: form.address,
        category: form.category,
        photoUrls: [...existingPhotos, ...uploaded],
      });

      onUpdated();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось сохранить.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Удалить инициативу без возможности восстановления?')) return;

    setDeleting(true);
    setError('');
    try {
      await deleteCitizenInitiative(initiativeId, userId);
      onDeleted();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось удалить.');
    } finally {
      setDeleting(false);
    }
  };

  const editable = initiative ? canEditInitiative(initiative.status) : false;
  const deletable = initiative ? canDeleteInitiative(initiative.status) : false;

  return (
    <div className="fixed inset-0 z-[110] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-[#122e41] border border-white/10 w-full sm:max-w-lg max-h-[92vh] rounded-t-3xl sm:rounded-[32px] shadow-2xl overflow-hidden flex flex-col">
        <div className="relative shrink-0 px-6 pt-6 pb-4 border-b border-white/5">
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 text-white/50 hover:text-white text-2xl leading-none"
            aria-label="Закрыть"
          >
            &times;
          </button>
          <h2 className="text-xl font-bold text-white pr-8">
            {mode === 'edit' ? 'Редактирование' : 'Моя инициатива'}
          </h2>
          {initiative && (
            <span
              className={`inline-block mt-2 px-2.5 py-1 rounded-lg border text-[10px] font-bold uppercase ${INITIATIVE_STATUS_COLORS[initiative.status]}`}
            >
              {INITIATIVE_STATUS_LABELS[initiative.status]}
            </span>
          )}
        </div>

        <div className="overflow-y-auto flex-1 px-6 py-5">
          {loading ? (
            <p className="text-gray-400 text-sm">Загрузка...</p>
          ) : error && !initiative ? (
            <p className="text-red-400 text-sm">{error}</p>
          ) : mode === 'view' && initiative ? (
            <div className="space-y-4">
              <div>
                <p className={labelClass}>Категория</p>
                <p className="text-yellow-400 text-sm font-bold">{initiative.category}</p>
              </div>
              <div>
                <p className={labelClass}>Название</p>
                <p className="text-white font-bold">{initiative.title}</p>
              </div>
              <div>
                <p className={labelClass}>Описание</p>
                <p className="text-gray-300 text-sm whitespace-pre-wrap">{initiative.description}</p>
              </div>
              {initiative.address && (
                <div>
                  <p className={labelClass}>Адрес</p>
                  <p className="text-gray-400 text-sm">{initiative.address}</p>
                </div>
              )}
              {initiative.photo_urls?.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {initiative.photo_urls.map((url) => (
                    <img
                      key={url}
                      src={url}
                      alt=""
                      className="w-24 h-24 rounded-xl object-cover border border-white/10"
                    />
                  ))}
                </div>
              )}
              <p className="text-xs text-gray-500">
                Отправлено:{' '}
                {new Date(initiative.created_at).toLocaleString('ru-RU', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </p>
              {!editable && (
                <p className="text-xs text-gray-500 bg-white/5 rounded-xl px-3 py-2">
                  Редактирование недоступно — инициатива уже принята или находится в работе.
                </p>
              )}
            </div>
          ) : (
            <form
              className="space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                void handleSave();
              }}
            >
              {error && (
                <div className="px-4 py-3 rounded-xl bg-red-500/10 text-red-400 text-sm border border-red-500/20">
                  {error}
                </div>
              )}

              <div>
                <label className={labelClass}>Название *</label>
                <input
                  required
                  minLength={3}
                  maxLength={200}
                  className={inputClass}
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                />
              </div>

              <div>
                <label className={labelClass}>Описание *</label>
                <textarea
                  required
                  minLength={10}
                  rows={4}
                  className={`${inputClass} resize-none`}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
              </div>

              <div>
                <label className={labelClass}>Адрес</label>
                <input
                  maxLength={300}
                  className={inputClass}
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                />
              </div>

              <div>
                <label className={labelClass}>Категория</label>
                <select
                  className={inputClass}
                  value={form.category}
                  onChange={(e) =>
                    setForm({ ...form, category: e.target.value as InitiativeCategory })
                  }
                >
                  {INITIATIVE_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat} className="bg-[#0b2234]">
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className={labelClass}>Фотографии</label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {existingPhotos.map((url, i) => (
                    <div key={url} className="relative w-20 h-20 rounded-xl overflow-hidden border border-white/10">
                      <img src={url} alt="" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => removeExistingPhoto(i)}
                        className="absolute top-0.5 right-0.5 w-5 h-5 rounded-full bg-black/70 text-white text-xs"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                  {newPreviews.map((url, i) => (
                    <div key={url} className="relative w-20 h-20 rounded-xl overflow-hidden border border-white/10">
                      <img src={url} alt="" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => removeNewPhoto(i)}
                        className="absolute top-0.5 right-0.5 w-5 h-5 rounded-full bg-black/70 text-white text-xs"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={INITIATIVE_PHOTO_LIMITS.accept}
                  multiple
                  className="hidden"
                  onChange={handlePhotoSelect}
                />
                {totalPhotos < INITIATIVE_PHOTO_LIMITS.maxFiles && (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full py-2.5 rounded-xl border border-dashed border-white/20 text-gray-400 text-sm"
                  >
                    + Добавить фото
                  </button>
                )}
              </div>
            </form>
          )}
        </div>

        {!loading && initiative && (
          <div className="shrink-0 px-6 py-4 border-t border-white/5 flex flex-wrap gap-2 justify-end bg-[#0f2738]">
            {mode === 'view' ? (
              <>
                {deletable && (
                  <button
                    type="button"
                    onClick={() => void handleDelete()}
                    disabled={deleting}
                    className={dangerButtonClass}
                  >
                    {deleting ? '...' : 'Удалить'}
                  </button>
                )}
                {editable && (
                  <button type="button" onClick={() => setMode('edit')} className={actionButtonClass}>
                    Редактировать
                  </button>
                )}
                <button
                  type="button"
                  onClick={onClose}
                  className="inline-flex justify-center bg-white/10 hover:bg-white/15 text-white py-2.5 px-5 rounded-2xl font-bold text-[10px] uppercase"
                >
                  Закрыть
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => setMode('view')}
                  className="inline-flex justify-center bg-white/10 text-white py-2.5 px-5 rounded-2xl font-bold text-[10px] uppercase"
                >
                  Отмена
                </button>
                <button
                  type="button"
                  onClick={() => void handleSave()}
                  disabled={saving}
                  className={actionButtonClass}
                >
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
