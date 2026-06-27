# 🌿 Daily Mental Wellness Companion
> **Kaggle AI Agents Capstone Project — Agents for Good Track**
> A secure, privacy-first, multi-agent AI companion that guides users through daily mental health check-ins, extracts structured wellness metrics, and delivers personalized insights using Supabase and Gemini 2.5 Flash.

---

## 📖 Table of Contents
1. [Overview](#-overview)
2. [Problem Statement](#-problem-statement)
3. [System Architecture](#-system-architecture)
4. [Agent System (ADK Pattern)](#-agent-system-adk-pattern)
5. [Security & Crisis Intervention](#-security--crisis-intervention)
6. [MCP Server Integration](#-mcp-server-integration)
7. [CLI Interface](#-cli-interface)
8. [Setup & Installation](#-setup--installation)
9. [Docker Deployment](#-docker-deployment)

---

## 🌟 Overview
The **Daily Mental Wellness Companion** is designed to make mental health tracking effortless, engaging, and secure. Instead of filling out rigid forms, users have an empathetic conversation with an AI companion. 

Behind the scenes, a **4-agent pipeline** orchestrates the conversation, extracts clinical wellness markers (mood, energy, sleep hours, worried topics, and tags), logs them securely into a PostgreSQL database (via Supabase), and generates context-aware, personalized wellness nudges to improve everyday living.

---

## 🚨 Problem Statement
Traditional mental health tracking tools fail because:
1. **Friction:** Filling out numerical rating scales every day is tedious, leading to low retention.
2. **Lack of Context:** A simple "Mood: 3/10" does not capture *why* a user is feeling down.
3. **Privacy Concerns:** Mental health data is highly sensitive; cloud-based tracking must be secure and private.
4. **No Actionable Advice:** Existing tools record data but fail to provide personalized, non-intrusive wellness recommendations.

### The Solution:
An empathetic conversational interface that parses natural language into structured metrics, remembers context, protects user input, and uses historical analysis to offer personalized, healthy habits (nudges) without compromising data security.

---

## 📐 System Architecture

The following diagram illustrates how requests flow through the security middleware to the Multi-Agent Orchestrator and down to the database and API layers.

```mermaid
graph TD
    User[User / Client UI] -->|1. Chat Message| Security[Security Middleware]
    Security -->|2. Sanitize, Validate, Rate-Limit| Orch[Orchestrator Agent]
    
    subgraph Multi-Agent Pipeline (ADK Pattern)
        Orch -->|3. EMP Dialogue| Checkin[Check-In Agent]
        Orch -->|4. Parse Transcript| Extract[Extraction Agent]
        Orch -->|5. Store / Fetch Data| Memory[Memory Agent]
        Orch -->|6. Historical Analysis| Pattern[Pattern Agent]
        Orch -->|7. Generate Recommendations| Nudge[Nudge Agent]
    end
    
    Memory -->|Prisma Client| DB[(Supabase PostgreSQL)]
    Checkin -->|Gemini 2.5 Flash API| Google[Google Gen AI Service]
    Extract -->|JSON Mode| Google
    Pattern -->|JSON Mode| Google
    Nudge -->|JSON Mode| Google
    
    Orch -->|8. Visual Logs & Metrics| User
```

---

## 🤖 Agent System (ADK Pattern)

Our pipeline implements the **Agent Development Kit (ADK)** pattern, separating tasks into specialized, single-responsibility agents coordinated by a central Orchestrator.

1. **Check-In Agent (`checkinAgent`)**:
   - **Role:** Empathic interviewer.
   - **Responsibility:** Carries out natural dialogue. It gathers data on mood, sleep, and energy levels without sounding like a clinical form.
2. **Extraction Agent (`extractionAgent`)**:
   - **Role:** Structured parser (runs in JSON mode).
   - **Responsibility:** Extracts clinical values (`moodScore`, `energy`, `sleep`, `summary`, `worries`, `tags`) from the chat transcript once the check-in is complete.
3. **Memory Agent (`memoryAgent`)**:
   - **Role:** Persistent ledger (Prisma ORM).
   - **Responsibility:** Securely handles read/write queries to Supabase. Dynamically provisions user records to prevent relational key constraints.
4. **Pattern & Nudge Agents (`patternAgent` & `nudgeAgent`)**:
   - **Role:** Weekly trend analyzer & wellness coach.
   - **Responsibility:** Once 5+ check-ins exist, the Pattern Agent compiles 14-day history trends (e.g. "stable", "volatile"). The Nudge Agent then outputs structured wellness goals across 5 categories: `sleep`, `exercise`, `social`, `work`, and `mindfulness`.

---

## 🔒 Security & Crisis Intervention

To protect users and keep sensitive health data secure, the app includes a multi-layered security pipeline in `src/middleware/security.ts`:

* **Input Sanitization:** Strips HTML script tags, event handlers (`onclick`, etc.), embedded frames, and Javascript protocols to eliminate Cross-Site Scripting (XSS).
* **Zod Schemas:** Enforces strict payload validation on all incoming API routes.
* **Sliding-Window Rate Limiting:** Limits requests per user in-memory (max 20 requests per 60 seconds) to prevent brute force or Denial of Service (DoS) attacks.
* **Crisis Intervention Engine:** Scans all messages for critical distress language (suicidal ideation, self-harm). If triggered, it instantly short-circuits the pipeline and returns 988 Suicide & Crisis Lifeline resources, safeguarding user well-being.
* **Security Headers:** Enforces `Content-Security-Policy` (CSP), `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, and `Referrer-Policy`.

---

## 🔌 MCP Server Integration

The project acts as a Model Context Protocol (MCP) server, allowing AI assistants (like Claude Desktop or Cursor IDE) to interact with your wellness data. 

### Available MCP Tools:
1. `start_checkin`: Initializes a session.
2. `get_recent_checkins`: Retrieves recent logs.
3. `get_patterns`: Retrieves compiled mood trends.
4. `get_todays_nudge`: Retreives generated nudges.
5. `get_checkin_status`: Checks if check-in is complete for today.
6. `get_mood_summary`: Summarizes week-over-week progress.

---

## 🌟 Advanced Clinical & Interactive Features

To upgrade the dashboard from a basic companion into a premium, state-of-the-art mental health utility, we implemented 8 high-impact wellness features:

### 📦 Batch 1: Interactive Wellness & Analytics
* **🎙️ Speech-to-Text Voice Check-In:** Native browser-level `webkitSpeechRecognition` integration next to the chat text area. Includes a red pulsing active recording state.
* **🌈 Dynamic Mood Glow Auroras:** Adapted ambient glassmorphic background colors that shift in real-time based on your current check-in's mood score (e.g. green for high mood, warning red/charcoal for crisis).
* **🔗 Relational Analytics Cards:** Calculations executed directly over Supabase history, comparing average mood scores on days with healthy sleep (≥7h) vs. sleep-deprived days, and exercise energy comparisons.
* **📥 Markdown Wellness Report Exporter:** Direct client download compiled in Markdown summarizing triggers, boosters, history logs, and nudges.

### 📦 Batch 2: Clinical & Therapeutic Interventions
* **🧠 CBT Thought Challenger Wizard:** Interactive 3-step cognitive reframing wizard (evidence logging, control analysis, balanced reframing) appearing instantly if worries are flagged.
* **🎵 Auditory Soundscapes Synth (Web Audio):** Programmatic synthesizer generating Alpha (10Hz Relaxation), Beta (15Hz Focus), and Delta (4Hz Deep Sleep) beats without loading slow MP3 files.
* **🔮 Predictive Mood Forecasting:** Interactive sleep targets and workload intensity sliders simulating next day mood and energy scores based on historical data.
* **🧘 Interactive Breathing Pacer Card:** A guided 4-second inhale, hold, and exhale mindfulness box-breathing widget with fluid scaling size transitions and color cues to reduce stress.
* **📄 Safety Sentinel Clinician PDF Exporter:** Printable clinical dashboards formatted via print-specific stylesheets to hide dark screen styles and compile medical-grade summaries.

---

## 💻 CLI Interface

The terminal-based interface (`cli.ts`) allows users to complete their wellness checks entirely from the command line.

### Command Guide:
* **Start an interactive check-in:**
  ```bash
  npx ts-node cli.ts
  ```
* **Send a single-shot journal entry:**
  ```bash
  npx ts-node cli.ts --message "Had a really productive day and slept great!"
  ```
* **View weekly pattern insights:**
  ```bash
  npx ts-node cli.ts --insights
  ```
* **Retrieve today's wellness nudges:**
  ```bash
  npx ts-node cli.ts --nudge
  ```
* **Show user statistics & check-in history:**
  ```bash
  npx ts-node cli.ts --history
  ```

---

## 🛠️ Setup & Installation

### Prerequisites
* Node.js (v18 or v20)
* Supabase PostgreSQL database
* Google AI Studio Gemini API Key

### 1. Clone the repository and install dependencies
```bash
npm install
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env` and fill in your Supabase connection strings and Gemini API key:
```env
DATABASE_URL="postgresql://postgres.[REF]:[PASSWORD]@aws-1-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres.[REF]:[PASSWORD]@aws-1-us-east-1.pooler.supabase.com:5432/postgres"
GEMINI_API_KEY="your-gemini-api-key"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

### 3. Synchronize Database Schema
Push the Prisma schema to your Supabase PostgreSQL instance:
```bash
npm run db:push
```

### 4. Run the Development Server
```bash
npm run dev
```
Open **[http://localhost:3000](http://localhost:3000)** in your browser to interact with the application.

---

## 🐳 Docker Deployment

The application includes a production-ready, multi-stage `Dockerfile` optimized for minimal size and fast cold-starts.

### 1. Build the Docker Image
```bash
docker build -t wellness-companion .
```

### 2. Run the Docker Container
```bash
docker run -p 3000:3000 --env-file .env wellness-companion
```
The application will be accessible at `http://localhost:3000`.

---

## ⚠️ Disclaimer
**This application is not a medical tool and is not intended for clinical use.**

The Daily Mental Wellness Companion is an AI-driven self-reflection system designed solely for daily habit tracking, emotional self-awareness, and general wellness support. 
* It is **not** a clinical diagnostic tool.
* It does **not** provide professional medical advice, therapy, or psychological clinical intervention.
* It should **never** be used as a replacement for professional healthcare consultation or professional medical treatment.

If you or someone you know is in a state of distress, crisis, or having thoughts of self-harm, please reach out to professional services or dial the **988 Suicide & Crisis Lifeline** immediately.

