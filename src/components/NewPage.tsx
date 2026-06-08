import React from 'react';

interface NewPageProps {
  onNavigate: (page: string) => void;
  title: string;
  content: string;
}

export const NewPage: React.FC<NewPageProps> = ({ onNavigate, title, content }) => {
  return (
    <main className="py-16 md:py-24 text-white min-h-[60vh] flex flex-col justify-center">
      <h1 className="font-serif text-4xl md:text-6xl font-bold mb-8">{title}</h1>
      <p className="mb-10 text-lg text-gray-300 max-w-3xl">
        {content}
      </p>
      <button
        onClick={() => onNavigate('home')}
        className="bg-yellow-400 hover:bg-yellow-500 text-gray-800 font-bold py-3 px-6 rounded-md transition-colors self-start"
      >
        Вернуться на главную
      </button>
    </main>
  );
};