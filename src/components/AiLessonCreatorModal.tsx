/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Sparkles, BookOpen, Send, Check, X } from 'lucide-react';
import { StoredLesson } from '../../server';
import { StudentProfile } from '../utils/learningLogic';
import { sfx } from '../utils/audio';

interface AiLessonCreatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  students: StudentProfile[];
  onLessonCreated: (lesson: StoredLesson) => void;
}

const QUICK_TOPICS = [
  'صبح کی سیر اور دو اور تین حرفی الفاظ',
  'جنگل کے جانور اور شیر کی کہانی',
  'باغ کے لال اور پیلے میٹھے پھل',
  'اچھی عادتیں، سچ بولنا اور صفائی',
  'سواریاں: گاڑی، بس، سائیکل اور ریل',
  'بارش اور آسمان پر چمکتا سورج',
];

export const AiLessonCreatorModal: React.FC<AiLessonCreatorModalProps> = ({
  isOpen,
  onClose,
  students,
  onLessonCreated,
}) => {
  const [topic, setTopic] = useState('');
  const [level, setLevel] = useState('۲ اور ۳ حرفی الفاظ');
  const [assignedTo, setAssignedTo] = useState('all');
  const [isGenerating, setIsGenerating] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic.trim()) {
      setErrorMessage('برائے مہربانی سبق کا موضوع درج کریں۔');
      return;
    }

    sfx.playPop();
    setIsGenerating(true);
    setErrorMessage(null);

    const studentObj = students.find(s => s.id === assignedTo);

    try {
      const res = await fetch('/api/ai/generate-lesson', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: topic.trim(),
          level,
          assignedTo,
          studentName: studentObj ? studentObj.name : undefined,
        }),
      });

      if (!res.ok) {
        throw new Error('سبق بنانے میں خرابی ہوئی');
      }

      const data = await res.json();
      if (data.lesson) {
        sfx.playFanfare();
        onLessonCreated(data.lesson);
        onClose();
      } else {
        throw new Error('سبق واپس نہیں ملا');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'کنکشن میں مسئلہ ہے');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-lg rounded-3xl p-6 sm:p-8 shadow-2xl border-4 border-indigo-200 relative text-right" dir="rtl">
        <button
          onClick={onClose}
          className="absolute top-4 left-4 p-2 text-gray-400 hover:text-gray-700 text-lg font-bold"
        >
          ✕
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 mb-5 border-b pb-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-purple-500 to-indigo-600 text-white flex items-center justify-center text-2xl shadow-md">
            🤖
          </div>
          <div>
            <h3 className="urdu-nastaliq-text text-2xl font-bold text-gray-900">
              استاد کا AI سبق ساز (Gemini AI Lesson Generator)
            </h3>
            <p className="text-xs text-gray-500 font-kids text-left" dir="ltr">
              Generate custom illustrated reading lessons tailored for your students
            </p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleGenerate} className="space-y-4">
          {/* Topic Input */}
          <div>
            <label className="block text-xs font-bold text-gray-700 font-nastaliq mb-1.5">
              سبق کا موضوع یا کہانی کا آئیڈیا لکھیں: *
            </label>
            <input
              type="text"
              required
              placeholder="مثال: صبح کی سیر، چڑیا گھر کے جانور، اچھے بچے..."
              value={topic}
              onChange={e => setTopic(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border-2 border-gray-200 focus:border-indigo-500 focus:outline-none font-nastaliq text-base"
            />
          </div>

          {/* Quick suggestions */}
          <div>
            <span className="text-[11px] font-bold text-gray-500 font-nastaliq block mb-1">
              یا فوری موضوع چنیں (Tap to pick):
            </span>
            <div className="flex flex-wrap gap-1.5">
              {QUICK_TOPICS.map((t, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    sfx.playPop();
                    setTopic(t);
                  }}
                  className="px-2.5 py-1 rounded-lg bg-gray-100 hover:bg-indigo-50 text-[11px] font-nastaliq text-gray-700 border border-gray-200 hover:border-indigo-300 transition-all"
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Level Selector */}
          <div>
            <label className="block text-xs font-bold text-gray-700 font-nastaliq mb-1.5">
              پڑھائی کا درجہ (Difficulty Level):
            </label>
            <select
              value={level}
              onChange={e => setLevel(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border-2 border-gray-200 focus:border-indigo-500 font-nastaliq text-sm bg-white"
            >
              <option value="۲ اور ۳ حرفی الفاظ">۲ اور ۳ حرفی الفاظ (بنیادی سطح)</option>
              <option value="۳ اور ۴ حرفی الفاظ">۳ اور ۴ حرفی الفاظ (درمیانی سطح)</option>
              <option value="۴ اور ۵ حرفی الفاظ">۴ اور ۵ حرفی الفاظ (اعلیٰ سطح)</option>
              <option value="سادہ روزمرہ جملے">سادہ روزمرہ جملے اور اخلاقی کہانیاں</option>
            </select>
          </div>

          {/* Assign to Student */}
          <div>
            <label className="block text-xs font-bold text-gray-700 font-nastaliq mb-1.5">
              یہ سبق کس کو تفویض (Assign) کرنا ہے؟
            </label>
            <select
              value={assignedTo}
              onChange={e => setAssignedTo(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border-2 border-gray-200 focus:border-indigo-500 font-nastaliq text-sm bg-white"
            >
              <option value="all">تمام بچوں کے لیے (All Students)</option>
              {students.map(st => (
                <option key={st.id} value={st.id}>
                  صرف {st.name} کے لیے
                </option>
              ))}
            </select>
          </div>

          {errorMessage && (
            <p className="text-xs text-rose-600 font-kids text-center bg-rose-50 p-2 rounded-xl border border-rose-200">
              {errorMessage}
            </p>
          )}

          <div className="pt-2 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isGenerating}
              className="px-4 py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-kids text-xs font-bold"
            >
              منسوخ کریں
            </button>

            <button
              type="submit"
              disabled={isGenerating}
              className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-nastaliq text-base font-bold shadow-lg hover:from-purple-700 hover:to-indigo-700 transition-all flex items-center justify-center gap-2"
            >
              <Sparkles className="w-4 h-4 text-amber-300 animate-spin" />
              <span>{isGenerating ? 'AI سبق تیار ہو رہا ہے...' : 'AI سبق بنائیں اور بچے کو بھیجیں!'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
