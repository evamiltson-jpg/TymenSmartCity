
import React from 'react';

export const DevelopmentDecisionBanner: React.FC = () => {
  return (
    <section className="py-12">
      <div className="relative h-[300px] md:h-[350px] overflow-hidden rounded-none group cursor-pointer border border-white/5">
        {/* Фоновое изображение (Тюмень - то же, что в Hero) */}
        <img 
          src="https://avatars.mds.yandex.net/i?id=4e8c83736a5e6b1cf8eee780859c9bba_l-4984230-images-thumbs&n=13" 
          alt="Тюмень" 
          className="absolute inset-0 w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105"
        />
        {/* Затемнение для читаемости текста */}
        <div className="absolute inset-0 bg-black/50 group-hover:bg-black/40 transition-colors"></div>
        
        <div className="absolute inset-0 p-8 md:p-16 flex flex-col md:flex-row justify-between items-start md:items-end">
          <h2 className="text-white text-3xl md:text-5xl font-bold max-w-2xl leading-tight">
            Кто решает, как развивается Тюмень?
          </h2>
          
          <div className="mt-8 md:mt-0 flex items-center space-x-3 text-white group/btn">
            <span className="text-lg font-bold border-b border-white/30 group-hover/btn:border-white transition-all">Перейти</span>
            <svg className="w-6 h-6 transform group-hover/btn:translate-x-1 transition-transform" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M5 12h14M12 5l7 7-7 7"/>
            </svg>
          </div>
        </div>
      </div>
    </section>
  );
};
