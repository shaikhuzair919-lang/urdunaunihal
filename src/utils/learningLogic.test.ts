import test from 'node:test';
import assert from 'node:assert/strict';
import {
  isTimestampToday,
  getHoursSince,
  calculateLevelProgress,
  calculateGrade,
  generateParentSummary,
  filterUrduWords,
  StudentProfile,
} from './learningLogic';
import { URDU_WORDS_DATABASE } from '../data/urduData';

test('isTimestampToday identifies same calendar day correctly', () => {
  const fixedNow = new Date('2026-10-25T12:00:00Z').getTime();
  const earlierSameDay = new Date('2026-10-25T08:30:00Z').getTime();
  const yesterday = new Date('2026-10-24T22:00:00Z').getTime();

  assert.equal(isTimestampToday(earlierSameDay, fixedNow), true);
  assert.equal(isTimestampToday(yesterday, fixedNow), false);
  assert.equal(isTimestampToday(0, fixedNow), false);
});

test('getHoursSince calculates elapsed hours accurately', () => {
  const fixedNow = 1700000000000;
  const threeHoursAgo = fixedNow - 3 * 60 * 60 * 1000;
  assert.equal(getHoursSince(threeHoursAgo, fixedNow), 3);
  assert.equal(getHoursSince(0, fixedNow), 999);
});

test('calculateLevelProgress measures 2-letter word mastery percentage', () => {
  const sampleWords = [
    { id: 'w1', letterCount: 2 },
    { id: 'w2', letterCount: 2 },
    { id: 'w3', letterCount: 2 },
    { id: 'w4', letterCount: 2 },
  ] as any;

  const progress = calculateLevelProgress(2, ['w1', 'w2'], sampleWords);
  assert.equal(progress.totalWords, 4);
  assert.equal(progress.masteredWords, 2);
  assert.equal(progress.percent, 50);
});

test('calculateGrade assigns correct Urdu honorific grades', () => {
  assert.equal(calculateGrade(90, 90), 'ممتاز (A+)');
  assert.equal(calculateGrade(75, 70), 'بہت خوب (A)');
  assert.equal(calculateGrade(60, 50), 'اچھا (B)');
  assert.equal(calculateGrade(20, 20), 'مزید محنت درکار (Keep Going)');
});

test('generateParentSummary marks inactive when child did not study', () => {
  const fixedNow = new Date('2026-10-25T15:00:00Z').getTime();
  const twoDaysAgo = fixedNow - 50 * 60 * 60 * 1000;

  const mockStudent: StudentProfile = {
    id: 's_ali',
    name: 'علی (Ali)',
    parentPhone: '03001234567',
    avatar: '👦',
    createdAt: twoDaysAgo - 10000,
    lastActive: twoDaysAgo,
    masteredWordIds: ['w_dil', 'w_aab'],
    totalPracticeMinutes: 15,
    quizzesTaken: 2,
    quizTotalScore: 8,
    quizMaxPossible: 10,
    history: [],
  };

  const report = generateParentSummary(mockStudent, URDU_WORDS_DATABASE, fixedNow);
  assert.equal(report.hasStudiedToday, false);
  assert.equal(report.statusBadge, 'inactive');
  assert.equal(report.masteredCount, 2);
  assert.equal(report.levelProgress[2].masteredWords >= 1, true);
});

test('filterUrduWords filters by level and category properly', () => {
  const twoHurfi = filterUrduWords(URDU_WORDS_DATABASE, { level: 2 });
  assert.equal(twoHurfi.every(w => w.letterCount === 2), true);

  const animals = filterUrduWords(URDU_WORDS_DATABASE, { category: 'animals' });
  assert.equal(animals.every(w => w.category === 'animals'), true);
});

test('generateCurriculumLesson builds structured Urdu lesson with vocabulary and quiz', async () => {
  const { generateCurriculumLesson } = await import('./aiLessonEngine');
  const lesson = generateCurriculumLesson('پھل اور آم', '۲ اور ۳ حرفی الفاظ', 'حامد');
  assert.equal(lesson.titleUrdu.includes('پھل'), true);
  assert.equal(lesson.contentUrdu.length > 20, true);
  assert.equal(lesson.vocabulary.length >= 2, true);
  assert.equal(lesson.quizQuestion.options.length === 3, true);
  assert.equal(typeof lesson.quizQuestion.correctIndex, 'number');
});
