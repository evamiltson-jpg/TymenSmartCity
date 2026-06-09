import React from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { t } from '../i18n';
import cityLogo from '../assets/City_logo.png';

interface HeaderProps {
  onNavigate: (page: string) => void;
  onOpenChat: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onNavigate, onOpenChat }) => {
  const { lang } = useLanguage();
  const { isAuthenticated } = useAuth();

  return (
    <header className="py-3 sm:py-6 flex justify-between items-center gap-2 sm:gap-4 text-white">
      <div 
        className="flex items-center space-x-2 sm:space-x-5 cursor-pointer group min-w-0 shrink" 
        onClick={() => onNavigate('home')}
      >
        <img 
          src={cityLogo}
          alt="City Logo" 
          className="h-9 w-9 sm:h-12 sm:w-12 object-contain transition-transform group-hover:scale-105 shrink-0" 
        />
        <div className="flex flex-col justify-center min-w-0">
          <span className="font-refined-serif text-[10px] sm:text-base md:text-xl leading-none font-medium truncate max-w-[130px] sm:max-w-none">
            {t(lang, 'header.line1')}
          </span>
          <span className="font-refined-serif text-[10px] sm:text-base md:text-xl leading-tight font-medium truncate max-w-[130px] sm:max-w-none">
            {t(lang, 'header.line2')}
          </span>
        </div>
      </div>

      <div className="flex items-center space-x-2 sm:space-x-4 md:space-x-6 text-sm shrink-0">
        <button className="hidden sm:flex items-center space-x-1 hover:text-yellow-400 transition-colors font-bold uppercase tracking-widest text-[12px]" type="button">
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 010 20 15.3 15.3 0 010-20z"/></svg>
          <span>{lang === 'ru' ? 'RU' : 'eng'}</span>
        </button>

        <button className="hidden md:block hover:text-yellow-400 transition-transform duration-200 p-1 transform hover:scale-110" type="button">
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
        </button>

        <button 
          onClick={onOpenChat}
          className="relative group p-1.5 sm:p-2 bg-white/5 hover:bg-white/10 rounded-full transition-all border border-white/5 hover:border-yellow-400/50"
          type="button"
          aria-label="ИИ-помощник"
        >
          <div className="absolute -top-0.5 -right-0.5 w-2 h-2 sm:w-2.5 sm:h-2.5 bg-yellow-400 rounded-full animate-pulse shadow-[0_0_8px_rgba(250,204,21,0.6)]"></div>
          <svg className="w-4 h-4 sm:w-5 sm:h-5 text-white/80 group-hover:text-yellow-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
          </svg>
        </button>

        {isAuthenticated ? (
          <button 
            onClick={() => onNavigate('profile')} 
            className="hover:text-yellow-400 transition-transform duration-200 p-1 transform hover:scale-110 relative group"
            type="button"
            aria-label="Профиль"
          >
            <svg className="w-5 h-5 sm:w-6 sm:h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/>
            </svg>
            <div className="absolute -bottom-8 right-0 hidden group-hover:block bg-[#122e41] border border-white/10 rounded-lg px-3 py-1 text-xs whitespace-nowrap">
              Профиль
            </div>
          </button>
        ) : (
          <button 
            onClick={() => onNavigate('login')}
            className="px-3 py-1.5 sm:px-4 sm:py-2 bg-yellow-400 hover:bg-yellow-500 text-black font-bold rounded-xl transition-all text-[10px] sm:text-xs uppercase tracking-widest"
            type="button"
          >
            Вход
          </button>
        )}
      </div>
    </header>
  );
};
