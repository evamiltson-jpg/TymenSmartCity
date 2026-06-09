import React from 'react';
import { getStatusDot, getStatusStyle, normalizeProjectStatus } from '../constants/projectForm';

interface ProjectStatusBadgeProps {
  status: string;
  className?: string;
}

export const ProjectStatusBadge: React.FC<ProjectStatusBadgeProps> = ({ status, className = '' }) => (
  <span
    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wide border ring-1 backdrop-blur-md shadow-lg ${getStatusStyle(status)} ${className}`}
  >
    <span className={`w-2 h-2 rounded-full shrink-0 ${getStatusDot(status)}`} />
    {normalizeProjectStatus(status)}
  </span>
);
