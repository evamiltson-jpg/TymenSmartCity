import React, { useEffect, useState } from 'react';
import { getStatusStyle, PROJECT_DIRECTIONS, PROJECT_STATUSES, TECHNOLOGY_PRESETS } from '../constants/projectForm';
import { formatProjectError, getProjectImageUrl, searchProjects } from '../services/projectService';
import type { ProjectData } from '../types';

const inputClass =
  'w-full bg-[#0b2234] border border-white/10 rounded-lg px-4 py-3 text-white focus:border-yellow-500 outline-none transition-all';

export const ProjectSearchForm: React.FC<{ onProjectSelect?: (project: ProjectData) => void }> = ({
  onProjectSelect,
}) => {
  const [query, setQuery] = useState('');
  const [author, setAuthor] = useState('');
  const [participant, setParticipant] = useState('');
  const [direction, setDirection] = useState('');
  const [technology, setTechnology] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<ProjectData[]>([]);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState('');

  const runSearch = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await searchProjects({
        query,
        author,
        participant,
        direction: direction || undefined,
        technology: technology || undefined,
        status: status || undefined,
      });
      setResults(data);
      setSearched(true);
    } catch (err) {
      setError(formatProjectError(err));
      setResults([]);
      setSearched(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    runSearch();
  }, []);

  const reset = () => {
    setQuery('');
    setAuthor('');
    setParticipant('');
    setDirection('');
    setTechnology('');
    setStatus('');
    setResults([]);
    setSearched(false);
    setError('');
  };

  return (
    <div className="space-y-8">
      <div className="bg-[#122e41] rounded-[32px] p-8 md:p-12 border border-white/5">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-white mb-2">Поиск проектов</h2>
          <p className="text-gray-400 text-sm">Найдите идеи по названию, автору, направлению, технологиям и статусу.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <label className="block">
            <span className="text-sm text-gray-300 mb-2 block font-medium">Название</span>
            <input value={query} onChange={(e) => setQuery(e.target.value)} className={inputClass} placeholder="Введите название..." />
          </label>
          <label className="block">
            <span className="text-sm text-gray-300 mb-2 block font-medium">Автор</span>
            <input value={author} onChange={(e) => setAuthor(e.target.value)} className={inputClass} placeholder="ФИО автора..." />
          </label>
          <label className="block">
            <span className="text-sm text-gray-300 mb-2 block font-medium">Участник</span>
            <input value={participant} onChange={(e) => setParticipant(e.target.value)} className={inputClass} placeholder="ФИО соавтора..." />
          </label>
          <label className="block">
            <span className="text-sm text-gray-300 mb-2 block font-medium">Направление</span>
            <select value={direction} onChange={(e) => setDirection(e.target.value)} className={inputClass}>
              <option value="">Все направления</option>
              {PROJECT_DIRECTIONS.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-sm text-gray-300 mb-2 block font-medium">Технология</span>
            <select value={technology} onChange={(e) => setTechnology(e.target.value)} className={inputClass}>
              <option value="">Любая технология</option>
              {TECHNOLOGY_PRESETS.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-sm text-gray-300 mb-2 block font-medium">Статус</span>
            <select value={status} onChange={(e) => setStatus(e.target.value)} className={inputClass}>
              <option value="">Любой статус</option>
              {PROJECT_STATUSES.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="flex justify-end gap-3 mt-10 pt-8 border-t border-white/10">
          <button
            type="button"
            onClick={reset}
            className="bg-white/10 text-white font-bold py-3 px-6 rounded-lg hover:bg-white/20 transition-colors"
          >
            Сбросить
          </button>
          <button
            type="button"
            onClick={runSearch}
            disabled={loading}
            className="bg-yellow-500 text-black font-bold py-3 px-6 rounded-lg hover:bg-yellow-600 transition-colors disabled:opacity-50"
          >
            {loading ? 'Поиск...' : 'Найти проекты'}
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-100">{error}</div>
      )}

      {searched && !loading && (
        <div>
          <h3 className="text-xl font-bold text-white mb-6">
            Найдено: {results.length}
          </h3>
          {results.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/10 p-12 text-center text-gray-500">
              Проекты по вашему запросу не найдены
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {results.map((project) => (
                <button
                  key={project.id}
                  type="button"
                  onClick={() => onProjectSelect?.(project)}
                  className="text-left bg-[#122e41] rounded-[24px] overflow-hidden border border-white/5 hover:border-yellow-400/30 transition-all group"
                >
                  <div className="h-44 overflow-hidden relative">
                    <img
                      src={getProjectImageUrl(project.imageUrl)}
                      alt=""
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      onError={(e) => {
                        e.currentTarget.src = getProjectImageUrl('');
                      }}
                    />
                    <span className={`absolute top-3 left-3 text-[10px] font-bold uppercase px-2 py-1 rounded-lg border ${getStatusStyle(project.status)}`}>
                      {project.status}
                    </span>
                  </div>
                  <div className="p-5">
                    <h4 className="text-lg font-bold text-white mb-1 line-clamp-2">{project.title}</h4>
                    <p className="text-yellow-400 text-xs font-bold uppercase mb-2">{project.category}</p>
                    <p className="text-gray-400 text-sm line-clamp-3 mb-3">{project.desc}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {project.tags.slice(0, 3).map((tag) => (
                        <span key={tag} className="text-[10px] px-2 py-1 rounded bg-white/5 text-gray-300">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
