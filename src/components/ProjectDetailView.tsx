
import React from 'react';
import { ProjectData } from '../types';
import { ProjectDetailContent } from './ProjectDetailContent';

interface ProjectDetailViewProps {
    project: ProjectData;
    onBack: () => void;
    rank?: number;
}

export const ProjectDetailView: React.FC<ProjectDetailViewProps> = ({ project, onBack, rank }) => (
    <div className="bg-[#122e41] rounded-2xl p-5 sm:p-6 border border-white/5 animate-in fade-in duration-500 mt-4 max-w-3xl">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-5 group text-sm"
        >
            <svg className="w-4 h-4 transform group-hover:-translate-x-1 transition-transform" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
            <span>Назад к портфолио</span>
        </button>

        <ProjectDetailContent project={project} rank={rank} />
    </div>
);
