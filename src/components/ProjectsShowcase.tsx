import React, { useEffect, useState } from 'react';
import { fetchProjects, getProjectImageUrl, getSiteProjectsFallback } from '../services/projectService';
import type { ProjectData } from '../types';

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

  const filtered = selectedCategory === 'Все'
    ? projects
    : projects.filter((p) => p.category === selectedCategory);

  return (
    <section className="py-20 animate-in fade-in duration-700">
      <div className="mb-12">
        <div className="flex items-center gap-4 mb-2">
          <div className="w-1 h-10 bg-yellow-400 rounded-full"></div>
          <h2 className="text-4xl font-bold">Примеры инициатив</h2>
        </div>
        <p className="text-gray-400 ml-6">Проекты из единой базы Smart City Tyumen</p>
      </div>

      <div className="flex flex-wrap gap-3 mb-12">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-5 py-2 rounded-lg font-semibold text-sm transition-all border ${
              selectedCategory === cat
                ? 'bg-yellow-400 text-black border-yellow-400'
                : 'bg-white/5 text-gray-400 border-white/10 hover:border-white/30'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {loading ? (
          [1, 2, 3].map((i) => (
            <div key={i} className="bg-[#122e41] h-80 rounded-2xl animate-pulse border border-white/5"></div>
          ))
        ) : filtered.length > 0 ? (
          filtered.map((project) => (
            <div
              key={project.id}
              className="bg-[#122e41]/50 rounded-2xl border border-white/5 hover:border-yellow-400/30 transition-all group overflow-hidden flex flex-col shadow-lg hover:shadow-xl hover:shadow-yellow-400/10"
            >
              <div className="h-48 relative overflow-hidden bg-gray-800">
                <img
                  src={getProjectImageUrl(project.imageUrl)}
                  alt={project.title}
                  onError={(e) => {
                    e.currentTarget.src = getProjectImageUrl('');
                  }}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#122e41] via-transparent to-transparent"></div>
              </div>

              <div className="p-6 flex flex-col flex-grow">
                <div className="flex items-center justify-between mb-3">
                  <span className="px-3 py-1 bg-yellow-400/10 text-yellow-400 rounded-full text-xs font-bold">
                    {project.category}
                  </span>
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-green-500/10 text-green-400">
                    {project.status}
                  </span>
                </div>

                <h3 className="text-xl font-bold mb-2 group-hover:text-yellow-400 transition-colors line-clamp-2">
                  {project.title}
                </h3>

                <p className="text-gray-400 text-sm mb-6 line-clamp-3 flex-grow">{project.desc}</p>

                <div className="flex items-center justify-between pt-4 border-t border-white/5">
                  <div className="flex items-center gap-1">
                    <span className="text-yellow-400 font-bold">{project.participants}</span>
                    <span className="text-gray-500 text-sm">участников</span>
                  </div>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-full text-center py-12">
            <p className="text-gray-400">Нет доступных проектов</p>
          </div>
        )}
      </div>
    </section>
  );
};
