# SummarAI – AI-Powered Text Summarization & Learning Platform

SummarAI is a production-grade, AI-powered text summarization and learning SaaS platform. It enables students, researchers, engineers, and professionals to digest complex documents 10x faster, retain high-yield knowledge with active recall flashcards, and test comprehension with dynamically generated quizzes.

---

## 🌟 Key Features

1. **AI Text Summarization**
   - Abstractive condensation powered by **Gemini 3.8 Flash**.
   - Presets for Short (50–90 words), Medium (120–220 words), and Detailed (250–450 words).
   - 5 Tailored tones: Bullet Points, Cohesive Paragraph, Executive Summary, Simple English, and Academic Style.
   - Grounded fact & numerical metrics preservation (eliminates hallucinations).
   - Extraction of key takeaway bullets and indexing tags.
   - One-click TXT and PDF export.

2. **PDF & Document Summarizer**
   - Drag-and-drop or file browser for `.pdf` and `.txt` files up to 25MB.
   - Multi-chunk hierarchical analysis for long-form papers and books.
   - Chapter-wise and page count metadata extraction.
   - Automatic detection of scanned / raster-only PDFs with OCR guidance.

3. **Article Summarizer**
   - URL-based article scraping with built-in SSRF protections (blocking loopback, RFC 1918 private subnets, and cloud metadata endpoints).
   - Domain identification, title extraction, and clean body text extraction.
   - Manual paste fallback for paywalled or JavaScript-gated sites.

4. **AI Notes Generator**
   - Formats:
     - **Quick Revision Notes**: Formulas, core axioms, and high-frequency concepts for 5-minute pre-test review.
     - **Detailed Study Notes**: In-depth explanations, hierarchical sections, and theoretical context.
     - **Exam Preparation Notes**: High-yield definitions, anticipated exam pitfalls, and memorization mnemonics.
   - Exportable to PDF and TXT.

5. **Interactive Flashcards**
   - Active recall decks with 3D flip card animations.
   - Mastery tracking ("Got It!" vs. "Study Again").
   - Progress bar and deck completion confetti celebrations.
   - Card shuffling and instant generation from any summary.

6. **Comprehension Quiz Generator**
   - Dynamic 4-option multiple-choice questions with difficulty grading (Easy, Medium, Hard).
   - Detailed educational explanations for both correct answers and distractors.
   - Automated scoring, percentage grade calculation, and retry capability.

7. **Summary History & Library**
   - Search summaries by title, keywords, or preview text.
   - Filter by content type (`text`, `pdf`, `article`, `notes`).
   - Inline title editing and deletion.
   - Re-export past summaries to PDF or TXT.

8. **User Settings & Theming**
   - Full dark mode and light mode support with persistent storage.
   - Configurable default summary length and style preferences.
   - User profile customization.

---

## 🚀 Architecture & Tech Stack

- **Frontend**: React 19, TypeScript, Tailwind CSS 4, Motion, Lucide Icons, jsPDF, Canvas Confetti.
- **Backend**: Node.js / Express with REST APIs (`/api/auth/*`, `/api/summarize/*`, `/api/notes/*`, `/api/flashcards/*`, `/api/quiz/*`, `/api/history/*`, `/api/user/*`).
- **AI Engine**: `@google/genai` TypeScript SDK utilizing `gemini-3.8-flash` with structured schemas and server-side authentication.
- **Database**: Atomic JSON / MongoDB-compatible persistent store (`data/db.json`) supporting collections: `users`, `summaries`, `documents`, `flashcards`, and `quizzes`.

---

## 🛠️ Getting Started

### Prerequisites
- Node.js 18+ installed
- Google Gemini API Key

### Installation

1. Clone or navigate to the repository:
   ```bash
   git clone <repo-url>
   cd summarai
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure environment variables in `.env`:
   ```bash
   GEMINI_API_KEY="your-gemini-api-key"
   ```

4. Start development server:
   ```bash
   npm run dev
   ```
   Open `http://localhost:3000` in your browser.

5. Build for production:
   ```bash
   npm run build
   npm run start
   ```

---

## 🔒 Security Best Practices
- **SSRF Hardened**: Prohibits fetching internal network IPs (`127.0.0.1`, `10.*`, `192.168.*`, `169.254.169.254`, etc.).
- **Server-Side AI SDK**: Gemini API keys are never bundled or exposed to client-side JavaScript.
- **Sanitized Outputs**: Validated JSON schemas enforce deterministic outputs.
