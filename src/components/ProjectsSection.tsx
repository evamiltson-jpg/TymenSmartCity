import React, { useEffect, useMemo, useState } from 'react';
import { PROJECT_CATEGORIES } from '../constants';
import { fetchTopRatedProjects, getTopRatedProjectsFallback } from '../services/projectService';
import type { ProjectData } from '../types';
import { useLanguage } from '../contexts/LanguageContext';
import { t } from '../i18n';
import { ProjectCard } from './ProjectCard';
import { ProjectDetailModal } from './ProjectDetailModal';

const filterPillClass = (active: boolean) =>
  `px-6 py-2.5 rounded-xl font-bold text-sm transition-all border ${
    active
      ? 'bg-yellow-400 text-black border-yellow-400'
      : 'bg-white/5 text-gray-400 border-white/5 hover:border-white/20'
  }`;

const sortByRating = (projects: ProjectData[]) =>
  [...projects].sort((a, b) => b.rating - a.rating || b.votes - a.votes);

export const ProjectsSection: React.FC = () => {
  const [allProjects, setAllProjects] = useState<ProjectData[]>(() => getTopRatedProjectsFallback());
  const [activeCategory, setActiveCategory] = useState(PROJECT_CATEGORIES[0]);
  const [selectedProject, setSelectedProject] = useState<ProjectData | null>(null);
  const [selectedRank, setSelectedRank] = useState<number | undefined>();
  const [syncing, setSyncing] = useState(false);
  const { lang } = useLanguage();

  useEffect(() => {
    const cats = (t(lang, 'projects.categories') as string[]) || PROJECT_CATEGORIES;
    setActiveCategory(cats[0]);
  }, [lang]);

  useEffect(() => {
    setSyncing(true);
    fetchTopRatedProjects()
      .then(setAllProjects)
      .catch((error) => console.error('Ошибка загрузки проектов:', error))
      .finally(() => setSyncing(false));
  }, []);

  const categories = useMemo(
    () => (t(lang, 'projects.categories') as string[]) || PROJECT_CATEGORIES,
    [lang],
  );

  const rankedProjects = useMemo(() => sortByRating(allProjects), [allProjects]);

  const filteredProjects = useMemo(() => {
    if (activeCategory === 'Все') return rankedProjects;
    return rankedProjects.filter((p) =>
      p.category?.toLowerCase().includes(activeCategory.toLowerCase()),
    );
  }, [activeCategory, rankedProjects]);

  const rankById = useMemo(() => {
    const map = new Map<string, number>();
    rankedProjects.forEach((p, index) => map.set(String(p.id), index + 1));
    return map;
  }, [rankedProjects]);

  return (
    <section className="py-8 sm:py-12">
      <div className="flex justify-between items-end mb-6 sm:mb-8 gap-4">
        <div>
          <h2 className="text-xl sm:text-3xl font-bold text-white tracking-tight">{t(lang, 'projects.title')}</h2>
          <p className="text-gray-400 mt-1 sm:mt-2 text-sm">
            Топ-{rankedProjects.length} по рейтингу — лучшие проекты сообщества. Полный каталог в разделе «Проекты».
          </p>
        </div>
        {syncing && <p className="text-xs text-gray-500 uppercase font-bold tracking-widest">Обновление...</p>}
      </div>

      <div className="flex flex-wrap gap-2 sm:gap-3 mb-6 sm:mb-8">
        {categories.map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => setActiveCategory(cat)}
            className={`${filterPillClass(activeCategory === cat)} !px-3.5 !py-2 !text-xs sm:!px-6 sm:!py-2.5 sm:!text-sm`}
          >
            {cat}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
        {filteredProjects.length > 0 ? (
          filteredProjects.map((project) => {
            const rank = rankById.get(String(project.id));
            return (
              <ProjectCard
                key={project.id}
                project={project}
                rank={rank}
                onAction={() => {
                  setSelectedProject(project);
                  setSelectedRank(rank);
                }}
              />
            );
          })
        ) : (
          <div className="col-span-full py-16 text-center border-2 border-dashed border-white/5 rounded-2xl text-gray-500 font-bold uppercase tracking-widest text-xs">
            Проекты в категории «{activeCategory}» не найдены
          </div>
        )}
      </div>

      {selectedProject && (
        <ProjectDetailModal
          project={selectedProject}
          rank={selectedRank}
          onClose={() => {
            setSelectedProject(null);
            setSelectedRank(undefined);
          }}
        />
      )}
    </section>
  );
};
