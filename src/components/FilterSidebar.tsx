
import React, { useState } from 'react';

interface FilterSidebarProps {
  categories: string[];
  activeCategory: string;
}

export const FilterSidebar: React.FC<FilterSidebarProps> = ({ categories, activeCategory }) => {
  const [current, setCurrent] = useState(activeCategory);

  return (
    <div className="bg-transparent h-full">
      <ul className="space-y-4">
        {categories.map((category) => (
          <li key={category}>
            <button
              onClick={() => setCurrent(category)}
              className={`text-left w-full text-base transition-colors font-medium ${
                current === category
                  ? 'text-sky-400 font-bold'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              {category}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
};
