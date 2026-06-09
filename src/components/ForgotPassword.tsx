import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
// Импортируем ваш локальный логотип
import cityLogo from '../assets/City_logo.png';

interface ForgotPasswordProps {
  onNavigate: (page: string) => void;
}

export const ForgotPassword: React.FC<ForgotPasswordProps> = ({ onNavigate }) => {
  const { resetPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');
    setLoading(true);

    const result = await resetPassword(email);
    if (result.success) {
      setSuccessMessage(
        'Если аккаунт с таким email существует, письмо отправлено. Проверьте «Входящие», «Спам» и «Промоакции». На бесплатном тарифе Supabase письма иногда приходят с задержкой до 10–15 минут или не доходят без настройки SMTP.',
      );
    } else {
      setError(result.error || 'Не удалось отправить письмо.');
    }
    setLoading(false);
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-[#0f2942] to-[#1a3a52] flex items-center justify-center p-4 animate-in fade-in duration-700">
      <div className="w-full max-w-md">
        <div className="text-center mb-12">
          {/* Сделали логотип кликабельным для перехода на главную */}
          <div 
            onClick={() => onNavigate('home')} 
            className="inline-block cursor-pointer group mb-6"
          >
            <img
              src={cityLogo}
              alt="Smart City Logo"
              className="h-16 w-16 mx-auto transition-transform duration-200 group-hover:scale-110"
            />
          </div>
          <h1 className="text-4xl font-bold text-white mb-2">Smart City</h1>
          <p className="text-gray-400">Восстановление пароля</p>
        </div>

        <div className="bg-[#122e41] rounded-[32px] border border-white/5 p-8 backdrop-blur-sm">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-bold text-gray-400 mb-3">Email адрес</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-600 focus:outline-none focus:border-yellow-400 transition-colors"
                required
              />
            </div>

            {successMessage && (
              <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-xl text-green-400 text-sm">
                {successMessage}
              </div>
            )}

            {error && (
              <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-yellow-400 hover:bg-yellow-500 disabled:bg-gray-400 text-black font-bold rounded-xl transition-all duration-200 uppercase text-sm tracking-widest"
            >
              {loading ? 'Отправка...' : 'Отправить ссылку'}
            </button>
          </form>

          <div className="mt-8 pt-8 border-t border-white/5 text-center">
            <button
              onClick={() => onNavigate('login')}
              className="text-yellow-400 hover:text-yellow-300 font-bold transition-colors"
            >
              Вернуться ко входу
            </button>
          </div>
        </div>
      </div>
    </main>
  );
};