import React, { useEffect, useState } from 'react';
import { NEWS_CATEGORIES } from '../constants';
import { ApiService } from '../services/api';
import { NewsArticle } from '../types';
import { ArticleBody } from '../utils/articleText';

interface NewsSectionProps {
  isFullPage?: boolean; 
  limit?: number;       
  onNavigate?: (page: string) => void;
}

export const NewsSection: React.FC<NewsSectionProps> = ({ isFullPage = true, limit, onNavigate }) => {
  const [allNews, setAllNews] = useState<NewsArticle[]>([]);
  const [filteredNews, setFilteredNews] = useState<NewsArticle[]>([]);
  const [activeCategory, setActiveCategory] = useState("Все");
  const [loading, setLoading] = useState(true);
  
  // Состояние для модального окна (отвечает за открытие карточки)
  const [selectedArticle, setSelectedArticle] = useState<NewsArticle | null>(null);

  useEffect(() => {
    // Подгружаем новости, которые собрали ваши Python-парсеры
    ApiService.getNews().then(data => {
      setAllNews(data);
      setFilteredNews(data);
      setLoading(false);
    });
  }, []);

  const handleCategoryChange = (category: string) => {
    setActiveCategory(category);
    if (category === "Все") {
      setFilteredNews(allNews);
    } else {
      // Фильтруем по тегу (Технологии, Город и т.д.)
      const filtered = allNews.filter(article => article.tag === category);
      setFilteredNews(filtered);
    }
  };

  const displayNews = limit ? filteredNews.slice(0, limit) : filteredNews;

  return (
    <section className="pt-4 sm:pt-6 pb-8 sm:pb-12">
      <h2 className="text-xl sm:text-3xl font-bold text-white tracking-tight mb-4 sm:mb-6">
        {isFullPage ? 'Все цифровые новости' : 'Цифровые новости'}
      </h2>

      <div className="flex flex-wrap gap-2 mb-6 sm:mb-8 md:hidden">
        {NEWS_CATEGORIES.map((category) => (
          <button
            key={category}
            type="button"
            onClick={() => handleCategoryChange(category)}
            className={`px-3.5 py-2 rounded-xl font-bold text-xs transition-all border ${
              activeCategory === category
                ? 'bg-yellow-400 text-black border-yellow-400'
                : 'bg-white/5 text-gray-400 border-white/10 active:bg-white/10'
            }`}
          >
            {category}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 sm:gap-12">
        <div className="hidden md:block md:col-span-2">
          <ul className="space-y-4">
            {NEWS_CATEGORIES.map((category) => (
              <li key={category}>
                <button
                  type="button"
                  onClick={() => handleCategoryChange(category)}
                  className={`text-left w-full text-base transition-colors font-medium ${
                    activeCategory === category
                      ? 'text-yellow-400 font-bold'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  {category}
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div className="md:col-span-10 col-span-12">
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-12 text-gray-500 uppercase font-black animate-pulse">
                Загрузка новостей из Тюмени...
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 sm:gap-x-12 gap-y-8 sm:gap-y-16">
              {displayNews.length > 0 ? (
                displayNews.map((article) => (
                  <div 
                    key={article.id} 
                    className="bg-transparent group cursor-pointer"
                    onClick={() => setSelectedArticle(article)} // ОТКРЫТИЕ МОДАЛКИ
                  >
                    <div className="overflow-hidden h-44 sm:h-64 mb-4 sm:mb-6 rounded-2xl relative bg-white/5 border border-white/5">
                      <div className="absolute top-4 left-4 z-10 bg-black/60 backdrop-blur-sm px-3 py-1 rounded-lg border border-white/10">
                         <span className={`text-[10px] font-black uppercase tracking-widest ${article.tag === 'Технологии' ? 'text-sky-400' : 'text-yellow-400'}`}>
                           {article.tag || 'Новости'}
                         </span>
                      </div>
                      
                      <img 
                        src={article.imageUrl} 
                        className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105" 
                        alt=""
                        onError={(e) => { e.currentTarget.src = "https://images.unsplash.com/photo-1498050108023-c5249f4df085?q=80&w=800"; }}
                      />
                    </div>

                    <h3 className="text-white font-bold text-base sm:text-xl mb-2 sm:mb-3 leading-snug group-hover:text-yellow-400 transition-colors line-clamp-3">
                      {article.title || article.description}
                    </h3>
                    
                    <div className="flex items-center justify-between border-t border-white/5 pt-4">
                      <p className="text-gray-500 text-[10px] uppercase font-bold tracking-widest">
                        {article.date}
                      </p>
                      <span className="text-white/40 text-sm group-hover:translate-x-2 transition-transform font-bold">
                        Читать далее →
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="col-span-2 py-10 text-center text-gray-500 border border-dashed border-white/10 rounded-2xl">
                    Нет новостей в категории "{activeCategory}"
                </div>
              )}
            </div>
          )}
          
          <div className="mt-8 sm:mt-12 flex justify-center sm:justify-end">
            {!isFullPage && (
              <button 
                type="button"
                onClick={() => onNavigate && onNavigate('all-news')}
                className="flex items-center space-x-2 text-yellow-400 hover:text-white transition-colors group border-b border-yellow-400 pb-1"
              >
                <span className="text-base sm:text-lg font-bold">Смотреть все новости</span>
                <svg className="w-5 h-5 transform group-hover:translate-x-1 transition-transform" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M5 12h14M12 5l7 7-7 7"/>
                </svg>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* МОДАЛЬНОЕ ОКНО ДЛЯ ПОЛНОГО ТЕКСТА */}
      {selectedArticle && (
        <div 
          className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
          onClick={() => setSelectedArticle(null)}
        >
          <div 
            className="bg-[#122e41] border border-white/10 w-full max-w-4xl h-[92dvh] sm:h-[90vh] rounded-2xl sm:rounded-[32px] overflow-hidden shadow-2xl relative flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            <button 
              onClick={() => setSelectedArticle(null)}
              className="absolute top-6 right-6 z-20 bg-black/50 hover:bg-yellow-400 hover:text-black w-10 h-10 rounded-full text-white text-2xl transition-all flex items-center justify-center"
            >
              &times;
            </button>

            <div className="overflow-y-auto custom-scrollbar flex-grow">
               <div className="h-[180px] sm:h-[400px] relative shrink-0">
                  <img 
                    src={selectedArticle.imageUrl} 
                    className="w-full h-full object-cover" 
                    alt="" 
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#122e41] to-transparent"></div>
                  <div className="absolute bottom-0 left-0 p-8 md:p-12 w-full">
                    <span className="bg-yellow-400 text-black px-3 py-1 rounded-lg text-xs font-black uppercase tracking-widest mb-4 inline-block">
                        {selectedArticle.tag}
                    </span>
                    <h2 className="text-3xl md:text-5xl font-bold text-white leading-tight mb-4">
                        {selectedArticle.title}
                    </h2>
                    <p className="text-gray-400 font-bold uppercase tracking-widest text-sm">
                        {selectedArticle.date}
                    </p>
                  </div>
               </div>

               <div className="p-8 md:p-12">
                   <ArticleBody text={selectedArticle.full_text || selectedArticle.description || ''} />
                   
                   {selectedArticle.link && (
                       <div className="mt-12 pt-8 border-t border-white/10">
                           <a 
                             href={selectedArticle.link} 
                             target="_blank" 
                             rel="noreferrer"
                             className="text-yellow-400 hover:text-white font-bold transition-colors flex items-center gap-2"
                           >
                             Читать оригинал на источнике ↗
                           </a>
                       </div>
                   )}
               </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};