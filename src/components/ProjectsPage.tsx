import React, { useEffect, useMemo, useState } from 'react';
import { ProjectData } from '../types';
import { ProjectSearchForm } from './ProjectSearchForm';
import { ProjectCreateForm } from './ProjectCreateForm';
import { ProjectTeamCreateForm } from './ProjectTeamCreateForm';
import { ProjectDetailView } from './ProjectDetailView';
import { ProjectCard } from './ProjectCard';
import {
  fetchProjects,
  formatProjectError,
  getSiteProjectsFallback,
} from '../services/projectService';

type TabId = 'portfolio' | 'search' | 'create-project' | 'create-team';

const tabs: Array<{ id: TabId; label: string }> = [
  { id: 'portfolio', label: 'Портфолио' },
  { id: 'search', label: 'Поиск' },
  { id: 'create-project', label: 'Создать проект' },
  { id: 'create-team', label: 'Создать команду' },
];

const filterPillClass = (active: boolean) =>
  `px-6 py-2.5 rounded-xl font-bold text-sm transition-all border ${
    active
      ? 'bg-yellow-400 text-black border-yellow-400'
      : 'bg-white/5 text-gray-400 border-white/5 hover:border-white/20'
  }`;

const ProjectPortfolioView: React.FC<{ onProjectSelect: (project: ProjectData) => void }> = ({ onProjectSelect }) => {
  const [allProjects, setAllProjects] = useState<ProjectData[]>(() => getSiteProjectsFallback());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchProjects()
      .then((projects) => {
        setAllProjects(projects);
        setError('');
      })
      .catch((err) => setError(formatProjectError(err)))
      .finally(() => setLoading(false));
  }, []);

  const stats = useMemo(() => {
    const inProgress = allProjects.filter((p) =>
      ['В разработке', 'Тестирование', 'Идея'].includes(p.status),
    ).length;
    const participants = allProjects.reduce((sum, p) => sum + p.participants, 0);
    const avgRating =
      allProjects.length > 0
        ? (allProjects.reduce((sum, p) => sum + p.rating, 0) / allProjects.length).toFixed(1)
        : '0';

    return [
      { val: String(allProjects.length), label: 'Всего проектов' },
      { val: String(inProgress), label: 'В работе' },
      { val: String(participants), label: 'Участников' },
      { val: avgRating, label: 'Средний рейтинг' },
    ];
  }, [allProjects]);

  return (
    <>
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-white mb-2">Портфолио проектов</h2>
        <p className="text-gray-400">Все проекты из базы Smart City Tyumen, отсортированы по рейтингу</p>
      </div>

      {error && (
        <div className="mb-6 rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-100">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6 mb-12">
        {loading
          ? [1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-[340px] bg-white/5 animate-pulse rounded-2xl" />
            ))
          : allProjects.map((p) => (
              <ProjectCard key={p.id} project={p} onAction={() => onProjectSelect(p)} />
            ))}
      </div>

      {!loading && allProjects.length === 0 && !error && (
        <div className="rounded-2xl border border-dashed border-white/10 p-12 text-center text-gray-500 mb-12">
          Пока нет проектов в базе. Создайте первый на вкладке «Создать проект».
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
        {stats.map((s) => (
          <div key={s.label} className="bg-[#122e41]/60 backdrop-blur-md p-5 rounded-2xl border border-white/5 text-center">
            <div className="text-2xl font-black text-white mb-1">{s.val}</div>
            <div className="text-xs text-gray-400 uppercase font-bold tracking-widest">{s.label}</div>
          </div>
        ))}
      </div>
    </>
  );
};

export const ProjectsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabId>('portfolio');
  const [selectedProject, setSelectedProject] = useState<ProjectData | null>(null);

  const renderContent = () => {
    if (selectedProject) {
      return <ProjectDetailView project={selectedProject} onBack={() => setSelectedProject(null)} />;
    }

    switch (activeTab) {
      case 'portfolio':
        return <ProjectPortfolioView onProjectSelect={setSelectedProject} />;
      case 'search':
        return <ProjectSearchForm onProjectSelect={setSelectedProject} />;
      case 'create-project':
        return <ProjectCreateForm />;
      case 'create-team':
        return <ProjectTeamCreateForm />;
      default:
        return null;
    }
  };

  return (
    <div className="animate-in fade-in duration-700 pb-20">
      {!selectedProject && (
        <div className="flex flex-wrap gap-3 mb-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                setActiveTab(tab.id);
                setSelectedProject(null);
              }}
              className={filterPillClass(activeTab === tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>
      )}

      {renderContent()}
    </div>
  );
};
