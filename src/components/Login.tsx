import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
// Импортируем ваш локальный логотип
import cityLogo from '../assets/City_logo.png';

interface LoginProps {
  onNavigate: (page: string) => void;
  onSwitchToRegister: () => void;
}

export const Login: React.FC<LoginProps> = ({ onNavigate, onSwitchToRegister }) => {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');
    setLoading(true);

    const result = await signIn(email, password);
    if (result.success) {
      setSuccessMessage('Вход выполнен! Перенаправляем...');
      setTimeout(() => onNavigate('profile'), 1200);
    } else {
      setError(result.error || 'Ошибка при входе. Проверьте email и пароль.');
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
          <p className="text-gray-400">Вход в систему</p>
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

            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="block text-sm font-bold text-gray-400">Пароль</label>
                <button
                  type="button"
                  onClick={() => onNavigate('forgot-password')}
                  className="text-xs text-yellow-400 hover:text-yellow-300 font-bold transition-colors"
                >
                  Забыли пароль?
                </button>
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Введите пароль"
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
              {loading ? 'Вход...' : 'Войти'}
            </button>
          </form>

          <div className="mt-8 pt-8 border-t border-white/5 text-center">
            <p className="text-gray-400 text-sm mb-3">Нет аккаунта?</p>
            <button
              onClick={onSwitchToRegister}
              className="text-yellow-400 hover:text-yellow-300 font-bold transition-colors"
            >
              Зарегистрироваться
            </button>
          </div>
        </div>
      </div>
    </main>
  );
};