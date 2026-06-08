
import React, { useState } from 'react';
import { ManagementCouncilPage } from './ManagementCouncilPage';
import { WorkingCommitteePage } from './WorkingCommitteePage';
import { MonitoringGroupPage } from './MonitoringGroupPage';

export const SmartCityLayout: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'council' | 'committee' | 'monitoring'>('council');

  return (
    <div className="animate-in fade-in duration-500">
      {/* Sub Navigation */}
      <div className="mb-10 border-b border-white/10">
        <div className="flex flex-col md:flex-row gap-4 md:gap-12 pb-4">
          <button
            onClick={() => setActiveTab('council')}
            className={`text-lg font-bold transition-all ${
              activeTab === 'council' ? 'text-white' : 'text-gray-400 hover:text-white'
            }`}
          >
            Совет умного города
          </button>
          <button
            onClick={() => setActiveTab('committee')}
            className={`text-lg font-bold transition-all ${
              activeTab === 'committee' ? 'text-white' : 'text-gray-400 hover:text-white'
            }`}
          >
            Рабочий комитет
          </button>
          <button
            onClick={() => setActiveTab('monitoring')}
            className={`text-lg font-bold transition-all ${
              activeTab === 'monitoring' ? 'text-white' : 'text-gray-400 hover:text-white'
            }`}
          >
            Мониторинговая группа
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="min-h-[60vh]">
        {activeTab === 'council' && <ManagementCouncilPage />}
        {activeTab === 'committee' && <WorkingCommitteePage />}
        {activeTab === 'monitoring' && <MonitoringGroupPage />}
      </div>
    </div>
  );
};
