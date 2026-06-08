import React from 'react';
// Импортируем ваш локальный баннер
import smartCityBanner from '../assets/SmartCity_Banner.png';

const NavLink: React.FC<{ 
  href: string; 
  children: React.ReactNode; 
  active?: boolean; 
  onClick?: (e: React.MouseEvent<HTMLAnchorElement>) => void 
}> = ({ href, children, active, onClick }) => {
  return (
    <a
      href={href}
      onClick={onClick}
      className={`text-base md:text-lg font-bold py-2 transition-all hover:text-yellow-400 whitespace-nowrap border-b-2 ${
        active ? 'border-yellow-400 text-yellow-400' : 'border-transparent text-white'
      }`}
    >
      {children}
    </a>
  );
};

interface HeroProps {
    onNavigate: (page: string) => void;
    currentPage: string;
    backgroundImage?: string;
}

export const Hero: React.FC<HeroProps> = ({ onNavigate, currentPage, backgroundImage }) => {
  // Если извне не передали другую картинку, используем ваш SmartCity_Banner
  const bgImage = backgroundImage || smartCityBanner;

  return (
    <div className="mb-0">
      {/* Контейнер баннера с ограниченной высотой */}
      <section className="relative w-full overflow-hidden bg-[#063553]">
        
        <div className="relative w-full overflow-hidden" style={{ height: 700, maxHeight: 700 }}>
            <img 
              src={bgImage} 
              alt="Smart City Banner" 
              className="w-full h-full object-cover object-center block"
              style={{ objectPosition: 'center 110%' }}
            />
            
            {/* Мягкий градиент внизу, чтобы картинка плавно переходила в навигацию */}
            <div className="absolute inset-0 bg-gradient-to-t from-[#063553]/60 via-transparent to-transparent"></div>
        </div>
      </section>

      {/* Навигационная панель */}
      <nav className="bg-[#063553] pt-6 pb-2 border-b border-white/5">
        <div className="flex justify-between items-center w-full overflow-x-auto gap-8 no-scrollbar">
          <NavLink href="#" active={currentPage === 'home'} onClick={(e) => { e.preventDefault(); onNavigate('home'); }}>Главная</NavLink>
          <NavLink href="#" active={currentPage === 'management'} onClick={(e) => { e.preventDefault(); onNavigate('management'); }}>Умный город</NavLink>
          <NavLink href="#" active={currentPage === 'services'} onClick={(e) => { e.preventDefault(); onNavigate('services'); }}>Сервисы</NavLink>
          <NavLink href="#" active={currentPage === 'projects'} onClick={(e) => { e.preventDefault(); onNavigate('projects'); }}>Проекты</NavLink>
          <NavLink href="#" active={currentPage === 'campus'} onClick={(e) => { e.preventDefault(); onNavigate('campus'); }}>Студентам</NavLink>
        </div>
      </nav>
    </div>
  );
};