import express, { Request, Response, NextFunction } from 'express';
import http from 'http';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { db } from './server/db.ts';
import {
  summarizeText,
  summarizeLongDocument,
  summarizeImage,
  generateNotes,
  generateFlashcards,
  generateQuiz,
  isServiceUnavailableError,
} from './server/gemini.ts';
import { extractArticleFromUrl } from './server/articleService.ts';

dotenv.config();

function sendAiRouteError(res: Response, err: any, fallbackMessage: string) {
  if (isServiceUnavailableError(err)) {
    res.setHeader('Retry-After', '2');
    return res.status(503).json({
      error: 'The AI service is temporarily experiencing high demand (503 Service Unavailable). Please try again shortly.',
      code: 503,
      retryable: true,
    });
  }
  return res.status(500).json({ error: err?.message || fallbackMessage });
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = 3000;

// Body parsers
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

// Multer memory storage for PDF and document uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 25 * 1024 * 1024, // 25MB max
  },
  fileFilter: (_req, file, cb) => {
    const isPdf = file.mimetype === 'application/pdf' || file.originalname.toLowerCase().endsWith('.pdf');
    const isTxt = file.mimetype === 'text/plain' || file.originalname.toLowerCase().endsWith('.txt');
    if (isPdf || isTxt) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Please upload a PDF or TXT file.'));
    }
  },
});

const imageUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 15 * 1024 * 1024, // 15MB max
  },
  fileFilter: (_req, file, cb) => {
    const allowedMime = [
      'image/png',
      'image/jpeg',
      'image/jpg',
      'image/webp',
      'image/gif',
      'image/heic',
      'image/heif',
    ];
    const isImageExt = /\.(png|jpe?g|webp|gif|heic|heif)$/i.test(file.originalname || '');
    if (allowedMime.includes(file.mimetype) || isImageExt) {
      cb(null, true);
    } else {
      cb(new Error('Invalid image type. Please upload PNG, JPG, WEBP, or GIF images.'));
    }
  },
});

// Middleware to extract current user
function authMiddleware(req: Request, _res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    // Simple token resolution (token is user._id or demo token)
    const user = db.getUserById(token);
    if (user) {
      (req as any).user = user;
    }
  }

  // Fallback to demo user if not authenticated
  if (!(req as any).user) {
    const demoUser = db.getUserByEmail('demo@summarai.com') || db.getUserById('user_demo_1');
    (req as any).user = demoUser;
  }
  next();
}

app.use(authMiddleware);

// ==================== AUTH ROUTES ====================

app.post('/api/auth/register', (req: Request, res: Response) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required.' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long.' });
    }

    const existing = db.getUserByEmail(email);
    if (existing) {
      return res.status(409).json({ error: 'An account with this email already exists.' });
    }

    const newUser = db.createUser({
      name,
      email,
      password_hash: password, // In production, bcrypt hash
      preferences: {
        theme: 'light',
        default_summary_length: 'medium',
        default_summary_style: 'bullet_points',
      },
    });

    return res.status(201).json({
      token: newUser._id,
      user: {
        _id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        profile_image: newUser.profile_image,
        preferences: newUser.preferences,
      },
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Registration failed.' });
  }
});

app.post('/api/auth/login', (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const user = db.getUserByEmail(email);
    if (!user || user.password_hash !== password) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    return res.json({
      token: user._id,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        profile_image: user.profile_image,
        preferences: user.preferences,
      },
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Login failed.' });
  }
});

app.post('/api/auth/google', (req: Request, res: Response) => {
  try {
    const { email, name, profileImage } = req.body;
    const targetEmail = email || 'google.user@example.com';
    let user = db.getUserByEmail(targetEmail);

    if (!user) {
      user = db.createUser({
        name: name || 'Google User',
        email: targetEmail,
        password_hash: 'oauth_authenticated',
        profile_image: profileImage || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=250&q=80',
        preferences: {
          theme: 'light',
          default_summary_length: 'medium',
          default_summary_style: 'bullet_points',
        },
      });
    }

    return res.json({
      token: user._id,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        profile_image: user.profile_image,
        preferences: user.preferences,
      },
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Google authentication failed.' });
  }
});

app.get('/api/auth/me', (req: Request, res: Response) => {
  const user = (req as any).user;
  if (!user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  return res.json({
    _id: user._id,
    name: user.name,
    email: user.email,
    profile_image: user.profile_image,
    preferences: user.preferences,
  });
});

// ==================== SUMMARIZATION ROUTES ====================

app.post('/api/summarize/text', async (req: Request, res: Response) => {
  try {
    const {
      text,
      length,
      style,
      extractKeyPoints = true,
      extractKeywords = true,
      generateTitle = true,
      preserveFacts = true,
      saveToHistory = true,
    } = req.body;

    if (!text || text.trim().length < 20) {
      return res.status(400).json({ error: 'Please provide at least 20 characters of text to summarize.' });
    }

    const user = (req as any).user;
    const result = await summarizeText({
      text,
      length,
      style,
      extractKeyPoints,
      extractKeywords,
      generateTitle,
      preserveFacts,
    });

    let savedSummaryId = undefined;
    if (saveToHistory && user) {
      const saved = db.createSummary({
        user_id: user._id,
        title: result.title,
        original_text: text,
        summary: result.summary,
        summary_type: 'text',
        summary_length: length || 'medium',
        summary_style: style || 'bullet_points',
        key_points: result.keyPoints,
        keywords: result.keywords,
        original_word_count: result.originalWordCount,
        summary_word_count: result.summaryWordCount,
        compression_ratio: result.compressionRatio,
      });
      savedSummaryId = saved._id;
    }

    return res.json({
      ...result,
      summaryId: savedSummaryId,
    });
  } catch (err: any) {
    console.error('Error in /api/summarize/text:', err);
    return sendAiRouteError(res, err, 'Failed to summarize text.');
  }
});

app.post('/api/summarize/pdf', upload.single('file'), async (req: Request, res: Response) => {
  try {
    const file = req.file;
    if (!file) {
      return res.status(400).json({ error: 'No document file uploaded. Please upload a PDF or TXT file.' });
    }

    const {
      length = 'detailed',
      style = 'executive',
      saveToHistory = 'true',
    } = req.body;

    const user = (req as any).user;
    let extractedText = '';
    let pageCount = 1;
    let isScanned = false;
    let chunks: string[] = [];

    if (file.mimetype === 'application/pdf' || file.originalname.toLowerCase().endsWith('.pdf')) {
      const { extractTextFromPdf } = await import('./server/pdfService.ts');
      const pdfData = await extractTextFromPdf(file.buffer);
      extractedText = pdfData.text;
      pageCount = pdfData.pageCount;
      isScanned = pdfData.isScanned;
      chunks = pdfData.chunks;
    } else {
      extractedText = file.buffer.toString('utf-8');
      pageCount = Math.max(1, Math.ceil(extractedText.length / 3000));
      chunks = [extractedText];
    }

    if (isScanned) {
      return res.status(422).json({
        error: 'This PDF appears to be a scanned image without selectable text layers. SummarAI requires digital text or an OCR pass.',
        isScanned: true,
        pageCount,
      });
    }

    if (!extractedText || extractedText.trim().length < 50) {
      return res.status(400).json({
        error: 'Could not extract sufficient text from this document. Please check the file formatting.',
      });
    }

    // Process through Gemini with hierarchical chunking if document is long
    const totalWordCount = extractedText.trim().split(/\s+/).filter(Boolean).length;
    const rawResult = await summarizeLongDocument(chunks, file.originalname, { length, style });
    const summaryText = typeof rawResult?.summary === 'string' ? rawResult.summary.trim() : '';
    const summaryWordCount = Number.isFinite(rawResult?.summaryWordCount)
      ? rawResult.summaryWordCount
      : summaryText.split(/\s+/).filter(Boolean).length;
    const originalWordCount = totalWordCount > 0
      ? totalWordCount
      : (Number.isFinite(rawResult?.originalWordCount) ? rawResult.originalWordCount : summaryWordCount);
    const compressionRatio = originalWordCount > 0
      ? Math.max(0, Math.min(99, Math.round((1 - summaryWordCount / originalWordCount) * 100)))
      : 0;

    const result = {
      ...rawResult,
      title: rawResult?.title || `Summary: ${file.originalname}`,
      summary: summaryText,
      keyPoints: Array.isArray(rawResult?.keyPoints) ? rawResult.keyPoints : [],
      keywords: Array.isArray(rawResult?.keywords) ? rawResult.keywords : [],
      originalWordCount,
      summaryWordCount,
      compressionRatio,
    };

    let docRecord = undefined;
    let savedSummary = undefined;

    if (user && saveToHistory !== 'false') {
      savedSummary = db.createSummary({
        user_id: user._id,
        title: result.title,
        original_text: extractedText.slice(0, 8000), // preserve preview in DB
        summary: result.summary,
        summary_type: 'pdf',
        summary_length: length,
        summary_style: style,
        key_points: result.keyPoints,
        keywords: result.keywords,
        original_word_count: result.originalWordCount,
        summary_word_count: result.summaryWordCount,
        compression_ratio: result.compressionRatio,
        filename: file.originalname,
        page_count: pageCount,
      });

      docRecord = db.createDocument({
        user_id: user._id,
        filename: file.originalname,
        file_type: file.mimetype,
        file_size: file.size,
        page_count: pageCount,
        processing_status: 'completed',
        summary_id: savedSummary._id,
      });
    }

    return res.json({
      ...result,
      filename: file.originalname,
      fileSize: file.size,
      pageCount,
      summaryId: savedSummary?._id,
      documentId: docRecord?._id,
    });
  } catch (err: any) {
    console.error('Error in /api/summarize/pdf:', err);
    return sendAiRouteError(res, err, 'Failed to process and summarize document.');
  }
});

app.post('/api/summarize/image', imageUpload.single('file'), async (req: Request, res: Response) => {
  try {
    const file = req.file;
    if (!file) {
      return res.status(400).json({ error: 'No image provided. Please upload an image or capture one from the camera.' });
    }

    const {
      length = 'medium',
      style = 'bullet_points',
      promptHint,
      saveToHistory = 'true',
    } = req.body;

    const user = (req as any).user;
    const mimeType = file.mimetype && file.mimetype.startsWith('image/') ? file.mimetype : 'image/jpeg';
    const imageBase64 = file.buffer.toString('base64');

    const result = await summarizeImage({
      imageBase64,
      mimeType,
      length,
      style,
      promptHint: typeof promptHint === 'string' ? promptHint.trim() : undefined,
      filename: file.originalname,
    });

    let docRecord = undefined;
    let savedSummary = undefined;

    if (user && saveToHistory !== 'false') {
      savedSummary = db.createSummary({
        user_id: user._id,
        title: result.title || `Image Summary: ${file.originalname}`,
        original_text: result.extractedText.slice(0, 8000),
        summary: result.summary,
        summary_type: 'image',
        summary_length: length,
        summary_style: style,
        key_points: result.keyPoints,
        keywords: result.keywords,
        original_word_count: result.originalWordCount,
        summary_word_count: result.summaryWordCount,
        compression_ratio: result.compressionRatio,
        filename: file.originalname,
      });

      docRecord = db.createDocument({
        user_id: user._id,
        filename: file.originalname,
        file_type: mimeType,
        file_size: file.size,
        processing_status: 'completed',
        summary_id: savedSummary._id,
      });
    }

    return res.json({
      ...result,
      filename: file.originalname,
      fileSize: file.size,
      mimeType,
      summaryId: savedSummary?._id,
      documentId: docRecord?._id,
    });
  } catch (err: any) {
    console.error('Error in /api/summarize/image:', err);
    return sendAiRouteError(res, err, 'Failed to analyze and summarize image.');
  }
});

app.post('/api/summarize/article', async (req: Request, res: Response) => {
  try {
    const { url, rawText, length = 'medium', style = 'bullet_points', saveToHistory = true } = req.body;
    const user = (req as any).user;

    let articleContent = '';
    let articleTitle = '';
    let sourceDomain = '';

    if (url) {
      const extracted = await extractArticleFromUrl(url);
      articleContent = extracted.text;
      articleTitle = extracted.title;
      sourceDomain = extracted.sourceDomain;
    } else if (rawText) {
      articleContent = rawText;
      articleTitle = 'Pasted Article';
      sourceDomain = 'Manual Input';
    } else {
      return res.status(400).json({ error: 'Please provide either an article URL or paste the article text.' });
    }

    const result = await summarizeText({
      text: articleContent,
      length,
      style,
      extractKeyPoints: true,
      extractKeywords: true,
      generateTitle: true,
      preserveFacts: true,
    });

    let savedSummaryId = undefined;
    if (saveToHistory && user) {
      const saved = db.createSummary({
        user_id: user._id,
        title: articleTitle || result.title,
        original_text: articleContent.slice(0, 6000),
        summary: result.summary,
        summary_type: 'article',
        summary_length: length,
        summary_style: style,
        key_points: result.keyPoints,
        keywords: result.keywords,
        original_word_count: result.originalWordCount,
        summary_word_count: result.summaryWordCount,
        compression_ratio: result.compressionRatio,
        source_url: url || undefined,
      });
      savedSummaryId = saved._id;
    }

    return res.json({
      ...result,
      articleTitle: articleTitle || result.title,
      sourceDomain,
      sourceUrl: url,
      summaryId: savedSummaryId,
    });
  } catch (err: any) {
    console.error('Error in /api/summarize/article:', err);
    return sendAiRouteError(res, err, 'Failed to extract and summarize article.');
  }
});

// ==================== LEARNING TOOLS: NOTES, FLASHCARDS, QUIZZES ====================

app.post('/api/notes/generate', async (req: Request, res: Response) => {
  try {
    const { text, format = 'detailed', title, summaryId } = req.body;
    if (!text || text.trim().length < 30) {
      return res.status(400).json({ error: 'Please provide substantive text to generate study notes.' });
    }

    const notes = await generateNotes({ text, format, title });
    const user = (req as any).user;

    // Optionally save as a note summary record
    if (user) {
      db.createSummary({
        user_id: user._id,
        title: notes.title || `${format.replace('_', ' ').toUpperCase()} Notes`,
        original_text: text.slice(0, 4000),
        summary: notes.executiveSummary,
        summary_type: 'notes',
        summary_length: 'detailed',
        summary_style: format,
        key_points: notes.keyTakeaways,
        keywords: [],
        original_word_count: text.split(/\s+/).length,
        summary_word_count: notes.executiveSummary.split(/\s+/).length,
        compression_ratio: 75,
      });
    }

    return res.json(notes);
  } catch (err: any) {
    console.error('Error in /api/notes/generate:', err);
    return sendAiRouteError(res, err, 'Failed to generate study notes.');
  }
});

app.post('/api/flashcards/generate', async (req: Request, res: Response) => {
  try {
    const { text, count = 8, topic, save = true } = req.body;
    if (!text || text.trim().length < 30) {
      return res.status(400).json({ error: 'Please provide source text to generate flashcards.' });
    }

    const result = await generateFlashcards(text, Math.min(20, Math.max(3, Number(count) || 8)), topic);
    const user = (req as any).user;

    let deck = undefined;
    if (save && user) {
      deck = db.createFlashcardDeck({
        user_id: user._id,
        title: result.title || topic || 'Flashcards Deck',
        source_title: topic,
        cards: result.cards.map(c => ({ ...c, mastered: false })),
      });
    }

    return res.json({
      deckId: deck?._id,
      title: result.title,
      cards: deck ? deck.cards : result.cards,
    });
  } catch (err: any) {
    console.error('Error in /api/flashcards/generate:', err);
    return sendAiRouteError(res, err, 'Failed to generate flashcards.');
  }
});

app.get('/api/flashcards', (req: Request, res: Response) => {
  const user = (req as any).user;
  if (!user) return res.status(401).json({ error: 'Unauthorized' });
  const decks = db.getFlashcardDecks(user._id);
  return res.json(decks);
});

app.get('/api/flashcards/:id', (req: Request, res: Response) => {
  const deck = db.getFlashcardDeckById(req.params.id);
  if (!deck) return res.status(404).json({ error: 'Flashcard deck not found' });
  return res.json(deck);
});

app.put('/api/flashcards/:id/mastery', (req: Request, res: Response) => {
  const { cardId, mastered } = req.body;
  const deck = db.getFlashcardDeckById(req.params.id);
  if (!deck) return res.status(404).json({ error: 'Deck not found' });

  const updatedCards = deck.cards.map(c => (c.id === cardId ? { ...c, mastered: Boolean(mastered) } : c));
  const updatedDeck = db.updateFlashcardDeck(deck._id, { cards: updatedCards });
  return res.json(updatedDeck);
});

app.delete('/api/flashcards/:id', (req: Request, res: Response) => {
  const success = db.deleteFlashcardDeck(req.params.id);
  return res.json({ success });
});

app.post('/api/quiz/generate', async (req: Request, res: Response) => {
  try {
    const { text, questionCount = 5, difficulty = 'medium', topic, save = true } = req.body;
    if (!text || text.trim().length < 30) {
      return res.status(400).json({ error: 'Please provide source text to generate a quiz.' });
    }

    const result = await generateQuiz(text, Math.min(15, Math.max(3, Number(questionCount) || 5)), difficulty);
    const user = (req as any).user;

    let quiz = undefined;
    if (save && user) {
      quiz = db.createQuiz({
        user_id: user._id,
        title: result.title || topic || 'Quiz Knowledge Check',
        source_title: topic,
        questions: result.questions,
        results: [],
      });
    }

    return res.json({
      quizId: quiz?._id,
      title: result.title,
      questions: result.questions,
    });
  } catch (err: any) {
    console.error('Error in /api/quiz/generate:', err);
    return sendAiRouteError(res, err, 'Failed to generate quiz.');
  }
});

app.get('/api/quiz', (req: Request, res: Response) => {
  const user = (req as any).user;
  if (!user) return res.status(401).json({ error: 'Unauthorized' });
  const quizzes = db.getQuizzes(user._id);
  return res.json(quizzes);
});

app.get('/api/quiz/:id', (req: Request, res: Response) => {
  const quiz = db.getQuizById(req.params.id);
  if (!quiz) return res.status(404).json({ error: 'Quiz not found' });
  return res.json(quiz);
});

app.post('/api/quiz/:id/submit', (req: Request, res: Response) => {
  const { userAnswers } = req.body; // Record<string, number> where key is question id and value is selected option
  const quiz = db.getQuizById(req.params.id);
  if (!quiz) return res.status(404).json({ error: 'Quiz not found' });

  let score = 0;
  const detailedBreakdown = quiz.questions.map(q => {
    const userSelected = userAnswers ? userAnswers[q.id] : undefined;
    const isCorrect = userSelected === q.correctAnswer;
    if (isCorrect) score += 1;
    return {
      questionId: q.id,
      question: q.question,
      options: q.options,
      correctAnswer: q.correctAnswer,
      userAnswer: userSelected,
      isCorrect,
      explanation: q.explanation,
    };
  });

  const percentage = Math.round((score / quiz.questions.length) * 100);
  const resultRecord = {
    score,
    total: quiz.questions.length,
    completedAt: new Date().toISOString(),
    userAnswers,
  };

  db.addQuizResult(quiz._id, resultRecord);

  return res.json({
    score,
    total: quiz.questions.length,
    percentage,
    breakdown: detailedBreakdown,
  });
});

app.delete('/api/quiz/:id', (req: Request, res: Response) => {
  const success = db.deleteQuiz(req.params.id);
  return res.json({ success });
});

// ==================== HISTORY ROUTES ====================

app.get('/api/history', (req: Request, res: Response) => {
  const user = (req as any).user;
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  let list = db.getSummaries(user._id);

  // Filter by type
  const typeFilter = req.query.type as string;
  if (typeFilter && typeFilter !== 'all') {
    list = list.filter(item => item.summary_type === typeFilter);
  }

  // Search
  const search = req.query.search as string;
  if (search && search.trim()) {
    const q = search.toLowerCase();
    list = list.filter(
      item =>
        item.title.toLowerCase().includes(q) ||
        item.summary.toLowerCase().includes(q) ||
        item.keywords?.some(k => k.toLowerCase().includes(q))
    );
  }

  return res.json(list);
});

app.get('/api/history/:id', (req: Request, res: Response) => {
  const item = db.getSummaryById(req.params.id);
  if (!item) return res.status(404).json({ error: 'Summary not found' });
  return res.json(item);
});

app.put('/api/history/:id', (req: Request, res: Response) => {
  const { title } = req.body;
  const updated = db.updateSummary(req.params.id, { title });
  if (!updated) return res.status(404).json({ error: 'Summary not found' });
  return res.json(updated);
});

app.delete('/api/history/:id', (req: Request, res: Response) => {
  const success = db.deleteSummary(req.params.id);
  return res.json({ success });
});

// ==================== USER PROFILE & STATS ====================

app.get('/api/user/profile', (req: Request, res: Response) => {
  const user = (req as any).user;
  if (!user) return res.status(401).json({ error: 'Unauthorized' });
  return res.json(user);
});

app.put('/api/user/profile', (req: Request, res: Response) => {
  const user = (req as any).user;
  if (!user) return res.status(401).json({ error: 'Unauthorized' });
  const { name, profile_image } = req.body;
  const updated = db.updateUser(user._id, { name, profile_image });
  return res.json(updated);
});

app.put('/api/user/preferences', (req: Request, res: Response) => {
  const user = (req as any).user;
  if (!user) return res.status(401).json({ error: 'Unauthorized' });
  const { theme, default_summary_length, default_summary_style } = req.body;
  const currentPreferences = user.preferences || {};
  const updatedPreferences = {
    ...currentPreferences,
    ...(theme ? { theme } : {}),
    ...(default_summary_length ? { default_summary_length } : {}),
    ...(default_summary_style ? { default_summary_style } : {}),
  };
  const updated = db.updateUser(user._id, { preferences: updatedPreferences });
  return res.json(updated?.preferences);
});

app.put('/api/user/password', (req: Request, res: Response) => {
  const user = (req as any).user;
  if (!user) return res.status(401).json({ error: 'Unauthorized' });
  const { currentPassword, newPassword } = req.body;
  if (!newPassword || newPassword.length < 6) {
    return res.status(400).json({ error: 'New password must be at least 6 characters long.' });
  }
  // If current password provided, verify it (unless user was oauth created)
  if (currentPassword && user.password_hash !== 'oauth_authenticated' && user.password_hash !== currentPassword) {
    return res.status(400).json({ error: 'Current password does not match.' });
  }
  db.updateUser(user._id, { password_hash: newPassword });
  return res.json({ success: true, message: 'Password updated successfully.' });
});

app.delete('/api/user/account', (req: Request, res: Response) => {
  const user = (req as any).user;
  if (!user) return res.status(401).json({ error: 'Unauthorized' });
  const success = db.deleteUser(user._id);
  return res.json({ success, message: 'Account and associated records deleted.' });
});

app.get('/api/stats', (req: Request, res: Response) => {
  const user = (req as any).user;
  if (!user) return res.status(401).json({ error: 'Unauthorized' });
  const stats = db.getStats(user._id);
  return res.json(stats);
});

app.get('/api/health', (_req: Request, res: Response) => {
  return res.json({ status: 'ok' });
});

// ==================== VITE & STATIC SERVING ====================

async function setupServer() {
  const httpServer = http.createServer(app);

  if (process.env.NODE_ENV !== 'production') {
    // Initialize Vite middleware in background so port 3000 binds immediately
    // Attach Vite WebSocket server to httpServer so HMR/client WS shares port 3000
    const viteReady = (async () => {
      const { createServer } = await import('vite');
      const vite = await createServer({
        server: {
          middlewareMode: true,
          hmr: process.env.DISABLE_HMR !== 'true' ? { server: httpServer } : false,
          ws: { server: httpServer },
        },
        appType: 'spa',
      });
      app.use(vite.middlewares);
    })();

    viteReady.catch(err => {
      console.error('Failed to initialize Vite dev middleware:', err);
    });

    app.use((_req, _res, next) => {
      viteReady.then(() => next()).catch(next);
    });
  } else {
    // In prod, serve static dist folder
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  httpServer.listen(port, '0.0.0.0', () => {
    console.log(`SummarAI server listening on http://0.0.0.0:${port}`);
  });
}

setupServer().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
