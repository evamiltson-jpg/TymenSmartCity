import React, { useEffect, useState } from 'react';
import { ApiService } from '../services/api';
import { CampusNewsSection } from './CampusNewsSection';
import { EventsSection } from './EventsSection';
import { ITQuizModal } from './ITQuizModal';

export const CampusPage: React.FC<{ onNavigate: (page: string) => void }> = ({ onNavigate }) => {
  const [data, setData] = useState<any>(null);
  const [showQuiz, setShowQuiz] = useState(false);

  useEffect(() => {
    ApiService.getCampusData().then(setData);
  }, []);

  if (!data) {
    return (
      <div className="p-20 text-center animate-pulse text-gray-500 uppercase font-black">
        Загрузка кампуса...
      </div>
    );
  }

  return (
    <div className="animate-in fade-in duration-700 pb-20">
      <CampusNewsSection />

      {/* Тест для определения навыков и специализации */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-20">
        <div className="md:col-span-3 bg-[#122e41] p-8 md:p-10 rounded-[32px] border border-yellow-400/20">
          <div className="max-w-3xl mx-auto text-center">
            <div className="w-14 h-14 rounded-2xl bg-yellow-400/10 flex items-center justify-center text-yellow-400 text-2xl mb-5 mx-auto">
              📊
            </div>
            <h3 className="text-2xl font-bold mb-3 text-white">Определите свои ИТ-навыки</h3>
            <p className="text-sm text-gray-400 mb-8 leading-relaxed">
              Не знаете, что указать в профиле? Пройдите тест из 12 практических задач —
              с вопросами на несколько вариантов ответа. Результат покажет специализацию и
              балльную оценку по ключевым навыкам в личном кабинете. Тест можно пройти повторно.
              Без регистрации результат сохранится локально и перенесётся после входа.
            </p>
            <button
              onClick={() => setShowQuiz(true)}
              className="px-8 py-3.5 bg-yellow-400 hover:bg-yellow-500 text-black rounded-xl font-black text-sm uppercase tracking-wider transition-colors"
            >
              Пройти тестирование
            </button>
          </div>
        </div>
      </div>

      {/* ЗАКОММЕНТИРОВАНО: Объявления
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-20">
        <div className="md:col-span-2 space-y-6">
          <h3 className="text-xl font-bold text-white">Объявления</h3>
          ...
        </div>
      </div>
      */}

      {/* ЗАКОММЕНТИРОВАНО: Истории студентов
      <h2 className="text-3xl font-bold text-white mb-10">Истории студентов</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-20">...</div>
      */}

      <h2 className="text-3xl font-bold text-white mb-10">Календарь событий</h2>
      <EventsSection />

      <div className="bg-[#0b2234] rounded-[50px] p-10 md:p-16 mb-20 relative overflow-hidden border border-white/5 mt-20">
        <h2 className="text-4xl font-bold mb-16 text-center">Таймлайн</h2>
        <div className="relative border-l-4 border-yellow-400/30 ml-8 md:ml-20 space-y-16">
          {[
            { date: '25.01.2026', title: 'Школа лидера', desc: 'Старт весенней волны' },
            { date: '05.02.2026', title: 'Встречи команд', desc: 'Консультации с менторами' },
            { date: '12.02.2026', title: 'MVP готов', desc: 'Первая итерация проекта' },
          ].map((item, index) => (
            <div key={index} className="relative pl-12">
              <div className="absolute -left-[14px] top-0 w-6 h-6 rounded-full bg-yellow-400 border-4 border-[#0b2234]" />
              <span className="bg-yellow-400 text-black px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest mb-3 inline-block">
                {item.date}
              </span>
              <h4 className="text-2xl font-bold mb-1">{item.title}</h4>
              <p className="text-gray-500 font-bold">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>

      <h2 className="text-3xl font-bold text-white mb-10">Полезные ресурсы</h2>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-20">
        {data.resources.map((resource: any) => (
          <div
            key={resource.id}
            className="bg-[#122e41] p-8 rounded-[32px] border border-white/5 hover:bg-[#1a3a4d] transition-all cursor-pointer flex flex-col items-center text-center"
          >
            <div className="text-4xl mb-6">{resource.icon}</div>
            <h4 className="text-sm font-bold mb-2 leading-tight h-10">{resource.name}</h4>
            <div className="flex justify-between w-full mt-4 text-[10px] uppercase font-black tracking-widest text-gray-500">
              <span>{resource.format}</span>
              <span>{resource.size}</span>
            </div>
            <button className="mt-6 text-yellow-400 text-[10px] font-black uppercase tracking-widest hover:underline">
              Скачать ↓
            </button>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        {[
          { val: '12', label: 'Команд' },
          { val: '450+', label: 'Студентов' },
          { val: '15', label: 'Проектов' },
          { val: '+45%', label: 'Рост за год' },
        ].map((stat, index) => (
          <div
            key={index}
            className="bg-[#122e41]/60 backdrop-blur-md p-8 rounded-[24px] border border-white/5 text-center flex flex-col items-center"
          >
            <div className="text-3xl font-black text-white mb-1">{stat.val}</div>
            <div className="text-[10px] text-gray-400 uppercase font-black tracking-widest">{stat.label}</div>
          </div>
        ))}
      </div>

      <ITQuizModal
        isOpen={showQuiz}
        onClose={() => setShowQuiz(false)}
        onNavigate={onNavigate}
      />
    </div>
  );
};
