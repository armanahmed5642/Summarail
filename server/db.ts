import fs from 'fs';
import path from 'path';

export interface User {
  _id: string;
  name: string;
  email: string;
  password_hash: string;
  profile_image?: string;
  preferences: {
    theme: 'light' | 'dark' | 'system';
    default_summary_length: 'short' | 'medium' | 'detailed';
    default_summary_style: 'paragraph' | 'bullet_points' | 'executive' | 'simple' | 'academic';
  };
  created_at: string;
}

export interface Summary {
  _id: string;
  user_id: string;
  title: string;
  original_text: string;
  summary: string;
  summary_type: 'text' | 'pdf' | 'article' | 'notes' | 'image';
  summary_length: 'short' | 'medium' | 'detailed';
  summary_style: string;
  key_points: string[];
  keywords: string[];
  original_word_count: number;
  summary_word_count: number;
  compression_ratio: number;
  source_url?: string;
  filename?: string;
  page_count?: number;
  created_at: string;
}

export interface DocumentRecord {
  _id: string;
  user_id: string;
  filename: string;
  file_type: string;
  file_size: number;
  page_count?: number;
  processing_status: 'completed' | 'processing' | 'failed';
  summary_id?: string;
  created_at: string;
}

export interface FlashcardItem {
  id: string;
  question: string;
  answer: string;
  category?: string;
  mastered?: boolean;
}

export interface FlashcardDeck {
  _id: string;
  user_id: string;
  title: string;
  source_title?: string;
  cards: FlashcardItem[];
  created_at: string;
}

export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
}

export interface QuizResult {
  score: number;
  total: number;
  completedAt: string;
  userAnswers?: Record<string, number>;
}

export interface QuizRecord {
  _id: string;
  user_id: string;
  title: string;
  source_title?: string;
  questions: QuizQuestion[];
  results?: QuizResult[];
  created_at: string;
}

interface DatabaseSchema {
  users: User[];
  summaries: Summary[];
  documents: DocumentRecord[];
  flashcards: FlashcardDeck[];
  quizzes: QuizRecord[];
}

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

const INITIAL_DATA: DatabaseSchema = {
  users: [
    {
      _id: 'user_demo_1',
      name: 'Alex Rivera',
      email: 'demo@summarai.com',
      password_hash: 'demo123',
      profile_image: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=250&q=80',
      preferences: {
        theme: 'light',
        default_summary_length: 'medium',
        default_summary_style: 'bullet_points',
      },
      created_at: new Date(Date.now() - 14 * 86400000).toISOString(),
    },
  ],
  summaries: [
    {
      _id: 'sum_sample_1',
      user_id: 'user_demo_1',
      title: 'Attention Is All You Need - Transformer Architecture',
      original_text: 'The Transformer is the first sequence transduction model based entirely on self-attention, replacing recurrent and convolutional layers commonly used in encoder-decoder architectures. By dispensing with recurrence, Transformers allow for significantly more parallelization and achieve state-of-the-art translation quality after being trained for only twelve hours on eight P100 GPUs.',
      summary: 'The Transformer replaces recurrent and convolutional architectures with multi-head self-attention mechanisms, enabling unprecedented parallel training and scaling. Key components include scaled dot-product attention, positional encodings for sequence order, and stacked encoder-decoder blocks.',
      summary_type: 'pdf',
      summary_length: 'medium',
      summary_style: 'executive',
      key_points: [
        'Eliminates recurrence and convolutions in favor of self-attention',
        'Scales dot-product attention across multiple representation subspaces',
        'Drastically reduces training time while setting SOTA benchmark results',
        'Introduces sine and cosine positional encodings to preserve token sequence'
      ],
      keywords: ['Transformer', 'Self-Attention', 'Neural Networks', 'Parallelization', 'NLP'],
      original_word_count: 520,
      summary_word_count: 54,
      compression_ratio: 89,
      filename: 'attention_paper.pdf',
      page_count: 15,
      created_at: new Date(Date.now() - 2 * 86400000).toISOString(),
    },
    {
      _id: 'sum_sample_2',
      user_id: 'user_demo_1',
      title: 'Quantum Computing Fundamentals & Superposition',
      original_text: 'Quantum computing leverages quantum mechanical phenomena such as superposition and entanglement to perform complex calculations exponentially faster than classical computers for specific problem classes. Qubits can exist simultaneously in multiple states until measured.',
      summary: 'Quantum computers use quantum bits (qubits) capable of superposition and entanglement, enabling computational speedups for optimization, cryptography, and materials simulation. Error correction remains the primary engineering hurdle.',
      summary_type: 'article',
      summary_length: 'short',
      summary_style: 'bullet_points',
      key_points: [
        'Qubits harness superposition to exist in combinations of |0⟩ and |1⟩',
        'Quantum entanglement links particle states regardless of spatial distance',
        'Fault-tolerant quantum error correction is essential for practical quantum utility'
      ],
      keywords: ['Quantum', 'Qubits', 'Superposition', 'Entanglement', 'Cryptography'],
      original_word_count: 380,
      summary_word_count: 42,
      compression_ratio: 88,
      source_url: 'https://nature.com/articles/quantum-computing-breakthrough',
      created_at: new Date(Date.now() - 4 * 86400000).toISOString(),
    },
    {
      _id: 'sum_sample_3',
      user_id: 'user_demo_1',
      title: 'CRISPR Gene Editing Principles and Applications',
      original_text: 'CRISPR-Cas9 functions as a molecular pair of scissors guided by RNA to find and cleave specific DNA sequences in genomes. This enables targeted gene knockouts, precise insertion of therapeutic sequences, and regulation of gene expression.',
      summary: 'CRISPR-Cas9 allows targeted genomic alterations by pairing Cas9 endonuclease with a programmable single-guide RNA (sgRNA). It has revolutionized medical therapeutics, agricultural resilience, and synthetic biology.',
      summary_type: 'text',
      summary_length: 'detailed',
      summary_style: 'academic',
      key_points: [
        'Single-guide RNA directs Cas9 endonuclease to target DNA protospacer',
        'Double-strand breaks activate non-homologous end joining or homology-directed repair',
        'Clinical trials targeting sickle-cell disease demonstrate therapeutic efficacy'
      ],
      keywords: ['CRISPR', 'Cas9', 'Genomics', 'sgRNA', 'Gene Therapy'],
      original_word_count: 440,
      summary_word_count: 46,
      compression_ratio: 89,
      created_at: new Date(Date.now() - 6 * 86400000).toISOString(),
    }
  ],
  documents: [
    {
      _id: 'doc_sample_1',
      user_id: 'user_demo_1',
      filename: 'attention_paper.pdf',
      file_type: 'application/pdf',
      file_size: 1048576,
      page_count: 15,
      processing_status: 'completed',
      summary_id: 'sum_sample_1',
      created_at: new Date(Date.now() - 2 * 86400000).toISOString(),
    }
  ],
  flashcards: [
    {
      _id: 'deck_sample_1',
      user_id: 'user_demo_1',
      title: 'Machine Learning & Transformer Architecture',
      source_title: 'Attention Is All You Need',
      cards: [
        {
          id: 'card_1',
          question: 'What is the primary advantage of self-attention over recurrent architectures (RNNs)?',
          answer: 'Self-attention computes dependencies between all tokens simultaneously, allowing complete parallel training and resolving vanishing gradient over long distances.',
          category: 'Architecture',
          mastered: true
        },
        {
          id: 'card_2',
          question: 'Why are positional encodings required in Transformer models?',
          answer: 'Since the self-attention mechanism contains no recurrence or convolutions, it has no inherent notion of sequence order; positional encodings inject token positions.',
          category: 'Mechanics',
          mastered: false
        },
        {
          id: 'card_3',
          question: 'What is the scaling factor in Scaled Dot-Product Attention, and why is it used?',
          answer: 'Dividing by sqrt(d_k) prevents dot products from growing excessively large for large dimensions, which would push softmax gradients into vanishing regions.',
          category: 'Math',
          mastered: true
        }
      ],
      created_at: new Date(Date.now() - 2 * 86400000).toISOString(),
    }
  ],
  quizzes: [
    {
      _id: 'quiz_sample_1',
      user_id: 'user_demo_1',
      title: 'Transformer Architecture Mastery Check',
      source_title: 'Attention Is All You Need',
      questions: [
        {
          id: 'q_1',
          question: 'Which component enables Transformers to process input sequence tokens in parallel rather than sequentially?',
          options: [
            'Recurrent Hidden States',
            'Multi-Head Self-Attention',
            'Convolutional Kernels',
            'Beam Search Decoding'
          ],
          correctAnswer: 1,
          explanation: 'Multi-head self-attention enables token-to-token comparison in a single matrix multiplication across the entire context window without step-by-step looping.'
        },
        {
          id: 'q_2',
          question: 'Why do Transformers add sinusoidal positional encodings to the input embeddings?',
          options: [
            'To increase vocabulary capacity',
            'To inject sequential order information that self-attention inherently lacks',
            'To compress high-dimensional vectors',
            'To prevent overfitting on training data'
          ],
          correctAnswer: 1,
          explanation: 'Attention by itself is permutation-invariant. Positional encodings provide distinct wavelength signals so the network knows relative and absolute token positioning.'
        },
        {
          id: 'q_3',
          question: 'In Scaled Dot-Product Attention, what is the purpose of dividing the dot product of Q and K by the square root of the key dimension (sqrt(d_k))?',
          options: [
            'To normalize token length',
            'To prevent softmax gradients from becoming extremely small due to large dot products',
            'To convert logits into probabilistic priors',
            'To accelerate backward propagation by half'
          ],
          correctAnswer: 1,
          explanation: 'For large values of d_k, dot products grow large in magnitude, pushing the softmax function into regions with extremely small gradients. Scaling counteracts this effect.'
        }
      ],
      results: [
        {
          score: 3,
          total: 3,
          completedAt: new Date(Date.now() - 86400000).toISOString(),
        }
      ],
      created_at: new Date(Date.now() - 2 * 86400000).toISOString(),
    }
  ]
};

class Database {
  private data: DatabaseSchema;

  constructor() {
    this.data = this.load();
  }

  private load(): DatabaseSchema {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        return JSON.parse(raw);
      }
      this.saveInitial(INITIAL_DATA);
      return INITIAL_DATA;
    } catch (e) {
      console.warn('Failed to load DB file, using initial data:', e);
      return INITIAL_DATA;
    }
  }

  private saveInitial(data: DatabaseSchema) {
    try {
      fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
    } catch (e) {
      console.error('Failed to write initial DB file:', e);
    }
  }

  public save() {
    try {
      fs.writeFileSync(DB_FILE, JSON.stringify(this.data, null, 2), 'utf-8');
    } catch (e) {
      console.error('Failed to save DB:', e);
    }
  }

  // Users
  getUserByEmail(email: string): User | undefined {
    return this.data.users.find(u => u.email.toLowerCase() === email.toLowerCase());
  }

  getUserById(id: string): User | undefined {
    return this.data.users.find(u => u._id === id);
  }

  createUser(user: Omit<User, '_id' | 'created_at'>): User {
    const newUser: User = {
      ...user,
      _id: `user_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      created_at: new Date().toISOString(),
    };
    this.data.users.push(newUser);
    this.save();
    return newUser;
  }

  updateUser(id: string, updates: Partial<User>): User | undefined {
    const index = this.data.users.findIndex(u => u._id === id);
    if (index === -1) return undefined;
    this.data.users[index] = { ...this.data.users[index], ...updates };
    this.save();
    return this.data.users[index];
  }

  deleteUser(id: string): boolean {
    const before = this.data.users.length;
    this.data.users = this.data.users.filter(u => u._id !== id);
    this.data.summaries = this.data.summaries.filter(s => s.user_id !== id);
    this.data.flashcards = this.data.flashcards.filter(f => f.user_id !== id);
    this.data.quizzes = this.data.quizzes.filter(q => q.user_id !== id);
    this.save();
    return this.data.users.length < before;
  }

  // Summaries
  getSummaries(userId: string): Summary[] {
    return this.data.summaries
      .filter(s => s.user_id === userId)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  getSummaryById(id: string): Summary | undefined {
    return this.data.summaries.find(s => s._id === id);
  }

  createSummary(summary: Omit<Summary, '_id' | 'created_at'>): Summary {
    const newSummary: Summary = {
      ...summary,
      _id: `sum_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      created_at: new Date().toISOString(),
    };
    this.data.summaries.unshift(newSummary);
    this.save();
    return newSummary;
  }

  updateSummary(id: string, updates: Partial<Summary>): Summary | undefined {
    const index = this.data.summaries.findIndex(s => s._id === id);
    if (index === -1) return undefined;
    this.data.summaries[index] = { ...this.data.summaries[index], ...updates };
    this.save();
    return this.data.summaries[index];
  }

  deleteSummary(id: string): boolean {
    const before = this.data.summaries.length;
    this.data.summaries = this.data.summaries.filter(s => s._id !== id);
    this.save();
    return this.data.summaries.length < before;
  }

  // Documents
  getDocuments(userId: string): DocumentRecord[] {
    return this.data.documents.filter(d => d.user_id === userId);
  }

  createDocument(doc: Omit<DocumentRecord, '_id' | 'created_at'>): DocumentRecord {
    const newDoc: DocumentRecord = {
      ...doc,
      _id: `doc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      created_at: new Date().toISOString(),
    };
    this.data.documents.unshift(newDoc);
    this.save();
    return newDoc;
  }

  // Flashcards
  getFlashcardDecks(userId: string): FlashcardDeck[] {
    return this.data.flashcards
      .filter(f => f.user_id === userId)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  getFlashcardDeckById(id: string): FlashcardDeck | undefined {
    return this.data.flashcards.find(f => f._id === id);
  }

  createFlashcardDeck(deck: Omit<FlashcardDeck, '_id' | 'created_at'>): FlashcardDeck {
    const newDeck: FlashcardDeck = {
      ...deck,
      _id: `deck_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      created_at: new Date().toISOString(),
    };
    this.data.flashcards.unshift(newDeck);
    this.save();
    return newDeck;
  }

  updateFlashcardDeck(id: string, updates: Partial<FlashcardDeck>): FlashcardDeck | undefined {
    const index = this.data.flashcards.findIndex(f => f._id === id);
    if (index === -1) return undefined;
    this.data.flashcards[index] = { ...this.data.flashcards[index], ...updates };
    this.save();
    return this.data.flashcards[index];
  }

  deleteFlashcardDeck(id: string): boolean {
    const before = this.data.flashcards.length;
    this.data.flashcards = this.data.flashcards.filter(f => f._id !== id);
    this.save();
    return this.data.flashcards.length < before;
  }

  // Quizzes
  getQuizzes(userId: string): QuizRecord[] {
    return this.data.quizzes
      .filter(q => q.user_id === userId)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  getQuizById(id: string): QuizRecord | undefined {
    return this.data.quizzes.find(q => q._id === id);
  }

  createQuiz(quiz: Omit<QuizRecord, '_id' | 'created_at'>): QuizRecord {
    const newQuiz: QuizRecord = {
      ...quiz,
      _id: `quiz_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      created_at: new Date().toISOString(),
    };
    this.data.quizzes.unshift(newQuiz);
    this.save();
    return newQuiz;
  }

  addQuizResult(id: string, result: QuizResult): QuizRecord | undefined {
    const quiz = this.getQuizById(id);
    if (!quiz) return undefined;
    if (!quiz.results) quiz.results = [];
    quiz.results.push(result);
    this.save();
    return quiz;
  }

  deleteQuiz(id: string): boolean {
    const before = this.data.quizzes.length;
    this.data.quizzes = this.data.quizzes.filter(q => q._id !== id);
    this.save();
    return this.data.quizzes.length < before;
  }

  // Dashboard Stats
  getStats(userId: string) {
    const userSummaries = this.getSummaries(userId);
    const userDocs = this.getDocuments(userId);
    const userFlashcards = this.getFlashcardDecks(userId);
    const userQuizzes = this.getQuizzes(userId);

    const totalFlashcards = userFlashcards.reduce((acc, deck) => acc + deck.cards.length, 0);
    const completedQuizzes = userQuizzes.reduce((acc, q) => acc + (q.results?.length || 0), 0);
    const totalWordsSummarized = userSummaries.reduce((acc, s) => acc + (s.original_word_count || 0), 0);
    const totalWordsOutput = userSummaries.reduce((acc, s) => acc + (s.summary_word_count || 0), 0);
    const hoursSaved = Math.round((totalWordsSummarized - totalWordsOutput) / 200 * 10) / 10; // ~200 wpm reading speed

    return {
      totalSummaries: userSummaries.length,
      documentsProcessed: userDocs.length + userSummaries.filter(s => s.summary_type === 'pdf').length,
      flashcardsCreated: totalFlashcards,
      quizzesCompleted: completedQuizzes,
      totalWordsSummarized,
      hoursSaved: Math.max(0.5, hoursSaved),
    };
  }
}

export const db = new Database();
