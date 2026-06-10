import React, { useState } from 'react';
import { CampusNewsSection } from './CampusNewsSection';
import { EventsSection } from './EventsSection';
import { ITQuizModal } from './ITQuizModal';
import { ProjectAssistant } from './project-assistant/ProjectAssistant';

export const CampusPage: React.FC<{ onNavigate: (page: string) => void }> = ({ onNavigate }) => {
  const [showQuiz, setShowQuiz] = useState(false);

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

      <ProjectAssistant />

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
