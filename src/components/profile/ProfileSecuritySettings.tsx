import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';

export const ProfileSecuritySettings: React.FC = () => {
  const { user, updateEmail, updatePasswordWithConfirm } = useAuth();
  const [emailForm, setEmailForm] = useState({ newEmail: '', password: '' });
  const [passwordForm, setPasswordForm] = useState({
    newPassword: '',
    confirmPassword: '',
  });
  const [emailStatus, setEmailStatus] = useState('');
  const [passwordStatus, setPasswordStatus] = useState('');
  const [savingEmail, setSavingEmail] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  const handleEmailChange = async () => {
    if (!confirm('Сменить email? На новый адрес придёт письмо для подтверждения.')) return;
    setSavingEmail(true);
    setEmailStatus('');
    const result = await updateEmail(emailForm.newEmail, emailForm.password);
    setSavingEmail(false);
    if (result.success) {
      setEmailStatus(
        result.needsEmailConfirmation
          ? 'Письмо отправлено на новый email. Подтвердите смену адреса.'
          : 'Email успешно обновлён.',
      );
      setEmailForm({ newEmail: '', password: '' });
    } else {
      setEmailStatus(result.error || 'Не удалось сменить email');
    }
  };

  const handlePasswordChange = async () => {
    if (!confirm('Сменить пароль?')) return;
    setSavingPassword(true);
    setPasswordStatus('');
    const result = await updatePasswordWithConfirm(
      passwordForm.newPassword,
      passwordForm.confirmPassword,
    );
    setSavingPassword(false);
    if (result.success) {
      setPasswordStatus('Пароль успешно изменён.');
      setPasswordForm({ newPassword: '', confirmPassword: '' });
    } else {
      setPasswordStatus(result.error || 'Не удалось сменить пароль');
    }
  };

  return (
    <div className="bg-[#122e41] p-8 rounded-[32px] border border-white/5 space-y-8">
      <h2 className="text-xl font-bold text-white">Безопасность</h2>

      <div className="space-y-4">
        <p className="text-xs font-bold uppercase tracking-wider text-gray-400">Текущий email</p>
        <p className="text-white text-sm">{user?.email}</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          <input
            type="email"
            value={emailForm.newEmail}
            onChange={(e) => setEmailForm({ ...emailForm, newEmail: e.target.value })}
            placeholder="Новый email"
            className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-yellow-400"
          />
          <input
            type="password"
            value={emailForm.password}
            onChange={(e) => setEmailForm({ ...emailForm, password: e.target.value })}
            placeholder="Текущий пароль для подтверждения"
            className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-yellow-400"
          />
        </div>
        <button
          onClick={handleEmailChange}
          disabled={savingEmail || !emailForm.newEmail || !emailForm.password}
          className="px-5 py-2.5 bg-white/10 hover:bg-white/20 disabled:opacity-40 text-white font-bold rounded-xl text-xs uppercase tracking-wider transition-colors"
        >
          {savingEmail ? 'Сохранение...' : 'Сменить email'}
        </button>
        {emailStatus && (
          <p className={`text-xs font-bold ${emailStatus.includes('успеш') || emailStatus.includes('Письмо') ? 'text-green-400' : 'text-red-400'}`}>
            {emailStatus}
          </p>
        )}
      </div>

      <div className="border-t border-white/10 pt-6 space-y-4">
        <p className="text-xs font-bold uppercase tracking-wider text-gray-400">Смена пароля</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input
            type="password"
            value={passwordForm.newPassword}
            onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
            placeholder="Новый пароль"
            className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-yellow-400"
          />
          <input
            type="password"
            value={passwordForm.confirmPassword}
            onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
            placeholder="Повторите новый пароль"
            className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-yellow-400"
          />
        </div>
        <button
          onClick={handlePasswordChange}
          disabled={savingPassword || !passwordForm.newPassword || !passwordForm.confirmPassword}
          className="px-5 py-2.5 bg-white/10 hover:bg-white/20 disabled:opacity-40 text-white font-bold rounded-xl text-xs uppercase tracking-wider transition-colors"
        >
          {savingPassword ? 'Сохранение...' : 'Сменить пароль'}
        </button>
        {passwordStatus && (
          <p className={`text-xs font-bold ${passwordStatus.includes('успеш') ? 'text-green-400' : 'text-red-400'}`}>
            {passwordStatus}
          </p>
        )}
      </div>
    </div>
  );
};
