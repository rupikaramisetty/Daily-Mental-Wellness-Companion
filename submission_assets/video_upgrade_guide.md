# Daily Mental Wellness Companion — Video Upgrade Guide 🎥

To maximize your score in the **Kaggle AI Agents Capstone (Agents for Good Track)**, your 5-minute submission video should demonstrate advanced features clearly. This guide outlines how to use the seeding script, show off the Model Context Protocol (MCP) server, and present the advanced security mechanisms.

---

## 🚀 1. The Pre-Seeded Live Demo Flow (Highly Recommended)

Rather than checking in on a blank database, follow this flow to show historical trends, charts, and the live multi-agent execution pipeline in under 3 minutes:

1. **Seed the database before recording:**
   Run the seeding script to populate 5 days of check-ins:
   ```bash
   npm run db:seed
   ```
2. **Start the video on the "Trends & Weekly Insights" tab:**
   - Show the interactive SVG charts mapping Mood, Energy, and Sleep trends.
   - Point out how the **Pattern Agent** compiled the list of triggers ("critical review feedback", "sleep under 6h") and mood boosters ("afternoon exercise").
3. **Switch to the "Daily Check-In" tab and chat:**
   - Say: *"Let's complete our check-in for today."*
   - Type a natural-language check-in turn: *"I slept 8 hours last night, went out with friends, and feel amazing today!"*
   - Hit **Send**.
   - Because you already have 5 check-ins in the database, the **Orchestrator** will complete the dialogue and trigger the **full pipeline**:
     `Check-In` ➡️ `Extraction` ➡️ `Memory` ➡️ `Pattern` ➡️ `Nudge`
   - Show the pipeline status lights animation lighting up.
4. **Point to the Advanced Dashboard:**
   - Point out the updated charts showing the 6th check-in.
   - Show the newly generated nudges with the interactive completion checkboxes.

---

## 🛠️ 2. Showcase the Model Context Protocol (MCP) Server

To prove your MCP integration to the judges, show Claude Desktop interacting with your agent database.

### Claude Desktop Setup:
1. Open your Claude Desktop configuration file:
   - **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
2. Add your local server configuration (replace `/Users/rupikaramisetty` with your actual home folder path):
   ```json
   {
     "mcpServers": {
       "wellness-companion": {
         "command": "npx",
         "args": [
           "-y",
           "ts-node",
           "/Users/rupikaramisetty/Desktop/Daily Mental Wellness Companion/src/mcp/server.ts"
         ],
         "env": {
           "DATABASE_URL": "postgresql://...",
           "DIRECT_URL": "postgresql://..."
         }
       }
     }
   }
   ```
   *(Note: Copy the `DATABASE_URL` and `DIRECT_URL` exactly from your `.env` file.)*
3. Restart Claude Desktop. You will see a small hammer icon 🛠️ showing the tools are loaded.

### Video Segment (0:45):
- Open Claude Desktop.
- Type: *"Summarize my mental wellness history for user demo-user-001."*
- Show Claude running the `get_recent_checkins` tool, reading from your Supabase instance, and printing out a beautiful synthesis.
- Say: *"Because our system runs an MCP server, any external assistant like Claude Desktop can securely query user history and summarize mood patterns."*

---

## 🔒 3. Showcase the Privacy & Security Shield

Showcase the robust security safeguards built into the app:
1. **The Live Security Shield Widget:**
   - Point to the live panel displaying Zod validations, XSS filters, and active rate limiting.
2. **Crisis Trigger Test:**
   - Type: *"I feel like killing myself"* or *"I want to end it all"* in the chat input.
   - Click **Send**.
   - Show how the app **instantly short-circuits** (without hitting Gemini and spending tokens) to return the 988 Lifeline resources and flags the crisis mode.
   - Say: *"We implement a real-time crisis detection engine in our custom middleware to safeguard users in immediate danger, bypassing general chat pipeline execution."*

---

## 🎙️ 4. Show off the Advanced Upgrades Live

During the screen recording, make sure to highlight these high-impact features:
1. **Speech-to-Text Dictation:**
   - Instead of typing, click the **Microphone button 🎙️** next to the chat text area.
   - Dictate your check-in: *"I slept about eight hours last night and went out with some friends today."*
   - Show how the text is instantly transcribed and entered into the chat input.
2. **Dynamic Mood Auroras:**
   - Complete a high-mood check-in (e.g. Mood 9) and show the ambient background auroras glow soft green and cyan.
   - Mention: *"The visual themes adapt in real-time to match the user's emotional state, reinforcing positive moments."*
3. **Data-Driven Correlations Panel:**
   - Click on the **Trends** tab and point to the **Relational Wellness Correlations** cards.
   - Say: *"The application runs statistical correlation models directly over the Supabase database logs, mathematically showing how sleep and exercise patterns directly impact mood and energy scores."*
4. **Export Markdown Report:**
   - Click the **📥 Export Weekly Report** button.
   - Open the downloaded Markdown file in your text editor.
   - Say: *"Users can instantly generate and export a complete wellness summary, ready to print or share with mental health professionals."*

---

## 🎬 5. Video Recording Checklists & Zoom Levels

- **Zoom Levels:** Reviewers will be viewing this on laptops or monitors. Zoom in your browser to **110% - 125%** so the text inside the chat bubbles and metrics cards is highly legible.
- **Terminal Size:** Increase your terminal font size to **16pt** when running CLI commands like `npx ts-node cli.ts --history`.
- **VS Code Syntax Highlighting:** Use a clean dark theme (like One Dark Pro or GitHub Dark) and zoom in (`Cmd + =` on Mac) when highlighting your agent codebase.
