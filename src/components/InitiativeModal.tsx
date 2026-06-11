import React, { useRef, useState } from 'react';
import {
  INITIATIVE_CATEGORIES,
  INITIATIVE_PHOTO_LIMITS,
  type InitiativeCategory,
} from '../constants/initiatives';
import { useAuth } from '../contexts/AuthContext';
import {
  createCitizenInitiative,
  uploadInitiativePhoto,
  validateInitiativePhoto,
} from '../services/initiativeService';

interface InitiativeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate?: (page: string, tab?: string) => void;
  onSubmitted?: () => void;
}

const inputClass =
  'w-full bg-[#0b2234] border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:border-yellow-500 outline-none transition-all';
const labelClass = 'block text-xs font-bold text-gray-400 mb-2 uppercase tracking-wider';

export const InitiativeModal: React.FC<InitiativeModalProps> = ({
  isOpen,
  onClose,
  onNavigate,
  onSubmitted,
}) => {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [photos, setPhotos] = useState<File[]>([]);
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([]);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    address: '',
    category: INITIATIVE_CATEGORIES[0] as InitiativeCategory,
  });

  if (!isOpen) return null;

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      address: '',
      category: INITIATIVE_CATEGORIES[0],
    });
    setPhotos([]);
    photoPreviews.forEach((url) => URL.revokeObjectURL(url));
    setPhotoPreviews([]);
    setError('');
    setSuccess(false);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    e.target.value = '';

    if (!files.length) return;

    const remaining = INITIATIVE_PHOTO_LIMITS.maxFiles - photos.length;
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
    setPhotos((prev) => [...prev, ...toAdd]);
    setPhotoPreviews((prev) => [...prev, ...toAdd.map((f) => URL.createObjectURL(f))]);
  };

  const removePhoto = (index: number) => {
    URL.revokeObjectURL(photoPreviews[index]);
    setPhotos((prev) => prev.filter((_, i) => i !== index));
    setPhotoPreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!user) {
      onNavigate?.('login');
      return;
    }

    setLoading(true);
    try {
      const photoUrls: string[] = [];
      for (const file of photos) {
        const url = await uploadInitiativePhoto(user.id, file);
        photoUrls.push(url);
      }

      await createCitizenInitiative(user.id, {
        title: formData.title,
        description: formData.description,
        address: formData.address,
        category: formData.category,
        photoUrls,
      });

      setSuccess(true);
      onSubmitted?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось отправить инициативу.');
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-sm">
        <div className="bg-[#122e41] border border-white/10 w-full sm:max-w-md rounded-t-3xl sm:rounded-[32px] p-6 sm:p-8 shadow-2xl relative">
          <button
            type="button"
            onClick={handleClose}
            className="absolute top-4 right-4 text-white/50 hover:text-white text-2xl leading-none"
            aria-label="Закрыть"
          >
            &times;
          </button>
          <h2 className="text-xl font-bold text-white mb-3">Войдите в аккаунт</h2>
          <p className="text-gray-400 text-sm mb-6">
            Чтобы предложить идею по улучшению города, нужна авторизация.
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              type="button"
              onClick={() => {
                handleClose();
                onNavigate?.('login');
              }}
              className="flex-1 py-3 rounded-xl bg-yellow-400 text-black font-black text-sm uppercase"
            >
              Войти
            </button>
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 py-3 rounded-xl bg-white/10 text-white font-bold text-sm"
            >
              Отмена
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-[#122e41] border border-white/10 w-full sm:max-w-lg max-h-[92vh] sm:max-h-[90vh] rounded-t-3xl sm:rounded-[32px] shadow-2xl overflow-hidden flex flex-col">
        <div className="relative shrink-0 px-6 pt-6 pb-4 border-b border-white/5">
          <button
            type="button"
            onClick={handleClose}
            className="absolute top-4 right-4 text-white/50 hover:text-white text-2xl leading-none"
            aria-label="Закрыть"
          >
            &times;
          </button>
          <h2 className="text-xl sm:text-2xl font-bold text-white pr-8">
            {success ? 'Инициатива отправлена' : 'Предложить идею'}
          </h2>
          {!success && (
            <p className="text-gray-400 text-sm mt-1">
              Идея, жалоба или предложение по улучшению городской среды
            </p>
          )}
        </div>

        <div className="overflow-y-auto flex-1 px-6 py-5">
          {success ? (
            <div className="space-y-5 text-center py-4">
              <div className="text-5xl">✅</div>
              <p className="text-white text-sm leading-relaxed">
                Ваша инициатива принята и появится в личном кабинете со статусом «На рассмотрении».
                После модерации её увидят другие жители.
              </p>
              <div className="flex flex-col gap-3">
                <button
                  type="button"
                  onClick={() => {
                    handleClose();
                    onNavigate?.('profile', 'initiatives');
                  }}
                  className="w-full py-3 rounded-xl bg-yellow-400 text-black font-black text-sm uppercase"
                >
                  Мои инициативы
                </button>
                <button
                  type="button"
                  onClick={handleClose}
                  className="w-full py-3 rounded-xl bg-white/10 text-white font-bold text-sm"
                >
                  Закрыть
                </button>
              </div>
            </div>
          ) : (
            <form id="initiative-form" onSubmit={handleSubmit} className="space-y-5">
              {error && (
                <div className="px-4 py-3 rounded-xl bg-red-500/10 text-red-400 text-sm border border-red-500/20">
                  {error}
                </div>
              )}

              <div>
                <label className={labelClass}>Название инициативы *</label>
                <input
                  required
                  minLength={3}
                  maxLength={200}
                  className={inputClass}
                  placeholder="Например: Установить лавочку у остановки"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                />
              </div>

              <div>
                <label className={labelClass}>Описание *</label>
                <textarea
                  required
                  minLength={10}
                  rows={4}
                  className={`${inputClass} resize-none`}
                  placeholder="Опишите проблему или идею подробнее..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>

              <div>
                <label className={labelClass}>Адрес или место</label>
                <input
                  maxLength={300}
                  className={inputClass}
                  placeholder="Улица, район, ориентир"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                />
              </div>

              <div>
                <label className={labelClass}>Категория *</label>
                <select
                  required
                  className={inputClass}
                  value={formData.category}
                  onChange={(e) =>
                    setFormData({ ...formData, category: e.target.value as InitiativeCategory })
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
                <label className={labelClass}>
                  Фотографии (до {INITIATIVE_PHOTO_LIMITS.maxFiles}, {INITIATIVE_PHOTO_LIMITS.label})
                </label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={INITIATIVE_PHOTO_LIMITS.accept}
                  multiple
                  className="hidden"
                  onChange={handlePhotoSelect}
                />
                {photoPreviews.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-3">
                    {photoPreviews.map((url, i) => (
                      <div key={url} className="relative w-20 h-20 rounded-xl overflow-hidden border border-white/10">
                        <img src={url} alt="" className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => removePhoto(i)}
                          className="absolute top-0.5 right-0.5 w-5 h-5 rounded-full bg-black/70 text-white text-xs leading-5"
                          aria-label="Удалить фото"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                {photos.length < INITIATIVE_PHOTO_LIMITS.maxFiles && (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full py-3 rounded-xl border border-dashed border-white/20 text-gray-400 text-sm hover:border-yellow-400/50 hover:text-yellow-400 transition-colors"
                  >
                    + Прикрепить фото
                  </button>
                )}
              </div>
            </form>
          )}
        </div>

        {!success && (
          <div className="shrink-0 px-6 py-4 border-t border-white/5 bg-[#0f2738]">
            <button
              type="submit"
              form="initiative-form"
              disabled={loading}
              className="w-full bg-yellow-500 hover:bg-yellow-600 disabled:opacity-60 text-black font-black py-4 rounded-xl transition-all flex items-center justify-center gap-2 text-sm uppercase tracking-wider"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-black/20 border-t-black rounded-full animate-spin" />
                  <span>Отправка...</span>
                </>
              ) : (
                'Отправить на рассмотрение'
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
