
import React from 'react';

export const InitiativeBanner: React.FC = () => {
  return (
    <section className="py-12">
      <div className="bg-white text-[#0f293b] rounded-none overflow-hidden flex flex-col md:flex-row shadow-2xl">
        <div className="flex-1 p-12 bg-blue-700 text-white flex flex-col justify-center">
          <h3 className="text-3xl font-bold uppercase mb-6 leading-tight tracking-tighter">
            Проект инициативного бюджетирования «Твой Бюджет»
          </h3>
          <p className="text-white/80 text-lg leading-relaxed font-normal">
            Проект дает жителям Тюмени возможность предлагать и поддерживать локальные проекты для улучшения города. Это практика активного участия граждан в городском развитии.
          </p>
        </div>
        <div className="md:w-1/3 bg-white p-12 flex items-center justify-center">
          <div className="border-4 border-blue-700 p-6 rounded-none">
            <img src="https://i.ibb.co/hK5Wv3V/tvoi-budget-logo.png" alt="Твой Бюджет" className="w-48 h-auto" />
          </div>
        </div>
      </div>
    </section>
  );
};
