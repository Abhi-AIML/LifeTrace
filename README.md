# LifeTrace — Behavioral Health Intelligence

### Gen AI Academy APAC Edition · Healthcare & Community Well-being Track

---

## 📖 Introduction & Concept

**LifeTrace** is a conversational AI that interviews users about their life history — not their symptoms — and surfaces the invisible behavioral patterns that predict future health outcomes.

Most health technology is reactive: users enter physical symptoms and receive a medical diagnosis or report. LifeTrace works in the opposite direction, from the premise that *how you've lived* is a better predictor of your health than any single clinical biomarker. Stress history, relationship patterns, life transitions, sleep rhythms, coping styles — these are the real upstream health signals. LifeTrace finds the thread connecting them.

**Tagline:** *"Your past is already telling your future. We just translate it."*

---

## 🔬 The Science Behind LifeTrace

LifeTrace is grounded in established medical and behavioral research:

1. **The ACE Study (Kaiser Permanente / CDC):** Adverse Childhood Experiences and cumulative life stressors predict adult chronic disease with remarkable accuracy — more reliably than many clinical biomarkers.
2. **Behavioral Epidemiology:** Lifestyle patterns, social connection, and stress responses are primary determinants of long-term health outcomes.
3. **Psychoneuroimmunology:** Psychological states (such as chronic stress, isolation, and grief) directly alter immune function, inflammation markers, and disease susceptibility.

LifeTrace serves as the cognitive interface that unlocks this valuable historical data, which is usually locked inside people's personal stories and overlooked in typical clinic visits.

---

## 🌟 Key Features

### 1. Multi-Turn Conversational AI Interview
Organized as a narrative journey through **four chapters** of a user's life history:
*   **Chapter 1: Setting the scene** — Focuses on life structure, relocation, and major transitions.
*   **Chapter 2: The pressure** — Explores stress patterns, coping mechanisms, and baseline reactions.
*   **Chapter 3: Your body's language** — Examines somatic history, physical symptoms, and physical reactions to stress.
*   **Chapter 4: Connection** — Assesses social health, support networks, and community relationships.

### 2. Dual Voice Interaction (STT & TTS)
*   **Voice Input (Speech-to-Text):** Integrated with the browser's Web Speech API (`SpeechRecognition`). Includes a pulsing audio wave visualization while listening and automatically submits responses after speech pauses.
*   **Voice Output (Text-to-Speech):** Utilizes `SpeechSynthesis` to speak out the AI's prompts using high-quality English neural voices, with an on-screen mute/unmute control.

### 3. Dynamic Timeline Building
An animated transition screen that maps extracted lifetime milestones (transitions, health events, social circles) visually onto a chronological axis. Events are color-coded by category:
*   🟣 **Transitions** (career shifts, moving, marriages)
*   🟠 **Health signals** (burnout, fatigue, physical illness)
*   🟢 **Social events** (building community, relational milestones)
*   ⚪ **General events** (background/neutral landmarks)

### 4. Behavioral Health Fingerprint (Radar Chart)
Evaluates and displays six key behavioral health dimensions on a hexagonal radar chart:
1.  **Stress Resilience** — Recovery speed from intense pressures.
2.  **Social Connectivity** — Depth and reliability of relationships.
3.  **Somatic Awareness** — Attunement to body signals and stress registration.
4.  **Life Stability** — Consistency vs volatility in circumstances.
5.  **Recovery Capacity** — Pacing, sleep quality, and active rest cycles.
6.  **Transition Adaptability** — Navigation of major changes.

*Since every radar chart's area represents the user's specific answers, no two charts look identical — creating a unique personal **fingerprint**.*

### 5. Tailored Insights & Psychology-Matched Interventions
*   **Surfaced Patterns:** Highlights specific behavioral tendencies with confidence badges ("Strong signal" or "Emerging pattern").
*   **Actionable Interventions:** Tailored recommendations that match the user's psychological coping profile (e.g., if a user avoids asking for help, the AI generates low-friction approaches rather than generic advice).

### 6. Community Health Intelligence Pitch
Demonstrates the aggregation of anonymous behavioral patterns at a community level, enabling public health systems to detect early warning signals without exposing private medical records.

---

## 🏗️ Technical Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     FRONTEND                             │
│  HTML5 + Vanilla CSS3 + Modern JavaScript (SPA)         │
│  - SpeechRecognition (STT) & SpeechSynthesis (TTS)      │
│  - Dynamic Radar Chart (Custom SVG implementation)     │
│  - Animated Canvas Timeline Node Renderer               │
└──────────────────────┬──────────────────────────────────┘
                       │ REST API calls (JSON)
┌──────────────────────▼──────────────────────────────────┐
│                  BACKEND (Cloud Run)                    │
│  Flask (Python 3.11)                                    │
│  - Session Orchestration                                │
│  - Vector Embedding Generator (Vertex AI Embeddings)    │
│  - Multi-turn Conversational Engine (Gemini Flash)  │
└──────────────────────┬──────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────┐
│               DATA LAYER & DATABASES                     │
│  - AlloyDB (pgvector)      → Semantic user response RAG │
│  - Google Cloud Firestore  → Session persistence        │
└─────────────────────────────────────────────────────────┘
```

### Stack Components
*   **AI Models:** `gemini-2.0-flash` (primary chat and insights generation), `gemini-2.0-flash-lite` (backup model), and Vertex AI `gemini-embedding-2` (vector embedding).
*   **Database:** **Firestore** for session and answer states, **AlloyDB with pgvector** for RAG vector search.
*   **Backend:** **Flask** API server.
*   **Frontend:** Single Page Application built on semantic HTML, pure CSS (cinematic dark mode), and Vanilla JavaScript.
*   **Deployment:** Ready for **Google Cloud Run** and containerized deployment.

### 🔌 Resilient Local Fallbacks (Zero-Configuration Mode)
The application includes robust, built-in memory and mock fallbacks designed to ensure the system remains fully operational locally even without active cloud APIs or keys:
1.  **Vector Store Fallback:** Uses an in-memory database combined with a deterministic NumPy cosine similarity calculator.
2.  **Session Database Fallback:** Automatically reverts to an in-memory session manager if Firestore client initialization fails.
3.  **LLM Fallback Engine:** If no `GEMINI_API_KEY` is provided, a conversational fallback loop takes over. It manages greetings, maps responses to the 4 chapters, processes 12 interview questions dynamically, and feeds custom analysis data back into the frontend dashboard.

---

## 📁 Repository Structure

```
.
├── Dockerfile                  # Container build config
├── docker-compose.yml          # Local container orchestration
├── lifetrace-build-plan.md     # Original build guidelines
├── package.json                # Node/npm commands for local dev script
├── requirements.txt            # Python dependencies
├── .env.example                # Sample environment file
├── public/                     # Frontend client codebase
│   ├── index.html              # Main web portal
│   ├── app.js                  # Frontend interface controllers, STT, TTS, SVGs
│   └── style.css               # Cinematic CSS styling variables and keyframes
└── server/                     # Python backend codebase
    ├── app.py                  # API server entrypoint (Flask)
    ├── config.py               # Environment configuration loader
    ├── prompts/                # Prompt templates for Gemini
    │   ├── insight.py          # Structured analysis generator prompt
    │   └── interview.py        # Interview conversational agent system instructions
    └── services/
        ├── gemini.py           # Model connections and fallback wrappers
        ├── store.py            # Firestore and local memory persistence
        └── vector.py           # AlloyDB pgvector and NumPy embedding search
```

---

## ⚙️ Environment Configuration

To run the application, configure your credentials by copying `.env.example` to `.env`:

```bash
cp .env.example .env
```

Open `.env` and fill in the following variables:

```ini
# Gemini API Key (Required for live AI models)
GEMINI_API_KEY=your_gemini_api_key_here

# Flask Server Port
PORT=8080
FLASK_ENV=development # Set to production in cloud environment

# Google Cloud Firestore Configuration (Leave blank to use In-Memory fallback)
GOOGLE_CLOUD_PROJECT=your_google_cloud_project_id
FIRESTORE_DATABASE_ID=(default)

# AlloyDB credentials (Leave blank to use local memory fallback)
ALLOYDB_INSTANCE_CONNECTION_NAME=projects/YOUR_PROJECT/locations/YOUR_REGION/clusters/YOUR_CLUSTER/instances/YOUR_INSTANCE
ALLOYDB_DB=lifetrace
ALLOYDB_USER=postgres
ALLOYDB_PASS=your_alloydb_password
```

---

## 🚀 How to Run the Project

### Method 1: Local Development
Ensure you have Python 3.11+ installed.

1.  **Set up Virtual Environment:**
    ```bash
    python -m venv venv
    # On Windows:
    .\venv\Scripts\activate
    # On macOS/Linux:
    source venv/bin/activate
    ```
2.  **Install Dependencies:**
    ```bash
    pip install -r requirements.txt
    ```
3.  **Run Dev Server:**
    ```bash
    npm run dev
    # OR
    python server/app.py
    ```
4.  Open `http://localhost:8080` in your web browser.

---

### Method 2: Docker Compose (Local Container)
For a isolated environment run:

```bash
docker-compose up --build
```
This mounts local directories for immediate updates and exposes the application on `http://localhost:8080`.

---

### Method 3: Cloud Run Deployment
You can package the image and deploy it directly to Google Cloud Run:

```bash
gcloud run deploy lifetrace \
  --source . \
  --platform managed \
  --region your-gcp-region \
  --allow-unauthenticated
```

Ensure to configure environment variables for `GEMINI_API_KEY`, `GOOGLE_CLOUD_PROJECT`, and connection parameters for Firestore and AlloyDB in the Cloud Run service console.

---

## 🤖 RAG & Prompt Pipelines

### Conversational Prompt (`server/prompts/interview.py`)
Instructs Gemini to adopt a "wise doctor" persona, asking exactly one question at a time and tracking the user's progress through the 4 life chapters. It appends the hidden trigger token `[INTERVIEW_COMPLETE]` once the criteria (minimum 10 responses spanning all chapters) are met.

### Analysis & Insight Engine Prompt (`server/prompts/insight.py`)
Compiles the interview history alongside context returned from the Vector Database. It orders the model to output a strict, valid JSON format scoring the fingerprint dimensions, extracting timeline nodes, compiling confidence-based insights, and proposing tailored lifestyle recommendations.

---

## 🔒 Responsible AI & Privacy

*   **Focus on Patterns:** LifeTrace strictly frames its output around behavioral patterns, tendencies, and signals, deliberately avoiding diagnostic or clinical terminology.
*   **Privacy First:** All personal trace information can be deleted by refreshing or restarting the application.
*   **Transparent Reasoning:** Every insight generated explicitly references the user's input, preventing arbitrary hallucinations.
*   **Zero Forced Collection:** The frontend and backend run entirely on fallbacks when cloud database hooks are unavailable, keeping user data local.

---

_Built for the Gen AI Academy APAC Edition Hackathon — Healthcare & Community Well-being Track_
