import React, { useEffect, useMemo, useState } from 'react';
import { NewsArticle } from '../types';
import { ApiService } from '../services/api';
import { ArticleBody } from '../utils/articleText';

const CATEGORIES = ['Все', 'ТИУ', 'ТюмГУ'] as const;
const INITIAL_VISIBLE = 4;
const LOAD_MORE_STEP = 4;

export const CampusNewsSection: React.FC = () => {
  const [news, setNews] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<(typeof CATEGORIES)[number]>('Все');
  const [visibleCount, setVisibleCount] = useState(INITIAL_VISIBLE);
  const [selectedArticle, setSelectedArticle] = useState<NewsArticle | null>(null);

  const loadNews = (withLoading = false) => {
    if (withLoading) setLoading(true);
    ApiService.getUniversityNews()
      .then(setNews)
      .catch((error) => console.error('Ошибка загрузки новостей вузов:', error))
      .finally(() => {
        if (withLoading) setLoading(false);
      });
  };

  useEffect(() => {
    loadNews(true);

    const intervalId = window.setInterval(() => loadNews(false), 30 * 60 * 1000);
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') loadNews(false);
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, []);

  useEffect(() => {
    setVisibleCount(INITIAL_VISIBLE);
  }, [activeCategory]);

  const sortByDate = (items: NewsArticle[]) =>
    [...items].sort((a, b) => (b.date_iso || '').localeCompare(a.date_iso || ''));

  const filteredNews = useMemo(() => {
    const list =
      activeCategory === 'Все' ? news : news.filter((item) => item.tag === activeCategory);
    return sortByDate(list);
  }, [news, activeCategory]);

  const visibleNews = filteredNews.slice(0, visibleCount);
  const hasMore = visibleCount < filteredNews.length;
  const canCollapse = visibleCount > INITIAL_VISIBLE;

  const tagClass = (tag?: string) =>
    tag === 'ТюмГУ' ? 'text-sky-400' : 'text-yellow-400';

  return (
    <section className="mb-20 mt-12">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-10">
        
        <div className="flex flex-wrap gap-3">
          {CATEGORIES.map((category) => (
            <button
              key={category}
              onClick={() => setActiveCategory(category)}
              className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                activeCategory === category
                  ? 'bg-yellow-400 text-black'
                  : 'bg-white/5 text-gray-300 hover:bg-white/10'
              }`}
            >
              {category}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 animate-pulse">
          {[1, 2, 3, 4].map((item) => (
            <div key={item} className="h-72 rounded-2xl bg-[#122e41]/60 border border-white/5" />
          ))}
        </div>
      ) : visibleNews.length > 0 ? (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-10 gap-y-12">
            {visibleNews.map((article) => (
              <button
                key={article.id}
                type="button"
                onClick={() => setSelectedArticle(article)}
                className="text-left group"
              >
                <div className="overflow-hidden h-56 mb-5 rounded-2xl relative bg-white/5 border border-white/5">
                  <div className="absolute top-4 left-4 z-10 bg-black/60 backdrop-blur-sm px-3 py-1 rounded-lg border border-white/10">
                    <span className={`text-[10px] font-black uppercase tracking-widest ${tagClass(article.tag)}`}>
                      {article.tag || 'Новости'}
                    </span>
                  </div>
                  <img
                    src={article.imageUrl}
                    alt=""
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                    onError={(event) => {
                      event.currentTarget.src = 'https://images.unsplash.com/photo-1523240795612-9a054b0db644?q=80&w=800';
                    }}
                  />
                </div>

                <h3 className="text-white font-bold text-lg mb-2 leading-tight group-hover:text-yellow-400 transition-colors line-clamp-2">
                  {article.title}
                </h3>
                <p className="text-sm text-gray-400 mb-3 line-clamp-2">{article.description}</p>
                <div className="flex items-center justify-between border-t border-white/5 pt-3">
                  <p className="text-gray-500 text-[10px] uppercase font-bold tracking-widest">{article.date}</p>
                  <span className="text-white/40 text-sm group-hover:translate-x-1 transition-transform font-bold">
                    Читать →
                  </span>
                </div>
              </button>
            ))}
          </div>

          {(hasMore || canCollapse) && (
            <div className="mt-10 flex justify-center gap-8">
              {hasMore && (
                <button
                  onClick={() => setVisibleCount((count) => count + LOAD_MORE_STEP)}
                  className="flex items-center gap-2 text-yellow-400 hover:text-white transition-colors border-b border-yellow-400 pb-1"
                >
                  <span className="font-bold">Показать ещё</span>
                </button>
              )}
              {canCollapse && (
                <button
                  onClick={() => setVisibleCount(INITIAL_VISIBLE)}
                  className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors border-b border-gray-500 pb-1"
                >
                  <span className="font-bold">Свернуть</span>
                </button>
              )}
            </div>
          )}
        </>
      ) : (
        <div className="border border-dashed border-white/10 rounded-2xl p-12 text-center text-gray-500">
          Новости в категории «{activeCategory}» пока недоступны
        </div>
      )}

      {selectedArticle && (
        <div
          className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
          onClick={() => setSelectedArticle(null)}
        >
          <div
            className="bg-[#122e41] border border-white/10 w-full max-w-4xl max-h-[90vh] rounded-[32px] overflow-hidden shadow-2xl relative flex flex-col"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              onClick={() => setSelectedArticle(null)}
              className="absolute top-6 right-6 z-20 bg-black/50 hover:bg-yellow-400 hover:text-black w-10 h-10 rounded-full text-white text-2xl transition-all"
            >
              ×
            </button>

            <div className="overflow-y-auto">
              <div className="h-72 relative">
                <img src={selectedArticle.imageUrl} alt="" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-[#122e41] to-transparent" />
                <div className="absolute bottom-0 left-0 p-8 w-full">
                  <span className="bg-yellow-400 text-black px-3 py-1 rounded-lg text-xs font-black uppercase tracking-widest mb-3 inline-block">
                    {selectedArticle.tag}
                  </span>
                  <h2 className="text-2xl md:text-4xl font-bold text-white leading-tight mb-2">
                    {selectedArticle.title}
                  </h2>
                  <p className="text-gray-400 text-sm font-bold uppercase tracking-widest">{selectedArticle.date}</p>
                </div>
              </div>

              <div className="p-8">
                <ArticleBody text={selectedArticle.full_text || selectedArticle.description || ''} />
                {selectedArticle.link && (
                  <a
                    href={selectedArticle.link}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-block mt-8 text-yellow-400 hover:text-white font-bold transition-colors"
                  >
                    Читать на сайте источника ↗
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
