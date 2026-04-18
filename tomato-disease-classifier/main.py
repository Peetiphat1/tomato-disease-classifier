"""
==============================================================================
 Smart Tomato Disease Classification System — FastAPI Backend
 main.py
==============================================================================
 DUAL MODE:
   • MOCK MODE  — runs immediately, no PyTorch needed.
                  Simulates realistic AI predictions so your frontend works.
   • REAL MODE  — automatically activated when tomato_model.pth is present
                  and torch/torchvision are installed.

 Run:
   pip install fastapi uvicorn python-multipart pillow numpy
   uvicorn main:app --host 0.0.0.0 --port 8000 --reload

 To upgrade to real inference later:
   pip install torch torchvision --index-url https://download.pytorch.org/whl/cpu
   (model file tomato_model.pth must be in the same directory)

 Endpoints:
   GET  /          → health check + mode indicator
   GET  /classes   → list all class names
   POST /predict   → upload an image, returns disease + confidence
==============================================================================
"""

from __future__ import annotations

import io
import logging
import os
import random
import sqlite3
import time
import uuid
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Annotated, Any

import numpy as np
from fastapi import FastAPI, File, Form, HTTPException, UploadFile, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from PIL import Image
from pydantic import BaseModel

# ── Try importing PyTorch (optional) ─────────────────────────────────────────
try:
    import torch
    import torch.nn as nn
    from torchvision import models, transforms
    TORCH_AVAILABLE = True
except ImportError:
    TORCH_AVAILABLE = False

# ===========================================================================
# 1. LOGGING
# ===========================================================================
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s — %(message)s",
)
logger = logging.getLogger("tomato_api")

# ===========================================================================
# 2. CONSTANTS
# ===========================================================================
MODEL_PATH = Path("tomato_model.pth")

CLASS_NAMES: list[str] = [
    "Bacterial Spot",
    "Early Blight",
    "Healthy",
    "Late Blight",
    "Leaf Mold",
    "Septoria Leaf Spot",
    "Spider Mites",
    "Target Spot",
    "Tomato Mosaic Virus",
    "Yellow Leaf Curl Virus",
]
NUM_CLASSES   = len(CLASS_NAMES)
IMAGE_SIZE    = 300
ALLOWED_TYPES = {"image/jpeg", "image/jpg", "image/png", "image/webp"}
MAX_BYTES     = 10 * 1024 * 1024   # 10 MB

# ===========================================================================
# 3. DEVICE (only relevant in real mode)
# ===========================================================================
if TORCH_AVAILABLE:
    DEVICE = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    logger.info("PyTorch available — device: %s", DEVICE)
else:
    DEVICE = None
    logger.warning("PyTorch NOT installed — running in MOCK MODE.")

# ===========================================================================
# 4. PREPROCESSING PIPELINE (real mode only)
# ===========================================================================
if TORCH_AVAILABLE:
    preprocess = transforms.Compose([
        transforms.Resize((IMAGE_SIZE, IMAGE_SIZE)),
        transforms.ToTensor(),
        transforms.Normalize(
            mean=[0.485, 0.456, 0.406],
            std=[0.229, 0.224, 0.225],
        ),
    ])

# ===========================================================================
# 5. MODEL BUILDER (real mode only)
# ===========================================================================
def build_model() -> Any:
    net = models.efficientnet_b3(weights=None)
    in_features = net.classifier[1].in_features
    net.classifier = nn.Sequential(
        nn.BatchNorm1d(in_features),
        nn.Dropout(p=0.2, inplace=True),
        nn.Linear(in_features, NUM_CLASSES),
    )
    return net


def load_torch_model() -> Any:
    """Load and return the PyTorch model, or None if unavailable."""
    if not TORCH_AVAILABLE:
        return None

    if not MODEL_PATH.exists():
        logger.warning(
            "Model file '%s' not found — running in MOCK MODE.", MODEL_PATH
        )
        return None

    net = build_model()
    checkpoint = torch.load(MODEL_PATH, map_location=DEVICE)

    if isinstance(checkpoint, dict) and "state_dict" in checkpoint:
        net.load_state_dict(checkpoint["state_dict"])
    elif isinstance(checkpoint, dict) and "model_state_dict" in checkpoint:
        net.load_state_dict(checkpoint["model_state_dict"])
    elif isinstance(checkpoint, dict):
        net.load_state_dict(checkpoint)
    else:
        net = checkpoint

    net.to(DEVICE)
    net.eval()
    logger.info("✅  Real PyTorch model loaded on %s.", DEVICE)
    return net

# ===========================================================================
# 6. MOCK PREDICTOR
#    Returns a realistic-looking probability distribution using a Dirichlet
#    sample so the confidence varies naturally between requests.
# ===========================================================================
def mock_predict(image: Image.Image) -> np.ndarray:
    """
    Simulate a softmax probability vector for demonstration.
    One class gets a dominant probability (73–96%), the rest share the remainder.
    This mirrors the shape of real EfficientNet outputs.
    """
    # Use image pixel statistics to seed — same image → same result
    arr = np.array(image.resize((32, 32))).astype(np.float32)
    seed = int(arr.mean() * 1000 + arr.std() * 100) % (2**31)
    rng  = np.random.default_rng(seed)

    # Pick a "winner" class
    winner = rng.integers(0, NUM_CLASSES)

    # Dominant probability for the winner
    winner_prob = rng.uniform(0.73, 0.97)

    # Distribute the rest among other classes via Dirichlet
    rest = rng.dirichlet(np.ones(NUM_CLASSES - 1)) * (1.0 - winner_prob)

    probs = np.empty(NUM_CLASSES)
    rest_idx = [i for i in range(NUM_CLASSES) if i != winner]
    for i, idx in enumerate(rest_idx):
        probs[idx] = rest[i]
    probs[winner] = winner_prob

    return probs.astype(np.float32)

# ===========================================================================
# 7. APPLICATION LIFESPAN — load model once at startup
# ===========================================================================
ml_model: Any = None
IS_MOCK: bool = True


@asynccontextmanager
async def lifespan(app: FastAPI):
    global ml_model, IS_MOCK
    logger.info("Startup — attempting to load model…")
    ml_model = load_torch_model()
    IS_MOCK   = ml_model is None

    if IS_MOCK:
        logger.warning(
            "⚠️  MOCK MODE active — responses are simulated. "
            "Install torch + torchvision and add tomato_model.pth to enable real inference."
        )
    else:
        logger.info("✅  REAL MODE active — using tomato_model.pth.")

    yield

    ml_model = None
    logger.info("Shutdown complete.")

# ===========================================================================
# 7.5. DATABASE AND FILE STORAGE SETUP
# ===========================================================================
UPLOADS_DIR = Path("uploads")
UPLOADS_DIR.mkdir(parents=True, exist_ok=True)

DB_PATH = "scans_history.db"

def init_db():
    with sqlite3.connect(DB_PATH) as conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS history (
                id TEXT PRIMARY KEY,
                timestamp REAL,
                disease TEXT,
                confidence REAL,
                image_filename TEXT
            )
        """)
        conn.commit()

init_db()

# ===========================================================================
# 8. FASTAPI APP
# ===========================================================================
app = FastAPI(
    title="Smart Tomato Disease Classification API",
    description=(
        "Upload a tomato leaf image for AI-powered disease diagnosis. "
        "EfficientNet-B0 fine-tuned on 10 tomato disease classes."
    ),
    version="1.0.0",
    lifespan=lifespan,
)

# ===========================================================================
# 9. CORS & STATIC FILES — allow all origins for local Next.js dev server
# ===========================================================================
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

# ===========================================================================
# 10. PYDANTIC SCHEMAS
# ===========================================================================
class PredictionResponse(BaseModel):
    disease:        str
    confidence:     float               # percentage, 0–100
    class_index:    int
    all_scores:     dict[str, float]    # every class with its probability %
    mode:           str                 # "real" | "mock"
    image_filename: str

class HistoryItem(BaseModel):
    id:             str
    timestamp:      float
    disease:        str
    confidence:     float
    image_filename: str

class HealthResponse(BaseModel):
    status:       str
    mode:         str
    model_loaded: bool
    torch:        bool
    device:       str

class ClassesResponse(BaseModel):
    classes: list[str]

# ===========================================================================
# 11. HELPERS
# ===========================================================================
def decode_image(data: bytes) -> Image.Image:
    try:
        return Image.open(io.BytesIO(data)).convert("RGB")
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Could not decode image: {exc}",
        ) from exc


def run_inference(image: Image.Image) -> np.ndarray:
    """Run real or mock inference and return a probability array."""
    if not IS_MOCK and ml_model is not None:
        # ── Real PyTorch inference ────────────────────────────────────────
        tensor = preprocess(image).unsqueeze(0).to(DEVICE)   # (1,3,224,224)
        with torch.no_grad():
            logits = ml_model(tensor)                        # (1, 10)
            probs  = torch.softmax(logits, dim=1).squeeze()  # (10,)
        return probs.cpu().numpy()
    else:
        # ── Mock inference ────────────────────────────────────────────────
        return mock_predict(image)

# ===========================================================================
# 12. ENDPOINTS
# ===========================================================================
@app.get("/", response_model=HealthResponse, tags=["Health"])
def health_check() -> HealthResponse:
    """Health check — shows current mode (real vs mock)."""
    return HealthResponse(
        status="ok",
        mode="mock" if IS_MOCK else "real",
        model_loaded=ml_model is not None,
        torch=TORCH_AVAILABLE,
        device=str(DEVICE) if DEVICE else "n/a",
    )


@app.get("/classes", response_model=ClassesResponse, tags=["Info"])
def get_classes() -> ClassesResponse:
    """Return the list of all 10 target class names."""
    return ClassesResponse(classes=CLASS_NAMES)


@app.post(
    "/predict",
    response_model=PredictionResponse,
    status_code=status.HTTP_200_OK,
    summary="Classify a tomato leaf image",
    tags=["Prediction"],
)
async def predict(
    file: Annotated[
        UploadFile,
        File(description="A JPG, PNG, or WebP photo of a tomato leaf"),
    ]
) -> PredictionResponse:
    """
    Upload a tomato leaf image and receive a disease diagnosis.

    Returns the top-1 disease, confidence %, and softmax scores
    for all 10 classes.
    """

    # ── Validate content type ─────────────────────────────────────────────
    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail=(
                f"Unsupported type '{file.content_type}'. "
                f"Allowed: {', '.join(sorted(ALLOWED_TYPES))}"
            ),
        )

    # ── Read bytes & check size ───────────────────────────────────────────
    raw = await file.read()
    if len(raw) > MAX_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File exceeds the {MAX_BYTES // (1024*1024)} MB limit.",
        )

    # ── Decode image ─────────────────────────────────────────────────────
    image = decode_image(raw)
    
    # ── Save image permanently ───────────────────────────────────────────
    extension = file.content_type.split("/")[-1]
    filename = f"{uuid.uuid4().hex}.{extension}"
    filepath = UPLOADS_DIR / filename
    with open(filepath, "wb") as f:
        f.write(raw)

    logger.info(
        "Received '%s' | %s | type=%s | %d bytes | mode=%s | saved=%s",
        file.filename, image.size, file.content_type, len(raw),
        "mock" if IS_MOCK else "real", filename
    )

    # ── Inference ──────────────────────────────────────────────────────────
    probs: np.ndarray = run_inference(image)    # shape: (10,)

    class_index = int(np.argmax(probs))
    confidence  = round(float(probs[class_index]) * 100, 2)
    disease     = CLASS_NAMES[class_index]

    all_scores = {
        CLASS_NAMES[i]: round(float(probs[i]) * 100, 2)
        for i in range(NUM_CLASSES)
    }

    logger.info(
        "→ '%s' | %.2f%% confidence | file='%s'",
        disease, confidence, file.filename,
    )

    return PredictionResponse(
        disease=disease,
        confidence=confidence,
        class_index=class_index,
        all_scores=all_scores,
        mode="mock" if IS_MOCK else "real",
        image_filename=filename,
    )

@app.post("/history", status_code=status.HTTP_201_CREATED, tags=["History"])
def save_history(
    disease: Annotated[str, Form()],
    confidence: Annotated[float, Form()],
    image_filename: Annotated[str, Form()]
):
    """Save an analyzed image permanently into the database."""
    record_id = uuid.uuid4().hex
    timestamp = time.time() * 1000  # JS timestamp

    with sqlite3.connect(DB_PATH) as conn:
        conn.execute(
            "INSERT INTO history (id, timestamp, disease, confidence, image_filename) VALUES (?, ?, ?, ?, ?)",
            (record_id, timestamp, disease, confidence, image_filename)
        )
        conn.commit()
    
    return {"status": "success", "id": record_id}

@app.get("/history", response_model=list[HistoryItem], tags=["History"])
def get_history():
    """Fetch all historical scans ordered by newest first."""
    with sqlite3.connect(DB_PATH) as conn:
        conn.row_factory = sqlite3.Row
        cursor = conn.execute("SELECT * FROM history ORDER BY timestamp DESC LIMIT 50")
        rows = cursor.fetchall()
        
    return [dict(row) for row in rows]
