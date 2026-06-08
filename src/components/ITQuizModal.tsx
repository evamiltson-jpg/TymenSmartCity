import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import {
  computeQuizResult,
  formatSkillScoreLabel,
  getScoreBarColor,
  getVerdictAccentClass,
  QUIZ_QUESTIONS,
  QuizOption,
} from '../data/itQuiz';
import {
  getQuizMeta,
  QuizResultPayload,
  saveQuizMeta,
  writePendingQuizResult,
} from '../utils/quizStorage';

interface ITQuizModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (page: string) => void;
}

export const ITQuizModal: React.FC<ITQuizModalProps> = ({ isOpen, onClose, onNavigate }) => {
  const { user, isAuthenticated, updateProfile } = useAuth();

  const [answers, setAnswers] = useState<QuizOption[][]>([]);
  const [selectedOptionIds, setSelectedOptionIds] = useState<string[]>([]);
  const [quizResult, setQuizResult] = useState<QuizResultPayload | null>(null);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error' | 'prompt_auth'>('idle');
  const [saveError, setSaveError] = useState('');

  const previousAttempt = useMemo(() => getQuizMeta(user?.id), [user?.id, isOpen]);
  const currentQuestionIndex = answers.length;
  const currentQuestion = QUIZ_QUESTIONS[currentQuestionIndex];

  useEffect(() => {
    if (!isOpen) return;
    setAnswers([]);
    setSelectedOptionIds([]);
    setQuizResult(null);
    setSaveStatus('idle');
    setSaveError('');
  }, [isOpen]);

  const persistResult = async (result: QuizResultPayload) => {
    const savedMeta = saveQuizMeta(user?.id, result);

    if (isAuthenticated && user) {
      setSaveStatus('saving');
      const response = await updateProfile({
        specialty: savedMeta.specialty,
        skills: [
          `Общий результат — ${savedMeta.overallScore}%`,
          ...savedMeta.skills,
        ],
        quiz_completed_at: savedMeta.completedAt,
        quiz_attempts: savedMeta.attempt || 1,
      });

      if (response.success) {
        setSaveStatus('saved');
      } else {
        setSaveStatus('error');
        setSaveError(response.error || 'Не удалось сохранить результат в профиль');
      }
      return;
    }

    writePendingQuizResult(savedMeta);
    setSaveStatus('prompt_auth');
  };

  const finishQuiz = async (finalAnswers: QuizOption[][]) => {
    const result = computeQuizResult(finalAnswers);
    setQuizResult(result);
    await persistResult(result);
  };

  const submitSingleAnswer = (option: QuizOption) => {
    const nextAnswers = [...answers, [option]];
    setAnswers(nextAnswers);
    setSelectedOptionIds([]);

    if (nextAnswers.length === QUIZ_QUESTIONS.length) {
      void finishQuiz(nextAnswers);
    }
  };

  const toggleMultiSelect = (optionId: string) => {
    const maxSelect = currentQuestion.maxSelect || currentQuestion.options.length;
    setSelectedOptionIds((prev) => {
      if (prev.includes(optionId)) {
        return prev.filter((id) => id !== optionId);
      }
      if (prev.length >= maxSelect) {
        return prev;
      }
      return [...prev, optionId];
    });
  };

  const submitMultiSelect = () => {
    const minSelect = currentQuestion.minSelect || 1;
    if (selectedOptionIds.length < minSelect) return;

    const selected = currentQuestion.options.filter((option) =>
      selectedOptionIds.includes(option.id),
    );
    const nextAnswers = [...answers, selected];
    setAnswers(nextAnswers);
    setSelectedOptionIds([]);

    if (nextAnswers.length === QUIZ_QUESTIONS.length) {
      void finishQuiz(nextAnswers);
    }
  };

  const handleBack = () => {
    if (quizResult) {
      setQuizResult(null);
      setSaveStatus('idle');
      setSaveError('');
      return;
    }
    if (answers.length > 0) {
      setAnswers(answers.slice(0, -1));
      setSelectedOptionIds([]);
    }
  };

  const handleClose = () => {
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div className="bg-[#122e41] border border-white/10 w-full max-w-3xl rounded-[32px] overflow-hidden shadow-2xl flex flex-col my-8">
        <div className="p-6 border-b border-white/5 flex justify-between items-center bg-[#0d2231]">
          <div>
            <h3 className="text-lg font-bold text-white">Определение ИТ-направления</h3>
            {previousAttempt && !quizResult && (
              <p className="text-[11px] text-yellow-400/80 mt-1">
                Тест уже проходили {previousAttempt.attempt} раз(а). Можно пройти снова.
              </p>
            )}
          </div>
          <button
            onClick={handleClose}
            className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-gray-400 hover:text-white transition-colors"
          >
            ✕
          </button>
        </div>

        <div className="p-8 flex-grow">
          {!quizResult ? (
            <div>
              <div className="flex justify-between items-center mb-6">
                <span className="text-xs font-black uppercase tracking-widest text-yellow-500">
                  Задача {currentQuestionIndex + 1} из {QUIZ_QUESTIONS.length}
                </span>
                <div className="h-1 w-40 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-yellow-400 transition-all duration-300"
                    style={{
                      width: `${((currentQuestionIndex + 1) / QUIZ_QUESTIONS.length) * 100}%`,
                    }}
                  />
                </div>
              </div>

              <h2 className="text-lg md:text-xl font-black mb-2 text-white leading-snug">
                {currentQuestion.text}
              </h2>
              <p className="text-xs md:text-sm text-gray-400 mb-6 leading-relaxed">
                {currentQuestion.description}
              </p>

              {currentQuestion.multiSelect ? (
                <>
                  <p className="text-xs text-sky-300 mb-4">
                    Выберите от {currentQuestion.minSelect || 1} до {currentQuestion.maxSelect || 3} вариантов
                  </p>
                  <div className="space-y-3">
                    {currentQuestion.options.map((option) => {
                      const isSelected = selectedOptionIds.includes(option.id);
                      return (
                        <button
                          key={option.id}
                          onClick={() => toggleMultiSelect(option.id)}
                          className={`w-full p-4 rounded-xl border text-left text-xs md:text-sm leading-relaxed transition-all ${
                            isSelected
                              ? 'bg-yellow-400/15 border-yellow-400/50 text-white'
                              : 'bg-white/5 hover:bg-yellow-400/10 border-white/5 hover:border-yellow-400/30 text-white/90'
                          }`}
                        >
                          {option.text}
                        </button>
                      );
                    })}
                  </div>
                  <button
                    onClick={submitMultiSelect}
                    disabled={selectedOptionIds.length < (currentQuestion.minSelect || 1)}
                    className="mt-6 w-full py-3.5 bg-yellow-400 hover:bg-yellow-500 disabled:bg-gray-600 disabled:text-gray-300 text-black rounded-xl font-black text-xs uppercase tracking-wider transition-colors"
                  >
                    Далее
                  </button>
                </>
              ) : (
                <div className="space-y-3">
                  {currentQuestion.options.map((option) => (
                    <button
                      key={option.id}
                      onClick={() => submitSingleAnswer(option)}
                      className="w-full p-4 rounded-xl bg-white/5 hover:bg-yellow-400/10 border border-white/5 hover:border-yellow-400/40 text-left text-xs md:text-sm leading-relaxed transition-all text-white/90 hover:text-white"
                    >
                      {option.text}
                    </button>
                  ))}
                </div>
              )}

              <div className="flex justify-between items-center mt-8 pt-4 border-t border-white/5">
                <button
                  onClick={handleBack}
                  disabled={currentQuestionIndex === 0}
                  className="px-4 py-2 text-xs font-bold text-gray-400 hover:text-white disabled:opacity-30 transition-colors"
                >
                  ← Назад
                </button>
                <button
                  onClick={handleClose}
                  className="px-4 py-2 text-xs font-bold text-red-400/80 hover:text-red-400 transition-colors"
                >
                  Выйти из теста
                </button>
              </div>
            </div>
          ) : (
            <div className="py-4 animate-in zoom-in-95 duration-500">
              <div className="text-center mb-8">
                <div className="text-5xl mb-4">
                  {(quizResult.overallScore ?? 0) >= 70 ? '🏆' : (quizResult.overallScore ?? 0) >= 40 ? '📊' : '💀'}
                </div>
                <p className="text-xs font-black uppercase tracking-widest text-yellow-500 mb-2">
                  Общий результат
                </p>
                <p className={`text-5xl font-black mb-2 ${
                  (quizResult.overallScore ?? 0) >= 50 ? 'text-yellow-400' : 'text-red-400'
                }`}>
                  {quizResult.overallScore ?? 0}%
                </p>
                <div className={`max-w-xl mx-auto mb-4 p-4 rounded-2xl border text-left ${getVerdictAccentClass(quizResult.verdictTone || 'mid')}`}>
                  <p className="font-black text-sm mb-1">{quizResult.verdictTitle}</p>
                  <p className="text-xs leading-relaxed opacity-90">{quizResult.verdictText}</p>
                  {quizResult.verdictRoast && (
                    <p className="text-xs mt-3 pt-3 border-t border-white/10 italic opacity-80">
                      {quizResult.verdictRoast}
                    </p>
                  )}
                </div>
                <p className="text-xs font-black uppercase tracking-widest text-gray-500 mb-1">
                  Рекомендуемая специализация
                </p>
                <h2 className="text-2xl md:text-3xl font-black text-white mb-3">{quizResult.specialty}</h2>
                <p className="text-sm text-gray-400 max-w-xl mx-auto">
                  Навыки оценены строго: слабые ответы и «мимо задачи» снижают баллы. Можно перепройти тест позже.
                </p>
              </div>

              <div className="space-y-4 max-w-xl mx-auto mb-8">
                {quizResult.skillScores.map((skill) => (
                  <div key={skill.name} className="bg-[#0d2231] border border-white/5 rounded-2xl p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-bold text-white">{skill.name}</span>
                      <span className={`text-xs font-black ${skill.score >= 50 ? 'text-yellow-400' : 'text-red-400'}`}>
                        {skill.score}% · {formatSkillScoreLabel(skill.score)}
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                      <div
                        className={`h-full bg-gradient-to-r ${getScoreBarColor(skill.score)} transition-all duration-700`}
                        style={{ width: `${skill.score}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="p-6 bg-[#0d2231] border border-white/5 rounded-2xl max-w-xl mx-auto text-center">
                {saveStatus === 'saving' && (
                  <p className="text-sm text-gray-300 font-bold">Сохраняем результат в профиль...</p>
                )}
                {saveStatus === 'saved' && (
                  <div className="space-y-4">
                    <p className="text-sm text-green-400 font-bold">
                      ✓ Результаты сохранены в личном кабинете. Попытка №{quizResult.attempt || 1}
                    </p>
                    <div className="flex flex-col sm:flex-row justify-center gap-3">
                      <button
                        onClick={() => {
                          handleClose();
                          onNavigate('profile');
                        }}
                        className="px-6 py-2.5 bg-white/10 hover:bg-white/20 text-white font-bold rounded-xl text-xs uppercase tracking-wider transition-colors"
                      >
                        Открыть профиль
                      </button>
                      <button
                        onClick={handleClose}
                        className="px-6 py-2.5 bg-yellow-400 hover:bg-yellow-500 text-black font-bold rounded-xl text-xs uppercase tracking-wider transition-colors"
                      >
                        Закрыть
                      </button>
                    </div>
                  </div>
                )}
                {saveStatus === 'error' && (
                  <div className="space-y-3">
                    <p className="text-sm text-red-400 font-bold">{saveError}</p>
                    <p className="text-xs text-gray-400">
                      Результат сохранен локально и будет перенесен после повторного входа.
                    </p>
                  </div>
                )}
                {saveStatus === 'prompt_auth' && (
                  <div>
                    <p className="text-sm text-yellow-400 font-bold mb-2">
                      Результат сохранен локально в браузере.
                    </p>
                    <p className="text-xs text-gray-400 mb-6 leading-relaxed">
                      Войдите или зарегистрируйтесь — специализация и навыки с баллами автоматически
                      перенесутся в профиль.
                    </p>
                    <div className="flex flex-col sm:flex-row justify-center gap-3">
                      <button
                        onClick={() => {
                          handleClose();
                          onNavigate('register');
                        }}
                        className="px-5 py-2.5 bg-yellow-400 hover:bg-yellow-500 text-black font-bold rounded-xl text-[10px] uppercase tracking-wider transition-colors"
                      >
                        Зарегистрироваться
                      </button>
                      <button
                        onClick={() => {
                          handleClose();
                          onNavigate('login');
                        }}
                        className="px-5 py-2.5 bg-white/5 hover:bg-white/10 text-white font-bold rounded-xl text-[10px] uppercase tracking-wider transition-colors border border-white/10"
                      >
                        Войти
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
