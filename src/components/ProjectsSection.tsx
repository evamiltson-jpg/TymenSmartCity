import React, { useEffect, useMemo, useState } from 'react';
import { PROJECT_CATEGORIES } from '../constants';
import { getStatusStyle } from '../constants/projectForm';
import {
  fetchTopRatedProjects,
  getProjectImageUrl,
  getTopRatedProjectsFallback,
} from '../services/projectService';
import type { ProjectData } from '../types';
import { useLanguage } from '../contexts/LanguageContext';
import { t } from '../i18n';
import { InfoModal } from './InfoModal';

const filterPillClass = (active: boolean) =>
  `px-6 py-2.5 rounded-xl font-bold text-sm transition-all border ${
    active
      ? 'bg-yellow-400 text-black border-yellow-400'
      : 'bg-white/5 text-gray-400 border-white/5 hover:border-white/20'
  }`;

const actionButtonClass =
  'w-full inline-flex justify-center bg-yellow-400/10 hover:bg-yellow-400 text-yellow-400 hover:text-black py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all';

type SectionProject = {
  id: string;
  title: string;
  description: string;
  image_url?: string | null;
  status: string;
  category: string;
  rating: number;
  votes: number;
};

const mapProject = (p: ProjectData): SectionProject => ({
  id: p.id,
  title: p.title,
  description: p.desc,
  image_url: p.imageUrl,
  status: p.status,
  category: p.category,
  rating: p.rating,
  votes: p.votes,
});

export const ProjectsSection: React.FC = () => {
  const [allProjects, setAllProjects] = useState<SectionProject[]>(() =>
    getTopRatedProjectsFallback().map(mapProject),
  );
  const [activeCategory, setActiveCategory] = useState(PROJECT_CATEGORIES[0]);
  const [selectedProject, setSelectedProject] = useState<SectionProject | null>(null);
  const [syncing, setSyncing] = useState(false);
  const { lang } = useLanguage();

  useEffect(() => {
    const cats = (t(lang, 'projects.categories') as string[]) || PROJECT_CATEGORIES;
    setActiveCategory(cats[0]);
  }, [lang]);

  useEffect(() => {
    setSyncing(true);
    fetchTopRatedProjects()
      .then((data) => setAllProjects(data.map(mapProject)))
      .catch((error) => console.error('Ошибка загрузки проектов:', error))
      .finally(() => setSyncing(false));
  }, []);

  const categories = useMemo(
    () => (t(lang, 'projects.categories') as string[]) || PROJECT_CATEGORIES,
    [lang],
  );

  const filteredProjects = useMemo(() => {
    if (activeCategory === 'Все') return allProjects;
    return allProjects.filter((p) =>
      p.category?.toLowerCase().includes(activeCategory.toLowerCase()),
    );
  }, [activeCategory, allProjects]);

  return (
    <section className="py-8 sm:py-12">
      <div className="flex justify-between items-end mb-6 sm:mb-10 gap-4">
        <div>
          <h2 className="text-xl sm:text-3xl font-bold text-white tracking-tight">{t(lang, 'projects.title')}</h2>
          <p className="text-gray-500 mt-1 sm:mt-2 text-xs sm:text-base">Топ проектов по рейтингу — полный каталог в разделе «Проекты»</p>
        </div>
        {syncing && <p className="text-[10px] text-gray-500 uppercase font-bold tracking-widest">Обновление...</p>}
      </div>

      <div className="flex flex-wrap gap-2 sm:gap-3 mb-6 sm:mb-10">
        {categories.map((cat) => (
          <button key={cat} type="button" onClick={() => setActiveCategory(cat)} className={`${filterPillClass(activeCategory === cat)} !px-3.5 !py-2 !text-xs sm:!px-6 sm:!py-2.5 sm:!text-sm`}>
            {cat}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
        {filteredProjects.length > 0 ? (
          filteredProjects.map((project) => (
            <div
              key={project.id}
              className="bg-[#122e41] rounded-2xl sm:rounded-[32px] border border-white/5 hover:border-yellow-400/30 transition-all group overflow-hidden flex flex-col shadow-xl sm:shadow-2xl"
            >
              <div className="h-28 sm:h-44 relative overflow-hidden bg-gray-800">
                <img
                  src={getProjectImageUrl(project.image_url)}
                  className="w-full h-full object-cover grayscale-[0.5] group-hover:grayscale-0 group-hover:scale-110 transition-all duration-700"
                  alt={project.title}
                  loading="lazy"
                  onError={(e) => {
                    e.currentTarget.src = getProjectImageUrl('');
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#122e41] to-transparent"></div>
              </div>
              <div className="p-4 sm:p-7 flex flex-col flex-grow">
                <h3 className="text-base sm:text-xl font-bold mb-1.5 sm:mb-2 group-hover:text-yellow-400 transition-colors line-clamp-2">
                  {project.title}
                </h3>
                <p className="text-gray-400 text-xs sm:text-sm mb-3 sm:mb-4 line-clamp-2 sm:line-clamp-3 flex-grow">{project.description}</p>
                <div className="flex justify-between items-center mb-3 sm:mb-4">
                  <span className={`text-[9px] font-bold uppercase tracking-widest px-2 py-1 rounded-lg border ${getStatusStyle(project.status)}`}>
                    {project.status}
                  </span>
                  <span className="text-yellow-500 text-[10px] font-black uppercase tracking-widest">
                    ★ {project.rating > 0 ? project.rating.toFixed(1) : project.votes}
                  </span>
                </div>
                <button type="button" onClick={() => setSelectedProject(project)} className={`${actionButtonClass} !py-2.5 sm:!py-3`}>
                  Подробнее
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-full py-20 text-center border-2 border-dashed border-white/5 rounded-[40px] text-gray-500 font-bold uppercase tracking-widest text-xs">
            Проекты в категории «{activeCategory}» не найдены
          </div>
        )}
      </div>

      {selectedProject && (
        <InfoModal
          data={{
            title: selectedProject.title,
            desc: selectedProject.description,
            category: selectedProject.category,
            image: selectedProject.image_url,
            status: selectedProject.status,
            isService: false,
            buttonText: 'Подать заявку',
          }}
          onClose={() => setSelectedProject(null)}
        />
      )}
    </section>
  );
};
