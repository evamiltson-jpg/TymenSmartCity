import React from 'react';
import smartCityBanner from '../assets/SmartCity_Banner.png';

const NAV_ITEMS = [
  { id: 'home', label: 'Главная' },
  { id: 'management', label: 'Умный город' },
  { id: 'services', label: 'Сервисы' },
  { id: 'projects', label: 'Проекты' },
  { id: 'campus', label: 'Студентам' },
] as const;

interface HeroProps {
  onNavigate: (page: string) => void;
  currentPage: string;
  backgroundImage?: string;
}

export const Hero: React.FC<HeroProps> = ({ onNavigate, currentPage, backgroundImage }) => {
  const bgImage = backgroundImage || smartCityBanner;

  return (
    <div className="mb-0 -mx-4 sm:-mx-6 lg:mx-0">
      <section className="relative w-full overflow-hidden bg-[#063553]">
        <div className="relative w-full overflow-hidden h-[200px] sm:h-[360px] md:h-[500px] lg:h-[700px]">
          <img
            src={bgImage}
            alt="Smart City Banner"
            className="w-full h-full object-cover object-center block"
            style={{ objectPosition: 'center 85%' }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#063553]/70 via-transparent to-transparent" />
        </div>
      </section>

      <nav className="bg-[#063553] pt-3 sm:pt-6 pb-3 border-b border-white/5" aria-label="Основная навигация">
        {/* Мобильная сетка — все пункты видны без обрезки */}
        <div className="grid grid-cols-3 gap-1.5 sm:hidden">
          {NAV_ITEMS.map(({ id, label }) => {
            const active = currentPage === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => onNavigate(id)}
                className={`text-center text-[11px] font-bold py-2.5 px-1 rounded-xl transition-all ${
                  active
                    ? 'bg-yellow-400/15 text-yellow-400 ring-1 ring-yellow-400/40'
                    : 'text-white/80 bg-white/5 active:bg-white/10'
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>

        {/* Планшет и десктоп */}
        <div className="hidden sm:flex items-center w-full gap-6 md:gap-8 md:justify-between">
          {NAV_ITEMS.map(({ id, label }) => {
            const active = currentPage === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => onNavigate(id)}
                className={`text-sm md:text-lg font-bold py-2 transition-all hover:text-yellow-400 whitespace-nowrap border-b-2 ${
                  active ? 'border-yellow-400 text-yellow-400' : 'border-transparent text-white'
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
};
