import React, { createContext, useContext, useState } from 'react';

type Lang = 'ru' | 'en';

interface LangCtx {
  lang: Lang;
  toggle: () => void;
  setLang: (l: Lang) => void;
}

const LanguageContext = createContext<LangCtx>({
  lang: 'ru',
  toggle: () => {},
  setLang: () => {}
});

export const LanguageProvider: React.FC<{children: React.ReactNode}> = ({ children }) => {
  const [lang, setLang] = useState<Lang>('ru');
  const toggle = () => setLang(l => (l === 'ru' ? 'en' : 'ru'));
  return (
    <LanguageContext.Provider value={{ lang, toggle, setLang }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => useContext(LanguageContext);

export default LanguageContext;
