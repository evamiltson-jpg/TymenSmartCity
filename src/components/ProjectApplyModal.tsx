import React, { useState } from 'react';

const MAX_MESSAGE_LENGTH = 500;

interface ProjectApplyModalProps {
  projectTitle: string;
  isOpen: boolean;
  isSubmitting: boolean;
  onClose: () => void;
  onSubmit: (message: string) => void;
}

export const ProjectApplyModal: React.FC<ProjectApplyModalProps> = ({
  projectTitle,
  isOpen,
  isSubmitting,
  onClose,
  onSubmit,
}) => {
  const [message, setMessage] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(message.trim());
  };

  const handleClose = () => {
    if (isSubmitting) return;
    setMessage('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div
        className="bg-[#0b2234] border border-white/10 rounded-[24px] w-full max-w-md shadow-2xl"
        role="dialog"
        aria-labelledby="apply-modal-title"
      >
        <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between gap-3">
          <h2 id="apply-modal-title" className="text-lg font-bold text-white">
            Заявка в проект
          </h2>
          <button
            type="button"
            onClick={handleClose}
            disabled={isSubmitting}
            className="text-gray-400 hover:text-white text-2xl leading-none disabled:opacity-50"
            aria-label="Закрыть"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <p className="text-sm text-gray-300">
            Проект: <span className="text-yellow-400 font-semibold">{projectTitle}</span>
          </p>
          <div>
            <label className="block text-xs font-bold text-gray-400 mb-2 uppercase tracking-wider">
              Сопроводительное сообщение
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value.slice(0, MAX_MESSAGE_LENGTH))}
              rows={4}
              placeholder="Расскажите, чем можете быть полезны команде, ваш опыт и мотивацию..."
              className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-yellow-400 resize-none"
              autoFocus
            />
            <p className="text-[10px] text-gray-500 mt-1 text-right">
              {message.length}/{MAX_MESSAGE_LENGTH}
            </p>
          </div>
          <p className="text-xs text-gray-500 leading-relaxed">
            После отправки автор проекта получит уведомление. Статус заявки можно отслеживать в личном кабинете.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 pt-1">
            <button
              type="button"
              onClick={handleClose}
              disabled={isSubmitting}
              className="flex-1 py-2.5 rounded-xl border border-white/10 text-gray-300 hover:bg-white/5 text-sm font-bold disabled:opacity-50"
            >
              Отмена
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 py-2.5 rounded-xl bg-yellow-400 hover:bg-yellow-500 disabled:opacity-60 text-black text-sm font-bold"
            >
              {isSubmitting ? 'Отправка...' : 'Отправить заявку'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
