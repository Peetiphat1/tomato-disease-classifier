"use client";

import { useState, useRef, useCallback, useEffect } from "react";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------
const API_URL = "http://localhost:8000/predict";
const MAX_FILE_SIZE_MB = 10;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
const ACCEPTED_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface PredictionResult {
  disease: string;
  confidence: number;
  class_index: number;
  all_scores: Record<string, number>;
  mode: "real" | "mock";
  image_filename: string;
}

interface SelectedImage {
  file: File;
  url: string;
}

interface HistoryItem {
  id: string;
  timestamp: number;
  disease: string;
  confidence: number;
  image_filename: string;
}

// ---------------------------------------------------------------------------
// Disease metadata
// ---------------------------------------------------------------------------
const DISEASE_META: Record<
  string,
  { severity: "healthy" | "low" | "moderate" | "high" | "critical"; treatments: string[] }
> = {
  Healthy: {
    severity: "healthy",
    treatments: [
      "Maintain a consistent watering schedule; keep soil moist but not waterlogged.",
      "Apply a balanced fertilizer monthly.",
      "Ensure plants have adequate sunlight (6-8 hours/day)."
    ]
  },
  "Bacterial Spot": {
    severity: "high",
    treatments: [
      "Apply copper-based bactericide immediately.",
      "Remove and destroy heavily infected leaves.",
      "Avoid overhead irrigation to keep foliage dry."
    ]
  },
  "Early Blight": {
    severity: "moderate",
    treatments: [
      "Apply chlorothalonil or copper-based fungicide.",
      "Remove affected lower leaves.",
      "Improve air circulation by staking."
    ]
  },
  "Late Blight": {
    severity: "critical",
    treatments: [
      "URGENT: Apply metalaxyl-M or mancozeb based fungicide.",
      "Remove and destroy entirely infected plants to prevent extreme spread.",
      "Do not compost infected material."
    ]
  },
  "Leaf Mold": {
    severity: "moderate",
    treatments: [
      "Increase row spacing and prune lower leaves for ventilation.",
      "Reduce humidity in greenhouses.",
      "Apply chlorothalonil fungicidal sprays."
    ]
  },
  "Septoria Leaf Spot": {
    severity: "moderate",
    treatments: [
      "Apply protective mancozeb or chlorothalonil fungicides.",
      "Mulch soil to prevent upward splashing of spores.",
      "Water at the base of the plant only."
    ]
  },
  "Spider Mites": {
    severity: "low",
    treatments: [
      "Use insecticidal soap or horticultural oils (e.g., neem oil).",
      "Release predatory mites (Phytoseiulus persimilis) if in greenhouse.",
      "Increase ambient humidity and spray water to clear dust."
    ]
  },
  "Target Spot": {
    severity: "moderate",
    treatments: [
      "Improve ventilation and plant spacing.",
      "Prune lower leaves to speed up drying.",
      "Apply azoxystrobin or chlorothalonil fungicides."
    ]
  },
  "Tomato Mosaic Virus": {
    severity: "high",
    treatments: [
      "No chemical cure exists for viruses.",
      "Immediately uproot and burn infected plants.",
      "Disinfect all gardening tools in 10% bleach solution.",
      "Wash hands properly before handling other plants."
    ]
  },
  "Yellow Leaf Curl Virus": {
    severity: "high",
    treatments: [
      "Uproot and destroy infected plants to stop the virus spread.",
      "Control the silverleaf whitefly vector using imidacloprid.",
      "Use reflective mulches to repel whiteflies."
    ]
  }
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
// Helpers removed because fileToBase64 is no longer needed

export default function TomatoClassifier() {
  // ── State ────────────────────────────────────────────────────────────────
  const [selectedImage, setSelectedImage] = useState<SelectedImage | null>(null);
  const [isDragging, setIsDragging]       = useState(false);
  const [isLoading, setIsLoading]         = useState(false);
  const [result, setResult]               = useState<PredictionResult | null>(null);
  const [history, setHistory]             = useState<HistoryItem[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Load History on Mount ────────────────────────────────────────────────
  const fetchHistory = async () => {
    try {
      const res = await fetch("http://localhost:8000/history");
      if (res.ok) {
        setHistory(await res.json());
      }
    } catch (e) {
      console.error("Failed to load history from backend", e);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  // ── Image selection ──────────────────────────────────────────────────────
  const handleFileSelect = (file: File) => {
    if (!ACCEPTED_TYPES.includes(file.type)) {
      alert("Invalid file type. Please upload a JPG, PNG, or WebP image.");
      return;
    }
    if (file.size > MAX_FILE_SIZE_BYTES) {
      alert(`File too large. Maximum size is ${MAX_FILE_SIZE_MB} MB.`);
      return;
    }

    setResult(null);
    if (selectedImage?.url) URL.revokeObjectURL(selectedImage.url);
    setSelectedImage({ file, url: URL.createObjectURL(file) });

    // Auto-scroll to detect button area
    setTimeout(() => {
      document.getElementById("btn-detect")?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 100);
  };

  // ── Drag & drop ──────────────────────────────────────────────────────────
  const onDragOver  = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); };
  const onDragLeave = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(false); };
  const onDrop      = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFileSelect(file);
  };

  const onFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileSelect(file);
    e.target.value = "";
  };

  // ── Analyze ──────────────────────────────────────────────────────────────
  const handleAnalyze = async () => {
    if (!selectedImage || isLoading) return;
    setIsLoading(true);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append("file", selectedImage.file);

      const res = await fetch(API_URL, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData?.detail || `Server error: ${res.status}`);
      }

      const data: PredictionResult = await res.json();
      setResult(data);

      try {
        const historyFormData = new FormData();
        historyFormData.append("disease", data.disease);
        historyFormData.append("confidence", data.confidence.toString());
        historyFormData.append("image_filename", data.image_filename);

        await fetch("http://localhost:8000/history", {
          method: "POST",
          body: historyFormData,
        });

        // Refresh the gallery without disturbing UI flow
        fetchHistory(); 
      } catch (e) {
        console.error("Auto-save to history failed", e);
      }

      setTimeout(() => {
        document.getElementById("result-section")?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 100);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      alert(
        msg.includes("Failed to fetch")
          ? "Cannot reach the API server. Make sure the FastAPI backend is running on port 8000."
          : msg
      );
    } finally {
      setIsLoading(false);
    }
  };



  const newScan = () => {
    if (selectedImage?.url) URL.revokeObjectURL(selectedImage.url);
    setSelectedImage(null);
    setResult(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // ── Analytics Computation ────────────────────────────────────────────────
  const totalScans = history.length;
  const healthyScans = history.filter(h => h.disease === "Healthy").length;
  const diseaseScans = totalScans - healthyScans;
  const healthRate = totalScans > 0 ? Math.round((healthyScans / totalScans) * 100) : 0;

  // Breakdown map
  const breakdownMap: Record<string, number> = {};
  history.forEach(h => {
    breakdownMap[h.disease] = (breakdownMap[h.disease] || 0) + 1;
  });
  const breakdownArr = Object.entries(breakdownMap).sort((a, b) => b[1] - a[1]);

  // ── Render Helpers ───────────────────────────────────────────────────────
  const meta = result ? (DISEASE_META[result.disease] ?? DISEASE_META["Bacterial Spot"]) : null;
  const isHealthy = result?.disease === "Healthy";
  const hasImage = !!selectedImage;
  const hasResult = !!result;

  return (
    <>
      {/* ===== NAV ===== */}
      <header className="nav-bar" id="main-nav">
        <div className="nav-inner">
          <a href="#" className="nav-logo" id="logo-link">
            <span className="logo-icon">🌿</span>
            <span className="logo-text">AgrAI</span>
          </a>
          <nav className="nav-links" role="navigation" aria-label="Main navigation">
            <a href="#upload-section" className="nav-link active">
              <span className="material-icons-round">camera_enhance</span> Scan
            </a>
            <a href="#history-section" className="nav-link">
              <span className="material-icons-round">collections</span> Gallery
            </a>
            <a href="#analytics-section" className="nav-link">
              <span className="material-icons-round">bar_chart</span> Analytics
            </a>
            <a href="#consult-section" className="nav-link">
              <span className="material-icons-round">contact_support</span> Expert Consult
            </a>
          </nav>
        </div>
      </header>

      {/* ===== HERO ===== */}
      <section className="hero" id="hero-section">
        <div className="hero-content">
          <div className="hero-badge">
            <span className="material-icons-round">auto_awesome</span>
            AI-Powered Plant Diagnostics
          </div>
          <h1 className="hero-title">Tomato Leaf<br /><em>Disease Detection</em></h1>
          <p className="hero-sub">Identify your tomato plant problems instantly. Upload a clear photo of the affected leaf and our EfficientNet-B3 AI will diagnose it in seconds.</p>
          <div className="hero-stats">
            <div className="stat-pill">
              <span className="stat-val">
                {history.length > 0 
                  ? (history.reduce((sum, h) => sum + h.confidence, 0) / history.length).toFixed(1) + "%"
                  : "--"}
              </span>
              <span className="stat-label">Avg. Confidence</span>
            </div>
            <div className="stat-pill">
              <span className="stat-val">{totalScans}</span>
              <span className="stat-label">Total Scans</span>
            </div>
            <div className="stat-pill">
              <span className="stat-val">{Object.keys(breakdownMap).filter(k => k !== 'Healthy').length}</span>
              <span className="stat-label">Diseases Found</span>
            </div>
          </div>
        </div>
        <div className="hero-visual">
          <div className="hero-ring"></div>
          <div className="hero-ring ring-2"></div>
          <img src="/tomato_leaf.png" alt="Healthy tomato leaf studied by AI" className="hero-leaf" />
        </div>
      </section>

      {/* ===== MAIN ===== */}
      <main>
        {/* ===== UPLOAD SECTION ===== */}
        <section className="upload-section" id="upload-section">
          <div className="section-header">
            <h2 className="section-title">New Scan</h2>
            <p className="section-desc">Upload a clear, well-lit image of the affected leaf.</p>
          </div>

          <div className="upload-canvas">
            {/* Drop Zone */}
            <div
              className={`drop-zone ${isDragging ? "drag-over" : ""} ${hasImage ? "hidden" : ""}`}
              role="button"
              tabIndex={0}
              aria-label="Drop your leaf image here or click to browse"
              onClick={() => fileInputRef.current?.click()}
              onDragOver={onDragOver}
              onDragLeave={onDragLeave}
              onDrop={onDrop}
            >
              <input type="file" ref={fileInputRef} accept="image/jpeg,image/png,image/webp" hidden onChange={onFileInputChange} />
              
              <div className="dz-idle">
                <div className="dz-icon-wrap">
                  <span className="material-icons-round dz-icon">photo_camera</span>
                </div>
                <p className="dz-title">{isDragging ? "Drop here!" : "Drag & drop leaf image here"}</p>
                <p className="dz-hint">or <span className="dz-browse">click to browse</span></p>
                <p className="dz-formats">Supports JPG, PNG, WebP — up to {MAX_FILE_SIZE_MB}MB</p>
              </div>
            </div>

            {hasImage && !isLoading && !hasResult && (
              <div className="dz-preview">
                <img src={selectedImage?.url} alt="Uploaded leaf preview" className="preview-image" />
                <button className="btn-remove" aria-label="Remove image" onClick={newScan}>
                  <span className="material-icons-round">close</span>
                </button>
              </div>
            )}

            {/* Analysing State */}
            {isLoading && (
              <div className="analysing-state" aria-live="polite" aria-label="Analysing your leaf image">
                <div className="pulse-bar">
                  <div className="pulse-fill"></div>
                </div>
                <p className="analysing-label">Analysing leaf structure &amp; patterns with FastApi...</p>
              </div>
            )}

            {/* Detect Button */}
            {!isLoading && !hasResult && (
              <div className="action-row" style={{ justifyContent: "center", marginTop: "40px" }}>
                <button
                  className="btn-primary"
                  id="btn-detect"
                  disabled={!hasImage}
                  onClick={handleAnalyze}
                  aria-label="Run disease detection"
                >
                  <span className="material-icons-round">camera_enhance</span>
                  {hasImage ? "Detect Disease" : "Waiting for image..."}
                </button>
                <p className="action-note">{hasImage ? "Ready to analyze." : "Upload an image to begin analysis"}</p>
              </div>
            )}
          </div>
        </section>

        {/* ===== RESULT SECTION ===== */}
        {hasResult && meta && (
          <section className="result-section" id="result-section" aria-live="polite">
            <div className="result-header">
              <span className="result-status-icon material-icons-round">{isHealthy ? "spa" : "coronavirus"}</span>
              <div>
                <p className="result-eyebrow">
                  Diagnosis Complete 
                  {result.mode === "mock" && <span style={{ marginLeft: 8, background: '#e0e0e0', padding: '2px 6px', borderRadius: 4, color: '#666' }}>Mock Mode</span>}
                </p>
                <h2 className={`result-title ${isHealthy ? "" : "is-disease"}`}>{result.disease}</h2>
              </div>
            </div>

            <div className="result-grid">
              {/* Left: Image */}
              <div className="result-image-wrap">
                <img src={selectedImage!.url} alt="Analysed leaf" className="result-image" />
                <div className={`result-image-badge ${isHealthy ? "" : "is-disease"}`}>
                  <span className="material-icons-round">{isHealthy ? "eco" : "warning"}</span>
                  <span>{isHealthy ? "Healthy" : "Infected"}</span>
                </div>
              </div>

              {/* Right: Details */}
              <div className="result-details">
                <div className="detail-card confidence-card">
                  <p className="detail-label">Confidence</p>
                  <div className="confidence-bar-wrap">
                    <div
                      className="confidence-bar"
                      style={{
                        width: `${result.confidence}%`,
                        background: isHealthy ? undefined : "linear-gradient(90deg, #f59e0b 0%, #ba1a1a 100%)"
                      }}
                    ></div>
                  </div>
                  <p className="confidence-val" style={{ color: isHealthy ? '' : 'var(--tertiary)' }}>
                    {result.confidence.toFixed(1)}%
                  </p>
                </div>

                <div className="detail-card">
                  <p className="detail-label">
                    <span className="material-icons-round">science</span> Pathogen
                  </p>
                  <p className="detail-value">{result.disease === "Healthy" ? "None detected" : result.disease}</p>
                </div>

                <div className="detail-card">
                  <p className="detail-label">
                    <span className="material-icons-round">warning_amber</span> Severity
                  </p>
                  <div className="severity-dots">
                    <div className={`severity-dot ${['low', 'moderate', 'high', 'critical'].includes(meta.severity) ? 'active-low' : ''}`}></div>
                    <div className={`severity-dot ${['moderate', 'high', 'critical'].includes(meta.severity) ? 'active-medium' : ''}`}></div>
                    <div className={`severity-dot ${['high', 'critical'].includes(meta.severity) ? 'active-high' : ''}`}></div>
                    <div className={`severity-dot ${['critical'].includes(meta.severity) ? 'active-critical' : ''}`}></div>
                  </div>
                  <p style={{marginTop: 8, fontSize: '0.85rem', fontWeight: 600, textTransform: 'capitalize', color: 'var(--on-surface-variant)'}}>{meta.severity}</p>
                </div>

                <div className="detail-card treatment-card">
                  <p className="detail-label">
                    <span className="material-icons-round">healing</span> Recommended Treatment
                  </p>
                  <ul className="treatment-list">
                    {meta.treatments.map((t, idx) => (
                      <li key={idx}>{t}</li>
                    ))}
                  </ul>
                </div>

                {/* Actions */}
                <div className="action-row result-actions">
                  <button className="btn-primary" aria-label="Upload new image for another scan" onClick={newScan}>
                    <span className="material-icons-round">upload_file</span>
                    New Scan
                  </button>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* ===== HISTORY ===== */}
        <section className="history-section" id="history-section">
          <div className="section-header">
            <h2 className="section-title">Scan History</h2>
            <p className="section-desc">Your previous diagnoses are saved here.</p>
          </div>
          <div className="history-grid">
            {history.length === 0 ? (
              <div className="history-empty">
                <span className="material-icons-round">history</span>
                <p>No scans yet. Upload a leaf image to begin.</p>
              </div>
            ) : (
              history.map((h, i) => (
                <div key={h.id || i} className="history-card">
                  <img src={`http://localhost:8000/uploads/${h.image_filename}`} alt="Scan history" className="hc-image" />
                  <div className="hc-body">
                    <h4 className={`hc-disease ${h.disease === "Healthy" ? "is-healthy" : "is-disease"}`}>
                      {h.disease}
                    </h4>
                    <div className="hc-meta">
                      <span>{new Date(h.timestamp).toLocaleDateString()}</span>
                      <span className="hc-confidence">{h.confidence.toFixed(1)}%</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        {/* ===== ANALYTICS ===== */}
        <section className="analytics-section" id="analytics-section">
          <div className="section-header">
            <h2 className="section-title">Analytics</h2>
            <p className="section-desc">Overview of all your diagnosed plant health data.</p>
          </div>
          <div className="analytics-grid">
            <div className="analytics-card">
              <span className="material-icons-round analytics-icon">biotech</span>
              <span className="analytics-big">{totalScans}</span>
              <span className="analytics-sub">Total Scans</span>
            </div>
            <div className="analytics-card healthy-card">
              <span className="material-icons-round analytics-icon">eco</span>
              <span className="analytics-big">{healthyScans}</span>
              <span className="analytics-sub">Healthy Leaves</span>
            </div>
            <div className="analytics-card disease-card">
              <span className="material-icons-round analytics-icon">coronavirus</span>
              <span className="analytics-big">{diseaseScans}</span>
              <span className="analytics-sub">Diseases Found</span>
            </div>
            <div className="analytics-card">
              <span className="material-icons-round analytics-icon">percent</span>
              <span className="analytics-big">{healthRate}%</span>
              <span className="analytics-sub">Health Rate</span>
            </div>
          </div>
          
          {totalScans > 0 && (
            <div className="disease-breakdown">
              <h3 className="breakdown-title">Disease Breakdown</h3>
              <div>
                {breakdownArr.map(([name, count]) => {
                  const pct = Math.round((count / totalScans) * 100);
                  const isHealthyColor = name === "Healthy" ? "var(--secondary)" : "var(--tertiary)";
                  return (
                    <div key={name} style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 12 }}>
                      <span style={{ width: 140, fontSize: '0.9rem', color: 'var(--on-surface-variant)' }}>{name}</span>
                      <div style={{ flex: 1, height: 8, background: 'var(--surface-container-high)', borderRadius: 4, overflow: 'hidden' }}>
                        <div style={{ width: `${pct}%`, height: '100%', background: isHealthyColor }}></div>
                      </div>
                      <span style={{ fontSize: '0.85rem', fontWeight: 'bold' }}>{pct}%</span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </section>


      </main>

      {/* ===== FOOTER ===== */}
      <footer className="app-footer" style={{textAlign: 'center', padding: '40px', background: 'var(--surface-container)'}}>
        <p style={{fontSize: '0.875rem', color: 'var(--on-surface-variant)'}}>© 2026 AgrAI — Tomato Leaf Disease Detection. Built with ❤️ for farmers worldwide.</p>
      </footer>
    </>
  );
}
