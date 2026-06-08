import React, { useState } from 'react';

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
  onSubmit: (payload: { team_name: string; description: string }) => Promise<void>;
}

export const CreateTeamModal: React.FC<CreateTeamModalProps> = ({ isOpen, onClose, onSubmit }) => {
  const [teamName, setTeamName] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async () => {
    if (!teamName.trim()) {
      setError('Укажите название команды');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await onSubmit({ team_name: teamName.trim(), description: description.trim() });
      setTeamName('');
      setDescription('');
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка создания команды');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-[#122e41] border border-white/10 w-full max-w-lg rounded-[32px] p-8">
        <h3 className="text-xl font-bold text-white mb-6">Создать команду</h3>
        <div className="space-y-4">
          <input
            value={teamName}
            onChange={(e) => setTeamName(e.target.value)}
            placeholder="Название команды"
            className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-yellow-400"
          />
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Описание команды"
            rows={4}
            className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-yellow-400 resize-none"
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
