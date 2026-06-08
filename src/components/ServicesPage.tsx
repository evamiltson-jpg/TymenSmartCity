// components/ServicesPage.tsx
import React, { useEffect, useMemo, useState } from 'react';
import { SERVICES_LIST } from '../constants';
import { ServiceItem } from '../types';

interface ServicesPageProps {
  hideHeader?: boolean;
}

export const ServicesPage: React.FC<ServicesPageProps> = ({ hideHeader = false }) => {
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCat, setActiveCat] = useState("Все");
  const [categories, setCategories] = useState<string[]>(["Все"]);

  const fallbackImage = 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=800&h=480&fit=crop';

  const normalizeService = (service: any, index: number): ServiceItem => {
    const rawUrl = String(service?.url || '').trim();
    const safeUrl = /^https?:\/\//i.test(rawUrl) ? rawUrl : '#';

    return {
      id: service?.id ?? index + 1,
      title: service?.title || 'Без названия',
      category: service?.category || 'Другое',
      description: service?.description || service?.desc || '',
      imageUrl: service?.imageUrl || service?.image_url || fallbackImage,
      buttonText: service?.buttonText || service?.button_text || 'Подробнее',
      url: safeUrl,
    };
  };

  const getServiceUrl = (service: ServiceItem) => {
    return service.url || '#';
  };

  useEffect(() => {
    const initialLocalData = SERVICES_LIST.map(normalizeService);
    setServices(initialLocalData);
    setCategories(['Все', ...new Set(initialLocalData.map((s) => s.category))]);
    setLoading(false);
  }, []);

  const filtered = useMemo(() => (
    activeCat === "Все"
      ? services
      : services.filter((service) => service.category === activeCat)
  ), [activeCat, services]);

  return (
    <main className={`${hideHeader ? 'py-4' : 'py-12'} animate-in fade-in duration-700`}>
      
      {!hideHeader && (
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-10 gap-6">
          <div>
            <h1 className="text-4xl font-bold mb-3 tracking-tight">Цифровые сервисы Тюмени</h1>
            <p className="text-gray-400 font-medium">Готовые государственные и муниципальные инструменты для жизни в городе</p>
          </div>
          <div className="text-right hidden md:block">
              <span className="text-yellow-400 font-black text-3xl">{services.length}</span>
              <p className="text-[10px] text-gray-500 uppercase font-bold tracking-widest">Активных сервисов</p>
          </div>
        </div>
      )}
      
      <div className="flex flex-wrap gap-3 mb-12">
        {categories.map(cat => (
          <button 
            key={cat}
            onClick={() => setActiveCat(cat)}
            className={`px-6 py-2.5 rounded-xl font-bold text-sm transition-all border ${
              activeCat === cat 
                ? 'bg-yellow-400 text-black border-yellow-400' 
                : 'bg-white/5 text-gray-400 border-white/5 hover:border-white/20'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
        {loading ? (
           [1, 2, 3, 4].map(i => <div key={i} className="bg-[#122e41] h-80 rounded-[32px] animate-pulse border border-white/5"></div>)
        ) : filtered.length > 0 ? (
          filtered.map(service => {
            const serviceUrl = getServiceUrl(service);

            return (
              <div key={service.id} className="bg-[#122e41] rounded-[32px] border border-white/5 hover:border-yellow-400/30 transition-all group overflow-hidden flex flex-col shadow-2xl">
                <div className="h-44 relative overflow-hidden bg-gray-800">
                  <img 
                    src={service.imageUrl || fallbackImage}
                    alt={service.title}
                    loading="lazy"
                    decoding="async"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = fallbackImage;
                    }}
                    className="w-full h-full object-cover grayscale-[0.5] group-hover:grayscale-0 group-hover:scale-110 transition-all duration-700" 
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#122e41] to-transparent"></div>
                </div>
                <div className="p-7 flex flex-col flex-grow">
                  <h3 className="text-xl font-bold mb-2 group-hover:text-yellow-400 transition-colors">{service.title}</h3>
                  <p className="text-gray-400 text-sm mb-6 line-clamp-3 flex-grow">{service.description || service.desc}</p>
                  <a
                    href={serviceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-disabled={serviceUrl === '#'}
                    onClick={(e) => {
                      if (serviceUrl === '#') e.preventDefault();
                    }}
                    className="w-full inline-flex justify-center bg-yellow-400/10 hover:bg-yellow-400 text-yellow-400 hover:text-black py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all"
                  >
                    {service.buttonText || service.button_text || 'Подробнее'}
                  </a>
                </div>
              </div>
            );
          })
        ) : (
          <div className="col-span-full text-center py-12">
            <p className="text-gray-400">Нет доступных сервисов</p>
          </div>
        )}
      </div>
    </main>
  );
};