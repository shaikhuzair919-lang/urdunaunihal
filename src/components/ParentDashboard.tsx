/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  CheckCircle2,
  Clock,
  Award,
  BookOpen,
  RefreshCw,
  Printer,
  ChevronRight,
  TrendingUp,
  AlertTriangle,
  UserCheck,
  Star,
  Sparkles,
  Bot,
  Activity,
  Radio,
} from 'lucide-react';
import { StoredStudent, StoredLesson } from '../../server';
import { generateParentSummary, ParentSummaryReport } from '../utils/learningLogic';
import { URDU_WORDS_DATABASE, LETTER_LEVELS } from '../data/urduData';
import { AiLessonCreatorModal } from './AiLessonCreatorModal';
import { sfx } from '../utils/audio';

interface ParentDashboardProps {
  currentStudent: StoredStudent | null;
  onSelectStudent: (student: StoredStudent) => void;
  onClose: () => void;
}

export const ParentDashboard: React.FC<ParentDashboardProps> = ({
  currentStudent,
  onSelectStudent,
  onClose,
}) => {
  const [studentsList, setStudentsList] = useState<StoredStudent[]>([]);
  const [lessonsList, setLessonsList] = useState<StoredLesson[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState<string>(
    currentStudent?.id || ''
  );
  const [phoneFilter, setPhoneFilter] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showReportCardModal, setShowReportCardModal] = useState(false);
  const [showAiCreatorModal, setShowAiCreatorModal] = useState(false);
  const [resetStatus, setResetStatus] = useState<string | null>(null);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [resStudents, resLessons] = await Promise.all([
        fetch('/api/students'),
        fetch('/api/lessons'),
      ]);

      if (resStudents.ok) {
        const data = await resStudents.json();
        setStudentsList(data);
        if (!selectedStudentId && data.length > 0) {
          setSelectedStudentId(data[0].id);
        }
      }

      if (resLessons.ok) {
        const lessonsData = await resLessons.json();
        setLessonsList(lessonsData);
      }
    } catch (e) {
      console.warn('Error fetching data:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // Auto-refresh every 10 seconds so teacher sees live reading status in real-time
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, []);

  const activeStudent =
    studentsList.find(s => s.id === selectedStudentId) ||
    currentStudent ||
    studentsList[0];

  const summary: ParentSummaryReport | null = activeStudent
    ? generateParentSummary(activeStudent as any, URDU_WORDS_DATABASE)
    : null;

  const filteredStudents = studentsList.filter(s => {
    if (!phoneFilter.trim()) return true;
    return s.parentPhone.includes(phoneFilter.trim()) || s.name.includes(phoneFilter.trim());
  });

  // Find any student currently reading live
  const currentlyReadingStudents = studentsList.filter(s => s.isCurrentlyOnline);

  const handleResetProgress = async () => {
    if (!activeStudent) return;
    const confirmReset = window.confirm(
      `کیا آپ واقعی ${activeStudent.name} کی پڑھائی کا ریکارڈ ری سیٹ کرنا چاہتے ہیں؟`
    );
    if (!confirmReset) return;

    try {
      const res = await fetch(`/api/students/${activeStudent.id}/reset`, { method: 'POST' });
      if (res.ok) {
        setResetStatus('پڑھائی کا ریکارڈ کامیابی سے ری سیٹ کر دیا گیا۔');
        fetchData();
        setTimeout(() => setResetStatus(null), 3000);
      }
    } catch {
      setResetStatus('ری سیٹ کرنے میں خرابی ہوئی۔');
    }
  };

  return (
    <div className="bg-white rounded-3xl p-5 sm:p-7 shadow-xl border-2 border-indigo-200 animate-fadeIn">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-5 border-b border-gray-100">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-indigo-100 text-indigo-700 text-xl font-bold">
              👨‍🏫
            </span>
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900 font-nastaliq" dir="rtl">
                استاد اور والدین کا لائیو مانیٹرنگ پورٹل
              </h2>
              <p className="text-xs text-gray-500 font-kids">
                Teacher & Parent Live Monitoring Dashboard (Real-time student activity & AI lessons)
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap">
          <button
            type="button"
            onClick={() => {
              sfx.playPop();
              setShowAiCreatorModal(true);
            }}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-nastaliq text-xs font-bold shadow-md hover:from-purple-700 hover:to-indigo-700 flex items-center gap-1.5 transition-all active:scale-95"
          >
            <Bot className="w-4 h-4 text-amber-300" />
            <span>نیا AI سبق بنائیں 🤖</span>
          </button>

          <button
            type="button"
            onClick={fetchData}
            className={`p-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 transition-all ${
              isLoading ? 'animate-spin' : ''
            }`}
            title="تازہ ترین معلومات حاصل کریں"
            aria-label="Refresh student data"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => setShowReportCardModal(true)}
            disabled={!activeStudent}
            className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-kids text-xs font-bold shadow-xs flex items-center gap-1.5"
          >
            <Printer className="w-4 h-4" />
            <span>رپورٹ کارڈ</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-kids text-xs font-bold transition-all"
          >
            طالب علم موڈ میں جائیں ✕
          </button>
        </div>
      </div>

      {/* 🔴 CRITICAL LIVE STATUS BEACON: TEACHER SEES WHEN A CHILD IS CURRENTLY READING! */}
      <div className="my-4 p-4 rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-600 to-indigo-600 text-white shadow-md">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <span className="relative flex h-4 w-4">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-300 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-4 w-4 bg-amber-400"></span>
            </span>
            <div className="text-right" dir="rtl">
              <h3 className="urdu-nastaliq-text text-lg sm:text-xl font-bold leading-tight">
                🔴 براہِ راست لائیو نگرانی (Live Classroom Monitor):
              </h3>
              <p className="text-xs opacity-95 font-kids text-left" dir="ltr">
                {currentlyReadingStudents.length > 0 ? (
                  <span className="font-bold text-amber-200">
                    Active Now: {currentlyReadingStudents.map(s => s.name).join(', ')} is currently studying!
                  </span>
                ) : (
                  <span>All students are currently idle. Status refreshes automatically every 10 seconds.</span>
                )}
              </p>
            </div>
          </div>
          <span className="text-xs bg-white/20 px-3 py-1 rounded-full font-kids">
            {currentlyReadingStudents.length} بچہ آن لائن
          </span>
        </div>
      </div>

      {/* Student Selector Bar & Quick Filter */}
      <div className="my-5 p-4 bg-slate-50 rounded-2xl border border-slate-200">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-3">
          <div className="text-xs font-bold text-gray-700 font-kids">
            طالب علم منتخب کریں (Select Student to inspect):
          </div>
          <div className="w-full sm:w-64">
            <input
              type="text"
              placeholder="فون نمبر یا نام سے تلاش کریں..."
              value={phoneFilter}
              onChange={e => setPhoneFilter(e.target.value)}
              className="w-full text-xs px-3 py-1.5 rounded-xl border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400 font-kids text-right"
              dir="rtl"
            />
          </div>
        </div>

        {/* Student Badges */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {filteredStudents.map(student => {
            const isSelected = activeStudent?.id === student.id;
            const isLive = student.isCurrentlyOnline;
            const studiedToday = Date.now() - student.lastActive < 24 * 60 * 60 * 1000;

            return (
              <button
                key={student.id}
                type="button"
                onClick={() => {
                  setSelectedStudentId(student.id);
                  onSelectStudent(student);
                }}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 flex-shrink-0 border-2 ${
                  isSelected
                    ? 'bg-indigo-600 text-white border-indigo-700 shadow-md ring-2 ring-indigo-200'
                    : 'bg-white text-gray-800 border-gray-200 hover:border-gray-300'
                }`}
              >
                <span className="text-base">{student.avatar}</span>
                <span className="font-nastaliq">{student.name}</span>
                {isLive ? (
                  <span className="flex items-center gap-1 bg-emerald-400 text-emerald-950 text-[10px] px-1.5 py-0.5 rounded-full font-bold">
                    🔴 لائیو
                  </span>
                ) : (
                  <span
                    className={`w-2.5 h-2.5 rounded-full ${
                      studiedToday ? 'bg-emerald-400' : 'bg-rose-400'
                    }`}
                    title={studiedToday ? 'آج پڑھائی کی' : 'آج نہیں پڑھا'}
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Details for the Selected Student */}
      {summary && activeStudent ? (
        <div className="space-y-6">
          {/* Active vs Inactive Alert Banner */}
          <div
            className={`p-4 sm:p-5 rounded-2xl border-2 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
              summary.hasStudiedToday
                ? 'bg-emerald-50/80 border-emerald-300 text-emerald-950'
                : 'bg-rose-50/90 border-rose-300 text-rose-950'
            }`}
          >
            <div className="flex items-center gap-3">
              <div
                className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shadow-sm ${
                  summary.hasStudiedToday ? 'bg-emerald-200 text-emerald-800' : 'bg-rose-200 text-rose-800 animate-bounce'
                }`}
              >
                {summary.hasStudiedToday ? '🟢' : '⚠️'}
              </div>
              <div className="text-right" dir="rtl">
                <h3 className="urdu-nastaliq-text text-xl sm:text-2xl font-bold">
                  {summary.hasStudiedToday
                    ? `شاباش! ${activeStudent.name} نے آج پڑھائی کی ہے!`
                    : `توجہ فرمائیں! ${activeStudent.name} نے آج پڑھائی نہیں کی!`
                  }
                </h3>
                <p className="text-xs font-kids font-medium opacity-90" dir="ltr">
                  {summary.hasStudiedToday
                    ? `Active today! Last practice was ${summary.hoursSinceActive === 0 ? 'just now' : `${summary.hoursSinceActive} hours ago`}.`
                    : `Alert: Student has not logged any reading for ${summary.hoursSinceActive} hours.`
                  }
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-center font-kids text-xs">
              <span className="px-3 py-1.5 rounded-xl bg-white/90 font-bold shadow-xs border">
                والدین کا فون: {activeStudent.parentPhone}
              </span>
              <span className="px-3 py-1.5 rounded-xl bg-white/90 font-bold shadow-xs border text-indigo-700">
                درجہ: {summary.grade}
              </span>
            </div>
          </div>

          {/* Quick Metrics Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
            <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs">
              <div className="flex items-center justify-between text-gray-500 mb-1">
                <span className="text-xs font-kids">کل سیکھے الفاظ</span>
                <BookOpen className="w-4 h-4 text-indigo-500" />
              </div>
              <div className="text-2xl font-bold text-gray-900 font-kids">
                {summary.masteredCount} <span className="text-xs text-gray-400 font-normal">/ {summary.totalWords}</span>
              </div>
              <div className="text-[11px] text-emerald-600 font-kids mt-1">
                {summary.overallProgressPercent}% الفاظ یاد ہو چکے
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs">
              <div className="flex items-center justify-between text-gray-500 mb-1">
                <span className="text-xs font-kids">کوئز درستگی</span>
                <Award className="w-4 h-4 text-amber-500" />
              </div>
              <div className="text-2xl font-bold text-gray-900 font-kids">
                {summary.averageQuizScorePercent}%
              </div>
              <div className="text-[11px] text-gray-500 font-kids mt-1">
                {activeStudent.quizzesTaken} کوئز مکمل کیے
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs">
              <div className="flex items-center justify-between text-gray-500 mb-1">
                <span className="text-xs font-kids">پڑھائی کا وقت</span>
                <Clock className="w-4 h-4 text-sky-500" />
              </div>
              <div className="text-2xl font-bold text-gray-900 font-kids">
                {activeStudent.totalPracticeMinutes} <span className="text-xs text-gray-400 font-normal">منٹ</span>
              </div>
              <div className="text-[11px] text-sky-600 font-kids mt-1">
                ایپ میں صرف شدہ وقت
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs">
              <div className="flex items-center justify-between text-gray-500 mb-1">
                <span className="text-xs font-kids">مجموعی کارکردگی</span>
                <TrendingUp className="w-4 h-4 text-emerald-500" />
              </div>
              <div className="text-xl font-bold text-indigo-700 font-nastaliq">
                {summary.grade}
              </div>
              <div className="text-[11px] text-gray-500 font-kids mt-1">
                اساتذہ کی رائے
              </div>
            </div>
          </div>

          {/* AI TEACHER LESSONS ASSIGNMENT & TRACKING */}
          <div className="bg-purple-50/50 p-5 rounded-2xl border-2 border-purple-200">
            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
              <div className="text-right" dir="rtl">
                <h3 className="text-base font-bold text-purple-950 font-nastaliq">
                  استاد کے تفویض کردہ AI اسباق (Assigned AI Lessons)
                </h3>
                <p className="text-xs text-gray-500 font-kids text-left" dir="ltr">
                  Track who is currently reading and who completed each lesson
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowAiCreatorModal(true)}
                className="px-3.5 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-nastaliq text-xs font-bold shadow-xs flex items-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                <span>نیا سبق بنائیں</span>
              </button>
            </div>

            {lessonsList.length === 0 ? (
              <p className="text-xs text-gray-400 italic text-center py-4 font-kids">
                ابھی تک کوئی AI سبق شامل نہیں ہے۔ "نیا سبق بنائیں" پر کلک کریں۔
              </p>
            ) : (
              <div className="space-y-3">
                {lessonsList.map(lesson => {
                  const studentStatus = activeStudent
                    ? lesson.readingStatus?.[activeStudent.id]
                    : null;

                  return (
                    <div
                      key={lesson.id}
                      className="bg-white p-4 rounded-xl border border-purple-100 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-right"
                      dir="rtl"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-purple-100 text-purple-800 font-nastaliq">
                            {lesson.level}
                          </span>
                          <span className="text-xs text-gray-400 font-kids" dir="ltr">
                            {new Date(lesson.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        <h4 className="urdu-nastaliq-text text-lg font-bold text-gray-900">
                          {lesson.titleUrdu}
                        </h4>
                        <p className="text-xs text-gray-500 font-kids line-clamp-1 text-left" dir="ltr">
                          {lesson.titleEnglish}: "{lesson.contentUrdu.substring(0, 50)}..."
                        </p>
                      </div>

                      {/* Status for currently selected student */}
                      <div className="flex items-center gap-2 font-kids text-xs">
                        {studentStatus?.isCurrentlyReading ? (
                          <span className="px-3 py-1.5 rounded-xl bg-emerald-100 text-emerald-800 font-bold flex items-center gap-1.5 animate-pulse border border-emerald-300">
                            <Radio className="w-3.5 h-3.5 text-emerald-600 animate-spin" />
                            <span>اس وقت پڑھ رہا ہے! (Live Reading)</span>
                          </span>
                        ) : studentStatus?.isCompleted ? (
                          <span className="px-3 py-1.5 rounded-xl bg-indigo-50 text-indigo-700 font-bold flex items-center gap-1 border border-indigo-200">
                            <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600" />
                            <span>مکمل کر لیا (Score: {studentStatus.quizScore}/1)</span>
                          </span>
                        ) : (
                          <span className="px-3 py-1.5 rounded-xl bg-gray-100 text-gray-600 font-medium">
                            ابھی نہیں پڑھا (Pending)
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* STAGE-BY-STAGE PROGRESS BARS */}
          <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200">
            <h3 className="text-base font-bold text-gray-900 font-nastaliq mb-3" dir="rtl">
              حروف کی بنیاد پر مراحل کی ترقی (Stage Progress Bars)
            </h3>

            <div className="space-y-3.5">
              {LETTER_LEVELS.map(lvl => {
                const lp = summary.levelProgress[lvl.id as 2 | 3 | 4 | 5];
                return (
                  <div key={lvl.id} className="bg-white p-3.5 rounded-xl border border-gray-200 shadow-2xs">
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 font-kids">
                          {lp.masteredWords} / {lp.totalWords} الفاظ
                        </span>
                        <span className="text-xs text-gray-500 font-kids">({lvl.titleEnglish})</span>
                      </div>
                      <span className="font-nastaliq font-bold text-sm text-gray-900">
                        {lvl.titleUrdu}
                      </span>
                    </div>

                    <div className="w-full bg-gray-100 h-3 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-700 bg-gradient-to-r ${lvl.color}`}
                        style={{ width: `${lp.percent}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-gray-500 font-kids mt-1">
                      <span>مکمل: {lp.percent}%</span>
                      <span>باقی: {lp.totalWords - lp.masteredWords} الفاظ</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Reset progress */}
          <div className="pt-2 flex items-center justify-between">
            <span className="text-xs text-gray-400 font-kids">
              اگر بچہ نئے سرے سے ٹریننگ کرنا چاہے تو ریکارڈ ری سیٹ کریں۔
            </span>
            <button
              type="button"
              onClick={handleResetProgress}
              className="text-xs text-rose-600 hover:text-rose-800 underline font-kids"
            >
              پڑھائی کا ڈیٹا ری سیٹ کریں
            </button>
          </div>
          {resetStatus && (
            <p className="text-xs text-emerald-600 font-kids text-center">{resetStatus}</p>
          )}
        </div>
      ) : (
        <div className="text-center py-10">
          <p className="font-nastaliq text-lg text-gray-600">کوئی طالب علم منتخب نہیں کیا گیا۔</p>
        </div>
      )}

      {/* AI LESSON CREATOR MODAL */}
      <AiLessonCreatorModal
        isOpen={showAiCreatorModal}
        onClose={() => setShowAiCreatorModal(false)}
        students={studentsList}
        onLessonCreated={newLesson => {
          setLessonsList(prev => [newLesson, ...prev]);
        }}
      />

      {/* PRINTABLE / SHAREABLE REPORT CARD MODAL */}
      {showReportCardModal && summary && activeStudent && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-3xl p-6 sm:p-8 shadow-2xl border-4 border-amber-300 relative text-center">
            <button
              onClick={() => setShowReportCardModal(false)}
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
              Urdu Learning Achievement Certificate
            </p>

            <div className="my-5 p-4 bg-amber-50/60 rounded-2xl border border-amber-200" dir="rtl">
              <div className="text-base font-nastaliq font-bold text-gray-800 mb-1">
                طالب علم کا نام: <span className="text-indigo-800 text-lg">{activeStudent.name}</span>
              </div>
              <div className="text-xs text-gray-600 font-kids">
                والدین کا رابطہ: {activeStudent.parentPhone}
              </div>
              <div className="text-xs text-gray-500 font-kids mt-1">
                تاریخ اجراء: {new Date().toLocaleDateString()}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 my-4">
              <div className="bg-gray-50 p-2.5 rounded-xl border border-gray-200">
                <div className="text-[11px] text-gray-500 font-kids">الفاظ کی تعداد</div>
                <div className="text-lg font-bold text-indigo-700 font-kids">
                  {summary.masteredCount}
                </div>
              </div>
              <div className="bg-gray-50 p-2.5 rounded-xl border border-gray-200">
                <div className="text-[11px] text-gray-500 font-kids">کوئز درستگی</div>
                <div className="text-lg font-bold text-emerald-600 font-kids">
                  {summary.averageQuizScorePercent}%
                </div>
              </div>
              <div className="bg-gray-50 p-2.5 rounded-xl border border-gray-200">
                <div className="text-[11px] text-gray-500 font-kids">حاصل کردہ گریڈ</div>
                <div className="text-base font-bold text-amber-700 font-nastaliq">
                  {summary.grade}
                </div>
              </div>
            </div>

            <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 my-4 text-right" dir="rtl">
              <div className="text-xs font-nastaliq font-bold text-emerald-900">
                اساتذہ کے کلمات:
              </div>
              <p className="urdu-nastaliq-text text-sm text-emerald-800">
                {summary.overallProgressPercent >= 60
                  ? 'ماشاءاللہ! بچے کی اردو پڑھنے کی صلاحیت بہت زبردست ہو رہی ہے۔'
                  : 'بچہ باقاعدگی سے مشق جاری رکھے تاکہ ذخیرہ الفاظ میں مزید نکھار آئے۔'
                }
              </p>
            </div>

            <div className="flex items-center justify-center gap-3 mt-5">
              <button
                type="button"
                onClick={() => window.print()}
                className="px-5 py-2.5 rounded-xl bg-indigo-600 text-white font-kids text-xs font-bold shadow-md hover:bg-indigo-700"
              >
                پرنٹ کریں / محفوظ کریں (Print)
              </button>
              <button
                type="button"
                onClick={() => setShowReportCardModal(false)}
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
};
