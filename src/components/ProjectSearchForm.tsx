import React, { useEffect, useState } from 'react';
import { PROJECT_DIRECTIONS, PROJECT_STATUSES, TECHNOLOGY_PRESETS } from '../constants/projectForm';
import { formatProjectError, searchProjects } from '../services/projectService';
import { ProjectCard } from './ProjectCard';
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
              {results.map((project) => (
                <ProjectCard
                  key={project.id}
                  project={project}
                  as="button"
                  onAction={() => onProjectSelect?.(project)}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
