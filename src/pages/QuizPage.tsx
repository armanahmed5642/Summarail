import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import {
  HelpCircle,
  Sparkles,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Trophy,
  ArrowRight,
  Plus,
  Trash2,
  Clock,
  Award,
  ChevronRight,
} from 'lucide-react';
import { api } from '../services/api';
import { QuizRecord, QuizQuestion } from '../types';
import { useToast } from '../context/ToastContext';

interface QuizPageProps {
  initialText?: string;
}

export const QuizPage: React.FC<QuizPageProps> = ({ initialText = '' }) => {
  const [quizzes, setQuizzes] = useState<QuizRecord[]>([]);
  const [activeQuiz, setActiveQuiz] = useState<QuizRecord | null>(null);

  // Play state
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, number>>({});
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [evaluation, setEvaluation] = useState<{
    score: number;
    total: number;
    percentage: number;
    breakdown: any[];
  } | null>(null);

  // Generator state
  const [sourceText, setSourceText] = useState(initialText);
  const [quizTopic, setQuizTopic] = useState('');
  const [questionCount, setQuestionCount] = useState(5);
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [isGenerating, setIsGenerating] = useState(false);
  const [showCreator, setShowCreator] = useState(!initialText);
  const [showIncompleteModal, setShowIncompleteModal] = useState(false);
  const [quizToDelete, setQuizToDelete] = useState<QuizRecord | null>(null);
  const [isDeletingQuiz, setIsDeletingQuiz] = useState(false);

  const { success, error } = useToast();

  useEffect(() => {
    loadQuizzes();
  }, []);

  useEffect(() => {
    if (initialText) {
      setSourceText(initialText);
      setShowCreator(true);
    }
  }, [initialText]);

  const loadQuizzes = async () => {
    try {
      const data = await api.getQuizzes();
      setQuizzes(data);
      if (data.length > 0 && !activeQuiz) {
        startQuiz(data[0]);
      }
    } catch (e) {
      console.error('Failed to load quizzes:', e);
    }
  };

  const startQuiz = (quiz: QuizRecord) => {
    setActiveQuiz(quiz);
    setCurrentQIndex(0);
    setSelectedAnswers({});
    setIsSubmitted(false);
    setEvaluation(null);
    setShowCreator(false);
  };

  const handleGenerateQuiz = async () => {
    if (!sourceText.trim() || sourceText.trim().split(/\s+/).length < 20) {
      error('Please provide at least 20 words of source text to generate a quiz.');
      return;
    }

    setIsGenerating(true);
    try {
      const res = await api.generateQuiz({
        text: sourceText,
        questionCount,
        difficulty,
        topic: quizTopic.trim() || undefined,
      });

      success(`Quiz generated with ${res.questions.length} questions!`);
      setShowCreator(false);
      await loadQuizzes();

      if (res.quizId) {
        const fullQuiz = await api.getQuiz(res.quizId);
        startQuiz(fullQuiz);
      }
    } catch (err: any) {
      error(err.message || 'Failed to generate quiz.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSelectOption = (questionId: string, optionIndex: number) => {
    if (isSubmitted) return;
    setSelectedAnswers(prev => ({
      ...prev,
      [questionId]: optionIndex,
    }));
  };

  const executeSubmit = async () => {
    if (!activeQuiz) return;
    try {
      const evalResult = await api.submitQuiz(activeQuiz._id, selectedAnswers);
      setEvaluation(evalResult);
      setIsSubmitted(true);
      setShowIncompleteModal(false);

      if (evalResult.percentage >= 70) {
        confetti({
          particleCount: 100,
          spread: 80,
          origin: { y: 0.6 },
        });
        success(`Superb! You scored ${evalResult.score}/${evalResult.total} (${evalResult.percentage}%)`);
      } else {
        success(`Quiz completed! You scored ${evalResult.score}/${evalResult.total} (${evalResult.percentage}%)`);
      }
    } catch {
      error('Failed to submit and evaluate quiz.');
    }
  };

  const handleSubmitQuiz = async () => {
    if (!activeQuiz) return;
    const answeredCount = Object.keys(selectedAnswers).length;
    if (answeredCount < activeQuiz.questions.length) {
      setShowIncompleteModal(true);
      return;
    }
    await executeSubmit();
  };

  const handleRetake = () => {
    if (activeQuiz) {
      startQuiz(activeQuiz);
    }
  };

  const handlePromptDeleteQuiz = (quiz: QuizRecord, e: React.MouseEvent) => {
    e.stopPropagation();
    setQuizToDelete(quiz);
  };

  const handleConfirmDeleteQuiz = async () => {
    if (!quizToDelete) return;
    setIsDeletingQuiz(true);
    try {
      await api.deleteQuiz(quizToDelete._id);
      success('Quiz deleted.');
      const remaining = quizzes.filter(q => q._id !== quizToDelete._id);
      setQuizzes(remaining);
      if (activeQuiz?._id === quizToDelete._id) {
        if (remaining.length > 0) {
          startQuiz(remaining[0]);
        } else {
          setActiveQuiz(null);
          setShowCreator(true);
        }
      }
      setQuizToDelete(null);
    } catch {
      error('Failed to delete quiz.');
    } finally {
      setIsDeletingQuiz(false);
    }
  };

  const currentQ: QuizQuestion | undefined = activeQuiz?.questions[currentQIndex];

  return (
    <div className="space-y-6">
      {/* Top Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-cyan-500/10 text-cyan-500 flex items-center justify-center font-bold">
            <HelpCircle className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
              {activeQuiz?.title || 'Comprehension Quizzes'}
            </h3>
            <p className="text-xs text-slate-400">
              {quizzes.length} Quizzes saved • Test your knowledge retention
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {quizzes.length > 0 && (
            <div className="flex items-center gap-1.5">
              <select
                value={activeQuiz?._id || ''}
                onChange={e => {
                  const found = quizzes.find(q => q._id === e.target.value);
                  if (found) startQuiz(found);
                }}
                className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 max-w-[200px] truncate"
              >
                {quizzes.map(q => (
                  <option key={q._id} value={q._id}>
                    {q.title} ({q.questions.length} Qs)
                  </option>
                ))}
              </select>

              {activeQuiz && (
                <button
                  type="button"
                  onClick={e => handlePromptDeleteQuiz(activeQuiz, e)}
                  className="p-2 rounded-xl text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                  title="Delete current quiz"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          )}

          <button
            onClick={() => setShowCreator(!showCreator)}
            className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-sm transition-all flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{showCreator ? 'View Current Quiz' : 'Generate New Quiz'}</span>
          </button>
        </div>
      </div>

      {/* Creator Panel */}
      {showCreator && (
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-cyan-200/60 dark:border-cyan-800/60 shadow-lg space-y-4 animate-in fade-in duration-200">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
            <Sparkles className="w-4 h-4 text-cyan-500" />
            <span className="text-xs font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wider">
              Generate AI Multiple-Choice Quiz
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <input
              type="text"
              value={quizTopic}
              onChange={e => setQuizTopic(e.target.value)}
              placeholder="Quiz Title / Subject (e.g. Distributed Consensus Algorithms)"
              className="px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <div className="flex items-center gap-3">
              <span className="text-xs text-slate-500 font-semibold whitespace-nowrap">Questions:</span>
              <input
                type="range"
                min={3}
                max={10}
                value={questionCount}
                onChange={e => setQuestionCount(Number(e.target.value))}
                className="flex-1 accent-cyan-500"
              />
              <span className="text-xs font-bold text-cyan-600 dark:text-cyan-400 w-6">{questionCount}</span>
            </div>
            <select
              value={difficulty}
              onChange={e => setDifficulty(e.target.value as any)}
              className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold"
            >
              <option value="easy">Easy (Definitions & Recall)</option>
              <option value="medium">Medium (Comprehension & Analysis)</option>
              <option value="hard">Hard (Synthesis & Applied Scenarios)</option>
            </select>
          </div>

          <textarea
            value={sourceText}
            onChange={e => setSourceText(e.target.value)}
            placeholder="Paste your source text, summary, or lecture notes here to generate multiple-choice questions..."
            rows={5}
            className="w-full p-4 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />

          <div className="flex justify-end gap-2">
            <button
              onClick={() => setShowCreator(false)}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              onClick={handleGenerateQuiz}
              disabled={isGenerating || !sourceText.trim()}
              className="px-6 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white text-xs font-bold shadow-md disabled:opacity-50 flex items-center gap-2"
            >
              {isGenerating ? 'Synthesizing Quiz...' : 'Generate Quiz'}
            </button>
          </div>
        </div>
      )}

      {/* Main Quiz Player */}
      {activeQuiz && !showCreator && (
        <div className="max-w-3xl mx-auto space-y-6">
          {/* Evaluation Banner when submitted */}
          {isSubmitted && evaluation && (
            <div className="p-6 rounded-3xl bg-gradient-to-r from-indigo-900 to-slate-900 border border-indigo-700/50 text-white shadow-xl flex flex-col sm:flex-row items-center justify-between gap-6 animate-in zoom-in-95">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-cyan-500/20 border border-cyan-400/30 flex items-center justify-center text-cyan-300 font-black text-2xl">
                  {evaluation.percentage}%
                </div>
                <div>
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-indigo-500/30 text-cyan-300 text-xs font-bold mb-1">
                    <Trophy className="w-3.5 h-3.5" />
                    <span>Quiz Evaluation Result</span>
                  </div>
                  <h3 className="text-xl font-bold">
                    Score: {evaluation.score} of {evaluation.total} Correct
                  </h3>
                  <p className="text-xs text-slate-300 mt-0.5">
                    {evaluation.percentage >= 80
                      ? 'Exceptional mastery of core concepts!'
                      : evaluation.percentage >= 60
                      ? 'Solid understanding with minor review needed.'
                      : 'Review the explanations below and try retaking the quiz.'}
                  </p>
                </div>
              </div>

              <button
                onClick={handleRetake}
                className="px-5 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-600 text-slate-950 font-bold text-xs sm:text-sm shadow-lg transition-all flex items-center gap-2"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Retake Quiz</span>
              </button>
            </div>
          )}

          {/* Question Stepper / Progress Bar */}
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Question {currentQIndex + 1} of {activeQuiz.questions.length}
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              {activeQuiz.questions.map((q, idx) => {
                const isAnswered = selectedAnswers[q.id] !== undefined;
                const isCurrent = currentQIndex === idx;
                return (
                  <button
                    key={q.id}
                    onClick={() => setCurrentQIndex(idx)}
                    className={`w-7 h-7 rounded-lg text-xs font-bold transition-all ${
                      isCurrent
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : isAnswered
                        ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                    }`}
                  >
                    {idx + 1}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Active Question Card */}
          {currentQ && (
            <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-6">
              <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white leading-relaxed">
                {currentQ.question}
              </h3>

              {/* Options */}
              <div className="space-y-3">
                {currentQ.options.map((option, optIdx) => {
                  const isSelected = selectedAnswers[currentQ.id] === optIdx;
                  const isCorrect = currentQ.correctAnswer === optIdx;

                  let optionStyle =
                    'border-slate-200 dark:border-slate-700/80 hover:border-indigo-400 bg-white dark:bg-slate-800/60 text-slate-800 dark:text-slate-200';

                  if (isSubmitted) {
                    if (isCorrect) {
                      optionStyle =
                        'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 ring-1 ring-emerald-500';
                    } else if (isSelected && !isCorrect) {
                      optionStyle =
                        'border-rose-500 bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-200 ring-1 ring-rose-500';
                    }
                  } else if (isSelected) {
                    optionStyle =
                      'border-indigo-600 bg-indigo-50/70 dark:bg-indigo-950/50 text-indigo-900 dark:text-indigo-200 ring-2 ring-indigo-500';
                  }

                  return (
                    <button
                      key={optIdx}
                      type="button"
                      disabled={isSubmitted}
                      onClick={() => handleSelectOption(currentQ.id, optIdx)}
                      className={`w-full p-4 rounded-2xl border text-left text-xs sm:text-sm font-medium transition-all flex items-center justify-between gap-3 ${optionStyle}`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="w-6 h-6 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 flex items-center justify-center font-bold text-xs shrink-0">
                          {['A', 'B', 'C', 'D'][optIdx]}
                        </span>
                        <span>{option}</span>
                      </div>

                      {isSubmitted && isCorrect && <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />}
                      {isSubmitted && isSelected && !isCorrect && <XCircle className="w-5 h-5 text-rose-500 shrink-0" />}
                    </button>
                  );
                })}
              </div>

              {/* Explanation (Shown when submitted) */}
              {isSubmitted && (
                <div className="p-4 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-200/50 dark:border-indigo-800/40 space-y-1.5 animate-in fade-in">
                  <div className="flex items-center gap-2 text-xs font-bold text-indigo-600 dark:text-cyan-400">
                    <Sparkles className="w-4 h-4" />
                    <span>Explanation & Context</span>
                  </div>
                  <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                    {currentQ.explanation}
                  </p>
                </div>
              )}

              {/* Navigation Footer */}
              <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  disabled={currentQIndex === 0}
                  onClick={() => setCurrentQIndex(prev => Math.max(0, prev - 1))}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30"
                >
                  Previous
                </button>

                <div className="flex items-center gap-3">
                  {currentQIndex < activeQuiz.questions.length - 1 ? (
                    <button
                      type="button"
                      onClick={() => setCurrentQIndex(prev => prev + 1)}
                      className="px-5 py-2 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-bold hover:opacity-90 flex items-center gap-1.5"
                    >
                      <span>Next Question</span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  ) : !isSubmitted ? (
                    <button
                      type="button"
                      onClick={handleSubmitQuiz}
                      className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs font-bold shadow-md transition-all active:scale-95"
                    >
                      Submit & Grade Quiz
                    </button>
                  ) : null}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* In-App Incomplete Submit Modal */}
      {showIncompleteModal && activeQuiz && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto">
              <HelpCircle className="w-5 h-5" />
            </div>
            <div className="text-center">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Unanswered Questions</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                You have answered {Object.keys(selectedAnswers).length} of {activeQuiz.questions.length} questions. Unanswered questions will be scored as incorrect.
              </p>
            </div>
            <div className="flex items-center gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowIncompleteModal(false)}
                className="flex-1 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                Continue Quiz
              </button>
              <button
                type="button"
                onClick={executeSubmit}
                className="flex-1 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-600/20 transition-all flex items-center justify-center gap-1.5"
              >
                Submit Anyway
              </button>
            </div>
          </div>
        </div>
      )}

      {/* In-App Delete Quiz Modal */}
      {quizToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="w-10 h-10 rounded-xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto">
              <Trash2 className="w-5 h-5" />
            </div>
            <div className="text-center">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Delete Quiz?</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                Are you sure you want to delete "{quizToDelete.title}" ({quizToDelete.questions.length} questions)?
              </p>
            </div>
            <div className="flex items-center gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setQuizToDelete(null)}
                disabled={isDeletingQuiz}
                className="flex-1 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteQuiz}
                disabled={isDeletingQuiz}
                className="flex-1 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md shadow-rose-600/20 transition-all flex items-center justify-center gap-1.5"
              >
                {isDeletingQuiz ? (
                  <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <span>Delete</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
