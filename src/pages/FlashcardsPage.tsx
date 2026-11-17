import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import {
  Layers,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  RotateCw,
  CheckCircle2,
  XCircle,
  Plus,
  Trash2,
  Trophy,
  Shuffle,
  Volume2,
} from 'lucide-react';
import { api } from '../services/api';
import { FlashcardDeck, FlashcardItem } from '../types';
import { useToast } from '../context/ToastContext';

interface FlashcardsPageProps {
  initialText?: string;
}

export const FlashcardsPage: React.FC<FlashcardsPageProps> = ({ initialText = '' }) => {
  const [decks, setDecks] = useState<FlashcardDeck[]>([]);
  const [activeDeck, setActiveDeck] = useState<FlashcardDeck | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

  // New deck creator state
  const [sourceText, setSourceText] = useState(initialText);
  const [deckTopic, setDeckTopic] = useState('');
  const [cardCount, setCardCount] = useState(8);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showCreator, setShowCreator] = useState(!initialText);
  const [deckToDelete, setDeckToDelete] = useState<FlashcardDeck | null>(null);
  const [isDeletingDeck, setIsDeletingDeck] = useState(false);

  const { success, error } = useToast();

  useEffect(() => {
    loadDecks();
  }, []);

  useEffect(() => {
    if (initialText) {
      setSourceText(initialText);
      setShowCreator(true);
    }
  }, [initialText]);

  const loadDecks = async () => {
    try {
      const data = await api.getFlashcards();
      setDecks(data);
      if (data.length > 0 && !activeDeck) {
        setActiveDeck(data[0]);
        setCurrentIndex(0);
        setIsFlipped(false);
      }
    } catch (e) {
      console.error('Failed to load flashcard decks:', e);
    }
  };

  const handleGenerateDeck = async () => {
    if (!sourceText.trim() || sourceText.trim().split(/\s+/).length < 15) {
      error('Please provide at least 15 words of source text to extract flashcards.');
      return;
    }

    setIsGenerating(true);
    try {
      const res = await api.generateFlashcards({
        text: sourceText,
        count: cardCount,
        topic: deckTopic.trim() || undefined,
      });

      success(`Generated ${res.cards.length} flashcards!`);
      setShowCreator(false);
      await loadDecks();

      if (res.deckId) {
        const fullDeck = await api.getFlashcardDeck(res.deckId);
        setActiveDeck(fullDeck);
        setCurrentIndex(0);
        setIsFlipped(false);
      }
    } catch (err: any) {
      error(err.message || 'Failed to generate flashcards.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleToggleMastery = async (mastered: boolean) => {
    if (!activeDeck) return;
    const currentCard = activeDeck.cards[currentIndex];
    if (!currentCard) return;

    try {
      const updated = await api.updateCardMastery(activeDeck._id, currentCard.id, mastered);
      setActiveDeck(updated);

      // Check if all are mastered
      const allMastered = updated.cards.every(c => c.mastered);
      if (allMastered) {
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
        });
        success('Congratulations! You mastered the entire flashcard deck!');
      }

      // Automatically move to next card
      if (currentIndex < updated.cards.length - 1) {
        setIsFlipped(false);
        setCurrentIndex(prev => prev + 1);
      }
    } catch (err: any) {
      error('Failed to update mastery.');
    }
  };

  const handleNext = () => {
    if (!activeDeck) return;
    setIsFlipped(false);
    setCurrentIndex(prev => (prev < activeDeck.cards.length - 1 ? prev + 1 : 0));
  };

  const handlePrev = () => {
    if (!activeDeck) return;
    setIsFlipped(false);
    setCurrentIndex(prev => (prev > 0 ? prev - 1 : activeDeck.cards.length - 1));
  };

  const handleShuffle = () => {
    if (!activeDeck) return;
    const shuffled = [...activeDeck.cards].sort(() => Math.random() - 0.5);
    setActiveDeck({ ...activeDeck, cards: shuffled });
    setCurrentIndex(0);
    setIsFlipped(false);
    success('Cards shuffled!');
  };

  const handlePromptDeleteDeck = (deck: FlashcardDeck, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeckToDelete(deck);
  };

  const handleConfirmDeleteDeck = async () => {
    if (!deckToDelete) return;
    setIsDeletingDeck(true);
    try {
      await api.deleteFlashcardDeck(deckToDelete._id);
      success('Deck deleted');
      const remaining = decks.filter(d => d._id !== deckToDelete._id);
      setDecks(remaining);
      if (activeDeck?._id === deckToDelete._id) {
        setActiveDeck(remaining[0] || null);
        setCurrentIndex(0);
      }
      setDeckToDelete(null);
    } catch {
      error('Failed to delete deck');
    } finally {
      setIsDeletingDeck(false);
    }
  };

  const currentCard: FlashcardItem | undefined = activeDeck?.cards[currentIndex];
  const masteredCount = activeDeck?.cards.filter(c => c.mastered).length || 0;
  const totalCount = activeDeck?.cards.length || 0;
  const progressPercent = totalCount > 0 ? Math.round((masteredCount / totalCount) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Top Deck Selector & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center font-bold">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
              {activeDeck?.title || 'Active Recall Decks'}
            </h3>
            <p className="text-xs text-slate-400">
              {decks.length} Decks available • {masteredCount}/{totalCount} cards mastered
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {decks.length > 0 && (
            <div className="flex items-center gap-1.5">
              <select
                value={activeDeck?._id || ''}
                onChange={e => {
                  const found = decks.find(d => d._id === e.target.value);
                  if (found) {
                    setActiveDeck(found);
                    setCurrentIndex(0);
                    setIsFlipped(false);
                    setShowCreator(false);
                  }
                }}
                className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 max-w-[200px] truncate"
              >
                {decks.map(d => (
                  <option key={d._id} value={d._id}>
                    {d.title} ({d.cards.length} cards)
                  </option>
                ))}
              </select>

              {activeDeck && (
                <button
                  type="button"
                  onClick={e => handlePromptDeleteDeck(activeDeck, e)}
                  className="p-2 rounded-xl text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                  title="Delete current deck"
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
            <span>{showCreator ? 'Back to Cards' : 'Create New Deck'}</span>
          </button>
        </div>
      </div>

      {/* Creator Modal / Panel */}
      {showCreator && (
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-indigo-200/60 dark:border-indigo-800/60 shadow-lg space-y-4 animate-in fade-in duration-200">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
            <Sparkles className="w-4 h-4 text-indigo-500" />
            <span className="text-xs font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wider">
              Generate AI Flashcard Deck
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input
              type="text"
              value={deckTopic}
              onChange={e => setDeckTopic(e.target.value)}
              placeholder="Deck Title / Topic (e.g. Cognitive Psychology Core Terms)"
              className="px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <div className="flex items-center gap-3">
              <span className="text-xs text-slate-500 font-semibold whitespace-nowrap">Number of cards:</span>
              <input
                type="range"
                min={4}
                max={15}
                value={cardCount}
                onChange={e => setCardCount(Number(e.target.value))}
                className="flex-1 accent-indigo-600"
              />
              <span className="text-xs font-bold text-indigo-600 dark:text-cyan-400 w-6">{cardCount}</span>
            </div>
          </div>

          <textarea
            value={sourceText}
            onChange={e => setSourceText(e.target.value)}
            placeholder="Paste your source text, definitions, or summary excerpt here..."
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
              onClick={handleGenerateDeck}
              disabled={isGenerating || !sourceText.trim()}
              className="px-6 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md disabled:opacity-50 flex items-center gap-2"
            >
              {isGenerating ? 'Synthesizing Cards...' : 'Generate Deck'}
            </button>
          </div>
        </div>
      )}

      {/* Main Flashcard Interactive Player */}
      {activeDeck && !showCreator && currentCard && (
        <div className="max-w-2xl mx-auto space-y-6">
          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
              <span>Card {currentIndex + 1} of {totalCount}</span>
              <span className="flex items-center gap-1 text-emerald-500 font-bold">
                <Trophy className="w-3.5 h-3.5" />
                {progressPercent}% Mastered ({masteredCount}/{totalCount})
              </span>
            </div>
            <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
              <div
                style={{ width: `${progressPercent}%` }}
                className="h-full bg-gradient-to-r from-emerald-500 to-cyan-400 transition-all duration-300"
              />
            </div>
          </div>

          {/* 3D Flip Card Container */}
          <div
            onClick={() => setIsFlipped(!isFlipped)}
            className="cursor-pointer select-none perspective-1000 min-h-[320px] sm:min-h-[360px] relative rounded-3xl"
          >
            <div
              className={`w-full h-full min-h-[320px] sm:min-h-[360px] rounded-3xl p-8 transition-transform duration-500 transform-style-3d border shadow-xl flex flex-col justify-between ${
                isFlipped
                  ? 'bg-gradient-to-br from-indigo-900 via-indigo-950 to-slate-900 border-indigo-500/40 text-white'
                  : 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 text-slate-800 dark:text-slate-100'
              }`}
            >
              {/* Card Header */}
              <div className="flex items-center justify-between">
                <span className={`text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full ${
                  isFlipped
                    ? 'bg-indigo-500/20 text-cyan-300 border border-indigo-400/30'
                    : 'bg-slate-100 dark:bg-slate-800 text-indigo-600 dark:text-cyan-400'
                }`}>
                  {currentCard.category || (isFlipped ? 'Answer / Explanation' : 'Question / Concept')}
                </span>

                <div className="flex items-center gap-2">
                  {currentCard.mastered && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      Mastered
                    </span>
                  )}
                  <span className="text-xs text-slate-400 flex items-center gap-1">
                    <RotateCw className="w-3 h-3" />
                    <span>Click to flip</span>
                  </span>
                </div>
              </div>

              {/* Card Body */}
              <div className="my-auto py-6 text-center">
                <p className={`font-semibold leading-relaxed ${
                  isFlipped
                    ? 'text-base sm:text-lg text-slate-100'
                    : 'text-lg sm:text-xl font-bold text-slate-900 dark:text-white'
                }`}>
                  {isFlipped ? currentCard.answer : currentCard.question}
                </p>
              </div>

              {/* Card Footer prompt */}
              <div className="text-center pt-4 border-t border-slate-100/10 text-[11px] text-slate-400">
                {isFlipped ? 'Mark your recall below to track mastery' : 'Think of the definition before revealing'}
              </div>
            </div>
          </div>

          {/* Navigation & Mastery Controls */}
          <div className="flex items-center justify-between gap-4 pt-2">
            <button
              onClick={handlePrev}
              className="p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors shadow-sm"
              title="Previous card"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

            {/* Mastery Action Buttons */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => handleToggleMastery(false)}
                className="px-4 sm:px-5 py-2.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800/40 text-xs font-bold hover:bg-rose-100 transition-all flex items-center gap-1.5 shadow-sm active:scale-95"
              >
                <XCircle className="w-4 h-4" />
                <span>Study Again</span>
              </button>

              <button
                onClick={() => handleToggleMastery(true)}
                className="px-4 sm:px-5 py-2.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/40 text-xs font-bold hover:bg-emerald-100 transition-all flex items-center gap-1.5 shadow-sm active:scale-95"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Got It!</span>
              </button>

              <button
                onClick={handleShuffle}
                className="p-2.5 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 transition-colors"
                title="Shuffle deck"
              >
                <Shuffle className="w-4 h-4" />
              </button>
            </div>

            <button
              onClick={handleNext}
              className="p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors shadow-sm"
              title="Next card"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!activeDeck && !showCreator && (
        <div className="p-12 text-center rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm max-w-md mx-auto">
          <Layers className="w-12 h-12 text-slate-400 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">No Flashcard Decks Yet</h3>
          <p className="text-xs text-slate-500 mt-1 mb-5">
            Turn your study notes, articles, or summaries into interactive recall decks.
          </p>
          <button
            onClick={() => setShowCreator(true)}
            className="px-5 py-2.5 rounded-xl bg-indigo-600 text-white text-xs font-bold shadow-md hover:bg-indigo-700"
          >
            Create First Deck
          </button>
        </div>
      )}

      {/* In-App Delete Deck Modal */}
      {deckToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="w-10 h-10 rounded-xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto">
              <Trash2 className="w-5 h-5" />
            </div>
            <div className="text-center">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Delete Deck?</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                Are you sure you want to delete "{deckToDelete.title}" ({deckToDelete.cards.length} cards)?
              </p>
            </div>
            <div className="flex items-center gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setDeckToDelete(null)}
                disabled={isDeletingDeck}
                className="flex-1 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteDeck}
                disabled={isDeletingDeck}
                className="flex-1 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md shadow-rose-600/20 transition-all flex items-center justify-center gap-1.5"
              >
                {isDeletingDeck ? (
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
