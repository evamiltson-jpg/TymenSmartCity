
import React from 'react';
import { FOOTER_LINKS } from '../constants';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-[#063553] pt-24 pb-12 text-white border-t border-white/5">
      <div className="page-container">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-12 mb-20">
          {Object.entries(FOOTER_LINKS).map(([title, links]) => (
            <div key={title}>
              <h4 className="font-bold text-gray-400 mb-6 uppercase text-xs tracking-widest">{title}</h4>
              <ul className="space-y-4">
                {links.map((link) => (
                  <li key={link}>
                    <a href="#" className="text-white/70 hover:text-yellow-400 text-sm transition-colors">
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="border-t border-white/10 pt-10 flex flex-col md:flex-row justify-between items-center text-[10px] text-gray-500 uppercase tracking-widest font-bold">
          <div className="flex flex-wrap items-center gap-x-8 gap-y-4 mb-8 md:mb-0">
            <p>© Smart City Tyumen, 2025</p>
            <a href="#" className="hover:text-white transition-colors">Политика конфиденциальности</a>
            <a href="#" className="hover:text-white transition-colors">Сообщить о нарушениях: +7-111-111-11-11</a>
            <a href="#" className="hover:text-white transition-colors">Написать нам</a>
          </div>
          <div className="flex items-center space-x-6 grayscale opacity-50">
             <a href="#" className="hover:grayscale-0 transition-all"><img src="https://i.postimg.cc/KvRB03jT/icons8_vk_50.png" alt="VK" className="h-5 w-5 invert" /></a>
             <a href="#" className="hover:grayscale-0 transition-all"><img src="https://i.postimg.cc/nLM1Hyzc/icons8-telegram-50.png" alt="TG" className="h-5 w-5 invert" /></a>
          </div>
        </div>
      </div>
    </footer>
  );
};
