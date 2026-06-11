import React, { useEffect, useState } from 'react';
import { InitiativesShowcase } from './InitiativesShowcase';
import { InitiativeModal } from './InitiativeModal';
import { ManagementSection } from './ManagementSection';
import { fetchInitiativeStats } from '../services/initiativeService';

interface CitizenInitiativesSectionProps {
  onNavigate: (page: string, tab?: string) => void;
}

export const CitizenInitiativesSection: React.FC<CitizenInitiativesSectionProps> = ({
  onNavigate,
}) => {
  const [modalOpen, setModalOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [stats, setStats] = useState({ total: 0, completed: 0 });
  const [statsLoading, setStatsLoading] = useState(true);

  const loadStats = () => {
    setStatsLoading(true);
    void fetchInitiativeStats()
      .then(setStats)
      .catch(() => setStats({ total: 0, completed: 0 }))
      .finally(() => setStatsLoading(false));
  };

  useEffect(() => {
    loadStats();
  }, [refreshKey]);

  return (
    <>
      <ManagementSection
        onOpenSubmit={() => setModalOpen(true)}
        totalProposals={stats.total}
        completedCount={stats.completed}
        statsLoading={statsLoading}
      />
      <InitiativesShowcase key={refreshKey} onNavigate={onNavigate} />
      <InitiativeModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onNavigate={onNavigate}
        onSubmitted={() => {
          setRefreshKey((k) => k + 1);
          loadStats();
        }}
      />
    </>
  );
};
