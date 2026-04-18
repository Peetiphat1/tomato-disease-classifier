"use client"; // Required for Next.js App Router

import { useState, useRef, useCallback } from "react";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const MAX_FILE_SIZE_MB = 5;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/jpg"];

// ---------------------------------------------------------------------------
// Mock AI response — replace simulateAnalysis() with a real fetch() call
// when your backend is ready.
// ---------------------------------------------------------------------------
const simulateAnalysis = () =>
  new Promise((resolve) =>
    setTimeout(
      () => resolve({ disease: "Bacterial Spot", confidence: 89 }),
      2000
    )
  );

// ---------------------------------------------------------------------------
// TomatoClassifier — main component
// ---------------------------------------------------------------------------
export default function TomatoClassifier() {
  // ── State ────────────────────────────────────────────────────────────────
  const [selectedImage, setSelectedImage] = useState(null); // { file, url }
  const [isDragging, setIsDragging]       = useState(false);
  const [isLoading, setIsLoading]         = useState(false);
  const [result, setResult]               = useState(null);  // { disease, confidence }
  const [error, setError]                 = useState("");

  // Hidden file input ref
  const fileInputRef = useRef(null);

  // ── Validation ───────────────────────────────────────────────────────────
  /**
   * Validates a File object.
   * Returns an error string, or "" if valid.
   */
  const validateFile = (file) => {
    if (!file) return "No file selected.";
    if (!ACCEPTED_TYPES.includes(file.type))
      return "Invalid file type. Please upload a JPG or PNG image.";
    if (file.size > MAX_FILE_SIZE_BYTES)
      return `File is too large. Maximum size is ${MAX_FILE_SIZE_MB} MB.`;
    return "";
  };

  // ── Image selection handler (shared by input + drop) ────────────────────
  const handleFileSelect = useCallback((file) => {
    const validationError = validateFile(file);

    if (validationError) {
      setError(validationError);
      return;
    }

    // Clear previous state
    setError("");
    setResult(null);

    // Generate object URL for preview
    const previewUrl = URL.createObjectURL(file);
    setSelectedImage({ file, url: previewUrl });
  }, []);

  // ── Drag-and-drop handlers ───────────────────────────────────────────────
  const onDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const onDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const onDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFileSelect(file);
  };

  // ── Click-to-browse ──────────────────────────────────────────────────────
  const onDropZoneClick = () => {
    if (!isLoading) fileInputRef.current?.click();
  };

  const onFileInputChange = (e) => {
    const file = e.target.files?.[0];
    if (file) handleFileSelect(file);
    // Reset so the same file can be re-selected
    e.target.value = "";
  };

  // ── Analyze handler (mock API call) ─────────────────────────────────────
  /**
   * Replace the call to simulateAnalysis() with your real API:
   *
   *   const formData = new FormData();
   *   formData.append("image", selectedImage.file);
   *   const res  = await fetch("/api/classify", { method: "POST", body: formData });
   *   const data = await res.json();
   *   setResult({ disease: data.disease, confidence: data.confidence });
   */
  const handleAnalyze = async () => {
    if (!selectedImage || isLoading) return;

    setIsLoading(true);
    setResult(null);
    setError("");

    try {
      const data = await simulateAnalysis();
      setResult(data);
    } catch (err) {
      setError("Analysis failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // ── Reset all state ──────────────────────────────────────────────────────
  const handleReset = () => {
    // Revoke the old object URL to free memory
    if (selectedImage?.url) URL.revokeObjectURL(selectedImage.url);

    setSelectedImage(null);
    setIsDragging(false);
    setIsLoading(false);
    setResult(null);
    setError("");
  };

  // ── Derived flags ────────────────────────────────────────────────────────
  const hasImage  = !!selectedImage;
  const hasResult = !!result;

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    /*
     * Page wrapper — full-height, light agricultural background
     * using a subtle warm-green tint.
     */
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-gray-50 flex items-center justify-center p-4 sm:p-8">

      {/* ── Card ── */}
      <div className="w-full max-w-2xl bg-white rounded-3xl shadow-xl shadow-green-100/60 overflow-hidden">

        {/* ── Header ── */}
        <div className="bg-gradient-to-r from-green-700 to-green-500 px-8 py-7 flex items-center gap-4">
          {/* Leaf icon */}
          <span className="text-4xl select-none" aria-hidden="true">🍅</span>
          <div>
            <h1 className="text-white text-2xl font-extrabold tracking-tight leading-tight">
              Smart Tomato Disease Classifier
            </h1>
            <p className="text-green-100 text-sm mt-0.5">
              Upload a leaf photo and let AI identify the disease instantly.
            </p>
          </div>
        </div>

        {/* ── Body ── */}
        <div className="px-8 py-8 space-y-6">

          {/* ── Hidden file input ── */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg, image/png"
            className="hidden"
            aria-hidden="true"
            onChange={onFileInputChange}
          />

          {/* ================================================================
              CONDITIONAL RENDERING BLOCK 1:
              Show drop-zone when no image is selected yet.
              ================================================================ */}
          {!hasImage && (
            /* ── Drag-and-drop zone ── */
            <div
              role="button"
              tabIndex={0}
              aria-label="Drag and drop a leaf image here, or click to browse"
              onClick={onDropZoneClick}
              onKeyDown={(e) => e.key === "Enter" && onDropZoneClick()}
              onDragOver={onDragOver}
              onDragLeave={onDragLeave}
              onDrop={onDrop}
              className={[
                // Base styles
                "relative flex flex-col items-center justify-center gap-3",
                "h-56 rounded-2xl border-2 border-dashed cursor-pointer",
                "transition-all duration-200 select-none",
                // Hover & drag-active styles
                isDragging
                  ? "border-green-500 bg-green-50 scale-[1.01]"
                  : "border-gray-300 bg-gray-50 hover:border-green-400 hover:bg-green-50/50",
              ].join(" ")}
            >
              {/* Upload icon */}
              <div
                className={`rounded-full p-4 transition-colors duration-200 ${
                  isDragging ? "bg-green-100" : "bg-white shadow-sm"
                }`}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="w-8 h-8 text-green-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.5}
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 16.5V9.75m0 0 3 3m-3-3-3 3M6.75 19.5a4.5 4.5 0 0 1-1.41-8.775 5.25 5.25 0 0 1 10.338-2.32 5.75 5.75 0 0 1 1.048 11.094"
                  />
                </svg>
              </div>

              <div className="text-center">
                <p className="text-gray-700 font-semibold text-sm">
                  {isDragging
                    ? "Drop it here!"
                    : "Drag & drop your leaf image"}
                </p>
                <p className="text-gray-400 text-xs mt-1">
                  or{" "}
                  <span className="text-green-600 font-semibold underline underline-offset-2">
                    click to browse
                  </span>
                </p>
                <p className="text-gray-300 text-xs mt-2">
                  JPG or PNG · Max {MAX_FILE_SIZE_MB} MB
                </p>
              </div>
            </div>
          )}

          {/* ================================================================
              CONDITIONAL RENDERING BLOCK 2:
              Show image preview once a file is selected.
              (Visible in selected, loading, AND result states.)
              ================================================================ */}
          {hasImage && (
            <div className="relative rounded-2xl overflow-hidden bg-gray-100 shadow-inner">
              {/* Preview image */}
              <img
                src={selectedImage.url}
                alt="Uploaded leaf preview"
                className="w-full max-h-72 object-contain block"
              />

              {/* ── Loading overlay ── */}
              {isLoading && (
                <div
                  aria-live="polite"
                  aria-label="AI is analyzing the image"
                  className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-white/80 backdrop-blur-sm"
                >
                  {/* Spinner */}
                  <svg
                    className="w-10 h-10 text-green-500 animate-spin"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                    />
                  </svg>
                  <p className="text-green-700 font-semibold text-sm tracking-wide animate-pulse">
                    AI is analyzing features…
                  </p>
                </div>
              )}
            </div>
          )}

          {/* ================================================================
              CONDITIONAL RENDERING BLOCK 3:
              Result block — disease name + confidence bar.
              ================================================================ */}
          {hasResult && !isLoading && (
            <div
              aria-live="polite"
              className="rounded-2xl border border-green-100 bg-green-50 px-6 py-5 space-y-4"
            >
              {/* Disease name */}
              <div className="flex items-start gap-3">
                <span
                  className="mt-0.5 flex-shrink-0 rounded-full bg-red-100 p-1.5"
                  aria-hidden="true"
                >
                  {/* Warning icon */}
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="w-5 h-5 text-red-500"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M9.401 3.003c1.155-2 4.043-2 5.197 0l7.355 12.748c1.154 1.999-.29 4.5-2.599 4.5H4.645c-2.309 0-3.752-2.5-2.598-4.5L9.4 3.003ZM12 8.25a.75.75 0 0 1 .75.75v3.75a.75.75 0 0 1-1.5 0V9a.75.75 0 0 1 .75-.75Zm0 8.25a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Z"
                      clipRule="evenodd"
                    />
                  </svg>
                </span>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-widest text-green-600 mb-0.5">
                    Diagnosis
                  </p>
                  <p className="text-gray-900 text-xl font-extrabold leading-tight">
                    Result:{" "}
                    <span className="text-red-600">{result.disease}</span>
                  </p>
                </div>
              </div>

              {/* Confidence bar */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-semibold text-gray-600">
                    Confidence
                  </span>
                  <span className="text-sm font-extrabold text-green-700">
                    {result.confidence}%
                  </span>
                </div>

                {/* Track */}
                <div
                  role="progressbar"
                  aria-valuenow={result.confidence}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label={`Confidence: ${result.confidence}%`}
                  className="w-full h-3 bg-gray-200 rounded-full overflow-hidden"
                >
                  {/* Fill — width driven by confidence value */}
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-green-400 to-green-600 transition-all duration-700 ease-out"
                    style={{ width: `${result.confidence}%` }}
                  />
                </div>
              </div>

              {/* Disclaimer */}
              <p className="text-xs text-gray-400 leading-relaxed">
                * Based on AI model confidence thresholds. Please consult an
                agronomist for critical decisions.
              </p>
            </div>
          )}

          {/* ================================================================
              ERROR MESSAGE
              ================================================================ */}
          {error && (
            <div
              role="alert"
              className="flex items-center gap-2 rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="w-4 h-4 flex-shrink-0"
                viewBox="0 0 20 20"
                fill="currentColor"
                aria-hidden="true"
              >
                <path
                  fillRule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0Zm-8-5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5Zm0 10a1 1 0 100-2 1 1 0 000 2Z"
                  clipRule="evenodd"
                />
              </svg>
              {error}
            </div>
          )}

          {/* ================================================================
              ACTION BUTTONS
              ================================================================ */}
          <div className="flex flex-col sm:flex-row gap-3">

            {/* ── Analyze Image button ──
                Shown only when image is selected and not yet in result state.
                Disabled during loading or when no image is present.        */}
            {hasImage && !hasResult && (
              <button
                type="button"
                onClick={handleAnalyze}
                disabled={isLoading}
                aria-label="Analyze the uploaded leaf image"
                className={[
                  "flex-1 flex items-center justify-center gap-2",
                  "rounded-2xl py-3.5 px-6 font-bold text-sm",
                  "transition-all duration-200",
                  isLoading
                    ? "bg-green-300 text-white cursor-not-allowed"
                    : "bg-green-600 text-white hover:bg-green-700 active:scale-[0.98] shadow-md shadow-green-200",
                ].join(" ")}
              >
                {isLoading ? (
                  <>
                    {/* Inline micro-spinner on button */}
                    <svg
                      className="w-4 h-4 animate-spin"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                      />
                    </svg>
                    Analyzing…
                  </>
                ) : (
                  <>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="w-4 h-4"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                      aria-hidden="true"
                    >
                      <path d="M11.47 2.47a.75.75 0 0 1 1.06 0l4.5 4.5a.75.75 0 0 1-1.06 1.06l-3.22-3.22V16.5a.75.75 0 0 1-1.5 0V4.81L8.03 8.03a.75.75 0 0 1-1.06-1.06l4.5-4.5ZM3 15.75a.75.75 0 0 1 .75.75v2.25a1.5 1.5 0 0 0 1.5 1.5h13.5a1.5 1.5 0 0 0 1.5-1.5V16.5a.75.75 0 0 1 1.5 0v2.25a3 3 0 0 1-3 3H5.25a3 3 0 0 1-3-3V16.5a.75.75 0 0 1 .75-.75Z" />
                    </svg>
                    Analyze Image
                  </>
                )}
              </button>
            )}

            {/* ── Upload New Image button ──
                Shown when an image is selected (in any sub-state).          */}
            {hasImage && (
              <button
                type="button"
                onClick={handleReset}
                disabled={isLoading}
                aria-label="Clear image and start over"
                className={[
                  "flex-1 sm:flex-none flex items-center justify-center gap-2",
                  "rounded-2xl py-3.5 px-6 font-bold text-sm border-2",
                  "transition-all duration-200",
                  isLoading
                    ? "border-gray-200 text-gray-300 cursor-not-allowed"
                    : "border-gray-300 text-gray-600 hover:border-green-400 hover:text-green-700 active:scale-[0.98]",
                ].join(" ")}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="w-4 h-4"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path
                    fillRule="evenodd"
                    d="M4.755 10.059a7.5 7.5 0 0 1 12.548-3.364l1.903 1.903h-3.183a.75.75 0 1 0 0 1.5h4.992a.75.75 0 0 0 .75-.75V4.356a.75.75 0 0 0-1.5 0v3.18l-1.9-1.9A9 9 0 0 0 3.306 9.67a.75.75 0 1 0 1.45.388Zm15.408 3.352a.75.75 0 0 0-.919.53 7.5 7.5 0 0 1-12.548 3.364l-1.902-1.903h3.183a.75.75 0 0 0 0-1.5H2.984a.75.75 0 0 0-.75.75v4.992a.75.75 0 0 0 1.5 0v-3.18l1.9 1.9a9 9 0 0 0 15.059-4.035.75.75 0 0 0-.53-.918Z"
                    clipRule="evenodd"
                  />
                </svg>
                Upload New Image
              </button>
            )}
          </div>
        </div>

        {/* ── Footer ── */}
        <div className="bg-gray-50 border-t border-gray-100 px-8 py-4 text-center">
          <p className="text-xs text-gray-400">
            🌿 AgrAI · Smart Tomato Disease Classification System · Powered by
            AI
          </p>
        </div>
      </div>
    </div>
  );
}
