import React, { useState, useRef, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { InfoModal } from './InfoModal';

interface Message {
    role: 'user' | 'ai';
    text: string;
}

export const AIChat: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
    const [messages, setMessages] = useState<Message[]>([
        { role: 'ai', text: 'Привет! Я ИИ-консультант Тюмени. Чем могу помочь? (ЖКХ, транспорт, медицина или ИТ-инициативы)' }
    ]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [selectedItem, setSelectedItem] = useState<any>(null);
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }, [messages, loading]);

    // --- НОВЫЙ ПАРСЕР (ЧИТАЕТ НАЗВАНИЯ) ---
    const parseMessage = (text: string) => {
        const cleanText = text.replace(/\*\*?/g, '');
        // Ищем формат [[тип:ID|Название]]
        // Пример: [[сервис:2|Транспортная карта]]
        const parts = cleanText.split(/(\[\[(?:проект|сервис):\d+\|.+?\]\])/g);
        
        return parts.map((part, i) => {
            if (part.startsWith('[[') && part.includes('|')) {
                // Убираем скобки
                const content = part.slice(2, -2); // "сервис:2|Транспортная карта"
                const [meta, label] = content.split('|'); // meta="сервис:2", label="Транспортная карта"
                const [type, id] = meta.split(':'); // type="сервис", id="2"
                
                const isProject = type === 'проект';

                return (
                    <button 
                        key={i}
                        onClick={async () => {
                            const table = isProject ? 'projects' : 'services';
                            
                            const { data, error } = await supabase
                                .from(table)
                                .select('*')
                                .eq('id', id)
                                .single();

                            if (error || !data) {
                                alert("Ошибка: карточка не найдена в базе (возможно, удалена).");
                                return;
                            }

                            // СТРОГОЕ ОПРЕДЕЛЕНИЕ ТИПА ДЛЯ МОДАЛКИ
                            setSelectedItem({
                                title: data.title,
                                desc: data.description,
                                category: data.category,
                                image: data.image_url,
                                isService: !isProject, // true для сервисов
                                // Для сервисов берем текст из базы или "Перейти", для проектов "Подать заявку"
                                buttonText: isProject ? 'Подать заявку' : (data.button_text || 'Перейти к сервису'),
                                status: isProject ? data.status : undefined
                            });
                        }}
                        className={`mx-1 px-3 py-1.5 rounded-lg text-[13px] font-bold transition-all inline-flex items-center gap-2 shadow-sm border whitespace-nowrap my-1 ${
                            isProject 
                            ? 'bg-yellow-400/10 text-yellow-400 border-yellow-400/30 hover:bg-yellow-400 hover:text-black' 
                            : 'bg-sky-400/10 text-sky-300 border-sky-400/30 hover:bg-sky-500 hover:text-white'
                        }`}
                    >
                        {isProject ? '🚀' : '🏛'} {label} 
                        <span className="opacity-50 text-[10px]">↗</span>
                    </button>
                );
            }
            return part;
        });
    };

    const handleSend = async () => {
        if (!input.trim() || loading) return;

        const userMsg = input;
        setInput('');
        setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
        setLoading(true);

        try {
            // 1. Запрос данных
            const [projectsRes, servicesRes] = await Promise.all([
                supabase.from('projects').select('id, title, category, description'),
                supabase.from('services').select('id, title, category, description')
            ]);

            // 2. Формируем контекст (Добавляем ID и Название для подсказки боту)
            const servicesList = servicesRes.data?.map(s => 
                `ID:${s.id} | НАЗВАНИЕ: "${s.title}" | СУТЬ: ${s.description}`
            ).join('\n') || "";

            const projectsList = projectsRes.data?.map(p => 
                `ID:${p.id} | НАЗВАНИЕ: "${p.title}" | СУТЬ: ${p.description}`
            ).join('\n') || "";

            const fullCityContext = `
                === СПИСОК ГОРОДСКИХ СЕРВИСОВ (ДЛЯ ЖИТЕЛЕЙ) ===
                ${servicesList}

                === СПИСОК ИТ-ПРОЕКТОВ (ДЛЯ РАЗРАБОТЧИКОВ/ИННОВАТОРОВ) ===
                ${projectsList}
            `;

            // 3. Запрос к ИИ
            const response = await fetch('https://api.deepseek.com/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer sk-7161025d7b3248ffa8158a6c5520b1ec` 
                },
                body: JSON.stringify({
                    model: "deepseek-chat",
                    messages: [
                        { 
                            role: "system", 
                            content: `Ты — ИИ-консультант "Умный город Тюмень".
                            
                            ТВОЯ БАЗА ЗНАНИЙ:
                            ${fullCityContext}
                            
                            СТРОГИЕ ПРАВИЛА (НЕ НАРУШАТЬ):
                            1. ССЫЛКИ: Всегда используй формат: [[тип:ID|Название]].
                               Пример: [[сервис:5|Городской Wi-Fi]] или [[проект:12|Умный светофор]].
                            
                            2. РЕЛЕВАНТНОСТЬ:
                               - Если пользователь спрашивает про ЖКХ, больницы, школы, транспорт -> ПРЕДЛАГАЙ ТОЛЬКО СЕРВИСЫ. Не смей предлагать проекты! Проекты тут не помогут, человеку нужно решение проблемы.
                               - Если пользователь говорит "хочу команду", "я программист", "есть идея" -> ПРЕДЛАГАЙ ПРОЕКТЫ.
                            
                            3. ТОЧНОСТЬ:
                               - Бери ID и Название СТРОГО из базы знаний выше. Не выдумывай ID.
                            
                            4. СТИЛЬ:
                               - Отвечай кратко и по делу. Без воды.` 
                        },
                        { role: "user", content: userMsg }
                    ],
                    temperature: 0.3 // Низкая температура, чтобы не галлюцинировал
                })
            });

            if (!response.ok) throw new Error("API Error");
            const data = await response.json();
            setMessages(prev => [...prev, { role: 'ai', text: data.choices[0].message.content }]);

        } catch (e) {
            console.error(e);
            setMessages(prev => [...prev, { role: 'ai', text: 'Ошибка соединения с сервером.' }]);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <>
            <div className="fixed bottom-4 right-4 sm:bottom-10 sm:right-10 z-[200] flex flex-col bg-[#122e41] border border-white/10 rounded-[20px] sm:rounded-[30px] shadow-2xl animate-in slide-in-from-bottom-5 duration-500 overflow-hidden w-[calc(100vw-2rem)] sm:w-[400px] h-[min(600px,calc(100vh-6rem))] sm:resize sm:resize-both">
                
                {/* Header */}
                <div className="flex-none p-5 border-b border-white/10 flex justify-between items-center bg-[#0b2234]">
                    <div className="flex items-center space-x-3">
                        <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></div>
                        <span className="font-bold text-xs uppercase tracking-widest text-white">Тюмень.Ассистент</span>
                    </div>
                    <button onClick={onClose} className="text-white/50 hover:text-white text-2xl">&times;</button>
                </div>

                {/* Chat Area */}
                <div ref={scrollRef} className="flex-grow p-6 overflow-y-auto space-y-6 bg-[#0f2536] custom-scrollbar">
                    {messages.map((m, i) => (
                        <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[90%] p-4 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap shadow-md ${
                                m.role === 'user' ? 'bg-yellow-500 text-black font-medium' : 'bg-[#1a3a4d] text-white'
                            }`}>
                                {m.role === 'ai' ? parseMessage(m.text) : m.text}
                            </div>
                        </div>
                    ))}
                    {loading && <div className="text-xs text-white/30 text-center animate-pulse">Поиск информации...</div>}
                </div>

                {/* Input */}
                <div className="p-4 bg-[#0b2234] border-t border-white/5">
                    <div className="flex gap-2">
                        <input 
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                            placeholder="Например: как записать ребенка в школу?"
                            className="flex-grow bg-[#122e41] px-4 py-3 rounded-xl text-sm text-white outline-none focus:ring-1 focus:ring-yellow-400/50 transition-all"
                        />
                        <button onClick={handleSend} disabled={loading} className="bg-yellow-500 text-black p-3 rounded-xl hover:bg-yellow-400 transition-colors">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M12 5l7 7-7 7"/></svg>
                        </button>
                    </div>
                </div>
            </div>

            {selectedItem && (
                <InfoModal 
                    data={selectedItem}
                    onClose={() => setSelectedItem(null)} 
                />
            )}
        </>
    );
};