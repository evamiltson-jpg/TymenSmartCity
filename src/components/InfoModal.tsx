import React from 'react';

interface InfoModalProps {
    data: {
        title: string;
        desc: string;
        category: string;
        image: string;
        // Поля для универсальности
        status?: string;       // Только для проектов (например, "В работе")
        buttonText?: string;   // Текст на кнопке
        isService?: boolean;   // Флаг: true = сервис (синий), false = проект (желтый)
        link?: string;         // Ссылка для перехода (на будущее)
    };
    onClose: () => void;
}

export const InfoModal: React.FC<InfoModalProps> = ({ data, onClose }) => {
    // Если данных нет, ничего не рендерим
    if (!data) return null;

    const handleButtonClick = () => {
        if (data.isService) {
            // ЛОГИКА ДЛЯ СЕРВИСА:
            // В реальном проекте здесь будет: window.open(data.link, '_blank');
            alert(`Переходим на портал госуслуг или сайт сервиса: "${data.title}"...`);
        } else {
            // ЛОГИКА ДЛЯ ПРОЕКТА:
            alert(`Спасибо! Ваша заявка на участие в проекте "${data.title}" отправлена куратору.`);
        }
    };

    return (
        // Затемненный фон (Backdrop)
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
            
            {/* Контейнер модального окна */}
            <div 
                className="bg-[#122e41] border border-white/10 w-full max-w-2xl rounded-[40px] overflow-hidden shadow-2xl relative flex flex-col max-h-[90vh]"
                onClick={(e) => e.stopPropagation()} // Чтобы клик внутри не закрывал окно
            >
                {/* Кнопка закрытия (Крестик) */}
                <button 
                    onClick={onClose} 
                    className="absolute top-6 right-6 z-10 bg-black/40 hover:bg-yellow-400 hover:text-black w-10 h-10 rounded-full text-white text-2xl transition-all flex items-center justify-center font-light cursor-pointer"
                >
                    &times;
                </button>
                
                {/* Верхняя часть с изображением */}
                <div className="h-64 sm:h-72 overflow-hidden relative shrink-0">
                    <img 
                        src={data.image} 
                        className="w-full h-full object-cover" 
                        alt={data.title}
                        onError={(e) => { e.currentTarget.src = "https://images.unsplash.com/photo-1449824913935-59a10b8d2000?q=80&w=800"; }} 
                    />
                    {/* Градиент для читаемости текста */}
                    <div className="absolute inset-0 bg-gradient-to-t from-[#122e41] via-[#122e41]/20 to-transparent"></div>
                    
                    {/* Заголовок и категория */}
                    <div className="absolute bottom-8 left-8 sm:left-10 pr-8">
                        <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest mb-4 inline-block shadow-lg ${
                            data.isService ? 'bg-sky-400 text-black' : 'bg-yellow-400 text-black'
                        }`}>
                            {data.category}
                        </span>
                        <h2 className="text-3xl sm:text-5xl font-bold text-white tracking-tighter leading-none shadow-black drop-shadow-md">
                            {data.title}
                        </h2>
                    </div>
                </div>

                {/* Основной контент */}
                <div className="p-8 sm:p-10 flex flex-col overflow-y-auto custom-scrollbar">
                    <p className="text-gray-300 text-lg leading-relaxed mb-10 font-medium whitespace-pre-wrap">
                        {data.desc}
                    </p>

                    {/* Футер карточки с информацией и кнопкой */}
                    <div className="flex flex-col sm:flex-row justify-between items-center border-t border-white/5 pt-8 gap-6 mt-auto">
                        
                        {/* Левая часть футера: Статус или Тип */}
                        {!data.isService && data.status && (
                            <div className="text-center sm:text-left">
                                <p className="text-[10px] text-gray-500 uppercase font-black tracking-widest mb-1">Статус проекта</p>
                                <p className="text-white font-bold text-lg">{data.status}</p>
                            </div>
                        )}
                        
                        {data.isService && (
                            <div className="text-center sm:text-left">
                                <p className="text-[10px] text-gray-500 uppercase font-black tracking-widest mb-1">Тип доступа</p>
                                <p className="text-sky-400 font-bold text-lg">Госуслуги / Муниципальный</p>
                            </div>
                        )}

                        {/* Правая часть: Главная кнопка действия */}
                        <button 
                            onClick={handleButtonClick}
                            className={`px-10 py-4 rounded-2xl font-black text-xs uppercase tracking-[0.2em] transition-all shadow-xl active:scale-95 w-full sm:w-auto ${
                                data.isService 
                                    ? 'bg-sky-500 hover:bg-sky-400 text-white' 
                                    : 'bg-yellow-400 hover:bg-yellow-500 text-black'
                            }`}
                        >
                            {data.buttonText || (data.isService ? 'Перейти к сервису' : 'Подать заявку')}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};