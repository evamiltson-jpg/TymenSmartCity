import React, { useEffect, useState } from 'react';
import { fetchProjects, getSiteProjectsFallback } from '../services/projectService';
import type { ProjectData } from '../types';
import { ProjectCard } from './ProjectCard';

export const ProjectsShowcase: React.FC = () => {
  const [projects, setProjects] = useState<ProjectData[]>(() => getSiteProjectsFallback());
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('Все');
  const [categories, setCategories] = useState<string[]>(['Все']);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const data = await fetchProjects();
        setProjects(data);
        setCategories(['Все', ...new Set(data.map((p) => p.category))]);
      } catch (err) {
        console.error('Error fetching projects:', err);
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  const filtered =
    selectedCategory === 'Все' ? projects : projects.filter((p) => p.category === selectedCategory);

  return (
    <section className="py-16 animate-in fade-in duration-700">
      <div className="mb-10">
        <div className="flex items-center gap-4 mb-2">
          <div className="w-1 h-10 bg-yellow-400 rounded-full" />
          <h2 className="text-3xl sm:text-4xl font-bold">Примеры инициатив</h2>
        </div>
        <p className="text-gray-400 ml-5">Проекты из единой базы Smart City Tyumen</p>
      </div>

      <div className="flex flex-wrap gap-3 mb-10">
        {categories.map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => setSelectedCategory(cat)}
            className={`px-5 py-2 rounded-xl font-semibold text-sm transition-all border ${
              selectedCategory === cat
                ? 'bg-yellow-400 text-black border-yellow-400'
                : 'bg-white/5 text-gray-400 border-white/10 hover:border-white/30'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
        {loading ? (
          [1, 2, 3].map((i) => (
            <div key={i} className="h-[340px] bg-[#122e41] rounded-2xl animate-pulse border border-white/5" />
          ))
        ) : filtered.length > 0 ? (
          filtered.map((project) => <ProjectCard key={project.id} project={project} />)
        ) : (
          <div className="col-span-full text-center py-12">
            <p className="text-gray-400">Нет доступных проектов</p>
          </div>
        )}
      </div>
    </section>
  );
};
