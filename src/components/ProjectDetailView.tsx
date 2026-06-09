
import React from 'react';
import { ProjectData } from '../types';
import { getProjectImageUrl } from '../services/projectService';
import { ProjectStatusBadge } from './ProjectStatusBadge';

interface ProjectDetailViewProps {
    project: ProjectData;
    onBack: () => void;
}

const InfoChip: React.FC<{ icon: React.ReactNode; label: string; value: string | number }> = ({ icon, label, value }) => (
    <div className="flex items-center gap-2 text-white/70 text-sm">
        <div className="w-5 h-5">{icon}</div>
        <span>{label}: <span className="font-bold text-white">{value}</span></span>
    </div>
);

const Section: React.FC<{ title: string; icon: string; children: React.ReactNode }> = ({ title, icon, children }) => (
    <div className="mb-12">
        <div className="flex items-center gap-4 mb-6">
            <span className="text-5xl font-bold text-yellow-400/50">{icon}</span>
            <h3 className="text-2xl font-bold text-white">{title}</h3>
        </div>
        <div>{children}</div>
    </div>
);


export const ProjectDetailView: React.FC<ProjectDetailViewProps> = ({ project, onBack }) => {

    const isApplyButtonVisible = ['В разработке', 'Тестирование', 'Готов к внедрению', 'Идея'].includes(project.status);
    
    return (
        <div className="bg-[#0b2234] rounded-[32px] p-8 md:p-12 border border-white/5 animate-in fade-in duration-500 mt-6">
            <button onClick={onBack} className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-8 group">
                <svg className="w-5 h-5 transform group-hover:-translate-x-1 transition-transform" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
                <span>Назад к портфолио</span>
            </button>
            
            {/* Header */}
            <div className="flex flex-col md:flex-row gap-8 mb-10">
                <div className="w-full md:w-1/3 shrink-0">
                    <img
                      src={getProjectImageUrl(project.imageUrl)}
                      alt={project.title}
                      className="w-full aspect-square object-cover rounded-[24px]"
                      onError={(e) => { e.currentTarget.src = getProjectImageUrl(''); }}
                    />
                </div>
                <div className="flex flex-col">
                    <h2 className="text-4xl font-bold text-white mb-2">{project.title}</h2>
                    <p className="text-yellow-400 font-bold text-lg mb-6">{project.category}</p>
                    
                    <div className="space-y-3 mb-8">
                        <div className="flex items-center gap-3">
                            <span className="text-white/70 text-sm">Статус:</span>
                            <ProjectStatusBadge status={project.status} />
                        </div>
                        <InfoChip icon="👥" label="Команда" value={project.team} />
                        <InfoChip icon="🧑‍🤝‍🧑" label="Участников" value={project.participants} />
                    </div>
                    
                    {isApplyButtonVisible && (
                         <button className="bg-yellow-500 text-black font-bold py-3 px-6 rounded-lg hover:bg-yellow-600 transition-colors self-start">
                            Отправить кандидатуру
                        </button>
                    )}
                </div>
            </div>

            <div className="w-full h-px bg-white/10 my-12"></div>

            {/* Main Content */}
            <Section title="Описание проекта" icon="”">
                <p className="text-gray-300 leading-relaxed">{project.desc}</p>
            </Section>

            <Section title="Технологии" icon="⚙️">
                <div className="flex flex-wrap gap-3">
                    {project.tags.map(tag => (
                        <div key={tag} className="bg-white/10 text-gray-100 px-4 py-2 rounded-lg text-sm font-semibold border border-white/10">
                           {tag}
                        </div>
                    ))}
                </div>
            </Section>

            <Section title="Ключевые показатели" icon="🏆">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-[#061c2b] border border-white/10 rounded-xl p-6 flex items-center gap-4">
                        <div className="text-3xl">⭐</div>
                        <div>
                            <p className="font-bold text-white text-lg">{project.rating} / 5.0</p>
                            <p className="text-gray-400 text-sm">Средний рейтинг</p>
                        </div>
                    </div>
                     <div className="bg-[#061c2b] border border-white/10 rounded-xl p-6 flex items-center gap-4">
                        <div className="text-3xl">🗳️</div>
                        <div>
                            <p className="font-bold text-white text-lg">{project.votes}</p>
                            <p className="text-gray-400 text-sm">Голосов отдано</p>
                        </div>
                    </div>
                </div>
            </Section>
        </div>
    );
};
