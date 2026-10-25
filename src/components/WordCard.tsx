/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Volume2, CheckCircle, Sparkles, HelpCircle, BookOpen } from 'lucide-react';
import { UrduWord } from '../data/urduData';
import { speakUrduText, sfx } from '../utils/audio';

interface WordCardProps {
  word: UrduWord;
  isMastered: boolean;
  onToggleMastered: (wordId: string) => void;
}

export const WordCard: React.FC<WordCardProps> = ({
  word,
  isMastered,
  onToggleMastered,
}) => {
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [activeLetter, setActiveLetter] = useState<string | null>(null);
  const [showSentence, setShowSentence] = useState(false);

  const handlePlayAudio = () => {
    sfx.playPop();
    setIsPlayingAudio(true);
    speakUrduText(word.urdu, () => {
      setIsPlayingAudio(false);
    });
  };

  const handleLetterClick = (letter: string) => {
    sfx.playPop();
    setActiveLetter(letter);
    speakUrduText(letter, () => {
      setTimeout(() => setActiveLetter(null), 400);
    });
  };

  const handleMasterClick = () => {
    if (!isMastered) {
      sfx.playSuccess();
    } else {
      sfx.playPop();
    }
    onToggleMastered(word.id);
  };

  const letterCountLabels: Record<number, string> = {
    2: '۲ حرفی',
    3: '۳ حرفی',
    4: '۴ حرفی',
    5: '۵ حرفی',
  };

  return (
    <div
      className={`group relative bg-white rounded-3xl p-5 shadow-sm hover:shadow-xl transition-all duration-300 border-2 flex flex-col justify-between overflow-hidden ${
        isMastered ? 'border-emerald-300 bg-emerald-50/20' : 'border-amber-100 hover:border-amber-300'
      }`}
    >
      {/* Top Tag & Level Badge */}
      <div className="flex items-center justify-between gap-2 mb-3">
        <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200/60 font-nastaliq">
          {letterCountLabels[word.letterCount]}
        </span>

        <span className="text-xs px-2.5 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200/60 font-nastaliq font-bold">
          {word.categoryUrdu}
        </span>
      </div>

      {/* Visual Illustration Badge */}
      <div className="relative my-2 flex items-center justify-center">
        <div
          className={`w-24 h-24 sm:w-28 sm:h-28 rounded-2xl flex items-center justify-center text-5xl sm:text-6xl shadow-inner transition-transform group-hover:scale-105 ${word.badgeBg}`}
        >
          <span>{word.emojiOrTheme}</span>
        </div>

        {isMastered && (
          <div className="absolute top-0 right-1 sm:right-3 bg-emerald-500 text-white p-1 rounded-full shadow-md animate-bounce">
            <CheckCircle className="w-5 h-5" />
          </div>
        )}
      </div>

      {/* Urdu Word in Large Nastaliq */}
      <div className="text-center my-1" dir="rtl">
        <h3 className="urdu-nastaliq-text text-4xl sm:text-5xl font-bold text-gray-900 drop-shadow-xs hover:text-indigo-700 transition-colors cursor-pointer"
            onClick={handlePlayAudio}
            title="کلک کر کے سنیں">
          {word.urdu}
        </h3>
        <p className="text-sm font-semibold text-indigo-600 tracking-wide font-kids -mt-1">
          {word.transliteration}
        </p>
      </div>

      {/* Letter Breakdown (حروف کو الگ الگ کر کے پڑھیں) */}
      <div className="my-3 p-2 bg-amber-50/70 rounded-xl border border-amber-200/60">
        <div className="text-xs font-bold text-gray-600 text-center mb-1.5 font-nastaliq">
          حروف کا جوڑ توڑ (کلک کر کے سنیں)
        </div>
        <div className="flex items-center justify-center gap-1.5 flex-wrap" dir="rtl">
          {word.urduLetters.map((letter, idx) => (
            <React.Fragment key={idx}>
              <button
                type="button"
                onClick={() => handleLetterClick(letter)}
                className={`w-9 h-9 sm:w-10 sm:h-10 rounded-lg text-lg font-bold font-nastaliq transition-all transform active:scale-90 flex items-center justify-center shadow-xs border ${
                  activeLetter === letter
                    ? 'bg-amber-400 text-gray-900 border-amber-500 scale-110'
                    : 'bg-white text-indigo-900 border-gray-200 hover:bg-amber-100 hover:border-amber-300'
                }`}
              >
                {letter}
              </button>
              {idx < word.urduLetters.length - 1 && (
                <span className="text-gray-400 font-bold text-sm">+</span>
              )}
            </React.Fragment>
          ))}
          <span className="text-gray-400 font-bold text-sm">=</span>
          <span className="text-sm font-nastaliq font-bold text-emerald-700 px-1.5">
            {word.urdu}
          </span>
        </div>
      </div>

      {/* Urdu Meaning & English Meaning */}
      <div className="text-center my-1.5 px-1">
        <p className="urdu-nastaliq-text text-sm sm:text-base text-gray-800 font-medium leading-relaxed" dir="rtl">
          <span className="text-xs text-gray-500 font-nastaliq ml-1">معنی:</span>
          {word.meaningUrdu}
        </p>
        <p className="text-xs text-gray-500 font-kids mt-0.5">
          Meaning: <span className="font-semibold text-gray-700">{word.meaningEnglish}</span>
        </p>
      </div>

      {/* Example Sentence Toggle */}
      {showSentence && (
        <div className="mt-2 p-2.5 bg-sky-50 rounded-xl border border-sky-200 text-right animate-fadeIn" dir="rtl">
          <div className="text-xs font-nastaliq font-semibold text-sky-900 leading-relaxed">
            {word.exampleSentenceUrdu}
          </div>
          <div className="text-[11px] text-sky-700 font-kids mt-1 text-left" dir="ltr">
            "{word.exampleSentenceEnglish}"
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={handlePlayAudio}
          className={`flex-1 py-2 px-3 rounded-xl font-nastaliq text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-xs ${
            isPlayingAudio
              ? 'bg-indigo-600 text-white animate-pulse'
              : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100'
          }`}
          aria-label={`Listen to ${word.transliteration}`}
        >
          <Volume2 className="w-4 h-4" />
          <span>آواز سنیں</span>
        </button>

        <button
          type="button"
          onClick={() => setShowSentence(!showSentence)}
          className={`p-2 rounded-xl transition-all ${
            showSentence ? 'bg-sky-100 text-sky-800' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
          title="جملہ دیکھیں"
          aria-label="Toggle example sentence"
        >
          <BookOpen className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={handleMasterClick}
          className={`py-2 px-3 rounded-xl font-nastaliq text-xs font-bold flex items-center justify-center gap-1 transition-all ${
            isMastered
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'bg-amber-400 text-amber-950 hover:bg-amber-500 shadow-xs'
          }`}
          aria-label={`Mark ${word.transliteration} as mastered`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>{isMastered ? 'یاد ہے ✓' : 'سیکھ لیا!'}</span>
        </button>
      </div>
    </div>
  );
};
