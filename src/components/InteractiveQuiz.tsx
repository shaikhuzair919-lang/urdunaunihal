/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Award, Volume2, ArrowRight, RotateCcw, CheckCircle2, XCircle, Sparkles } from 'lucide-react';
import { UrduWord, URDU_WORDS_DATABASE, LETTER_LEVELS } from '../data/urduData';
import { shuffleArray } from '../utils/learningLogic';
import { sfx, speakUrduText } from '../utils/audio';

interface QuizProps {
  initialLevel?: number | 'all';
  onQuizComplete: (score: number, total: number, quizType: string, level: number) => void;
  onExitQuiz: () => void;
}

type QuizMode = 'picture_match' | 'letter_jumble' | 'meaning_match';

export const InteractiveQuiz: React.FC<QuizProps> = ({
  initialLevel = 2,
  onQuizComplete,
  onExitQuiz,
}) => {
  const [selectedLevel, setSelectedLevel] = useState<number>(
    typeof initialLevel === 'number' ? initialLevel : 2
  );
  const [quizMode, setQuizMode] = useState<QuizMode>('picture_match');

  // Quiz questions state
  const [questions, setQuestions] = useState<UrduWord[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [isAnswerChecked, setIsAnswerChecked] = useState(false);
  const [isQuizFinished, setIsQuizFinished] = useState(false);

  // For letter jumble mode
  const [scrambledLetters, setScrambledLetters] = useState<string[]>([]);
  const [constructedLetters, setConstructedLetters] = useState<string[]>([]);

  // Initialize or restart quiz when level or mode changes
  const initQuiz = () => {
    const pool = URDU_WORDS_DATABASE.filter(w => w.letterCount === selectedLevel);
    const shuffled = shuffleArray(pool).slice(0, 5); // 5 questions per quiz
    setQuestions(shuffled);
    setCurrentIndex(0);
    setScore(0);
    setSelectedAnswer(null);
    setIsAnswerChecked(false);
    setIsQuizFinished(false);

    if (shuffled.length > 0 && quizMode === 'letter_jumble') {
      setupJumble(shuffled[0]);
    }
  };

  useEffect(() => {
    initQuiz();
  }, [selectedLevel, quizMode]);

  const setupJumble = (targetWord: UrduWord) => {
    const letters = [...targetWord.urduLetters];
    setScrambledLetters(shuffleArray(letters));
    setConstructedLetters([]);
  };

  const currentWord = questions[currentIndex];

  // Options generator for multiple choice modes
  const [options, setOptions] = useState<UrduWord[]>([]);
  useEffect(() => {
    if (!currentWord) return;
    if (quizMode === 'letter_jumble') {
      setupJumble(currentWord);
      return;
    }
    // Generate 4 options (1 correct, 3 distractors from same or nearby levels)
    const distractors = URDU_WORDS_DATABASE.filter(w => w.id !== currentWord.id);
    const sampled = shuffleArray(distractors).slice(0, 3);
    const combined = shuffleArray([currentWord, ...sampled]);
    setOptions(combined);
  }, [currentIndex, questions, quizMode]);

  const handleSelectOption = (word: UrduWord) => {
    if (isAnswerChecked) return;
    sfx.playPop();
    setSelectedAnswer(word.id);
    setIsAnswerChecked(true);

    const isCorrect = word.id === currentWord.id;
    if (isCorrect) {
      sfx.playSuccess();
      setScore(prev => prev + 1);
    } else {
      sfx.playWrong();
    }
  };

  // Letter Jumble interactions
  const handlePickLetter = (letter: string, index: number) => {
    sfx.playPop();
    speakUrduText(letter);
    setConstructedLetters(prev => [...prev, letter]);
    setScrambledLetters(prev => prev.filter((_, i) => i !== index));
  };

  const handleRemoveLetter = (letter: string, index: number) => {
    sfx.playPop();
    setScrambledLetters(prev => [...prev, letter]);
    setConstructedLetters(prev => prev.filter((_, i) => i !== index));
  };

  const handleCheckJumble = () => {
    if (isAnswerChecked) return;
    setIsAnswerChecked(true);

    const targetJoined = currentWord.urduLetters.join('');
    const userJoined = constructedLetters.join('');
    const isCorrect = targetJoined === userJoined;

    if (isCorrect) {
      sfx.playSuccess();
      setScore(prev => prev + 1);
    } else {
      sfx.playWrong();
    }
  };

  const handleNextQuestion = () => {
    sfx.playPop();
    if (currentIndex + 1 < questions.length) {
      setCurrentIndex(prev => prev + 1);
      setSelectedAnswer(null);
      setIsAnswerChecked(false);
    } else {
      // Quiz complete!
      sfx.playFanfare();
      setIsQuizFinished(true);
      const finalScore = isAnswerChecked && selectedAnswer === currentWord.id ? score : score;
      onQuizComplete(finalScore, questions.length, quizMode, selectedLevel);
    }
  };

  if (!currentWord && !isQuizFinished) {
    return (
      <div className="bg-white rounded-3xl p-8 text-center border-2 border-amber-200">
        <p className="font-nastaliq text-xl text-gray-700">سوالات لوڈ ہو رہے ہیں...</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-3xl p-5 sm:p-7 shadow-lg border-2 border-amber-200 relative overflow-hidden">
      {/* Top Header & Navigation */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5 pb-4 border-b border-gray-100">
        <button
          type="button"
          onClick={onExitQuiz}
          className="px-3.5 py-1.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-kids text-xs font-bold transition-all"
        >
          ← واپس لسٹ میں جائیں
        </button>

        {/* Level Selector Tabs */}
        <div className="flex items-center gap-1 bg-amber-50 p-1 rounded-2xl border border-amber-200">
          {LETTER_LEVELS.map(lvl => (
            <button
              key={lvl.id}
              onClick={() => setSelectedLevel(lvl.id as number)}
              className={`px-2.5 py-1 rounded-xl text-xs font-bold font-nastaliq transition-all ${
                selectedLevel === lvl.id
                  ? 'bg-amber-400 text-gray-950 shadow-xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {lvl.titleUrdu}
            </button>
          ))}
        </div>

        {/* Quiz Mode Selector */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setQuizMode('picture_match')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold font-kids transition-all ${
              quizMode === 'picture_match'
                ? 'bg-indigo-600 text-white'
                : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100'
            }`}
          >
            🖼️ تصویر دیکھ کر
          </button>
          <button
            onClick={() => setQuizMode('letter_jumble')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold font-kids transition-all ${
              quizMode === 'letter_jumble'
                ? 'bg-indigo-600 text-white'
                : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100'
            }`}
          >
            🧩 جوڑ توڑ
          </button>
          <button
            onClick={() => setQuizMode('meaning_match')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold font-kids transition-all ${
              quizMode === 'meaning_match'
                ? 'bg-indigo-600 text-white'
                : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100'
            }`}
          >
            📖 معنی بتائیں
          </button>
        </div>
      </div>

      {!isQuizFinished ? (
        <div>
          {/* Progress Indicator */}
          <div className="flex items-center justify-between text-xs font-kids text-gray-500 mb-2">
            <span>سوال {currentIndex + 1} از {questions.length}</span>
            <span className="font-bold text-emerald-600 flex items-center gap-1">
              <Award className="w-4 h-4 text-amber-500" />
              اسکور: {score}
            </span>
          </div>
          <div className="w-full bg-gray-100 h-2.5 rounded-full overflow-hidden mb-6">
            <div
              className="bg-amber-400 h-full rounded-full transition-all duration-300"
              style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
            />
          </div>

          {/* MODE 1: PICTURE TO WORD MATCH */}
          {quizMode === 'picture_match' && (
            <div className="flex flex-col items-center">
              <div className="text-center mb-4">
                <span className="text-xs font-bold text-indigo-600 font-kids uppercase tracking-wider">
                  تصویر دیکھ کر صحیح اردو لفظ چنیں
                </span>
                <div className="w-32 h-32 sm:w-36 sm:h-36 rounded-3xl bg-amber-50 border-2 border-amber-200 flex items-center justify-center text-7xl sm:text-8xl shadow-inner my-3 mx-auto">
                  {currentWord.emojiOrTheme}
                </div>
                <p className="text-sm text-gray-600 font-kids">
                  Meaning: <span className="font-bold text-gray-800">{currentWord.meaningEnglish}</span>
                </p>
              </div>

              {/* 4 Choices */}
              <div className="grid grid-cols-2 gap-3 w-full max-w-lg mb-6" dir="rtl">
                {options.map((option) => {
                  const isSelected = selectedAnswer === option.id;
                  const isCorrect = option.id === currentWord.id;

                  let btnStyle = 'bg-gray-50 border-gray-200 text-gray-900 hover:bg-amber-50 hover:border-amber-300';
                  if (isAnswerChecked) {
                    if (isCorrect) {
                      btnStyle = 'bg-emerald-100 border-emerald-500 text-emerald-950 font-bold ring-2 ring-emerald-300';
                    } else if (isSelected) {
                      btnStyle = 'bg-rose-100 border-rose-500 text-rose-950';
                    }
                  }

                  return (
                    <button
                      key={option.id}
                      type="button"
                      disabled={isAnswerChecked}
                      onClick={() => handleSelectOption(option)}
                      className={`p-4 rounded-2xl border-2 text-center transition-all shadow-xs ${btnStyle}`}
                    >
                      <span className="urdu-nastaliq-text text-3xl font-bold block">
                        {option.urdu}
                      </span>
                      <span className="text-xs text-gray-500 font-kids block -mt-1">
                        {option.transliteration}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* MODE 2: LETTER JUMBLE (حروف جوڑ کر لفظ بنائیں) */}
          {quizMode === 'letter_jumble' && (
            <div className="flex flex-col items-center">
              <div className="text-center mb-4">
                <span className="text-xs font-bold text-indigo-600 font-kids uppercase tracking-wider">
                  حروف کو ترتیب سے جوڑ کر لفظ بنائیں
                </span>
                <div className="w-24 h-24 rounded-2xl bg-amber-50 border-2 border-amber-200 flex items-center justify-center text-5xl shadow-inner my-2 mx-auto">
                  {currentWord.emojiOrTheme}
                </div>
                <p className="text-sm text-gray-700 font-kids">
                  ہدف: <span className="font-bold font-nastaliq text-base text-indigo-700">{currentWord.meaningUrdu}</span> ({currentWord.meaningEnglish})
                </p>
              </div>

              {/* Constructed Word Box */}
              <div className="w-full max-w-md p-4 bg-indigo-50/50 rounded-2xl border-2 border-dashed border-indigo-200 mb-5 text-center">
                <div className="text-xs text-gray-500 font-kids mb-2">آپ کا بنایا ہوا لفظ (Tap letter to remove):</div>
                <div className="flex items-center justify-center gap-2 min-h-[50px] flex-wrap" dir="rtl">
                  {constructedLetters.length === 0 ? (
                    <span className="text-xs text-gray-400 italic">نیچے سے حروف پر کلک کریں...</span>
                  ) : (
                    constructedLetters.map((letter, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleRemoveLetter(letter, idx)}
                        disabled={isAnswerChecked}
                        className="w-12 h-12 rounded-xl bg-indigo-600 text-white font-nastaliq text-2xl font-bold shadow-sm transition-transform active:scale-90 flex items-center justify-center"
                      >
                        {letter}
                      </button>
                    ))
                  )}
                </div>
              </div>

              {/* Available Scrambled Letters */}
              <div className="flex items-center justify-center gap-2.5 mb-6 flex-wrap" dir="rtl">
                {scrambledLetters.map((letter, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handlePickLetter(letter, idx)}
                    disabled={isAnswerChecked}
                    className="w-14 h-14 rounded-2xl bg-white border-2 border-amber-300 text-amber-950 font-nastaliq text-3xl font-bold shadow-md hover:bg-amber-100 hover:scale-105 active:scale-95 transition-all flex items-center justify-center"
                  >
                    {letter}
                  </button>
                ))}
              </div>

              {/* Jumble Check Button */}
              {!isAnswerChecked && constructedLetters.length > 0 && (
                <button
                  type="button"
                  onClick={handleCheckJumble}
                  className="px-6 py-2.5 rounded-2xl bg-indigo-600 text-white font-kids font-bold text-sm shadow-md hover:bg-indigo-700 active:scale-95 transition-all mb-3"
                >
                  جواب چیک کریں ✓
                </button>
              )}
            </div>
          )}

          {/* MODE 3: MEANING MATCH */}
          {quizMode === 'meaning_match' && (
            <div className="flex flex-col items-center">
              <div className="text-center mb-5" dir="rtl">
                <span className="text-xs font-bold text-indigo-600 font-kids uppercase tracking-wider">
                  اس لفظ کا صحیح معنی کیا ہے؟
                </span>
                <h3 className="urdu-nastaliq-text text-5xl font-bold text-gray-900 my-2">
                  {currentWord.urdu}
                </h3>
                <span className="text-sm font-semibold text-indigo-600 font-kids">
                  ({currentWord.transliteration})
                </span>
              </div>

              {/* 4 Meaning Choices */}
              <div className="flex flex-col gap-2.5 w-full max-w-lg mb-6" dir="rtl">
                {options.map((option) => {
                  const isSelected = selectedAnswer === option.id;
                  const isCorrect = option.id === currentWord.id;

                  let btnStyle = 'bg-gray-50 border-gray-200 text-gray-800 hover:bg-amber-50 hover:border-amber-300';
                  if (isAnswerChecked) {
                    if (isCorrect) {
                      btnStyle = 'bg-emerald-100 border-emerald-500 text-emerald-950 font-bold ring-2 ring-emerald-300';
                    } else if (isSelected) {
                      btnStyle = 'bg-rose-100 border-rose-500 text-rose-950';
                    }
                  }

                  return (
                    <button
                      key={option.id}
                      type="button"
                      disabled={isAnswerChecked}
                      onClick={() => handleSelectOption(option)}
                      className={`p-3.5 rounded-2xl border-2 text-right transition-all flex items-center justify-between shadow-xs ${btnStyle}`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">{option.emojiOrTheme}</span>
                        <div>
                          <span className="urdu-nastaliq-text text-base font-bold block">
                            {option.meaningUrdu}
                          </span>
                          <span className="text-xs text-gray-500 font-kids block text-left" dir="ltr">
                            {option.meaningEnglish}
                          </span>
                        </div>
                      </div>
                      {isAnswerChecked && isCorrect && (
                        <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                      )}
                      {isAnswerChecked && isSelected && !isCorrect && (
                        <XCircle className="w-5 h-5 text-rose-600" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Feedback & Next Button */}
          {isAnswerChecked && (
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-200 animate-fadeIn">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => speakUrduText(currentWord.urdu)}
                  className="p-2 rounded-xl bg-amber-100 text-amber-900 hover:bg-amber-200"
                  title="آواز سنیں"
                >
                  <Volume2 className="w-4 h-4" />
                </button>
                <div className="text-right" dir="rtl">
                  <div className="urdu-nastaliq-text text-sm font-bold text-gray-900">
                    صحیح جواب: {currentWord.urdu} ({currentWord.meaningUrdu})
                  </div>
                  <div className="text-xs text-gray-500 font-kids">
                    {currentWord.transliteration} = {currentWord.meaningEnglish}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={handleNextQuestion}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-kids font-bold text-sm flex items-center gap-2 shadow-md hover:from-emerald-600 hover:to-teal-700"
              >
                <span>اگلا سوال</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      ) : (
        /* QUIZ COMPLETION SCREEN */
        <div className="text-center py-8">
          <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-amber-400 to-yellow-300 text-amber-950 flex items-center justify-center text-5xl mx-auto shadow-xl mb-4 animate-bounce">
            🎉
          </div>
          <h3 className="urdu-nastaliq-text text-3xl font-bold text-gray-900 mb-1">
            شاباش! کوئز مکمل ہوا!
          </h3>
          <p className="text-sm font-semibold text-emerald-700 font-kids mb-3">
            Great Job! You scored {score} out of {questions.length}
          </p>

          <div className="inline-flex items-center gap-3 p-4 bg-amber-50 rounded-2xl border-2 border-amber-200 mb-6">
            <div className="text-center">
              <div className="text-xs text-gray-500 font-kids">درست جوابات</div>
              <div className="text-2xl font-bold text-emerald-600 font-kids">{score}/{questions.length}</div>
            </div>
            <div className="w-px h-8 bg-amber-200" />
            <div className="text-center">
              <div className="text-xs text-gray-500 font-kids">کامیابی کا تناسب</div>
              <div className="text-2xl font-bold text-indigo-600 font-kids">
                {Math.round((score / questions.length) * 100)}%
              </div>
            </div>
          </div>

          <div className="flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={initQuiz}
              className="px-5 py-2.5 rounded-2xl bg-amber-400 text-gray-950 font-kids font-bold text-sm flex items-center gap-2 hover:bg-amber-500 shadow-sm"
            >
              <RotateCcw className="w-4 h-4" />
              <span>دوبارہ کھیلیں</span>
            </button>
            <button
              type="button"
              onClick={onExitQuiz}
              className="px-5 py-2.5 rounded-2xl bg-indigo-600 text-white font-kids font-bold text-sm hover:bg-indigo-700 shadow-md"
            >
              اگلا مرحلہ جاری رکھیں →
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
