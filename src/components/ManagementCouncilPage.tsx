import React, { useEffect, useState } from 'react';
import { COUNCIL_TASKS } from '../constants';
import { ApiService } from '../services/api';
import { Member } from '../types';

const TaskIcon: React.FC<{ name: string }> = ({ name }) => {
    switch (name) {
        case 'target': return <svg className="w-8 h-8 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" strokeWidth={2}/></svg>;
        case 'folder': return <svg className="w-8 h-8 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" strokeWidth={2}/></svg>;
        case 'ruble': return <svg className="w-8 h-8 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2" strokeWidth={2}/></svg>;
        default: return <div className="w-8 h-8 bg-yellow-400 rounded-full" />;
    }
}

export const ManagementCouncilPage: React.FC = () => {
    const [members, setMembers] = useState<Member[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        ApiService.getManagementStructure().then(data => {
            setMembers(data.council);
            setLoading(false);
        });
    }, []);

    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20">
            <h2 className="text-3xl font-bold text-white mb-10">Состав совета</h2>

            {/* Мэр */}
            <div className="bg-[#122e41] rounded-none overflow-hidden flex flex-col md:flex-row mb-16 shadow-xl border border-white/5">
                <div className="md:w-[400px] h-[350px] md:h-auto shrink-0">
                    <img 
                        src="https://avatars.mds.yandex.net/i?id=6afb2b37bc44555a1d93eda4f63004b4_l-12683358-images-thumbs&n=13" 
                        className="w-full h-full object-cover object-top" 
                        alt="Максим Афанасьев" 
                    />
                </div>
                <div className="p-8 md:p-12 flex flex-col justify-center bg-[#0d2638]">
                    <h3 className="text-2xl font-bold text-white mb-2">Максим Викторович Афанасьев</h3>
                    <p className="text-gray-400 text-sm mb-6 uppercase tracking-wider font-bold">Глава города Тюмень</p>
                    <p className="text-white text-lg leading-relaxed italic border-l-4 border-yellow-400 pl-6">
                        “Цифровые технологии - это не будущее, это настоящее нашего города. Мы активно внедряем инновации, чтобы сделать жизнь горожан комфортнее и доступнее”
                    </p>
                </div>
            </div>

            {/* Сетка 6 человек */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-12 mb-24">
                {members.map((m) => (
                    <div key={m.id} className="group flex flex-col">
                        <div className="aspect-square bg-[#122e41] mb-4 overflow-hidden">
                            <img src={m.imageUrl} className="w-full h-full object-cover" alt="" />
                        </div>
                        <h4 className="font-bold text-white text-[15px] leading-tight mb-1">{m.name}</h4>
                        <p className="text-gray-400 text-[13px] leading-tight">{m.role}</p>
                    </div>
                ))}
            </div>

            {/* Задачи совета */}
            <section>
                <h2 className="text-3xl font-bold text-white mb-10">Задачи совета</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-start">
                    {/* КАРТИНКА БЕЗ ОБВОДКИ И РАЗМЫТИЯ */}
                    <div className="rounded-2xl overflow-hidden h-[600px] hidden md:block relative">
                         <img src="https://i.postimg.cc/288V8T7d/d.png" className="w-full h-full object-cover" alt="" />
                    </div>
                    <div className="flex flex-col gap-10">
                        {COUNCIL_TASKS.map((task, i) => (
                            <div key={i} className="flex gap-6 group">
                                <TaskIcon name={task.icon} />
                                <div>
                                    <h4 className="text-white font-bold text-base mb-1">{task.title}</h4>
                                    <p className="text-gray-500 text-sm">{task.subtitle}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>
        </div>
    );
};