import React from 'react';
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
      className={`text-sm sm:text-base md:text-lg font-bold py-2 transition-all hover:text-yellow-400 whitespace-nowrap border-b-2 shrink-0 ${
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
  const bgImage = backgroundImage || smartCityBanner;

  return (
    <div className="mb-0 -mx-4 sm:-mx-6 lg:mx-0">
      <section className="relative w-full overflow-hidden bg-[#063553]">
        <div className="relative w-full overflow-hidden h-[220px] sm:h-[360px] md:h-[500px] lg:h-[700px]">
            <img 
              src={bgImage} 
              alt="Smart City Banner" 
              className="w-full h-full object-cover object-center block"
              style={{ objectPosition: 'center 110%' }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#063553]/60 via-transparent to-transparent"></div>
        </div>
      </section>

      <nav className="bg-[#063553] pt-4 sm:pt-6 pb-2 border-b border-white/5">
        <div className="flex items-center w-full overflow-x-auto gap-5 sm:gap-8 no-scrollbar px-1 sm:px-0 md:justify-between">
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
