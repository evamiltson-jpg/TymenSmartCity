import React, { useState } from 'react';
import { InitiativesShowcase } from './InitiativesShowcase';
import { InitiativeModal } from './InitiativeModal';
import { ManagementSection } from './ManagementSection';

interface CitizenInitiativesSectionProps {
  onNavigate: (page: string, tab?: string) => void;
}

export const CitizenInitiativesSection: React.FC<CitizenInitiativesSectionProps> = ({
  onNavigate,
}) => {
  const [modalOpen, setModalOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <>
      <ManagementSection onOpenSubmit={() => setModalOpen(true)} />
      <InitiativesShowcase
        key={refreshKey}
        onNavigate={onNavigate}
        onOpenSubmit={() => setModalOpen(true)}
      />
      <InitiativeModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onNavigate={onNavigate}
        onSubmitted={() => setRefreshKey((k) => k + 1)}
      />
    </>
  );
};
