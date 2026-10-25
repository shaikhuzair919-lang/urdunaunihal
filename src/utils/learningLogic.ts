/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { URDU_WORDS_DATABASE, UrduWord } from '../data/urduData';

export interface StudentActivityLog {
  timestamp: number;
  action: 'word_learned' | 'quiz_completed' | 'letter_level_completed';
  wordId?: string;
  quizType?: string;
  score?: number;
  total?: number;
  level?: number;
}

export interface StudentProfile {
  id: string;
  name: string;
  parentPhone: string;
  avatar: string;
  createdAt: number;
  lastActive: number;
  masteredWordIds: string[];
  totalPracticeMinutes: number;
  quizzesTaken: number;
  quizTotalScore: number;
  quizMaxPossible: number;
  history: StudentActivityLog[];
}

export interface LevelProgress {
  level: number;
  totalWords: number;
  masteredWords: number;
  percent: number;
  isUnlocked: boolean;
}

export interface ParentSummaryReport {
  studentId: string;
  name: string;
  parentPhone: string;
  lastActive: number;
  hasStudiedToday: boolean;
  hoursSinceActive: number;
  overallProgressPercent: number;
  masteredCount: number;
  totalWords: number;
  averageQuizScorePercent: number;
  levelProgress: Record<2 | 3 | 4 | 5, LevelProgress>;
  grade: string;
  statusBadge: 'active_today' | 'needs_attention' | 'inactive';
}

/**
 * Checks whether a given timestamp falls on the same calendar day (local time) as now
 */
export function isTimestampToday(timestamp: number, currentNow: number = Date.now()): boolean {
  if (!timestamp) return false;
  const date = new Date(timestamp);
  const now = new Date(currentNow);
  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  );
}

/**
 * Calculates hours elapsed since a timestamp
 */
export function getHoursSince(timestamp: number, currentNow: number = Date.now()): number {
  if (!timestamp) return 999;
  const diffMs = currentNow - timestamp;
  return Math.max(0, Math.floor(diffMs / (1000 * 60 * 60)));
}

/**
 * Calculate progress for a specific letter level (2, 3, 4, 5)
 */
export function calculateLevelProgress(
  level: 2 | 3 | 4 | 5,
  masteredWordIds: string[],
  allWords: UrduWord[] = URDU_WORDS_DATABASE
): LevelProgress {
  const wordsInLevel = allWords.filter(w => w.letterCount === level);
  const total = wordsInLevel.length;
  if (total === 0) {
    return { level, totalWords: 0, masteredWords: 0, percent: 0, isUnlocked: true };
  }
  const mastered = wordsInLevel.filter(w => masteredWordIds.includes(w.id)).length;
  const percent = Math.round((mastered / total) * 100);
  return {
    level,
    totalWords: total,
    masteredWords: mastered,
    percent,
    isUnlocked: true // All levels accessible or tiered
  };
}

/**
 * Calculates grade based on overall mastery and quiz accuracy
 */
export function calculateGrade(masteredPercent: number, quizScorePercent: number): string {
  const combined = (masteredPercent * 0.5) + (quizScorePercent * 0.5);
  if (combined >= 85) return 'ممتاز (A+)';
  if (combined >= 70) return 'بہت خوب (A)';
  if (combined >= 55) return 'اچھا (B)';
  if (combined >= 40) return 'قابلِ تعریف (C)';
  return 'مزید محنت درکار (Keep Going)';
}

/**
 * Compiles a parent summary report for a student
 */
export function generateParentSummary(
  student: StudentProfile,
  allWords: UrduWord[] = URDU_WORDS_DATABASE,
  currentNow: number = Date.now()
): ParentSummaryReport {
  const totalWords = allWords.length;
  const masteredCount = student.masteredWordIds.length;
  const overallProgressPercent = totalWords > 0 ? Math.round((masteredCount / totalWords) * 100) : 0;

  const averageQuizScorePercent =
    student.quizMaxPossible > 0
      ? Math.round((student.quizTotalScore / student.quizMaxPossible) * 100)
      : 0;

  const studiedToday = isTimestampToday(student.lastActive, currentNow);
  const hoursSince = getHoursSince(student.lastActive, currentNow);

  let statusBadge: 'active_today' | 'needs_attention' | 'inactive' = 'active_today';
  if (!studiedToday) {
    statusBadge = hoursSince > 48 ? 'inactive' : 'needs_attention';
  }

  const levelProgress = {
    2: calculateLevelProgress(2, student.masteredWordIds, allWords),
    3: calculateLevelProgress(3, student.masteredWordIds, allWords),
    4: calculateLevelProgress(4, student.masteredWordIds, allWords),
    5: calculateLevelProgress(5, student.masteredWordIds, allWords),
  };

  const grade = calculateGrade(overallProgressPercent, averageQuizScorePercent);

  return {
    studentId: student.id,
    name: student.name,
    parentPhone: student.parentPhone,
    lastActive: student.lastActive,
    hasStudiedToday: studiedToday,
    hoursSinceActive: hoursSince,
    overallProgressPercent,
    masteredCount,
    totalWords,
    averageQuizScorePercent,
    levelProgress,
    grade,
    statusBadge,
  };
}

/**
 * Filters words by level and/or category
 */
export function filterUrduWords(
  words: UrduWord[],
  options: { level?: number | 'all'; category?: string }
): UrduWord[] {
  return words.filter(word => {
    if (options.level && options.level !== 'all') {
      if (word.letterCount !== options.level) return false;
    }
    if (options.category && options.category !== 'all') {
      if (word.category !== options.category) return false;
    }
    return true;
  });
}

/**
 * Shuffles an array deterministically or randomly for quizzes
 */
export function shuffleArray<T>(array: T[]): T[] {
  const copy = [...array];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}
