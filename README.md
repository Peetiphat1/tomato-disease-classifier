# 🍅 AgrAI: Smart Tomato Disease Classifier

AgrAI is a full-stack, AI-powered application designed to instantly diagnose tomato plant diseases from leaf images. Built with a **PyTorch EfficientNet-B3** model, a **FastAPI** backend, and a modern **Next.js** gallery-style frontend, this system helps farmers and gardeners catch diseases early and receive tailored treatment plans.

## ✨ Features
*   **Real-time AI Inference:** Classifies images into 10 categories (9 diseases + 1 Healthy) using a custom PyTorch model.
*   **Dual-Mode Backend:** Automatically switches to a realistic "Mock Mode" if the PyTorch weights are missing, allowing UI development without heavy ML dependencies.
*   **SQLite Persistence:** Scans and inferences are permanently saved to a local SQL database alongside the uploaded images.
*   **Live Analytics Dashboard:** Automatically calculates overall crop health rate, disease breakdowns, and total scans.
*   **Agrarian Gallery UI:** A premium, responsive interface featuring drag-and-drop uploads and interactive treatment plans.

---

## 🚀 How to Run Locally

Because this project uses a separated frontend and backend architecture, you will need to run two terminal windows to boot the entire system up.

### Prerequisites
*   [Python 3.10+](https://www.python.org/downloads/)
*   [Node.js 18+](https://nodejs.org/en)

### 1. Start the FastAPI Backend
Open your first terminal and navigate to the project root directory.

```bash
# Install the required Python dependencies
pip install fastapi uvicorn python-multipart pillow numpy torch torchvision

# Run the FastAPI server natively with Uvicorn
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```
*Note: If you have the `tomato_model.pth` (EfficientNet-B3 weights) in your root folder, the API will boot in **REAL MODE**. Otherwise, it will safely fallback to **MOCK MODE**.*

The API will now be running on `http://localhost:8000`.

### 2. Start the Next.js Frontend
Open a second terminal window and navigate into the `frontend` folder.

```bash
# Move into the React application directory
cd frontend

# Install Node dependencies
npm install

# Start the Next.js development server
npm run dev -- --webpack
```
*Note: We include the `--webpack` flag to bypass native SWC compile issues on Windows systems.*

### 3. Use the App
Open your browser and navigate to:
**➡️ http://localhost:3000**

You can now upload a photo of a tomato leaf, receive your AI diagnosis, and watch your analytics dashboard populate!

---

## 🛠️ Tech Stack
*   **Machine Learning:** PyTorch, Torchvision (EfficientNet-B3)
*   **Backend:** Python, FastAPI, Uvicorn, SQLite3
*   **Frontend:** React, Next.js, HTML5, Custom CSS
*   **Storage:** Local disk `/uploads` dir + `.db` files

## 🦠 Supported Classes
*Healthy, Bacterial Spot, Early Blight, Late Blight, Leaf Mold, Septoria Leaf Spot, Spider Mites, Target Spot, Tomato Mosaic Virus, Yellow Leaf Curl Virus.*
