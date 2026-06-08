import React, { useEffect, useMemo, useState } from 'react';
import {
  DEFAULT_EVENT_TAG_COLOR,
  EVENT_FILTERS,
  EVENT_TAG_COLORS,
} from '../constants';

interface EventItem {
  id: number | string;
  tag: string;
  title: string;
  description: string;
  date: string;
  time: string;
  location: string;
  link: string;
}

const INITIAL_VISIBLE = 6;
const LOAD_MORE_STEP = 6;

const getTagColors = (tag: string) => EVENT_TAG_COLORS[tag] ?? DEFAULT_EVENT_TAG_COLOR;

export const EventsSection: React.FC = () => {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('Все события');
  const [visibleCount, setVisibleCount] = useState(INITIAL_VISIBLE);

  useEffect(() => {
    const loadEvents = async () => {
      try {
        const response = await fetch('/events_data.json');
        if (response.ok) {
          const data = await response.json();
          setEvents(data);
        }
      } catch (err) {
        console.error('Ошибка загрузки событий:', err);
      } finally {
        setLoading(false);
      }
    };
    loadEvents();
  }, []);

  useEffect(() => {
    setVisibleCount(INITIAL_VISIBLE);
  }, [activeFilter]);

  const tagCounts = useMemo(() => {
    const counts: Record<string, number> = { 'Все события': events.length };
    for (const event of events) {
      counts[event.tag] = (counts[event.tag] ?? 0) + 1;
    }
    return counts;
  }, [events]);

  const filteredEvents = events.filter((event) => {
    if (activeFilter === 'Все события') return true;
    return event.tag === activeFilter;
  });

  const visibleEvents = filteredEvents.slice(0, visibleCount);
  const hasMore = visibleCount < filteredEvents.length;
  const canCollapse = visibleCount > INITIAL_VISIBLE;

  return (
    <section className="py-12">
      <div className="flex flex-wrap gap-3 mb-10">
        {EVENT_FILTERS.map((filter) => {
          const isActive = activeFilter === filter;
          const colors = filter === 'Все события'
            ? DEFAULT_EVENT_TAG_COLOR
            : getTagColors(filter);
          const count = tagCounts[filter] ?? 0;

          if (filter !== 'Все события' && count === 0) {
            return null;
          }

          return (
            <button
              key={filter}
              onClick={() => setActiveFilter(filter)}
              className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all border ${
                isActive ? colors.filterActive : colors.filterIdle
              }`}
            >
              <span>{filter}</span>
              <span
                className={`min-w-[1.5rem] px-1.5 py-0.5 rounded-full text-[10px] font-black ${
                  isActive ? 'bg-black/20 text-inherit' : 'bg-black/30 text-inherit'
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          [1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="bg-[#122e41] h-72 rounded-2xl animate-pulse border border-white/5"
            />
          ))
        ) : visibleEvents.length > 0 ? (
          visibleEvents.map((event) => {
            const colors = getTagColors(event.tag);

            return (
              <div
                key={event.id}
                className={`bg-[#1e3a4c] rounded-2xl p-8 border-t-4 ${colors.accent} flex flex-col h-full shadow-lg hover:translate-y-[-4px] transition-all`}
              >
                <div className="mb-5">
                  <span
                    className={`px-4 py-1.5 rounded-full text-xs font-bold border ${colors.badge}`}
                  >
                    {event.tag}
                  </span>
                </div>

                <h3 className="text-xl font-bold text-white mb-3 leading-tight line-clamp-2">
                  {event.title}
                </h3>

                <p className="text-sm text-gray-400 mb-5 leading-relaxed line-clamp-3">
                  {event.description || 'Описание будет опубликовано на странице мероприятия.'}
                </p>

                <div className="space-y-3 mb-8 text-gray-300 flex-grow">
                  <div className="flex items-start gap-3">
                    <svg
                      className="w-5 h-5 text-sky-400 shrink-0 mt-0.5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                      />
                    </svg>
                    <div className="text-sm">
                      <p className="font-bold">{event.date}</p>
                      {event.time && event.time !== 'Время уточняется' && (
                        <p className="opacity-60">{event.time}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <svg
                      className="w-5 h-5 text-sky-400 shrink-0 mt-0.5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                    </svg>
                    <p className="text-sm">{event.location}</p>
                  </div>
                </div>

                <a
                  href={event.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-auto block w-full text-center bg-[#5d6d4e] hover:bg-[#4d5d3e] text-white/90 py-3.5 rounded-xl font-bold transition-colors uppercase text-xs tracking-wider"
                >
                  Подробнее
                </a>
              </div>
            );
          })
        ) : (
          <div className="col-span-full border-2 border-dashed border-white/10 p-16 rounded-[32px] text-center text-sm font-bold uppercase tracking-widest text-gray-500">
            Мероприятия в категории «{activeFilter}» не найдены
          </div>
        )}
      </div>

      {!loading && (hasMore || canCollapse) && (
        <div className="mt-10 flex justify-center gap-8">
          {hasMore && (
            <button
              onClick={() => setVisibleCount((count) => count + LOAD_MORE_STEP)}
              className="flex items-center gap-2 text-yellow-400 hover:text-white transition-colors group border-b border-yellow-400 pb-1"
            >
              <span className="text-lg font-bold">Показать ещё</span>
              <svg
                className="w-5 h-5 transform group-hover:translate-y-1 transition-transform"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M12 5v14M5 12l7 7 7-7" />
              </svg>
            </button>
          )}
          {canCollapse && (
            <button
              onClick={() => setVisibleCount(INITIAL_VISIBLE)}
              className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors group border-b border-gray-500 pb-1"
            >
              <span className="text-lg font-bold">Свернуть</span>
              <svg
                className="w-5 h-5 transform group-hover:-translate-y-1 transition-transform"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M12 19V5M5 12l7-7 7 7" />
              </svg>
            </button>
          )}
        </div>
      )}
    </section>
  );
};
