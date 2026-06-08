
import React, { useEffect, useState } from 'react';
import { ApiService } from '../services/api';
import { Member } from '../types';

export const MonitoringGroupPage: React.FC = () => {
    const [members, setMembers] = useState<Member[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        ApiService.getManagementStructure().then(data => {
            setMembers(data.monitoring);
            setLoading(false);
        });
    }, []);

    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
            <h2 className="text-3xl font-bold text-white mb-10">Мониторинговая группа</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
                {loading ? [1,2].map(i => <div key={i} className="aspect-square bg-white/5 animate-pulse"></div>) :
                members.map((m) => (
                    <div key={m.id} className="group">
                        <div className="aspect-square bg-gray-300 mb-4 overflow-hidden grayscale group-hover:grayscale-0 transition-all duration-500">
                             <img src={m.imageUrl} className="w-full h-full object-cover" alt={m.name} />
                        </div>
                        <h4 className="font-bold text-white text-lg leading-tight mb-2">{m.name}</h4>
                        <p className="text-gray-400 text-sm">{m.role}</p>
                    </div>
                ))}
            </div>
        </div>
    );
};
