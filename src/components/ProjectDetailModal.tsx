import React from 'react';
import type { ProjectData } from '../types';
import { ProjectDetailContent } from './ProjectDetailContent';

interface ProjectDetailModalProps {
  project: ProjectData;
  onClose: () => void;
  onRated?: () => void;
  onNavigate?: (page: string) => void;
}

export const ProjectDetailModal: React.FC<ProjectDetailModalProps> = ({
  project,
  onClose,
  onRated,
  onNavigate,
}) => (
  <div
    className="fixed inset-0 z-[300] flex items-start justify-center p-4 pt-6 sm:pt-10 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200 overflow-y-auto"
    onClick={onClose}
  >
    <div
      className="bg-[#122e41] border border-white/10 w-full max-w-2xl rounded-2xl shadow-2xl relative mb-8"
      onClick={(e) => e.stopPropagation()}
    >
      <button
        type="button"
        onClick={onClose}
        className="absolute top-3 right-3 z-10 bg-black/40 hover:bg-yellow-400 hover:text-black w-8 h-8 rounded-full text-white text-xl transition-all flex items-center justify-center"
        aria-label="Закрыть"
      >
        ×
      </button>

      <div className="p-5 sm:p-6">
        <ProjectDetailContent
          project={project}
          onRated={onRated}
          onNavigate={onNavigate}
        />
      </div>
    </div>
  </div>
);
