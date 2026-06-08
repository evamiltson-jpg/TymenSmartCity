
import React from 'react';
import { RESOURCES } from '../constants';
import { Resource } from '../types';

const ResourceCard: React.FC<{ resource: Resource }> = ({ resource }) => (
  <div className="bg-[#1e3a4c] rounded-lg p-6 flex flex-col items-center justify-center text-center h-40">
    {typeof resource.icon === 'string' ? (
      <img src={resource.icon} alt={resource.name} className="w-12 h-12 mb-3 object-contain" />
    ) : (
      <div className="mb-3">{resource.icon}</div>
    )}
    <p className="text-sm font-medium">{resource.name}</p>
  </div>
);

export const ResourcesSection: React.FC = () => {
  return (
    <section className="py-16 md:py-24">
      <h2 className="font-serif text-4xl md:text-5xl font-bold mb-10 text-center">Полезные ресурсы</h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 gap-6">
        {RESOURCES.map((resource) => (
          <ResourceCard key={resource.id} resource={resource} />
        ))}
      </div>
    </section>
  );
};
