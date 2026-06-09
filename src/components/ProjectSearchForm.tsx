import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { PROJECT_DIRECTIONS, PROJECT_STATUSES, TECHNOLOGY_PRESETS } from '../constants/projectForm';
import {
  formatProjectError,
  searchProjects,
  type ProjectSearchFilters,
  type ProjectSortBy,
} from '../services/projectService';
import { ProjectCard } from './ProjectCard';
import type { ProjectData } from '../types';

const inputClass =
  'w-full bg-[#0b2234] border border-white/10 rounded-lg px-4 py-3 text-white focus:border-yellow-500 outline-none transition-all';

const SORT_OPTIONS: Array<{ value: ProjectSortBy; label: string }> = [
  { value: 'rating', label: 'По рейтингу' },
  { value: 'votes', label: 'По голосам' },
  { value: 'newest', label: 'Сначала новые' },
  { value: 'title', label: 'По названию (А–Я)' },
];

const DEBOUNCE_MS = 450;

const emptyFilters = (): ProjectSearchFilters => ({
  query: '',
  author: '',
  participant: '',
  team: '',
  direction: '',
  technology: '',
  status: '',
  lookingForTeam: false,
  sortBy: 'rating',
});

export const ProjectSearchForm: React.FC<{ onProjectSelect?: (project: ProjectData) => void }> = ({
  onProjectSelect,
}) => {
  const [filters, setFilters] = useState<ProjectSearchFilters>(emptyFilters);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<ProjectData[]>([]);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState('');
  const isFirstSearch = useRef(true);

  const runSearch = useCallback(async (nextFilters: ProjectSearchFilters) => {
    setLoading(true);
    setError('');
    try {
      const data = await searchProjects(nextFilters);
      setResults(data);
      setSearched(true);
    } catch (err) {
      setError(formatProjectError(err));
      setResults([]);
      setSearched(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isFirstSearch.current) {
      isFirstSearch.current = false;
      void runSearch(filters);
      return;
    }

    const timer = window.setTimeout(() => {
      void runSearch(filters);
    }, DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [filters, runSearch]);

  const updateFilter = <K extends keyof ProjectSearchFilters>(key: K, value: ProjectSearchFilters[K]) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const reset = () => {
    setFilters(emptyFilters());
    setError('');
  };

  const activeChips = useMemo(() => {
    const chips: Array<{ key: keyof ProjectSearchFilters; label: string }> = [];

    if (filters.query?.trim()) chips.push({ key: 'query', label: `Поиск: ${filters.query.trim()}` });
    if (filters.author?.trim()) chips.push({ key: 'author', label: `Автор: ${filters.author.trim()}` });
    if (filters.participant?.trim()) {
      chips.push({ key: 'participant', label: `Участник: ${filters.participant.trim()}` });
    }
    if (filters.team?.trim()) chips.push({ key: 'team', label: `Команда: ${filters.team.trim()}` });
    if (filters.direction) chips.push({ key: 'direction', label: `Направление: ${filters.direction}` });
    if (filters.technology) chips.push({ key: 'technology', label: `Технология: ${filters.technology}` });
    if (filters.status) {
      const statusLabel = PROJECT_STATUSES.find((item) => item.value === filters.status)?.label || filters.status;
      chips.push({ key: 'status', label: `Статус: ${statusLabel}` });
    }
    if (filters.lookingForTeam) chips.push({ key: 'lookingForTeam', label: 'Ищут команду' });

    return chips;
  }, [filters]);

  const removeChip = (key: keyof ProjectSearchFilters) => {
    if (key === 'lookingForTeam') {
      updateFilter('lookingForTeam', false);
      return;
    }
    updateFilter(key, '' as ProjectSearchFilters[typeof key]);
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    void runSearch(filters);
  };

  return (
    <div className="space-y-8">
      <form onSubmit={handleSubmit} className="bg-[#122e41] rounded-[32px] p-8 md:p-12 border border-white/5">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-white mb-2">Поиск проектов</h2>
          <p className="text-gray-400 text-sm">
            Каталог проектов платформы и опубликованные идеи из базы. Технологии ищутся в тегах и в описании.
          </p>
        </div>

        <div className="flex flex-col lg:flex-row gap-4 mb-6">
          <label className="block flex-1">
            <span className="sr-only">Быстрый поиск</span>
            <div className="relative">
              <svg
                className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              <input
                value={filters.query || ''}
                onChange={(e) => updateFilter('query', e.target.value)}
                className={`${inputClass} pl-12`}
                placeholder="Название, описание, технология, команда..."
              />
            </div>
          </label>

          <label className="block w-full lg:w-56">
            <span className="sr-only">Сортировка</span>
            <select
              value={filters.sortBy || 'rating'}
              onChange={(e) => updateFilter('sortBy', e.target.value as ProjectSortBy)}
              className={inputClass}
            >
              {SORT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="flex flex-wrap items-center gap-3 mb-6">
          <label className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-white/10 bg-[#0b2234] cursor-pointer hover:border-yellow-500/40 transition-colors">
            <input
              type="checkbox"
              checked={Boolean(filters.lookingForTeam)}
              onChange={(e) => updateFilter('lookingForTeam', e.target.checked)}
              className="accent-yellow-400"
            />
            <span className="text-sm text-gray-200">Только проекты, ищущие команду</span>
          </label>

          <button
            type="button"
            onClick={() => setShowAdvanced((value) => !value)}
            className="text-sm text-yellow-400 hover:text-white transition-colors"
          >
            {showAdvanced ? 'Скрыть расширенные фильтры' : 'Расширенные фильтры'}
          </button>
        </div>

        {activeChips.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-6">
            {activeChips.map((chip) => (
              <button
                key={chip.key}
                type="button"
                onClick={() => removeChip(chip.key)}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-yellow-400/10 border border-yellow-400/30 text-yellow-200 text-xs font-medium hover:bg-yellow-400/20"
              >
                <span>{chip.label}</span>
                <span aria-hidden>×</span>
              </button>
            ))}
          </div>
        )}

        {showAdvanced && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-6 border-t border-white/10">
            <label className="block">
              <span className="text-sm text-gray-300 mb-2 block font-medium">Автор</span>
              <input
                value={filters.author || ''}
                onChange={(e) => updateFilter('author', e.target.value)}
                className={inputClass}
                placeholder="ФИО автора..."
              />
            </label>
            <label className="block">
              <span className="text-sm text-gray-300 mb-2 block font-medium">Участник / соавтор</span>
              <input
                value={filters.participant || ''}
                onChange={(e) => updateFilter('participant', e.target.value)}
                className={inputClass}
                placeholder="ФИО соавтора..."
              />
            </label>
            <label className="block">
              <span className="text-sm text-gray-300 mb-2 block font-medium">Команда</span>
              <input
                value={filters.team || ''}
                onChange={(e) => updateFilter('team', e.target.value)}
                className={inputClass}
                placeholder="Название команды..."
              />
            </label>
            <label className="block">
              <span className="text-sm text-gray-300 mb-2 block font-medium">Направление</span>
              <select
                value={filters.direction || ''}
                onChange={(e) => updateFilter('direction', e.target.value)}
                className={inputClass}
              >
                <option value="">Все направления</option>
                {PROJECT_DIRECTIONS.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>
            <label className="block md:col-span-2">
              <span className="text-sm text-gray-300 mb-2 block font-medium">Технология</span>
              <input
                list="project-technology-options"
                value={filters.technology || ''}
                onChange={(e) => updateFilter('technology', e.target.value)}
                className={inputClass}
                placeholder="React, Python, IoT..."
              />
              <datalist id="project-technology-options">
                {TECHNOLOGY_PRESETS.map((item) => (
                  <option key={item} value={item} />
                ))}
              </datalist>
            </label>
            <label className="block">
              <span className="text-sm text-gray-300 mb-2 block font-medium">Статус</span>
              <select
                value={filters.status || ''}
                onChange={(e) => updateFilter('status', e.target.value)}
                className={inputClass}
              >
                <option value="">Любой статус</option>
                {PROJECT_STATUSES.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
        )}

        <div className="flex justify-end gap-3 mt-10 pt-8 border-t border-white/10">
          <button
            type="button"
            onClick={reset}
            className="bg-white/10 text-white font-bold py-3 px-6 rounded-lg hover:bg-white/20 transition-colors"
          >
            Сбросить
          </button>
          <button
            type="submit"
            disabled={loading}
            className="bg-yellow-500 text-black font-bold py-3 px-6 rounded-lg hover:bg-yellow-600 transition-colors disabled:opacity-50"
          >
            {loading ? 'Поиск...' : 'Найти проекты'}
          </button>
        </div>
      </form>

      {error && (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-100">{error}</div>
      )}

      {searched && (
        <div>
          <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
            <h3 className="text-xl font-bold text-white">
              {loading ? 'Поиск...' : `Найдено: ${results.length}`}
            </h3>
            {!loading && results.length > 0 && (
              <p className="text-xs text-gray-500 uppercase tracking-widest font-bold">
                {SORT_OPTIONS.find((item) => item.value === (filters.sortBy || 'rating'))?.label}
              </p>
            )}
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="h-[340px] bg-white/5 animate-pulse rounded-2xl" />
              ))}
            </div>
          ) : results.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/10 p-12 text-center text-gray-500">
              Проекты по вашему запросу не найдены. Попробуйте изменить фильтры или сбросить поиск.
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
