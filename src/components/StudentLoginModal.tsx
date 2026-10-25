/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Sparkles, User, Phone, Check, ArrowRight } from 'lucide-react';
import { StoredStudent } from '../../server';
import { sfx } from '../utils/audio';

interface StudentLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (student: StoredStudent) => void;
  existingStudents: StoredStudent[];
}

const AVATARS = ['👧', '👦', '🦁', '🐱', '🦋', '🦜', '🚀', '🌟', '🐰', '🐼'];

export const StudentLoginModal: React.FC<StudentLoginModalProps> = ({
  isOpen,
  onClose,
  onLoginSuccess,
  existingStudents,
}) => {
  const [name, setName] = useState('');
  const [parentPhone, setParentPhone] = useState('03001234567');
  const [selectedAvatar, setSelectedAvatar] = useState('👧');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMessage('برائے مہربانی بچے کا نام درج کریں۔');
      return;
    }

    sfx.playPop();
    setIsSubmitting(true);
    setErrorMessage(null);

    const childName = name.trim();
    const phone = parentPhone.trim() || '03001234567';

    try {
      const res = await fetch('/api/students/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: childName,
          parentPhone: phone,
          avatar: selectedAvatar,
        }),
      });

      if (res.ok) {
        const data: StoredStudent = await res.json();
        sfx.playSuccess();
        onLoginSuccess(data);
        onClose();
        return;
      }
    } catch (err) {
      console.warn('Network issue, using client fallback', err);
    }

    // Client fallback if network latency
    const fallbackStudent: StoredStudent = {
      id: 's_' + Date.now().toString(36),
      name: childName,
      parentPhone: phone,
      avatar: selectedAvatar,
      createdAt: Date.now(),
      lastActive: Date.now(),
      isCurrentlyOnline: true,
      masteredWordIds: [],
      totalPracticeMinutes: 0,
      quizzesTaken: 0,
      quizTotalScore: 0,
      quizMaxPossible: 0,
      history: [{ timestamp: Date.now(), action: 'registered' }],
    };
    sfx.playSuccess();
    onLoginSuccess(fallbackStudent);
    onClose();
    setIsSubmitting(false);
  };

  const handleSelectExisting = (st: StoredStudent) => {
    sfx.playSuccess();
    onLoginSuccess(st);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-lg rounded-3xl p-6 sm:p-8 shadow-2xl border-4 border-amber-300 relative text-right" dir="rtl">
        <button
          onClick={onClose}
          className="absolute top-4 left-4 p-2 text-gray-400 hover:text-gray-700 text-lg font-bold"
        >
          ✕
        </button>

        {/* Modal Header */}
        <div className="text-center mb-5">
          <div className="w-16 h-16 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center text-3xl mx-auto mb-2 shadow-inner">
            {selectedAvatar}
          </div>
          <h3 className="urdu-nastaliq-text text-2xl sm:text-3xl font-bold text-gray-900">
            طالب علم لاگ ان / نیا بچہ شامل کریں
          </h3>
          <p className="text-xs text-gray-500 font-kids text-center mt-1" dir="ltr">
            Easy 1-Click Student Login & Progress Tracking
          </p>
        </div>

        {/* 1-CLICK EXISTING KIDS */}
        {existingStudents.length > 0 && (
          <div className="mb-6 p-4 bg-amber-50/70 rounded-2xl border-2 border-amber-200">
            <div className="text-xs font-bold text-gray-800 font-nastaliq mb-2.5">
              👇 فوری 1-کلک لاگ ان (Tap your name to start):
            </div>
            <div className="grid grid-cols-2 gap-2">
              {existingStudents.map(st => (
                <button
                  key={st.id}
                  type="button"
                  onClick={() => handleSelectExisting(st)}
                  className="p-3 rounded-xl bg-white border-2 border-amber-300 hover:border-amber-500 hover:bg-amber-100/60 shadow-xs flex items-center gap-2.5 transition-all text-right"
                >
                  <span className="text-2xl">{st.avatar}</span>
                  <div>
                    <span className="font-nastaliq font-bold text-base text-gray-950 block">
                      {st.name}
                    </span>
                    <span className="text-[10px] text-gray-500 font-kids block" dir="ltr">
                      {st.parentPhone}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* NEW REGISTRATION FORM */}
        <form onSubmit={handleSubmit} className="space-y-4 pt-2 border-t border-gray-100">
          <div className="text-xs font-bold text-gray-600 font-nastaliq">
            یا نیا بچہ رجسٹر کریں (New Child Registration):
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 font-nastaliq mb-1">
              بچے کا نام (Child Name) *
            </label>
            <input
              type="text"
              required
              placeholder="مثال: فاطمہ / علی / عمر / عائشہ"
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border-2 border-gray-200 focus:border-amber-400 focus:outline-none font-nastaliq text-base"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 font-nastaliq mb-1">
              والدین کا موبائل نمبر (Parent Mobile Number):
            </label>
            <input
              type="tel"
              placeholder="03001234567"
              value={parentPhone}
              onChange={e => setParentPhone(e.target.value)}
              className="w-full px-4 py-2 rounded-xl border-2 border-gray-200 focus:border-amber-400 focus:outline-none font-kids text-sm text-left"
              dir="ltr"
            />
            <p className="text-[11px] text-gray-400 font-kids mt-1">
              والدین اپنے فون پر اسی نمبر کے ذریعے رپورٹ دیکھ سکتے ہیں۔
            </p>
          </div>

          {/* Avatar selection */}
          <div>
            <label className="block text-xs font-bold text-gray-700 font-nastaliq mb-1.5">
              پسندیدہ اوتار (Avatar):
            </label>
            <div className="flex items-center gap-2 flex-wrap">
              {AVATARS.map(av => (
                <button
                  key={av}
                  type="button"
                  onClick={() => {
                    sfx.playPop();
                    setSelectedAvatar(av);
                  }}
                  className={`w-10 h-10 rounded-xl text-xl flex items-center justify-center transition-all ${
                    selectedAvatar === av
                      ? 'bg-amber-400 scale-110 shadow-md ring-2 ring-amber-300'
                      : 'bg-gray-100 hover:bg-gray-200'
                  }`}
                >
                  {av}
                </button>
              ))}
            </div>
          </div>

          {errorMessage && (
            <p className="text-xs text-rose-600 font-kids text-center bg-rose-50 p-2 rounded-xl border border-rose-200">
              {errorMessage}
            </p>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3 rounded-2xl bg-gradient-to-r from-amber-400 via-amber-500 to-orange-500 text-gray-950 font-nastaliq text-base font-bold shadow-lg hover:from-amber-500 hover:to-orange-600 transition-all flex items-center justify-center gap-2 active:scale-95"
          >
            <Sparkles className="w-4 h-4 text-gray-950" />
            <span>{isSubmitting ? 'لاگ ان ہو رہا ہے...' : 'پڑھائی شروع کریں!'}</span>
          </button>
        </form>
      </div>
    </div>
  );
};
