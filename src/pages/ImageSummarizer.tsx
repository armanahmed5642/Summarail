import React, { useState, useRef, useEffect } from 'react';
import {
  Camera,
  Image as ImageIcon,
  UploadCloud,
  Sparkles,
  RefreshCw,
  Check,
  Copy,
  Download,
  CheckCircle,
  Layers,
  HelpCircle,
  BookOpen,
  RotateCcw,
  X,
  SwitchCamera,
  Eye,
  AlertCircle,
} from 'lucide-react';
import { api, downloadAsTxt, downloadAsPdf, SummarizeImageResponse } from '../services/api';
import { SummaryLength, SummaryStyle } from '../types';
import { useToast } from '../context/ToastContext';
import { NavigationTab } from '../components/layout/Sidebar';

interface ImageSummarizerProps {
  onNavigateToTab?: (tab: NavigationTab, initialText?: string) => void;
}

export const ImageSummarizer: React.FC<ImageSummarizerProps> = ({ onNavigateToTab }) => {
  const [mode, setMode] = useState<'upload' | 'camera'>('upload');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Camera state
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isStartingCamera, setIsStartingCamera] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');

  // Options
  const [length, setLength] = useState<SummaryLength>('medium');
  const [style, setStyle] = useState<SummaryStyle>('bullet_points');
  const [promptHint, setPromptHint] = useState('');

  // Result state
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<SummarizeImageResponse | null>(null);
  const [showExtractedText, setShowExtractedText] = useState(false);
  const [copied, setCopied] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraCaptureFallbackRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const { success, error } = useToast();

  // Cleanup preview object URL
  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  // Cleanup camera stream on unmount
  useEffect(() => {
    return () => {
      stopCameraStream();
    };
  }, []);

  const stopCameraStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
  };

  const startCamera = async (targetFacing: 'environment' | 'user' = facingMode) => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraError('Live camera streaming is not supported in this browser. Use "Device Camera / Upload" below instead.');
      return;
    }

    stopCameraStream();
    setCameraError(null);
    setIsStartingCamera(true);

    try {
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: targetFacing },
            width: { ideal: 1920 },
            height: { ideal: 1080 },
          },
          audio: false,
        });
      } catch {
        // Fallback to any available video input if preferred facingMode isn't present
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      }

      streamRef.current = stream;
      setIsCameraActive(true);

      // Attach stream after video element renders
      requestAnimationFrame(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {
            // Autoplay with muted/playsInline usually resolves automatically
          });
        }
      });
    } catch (err: any) {
      const name = String(err?.name || '');
      if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
        setCameraError('Camera access was denied. Allow camera permissions in your browser settings or use the Upload / Device Camera button.');
      } else if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
        setCameraError('No camera hardware detected on this device. You can upload an image file instead.');
      } else {
        setCameraError(err?.message || 'Unable to start camera preview. Please try uploading an image instead.');
      }
    } finally {
      setIsStartingCamera(false);
    }
  };

  const handleCapturePhoto = () => {
    const video = videoRef.current;
    if (!video || video.videoWidth === 0 || video.videoHeight === 0) {
      error('Camera feed is still initializing. Please wait a moment and try again.');
      return;
    }

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      error('Failed to initialize image capture canvas.');
      return;
    }

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(
      blob => {
        if (!blob) {
          error('Failed to capture photo from camera.');
          return;
        }
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
        const capturedFile = new File([blob], `camera_capture_${timestamp}.jpg`, {
          type: 'image/jpeg',
        });

        applySelectedImage(capturedFile);
        stopCameraStream();
        success('Photo captured! Ready to analyze with Gemini Vision.');
      },
      'image/jpeg',
      0.92
    );
  };

  const handleToggleCameraFacing = () => {
    const nextFacing = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(nextFacing);
    if (isCameraActive) {
      startCamera(nextFacing);
    }
  };

  const applySelectedImage = (file: File) => {
    const isImage =
      file.type.startsWith('image/') ||
      /\.(png|jpe?g|webp|gif|heic|heif)$/i.test(file.name);

    if (!isImage) {
      error('Please select a valid image file (PNG, JPG, WEBP, or GIF).');
      return;
    }

    if (file.size > 15 * 1024 * 1024) {
      error('Image size exceeds the 15MB maximum limit.');
      return;
    }

    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }

    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    setResult(null);
    setShowExtractedText(false);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      applySelectedImage(e.target.files[0]);
      e.target.value = '';
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      applySelectedImage(e.dataTransfer.files[0]);
    }
  };

  const handleSwitchMode = (nextMode: 'upload' | 'camera') => {
    setMode(nextMode);
    setCameraError(null);
    if (nextMode === 'upload') {
      stopCameraStream();
    } else if (!selectedFile) {
      startCamera(facingMode);
    }
  };

  const handleResetImage = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setSelectedFile(null);
    setPreviewUrl(null);
    setResult(null);
    setShowExtractedText(false);
    if (mode === 'camera') {
      startCamera(facingMode);
    }
  };

  const handleAnalyzeImage = async () => {
    if (!selectedFile) return;

    setIsProcessing(true);
    try {
      const data = await api.summarizeImage(selectedFile, {
        filename: selectedFile.name,
        length,
        style,
        promptHint: promptHint.trim() || undefined,
      });

      if (!data || typeof data.summary !== 'string' || !data.summary.trim()) {
        throw new Error('Could not generate a summary from this image. Please try a clearer image.');
      }

      setResult({
        ...data,
        title: data.title || `Image Summary: ${selectedFile.name}`,
        extractedText: data.extractedText || '',
        summary: data.summary.trim(),
        keyPoints: Array.isArray(data.keyPoints) ? data.keyPoints : [],
        keywords: Array.isArray(data.keywords) ? data.keywords : [],
        originalWordCount: Number(data.originalWordCount ?? 0),
        summaryWordCount: Number(data.summaryWordCount ?? 0),
        compressionRatio: Number(data.compressionRatio ?? 0),
        filename: data.filename || selectedFile.name,
      });
      success('Image analyzed and summarized successfully!');
    } catch (err: any) {
      error(err?.message || 'Failed to analyze image.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCopy = () => {
    if (!result) return;
    const keyPointsText = (result.keyPoints || []).map(p => `• ${p}`).join('\n');
    const content = `${result.title}\n\n${result.summary}${keyPointsText ? `\n\nKey Takeaways:\n${keyPointsText}` : ''}`;
    navigator.clipboard.writeText(content);
    setCopied(true);
    success('Copied to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadTxt = () => {
    if (!result) return;
    const baseName = (result.filename || 'image').replace(/\.[^.]+$/, '');
    const content = `${result.title}\n\nSUMMARY:\n${result.summary}\n\nEXTRACTED TEXT:\n${result.extractedText}`;
    downloadAsTxt(`${baseName}_summary`, content);
    success('Downloaded summary TXT');
  };

  const handleDownloadPdf = () => {
    if (!result) return;
    downloadAsPdf(
      result.title || 'Image Summary',
      result.summary || '',
      Array.isArray(result.keyPoints) ? result.keyPoints : [],
      Array.isArray(result.keywords) ? result.keywords : []
    );
    success('Downloaded PDF summary');
  };

  return (
    <div className="space-y-6">
      {/* Input Workspace Card */}
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-6">
        {/* Header & Mode Tabs */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-cyan-500 flex items-center justify-center text-white shadow-md shadow-indigo-500/20">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                Image &amp; Camera Intelligence
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Upload a photo or snap notes, slides, pages, or diagrams with your camera
              </p>
            </div>
          </div>

          <div className="flex rounded-xl bg-slate-100 dark:bg-slate-800 p-1 self-start sm:self-auto">
            <button
              type="button"
              onClick={() => handleSwitchMode('upload')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                mode === 'upload'
                  ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-cyan-400 shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <ImageIcon className="w-3.5 h-3.5" />
              <span>Upload Image</span>
            </button>
            <button
              type="button"
              onClick={() => handleSwitchMode('camera')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                mode === 'camera'
                  ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-cyan-400 shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <Camera className="w-3.5 h-3.5" />
              <span>Use Camera</span>
            </button>
          </div>
        </div>

        {/* Hidden File Inputs */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept="image/png,image/jpeg,image/webp,image/gif,image/*"
          className="hidden"
        />
        <input
          type="file"
          ref={cameraCaptureFallbackRef}
          onChange={handleFileChange}
          accept="image/*"
          capture="environment"
          className="hidden"
        />

        {/* Active Capture / Upload / Preview Area */}
        {!selectedFile ? (
          mode === 'upload' ? (
            <div
              onDragOver={e => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`p-8 sm:p-12 border-2 border-dashed rounded-2xl cursor-pointer transition-all text-center ${
                isDragging
                  ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/30 scale-[1.01]'
                  : 'border-slate-200 dark:border-slate-700/80 hover:border-indigo-400 bg-slate-50/50 dark:bg-slate-800/20'
              }`}
            >
              <div className="w-16 h-16 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200/50 dark:border-indigo-800/50 flex items-center justify-center text-indigo-600 dark:text-cyan-400 mx-auto mb-4 shadow-inner">
                <UploadCloud className="w-8 h-8" />
              </div>
              <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">
                Drag &amp; drop an image here, or{' '}
                <span className="text-indigo-600 dark:text-cyan-400 underline">browse files</span>
              </h3>
              <p className="mt-1.5 text-xs text-slate-400 max-w-md mx-auto">
                Supports PNG, JPG, WEBP, and GIF up to 15MB — lecture slides, book pages, handwritten notes, whiteboards, and diagrams.
              </p>

              <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={e => {
                    e.stopPropagation();
                    fileInputRef.current?.click();
                  }}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-sm transition-colors inline-flex items-center gap-1.5"
                >
                  <ImageIcon className="w-4 h-4" />
                  <span>Choose Image</span>
                </button>
                <button
                  type="button"
                  onClick={e => {
                    e.stopPropagation();
                    handleSwitchMode('camera');
                  }}
                  className="px-4 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 text-xs font-bold transition-colors inline-flex items-center gap-1.5"
                >
                  <Camera className="w-4 h-4 text-indigo-500 dark:text-cyan-400" />
                  <span>Open Camera</span>
                </button>
              </div>
            </div>
          ) : (
            /* Live Camera Viewfinder */
            <div className="max-w-2xl mx-auto space-y-4">
              {cameraError ? (
                <div className="p-6 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 text-center space-y-4">
                  <AlertCircle className="w-8 h-8 text-amber-500 mx-auto" />
                  <div className="space-y-1">
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                      Camera Unavailable
                    </h4>
                    <p className="text-xs text-slate-600 dark:text-slate-300 max-w-md mx-auto">
                      {cameraError}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center justify-center gap-2.5">
                    <button
                      type="button"
                      onClick={() => startCamera(facingMode)}
                      className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-colors inline-flex items-center gap-1.5"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Retry Camera</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => cameraCaptureFallbackRef.current?.click()}
                      className="px-4 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors inline-flex items-center gap-1.5"
                    >
                      <Camera className="w-3.5 h-3.5" />
                      <span>Device Camera Picker</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSwitchMode('upload')}
                      className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                    >
                      Upload Image Instead
                    </button>
                  </div>
                </div>
              ) : (
                <div className="relative rounded-2xl overflow-hidden bg-slate-950 border border-slate-800 aspect-video flex items-center justify-center shadow-inner">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className={`w-full h-full object-cover ${isCameraActive ? 'opacity-100' : 'opacity-0'}`}
                  />

                  {(!isCameraActive || isStartingCamera) && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-300 gap-3">
                      {isStartingCamera ? (
                        <>
                          <span className="w-7 h-7 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
                          <span className="text-xs font-medium">Starting camera viewfinder...</span>
                        </>
                      ) : (
                        <>
                          <Camera className="w-10 h-10 text-slate-500" />
                          <button
                            type="button"
                            onClick={() => startCamera(facingMode)}
                            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-colors"
                          >
                            Enable Camera Preview
                          </button>
                        </>
                      )}
                    </div>
                  )}

                  {/* Live Camera Controls Overlay */}
                  {isCameraActive && (
                    <div className="absolute bottom-4 inset-x-0 flex items-center justify-center gap-3 px-4">
                      <button
                        type="button"
                        onClick={handleToggleCameraFacing}
                        className="p-2.5 rounded-full bg-slate-900/75 hover:bg-slate-900 text-white backdrop-blur-md border border-white/15 transition-colors"
                        title="Switch Camera"
                      >
                        <SwitchCamera className="w-4 h-4" />
                      </button>

                      <button
                        type="button"
                        onClick={handleCapturePhoto}
                        className="px-5 py-2.5 rounded-full bg-white hover:bg-indigo-50 text-slate-900 font-bold text-xs shadow-lg flex items-center gap-2 transition-transform active:scale-95"
                      >
                        <span className="w-3 h-3 rounded-full bg-indigo-600 ring-2 ring-indigo-300" />
                        <span>Click / Capture Photo</span>
                      </button>

                      <button
                        type="button"
                        onClick={stopCameraStream}
                        className="p-2.5 rounded-full bg-slate-900/75 hover:bg-rose-600 text-white backdrop-blur-md border border-white/15 transition-colors"
                        title="Stop Camera"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              )}

              <div className="flex items-center justify-between text-[11px] text-slate-400 px-1">
                <span>Tip: Hold text or diagrams steady in good lighting for highest transcription accuracy.</span>
                <button
                  type="button"
                  onClick={() => cameraCaptureFallbackRef.current?.click()}
                  className="text-indigo-500 dark:text-cyan-400 hover:underline font-semibold shrink-0 ml-2"
                >
                  Native Camera App
                </button>
              </div>
            </div>
          )
        ) : (
          /* Selected Image Preview + Configuration */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Image Preview */}
            <div className="lg:col-span-5 space-y-3">
              <div className="relative rounded-2xl overflow-hidden bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 aspect-[4/3] flex items-center justify-center">
                {previewUrl && (
                  <img
                    src={previewUrl}
                    alt={selectedFile.name}
                    className="w-full h-full object-contain"
                  />
                )}
                <button
                  type="button"
                  onClick={handleResetImage}
                  className="absolute top-3 right-3 p-2 rounded-xl bg-slate-900/75 hover:bg-rose-600 text-white backdrop-blur-sm transition-colors"
                  title="Remove image"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 px-1">
                <span className="truncate font-medium text-slate-700 dark:text-slate-200 max-w-[65%]">
                  {selectedFile.name}
                </span>
                <span>{(selectedFile.size / 1024).toFixed(0)} KB</span>
              </div>
            </div>

            {/* Summary Controls */}
            <div className="lg:col-span-7 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                    Summary Length
                  </label>
                  <div className="grid grid-cols-3 gap-1.5 p-1 rounded-xl bg-slate-100 dark:bg-slate-800">
                    {(['short', 'medium', 'detailed'] as SummaryLength[]).map(l => (
                      <button
                        key={l}
                        type="button"
                        onClick={() => setLength(l)}
                        className={`py-1.5 rounded-lg text-xs font-semibold capitalize transition-all ${
                          length === l
                            ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-cyan-400 shadow-sm'
                            : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                        }`}
                      >
                        {l}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                    Output Style
                  </label>
                  <select
                    value={style}
                    onChange={e => setStyle(e.target.value as SummaryStyle)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="bullet_points">Structured Bullet Points</option>
                    <option value="executive">Executive Briefing</option>
                    <option value="paragraph">Cohesive Paragraphs</option>
                    <option value="simple">Simple / Plain English</option>
                    <option value="academic">Academic Analysis</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                  Focus Instruction <span className="text-slate-400 font-normal">(Optional)</span>
                </label>
                <input
                  type="text"
                  value={promptHint}
                  onChange={e => setPromptHint(e.target.value)}
                  placeholder="e.g., Extract equations, summarize table figures, or transcribe handwritten notes..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="pt-2 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={handleAnalyzeImage}
                  disabled={isProcessing}
                  className="px-6 py-3 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white font-bold text-sm shadow-lg shadow-indigo-500/25 disabled:opacity-50 transition-all flex items-center gap-2"
                >
                  {isProcessing ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Extracting &amp; Summarizing...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>Analyze &amp; Summarize Image</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleResetImage}
                  disabled={isProcessing}
                  className="px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold transition-colors flex items-center gap-1.5"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>{mode === 'camera' ? 'Retake Photo' : 'Choose Another'}</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Result Card */}
      {result && (
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-6 animate-in fade-in duration-300">
          {/* Result Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-indigo-600 dark:text-cyan-400 uppercase tracking-wider">
                  Visual Intelligence Brief
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  Vision OCR + Summary
                </span>
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mt-1">
                {result.title}
              </h3>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleCopy}
                className="p-2 rounded-xl text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                title="Copy Summary"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
              </button>
              <button
                type="button"
                onClick={handleDownloadTxt}
                className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold hover:bg-slate-200 transition-colors"
              >
                TXT
              </button>
              <button
                type="button"
                onClick={handleDownloadPdf}
                className="px-3 py-1.5 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 transition-colors flex items-center gap-1"
              >
                <Download className="w-3.5 h-3.5" />
                <span>PDF</span>
              </button>
            </div>
          </div>

          {/* Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 text-center">
            <div>
              <span className="text-[10px] uppercase text-slate-400 font-bold">Source</span>
              <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate mt-0.5">
                {result.filename}
              </p>
            </div>
            <div>
              <span className="text-[10px] uppercase text-slate-400 font-bold">Extracted Content</span>
              <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 mt-0.5">
                {Number(result.originalWordCount ?? 0).toLocaleString()} Words
              </p>
            </div>
            <div>
              <span className="text-[10px] uppercase text-slate-400 font-bold">Summary Size</span>
              <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 mt-0.5">
                {Number(result.summaryWordCount ?? 0).toLocaleString()} Words
              </p>
            </div>
            <div>
              <span className="text-[10px] uppercase text-slate-400 font-bold">Compression</span>
              <p className="text-xs font-bold text-emerald-500 mt-0.5">
                {Number(result.compressionRatio ?? 0)}% Reduced
              </p>
            </div>
          </div>

          {/* Executive Summary */}
          <div className="space-y-2.5">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              AI Summary
            </h4>
            <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 text-sm text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-wrap">
              {result.summary}
            </div>
          </div>

          {/* Extracted Text / Visual Transcript Toggle */}
          {result.extractedText && (
            <div className="space-y-2.5">
              <button
                type="button"
                onClick={() => setShowExtractedText(prev => !prev)}
                className="inline-flex items-center gap-2 text-xs font-bold text-indigo-600 dark:text-cyan-400 hover:underline"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>{showExtractedText ? 'Hide Extracted Text / Visual Transcript' : 'View Extracted Text / Visual Transcript'}</span>
              </button>

              {showExtractedText && (
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/70 dark:border-slate-700/60 text-xs text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-wrap max-h-64 overflow-y-auto">
                  {result.extractedText}
                </div>
              )}
            </div>
          )}

          {/* Key Points */}
          {result.keyPoints && result.keyPoints.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-indigo-600 dark:text-cyan-400 uppercase tracking-wider">
                Key Points Extracted
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {result.keyPoints.map((pt, i) => (
                  <div
                    key={i}
                    className="p-3.5 rounded-xl bg-white dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700/60 text-xs text-slate-700 dark:text-slate-200 flex items-start gap-2.5"
                  >
                    <CheckCircle className="w-4 h-4 text-cyan-500 shrink-0 mt-0.5" />
                    <span>{pt}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Keywords */}
          {result.keywords && result.keywords.length > 0 && (
            <div className="pt-2 flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold text-slate-400 mr-2">Tags:</span>
              {result.keywords.map((kw, i) => (
                <span
                  key={i}
                  className="text-xs font-medium px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                >
                  #{kw}
                </span>
              ))}
            </div>
          )}

          {/* Learning Handoffs */}
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-4">
            <span className="text-xs text-slate-400">Turn this image into study materials:</span>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => onNavigateToTab?.('notes-generator', result.extractedText || result.summary)}
                className="px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 text-xs font-bold hover:bg-emerald-100 transition-colors flex items-center gap-1.5"
              >
                <BookOpen className="w-4 h-4" />
                <span>Generate Notes</span>
              </button>
              <button
                type="button"
                onClick={() => onNavigateToTab?.('flashcards', result.extractedText || result.summary)}
                className="px-3 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 text-xs font-bold hover:bg-amber-100 transition-colors flex items-center gap-1.5"
              >
                <Layers className="w-4 h-4" />
                <span>Create Flashcards</span>
              </button>
              <button
                type="button"
                onClick={() => onNavigateToTab?.('quiz-generator', result.extractedText || result.summary)}
                className="px-3 py-1.5 rounded-xl bg-cyan-50 dark:bg-cyan-950/40 text-cyan-600 dark:text-cyan-400 text-xs font-bold hover:bg-cyan-100 transition-colors flex items-center gap-1.5"
              >
                <HelpCircle className="w-4 h-4" />
                <span>Take Quiz</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
