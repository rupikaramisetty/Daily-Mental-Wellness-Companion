# Kaggle AI Agents Capstone Submission Guide 🌿

This guide provides you with the exact assets needed to submit your project to the **Kaggle AI Agents Capstone Project (Agents for Good Track)**.

---

## 📝 1. Kaggle Writeup Draft
*Copy and paste the section below as your main Kaggle Writeup description. It has been formatted and written to fit under the 2,500-word limit while addressing all evaluation criteria (Innovation, Architecture, Solution Design, value).*

---

### **Title:** 🌿 Daily Mental Wellness Companion
### **Subtitle:** A Privacy-First, Secure Multi-Agent AI Companion for Mental Health Check-ins and Personalized Nudge Insights
### **Track:** Agents for Good

> ⚠️ **Disclaimer:** The Daily Mental Wellness Companion is an AI-driven self-reflection tool designed for daily habit tracking and general wellness support. It is not a medical device, is not intended for clinical diagnosis or treatment, and does not replace professional medical advice, consultation, therapy, or clinical intervention.

### **Problem Statement & Value**
Mental health issues like stress, anxiety, and burnout are on the rise, yet tracking daily wellness remains tedious and ineffective. Traditional mental health apps fail for three primary reasons:
1. **High Friction:** Filling out clinical scales and survey grids feels like a chore, resulting in very low user retention.
2. **Lack of Context:** Recording a simple "Mood: 3/10" does not capture *why* a user is feeling down, making historical data less useful.
3. **Privacy Concerns:** Mental health is deeply personal. Users are hesitant to share sensitive health thoughts with cloud apps without strict security guarantees.

**The Daily Mental Wellness Companion** resolves this by replacing clinical forms with an **empathetic conversational interface**. Users simply chat about their day. In the background, a secure multi-agent pipeline extracts wellness scores, persists them to a relational database, performs historical trend analysis, and surfaces actionable, private wellness nudges—helping users maintain healthy habits in their daily lives.

---

### **System Architecture & Design**
The application is built using a strict modular approach following the **Agent Development Kit (ADK)** pattern. It features a Next.js frontend, a PostgreSQL database (hosted on Supabase), and Google’s Gemini API. 

The pipeline runs as follows:
1. **User Request:** The user starts a chat. Every request passes through a custom Node.js **Security Middleware** which sanitizes inputs (XSS prevention), enforces Zod schemas, and runs in-memory rate-limiting.
2. **Conversation Turn (Check-In Agent):** An empathetic conversational agent (`checkinAgent`) conducts a multi-turn conversation. It is prompted to gather details on sleep, energy, and mood using natural language.
3. **Parsing & Extraction (Extraction Agent):** Once the dialogue is complete, the `extractionAgent` parses the full transcript in JSON mode, extracting:
   - `moodScore` (1-10)
   - `energy` (1-10)
   - `sleep` (hours)
   - `summary` (short sentence)
   - `worries` (list of concerns)
   - `tags` (mood/context descriptors)
4. **Relational Database Sync (Memory Agent):** The `memoryAgent` writes the extracted data to Supabase using Prisma ORM. It also verifies user profiles dynamically to guarantee referential integrity.
5. **Pattern & Nudge Generation (Pattern + Nudge Agents):** If the user has completed at least 5 check-ins, the `patternAgent` is triggered to analyze their 14-day history. It identifies mood trends ("stable", "volatile", "improving") and triggers. The `nudgeAgent` then translates these trends into a list of personalized recommendations (categorized by Sleep, Exercise, Social, Work, and Mindfulness) which are saved and displayed.

---

### **Technical Implementation & Course Concepts**
We applied the core agent concepts covered in the Kaggle capstone curriculum:
* **Multi-Agent System (ADK Pattern):** Decoupled, task-specific agents coordinate check-ins, parser extractions, Supabase memory transactions, pattern matching, and personalized nudges.
* **Interactive Self-Care Suite:** Integrates browser-native Speech Recognition (`webkitSpeechRecognition`) for hands-free check-ins, adaptive mood glows shifting colors in real-time, real-time sleep vs. mood correlations, and Markdown report downloads.
* **Clinical & Therapeutic Interventions:** Guides the user through a 3-step CBT thought reframing wizard when worries are logged, synthesizes Delta/Alpha/Beta auditory soundscapes programmatically using browser-native **Web Audio API** oscillators, simulates tomorrow's mood predictions using forecasting sliders, and prints medical-grade paper dashboards using custom `@media print` stylesheets.
* **Model Context Protocol (MCP):** Functions as a stdio server (`src/mcp/server.ts`) exporting 6 custom tools (`start_checkin`, `get_recent_checkins`, `get_patterns`, `get_todays_nudge`, etc.) for seamless IDE integrations.
* **Security Middleware:** Multi-layered shield enforcing Zod checks, XSS filters, rate limits, and an automatic distress language short-circuit for immediate 988 Crisis Lifeline bypass.
* **Deployability:** Multi-stage production Dockerfile optimized for instant deployment to Google Cloud Run, minimizing cold-starts and resource costs.
* **CLI Interface:** A terminal interface (`cli.ts`) enabling developer-focused checks, stats history, and insights compilation.

---

## 🎥 2. YouTube Video Blueprint & Script (5 Minutes Max)
*This script and walkthrough outlines how to record and narrate your 5-minute project video. Use screen recording software like OBS Studio, Loom, or QuickTime.*

### **Video Outline:**

| Timestamp | Visual | Narration / Action |
|-----------|--------|--------------------|
| **0:00 - 0:45** | **Slide / Title Screen** <br> Show Title slide: *Daily Mental Wellness Companion* & Track: *Agents for Good*. Then, show the active Next.js Chat interface. | **Introduction & Problem:** "Hi everyone! This is the Daily Mental Wellness Companion, built for the Kaggle Capstone Project. Traditional health trackers fail because filling out forms is tedious and clinical. We solved this by using an empathetic multi-agent conversation that parses natural dialogue into medical-grade insights." |
| **0:45 - 1:45** | **Live Browser Demo** <br> Chat with the companion. Type: *"I slept about 6 hours and feel alright, just a bit stressed about work."* Send 2-3 messages. | **Empathetic Chat Demo:** "Let's start a check-in. The Check-in Agent asks about my day naturally. I can tell it about my sleep and stress. Once I complete the conversation, the pipeline triggers." |
| **1:45 - 2:30** | **Results Screen** <br> Show the visual cards, mood gauges, worries tags, and generated wellness nudges. | **Multi-Agent Pipeline & Extraction:** "Once finished, the Extraction Agent parses my chat into structured JSON. The Memory Agent saves it to Supabase. Since I have prior check-ins, the Pattern Agent detects trends, and the Nudge Agent generates these personalized recommendations across Sleep, Mindfulness, and Exercise." |
| **2:30 - 3:15** | **Code / IDE Walkthrough** <br> Open VS Code. Show `src/agents/base-agent.ts` and `src/agents/memory-agent.ts`. Highlight the Gemini model and Prisma integration. | **Technical Implementation (ADK):** "Under the hood, we use the ADK pattern. Here is `base-agent.ts` calling Gemini 2.5 Flash, and `memory-agent.ts` executing relational upserts. Notice the comments explaining design choices." |
| **3:15 - 4:00** | **Terminal / CLI Demo** <br> Run `npx ts-node cli.ts --insights` and `npx ts-node cli.ts --nudge` in your terminal. | **CLI Agent Skills:** "We also built a terminal CLI. Users can complete check-ins, view insights, or fetch their latest nudges directly from their CLI using simple parameters, proving agent versatility." |
| **4:00 - 4:30** | **MCP Server Demo** <br> Show the `src/mcp/server.ts` code and list of tools. | **MCP Server Integration:** "To support IDE integration, our app functions as an MCP Server. Any editor like Claude Desktop or Cursor can run custom tools to query check-in summaries and mood trends securely." |
| **4:30 - 5:00** | **Security & Docker (Conclusion)** <br> Show the crisis detection code in `src/middleware/security.ts` and show the `Dockerfile`. | **Security & Deployment:** "Finally, we protect sensitive health data with strict rate-limiting, XSS sanitization, and a crisis detector that triggers 988 Lifeline resources. The app is fully containerized via Docker for Google Cloud Run. Thanks for watching!" |

---

## 📷 3. Media Gallery Assets Checklist
*You need to capture and upload these images to your Kaggle Writeup Media Gallery.*

1. **Cover Image (Required):**
   - Use this generated cover image or take a screenshot of your main Chat UI:
    ![Project Cover Page](/Users/rupikaramisetty/Desktop/Daily Mental Wellness Companion/submission_assets/cover_page.png)
2. **System Architecture Diagram:**
   - Use this generated high-fidelity agent diagram or use the Mermaid diagram from `README.md`:
    ![System Architecture Diagram](/Users/rupikaramisetty/Desktop/Daily Mental Wellness Companion/submission_assets/architecture_diagram.png)
3. **YouTube / Kaggle Project Thumbnail:**
   - Use this generated high-resolution landscape thumbnail (min 560x280) for your video:
    ![Project Thumbnail](/Users/rupikaramisetty/Desktop/Daily Mental Wellness Companion/submission_assets/thumbnail.png)
4. **CLI Terminal Screenshot:**
   - Open a terminal, run `npx ts-node cli.ts --history` (showing the colored ASCII banner and output), and take a screenshot.
5. **Prisma Schema / Database Visualizer:**
   - Open the Supabase Database dashboard showing the tables (`CheckIn`, `User`, `Pattern`, `Nudge`) or take a screenshot of `prisma/schema.prisma` in your editor.
