import React from 'react';

interface InfoModalProps {
  data: {
    title: string;
    desc: string;
    category: string;
    image: string;
    status?: string;
    buttonText?: string;
    isService?: boolean;
    url?: string;
    link?: string;
  };
  onClose: () => void;
  onNavigate?: (page: string) => void;
}

export const InfoModal: React.FC<InfoModalProps> = ({ data, onClose, onNavigate }) => {
  if (!data) return null;

  const externalUrl = data.url || data.link;

  const handleButtonClick = () => {
    if (externalUrl && /^https?:\/\//i.test(externalUrl)) {
      window.open(externalUrl, '_blank', 'noopener,noreferrer');
      return;
    }
    if (data.isService && onNavigate) {
      onClose();
      onNavigate('services');
      return;
    }
    if (!data.isService && onNavigate) {
      onClose();
      onNavigate('projects');
    }
  };

  return (
    <div
      className="fixed inset-0 z-[300] flex animate-in fade-in items-center justify-center bg-black/80 p-4 backdrop-blur-md duration-300"
      onClick={onClose}
    >
      <div
        className="relative flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-[40px] border border-white/10 bg-[#122e41] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-6 top-6 z-10 flex h-10 w-10 cursor-pointer items-center justify-center rounded-full bg-black/40 text-2xl font-light text-white transition-all hover:bg-yellow-400 hover:text-black"
        >
          &times;
        </button>

        <div className="relative h-64 shrink-0 overflow-hidden sm:h-72">
          <img
            src={data.image}
            className="h-full w-full object-cover"
            alt={data.title}
            onError={(e) => {
              e.currentTarget.src =
                'https://images.unsplash.com/photo-1449824913935-59a10b8d2000?q=80&w=800';
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#122e41] via-[#122e41]/20 to-transparent" />
          <div className="absolute bottom-8 left-8 pr-8 sm:left-10">
            <span
              className={`mb-4 inline-block rounded-lg px-3 py-1 text-[10px] font-black uppercase tracking-widest shadow-lg ${
                data.isService ? 'bg-sky-400 text-black' : 'bg-yellow-400 text-black'
              }`}
            >
              {data.category}
            </span>
            <h2 className="text-3xl font-bold leading-none tracking-tighter text-white drop-shadow-md sm:text-5xl">
              {data.title}
            </h2>
          </div>
        </div>

        <div className="custom-scrollbar flex flex-col overflow-y-auto p-8 sm:p-10">
          <p className="mb-10 whitespace-pre-wrap text-lg font-medium leading-relaxed text-gray-300">
            {data.desc}
          </p>

          <div className="mt-auto flex flex-col items-center justify-between gap-6 border-t border-white/5 pt-8 sm:flex-row">
            {!data.isService && data.status && (
              <div className="text-center sm:text-left">
                <p className="mb-1 text-[10px] font-black uppercase tracking-widest text-gray-500">
                  Статус проекта
                </p>
                <p className="text-lg font-bold text-white">{data.status}</p>
              </div>
            )}

            {data.isService && (
              <div className="text-center sm:text-left">
                <p className="mb-1 text-[10px] font-black uppercase tracking-widest text-gray-500">
                  Тип доступа
                </p>
                <p className="text-lg font-bold text-sky-400">Госуслуги / Муниципальный</p>
              </div>
            )}

            <button
              type="button"
              onClick={handleButtonClick}
              className={`w-full rounded-2xl px-10 py-4 text-xs font-black uppercase tracking-[0.2em] shadow-xl transition-all active:scale-95 sm:w-auto ${
                data.isService
                  ? 'bg-sky-500 text-white hover:bg-sky-400'
                  : 'bg-yellow-400 text-black hover:bg-yellow-500'
              }`}
            >
              {data.buttonText || (data.isService ? 'Перейти к сервису' : 'Подать заявку')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
