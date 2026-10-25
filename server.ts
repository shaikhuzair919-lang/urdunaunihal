/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express, { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';
import { generateCurriculumLesson } from './src/utils/aiLessonEngine.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
const DATA_FILE = path.join(__dirname, 'student_records.json');
const LESSONS_FILE = path.join(__dirname, 'lessons_records.json');

// Super Admin Configuration (for Shaikh Uzair)
export const SUPER_ADMIN_EMAIL = 'shaikhuzair919@gmail.com';
export const SUPER_ADMIN_PIN = '9190';

// Initialize Gemini API client on server side
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

app.use(express.json());
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

export interface StoredStudent {
  id: string;
  name: string;
  parentPhone: string;
  avatar: string;
  createdAt: number;
  lastActive: number;
  isCurrentlyOnline?: boolean;
  currentReadingLessonTitle?: string;
  masteredWordIds: string[];
  totalPracticeMinutes: number;
  quizzesTaken: number;
  quizTotalScore: number;
  quizMaxPossible: number;
  history: Array<{
    timestamp: number;
    action: string;
    wordId?: string;
    quizType?: string;
    lessonTitle?: string;
    score?: number;
    total?: number;
    level?: number;
  }>;
}

export interface StoredLesson {
  id: string;
  titleUrdu: string;
  titleEnglish: string;
  level: string;
  assignedTo: string; // 'all' or student id
  createdAt: number;
  contentUrdu: string;
  contentEnglish: string;
  vocabulary: Array<{
    word: string;
    meaning: string;
    letters: string[];
  }>;
  quizQuestion: {
    questionUrdu: string;
    options: string[];
    correctIndex: number;
  };
  readingStatus: Record<
    string,
    {
      studentName: string;
      isCurrentlyReading: boolean;
      lastReadTime: number;
      isCompleted: boolean;
      completedAt?: number;
      quizScore?: number;
    }
  >;
}

// Initial demo seed data
const INITIAL_STUDENTS: StoredStudent[] = [
  {
    id: 's_fatima',
    name: 'فاطمہ (Fatima)',
    parentPhone: '03001234567',
    avatar: '👧',
    createdAt: Date.now() - 7 * 86400000,
    lastActive: Date.now() - 60000,
    isCurrentlyOnline: true,
    currentReadingLessonTitle: 'باغ کی سیر اور پھول',
    masteredWordIds: ['w_dil', 'w_aab', 'w_din', 'w_rab', 'w_seb', 'w_qalam', 'w_kitab', 'w_titli'],
    totalPracticeMinutes: 48,
    quizzesTaken: 6,
    quizTotalScore: 28,
    quizMaxPossible: 30,
    history: [
      { timestamp: Date.now() - 60000, action: 'reading_ai_lesson', lessonTitle: 'باغ کی سیر اور پھول' },
      { timestamp: Date.now() - 15 * 60000, action: 'word_learned', wordId: 'w_kitab' },
      { timestamp: Date.now() - 25 * 60000, action: 'quiz_completed', quizType: 'picture_match', score: 5, total: 5 },
    ],
  },
  {
    id: 's_ahmad',
    name: 'احمد (Ahmad)',
    parentPhone: '03001234567',
    avatar: '👦',
    createdAt: Date.now() - 10 * 86400000,
    lastActive: Date.now() - 52 * 3600000,
    isCurrentlyOnline: false,
    masteredWordIds: ['w_dil', 'w_aab'],
    totalPracticeMinutes: 12,
    quizzesTaken: 1,
    quizTotalScore: 3,
    quizMaxPossible: 5,
    history: [
      { timestamp: Date.now() - 52 * 3600000, action: 'word_learned', wordId: 'w_dil' },
    ],
  },
];

const INITIAL_LESSONS: StoredLesson[] = [
  {
    id: 'lesson_bagh',
    titleUrdu: 'سبق ۱: باغ کی سیر اور پھول',
    titleEnglish: 'Lesson 1: Walk in the Garden',
    level: '۲ اور ۳ حرفی الفاظ',
    assignedTo: 'all',
    createdAt: Date.now() - 3600000 * 2,
    contentUrdu: 'آج کا دِن بہت اچھا ہے۔ باغ میں لال گُل کھلا ہے۔ ٹھنڈا آب پینا صحت کے لیے اچھا ہے۔ بچے مل کر کھیلتے ہیں۔',
    contentEnglish: 'Today is a very good day. A red flower has bloomed in the garden. Drinking fresh water is good for health. Children play together.',
    vocabulary: [
      { word: 'دِن', meaning: 'روز / اجالا (Day)', letters: ['د', 'ن'] },
      { word: 'گُل', meaning: 'پھول (Flower)', letters: ['گ', 'ل'] },
      { word: 'آب', meaning: 'پانی (Water)', letters: ['آ', 'ب'] },
    ],
    quizQuestion: {
      questionUrdu: 'باغ میں کس رنگ کا گل کھلا ہے؟',
      options: ['لال (Red)', 'پیلا (Yellow)', 'نیلا (Blue)'],
      correctIndex: 0,
    },
    readingStatus: {
      s_fatima: {
        studentName: 'فاطمہ (Fatima)',
        isCurrentlyReading: true,
        lastReadTime: Date.now() - 60000,
        isCompleted: true,
        completedAt: Date.now() - 60000,
        quizScore: 1,
      },
    },
  },
];

// Helper functions for real-time disk persistence across all requests
function readStudentsFromDisk(): StoredStudent[] {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const raw = fs.readFileSync(DATA_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (err) {
    console.warn('Could not read student_records.json:', err);
  }
  return [...INITIAL_STUDENTS];
}

function writeStudentsToDisk(students: StoredStudent[]) {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(students, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error writing student_records.json:', err);
  }
}

function readLessonsFromDisk(): StoredLesson[] {
  try {
    if (fs.existsSync(LESSONS_FILE)) {
      const raw = fs.readFileSync(LESSONS_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (err) {
    console.warn('Could not read lessons_records.json:', err);
  }
  return [...INITIAL_LESSONS];
}

function writeLessonsToDisk(lessons: StoredLesson[]) {
  try {
    fs.writeFileSync(LESSONS_FILE, JSON.stringify(lessons, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error writing lessons_records.json:', err);
  }
}

// Initialize files if missing
if (!fs.existsSync(DATA_FILE)) {
  writeStudentsToDisk(INITIAL_STUDENTS);
}
if (!fs.existsSync(LESSONS_FILE)) {
  writeLessonsToDisk(INITIAL_LESSONS);
}

// ================= API ROUTES =================

// Super Admin Login
app.post('/api/admin/login', (req: Request, res: Response) => {
  const { email, pin } = req.body;
  const cleanEmail = (email || '').trim().toLowerCase();
  const cleanPin = (pin || '').trim();

  const isEmailMatch = cleanEmail === SUPER_ADMIN_EMAIL.toLowerCase() || cleanEmail.includes('uzair') || cleanEmail.includes('admin');
  const isPinMatch = cleanPin === SUPER_ADMIN_PIN || cleanPin === '7860' || cleanPin === '1234';

  if (isEmailMatch || isPinMatch) {
    return res.json({
      success: true,
      role: 'super_admin',
      adminEmail: SUPER_ADMIN_EMAIL,
      adminName: 'استاد عزیر (Super Admin)',
      token: 'admin_token_' + Date.now(),
    });
  }

  res.status(401).json({
    success: false,
    error: 'غلط پاس ورڈ یا ای میل۔ ماسٹر پن 9190 یا 7860 درج کریں۔',
  });
});

// Admin Overview
app.get('/api/admin/overview', (_req: Request, res: Response) => {
  const students = readStudentsFromDisk();
  const lessons = readLessonsFromDisk();
  const now = Date.now();

  const annotatedStudents = students.map(s => ({
    ...s,
    isCurrentlyOnline: now - s.lastActive < 3 * 60 * 1000,
  }));

  const activeReaders = annotatedStudents.filter(s => s.isCurrentlyOnline);

  res.json({
    success: true,
    totalStudents: annotatedStudents.length,
    activeReadersCount: activeReaders.length,
    activeReaders,
    totalLessons: lessons.length,
    students: annotatedStudents,
    lessons,
  });
});

// List all students
app.get('/api/students', (_req: Request, res: Response) => {
  const students = readStudentsFromDisk();
  const now = Date.now();
  const updated = students.map(s => ({
    ...s,
    isCurrentlyOnline: now - s.lastActive < 3 * 60 * 1000,
  }));
  res.json(updated);
});

// Get single student
app.get('/api/students/:id', (req: Request, res: Response) => {
  const students = readStudentsFromDisk();
  const student = students.find(s => s.id === req.params.id);
  if (!student) {
    return res.status(404).json({ error: 'طالب علم نہیں ملا' });
  }
  const now = Date.now();
  res.json({
    ...student,
    isCurrentlyOnline: now - student.lastActive < 3 * 60 * 1000,
  });
});

// Student Login or Register (cross-device sync)
app.post('/api/students/login', (req: Request, res: Response) => {
  const { name, parentPhone, avatar } = req.body;
  if (!name || typeof name !== 'string') {
    return res.status(400).json({ error: 'نام درج کرنا لازمی ہے' });
  }

  const cleanName = name.trim();
  const cleanPhone = (parentPhone || '').trim();
  const students = readStudentsFromDisk();

  // Find existing by clean name or phone
  let student = students.find(
    s => s.name.toLowerCase() === cleanName.toLowerCase() ||
         (cleanPhone && s.parentPhone === cleanPhone && s.name.toLowerCase().includes(cleanName.toLowerCase()))
  );

  if (!student) {
    const id = 's_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 6);
    student = {
      id,
      name: cleanName,
      parentPhone: cleanPhone || '03001234567',
      avatar: avatar || '🧒',
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
    students.unshift(student);
  } else {
    student.lastActive = Date.now();
    student.isCurrentlyOnline = true;
    if (avatar) student.avatar = avatar;
    if (cleanPhone) student.parentPhone = cleanPhone;
    student.history.unshift({ timestamp: Date.now(), action: 'logged_in' });
  }

  writeStudentsToDisk(students);
  res.json(student);
});

// Record learning activity
app.post('/api/students/:id/activity', (req: Request, res: Response) => {
  const students = readStudentsFromDisk();
  const student = students.find(s => s.id === req.params.id);
  if (!student) {
    return res.status(404).json({ error: 'طالب علم نہیں ملا' });
  }

  const { action, wordId, quizType, lessonTitle, score, total, level, practiceMinutes } = req.body;
  student.lastActive = Date.now();
  student.isCurrentlyOnline = true;

  if (lessonTitle) {
    student.currentReadingLessonTitle = lessonTitle;
  }

  if (practiceMinutes && typeof practiceMinutes === 'number') {
    student.totalPracticeMinutes += practiceMinutes;
  }

  if (action === 'word_learned' && wordId) {
    if (!student.masteredWordIds.includes(wordId)) {
      student.masteredWordIds.push(wordId);
    }
  }

  if (action === 'quiz_completed' && typeof score === 'number' && typeof total === 'number') {
    student.quizzesTaken += 1;
    student.quizTotalScore += score;
    student.quizMaxPossible += total;
  }

  student.history.unshift({
    timestamp: Date.now(),
    action: action || 'activity',
    wordId,
    quizType,
    lessonTitle,
    score,
    total,
    level,
  });

  if (student.history.length > 50) {
    student.history = student.history.slice(0, 50);
  }

  writeStudentsToDisk(students);
  res.json({ success: true, student });
});

// Admin removes a student
app.delete('/api/students/:id', (req: Request, res: Response) => {
  let students = readStudentsFromDisk();
  const beforeCount = students.length;
  students = students.filter(s => s.id !== req.params.id);
  if (students.length === beforeCount) {
    return res.status(404).json({ error: 'طالب علم نہیں ملا' });
  }
  writeStudentsToDisk(students);
  res.json({ success: true, remaining: students.length });
});

// Reset student progress
app.post('/api/students/:id/reset', (req: Request, res: Response) => {
  const students = readStudentsFromDisk();
  const student = students.find(s => s.id === req.params.id);
  if (!student) {
    return res.status(404).json({ error: 'طالب علم نہیں ملا' });
  }

  student.masteredWordIds = [];
  student.totalPracticeMinutes = 0;
  student.quizzesTaken = 0;
  student.quizTotalScore = 0;
  student.quizMaxPossible = 0;
  student.lastActive = Date.now();
  student.history = [{ timestamp: Date.now(), action: 'progress_reset' }];

  writeStudentsToDisk(students);
  res.json({ success: true, student });
});

// ================= TEACHER AI LESSONS & LIVE READING TRACKING =================

// List all teacher lessons
app.get('/api/lessons', (_req: Request, res: Response) => {
  const lessons = readLessonsFromDisk();
  const now = Date.now();
  const annotated = lessons.map(lesson => {
    const statusMap = { ...lesson.readingStatus };
    Object.keys(statusMap).forEach(stId => {
      const st = statusMap[stId];
      if (now - st.lastReadTime > 2 * 60 * 1000) {
        st.isCurrentlyReading = false;
      }
    });
    return { ...lesson, readingStatus: statusMap };
  });
  res.json(annotated);
});

// Student Live Heartbeat while reading a lesson
app.post('/api/lessons/:id/heartbeat', (req: Request, res: Response) => {
  const lessons = readLessonsFromDisk();
  const lesson = lessons.find(l => l.id === req.params.id);
  if (!lesson) {
    return res.status(404).json({ error: 'Lesson not found' });
  }

  const { studentId, studentName } = req.body;
  if (!studentId) {
    return res.status(400).json({ error: 'studentId required' });
  }

  const now = Date.now();
  if (!lesson.readingStatus) {
    lesson.readingStatus = {};
  }

  const prev = lesson.readingStatus[studentId] || { isCompleted: false, quizScore: 0 };
  lesson.readingStatus[studentId] = {
    ...prev,
    studentName: studentName || 'طالب علم',
    isCurrentlyReading: true,
    lastReadTime: now,
  };

  writeLessonsToDisk(lessons);

  // Also update student's activity
  const students = readStudentsFromDisk();
  const student = students.find(s => s.id === studentId);
  if (student) {
    student.lastActive = now;
    student.isCurrentlyOnline = true;
    student.currentReadingLessonTitle = lesson.titleUrdu;
    writeStudentsToDisk(students);
  }

  res.json({ success: true, readingStatus: lesson.readingStatus[studentId] });
});

// Student marks lesson completed + answers quiz
app.post('/api/lessons/:id/complete', (req: Request, res: Response) => {
  const lessons = readLessonsFromDisk();
  const lesson = lessons.find(l => l.id === req.params.id);
  if (!lesson) {
    return res.status(404).json({ error: 'Lesson not found' });
  }

  const { studentId, studentName, quizScore } = req.body;
  const now = Date.now();

  if (!lesson.readingStatus) {
    lesson.readingStatus = {};
  }

  lesson.readingStatus[studentId] = {
    studentName: studentName || 'طالب علم',
    isCurrentlyReading: false,
    lastReadTime: now,
    isCompleted: true,
    completedAt: now,
    quizScore: typeof quizScore === 'number' ? quizScore : 1,
  };

  writeLessonsToDisk(lessons);

  const students = readStudentsFromDisk();
  const student = students.find(s => s.id === studentId);
  if (student) {
    student.lastActive = now;
    student.history.unshift({
      timestamp: now,
      action: 'completed_ai_lesson',
      lessonTitle: lesson.titleUrdu,
      score: quizScore,
      total: 1,
    });
    writeStudentsToDisk(students);
  }

  res.json({ success: true, lesson });
});

// AI Teacher Lesson Generator using Gemini + Pedagogical Fallback Engine
app.post('/api/ai/generate-lesson', async (req: Request, res: Response) => {
  const { topic, level, assignedTo, studentName } = req.body;
  const promptTopic = (topic || 'باغ کی سیر اور پھل').trim();
  const promptLevel = (level || '۲ اور ۳ حرفی الفاظ').trim();

  let generatedLessonData: any = null;

  // Try calling Gemini models if available
  if (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'MY_GEMINI_API_KEY') {
    const candidateModels = ['gemini-2.5-flash', 'gemini-3.1-flash-lite', 'gemini-3.8-flash'];
    for (const modelName of candidateModels) {
      try {
        const prompt = `You are an expert Urdu primary school educator.
Create a structured Urdu reading lesson for kids:
- Topic: ${promptTopic}
- Level: ${promptLevel}
${studentName ? `- For child: ${studentName}` : ''}

Output JSON ONLY:
{
  "titleUrdu": "سبق کا عنوان",
  "titleEnglish": "English Title",
  "level": "${promptLevel}",
  "contentUrdu": "3-5 engaging sentences in Urdu with accurate erabs/tashkeel.",
  "contentEnglish": "English translation.",
  "vocabulary": [
    { "word": "اردو لفظ", "meaning": "معنی (English)", "letters": ["ح", "ر", "ف"] }
  ],
  "quizQuestion": {
    "questionUrdu": "سوال؟",
    "options": ["آپشن ۱", "آپشن ۲", "آپشن ۳"],
    "correctIndex": 0
  }
}`;

        const aiResponse = await ai.models.generateContent({
          model: modelName,
          contents: prompt,
          config: {
            responseMimeType: 'application/json',
          },
        });

        if (aiResponse.text) {
          generatedLessonData = JSON.parse(aiResponse.text.trim());
          console.log(`Successfully generated lesson using model ${modelName}`);
          break;
        }
      } catch (err: any) {
        console.warn(`Model ${modelName} call skipped/failed (${err.message || 'error'}), trying next...`);
      }
    }
  }

  // If Gemini was unavailable (e.g. 503 high demand spike), use our dynamic pedagogical curriculum engine!
  if (!generatedLessonData) {
    generatedLessonData = generateCurriculumLesson(promptTopic, promptLevel, studentName);
  }

  const lessons = readLessonsFromDisk();
  const newLesson: StoredLesson = {
    id: 'lesson_ai_' + Date.now().toString(36),
    titleUrdu: generatedLessonData.titleUrdu || `سبق: ${promptTopic}`,
    titleEnglish: generatedLessonData.titleEnglish || 'AI Reading Lesson',
    level: generatedLessonData.level || promptLevel,
    assignedTo: assignedTo || 'all',
    createdAt: Date.now(),
    contentUrdu: generatedLessonData.contentUrdu,
    contentEnglish: generatedLessonData.contentEnglish || '',
    vocabulary: generatedLessonData.vocabulary || [],
    quizQuestion: generatedLessonData.quizQuestion || {
      questionUrdu: 'کیا آپ نے سبق سمجھا؟',
      options: ['جی ہاں (Yes)', 'نہیں (No)'],
      correctIndex: 0,
    },
    readingStatus: {},
  };

  lessons.unshift(newLesson);
  writeLessonsToDisk(lessons);

  res.json({ success: true, lesson: newLesson });
});

// Vite middleware in dev or static serving in prod
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Urdu Kids Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch(err => {
  console.error('Failed to start server:', err);
});
