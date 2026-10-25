/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  Search,
  Sparkles,
  Award,
  BookOpen,
  Volume2,
  Filter,
  CheckCircle,
  HelpCircle,
  ShieldCheck,
  ChevronLeft,
  Bot,
  Radio,
  UserPlus,
  Crown,
} from 'lucide-react';
import {
  URDU_WORDS_DATABASE,
  CATEGORIES,
  LETTER_LEVELS,
  UrduWord,
} from './data/urduData';
import {
  calculateLevelProgress,
  filterUrduWords,
  generateParentSummary,
} from './utils/learningLogic';
import { StoredStudent, StoredLesson } from '../server';
import { WordCard } from './components/WordCard';
import { ProgressBar } from './components/ProgressBar';
import { InteractiveQuiz } from './components/InteractiveQuiz';
import { AdminPortal } from './components/AdminPortal';
import { StudentLoginModal } from './components/StudentLoginModal';
import { StudentHeader } from './components/StudentHeader';
import { AiLessonReader } from './components/AiLessonReader';
import { sfx } from './utils/audio';

export default function App() {
  const [currentStudent, setCurrentStudent] = useState<StoredStudent | null>(null);
  const [existingStudents, setExistingStudents] = useState<StoredStudent[]>([]);
  const [lessonsList, setLessonsList] = useState<StoredLesson[]>([]);
  const [activeReadingLesson, setActiveReadingLesson] = useState<StoredLesson | null>(null);

  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isAdminPortalOpen, setIsAdminPortalOpen] = useState(false);
  const [reportCardStudent, setReportCardStudent] = useState<StoredStudent | null>(null);

  // Main UI Mode
  const [activeTab, setActiveTab] = useState<'letters' | 'categories' | 'ai_lessons' | 'quiz'>('letters');
  const [selectedLevel, setSelectedLevel] = useState<2 | 3 | 4 | 5 | 'all'>(2);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Active quiz state
  const [isQuizActive, setIsQuizActive] = useState(false);
  const [quizLevelTarget, setQuizLevelTarget] = useState<number>(2);

  // Load students & lessons from server
  const loadData = async () => {
    try {
      const [resStudents, resLessons] = await Promise.all([
        fetch('/api/students'),
        fetch('/api/lessons'),
      ]);

      if (resStudents.ok) {
        const list: StoredStudent[] = await resStudents.json();
        setExistingStudents(list);

        const savedId = localStorage.getItem('urdu_kids_student_id');
        if (savedId) {
          const found = list.find(s => s.id === savedId);
          if (found) {
            setCurrentStudent(found);
          }
        }
      }

      if (resLessons.ok) {
        const lessons: StoredLesson[] = await resLessons.json();
        setLessonsList(lessons);
      }
    } catch (err) {
      console.warn('Backend connection check', err);
    }
  };

  useEffect(() => {
    loadData();
    // High-frequency sync every 8 seconds so all devices stay up-to-date!
    const interval = setInterval(loadData, 8000);
    return () => clearInterval(interval);
  }, []);

  // Heartbeat while student is active
  useEffect(() => {
    if (!currentStudent) return;
    const sendPulse = () => {
      fetch(`/api/students/${currentStudent.id}/activity`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'session_active',
          practiceMinutes: 1,
        }),
      })
        .then(res => res.json())
        .then(data => {
          if (data?.student) {
            setCurrentStudent(data.student);
          }
        })
        .catch(() => {});
    };

    sendPulse();
    const interval = setInterval(sendPulse, 30000); // every 30s
    return () => clearInterval(interval);
  }, [currentStudent?.id]);

  // Handle word mastered toggle
  const handleToggleMastered = async (wordId: string) => {
    if (!currentStudent) {
      setIsLoginModalOpen(true);
      return;
    }

    const isAlready = currentStudent.masteredWordIds.includes(wordId);
    let updatedMastered: string[];
    if (isAlready) {
      updatedMastered = currentStudent.masteredWordIds.filter(id => id !== wordId);
    } else {
      updatedMastered = [...currentStudent.masteredWordIds, wordId];
    }

    // Optimistic UI update
    setCurrentStudent(prev => (prev ? { ...prev, masteredWordIds: updatedMastered } : null));

    try {
      const res = await fetch(`/api/students/${currentStudent.id}/activity`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'word_learned',
          wordId,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data?.student) {
          setCurrentStudent(data.student);
        }
      }
    } catch (e) {
      console.warn('Sync word mastery error', e);
    }
  };

  // Handle quiz completion
  const handleQuizComplete = async (
    score: number,
    total: number,
    quizType: string,
    level: number
  ) => {
    if (!currentStudent) return;

    try {
      const res = await fetch(`/api/students/${currentStudent.id}/activity`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'quiz_completed',
          score,
          total,
          quizType,
          level,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data?.student) {
          setCurrentStudent(data.student);
        }
      }
    } catch (e) {
      console.warn('Sync quiz error', e);
    }
  };

  const masteredWordIds = currentStudent?.masteredWordIds || [];

  // Filter words
  const filteredWords = useMemo(() => {
    let list = URDU_WORDS_DATABASE;

    if (activeTab === 'letters' && selectedLevel !== 'all') {
      list = list.filter(w => w.letterCount === selectedLevel);
    } else if (activeTab === 'categories' && selectedCategory !== 'all') {
      list = list.filter(w => w.category === selectedCategory);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      list = list.filter(
        w =>
          w.urdu.includes(q) ||
          w.transliteration.toLowerCase().includes(q) ||
          w.meaningUrdu.includes(q) ||
          w.meaningEnglish.toLowerCase().includes(q)
      );
    }

    return list;
  }, [activeTab, selectedLevel, selectedCategory, searchQuery]);

  // Stage progress calculations
  const levelProgress = useMemo(() => {
    return {
      2: calculateLevelProgress(2, masteredWordIds, URDU_WORDS_DATABASE),
      3: calculateLevelProgress(3, masteredWordIds, URDU_WORDS_DATABASE),
      4: calculateLevelProgress(4, masteredWordIds, URDU_WORDS_DATABASE),
      5: calculateLevelProgress(5, masteredWordIds, URDU_WORDS_DATABASE),
    };
  }, [masteredWordIds]);

  const totalWords = URDU_WORDS_DATABASE.length;
  const masteredCount = masteredWordIds.length;
  const overallPercent = Math.round((masteredCount / totalWords) * 100);

  const handleStartLevelQuiz = (lvl: number) => {
    sfx.playPop();
    setQuizLevelTarget(lvl);
    setIsQuizActive(true);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50/50 via-sky-50/30 to-purple-50/40 text-gray-900 flex flex-col font-kids">
      {/* Universal Header with Role & Admin Switcher */}
      <StudentHeader
        currentStudent={currentStudent}
        existingStudents={existingStudents}
        isAdminOpen={isAdminPortalOpen}
        onOpenLoginModal={() => setIsLoginModalOpen(true)}
        onToggleAdmin={open => setIsAdminPortalOpen(open)}
        onSelectQuickStudent={st => {
          setCurrentStudent(st);
          localStorage.setItem('urdu_kids_student_id', st.id);
        }}
        starsCount={masteredCount * 5 + (currentStudent?.quizTotalScore || 0) * 10}
      />

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 w-full pb-16">
        {/* VIEW 1: SUPER ADMIN PORTAL (SHAIKH UZAIR CONTROL ROOM) */}
        {isAdminPortalOpen ? (
          <AdminPortal
            onExitAdmin={() => setIsAdminPortalOpen(false)}
            onOpenReportCard={st => setReportCardStudent(st)}
          />
        ) : !currentStudent ? (
          /* VIEW 2: WELCOME ONBOARDING SCREEN IF NO CHILD IS SELECTED ON THIS DEVICE */
          <div className="max-w-2xl mx-auto my-8 bg-white rounded-3xl p-6 sm:p-10 shadow-xl border-4 border-amber-300 text-center animate-fadeIn">
            <div className="w-20 h-20 rounded-3xl bg-amber-100 text-amber-700 flex items-center justify-center text-4xl mx-auto mb-4 shadow-inner">
              📖
            </div>
            <h2 className="urdu-nastaliq-text text-3xl sm:text-4xl font-bold text-gray-950 mb-2">
              خوش آمدید! آج کون پڑھ رہا ہے؟
            </h2>
            <p className="text-xs text-gray-500 font-kids mb-6" dir="ltr">
              Select your child profile or register as a new student to start learning
            </p>

            {existingStudents.length > 0 && (
              <div className="mb-6 p-4 bg-amber-50/70 rounded-2xl border-2 border-amber-200">
                <div className="text-xs font-bold text-gray-700 font-nastaliq mb-3 text-right" dir="rtl">
                  پہلے سے موجود طلباء (Tap to start):
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {existingStudents.map(st => (
                    <button
                      key={st.id}
                      type="button"
                      onClick={() => {
                        sfx.playSuccess();
                        setCurrentStudent(st);
                        localStorage.setItem('urdu_kids_student_id', st.id);
                      }}
                      className="p-3.5 rounded-2xl bg-white border-2 border-amber-300 hover:border-amber-500 hover:bg-amber-100/60 shadow-xs flex items-center gap-2.5 transition-all text-right"
                      dir="rtl"
                    >
                      <span className="text-3xl">{st.avatar}</span>
                      <div>
                        <span className="font-nastaliq font-bold text-base text-gray-900 block">
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

            <button
              type="button"
              onClick={() => setIsLoginModalOpen(true)}
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-amber-400 via-amber-500 to-orange-500 text-gray-950 font-nastaliq text-lg font-bold shadow-lg hover:from-amber-500 hover:to-orange-600 transition-all flex items-center justify-center gap-2 active:scale-95"
            >
              <UserPlus className="w-5 h-5 text-gray-950" />
              <span>+ نیا طالب علم شامل کریں (Register New Student)</span>
            </button>
          </div>
        ) : activeReadingLesson ? (
          /* VIEW 3: ACTIVE AI LESSON READER VIEW */
          <AiLessonReader
            lesson={activeReadingLesson}
            student={currentStudent}
            onClose={() => setActiveReadingLesson(null)}
            onLessonCompleted={() => {
              loadData();
              setTimeout(() => setActiveReadingLesson(null), 1200);
            }}
          />
        ) : isQuizActive ? (
          /* VIEW 4: ACTIVE QUIZ VIEW */
          <div className="max-w-3xl mx-auto">
            <InteractiveQuiz
              initialLevel={quizLevelTarget}
              onQuizComplete={handleQuizComplete}
              onExitQuiz={() => setIsQuizActive(false)}
            />
          </div>
        ) : (
          /* VIEW 5: NORMAL STUDY VIEW */
          <>
            {/* Live Study Status Indicator for Student */}
            <div className="mb-4 p-3.5 bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-indigo-500/10 rounded-2xl border-2 border-emerald-300 flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2.5">
                <span className="w-3 h-3 rounded-full bg-emerald-500 animate-ping" />
                <span className="text-xs font-nastaliq font-bold text-emerald-950" dir="rtl">
                  🔴 لائیو پڑھائی جاری ہے: {currentStudent.name} آن لائن ہے اور استاد عزیر آپ کی حاضری دیکھ رہے ہیں!
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsAdminPortalOpen(true)}
                className="text-[11px] font-kids font-bold text-indigo-700 hover:text-indigo-900 bg-white px-3 py-1 rounded-xl border shadow-2xs flex items-center gap-1"
              >
                <Crown className="w-3.5 h-3.5 text-amber-500" />
                <span>ایڈمن مانیٹرنگ پورٹل کھولیں →</span>
              </button>
            </div>

            {/* Stage Progress Bar (Always visible at top of study) */}
            <ProgressBar
              levelProgress={levelProgress}
              overallPercent={overallPercent}
              masteredCount={masteredCount}
              totalWords={totalWords}
              activeLevel={activeTab === 'letters' ? selectedLevel : undefined}
              onSelectLevel={lvl => {
                sfx.playPop();
                setActiveTab('letters');
                setSelectedLevel(lvl);
              }}
            />

            {/* AI Teacher Lessons Glowing Banner */}
            {lessonsList.length > 0 && (
              <div className="mb-6 p-4.5 rounded-3xl bg-gradient-to-r from-purple-700 via-indigo-700 to-amber-500 text-white shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-xs flex items-center justify-center text-2xl shadow-inner">
                    🤖
                  </div>
                  <div className="text-right" dir="rtl">
                    <h3 className="urdu-nastaliq-text text-xl font-bold">
                      استاد کی طرف سے AI اسباق (Teacher's AI Lessons):
                    </h3>
                    <p className="text-xs opacity-90 font-kids text-left" dir="ltr">
                      {lessonsList.length} customized reading lessons assigned by your teacher
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
                  {lessonsList.slice(0, 2).map(lesson => (
                    <button
                      key={lesson.id}
                      type="button"
                      onClick={() => {
                        sfx.playPop();
                        setActiveReadingLesson(lesson);
                      }}
                      className="px-3.5 py-2 rounded-xl bg-white text-indigo-950 font-nastaliq text-xs font-bold shadow-md hover:bg-amber-100 transition-all flex items-center gap-1.5 whitespace-nowrap"
                    >
                      <BookOpen className="w-3.5 h-3.5 text-purple-600" />
                      <span>{lesson.titleUrdu}</span>
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => {
                      sfx.playPop();
                      setActiveTab('ai_lessons');
                    }}
                    className="px-3 py-2 rounded-xl bg-white/20 hover:bg-white/30 text-white font-nastaliq text-xs font-bold whitespace-nowrap"
                  >
                    تمام اسباق دیکھیں
                  </button>
                </div>
              </div>
            )}

            {/* Main Tabs Navigation */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mb-6">
              <div className="flex items-center gap-1 sm:gap-1.5 p-1 sm:p-1.5 bg-white/90 rounded-2xl border-2 border-amber-200 shadow-xs overflow-x-auto w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => {
                    sfx.playPop();
                    setActiveTab('letters');
                  }}
                  className={`flex-1 sm:flex-none px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-1 whitespace-nowrap ${
                    activeTab === 'letters'
                      ? 'bg-amber-400 text-gray-950 shadow-xs'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <span className="font-nastaliq text-sm sm:text-base">حروف کے درجے</span>
                  <span className="text-[10px] sm:text-[11px] font-kids hidden md:inline">(2-5 Letters)</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    sfx.playPop();
                    setActiveTab('categories');
                  }}
                  className={`flex-1 sm:flex-none px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-1 whitespace-nowrap ${
                    activeTab === 'categories'
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <span className="font-nastaliq text-sm sm:text-base">موضوعاتی زمرے</span>
                  <span className="text-[10px] sm:text-[11px] font-kids hidden md:inline">(Categories)</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    sfx.playPop();
                    setActiveTab('ai_lessons');
                  }}
                  className={`flex-1 sm:flex-none px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-1 whitespace-nowrap ${
                    activeTab === 'ai_lessons'
                      ? 'bg-purple-600 text-white shadow-xs'
                      : 'text-purple-800 bg-purple-50 hover:bg-purple-100'
                  }`}
                >
                  <Bot className="w-3.5 h-3.5" />
                  <span className="font-nastaliq text-sm sm:text-base">AI اسباق</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    sfx.playPop();
                    setIsQuizActive(true);
                  }}
                  className="px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-bold text-amber-900 bg-amber-50 hover:bg-amber-100 border border-amber-200 transition-all flex items-center justify-center gap-1 whitespace-nowrap"
                >
                  <Award className="w-3.5 h-3.5 text-amber-600" />
                  <span className="font-nastaliq text-sm sm:text-base">کوئز کھیلیں</span>
                </button>
              </div>

              {/* Quick Search Input */}
              <div className="relative w-full sm:w-72">
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="لفظ تلاش کریں (Search word)..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 rounded-xl bg-white/90 border-2 border-amber-200 focus:border-amber-400 focus:outline-none text-xs sm:text-sm font-kids shadow-2xs text-right"
                  dir="rtl"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs font-bold"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>

            {/* SUB-TABS: FOR LETTER LEVELS */}
            {activeTab === 'letters' && (
              <div className="bg-white/80 backdrop-blur-xs p-3 rounded-2xl border border-amber-100 shadow-2xs mb-6">
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                    <button
                      type="button"
                      onClick={() => {
                        sfx.playPop();
                        setSelectedLevel('all');
                      }}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold font-nastaliq transition-all whitespace-nowrap flex-shrink-0 ${
                        selectedLevel === 'all'
                          ? 'bg-gray-800 text-white shadow-xs'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      تمام الفاظ (All)
                    </button>
                    {LETTER_LEVELS.map(lvl => (
                      <button
                        key={lvl.id}
                        type="button"
                        onClick={() => {
                          sfx.playPop();
                          setSelectedLevel(lvl.id as 2 | 3 | 4 | 5);
                        }}
                        className={`px-3.5 py-1.5 rounded-xl text-xs font-bold font-nastaliq transition-all flex items-center gap-1.5 whitespace-nowrap flex-shrink-0 ${
                          selectedLevel === lvl.id
                            ? 'bg-amber-400 text-gray-950 shadow-sm ring-2 ring-amber-300'
                            : 'bg-amber-50/70 text-gray-700 hover:bg-amber-100'
                        }`}
                      >
                        <span>{lvl.titleUrdu}</span>
                        <span className="text-[10px] font-kids opacity-75">
                          ({lvl.id}-L)
                        </span>
                      </button>
                    ))}
                  </div>

                  {typeof selectedLevel === 'number' && (
                    <button
                      type="button"
                      onClick={() => handleStartLevelQuiz(selectedLevel)}
                      className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-xs font-bold font-nastaliq flex items-center justify-center gap-1.5 shadow-sm hover:from-purple-700 hover:to-indigo-700 whitespace-nowrap"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>اس لیول کا کوئز لیں</span>
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* SUB-TABS: FOR CATEGORIES */}
            {activeTab === 'categories' && (
              <div className="bg-white/80 backdrop-blur-xs p-3.5 rounded-2xl border border-indigo-100 shadow-2xs mb-6">
                <div className="flex items-center gap-2 overflow-x-auto pb-1">
                  {CATEGORIES.map(cat => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => {
                        sfx.playPop();
                        setSelectedCategory(cat.id);
                      }}
                      className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 flex-shrink-0 border ${
                        selectedCategory === cat.id
                          ? 'bg-indigo-600 text-white border-indigo-700 shadow-md ring-2 ring-indigo-200'
                          : 'bg-white text-gray-700 border-gray-200 hover:border-indigo-300'
                      }`}
                    >
                      <span className="text-base">{cat.icon}</span>
                      <span className="font-nastaliq text-sm">{cat.titleUrdu}</span>
                      <span className="text-[10px] font-kids opacity-75 hidden sm:inline">
                        ({cat.titleEnglish})
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* TAB VIEW: AI LESSONS LIST */}
            {activeTab === 'ai_lessons' ? (
              <div className="space-y-4">
                <div className="p-4 bg-purple-50 rounded-2xl border border-purple-200 text-right" dir="rtl">
                  <h3 className="urdu-nastaliq-text text-xl font-bold text-purple-950">
                    استاد کے بنائے ہوئے پڑھائی کے اسباق (Teacher's Lessons)
                  </h3>
                  <p className="text-xs text-gray-600 font-kids mt-1 text-left" dir="ltr">
                    Click any lesson to open interactive reading with voice and comprehension check.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {lessonsList.map(lesson => {
                    const isCompleted = Boolean(
                      currentStudent && lesson.readingStatus?.[currentStudent.id]?.isCompleted
                    );

                    return (
                      <div
                        key={lesson.id}
                        className="bg-white p-5 rounded-3xl border-2 border-purple-200 hover:border-purple-400 shadow-sm transition-all flex flex-col justify-between text-right"
                        dir="rtl"
                      >
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-purple-100 text-purple-800 font-nastaliq">
                              {lesson.level}
                            </span>
                            {isCompleted && (
                              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-kids flex items-center gap-1">
                                <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                                <span>مکمل ✓</span>
                              </span>
                            )}
                          </div>
                          <h4 className="urdu-nastaliq-text text-2xl font-bold text-gray-950 mb-1">
                            {lesson.titleUrdu}
                          </h4>
                          <p className="text-xs text-gray-500 font-kids mb-3 text-left" dir="ltr">
                            {lesson.titleEnglish}
                          </p>
                          <p className="urdu-nastaliq-text text-base text-gray-700 line-clamp-2 leading-relaxed bg-amber-50/50 p-3 rounded-2xl border border-amber-100">
                            {lesson.contentUrdu}
                          </p>
                        </div>

                        <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between">
                          <button
                            type="button"
                            onClick={() => {
                              sfx.playPop();
                              setActiveReadingLesson(lesson);
                            }}
                            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-nastaliq text-xs font-bold shadow-md hover:from-purple-700 hover:to-indigo-700 flex items-center gap-1.5"
                          >
                            <span>یہ سبق پڑھیں 📖</span>
                          </button>
                          <span className="text-[11px] text-gray-400 font-kids" dir="ltr">
                            {new Date(lesson.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              /* Words Grid */
              filteredWords.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-5">
                  {filteredWords.map(word => (
                    <WordCard
                      key={word.id}
                      word={word}
                      isMastered={masteredWordIds.includes(word.id)}
                      onToggleMastered={handleToggleMastered}
                    />
                  ))}
                </div>
              ) : (
                <div className="bg-white rounded-3xl p-12 text-center border-2 border-amber-200 max-w-md mx-auto my-10">
                  <div className="text-5xl mb-3">🔍</div>
                  <h3 className="urdu-nastaliq-text text-2xl font-bold text-gray-800 mb-1">
                    کوئی لفظ نہیں ملا
                  </h3>
                  <p className="text-xs text-gray-500 font-kids mb-4">
                    No matching words found for this filter.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery('');
                      setSelectedLevel('all');
                      setSelectedCategory('all');
                    }}
                    className="px-4 py-2 rounded-xl bg-amber-400 text-amber-950 font-kids text-xs font-bold hover:bg-amber-500"
                  >
                    تمام فلٹرز ہٹائیں (Reset Filters)
                  </button>
                </div>
              )
            )}
          </>
        )}
      </main>

      {/* Student Login / Profile Switcher Modal */}
      <StudentLoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        existingStudents={existingStudents}
        onLoginSuccess={st => {
          setCurrentStudent(st);
          localStorage.setItem('urdu_kids_student_id', st.id);
          loadData();
        }}
      />

      {/* REPORT CARD MODAL */}
      {reportCardStudent && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-3xl p-6 sm:p-8 shadow-2xl border-4 border-amber-300 relative text-center">
            <button
              onClick={() => setReportCardStudent(null)}
              className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-700 text-lg font-bold"
            >
              ✕
            </button>
            <div className="w-16 h-16 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center text-3xl mx-auto mb-3 shadow-inner">
              📜
            </div>
            <h3 className="urdu-nastaliq-text text-3xl font-bold text-gray-900">
              کارکردگی رپورٹ کارڈ
            </h3>
            <p className="text-xs font-semibold text-indigo-600 font-kids">
              Certified by Shaikh Uzair (Super Admin)
            </p>

            <div className="my-5 p-4 bg-amber-50/60 rounded-2xl border border-amber-200" dir="rtl">
              <div className="text-base font-nastaliq font-bold text-gray-800 mb-1">
                طالب علم کا نام: <span className="text-indigo-800 text-lg">{reportCardStudent.name}</span>
              </div>
              <div className="text-xs text-gray-600 font-kids">
                والدین کا فون: {reportCardStudent.parentPhone}
              </div>
              <div className="text-xs text-gray-500 font-kids mt-1">
                تاریخ: {new Date().toLocaleDateString()}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 my-4">
              <div className="bg-gray-50 p-2.5 rounded-xl border border-gray-200">
                <div className="text-[11px] text-gray-500 font-kids">الفاظ کی تعداد</div>
                <div className="text-lg font-bold text-indigo-700 font-kids">
                  {reportCardStudent.masteredWordIds.length}
                </div>
              </div>
              <div className="bg-gray-50 p-2.5 rounded-xl border border-gray-200">
                <div className="text-[11px] text-gray-500 font-kids">کوئز مکمل</div>
                <div className="text-lg font-bold text-emerald-600 font-kids">
                  {reportCardStudent.quizzesTaken}
                </div>
              </div>
              <div className="bg-gray-50 p-2.5 rounded-xl border border-gray-200">
                <div className="text-[11px] text-gray-500 font-kids">پڑھائی کا وقت</div>
                <div className="text-base font-bold text-amber-700 font-kids">
                  {reportCardStudent.totalPracticeMinutes} منٹ
                </div>
              </div>
            </div>

            <div className="flex items-center justify-center gap-3 mt-5">
              <button
                type="button"
                onClick={() => window.print()}
                className="px-5 py-2.5 rounded-xl bg-indigo-600 text-white font-kids text-xs font-bold shadow-md hover:bg-indigo-700"
              >
                پرنٹ کریں (Print)
              </button>
              <button
                type="button"
                onClick={() => setReportCardStudent(null)}
                className="px-5 py-2.5 rounded-xl bg-gray-200 text-gray-800 font-kids text-xs font-bold hover:bg-gray-300"
              >
                بند کریں
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
