/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Star, Award, Sparkles } from 'lucide-react';
import { LETTER_LEVELS } from '../data/urduData';
import { LevelProgress } from '../utils/learningLogic';

interface ProgressBarProps {
  levelProgress: Record<2 | 3 | 4 | 5, LevelProgress>;
  overallPercent: number;
  masteredCount: number;
  totalWords: number;
  activeLevel?: number | 'all';
  onSelectLevel?: (lvl: 2 | 3 | 4 | 5) => void;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  levelProgress,
  overallPercent,
  masteredCount,
  totalWords,
  activeLevel,
  onSelectLevel,
}) => {
  return (
    <div className="bg-white/95 backdrop-blur-sm rounded-2xl p-4 sm:p-5 shadow-md border-2 border-amber-100 mb-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-xl bg-amber-400/20 text-amber-600 flex items-center justify-center font-bold text-xl">
            🏆
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-gray-800 font-nastaliq flex items-center gap-2" dir="rtl">
              <span>آپ کی پڑھائی کی رفتار</span>
              <span className="text-xs bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full font-bold font-kids">
                {masteredCount} / {totalWords} <span className="font-nastaliq text-[11px]">الفاظ</span>
              </span>
            </h2>
            <p className="text-xs text-gray-500 font-kids">
              Overall Progress: {overallPercent}% words completed
            </p>
          </div>
        </div>

        {/* Global Progress Bar */}
        <div className="w-full sm:w-64 flex items-center gap-2">
          <div className="flex-1 bg-gray-100 h-3.5 rounded-full overflow-hidden p-0.5 border border-gray-200">
            <div
              className="bg-gradient-to-r from-emerald-400 via-teal-500 to-amber-500 h-full rounded-full transition-all duration-700 ease-out shadow-sm"
              style={{ width: `${Math.max(5, overallPercent)}%` }}
            />
          </div>
          <span className="text-xs font-bold text-emerald-700 font-kids min-w-[38px] text-right">
            {overallPercent}%
          </span>
        </div>
      </div>

      {/* 4 Stage Breakdown Badges */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3 pt-2 border-t border-gray-100">
        {LETTER_LEVELS.map((lvl) => {
          const p = levelProgress[lvl.id as 2 | 3 | 4 | 5];
          const isActive = activeLevel === lvl.id;

          return (
            <button
              key={lvl.id}
              onClick={() => onSelectLevel && onSelectLevel(lvl.id as 2 | 3 | 4 | 5)}
              className={`p-2.5 sm:p-3 rounded-xl text-right transition-all flex flex-col justify-between border-2 text-left sm:text-right ${
                isActive
                  ? 'border-indigo-500 bg-indigo-50/60 shadow-sm ring-2 ring-indigo-200'
                  : 'border-gray-100 hover:border-gray-200 bg-gray-50/50 hover:bg-gray-100/60'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold font-kids px-1.5 py-0.5 rounded bg-white/80 shadow-xs text-gray-700">
                  {p.masteredWords}/{p.totalWords}
                </span>
                <span className="text-xs font-nastaliq font-bold text-gray-800">
                  {lvl.titleUrdu}
                </span>
              </div>

              {/* Individual Stage Bar */}
              <div className="w-full bg-gray-200/80 h-2 rounded-full overflow-hidden mt-1 mb-1.5">
                <div
                  className={`h-full rounded-full transition-all duration-500 bg-gradient-to-r ${lvl.color}`}
                  style={{ width: `${p.percent}%` }}
                />
              </div>

              <div className="flex items-center justify-between text-[11px] text-gray-500 font-kids">
                <span className="flex items-center gap-1 text-amber-600 font-bold">
                  <Star className="w-3 h-3 fill-amber-400" />
                  {p.percent}%
                </span>
                <span className="text-[10px] text-gray-400">{lvl.titleEnglish}</span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
