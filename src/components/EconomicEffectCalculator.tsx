import React, { useMemo, useState } from 'react';

interface EconomicEffectCalculatorProps {
  onApply: (value: number) => void;
  onClose: () => void;
}

type ScenarioId = 'service' | 'cost' | 'education' | 'social' | 'custom';

const SCENARIOS: Array<{
  id: ScenarioId;
  title: string;
  description: string;
  tip: string;
  modules: Array<'time' | 'money' | 'revenue' | 'social'>;
}> = [
  {
    id: 'service',
    title: 'Цифровой сервис',
    description: 'Приложение, сайт или сервис для пользователей.',
    tip: 'Подходит, если проект экономит время людям или заменяет ручные действия.',
    modules: ['time', 'money'],
  },
  {
    id: 'cost',
    title: 'Снижение затрат',
    description: 'Оптимизация процессов, закупок, логистики.',
    tip: 'Считайте, сколько рублей в месяц перестанете тратить после внедрения.',
    modules: ['money'],
  },
  {
    id: 'education',
    title: 'Образовательный продукт',
    description: 'Курсы, тренажёры, студенческие платформы.',
    tip: 'Можно оценить ценность через количество обучающихся и условную стоимость альтернативы.',
    modules: ['time', 'revenue'],
  },
  {
    id: 'social',
    title: 'Социальный / экологический',
    description: 'Польза для города, экологии, сообщества.',
    tip: 'Социальный эффект часто считают в условных рублях: сколько стоило бы решить проблему иначе.',
    modules: ['social', 'money'],
  },
  {
    id: 'custom',
    title: 'Свой расчёт',
    description: 'Вы сами выбираете, какие блоки учитывать.',
    tip: 'Включайте только те модули, которые реально относятся к вашему проекту.',
    modules: [],
  },
];

const formatRub = (value: number) =>
  new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 }).format(value);

const ModuleToggle: React.FC<{
  checked: boolean;
  onChange: (value: boolean) => void;
  title: string;
  tip: string;
}> = ({ checked, onChange, title, tip }) => (
  <label className="flex gap-3 rounded-xl border border-white/10 bg-[#0b2234] p-4 cursor-pointer hover:border-yellow-500/30 transition-colors">
    <input
      type="checkbox"
      checked={checked}
      onChange={(e) => onChange(e.target.checked)}
      className="mt-1 rounded border-white/20"
    />
    <div>
      <p className="text-white font-medium text-sm">{title}</p>
      <p className="text-xs text-gray-400 mt-1 leading-relaxed">{tip}</p>
    </div>
  </label>
);

export const EconomicEffectCalculator: React.FC<EconomicEffectCalculatorProps> = ({ onApply, onClose }) => {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [scenario, setScenario] = useState<ScenarioId>('service');

  const [useTime, setUseTime] = useState(true);
  const [useMoney, setUseMoney] = useState(true);
  const [useRevenue, setUseRevenue] = useState(false);
  const [useSocial, setUseSocial] = useState(false);

  const [beneficiaries, setBeneficiaries] = useState('100');
  const [hoursSaved, setHoursSaved] = useState('1');
  const [hourlyValue, setHourlyValue] = useState('250');
  const [monthlySavings, setMonthlySavings] = useState('10000');
  const [monthlyRevenue, setMonthlyRevenue] = useState('0');
  const [socialUnitValue, setSocialUnitValue] = useState('500');
  const [socialUnits, setSocialUnits] = useState('0');
  const [implementationCost, setImplementationCost] = useState('0');
  const [effectMonths, setEffectMonths] = useState('12');

  const applyScenario = (id: ScenarioId) => {
    setScenario(id);
    const selected = SCENARIOS.find((item) => item.id === id);
    if (!selected || id === 'custom') return;
    setUseTime(selected.modules.includes('time'));
    setUseMoney(selected.modules.includes('money'));
    setUseRevenue(selected.modules.includes('revenue'));
    setUseSocial(selected.modules.includes('social'));
  };

  const result = useMemo(() => {
    const months = Math.max(1, Number(effectMonths) || 12);
    const implCost = Math.max(0, Number(implementationCost) || 0);

    const timeAnnual = useTime
      ? Math.max(0, Number(beneficiaries) || 0) *
        Math.max(0, Number(hoursSaved) || 0) *
        Math.max(0, Number(hourlyValue) || 0) *
        12
      : 0;

    const moneyAnnual = useMoney ? Math.max(0, Number(monthlySavings) || 0) * 12 : 0;
    const revenueAnnual = useRevenue ? Math.max(0, Number(monthlyRevenue) || 0) * 12 : 0;
    const socialAnnual = useSocial
      ? Math.max(0, Number(socialUnits) || 0) * Math.max(0, Number(socialUnitValue) || 0) * 12
      : 0;

    const grossAnnual = timeAnnual + moneyAnnual + revenueAnnual + socialAnnual;
    const totalEffect = (grossAnnual / 12) * months - implCost;

    return {
      months,
      timeAnnual,
      moneyAnnual,
      revenueAnnual,
      socialAnnual,
      grossAnnual,
      totalEffect,
    };
  }, [
    beneficiaries,
    hoursSaved,
    hourlyValue,
    monthlySavings,
    monthlyRevenue,
    socialUnitValue,
    socialUnits,
    implementationCost,
    effectMonths,
    useTime,
    useMoney,
    useRevenue,
    useSocial,
  ]);

  const inputClass = 'w-full bg-[#0b2234] border border-white/10 rounded-lg px-3 py-2 text-white text-sm';

  return (
    <div
      className="fixed inset-0 z-[1100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
      onClick={onClose}
    >
      <div
        className="bg-[#122e41] border border-white/10 w-full max-w-3xl max-h-[92vh] rounded-[24px] overflow-hidden shadow-2xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 border-b border-white/10">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-widest text-yellow-400 font-bold mb-1">Шаг {step} из 3</p>
              <h3 className="text-xl font-bold text-white">Калькулятор экономического эффекта</h3>
              <p className="text-sm text-gray-400 mt-1">
                Мини-обучение: выберите шаблон, включите нужные блоки и получите ориентир для поля «Экономический эффект».
              </p>
            </div>
            <button type="button" onClick={onClose} className="text-gray-400 hover:text-white text-2xl leading-none">
              ×
            </button>
          </div>
        </div>

        <div className="p-6 overflow-y-auto space-y-5">
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-100 leading-relaxed">
            Это <strong>примерная</strong> оценка для студенческих и пилотных проектов. Используйте результат как
            ориентир для заявки, а не как официальный финансовый расчёт.
          </div>

          {step === 1 && (
            <div className="space-y-3">
              <p className="text-sm text-gray-300 font-medium">1. Выберите тип проекта — мы подскажем, что считать</p>
              {SCENARIOS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => applyScenario(item.id)}
                  className={`w-full text-left rounded-xl border p-4 transition-all ${
                    scenario === item.id
                      ? 'border-yellow-400 bg-yellow-500/10 ring-1 ring-yellow-400/30'
                      : 'border-white/10 bg-[#0b2234] hover:border-white/20'
                  }`}
                >
                  <p className="text-white font-semibold">{item.title}</p>
                  <p className="text-sm text-gray-400 mt-1">{item.description}</p>
                  <p className="text-xs text-sky-200/80 mt-2">💡 {item.tip}</p>
                </button>
              ))}
            </div>
          )}

          {step === 2 && (
            <div className="space-y-3">
              <p className="text-sm text-gray-300 font-medium">2. Включите только те блоки, которые подходят вашему проекту</p>
              <ModuleToggle
                checked={useTime}
                onChange={setUseTime}
                title="Экономия времени"
                tip="Если сервис ускоряет действия пользователей. Пример: 100 человек × 1 час/мес × 250 ₽."
              />
              <ModuleToggle
                checked={useMoney}
                onChange={setUseMoney}
                title="Прямая экономия денег"
                tip="Если проект снижает расходы: меньше бумаги, поездок, ручного труда, штрафов и т.д."
              />
              <ModuleToggle
                checked={useRevenue}
                onChange={setUseRevenue}
                title="Дополнительный доход"
                tip="Если продукт может приносить выручку: подписка, продажи, платные услуги."
              />
              <ModuleToggle
                checked={useSocial}
                onChange={setUseSocial}
                title="Социальный / экологический эффект"
                tip="Условная оценка пользы: например, 1 тонна CO₂ = X ₽, или 1 решённая проблема = X ₽."
              />
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <p className="text-sm text-gray-300 font-medium">3. Заполните только включённые блоки</p>

              {useTime && (
                <div className="rounded-xl border border-white/10 p-4 space-y-3">
                  <p className="text-white text-sm font-semibold">Экономия времени</p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <label className="block">
                      <span className="text-xs text-gray-400 mb-1 block">Сколько людей получит пользу</span>
                      <input className={inputClass} value={beneficiaries} onChange={(e) => setBeneficiaries(e.target.value)} />
                    </label>
                    <label className="block">
                      <span className="text-xs text-gray-400 mb-1 block">Экономия времени (ч/мес на человека)</span>
                      <input className={inputClass} value={hoursSaved} onChange={(e) => setHoursSaved(e.target.value)} />
                    </label>
                    <label className="block">
                      <span className="text-xs text-gray-400 mb-1 block">Ценность часа (₽)</span>
                      <input className={inputClass} value={hourlyValue} onChange={(e) => setHourlyValue(e.target.value)} />
                    </label>
                  </div>
                </div>
              )}

              {useMoney && (
                <div className="rounded-xl border border-white/10 p-4">
                  <p className="text-white text-sm font-semibold mb-2">Прямая экономия</p>
                  <label className="block">
                    <span className="text-xs text-gray-400 mb-1 block">Экономия в месяц (₽)</span>
                    <input className={inputClass} value={monthlySavings} onChange={(e) => setMonthlySavings(e.target.value)} />
                  </label>
                </div>
              )}

              {useRevenue && (
                <div className="rounded-xl border border-white/10 p-4">
                  <p className="text-white text-sm font-semibold mb-2">Дополнительный доход</p>
                  <label className="block">
                    <span className="text-xs text-gray-400 mb-1 block">Доход в месяц (₽)</span>
                    <input className={inputClass} value={monthlyRevenue} onChange={(e) => setMonthlyRevenue(e.target.value)} />
                  </label>
                </div>
              )}

              {useSocial && (
                <div className="rounded-xl border border-white/10 p-4 space-y-3">
                  <p className="text-white text-sm font-semibold">Социальный эффект</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <label className="block">
                      <span className="text-xs text-gray-400 mb-1 block">Единиц эффекта в месяц</span>
                      <input className={inputClass} value={socialUnits} onChange={(e) => setSocialUnits(e.target.value)} />
                    </label>
                    <label className="block">
                      <span className="text-xs text-gray-400 mb-1 block">Условная ценность 1 единицы (₽)</span>
                      <input className={inputClass} value={socialUnitValue} onChange={(e) => setSocialUnitValue(e.target.value)} />
                    </label>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="block">
                  <span className="text-xs text-gray-400 mb-1 block">Затраты на внедрение (₽)</span>
                  <input className={inputClass} value={implementationCost} onChange={(e) => setImplementationCost(e.target.value)} />
                </label>
                <label className="block">
                  <span className="text-xs text-gray-400 mb-1 block">Срок эффекта (мес)</span>
                  <input className={inputClass} value={effectMonths} onChange={(e) => setEffectMonths(e.target.value)} />
                </label>
              </div>

              <div className="rounded-xl border border-white/10 bg-[#0b2234] p-4 space-y-2 text-sm">
                {useTime && (
                  <div className="flex justify-between text-gray-300">
                    <span>Экономия времени / год</span>
                    <span>{formatRub(result.timeAnnual)}</span>
                  </div>
                )}
                {useMoney && (
                  <div className="flex justify-between text-gray-300">
                    <span>Прямая экономия / год</span>
                    <span>{formatRub(result.moneyAnnual)}</span>
                  </div>
                )}
                {useRevenue && (
                  <div className="flex justify-between text-gray-300">
                    <span>Доход / год</span>
                    <span>{formatRub(result.revenueAnnual)}</span>
                  </div>
                )}
                {useSocial && (
                  <div className="flex justify-between text-gray-300">
                    <span>Социальный эффект / год</span>
                    <span>{formatRub(result.socialAnnual)}</span>
                  </div>
                )}
                <div className="flex justify-between text-yellow-400 font-bold text-base pt-2 border-t border-white/10">
                  <span>Итого за {result.months} мес.</span>
                  <span>{formatRub(Math.max(0, Math.round(result.totalEffect)))}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="p-6 border-t border-white/10 flex justify-between gap-3">
          <button
            type="button"
            onClick={() => {
              if (step === 1) onClose();
              else setStep((value) => (value - 1) as 1 | 2 | 3);
            }}
            className="px-5 py-2 rounded-lg border border-white/10 text-gray-300 hover:text-white"
          >
            {step === 1 ? 'Закрыть' : 'Назад'}
          </button>

          <div className="flex gap-3">
            {step < 3 ? (
              <button
                type="button"
                onClick={() => setStep((value) => (value + 1) as 1 | 2 | 3)}
                className="px-5 py-2 rounded-lg bg-yellow-500 text-black font-bold hover:bg-yellow-600"
              >
                Далее
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  onApply(Math.max(0, Math.round(result.totalEffect)));
                  onClose();
                }}
                className="px-5 py-2 rounded-lg bg-yellow-500 text-black font-bold hover:bg-yellow-600"
              >
                Подставить в форму
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
