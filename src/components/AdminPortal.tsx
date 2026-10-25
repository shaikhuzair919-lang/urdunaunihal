/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Users,
  Radio,
  Sparkles,
  Bot,
  RefreshCw,
  Printer,
  Trash2,
  PlusCircle,
  Clock,
  Award,
  BookOpen,
  CheckCircle2,
  AlertTriangle,
  UserCheck,
  TrendingUp,
} from 'lucide-react';
import { StoredStudent, StoredLesson } from '../../server';
import { generateParentSummary } from '../utils/learningLogic';
import { URDU_WORDS_DATABASE, LETTER_LEVELS } from '../data/urduData';
import { AiLessonCreatorModal } from './AiLessonCreatorModal';
import { sfx } from '../utils/audio';

interface AdminPortalProps {
  onExitAdmin: () => void;
  onOpenReportCard: (student: StoredStudent) => void;
}

export const AdminPortal: React.FC<AdminPortalProps> = ({
  onExitAdmin,
  onOpenReportCard,
}) => {
  const [students, setStudents] = useState<StoredStudent[]>([]);
  const [lessons, setLessons] = useState<StoredLesson[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showAiModal, setShowAiModal] = useState(false);
  const [showAddStudentModal, setShowAddStudentModal] = useState(false);
  const [newStudentName, setNewStudentName] = useState('');
  const [newStudentPhone, setNewStudentPhone] = useState('03001234567');
  const [lastSyncedTime, setLastSyncedTime] = useState<Date>(new Date());
  const [searchQuery, setSearchQuery] = useState('');

  const fetchOverview = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/admin/overview');
      if (res.ok) {
        const data = await res.json();
        setStudents(data.students || []);
        setLessons(data.lessons || []);
        setLastSyncedTime(new Date());
      }
    } catch (err) {
      console.warn('Could not fetch admin overview', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchOverview();
    // High-frequency auto-sync every 5 seconds so teacher sees live activity across phones immediately!
    const interval = setInterval(fetchOverview, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleCreateStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStudentName.trim()) return;

    sfx.playPop();
    try {
      const res = await fetch('/api/students/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newStudentName.trim(),
          parentPhone: newStudentPhone.trim() || '03001234567',
          avatar: '👦',
        }),
      });
      if (res.ok) {
        sfx.playSuccess();
        setNewStudentName('');
        setShowAddStudentModal(false);
        fetchOverview();
      }
    } catch (err) {
      console.warn('Failed to add student', err);
    }
  };

  const handleDeleteStudent = async (studentId: string, studentName: string) => {
    const confirmDelete = window.confirm(`کیا آپ واقعی ${studentName} کا ریکارڈ حذف کرنا چاہتے ہیں؟`);
    if (!confirmDelete) return;

    try {
      const res = await fetch(`/api/students/${studentId}`, { method: 'DELETE' });
      if (res.ok) {
        sfx.playPop();
        fetchOverview();
      }
    } catch (err) {
      console.warn('Delete failed', err);
    }
  };

  const filteredStudents = students.filter(s => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.trim().toLowerCase();
    return s.name.toLowerCase().includes(q) || s.parentPhone.includes(q);
  });

  const activeOnlineStudents = students.filter(s => s.isCurrentlyOnline);

  return (
    <div className="bg-white rounded-3xl p-5 sm:p-8 shadow-2xl border-4 border-indigo-200 animate-fadeIn">
      {/* Super Admin Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-5 border-b-2 border-indigo-100">
        <div className="flex items-center gap-3">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-700 via-purple-700 to-amber-500 text-white flex items-center justify-center text-3xl shadow-lg border-2 border-white">
            👑
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-950 font-nastaliq" dir="rtl">
                سپر ایڈمن کنٹرول روم
              </h2>
              <span className="text-xs bg-indigo-600 text-white font-kids font-bold px-3 py-1 rounded-full shadow-xs">
                Super Admin Control
              </span>
              <span className="text-xs bg-amber-100 text-amber-900 border border-amber-300 font-nastaliq font-bold px-3 py-0.5 rounded-full">
                استاد شیخ عزیر
              </span>
            </div>
            <p className="text-xs text-gray-500 font-kids mt-1" dir="ltr">
              Full Administrator Authority • Multi-device Live Attendance & AI Curriculum Director
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap">
          <button
            type="button"
            onClick={() => {
              sfx.playPop();
              setShowAiModal(true);
            }}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-nastaliq text-xs font-bold shadow-md flex items-center gap-1.5 transition-all active:scale-95"
          >
            <Bot className="w-4 h-4 text-amber-300" />
            <span>نیا AI سبق بنائیں 🤖</span>
          </button>

          <button
            type="button"
            onClick={() => {
              sfx.playPop();
              setShowAddStudentModal(true);
            }}
            className="px-3.5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-kids text-xs font-bold shadow-xs flex items-center gap-1"
          >
            <PlusCircle className="w-4 h-4" />
            <span>+ بچہ شامل کریں</span>
          </button>

          <button
            type="button"
            onClick={fetchOverview}
            className={`p-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 transition-all ${
              isLoading ? 'animate-spin' : ''
            }`}
            title="تازہ ترین معلومات حاصل کریں"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={onExitAdmin}
            className="px-4 py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-kids text-xs font-bold"
          >
            طالب علم ویو ✕
          </button>
        </div>
      </div>

      {/* 🔴 LIVE CLASSROOM MONITOR: PULSATING BEACON SHOWING ACTIVE READERS */}
      <div className="my-5 p-5 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-700 text-white shadow-lg">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <span className="relative flex h-5 w-5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-300 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-5 w-5 bg-amber-400"></span>
            </span>
            <div className="text-right" dir="rtl">
              <div className="flex items-center gap-2">
                <h3 className="urdu-nastaliq-text text-xl sm:text-2xl font-bold">
                  براہِ راست لائیو پڑھائی کی نگرانی
                </h3>
                <span className="text-xs bg-emerald-800/80 text-emerald-100 font-kids px-2.5 py-0.5 rounded-full" dir="ltr">
                  Live Device Monitor
                </span>
              </div>
              <p className="text-xs text-amber-100 font-kids text-left mt-1" dir="ltr">
                {activeOnlineStudents.length > 0 ? (
                  <span className="font-bold text-white">
                    Currently Online & Reading: {activeOnlineStudents.map(s => `${s.name} (${s.currentReadingLessonTitle || 'اردو الفاظ'})`).join(' • ')}
                  </span>
                ) : (
                  <span>No students are active right now. Real-time sync pulses automatically every 5 seconds.</span>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 font-kids text-xs">
            <span className="px-3 py-1.5 rounded-xl bg-white/20 font-bold backdrop-blur-xs">
              آن لائن: {activeOnlineStudents.length} / {students.length}
            </span>
            <span className="px-3 py-1.5 rounded-xl bg-white/20 font-bold backdrop-blur-xs">
              Sync: {lastSyncedTime.toLocaleTimeString()}
            </span>
          </div>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mb-5">
        <div className="text-sm font-bold text-gray-800 font-nastaliq" dir="rtl">
          تمام رجسٹرڈ طلباء ({filteredStudents.length}):
        </div>

        <div className="w-full sm:w-72">
          <input
            type="text"
            placeholder="طالب علم یا فون نمبر سے تلاش کریں..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full text-xs px-3.5 py-2 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-400 text-right font-nastaliq"
            dir="rtl"
          />
        </div>
      </div>

      {/* Students Table / Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {filteredStudents.map(student => {
          const summary = generateParentSummary(student as any, URDU_WORDS_DATABASE);
          const isLive = student.isCurrentlyOnline;

          return (
            <div
              key={student.id}
              className={`bg-white p-5 rounded-3xl border-2 transition-all shadow-sm hover:shadow-md flex flex-col justify-between text-right ${
                isLive
                  ? 'border-emerald-400 bg-emerald-50/20 ring-2 ring-emerald-200'
                  : 'border-gray-200'
              }`}
              dir="rtl"
            >
              <div>
                {/* Card Top: Avatar, Name, Live Beacon */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2.5">
                    <span className="text-3xl p-1 bg-amber-50 rounded-2xl border border-amber-200">
                      {student.avatar}
                    </span>
                    <div>
                      <h4 className="urdu-nastaliq-text text-xl font-bold text-gray-950">
                        {student.name}
                      </h4>
                      <p className="text-[11px] text-gray-500 font-kids text-left" dir="ltr">
                        Phone: {student.parentPhone}
                      </p>
                    </div>
                  </div>

                  {isLive ? (
                    <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 font-bold text-xs flex items-center gap-1 animate-pulse border border-emerald-300 font-kids">
                      <Radio className="w-3 h-3 text-emerald-600 animate-spin" />
                      <span>🔴 لائیو</span>
                    </span>
                  ) : summary.hasStudiedToday ? (
                    <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[11px] font-bold font-kids">
                      🟢 آج پڑھا
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 text-[11px] font-bold font-kids">
                      ⚠️ غیر حاضر ({summary.hoursSinceActive}h)
                    </span>
                  )}
                </div>

                {/* Metrics */}
                <div className="grid grid-cols-3 gap-2 my-3 text-center" dir="ltr">
                  <div className="bg-gray-50 p-2 rounded-xl border border-gray-100">
                    <div className="text-[10px] text-gray-400 font-kids">Words</div>
                    <div className="text-sm font-bold text-indigo-700 font-kids">
                      {student.masteredWordIds.length}/{URDU_WORDS_DATABASE.length}
                    </div>
                  </div>
                  <div className="bg-gray-50 p-2 rounded-xl border border-gray-100">
                    <div className="text-[10px] text-gray-400 font-kids">Quizzes</div>
                    <div className="text-sm font-bold text-amber-600 font-kids">
                      {student.quizzesTaken} ({summary.averageQuizScorePercent}%)
                    </div>
                  </div>
                  <div className="bg-gray-50 p-2 rounded-xl border border-gray-100">
                    <div className="text-[10px] text-gray-400 font-kids">Grade</div>
                    <div className="text-xs font-bold text-emerald-700 font-nastaliq">
                      {summary.grade.split(' ')[0]}
                    </div>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden my-2">
                  <div
                    className="bg-gradient-to-r from-emerald-500 to-indigo-600 h-full rounded-full transition-all"
                    style={{ width: `${summary.overallProgressPercent}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-[11px] text-gray-500 font-kids mb-3" dir="ltr">
                  <span>Progress: {summary.overallProgressPercent}%</span>
                  <span>Practice: {student.totalPracticeMinutes} mins</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-gray-100 flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => onOpenReportCard(student)}
                  className="flex-1 py-1.5 px-3 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-800 font-nastaliq text-xs font-bold transition-all"
                >
                  رپورٹ کارڈ
                </button>

                <button
                  type="button"
                  onClick={() => handleDeleteStudent(student.id, student.name)}
                  className="p-1.5 rounded-xl bg-gray-100 hover:bg-rose-100 text-gray-500 hover:text-rose-600 transition-all"
                  title="طالب علم کو حذف کریں"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* ASSIGNED AI LESSONS SECTION */}
      <div className="p-6 bg-purple-50/60 rounded-3xl border-2 border-purple-200 mb-8">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <div className="text-right" dir="rtl">
            <h3 className="text-lg font-bold text-purple-950 font-nastaliq">
              استاد کے تیار کردہ AI اسباق کی فہرست ({lessons.length}):
            </h3>
            <p className="text-xs text-gray-600 font-kids text-left" dir="ltr">
              Generated via Gemini AI & Adaptive Curriculum Engine
            </p>
          </div>

          <button
            type="button"
            onClick={() => setShowAiModal(true)}
            className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-nastaliq text-xs font-bold shadow-xs flex items-center gap-1.5"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span>نیا سبق بنائیں</span>
          </button>
        </div>

        <div className="space-y-3">
          {lessons.map(lesson => (
            <div
              key={lesson.id}
              className="bg-white p-4 rounded-2xl border border-purple-100 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-right"
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
                <h4 className="urdu-nastaliq-text text-xl font-bold text-gray-950">
                  {lesson.titleUrdu}
                </h4>
                <p className="text-xs text-gray-500 font-kids line-clamp-1 text-left" dir="ltr">
                  {lesson.titleEnglish}: "{lesson.contentUrdu.substring(0, 60)}..."
                </p>
              </div>

              {/* Status breakdown of who read */}
              <div className="flex items-center gap-1.5 flex-wrap">
                {Object.keys(lesson.readingStatus || {}).map(stId => {
                  const st = lesson.readingStatus[stId];
                  return (
                    <span
                      key={stId}
                      className={`text-[11px] font-kids font-bold px-2.5 py-1 rounded-lg border ${
                        st.isCurrentlyReading
                          ? 'bg-emerald-100 text-emerald-800 border-emerald-300 animate-pulse'
                          : st.isCompleted
                          ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {st.studentName.split(' ')[0]}: {st.isCurrentlyReading ? '🔴 پڑھ رہا ہے' : st.isCompleted ? '✓ مکمل' : 'زیرِ انتظار'}
                    </span>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ADD STUDENT MODAL (FOR ADMIN) */}
      {showAddStudentModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-3xl p-6 shadow-2xl border-4 border-indigo-300 relative text-right" dir="rtl">
            <button
              onClick={() => setShowAddStudentModal(false)}
              className="absolute top-4 left-4 p-2 text-gray-400 hover:text-gray-700 text-lg font-bold"
            >
              ✕
            </button>
            <h3 className="urdu-nastaliq-text text-2xl font-bold text-gray-900 mb-4">
              نیا طالب علم شامل کریں (Add Student)
            </h3>
            <form onSubmit={handleCreateStudent} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 font-nastaliq mb-1">
                  طالب علم کا نام *
                </label>
                <input
                  type="text"
                  required
                  placeholder="مثال: حامد، زینب، علی"
                  value={newStudentName}
                  onChange={e => setNewStudentName(e.target.value)}
                  className="w-full px-4 py-2 rounded-xl border-2 border-gray-200 focus:border-indigo-500 font-nastaliq text-base"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 font-nastaliq mb-1">
                  والدین کا موبائل نمبر
                </label>
                <input
                  type="tel"
                  placeholder="03001234567"
                  value={newStudentPhone}
                  onChange={e => setNewStudentPhone(e.target.value)}
                  className="w-full px-4 py-2 rounded-xl border-2 border-gray-200 focus:border-indigo-500 font-kids text-sm text-left"
                  dir="ltr"
                />
              </div>
              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-nastaliq text-sm font-bold shadow-md"
              >
                رجسٹر کریں
              </button>
            </form>
          </div>
        </div>
      )}

      {/* AI LESSON CREATOR MODAL */}
      <AiLessonCreatorModal
        isOpen={showAiModal}
        onClose={() => setShowAiModal(false)}
        students={students}
        onLessonCreated={newLesson => {
          setLessons(prev => [newLesson, ...prev]);
          fetchOverview();
        }}
      />
    </div>
  );
};
