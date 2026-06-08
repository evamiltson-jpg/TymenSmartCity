const translations: any = {
  ru: {
    header: {
      line1: 'Город, где',
      line2: 'технологии начинают путь'
    },
    projects: {
      title: 'Цифровые проекты города',
      subtitle: 'Инновационные разработки тюменских команд в реальном времени',
      categories: ['Все','Транспорт','Экология','Безопасность','ЖКХ','Здравоохранение','Образование','Управление']
    },
    news: {
      categories: ['Все','Технологии','Город','События','Инновации']
    }
  },
  en: {
    header: {
      line1: 'City where',
      line2: 'technologies begin their journey'
    },
    projects: {
      title: 'City digital projects',
      subtitle: 'Innovative developments of Tyumen teams in real time',
      categories: ['All','Transport','Ecology','Safety','Housing','Healthcare','Education','Governance']
    },
    news: {
      categories: ['All','Technology','City','Events','Innovation']
    }
  }
};

export function t(lang: 'ru'|'en', path: string) {
  const parts = path.split('.');
  let cur: any = translations[lang];
  for (const p of parts) {
    if (!cur) return '';
    cur = cur[p];
  }
  return cur ?? '';
}

export default translations;
