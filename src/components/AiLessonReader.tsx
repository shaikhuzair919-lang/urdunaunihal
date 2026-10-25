/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Volume2, CheckCircle2, ArrowRight, Sparkles, BookOpen, Clock, Award } from 'lucide-react';
import { StoredLesson } from '../../server';
import { StudentProfile } from '../utils/learningLogic';
import { speakUrduText, sfx } from '../utils/audio';

interface AiLessonReaderProps {
  lesson: StoredLesson;
  student: StudentProfile | null;
  onClose: () => void;
  onLessonCompleted: (score: number) => void;
}

export const AiLessonReader: React.FC<AiLessonReaderProps> = ({
  lesson,
  student,
  onClose,
  onLessonCompleted,
}) => {
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [selectedQuizOption, setSelectedQuizOption] = useState<number | null>(null);
  const [isQuizSubmitted, setIsQuizSubmitted] = useState(false);
  const [isCompleted, setIsCompleted] = useState(
    Boolean(student && lesson.readingStatus?.[student.id]?.isCompleted)
  );

  // Send live heartbeat to server while reading this lesson
  useEffect(() => {
    if (!student) return;

    const sendHeartbeat = () => {
      fetch(`/api/lessons/${lesson.id}/heartbeat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: student.id,
          studentName: student.name,
        }),
      }).catch(() => {});
    };

    sendHeartbeat();
    const interval = setInterval(sendHeartbeat, 15000); // every 15s

    return () => clearInterval(interval);
  }, [lesson.id, student?.id]);

  const handlePlayStoryAudio = () => {
    sfx.playPop();
    setIsPlayingAudio(true);
    speakUrduText(lesson.contentUrdu, () => {
      setIsPlayingAudio(false);
    });
  };

  const handleSelectQuiz = (idx: number) => {
    if (isQuizSubmitted) return;
    sfx.playPop();
    setSelectedQuizOption(idx);
    setIsQuizSubmitted(true);

    const isCorrect = idx === lesson.quizQuestion.correctIndex;
    if (isCorrect) {
      sfx.playSuccess();
    } else {
      sfx.playWrong();
    }
  };

  const handleFinishLesson = async () => {
    sfx.playFanfare();
    setIsCompleted(true);

    const score = selectedQuizOption === lesson.quizQuestion.correctIndex ? 1 : 0;

    if (student) {
      try {
        await fetch(`/api/lessons/${lesson.id}/complete`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            studentId: student.id,
            studentName: student.name,
            quizScore: score,
          }),
        });
      } catch (err) {
        console.warn('Could not record lesson completion', err);
      }
    }

    onLessonCompleted(score);
  };

  return (
    <div className="bg-white rounded-3xl p-5 sm:p-8 shadow-xl border-4 border-amber-300 max-w-3xl mx-auto my-4 relative animate-fadeIn">
      {/* Top Banner indicating live tracking */}
      <div className="bg-emerald-50 border border-emerald-200 px-4 py-2 rounded-2xl mb-5 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-emerald-500 animate-ping" />
          <span className="text-xs font-nastaliq font-bold text-emerald-900" dir="rtl">
            🔴 لائیو پڑھائی چل رہی ہے - استاد آپ کو پڑھتے ہوئے دیکھ رہے ہیں!
          </span>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="text-gray-400 hover:text-gray-700 text-xs font-kids font-bold px-2 py-1 rounded-lg bg-white border"
        >
          واپس جائیں ✕
        </button>
      </div>

      {/* Lesson Header */}
      <div className="text-center mb-6">
        <span className="text-xs font-bold px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 font-nastaliq">
          {lesson.level}
        </span>
        <h2 className="urdu-nastaliq-text text-3xl sm:text-4xl font-bold text-gray-900 mt-2 mb-1" dir="rtl">
          {lesson.titleUrdu}
        </h2>
        <p className="text-xs text-gray-500 font-kids">{lesson.titleEnglish}</p>
      </div>

      {/* Reading Text in Large Nastaliq */}
      <div className="bg-amber-50/60 rounded-3xl p-6 sm:p-8 border-2 border-amber-200 mb-6 text-right" dir="rtl">
        <div className="flex items-center justify-between border-b border-amber-200/80 pb-3 mb-4">
          <button
            type="button"
            onClick={handlePlayStoryAudio}
            className={`px-4 py-2 rounded-xl text-xs font-bold font-nastaliq flex items-center gap-2 shadow-xs transition-all ${
              isPlayingAudio
                ? 'bg-indigo-600 text-white animate-pulse'
                : 'bg-white text-indigo-700 border border-indigo-200 hover:bg-indigo-50'
            }`}
          >
            <Volume2 className="w-4 h-4" />
            <span>پورے سبق کی آواز سنیں</span>
          </button>
          <span className="text-xs text-amber-900 font-nastaliq font-semibold">
            متن کو غور سے پڑھیں 📖
          </span>
        </div>

        <p className="urdu-nastaliq-text text-2xl sm:text-3xl text-gray-900 leading-loose drop-shadow-2xs">
          {lesson.contentUrdu}
        </p>

        {lesson.contentEnglish && (
          <p className="text-xs text-gray-500 font-kids mt-4 pt-3 border-t border-amber-200/60 text-left" dir="ltr">
            English Translation: "{lesson.contentEnglish}"
          </p>
        )}
      </div>

      {/* Vocabulary Breakdown Chips */}
      {lesson.vocabulary && lesson.vocabulary.length > 0 && (
        <div className="mb-6">
          <h3 className="text-xs font-bold text-gray-600 font-nastaliq mb-2.5 text-right" dir="rtl">
            سبق کے خاص الفاظ اور حروف کا جوڑ توڑ:
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5" dir="rtl">
            {lesson.vocabulary.map((vocab, i) => (
              <div
                key={i}
                className="bg-white p-3 rounded-2xl border-2 border-indigo-100 flex flex-col justify-between"
              >
                <div className="flex items-center justify-between">
                  <span className="urdu-nastaliq-text text-2xl font-bold text-indigo-900">
                    {vocab.word}
                  </span>
                  <button
                    type="button"
                    onClick={() => speakUrduText(vocab.word)}
                    className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-100"
                    title="آواز سنیں"
                  >
                    <Volume2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="text-xs text-gray-600 font-nastaliq mt-1">
                  {vocab.meaning}
                </div>
                {vocab.letters && vocab.letters.length > 0 && (
                  <div className="flex items-center gap-1 mt-2 text-xs font-nastaliq text-amber-700 bg-amber-50 px-2 py-1 rounded-lg">
                    <span>جوڑ توڑ:</span>
                    <span>{vocab.letters.join(' + ')}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Comprehension Quiz */}
      {lesson.quizQuestion && (
        <div className="p-5 bg-purple-50/70 rounded-3xl border-2 border-purple-200 mb-6 text-right" dir="rtl">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-purple-700 font-kids">
              کوئز سوال (Comprehension Check)
            </span>
            <Award className="w-4 h-4 text-purple-600" />
          </div>
          <p className="urdu-nastaliq-text text-xl font-bold text-gray-900 mb-3">
            {lesson.quizQuestion.questionUrdu}
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {lesson.quizQuestion.options.map((opt, idx) => {
              const isSelected = selectedQuizOption === idx;
              const isCorrect = idx === lesson.quizQuestion.correctIndex;

              let style = 'bg-white text-gray-800 border-gray-200 hover:bg-purple-100';
              if (isQuizSubmitted) {
                if (isCorrect) {
                  style = 'bg-emerald-100 border-emerald-500 text-emerald-950 font-bold ring-2 ring-emerald-300';
                } else if (isSelected) {
                  style = 'bg-rose-100 border-rose-500 text-rose-950';
                }
              }

              return (
                <button
                  key={idx}
                  type="button"
                  disabled={isQuizSubmitted}
                  onClick={() => handleSelectQuiz(idx)}
                  className={`p-3 rounded-2xl border-2 text-center transition-all font-nastaliq text-base ${style}`}
                >
                  {opt}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Bottom Actions */}
      <div className="flex items-center justify-between gap-3 pt-3 border-t border-gray-100">
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 rounded-xl text-xs font-kids font-bold text-gray-600 hover:bg-gray-100"
        >
          ← واپس لسٹ میں جائیں
        </button>

        {!isCompleted ? (
          <button
            type="button"
            onClick={handleFinishLesson}
            className="px-6 py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-nastaliq text-base font-bold shadow-lg hover:from-emerald-600 hover:to-teal-700 flex items-center gap-2 active:scale-95 transition-all"
          >
            <Sparkles className="w-4 h-4 text-amber-300" />
            <span>میں نے سبق مکمل پڑھ لیا! (Mark Completed)</span>
          </button>
        ) : (
          <div className="flex items-center gap-2 text-emerald-700 font-nastaliq font-bold text-base">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            <span>ماشاءاللہ! آپ نے یہ سبق مکمل کر لیا ہے!</span>
          </div>
        )}
      </div>
    </div>
  );
};
