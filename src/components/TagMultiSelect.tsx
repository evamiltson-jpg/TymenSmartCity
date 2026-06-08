import React, { useMemo, useState } from 'react';

interface TagMultiSelectProps {
  label: string;
  hint?: string;
  placeholder?: string;
  presets: readonly string[];
  values: string[];
  onChange: (values: string[]) => void;
}

const inputClass =
  'w-full bg-[#0b2234] border border-white/10 rounded-lg px-4 py-3 text-white focus:border-yellow-500 outline-none transition-all';

export const TagMultiSelect: React.FC<TagMultiSelectProps> = ({
  label,
  hint,
  placeholder = 'Добавить свой вариант...',
  presets,
  values,
  onChange,
}) => {
  const [customInput, setCustomInput] = useState('');
  const [showList, setShowList] = useState(false);

  const availablePresets = useMemo(
    () => presets.filter((item) => !values.includes(item)),
    [presets, values],
  );

  const addValue = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed || values.includes(trimmed)) return;
    onChange([...values, trimmed]);
    setCustomInput('');
  };

  const removeValue = (value: string) => onChange(values.filter((item) => item !== value));

  return (
    <div className="mb-6">
      <div className="flex flex-wrap items-center gap-2 mb-2">
        <label className="text-white font-bold text-sm">{label}</label>
        {hint && <span className="text-xs text-gray-500">— {hint}</span>}
      </div>

      <div className="flex flex-wrap gap-2 mb-3">
        {values.map((value) => (
          <span
            key={value}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-yellow-500/15 text-yellow-100 text-sm border border-yellow-500/30"
          >
            {value}
            <button type="button" onClick={() => removeValue(value)} className="text-yellow-200/70 hover:text-white">
              ×
            </button>
          </span>
        ))}
        {values.length === 0 && <span className="text-sm text-gray-500">Пока ничего не выбрано</span>}
      </div>

      <div className="flex flex-wrap gap-2 mb-3">
        <button
          type="button"
          onClick={() => setShowList((value) => !value)}
          className="px-4 py-2 rounded-lg text-sm font-medium bg-white/5 text-white border border-white/10 hover:bg-white/10"
        >
          {showList ? 'Скрыть список' : 'Выбрать из списка'}
        </button>
      </div>

      {showList && (
        <div className="mb-3 max-h-40 overflow-y-auto rounded-xl border border-white/10 bg-[#0b2234] p-2 flex flex-wrap gap-2">
          {availablePresets.length === 0 ? (
            <span className="text-xs text-gray-500 p-2">Все варианты из списка уже добавлены</span>
          ) : (
            availablePresets.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => addValue(item)}
                className="px-3 py-1.5 rounded-lg text-xs bg-white/5 text-gray-200 hover:bg-yellow-500/20 hover:text-yellow-100 border border-white/10"
              >
                + {item}
              </button>
            ))
          )}
        </div>
      )}

      <div className="flex gap-2">
        <input
          value={customInput}
          onChange={(e) => setCustomInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              addValue(customInput);
            }
          }}
          type="text"
          placeholder={placeholder}
          className={inputClass}
        />
        <button
          type="button"
          onClick={() => addValue(customInput)}
          className="shrink-0 px-4 py-2 rounded-lg text-yellow-400 hover:text-white text-sm border border-yellow-500/30"
        >
          Добавить
        </button>
      </div>
    </div>
  );
};
