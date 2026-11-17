import React, { useState } from 'react';
import {
  Sparkles,
  ArrowRight,
  FileText,
  FileSpreadsheet,
  Globe,
  BookOpen,
  Layers,
  HelpCircle,
  CheckCircle,
  Zap,
  Shield,
  Download,
  Brain,
  Star,
  ChevronDown,
  Check,
  Play,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { NavigationTab } from '../components/layout/Sidebar';

interface LandingPageProps {
  onGetStarted: () => void;
  onTryDemo: (tab?: NavigationTab) => void;
  onLogin: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  onGetStarted,
  onTryDemo,
  onLogin,
}) => {
  const { user } = useAuth();
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const features: Array<{
    icon: React.ComponentType<{ className?: string }>;
    title: string;
    desc: string;
    color: string;
    tab: NavigationTab;
  }> = [
    {
      icon: FileText,
      title: 'AI Text Summarization',
      desc: 'Condense any long-form essay, research paper, or report into short, medium, or detailed formats with tailored tones.',
      color: 'from-blue-500 to-indigo-600',
      tab: 'text-summarizer',
    },
    {
      icon: FileSpreadsheet,
      title: 'PDF Summarization',
      desc: 'Hierarchical chunking reads multi-page documents, extracts chapter-by-chapter insights, and detects scanned files.',
      color: 'from-indigo-500 to-purple-600',
      tab: 'pdf-summarizer',
    },
    {
      icon: Zap,
      title: 'Smart Key Point Extraction',
      desc: 'Isolate decisive arguments, data metrics, and core takeaways without missing critical nuances or facts.',
      color: 'from-purple-500 to-pink-600',
      tab: 'text-summarizer',
    },
    {
      icon: BookOpen,
      title: 'AI Notes Generator',
      desc: 'Generate structured revision sheets, detailed topic breakdowns, and high-yield exam preparation guides instantly.',
      color: 'from-emerald-500 to-teal-600',
      tab: 'notes-generator',
    },
    {
      icon: Layers,
      title: 'Flashcard Generator',
      desc: 'Transform complex literature into active-recall flashcard decks with interactive 3D flip physics and mastery tracking.',
      color: 'from-amber-500 to-orange-600',
      tab: 'flashcards',
    },
    {
      icon: HelpCircle,
      title: 'AI Quiz Generator',
      desc: 'Evaluate your comprehension with AI-crafted multiple-choice questions, detailed distractor explanations, and scoring.',
      color: 'from-cyan-500 to-blue-600',
      tab: 'quiz-generator',
    },
  ];

  const steps = [
    {
      number: '01',
      title: 'Upload or Paste Content',
      desc: 'Paste raw text, enter a live article URL, or drag-and-drop complex PDF documents directly into the workspace.',
    },
    {
      number: '02',
      title: 'Let AI Analyze & Synthesize',
      desc: 'State-of-the-art Gemini 3.8 models parse deep semantics, preserve crucial data points, and compress verbose prose.',
    },
    {
      number: '03',
      title: 'Master & Retain Knowledge',
      desc: 'Export executive summaries as formatted PDFs or TXT files, drill with flashcards, and test yourself with custom quizzes.',
    },
  ];

  const faqs = [
    {
      q: 'How does SummarAI preserve factual accuracy in summaries?',
      a: 'SummarAI uses specialized fact-preservation instructions on Gemini 3.8 Flash that instruct the model to ground every sentence strictly in the source text, explicitly preserving metrics, dates, proper nouns, and citations.',
    },
    {
      q: 'Can I summarize long multi-page PDF documents?',
      a: 'Yes! SummarAI includes a hierarchical chunking engine that reads multi-page PDFs, summarizes individual sections with context-preserving overlaps, and synthesizes an overarching executive summary with page references.',
    },
    {
      q: 'Can I export summaries and study notes?',
      a: 'Absolutely. Every summary and generated note can be copied in one click, downloaded as a clean .TXT document, or exported as a professionally formatted .PDF report.',
    },
    {
      q: 'How does the interactive flashcard and quiz mode work?',
      a: 'Once a summary is generated, you can click "Generate Flashcards" or "Create Quiz". SummarAI identifies high-yield concepts and structures them for active recall with flip animations and instant scoring.',
    },
  ];

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 font-sans selection:bg-indigo-500 selection:text-white">
      {/* Top Navigation */}
      <nav className="sticky top-0 z-40 bg-slate-900/80 backdrop-blur-md border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-500 via-violet-500 to-cyan-400 flex items-center justify-center shadow-lg shadow-indigo-500/25">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <div>
              <span className="font-extrabold text-xl tracking-tight bg-gradient-to-r from-indigo-400 via-purple-300 to-cyan-400 bg-clip-text text-transparent">
                SummarAI
              </span>
              <span className="ml-2 text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                v2.0
              </span>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-300">
            <a href="#features" className="hover:text-white transition-colors">Features</a>
            <a href="#how-it-works" className="hover:text-white transition-colors">How It Works</a>
            <a href="#testimonials" className="hover:text-white transition-colors">Testimonials</a>
            <a href="#faq" className="hover:text-white transition-colors">FAQ</a>
          </div>

          <div className="flex items-center gap-3">
            {user ? (
              <button
                onClick={onGetStarted}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 text-white text-sm font-semibold shadow-lg shadow-indigo-500/25 transition-all"
              >
                Go to Dashboard
              </button>
            ) : (
              <>
                <button
                  onClick={onLogin}
                  className="px-4 py-2 text-sm font-medium text-slate-300 hover:text-white transition-colors"
                >
                  Sign In
                </button>
                <button
                  onClick={() => onTryDemo()}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-semibold border border-slate-700 transition-all"
                >
                  Try Demo
                </button>
                <button
                  onClick={onGetStarted}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 text-white text-sm font-semibold shadow-lg shadow-indigo-500/25 transition-all"
                >
                  Get Started
                </button>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-16 pb-24 lg:pt-28 lg:pb-36 overflow-hidden">
        {/* Glow Gradients */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[450px] bg-indigo-600/20 blur-[130px] pointer-events-none rounded-full" />
        <div className="absolute top-1/3 left-1/3 w-[500px] h-[350px] bg-cyan-500/15 blur-[120px] pointer-events-none rounded-full" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-800/80 border border-slate-700/80 text-xs font-semibold text-indigo-300 mb-8 animate-fade-in shadow-inner">
            <Sparkles className="w-4 h-4 text-cyan-400" />
            <span>Powered by Gemini 3.8 Abstractive Intelligence</span>
          </div>

          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-white max-w-4xl mx-auto leading-[1.1]">
            Understand More.{' '}
            <span className="bg-gradient-to-r from-indigo-400 via-violet-400 to-cyan-300 bg-clip-text text-transparent">
              Read Less.
            </span>
          </h1>

          <p className="mt-6 text-lg sm:text-xl text-slate-300 max-w-2xl mx-auto leading-relaxed">
            Transform lengthy documents, articles, and study materials into clear, meaningful summaries with the power of AI.
          </p>

          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <button
              onClick={onGetStarted}
              className="px-8 py-4 rounded-2xl bg-gradient-to-r from-indigo-500 via-violet-600 to-indigo-600 hover:from-indigo-600 hover:to-violet-700 text-white font-bold text-base shadow-xl shadow-indigo-500/30 hover:shadow-indigo-500/50 hover:scale-[1.02] active:scale-95 transition-all flex items-center gap-2 group"
            >
              <span>Get Started Free</span>
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>

            <button
              onClick={() => onTryDemo()}
              className="px-8 py-4 rounded-2xl bg-slate-800/90 hover:bg-slate-700 text-white font-semibold text-base border border-slate-700 hover:border-slate-600 shadow-lg hover:scale-[1.02] active:scale-95 transition-all flex items-center gap-2"
            >
              <Play className="w-4 h-4 text-cyan-400 fill-cyan-400" />
              <span>Explore Live Demo</span>
            </button>
          </div>

          {/* Social Proof metrics */}
          <div className="mt-14 pt-8 border-t border-slate-800/80 flex flex-wrap justify-center gap-8 sm:gap-16 text-slate-400 text-xs sm:text-sm">
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-400" />
              <span>90% Reading Time Reduction</span>
            </div>
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-400" />
              <span>Zero Hallucination Fact Preservation</span>
            </div>
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-400" />
              <span>PDF, Web URL & Text Support</span>
            </div>
          </div>

          {/* SaaS Dashboard Preview Illustration */}
          <div className="mt-16 max-w-5xl mx-auto rounded-3xl p-2 bg-gradient-to-b from-indigo-500/30 via-slate-800/50 to-slate-900 border border-slate-700/80 shadow-2xl shadow-indigo-950/50">
            <div className="rounded-2xl bg-slate-950/95 border border-slate-800 overflow-hidden text-left p-6 sm:p-8">
              {/* Fake App Header */}
              <div className="flex items-center justify-between pb-6 border-b border-slate-800/80">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-rose-500/80" />
                  <span className="w-3 h-3 rounded-full bg-amber-500/80" />
                  <span className="w-3 h-3 rounded-full bg-emerald-500/80" />
                  <span className="ml-3 text-xs font-mono text-slate-500">summarai.app/workspace</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    Compression: 89%
                  </span>
                  <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                    Executive Style
                  </span>
                </div>
              </div>

              {/* Fake Workspace Body */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-6">
                <div className="lg:col-span-5 space-y-3">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Source Document (1,420 words)</span>
                  <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-400 font-mono leading-relaxed line-clamp-6 opacity-70">
                    The rapid evolution of neural network architectures, particularly the transition from recurrent mechanisms to multi-head self-attention, has fundamentally restructured natural language processing. In conventional recurrent architectures, hidden states are computed sequentially along the temporal axis...
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <FileText className="w-4 h-4 text-indigo-400" />
                    <span>attention_is_all_you_need.pdf</span>
                  </div>
                </div>

                <div className="lg:col-span-7 space-y-3">
                  <span className="text-xs font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-cyan-400" />
                    SummarAI Intelligence Synthesis (158 words)
                  </span>
                  <div className="p-5 rounded-xl bg-gradient-to-br from-indigo-950/40 via-slate-900 to-purple-950/30 border border-indigo-500/30 space-y-3 text-sm text-slate-200">
                    <h3 className="font-bold text-white text-base">Key Technical Summary</h3>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      Transformers replace recurrence with multi-head self-attention, achieving total parallelization in GPU memory. Sine-cosine positional encodings supply sequence order without recurrent loops.
                    </p>
                    <div className="space-y-1.5 pt-1">
                      <div className="flex items-start gap-2 text-xs text-slate-300">
                        <CheckCircle className="w-3.5 h-3.5 text-cyan-400 shrink-0 mt-0.5" />
                        <span>Scaled dot-product attention prevents softmax gradient saturation</span>
                      </div>
                      <div className="flex items-start gap-2 text-xs text-slate-300">
                        <CheckCircle className="w-3.5 h-3.5 text-cyan-400 shrink-0 mt-0.5" />
                        <span>Enables O(1) sequential operation count compared to O(n) in RNNs</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Section */}
      <section id="features" className="py-24 bg-slate-950/60 border-t border-slate-800 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-xs font-bold text-indigo-400 uppercase tracking-widest mb-3">Complete Learning Suite</h2>
            <p className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
              Everything you need to digest, master, and retain knowledge.
            </p>
            <p className="mt-4 text-slate-400 text-sm sm:text-base">
              SummarAI goes beyond simple text shortening. It builds a cohesive learning environment with revision notes, flashcards, and quizzes.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f, idx) => {
              const Icon = f.icon;
              return (
                <div
                  key={idx}
                  onClick={() => onTryDemo(f.tab)}
                  className="p-7 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-indigo-500/60 hover:bg-slate-900 transition-all duration-300 hover:-translate-y-1 group cursor-pointer flex flex-col justify-between"
                  role="button"
                  tabIndex={0}
                  onKeyDown={e => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      onTryDemo(f.tab);
                    }
                  }}
                >
                  <div>
                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-tr ${f.color} flex items-center justify-center shadow-lg mb-5 group-hover:scale-110 transition-transform`}>
                      <Icon className="w-6 h-6 text-white" />
                    </div>
                    <h3 className="text-lg font-bold text-white mb-2 group-hover:text-cyan-300 transition-colors">
                      {f.title}
                    </h3>
                    <p className="text-sm text-slate-400 leading-relaxed mb-6">
                      {f.desc}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-indigo-400 group-hover:text-cyan-300 transition-colors">
                    <span>Explore Workspace Tool</span>
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-24 relative border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-xs font-bold text-cyan-400 uppercase tracking-widest mb-3">Simple 3-Step Flow</h2>
            <p className="text-3xl sm:text-4xl font-extrabold text-white">How SummarAI Works</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
            {steps.map((s, idx) => (
              <div
                key={idx}
                className="p-8 rounded-2xl bg-slate-900/60 border border-slate-800/80 relative"
              >
                <span className="font-mono text-3xl font-extrabold text-indigo-500/30 absolute top-6 right-6">
                  {s.number}
                </span>
                <div className="w-10 h-10 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 font-bold mb-5">
                  {s.number}
                </div>
                <h3 className="text-lg font-bold text-white mb-2">{s.title}</h3>
                <p className="text-sm text-slate-400 leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Supported Document Types & Formats */}
      <section className="py-20 bg-slate-950/80 border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-10">
            <div>
              <h3 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                Any Format. Any Source. Instant Intelligence.
              </h3>
              <p className="mt-3 text-slate-400 text-sm max-w-xl">
                Whether you have digital textbooks, journal papers, online articles, or plain text notes, SummarAI digests them with ease.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {['PDF Documents', 'Web Article URLs', 'Raw Plain Text', 'Word / TXT Notes', 'Academic Journals', 'E-Books'].map((item, i) => (
                <div
                  key={i}
                  className="px-4 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs font-semibold text-slate-300 flex items-center gap-2"
                >
                  <CheckCircle className="w-4 h-4 text-indigo-400" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section id="testimonials" className="py-24 border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-xs font-bold text-indigo-400 uppercase tracking-widest mb-3">Real Learner Feedback</h2>
            <p className="text-3xl sm:text-4xl font-extrabold text-white">Trusted by researchers and students</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                name: 'Dr. Sarah Lin',
                role: 'Biomedical Researcher, Stanford',
                quote: 'SummarAI cuts through 40-page journal articles in seconds while preserving all clinical parameters and dosages. The flashcards feature makes exam prep seamless.',
                stars: 5,
              },
              {
                name: 'Marcus Vance',
                role: 'Law Student, Columbia University',
                quote: 'The executive and academic summary styles are phenomenal for case briefs. I can extract decisive precedents and generate revision notes instantly.',
                stars: 5,
              },
              {
                name: 'Elena Rostova',
                role: 'Senior Product Strategist',
                quote: 'I paste industry reports and competitor earnings calls. SummarAI delivers bullet takeaways that I can download as a crisp PDF to share with my leadership team.',
                stars: 5,
              },
            ].map((t, idx) => (
              <div key={idx} className="p-7 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-1 text-amber-400 mb-4">
                    {[...Array(t.stars)].map((_, s) => (
                      <Star key={s} className="w-4 h-4 fill-amber-400" />
                    ))}
                  </div>
                  <p className="text-sm text-slate-300 leading-relaxed italic mb-6">"{t.quote}"</p>
                </div>
                <div>
                  <p className="text-sm font-bold text-white">{t.name}</p>
                  <p className="text-xs text-slate-500">{t.role}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Accordion */}
      <section id="faq" className="py-24 bg-slate-950/70 border-t border-slate-800">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-xs font-bold text-indigo-400 uppercase tracking-widest mb-3">Got Questions?</h2>
            <p className="text-3xl font-extrabold text-white">Frequently Asked Questions</p>
          </div>

          <div className="space-y-4">
            {faqs.map((faq, i) => {
              const isOpen = openFaq === i;
              return (
                <div
                  key={i}
                  className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden transition-colors"
                >
                  <button
                    onClick={() => setOpenFaq(isOpen ? null : i)}
                    className="w-full p-5 text-left flex items-center justify-between gap-4 font-semibold text-white text-base"
                  >
                    <span>{faq.q}</span>
                    <ChevronDown className={`w-5 h-5 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                  </button>
                  {isOpen && (
                    <div className="px-5 pb-5 text-sm text-slate-400 leading-relaxed border-t border-slate-800/60 pt-3">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Call to Action Banner */}
      <section className="py-20 relative overflow-hidden border-t border-slate-800 bg-gradient-to-b from-indigo-950/30 to-slate-950">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <div className="inline-flex items-center gap-2 p-3 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 mb-6">
            <Sparkles className="w-6 h-6 text-indigo-400" />
          </div>
          <h2 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight">
            Ready to Accelerate Your Learning?
          </h2>
          <p className="mt-4 text-slate-300 text-base sm:text-lg max-w-xl mx-auto">
            Join thousands of students, researchers, and professionals who summarize documents 10x faster.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <button
              onClick={onGetStarted}
              className="px-8 py-4 rounded-2xl bg-gradient-to-r from-indigo-500 via-violet-600 to-indigo-600 hover:from-indigo-600 hover:to-violet-700 text-white font-bold text-base shadow-xl shadow-indigo-500/30 transition-all flex items-center gap-2"
            >
              <span>Get Started Now</span>
              <ArrowRight className="w-5 h-5" />
            </button>
            <button
              onClick={() => onTryDemo()}
              className="px-8 py-4 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-base border border-slate-700 transition-all"
            >
              Launch Demo Workspace
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 bg-slate-950 border-t border-slate-800/80 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-slate-200 text-sm">SummarAI Intelligence</span>
          </div>

          <div className="flex items-center gap-6">
            <a href="#features" className="hover:text-slate-300 transition-colors">Features</a>
            <a href="#how-it-works" className="hover:text-slate-300 transition-colors">Workflow</a>
            <a href="#testimonials" className="hover:text-slate-300 transition-colors">Reviews</a>
            <a href="#faq" className="hover:text-slate-300 transition-colors">FAQ</a>
          </div>

          <p>© 2026 SummarAI. Built for students, researchers, and professionals.</p>
        </div>
      </footer>
    </div>
  );
};
