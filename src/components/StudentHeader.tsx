/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Star, ShieldCheck, User, Users, Bot, Sparkles, BookOpen, Crown } from 'lucide-react';
import { StoredStudent } from '../../server';
import { sfx } from '../utils/audio';

interface StudentHeaderProps {
  currentStudent: StoredStudent | null;
  existingStudents: StoredStudent[];
  isAdminOpen: boolean;
  onOpenLoginModal: () => void;
  onToggleAdmin: (open: boolean) => void;
  onSelectQuickStudent: (st: StoredStudent) => void;
  starsCount: number;
}

export const StudentHeader: React.FC<StudentHeaderProps> = ({
  currentStudent,
  existingStudents,
  isAdminOpen,
  onOpenLoginModal,
  onToggleAdmin,
  onSelectQuickStudent,
  starsCount,
}) => {
  return (
    <header className="bg-white/95 backdrop-blur-md sticky top-0 z-40 border-b-2 border-amber-200 shadow-xs mb-5">
      {/* Top Universal Mode Bar */}
      <div className="bg-gradient-to-r from-amber-500 via-orange-500 to-indigo-700 text-white px-4 py-1.5 flex items-center justify-between text-xs font-kids font-bold">
        <div className="flex items-center gap-2">
          <span>موڈ منتخب کریں:</span>
          <button
            type="button"
            onClick={() => {
              sfx.playPop();
              onToggleAdmin(false);
            }}
            className={`px-3 py-1 rounded-lg text-xs font-nastaliq transition-all flex items-center gap-1 ${
              !isAdminOpen
                ? 'bg-white text-gray-950 shadow-xs'
                : 'bg-white/20 text-white hover:bg-white/30'
            }`}
          >
            <span>🧒 طالب علم موڈ (Student Learning)</span>
          </button>

          <button
            type="button"
            onClick={() => {
              sfx.playPop();
              onToggleAdmin(true);
            }}
            className={`px-3 py-1 rounded-lg text-xs font-nastaliq transition-all flex items-center gap-1.5 ${
              isAdminOpen
                ? 'bg-white text-indigo-950 shadow-xs'
                : 'bg-amber-300 text-amber-950 hover:bg-amber-200'
            }`}
          >
            <Crown className="w-3.5 h-3.5 text-amber-600 fill-amber-400" />
            <span>👑 سپر ایڈمن و استاد (Shaikh Uzair Admin)</span>
          </button>
        </div>

        <div className="hidden md:flex items-center gap-2 text-[11px] opacity-90">
          <span>🟢 لائیو کلاؤڈ سنک فعال ہے</span>
        </div>
      </div>

      {/* Main Header Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2.5 flex items-center justify-between gap-3 flex-wrap">
        {/* Left: App Title */}
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl bg-gradient-to-tr from-amber-400 via-orange-400 to-rose-400 flex items-center justify-center text-xl sm:text-2xl shadow-sm border border-white flex-shrink-0">
            📖
          </div>
          <div className="flex items-center gap-1.5">
            <h1 className="urdu-nastaliq-text text-xl sm:text-2xl font-bold text-gray-950 tracking-tight leading-none">
              اردو نونہال
            </h1>
            <span className="text-[10px] bg-amber-400 text-amber-950 font-nastaliq font-bold px-1.5 py-0.5 rounded-md hidden sm:inline">
              بچوں کا قاعدہ
            </span>
          </div>
        </div>

        {/* Center: Current Student & Quick Switch */}
        {!isAdminOpen && (
          <div className="flex items-center gap-1.5 overflow-x-auto py-1">
            <span className="text-[11px] font-bold text-gray-500 font-kids hidden md:inline">
              طالب علم:
            </span>
            {existingStudents.slice(0, 4).map(st => {
              const isSelected = currentStudent?.id === st.id;
              return (
                <button
                  key={st.id}
                  type="button"
                  onClick={() => {
                    sfx.playSuccess();
                    onSelectQuickStudent(st);
                  }}
                  className={`px-2.5 py-1 rounded-xl text-xs font-bold font-nastaliq flex items-center gap-1.5 transition-all border ${
                    isSelected
                      ? 'bg-amber-400 text-gray-950 border-amber-500 shadow-xs ring-2 ring-amber-300'
                      : 'bg-gray-100 hover:bg-amber-100 text-gray-700 border-gray-200'
                  }`}
                >
                  <span className="text-sm">{st.avatar}</span>
                  <span>{st.name.split(' ')[0]}</span>
                </button>
              );
            })}

            <button
              type="button"
              onClick={() => {
                sfx.playPop();
                onOpenLoginModal();
              }}
              className="px-2.5 py-1 rounded-xl text-xs font-bold font-kids bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 transition-all flex items-center gap-1"
              title="نیا بچہ رجسٹر کریں"
            >
              <User className="w-3.5 h-3.5" />
              <span>+ نیا بچہ</span>
            </button>
          </div>
        )}

        {/* Right: Stars & Admin button */}
        <div className="flex items-center gap-2">
          <div className="bg-amber-50 border border-amber-200 px-2.5 py-1.5 rounded-xl flex items-center gap-1.5 shadow-2xs">
            <Star className="w-4 h-4 fill-amber-400 text-amber-500" />
            <span className="text-xs sm:text-sm font-bold text-amber-900 font-kids flex items-center gap-1">
              {starsCount} <span className="font-nastaliq text-xs">ستارے</span>
            </span>
          </div>

          <button
            type="button"
            onClick={() => {
              sfx.playPop();
              onToggleAdmin(!isAdminOpen);
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold font-nastaliq flex items-center gap-1.5 shadow-xs transition-all ${
              isAdminOpen
                ? 'bg-gray-800 text-white hover:bg-gray-900'
                : 'bg-gradient-to-r from-purple-700 to-indigo-700 hover:from-purple-800 hover:to-indigo-800 text-white'
            }`}
          >
            <Crown className="w-4 h-4 text-amber-300" />
            <span>{isAdminOpen ? 'طالب علم موڈ' : 'ایڈمن پورٹل'}</span>
          </button>
        </div>
      </div>
    </header>
  );
};
