
import React, { useState } from 'react';
import { analyzeInitiative } from '../services/gemini';

export const InitiativeModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [formData, setFormData] = useState({ title: '', desc: '' });

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const analysis = await analyzeInitiative(formData.title, formData.desc);
      setResult(analysis);
      // Имитация сохранения в БД
      const existing = JSON.parse(localStorage.getItem('initiatives') || '[]');
      localStorage.setItem('initiatives', JSON.stringify([...existing, { ...formData, ...analysis }]));
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-[#122e41] border border-white/10 w-full max-w-lg rounded-[32px] p-8 shadow-2xl overflow-hidden relative">
        <button onClick={onClose} className="absolute top-6 right-6 text-white/50 hover:text-white text-2xl">&times;</button>
        
        {!result ? (
          <form onSubmit={handleSubmit} className="space-y-6">
            <h2 className="text-2xl font-bold text-white mb-2">Предложить идею</h2>
            <p className="text-gray-400 text-sm">Ваша инициатива будет мгновенно проанализирована нашим цифровым ассистентом.</p>
            
            <input 
              required
              className="w-full bg-[#0b2234] border border-white/10 rounded-xl px-4 py-3 text-white focus:border-yellow-500 outline-none transition-all"
              placeholder="Название проекта"
              value={formData.title}
              onChange={e => setFormData({...formData, title: e.target.value})}
            />
            
            <textarea 
              required
              rows={4}
              className="w-full bg-[#0b2234] border border-white/10 rounded-xl px-4 py-3 text-white focus:border-yellow-500 outline-none transition-all resize-none"
              placeholder="Подробное описание..."
              value={formData.desc}
              onChange={e => setFormData({...formData, desc: e.target.value})}
            />
            
            <button 
              disabled={loading}
              className="w-full bg-yellow-500 hover:bg-yellow-600 text-black font-black py-4 rounded-xl transition-all flex items-center justify-center space-x-2"
            >
              {loading ? (
                <><div className="w-5 h-5 border-2 border-black/20 border-t-black rounded-full animate-spin"></div><span>Обработка ИИ...</span></>
              ) : "Отправить на рассмотрение"}
            </button>
          </form>
        ) : (
          <div className="space-y-6 animate-in fade-in zoom-in duration-300">
            <div className="flex items-center justify-between">
               <h2 className="text-2xl font-bold text-white">Анализ завершен</h2>
               <div className="bg-yellow-500 text-black px-3 py-1 rounded-full text-xs font-black">Score: {result.score}/10</div>
            </div>
            
            <div className="bg-[#0b2234] p-4 rounded-2xl border border-white/5">
               <p className="text-sm text-gray-400 mb-2 uppercase font-bold tracking-widest">Вердикт системы:</p>
               <p className="text-white italic">"{result.feedback}"</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
               <div className="bg-white/5 p-4 rounded-xl">
                  <p className="text-[10px] text-gray-500 uppercase font-bold mb-1">Сложность</p>
                  <p className="text-white font-bold">{result.difficulty}</p>
               </div>
               <div className="bg-white/5 p-4 rounded-xl">
                  <p className="text-[10px] text-gray-500 uppercase font-bold mb-1">Оценка бюджета</p>
                  <p className="text-white font-bold">{result.budgetEstimate}</p>
               </div>
            </div>

            <button 
              onClick={onClose}
              className="w-full bg-white/10 hover:bg-white/20 text-white font-bold py-3 rounded-xl transition-all"
            >
              Закрыть
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
