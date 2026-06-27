/**
 * Premium Futuristic Dark-Mode Glassmorphism Chat & Insights UI
 *
 * Full-featured premium dashboard for the Daily Wellness Companion.
 * Includes interactive aurora backgrounds, frosted glass panels,
 * glowing metric visualizers, and a historical trends tab querying Supabase.
 *
 * @module app/page
 */

"use client";

import { useState, useRef, useEffect, type FormEvent, type KeyboardEvent } from "react";

// ---------------------------------------------------------------------------
// Types & Interfaces
// ---------------------------------------------------------------------------

interface ChatMessage {
  role: "user" | "assistant";
  text: string;
}

interface ConversationTurn {
  role: "user" | "model";
  parts: { text: string }[];
}

interface Nudge {
  message: string;
  category: string;
}

interface ExtractedCheckIn {
  moodScore: number;
  energy: number;
  sleep: number | null;
  summary: string;
  worries: string | null;
  tags: string[];
}

interface HistoryCheckIn {
  id: string;
  moodScore: number;
  energy: number;
  sleep: number | null;
  summary: string;
  worries: string | null;
  tags: string[];
  createdAt: string;
}

interface HistoryPattern {
  id: string;
  moodTrend: string;
  summary: string;
  insights: any; // { triggers: [], boosters: [], correlations: [], highlights: [] }
  createdAt: string;
}

type ActiveAgentState = "idle" | "checkin" | "extraction" | "memory" | "pattern" | "nudge" | "done";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const USER_ID = "demo-user-001";

const CATEGORY_EMOJI: Record<string, string> = {
  sleep: "😴",
  exercise: "🏃",
  social: "🤝",
  work: "💼",
  mindfulness: "🧘",
};

const AGENT_INFO = {
  idle: { name: "Pipeline Ready", desc: "Start chatting to begin check-in" },
  checkin: { name: "🤖 Check-In Agent", desc: "Conducting empathetic wellness conversation..." },
  extraction: { name: "🔍 Extraction Agent", desc: "Parsing mood, sleep, and worries into JSON..." },
  memory: { name: "💾 Memory Agent", desc: "Upserting user and saving check-in to Supabase..." },
  pattern: { name: "🧠 Pattern Agent", desc: "Analyzing 14-day history for wellness trends..." },
  nudge: { name: "💡 Nudge Agent", desc: "Generating personalized habit recommendations..." },
  done: { name: "✨ Check-In Complete", desc: "All data securely saved and analyzed" },
};

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export default function Home() {
  // Navigation tabs
  const [activeTab, setActiveTab] = useState<"checkin" | "history">("checkin");

  // Chat conversation state
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      text: "Hi! I'm your daily wellness companion. Let's do your mental check-in for today. How have you been feeling lately? 🌿",
    },
  ]);
  const [history, setHistory] = useState<ConversationTurn[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [isCrisis, setIsCrisis] = useState(false);

  // Multi-agent execution status
  const [agentState, setAgentState] = useState<ActiveAgentState>("checkin");

  // Extracted metrics & nudges
  const [extractedData, setExtractedData] = useState<ExtractedCheckIn | null>(null);
  const [nudges, setNudges] = useState<Nudge[]>([]);

  // Historical trends data
  const [historyList, setHistoryList] = useState<HistoryCheckIn[]>([]);
  const [latestPattern, setLatestPattern] = useState<HistoryPattern | null>(null);
  const [historyNudges, setHistoryNudges] = useState<Nudge[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Advanced Dashboard Interactive States
  const [completedNudges, setCompletedNudges] = useState<Record<string, boolean>>({});
  const [sanitizedCount, setSanitizedCount] = useState(0);
  const [rateLimitRemaining, setRateLimitRemaining] = useState(20);
  const [expandedTraces, setExpandedTraces] = useState<Record<string, boolean>>({});
  const [showCurrentTrace, setShowCurrentTrace] = useState(false);
  const [isListening, setIsListening] = useState(false);

  // Web Audio Synthesizer States & Refs
  const [audioPlaying, setAudioPlaying] = useState<string | null>(null);
  const [audioVolume, setAudioVolume] = useState(0.12);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const leftOscRef = useRef<OscillatorNode | null>(null);
  const rightOscRef = useRef<OscillatorNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);

  // Predictive Mood Forecasting States
  const [plannedSleep, setPlannedSleep] = useState(8.0);
  const [workIntensity, setWorkIntensity] = useState<"low" | "medium" | "high">("medium");

  // CBT Reframing Wizard States
  const [cbtStep, setCbtStep] = useState(1);
  const [cbtEvidenceFor, setCbtEvidenceFor] = useState("");
  const [cbtEvidenceAgainst, setCbtEvidenceAgainst] = useState("");
  const [cbtControllable, setCbtControllable] = useState("");
  const [cbtReframedText, setCbtReframedText] = useState("");
  const [cbtCompleted, setCbtCompleted] = useState(false);

  // Hydration Safety State
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  // Breathing Pacer States
  const [isBreathing, setIsBreathing] = useState(false);
  const [breathPhase, setBreathPhase] = useState<"In" | "Hold" | "Out">("In");
  const [breathTimer, setBreathTimer] = useState(4);

  // Rhythmic breathing timer (4-4-4 cycle)
  useEffect(() => {
    if (!isBreathing) {
      setBreathPhase("In");
      setBreathTimer(4);
      return;
    }

    const interval = setInterval(() => {
      setBreathTimer((prev) => {
        if (prev <= 1) {
          setBreathPhase((curr) => {
            if (curr === "In") return "Hold";
            if (curr === "Hold") return "Out";
            return "In";
          });
          return 4;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isBreathing]);

  const chatEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom of chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  /**
   * Dictates user check-ins using native browser Web Speech API
   */
  function handleVoiceInput() {
    if (typeof window === "undefined") return;
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Speech recognition is not supported in this browser. Please try Chrome or Safari.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = "en-US";

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onerror = (event: any) => {
      console.error("Speech recognition error:", event.error);
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setInput((prev) => (prev ? prev + " " + transcript : transcript));
    };

    recognition.start();
  }

  /**
   * Dynamic background selector depending on check-in state and score
   */
  function getAuroraGlows() {
    if (isCrisis) {
      return {
        glow1: "radial-gradient(circle, rgba(239, 68, 68, 0.16) 0%, rgba(239, 68, 68, 0) 70%)",
        glow2: "radial-gradient(circle, rgba(15, 23, 42, 0.85) 0%, rgba(15, 23, 42, 0) 70%)",
        titleColor: "linear-gradient(135deg, #ef4444 0%, #f43f5e 100%)"
      };
    }
    if (done && extractedData) {
      const score = extractedData.moodScore;
      if (score >= 8) {
        return {
          glow1: "radial-gradient(circle, rgba(16, 185, 129, 0.16) 0%, rgba(16, 185, 129, 0) 70%)",
          glow2: "radial-gradient(circle, rgba(56, 189, 248, 0.14) 0%, rgba(56, 189, 248, 0) 70%)",
          titleColor: "linear-gradient(135deg, #34d399 0%, #38bdf8 100%)"
        };
      }
      if (score < 5) {
        return {
          glow1: "radial-gradient(circle, rgba(245, 158, 11, 0.15) 0%, rgba(245, 158, 11, 0) 70%)",
          glow2: "radial-gradient(circle, rgba(99, 102, 241, 0.1) 0%, rgba(99, 102, 241, 0) 70%)",
          titleColor: "linear-gradient(135deg, #fbbf24 0%, #a78bfa 100%)"
        };
      }
    }
    return {
      glow1: "radial-gradient(circle, rgba(99, 102, 241, 0.12) 0%, rgba(99, 102, 241, 0) 70%)",
      glow2: "radial-gradient(circle, rgba(16, 185, 129, 0.08) 0%, rgba(16, 185, 129, 0) 70%)",
      titleColor: "linear-gradient(135deg, #a78bfa 0%, #10b981 100%)"
    };
  }

  /**
   * Computes relational wellness stats (sleep vs mood, exercise vs energy)
   */
  function getCorrelationMetrics() {
    if (historyList.length === 0) return null;
    
    const sleepDays = historyList.filter((d) => d.sleep !== null);
    const highSleepMoods = sleepDays.filter((d) => (d.sleep || 0) >= 7.0).map((d) => d.moodScore);
    const lowSleepMoods = sleepDays.filter((d) => (d.sleep || 0) < 7.0).map((d) => d.moodScore);
    
    const avgHighSleepMood = highSleepMoods.length > 0 ? (highSleepMoods.reduce((a, b) => a + b, 0) / highSleepMoods.length).toFixed(1) : null;
    const avgLowSleepMood = lowSleepMoods.length > 0 ? (lowSleepMoods.reduce((a, b) => a + b, 0) / lowSleepMoods.length).toFixed(1) : null;

    const exerciseDays = historyList.filter((d) => d.tags.includes("exercise"));
    const workDays = historyList.filter((d) => d.tags.includes("work"));
    
    const exerciseEnergy = exerciseDays.map(d => d.energy);
    const avgExEnergy = exerciseEnergy.length > 0 ? (exerciseEnergy.reduce((a, b) => a + b, 0) / exerciseEnergy.length).toFixed(1) : null;

    const workEnergy = workDays.map(d => d.energy);
    const avgWorkEnergy = workEnergy.length > 0 ? (workEnergy.reduce((a, b) => a + b, 0) / workEnergy.length).toFixed(1) : null;

    return {
      avgHighSleepMood,
      avgLowSleepMood,
      avgExEnergy,
      avgWorkEnergy,
    };
  }

  /**
   * Generates a clean Markdown download report of check-ins and nudges
   */
  function handleExportReport() {
    if (historyList.length === 0) return;
    
    let md = `# Wellness Weekly Insights Report 🌿\n`;
    md += `Generated on: ${new Date().toLocaleDateString()}\n`;
    md += `User ID: ${USER_ID}\n\n`;
    md += `## 📊 Weekly Pattern Summary\n`;
    if (latestPattern) {
      md += `**Mood Stability Trend:** ${latestPattern.moodTrend.toUpperCase()}\n`;
      md += `**Analysis:** ${latestPattern.summary}\n\n`;
      md += `### Triggers Detected:\n`;
      latestPattern.insights?.triggers?.forEach((t: string) => {
        md += `- ${t}\n`;
      });
      md += `\n### Mood Boosters:\n`;
      latestPattern.insights?.boosters?.forEach((b: string) => {
        md += `- ${b}\n`;
      });
    } else {
      md += `Not enough entries compiled for weekly pattern analysis.\n`;
    }
    
    md += `\n## 📜 Historical Logs (Last 7 Entries)\n\n`;
    historyList.slice(-7).forEach((entry) => {
      md += `### Date: ${new Date(entry.createdAt).toLocaleDateString()}\n`;
      md += `- **Mood Score:** ${entry.moodScore}/10\n`;
      md += `- **Energy Level:** ${entry.energy}/10\n`;
      md += `- **Sleep Hours:** ${entry.sleep ?? "N/A"}\n`;
      md += `- **Companion Summary:** ${entry.summary}\n`;
      if (entry.worries) md += `- **Worries Flags:** ${entry.worries}\n`;
      md += `- **Wellness Tags:** ${entry.tags.map((t) => `#${t}`).join(", ")}\n\n`;
    });

    md += `\n---\n*Disclaimer: This wellness report is an AI-generated self-reflection summary and does not replace professional medical advice.*`;

    const blob = new Blob([md], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `wellness_report_${new Date().toISOString().split("T")[0]}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  /**
   * Web Audio API tone generator for programmatically synthesizing binaural frequencies
   */
  function startBinaural(preset: string, carrierFreq: number, beatFreq: number) {
    if (typeof window === "undefined") return;
    try {
      stopBinaural();

      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioContextClass();
      audioCtxRef.current = ctx;

      const leftOsc = ctx.createOscillator();
      const rightOsc = ctx.createOscillator();
      const merger = ctx.createChannelMerger(2);
      const gainNode = ctx.createGain();

      leftOsc.frequency.setValueAtTime(carrierFreq, ctx.currentTime);
      rightOsc.frequency.setValueAtTime(carrierFreq + beatFreq, ctx.currentTime);

      leftOsc.connect(merger, 0, 0);
      rightOsc.connect(merger, 0, 1);
      merger.connect(gainNode);
      gainNode.connect(ctx.destination);

      gainNode.gain.setValueAtTime(audioVolume, ctx.currentTime);
      
      leftOsc.start();
      rightOsc.start();

      leftOscRef.current = leftOsc;
      rightOscRef.current = rightOsc;
      gainNodeRef.current = gainNode;
      setAudioPlaying(preset);
    } catch (e) {
      console.error("Failed to start Web Audio Synthesizer:", e);
    }
  }

  function stopBinaural() {
    try {
      leftOscRef.current?.stop();
      rightOscRef.current?.stop();
      leftOscRef.current?.disconnect();
      rightOscRef.current?.disconnect();
      gainNodeRef.current?.disconnect();
      audioCtxRef.current?.close();
    } catch (e) {}
    
    leftOscRef.current = null;
    rightOscRef.current = null;
    gainNodeRef.current = null;
    audioCtxRef.current = null;
    setAudioPlaying(null);
  }

  function handleVolumeChange(newVal: number) {
    setAudioVolume(newVal);
    if (gainNodeRef.current && audioCtxRef.current) {
      gainNodeRef.current.gain.setValueAtTime(newVal, audioCtxRef.current.currentTime);
    }
  }

  // Stop synthesizer on unmount
  useEffect(() => {
    return () => {
      stopBinaural();
    };
  }, []);

  /**
   * Calculates simulated tomorrow forecasting metrics based on history + sliders
   */
  function getPredictedScores() {
    let baseMood = 6.5;
    let baseEnergy = 6.0;

    if (historyList.length > 0) {
      baseMood = historyList.reduce((acc, curr) => acc + curr.moodScore, 0) / historyList.length;
      baseEnergy = historyList.reduce((acc, curr) => acc + curr.energy, 0) / historyList.length;
    }

    const sleepDelta = plannedSleep - 8.0;
    let sleepEffect = sleepDelta * 0.75;
    if (plannedSleep < 6.5) {
      sleepEffect -= 0.6; 
    }

    let intensityEffect = 0;
    if (workIntensity === "high") intensityEffect = -1.6;
    if (workIntensity === "low") intensityEffect = 1.2;

    const predictedMood = Math.max(1, Math.min(10, Math.round(baseMood + sleepEffect + intensityEffect * 0.4)));
    const predictedEnergy = Math.max(1, Math.min(10, Math.round(baseEnergy + sleepEffect * 1.1 + intensityEffect * 1.1)));

    return { predictedMood, predictedEnergy };
  }

  function handlePrintClinicianSummary() {
    if (typeof window !== "undefined") {
      window.print();
    }
  }

  const glows = getAuroraGlows();
  const correlations = getCorrelationMetrics();
  const predictions = getPredictedScores();

  // Load history whenever the history tab is clicked
  useEffect(() => {
    if (activeTab === "history") {
      fetchHistory();
    }
  }, [activeTab]);

  /**
   * Fetch historical records from our custom GET endpoint
   */
  async function fetchHistory() {
    setLoadingHistory(true);
    try {
      const res = await fetch(`/api/history?userId=${USER_ID}`);
      const data = await res.json();
      if (!data.error) {
        setHistoryList(data.checkIns || []);
        setLatestPattern(data.latestPattern || null);
        setHistoryNudges(data.nudges || []);
      }
    } catch (err) {
      console.error("Failed to load history:", err);
    } finally {
      setLoadingHistory(false);
    }
  }

  /**
   * Animate the multi-agent pipeline sequence for visual clarity
   */
  async function animatePipeline(finalData: any) {
    setLoading(false);
    
    // Step 1: Extraction Agent
    setAgentState("extraction");
    await new Promise((r) => setTimeout(r, 1200));

    // Step 2: Memory Agent
    setAgentState("memory");
    await new Promise((r) => setTimeout(r, 1000));

    // Step 3: Pattern Agent
    setAgentState("pattern");
    await new Promise((r) => setTimeout(r, 1000));

    // Step 4: Nudge Agent
    setAgentState("nudge");
    await new Promise((r) => setTimeout(r, 1000));

    // Finalize
    setAgentState("done");
    setDone(true);
    if (finalData.checkIn) setExtractedData(finalData.checkIn);
    if (finalData.nudges) setNudges(finalData.nudges);
  }

  /**
   * Send chat message to orchestrator POST endpoint
   */
  async function sendMessage(e?: FormEvent) {
    e?.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || loading || done) return;

    // Check for script injection or dangerous characters for live security shield
    const needsSanitization = /<[^>]*>|on\w+\s*=|javascript\s*:/i.test(trimmed);
    if (needsSanitization) {
      setSanitizedCount((prev) => prev + 1);
    }

    // Decrement rate limit
    setRateLimitRemaining((prev) => Math.max(0, prev - 1));

    // Add user message
    const userMsg: ChatMessage = { role: "user", text: trimmed };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);
    setAgentState("checkin");

    try {
      const res = await fetch("/api/checkin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: USER_ID,
          message: trimmed,
          history,
        }),
      });

      const data = await res.json();

      if (data.error) {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", text: `⚠️ Error: ${data.error}` },
        ]);
        setLoading(false);
        return;
      }

      // Handle crisis hotline trigger
      if (data.isCrisis) {
        setIsCrisis(true);
        setMessages((prev) => [
          ...prev,
          { role: "assistant", text: data.reply },
        ]);
        setLoading(false);
        setAgentState("idle");
        return;
      }

      // Update transcript history
      setHistory((prev) => [
        ...prev,
        { role: "user", parts: [{ text: trimmed }] },
        { role: "model", parts: [{ text: data.reply }] },
      ]);

      // Add assistant response
      setMessages((prev) => [
        ...prev,
        { role: "assistant", text: data.reply },
      ]);

      // If Orchestrator signals conversation completion, kick off agent trace animation
      if (data.isComplete) {
        await animatePipeline(data);
      } else {
        setLoading(false);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", text: "⚠️ Network error. Please try sending your message again." },
      ]);
      setLoading(false);
    }
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  // Pre-calculate SVG Chart Coordinates
  const chartData = historyList.slice(-7); // Last 7 check-ins
  const chartN = chartData.length;
  const getX = (index: number) => 45 + (index * 420) / Math.max(1, chartN - 1);
  const getY = (score: number) => 20 + (10 - score) * 14;

  const moodPoints = chartData.map((d, i) => `${getX(i)},${getY(d.moodScore)}`);
  const moodPathD = chartN > 1 ? `M ${moodPoints.join(" L ")}` : "";
  const moodFillD = chartN > 1 ? `${moodPathD} L ${getX(chartN - 1)},160 L ${getX(0)},160 Z` : "";

  const energyPoints = chartData.map((d, i) => `${getX(i)},${getY(d.energy)}`);
  const energyPathD = chartN > 1 ? `M ${energyPoints.join(" L ")}` : "";
  const energyFillD = chartN > 1 ? `${energyPathD} L ${getX(chartN - 1)},160 L ${getX(0)},160 Z` : "";

  const sleepData = chartData.filter(d => d.sleep !== null);
  const sleepN = sleepData.length;

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "radial-gradient(circle at 50% 50%, #0f172a 0%, #020617 100%)",
        fontFamily: "'Outfit', 'Inter', system-ui, -apple-system, sans-serif",
        color: "#f8fafc",
        padding: "48px 16px",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <style dangerouslySetInnerHTML={{ __html: `
        .chart-dot {
          cursor: pointer;
          transition: r 0.2s ease, fill 0.2s ease, filter 0.2s ease;
        }
        .chart-dot:hover {
          r: 7.5px !important;
          filter: drop-shadow(0 0 8px rgba(167, 139, 250, 0.8));
        }
        .chart-bar {
          cursor: pointer;
          transition: fill-opacity 0.2s ease, filter 0.2s ease;
        }
        .chart-bar:hover {
          fill-opacity: 1 !important;
          filter: drop-shadow(0 0 8px rgba(167, 139, 250, 0.6));
        }
        @keyframes pulse-recording {
          0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.7); }
          70% { transform: scale(1.05); box-shadow: 0 0 0 8px rgba(239, 68, 68, 0); }
          100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
        }
        .recording-active {
          animation: pulse-recording 1.4s infinite;
          background: rgba(239, 68, 68, 0.25) !important;
          border-color: rgba(239, 68, 68, 0.5) !important;
          color: #f87171 !important;
        }
        @media print {
          .no-print {
            display: none !important;
          }
          .print-only {
            display: block !important;
          }
          body, html {
            background: #ffffff !important;
            color: #000000 !important;
          }
        }
        @media screen {
          .print-only {
            display: none !important;
          }
        }
      ` }} />

      <div className="no-print">
        {/* Aurora Ambient Glow Effects */}
      <div
        className="aurora-1"
        style={{
          position: "fixed",
          top: "-15%",
          left: "-10%",
          width: "45vw",
          height: "45vw",
          borderRadius: "50%",
          background: glows.glow1,
          filter: "blur(80px)",
          zIndex: 0,
          pointerEvents: "none",
          transition: "background 1.5s ease",
        }}
      />
      <div
        className="aurora-2"
        style={{
          position: "fixed",
          bottom: "-15%",
          right: "-10%",
          width: "55vw",
          height: "55vw",
          borderRadius: "50%",
          background: glows.glow2,
          filter: "blur(90px)",
          zIndex: 0,
          pointerEvents: "none",
          transition: "background 1.5s ease",
        }}
      />

      {/* Floating Background SVG Figures */}
      <div
        className="floating-figure-1"
        style={{
          position: "fixed",
          top: "20%",
          right: "8%",
          width: 120,
          height: 120,
          opacity: 0.08,
          pointerEvents: "none",
          zIndex: 0,
        }}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: "100%", height: "100%" }}>
          <path d="M2 22C2 22 8 20 12 16C16 12 22 6 22 2C22 2 18 2 14 6C10 10 2 16 2 22Z" />
          <path d="M12 16C12 16 13 11 17 7" />
          <path d="M7 17C7 17 8 13 12 9" />
        </svg>
      </div>

      <div
        className="floating-figure-2"
        style={{
          position: "fixed",
          bottom: "20%",
          left: "8%",
          width: 100,
          height: 100,
          opacity: 0.06,
          pointerEvents: "none",
          zIndex: 0,
        }}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="#a78bfa" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: "100%", height: "100%" }}>
          <path d="M2 22C2 22 8 20 12 16C16 12 22 6 22 2C22 2 18 2 14 6C10 10 2 16 2 22Z" />
          <path d="M12 16C12 16 13 11 17 7" />
          <path d="M7 17C7 17 8 13 12 9" />
        </svg>
      </div>

      <div style={{ maxWidth: 1160, margin: "0 auto", position: "relative", zIndex: 1 }}>
        
        {/* Header Section */}
        <header style={{ textAlign: "center", marginBottom: 30 }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 14, marginBottom: 12 }}>
            <span style={{ fontSize: 40, filter: "drop-shadow(0 0 12px rgba(16,185,129,0.3))" }}>🌿</span>
            <h1
              style={{
                fontSize: 36,
                fontWeight: 900,
                margin: 0,
                background: "linear-gradient(135deg, #a78bfa 0%, #10b981 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                letterSpacing: "-1px",
                filter: "drop-shadow(0 4px 12px rgba(0,0,0,0.15))",
              }}
            >
              Daily Wellness Companion
            </h1>
          </div>
          <p style={{ fontSize: 16, color: "#94a3b8", margin: 0, fontWeight: 500 }}>
            Kaggle AI Agents Capstone — Empathetic Multi-Agent Wellness System
          </p>

          {/* Navigation Tabs */}
          <div
            style={{
              display: "inline-flex",
              backgroundColor: "rgba(30, 41, 59, 0.6)",
              backdropFilter: "blur(12px)",
              padding: 6,
              borderRadius: 30,
              marginTop: 24,
              border: "1px solid rgba(255, 255, 255, 0.08)",
              boxShadow: "0 8px 32px 0 rgba(0, 0, 0, 0.3)",
            }}
          >
            <button
              onClick={() => setActiveTab("checkin")}
              style={{
                padding: "10px 28px",
                borderRadius: 20,
                border: "none",
                fontSize: 14,
                fontWeight: 700,
                cursor: "pointer",
                backgroundColor: activeTab === "checkin" ? "rgba(255, 255, 255, 0.08)" : "transparent",
                color: activeTab === "checkin" ? "#34d399" : "#94a3b8",
                boxShadow: activeTab === "checkin" ? "inset 0 1px 1px rgba(255,255,255,0.05)" : "none",
                transition: "all 0.2s ease-in-out",
                textShadow: activeTab === "checkin" ? "0 0 12px rgba(52, 211, 153, 0.4)" : "none",
              }}
            >
              💬 Daily Check-In
            </button>
            <button
              onClick={() => setActiveTab("history")}
              style={{
                padding: "10px 28px",
                borderRadius: 20,
                border: "none",
                fontSize: 14,
                fontWeight: 700,
                cursor: "pointer",
                backgroundColor: activeTab === "history" ? "rgba(255, 255, 255, 0.08)" : "transparent",
                color: activeTab === "history" ? "#34d399" : "#94a3b8",
                boxShadow: activeTab === "history" ? "inset 0 1px 1px rgba(255,255,255,0.05)" : "none",
                transition: "all 0.2s ease-in-out",
                textShadow: activeTab === "history" ? "0 0 12px rgba(52, 211, 153, 0.4)" : "none",
              }}
            >
              📊 Trends & Weekly Insights
            </button>
          </div>
        </header>

        {/* Two-Column Responsive Layout */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 28, marginTop: 10 }}>
          
          {/* Main Area (Left Column) */}
          <div style={{ flex: "2 1 660px", display: "flex", flexDirection: "column", gap: 24 }}>
            
            {/* Tab 1: Check-In Chat */}
            {activeTab === "checkin" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
                
                {/* Main Chat frosted panel */}
                <main
                  className="glass-panel"
                  style={{
                    borderRadius: 28,
                    overflow: "hidden",
                  }}
                >
                  {/* Chat Messages */}
                  <div
                    style={{
                      padding: "28px 28px 20px",
                      height: 440,
                      overflowY: "auto",
                      display: "flex",
                      flexDirection: "column",
                      gap: 20,
                      background: "linear-gradient(180deg, rgba(15,23,42,0) 0%, rgba(15,23,42,0.2) 100%)",
                    }}
                  >
                    {messages.map((msg, idx) => (
                      <div
                        key={idx}
                        className="bubble"
                        style={{
                          display: "flex",
                          justifyContent: msg.role === "user" ? "flex-end" : "flex-start",
                        }}
                      >
                        <div
                          style={{
                            maxWidth: "75%",
                            padding: "14px 20px",
                            borderRadius:
                              msg.role === "user" ? "22px 22px 4px 22px" : "22px 22px 22px 4px",
                            background:
                              msg.role === "user"
                                ? "linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)"
                                : "rgba(30, 41, 59, 0.6)",
                            color: "#f8fafc",
                            fontSize: 15,
                            lineHeight: 1.6,
                            boxShadow:
                              msg.role === "user"
                                ? "0 8px 20px rgba(99, 102, 241, 0.25)"
                                : "0 4px 15px rgba(0, 0, 0, 0.1)",
                            whiteSpace: "pre-wrap",
                            border: msg.role === "user" ? "none" : "1px solid rgba(255, 255, 255, 0.05)",
                            wordBreak: "break-word",
                          }}
                        >
                          {msg.text}
                        </div>
                      </div>
                    ))}

                    {/* Loading Bubble */}
                    {loading && (
                      <div style={{ display: "flex", justifyContent: "flex-start" }}>
                        <div
                          style={{
                            padding: "14px 20px",
                            borderRadius: "22px 22px 22px 4px",
                            backgroundColor: "rgba(30, 41, 59, 0.4)",
                            color: "#94a3b8",
                            fontSize: 15,
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                            border: "1px solid rgba(255, 255, 255, 0.04)",
                          }}
                        >
                          <span className="pulse-text">🧠 AI is reflecting<span>.</span><span>.</span><span>.</span></span>
                        </div>
                      </div>
                    )}
                    <div ref={chatEndRef} />
                  </div>

                  {/* Chat Input Footer */}
                  <div
                    style={{
                      padding: 24,
                      backgroundColor: "rgba(15, 23, 42, 0.6)",
                      borderTop: "1px solid rgba(255, 255, 255, 0.06)",
                    }}
                  >
                    <form onSubmit={sendMessage} style={{ display: "flex", gap: 14, alignItems: "flex-end" }}>
                      <textarea
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        disabled={loading || done || isCrisis}
                        placeholder={
                          isCrisis
                            ? "Crisis Hotline Active. Please review resources below."
                            : done
                            ? "Check-in complete! View your metrics dashboard."
                            : "Type your thoughts (e.g. how you slept, work stress)..."
                        }
                        rows={2}
                        style={{
                          flex: 1,
                          padding: "14px 18px",
                          borderRadius: 18,
                          border: "1px solid rgba(255, 255, 255, 0.12)",
                          fontSize: 15,
                          outline: "none",
                          resize: "none",
                          backgroundColor: done || isCrisis ? "rgba(15,23,42,0.6)" : "rgba(30, 41, 59, 0.3)",
                          color: "#f8fafc",
                          fontFamily: "inherit",
                          transition: "all 0.2s ease-in-out",
                        }}
                        onFocus={(e) => {
                          e.currentTarget.style.borderColor = "#6366f1";
                          e.currentTarget.style.backgroundColor = "rgba(30, 41, 59, 0.5)";
                        }}
                        onBlur={(e) => {
                          e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.12)";
                          e.currentTarget.style.backgroundColor = "rgba(30, 41, 59, 0.3)";
                        }}
                      />
                      <button
                        type="button"
                        onClick={handleVoiceInput}
                        disabled={loading || done || isCrisis}
                        className={isListening ? "recording-active" : ""}
                        style={{
                          padding: "14px",
                          borderRadius: 18,
                          border: "1px solid rgba(255, 255, 255, 0.12)",
                          background: "rgba(30, 41, 59, 0.3)",
                          color: "#cbd5e1",
                          fontSize: 18,
                          fontWeight: 700,
                          cursor: loading || done || isCrisis ? "not-allowed" : "pointer",
                          transition: "all 0.2s ease-in-out",
                          minHeight: 50,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          outline: "none"
                        }}
                        title={isListening ? "Listening... Click to stop" : "Dictate check-in (Speech-to-Text)"}
                      >
                        🎙️
                      </button>
                      <button
                        type="submit"
                        disabled={loading || done || isCrisis || !input.trim()}
                        style={{
                          padding: "14px 28px",
                          borderRadius: 18,
                          border: "none",
                          background:
                            loading || done || isCrisis || !input.trim()
                              ? "#334155"
                              : "linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)",
                          color: loading || done || isCrisis || !input.trim() ? "#64748b" : "#ffffff",
                          fontSize: 15,
                          fontWeight: 700,
                          cursor: loading || done || isCrisis || !input.trim() ? "not-allowed" : "pointer",
                          boxShadow:
                            loading || done || isCrisis || !input.trim()
                              ? "none"
                              : "0 10px 20px -5px rgba(99, 102, 241, 0.4)",
                          transition: "all 0.2s ease-in-out",
                          minHeight: 50,
                        }}
                      >
                        Send
                      </button>
                    </form>
                  </div>
                </main>

                {/* Extracted Metrics Dashboard */}
                {done && extractedData && (
                  <section
                    style={{
                      backgroundColor: "rgba(30, 41, 59, 0.4)",
                      backdropFilter: "blur(24px)",
                      borderRadius: 28,
                      padding: 28,
                      border: "1px solid rgba(255, 255, 255, 0.08)",
                      boxShadow: "0 20px 40px -10px rgba(0,0,0,0.3)",
                      display: "flex",
                      flexDirection: "column",
                      gap: 24,
                    }}
                  >
                    <h3 style={{ margin: 0, fontSize: 19, fontWeight: 800, color: "#34d399", display: "flex", alignItems: "center", gap: 10 }}>
                      📊 Real-time Extraction Results
                    </h3>

                    {/* Score Progress Bars */}
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 20 }}>
                      {/* Mood Card */}
                      <div style={{ padding: 18, backgroundColor: "rgba(15, 23, 42, 0.3)", borderRadius: 20, border: "1px solid rgba(255,255,255,0.04)" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
                          <span style={{ fontSize: 14, fontWeight: 600, color: "#94a3b8" }}>Mood Score</span>
                          <span style={{ fontSize: 14, fontWeight: 800, color: "#6366f1" }}>{extractedData.moodScore}/10</span>
                        </div>
                        <div style={{ height: 10, backgroundColor: "rgba(255,255,255,0.06)", borderRadius: 5, overflow: "hidden" }}>
                          <div
                            style={{
                              height: "100%",
                              width: `${extractedData.moodScore * 10}%`,
                              background: "linear-gradient(90deg, #6366f1, #818cf8)",
                              borderRadius: 5,
                              boxShadow: "0 0 10px rgba(99,102,241,0.5)",
                              transition: "width 1.2s cubic-bezier(0.4, 0, 0.2, 1)",
                            }}
                          />
                        </div>
                      </div>

                      {/* Energy Card */}
                      <div style={{ padding: 18, backgroundColor: "rgba(15, 23, 42, 0.3)", borderRadius: 20, border: "1px solid rgba(255,255,255,0.04)" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
                          <span style={{ fontSize: 14, fontWeight: 600, color: "#94a3b8" }}>Energy Level</span>
                          <span style={{ fontSize: 14, fontWeight: 800, color: "#10b981" }}>{extractedData.energy}/10</span>
                        </div>
                        <div style={{ height: 10, backgroundColor: "rgba(255,255,255,0.06)", borderRadius: 5, overflow: "hidden" }}>
                          <div
                            style={{
                              height: "100%",
                              width: `${extractedData.energy * 10}%`,
                              background: "linear-gradient(90deg, #10b981, #34d399)",
                              borderRadius: 5,
                              boxShadow: "0 0 10px rgba(16,185,129,0.5)",
                              transition: "width 1.2s cubic-bezier(0.4, 0, 0.2, 1)",
                            }}
                          />
                        </div>
                      </div>

                      {/* Sleep Card */}
                      <div style={{ padding: 18, backgroundColor: "rgba(15, 23, 42, 0.3)", borderRadius: 20, border: "1px solid rgba(255,255,255,0.04)", display: "flex", flexDirection: "column", justifyContent: "center" }}>
                        <span style={{ fontSize: 14, fontWeight: 600, color: "#94a3b8", display: "block", marginBottom: 6 }}>Sleep Duration</span>
                        <span style={{ fontSize: 22, fontWeight: 900, color: "#f8fafc" }}>
                          {extractedData.sleep ? `${extractedData.sleep} hours` : "N/A"}
                        </span>
                      </div>
                    </div>

                    {/* Summary Box */}
                    <div style={{ padding: 18, backgroundColor: "rgba(16, 185, 129, 0.05)", border: "1px solid rgba(16, 185, 129, 0.15)", borderRadius: 20 }}>
                      <span style={{ fontSize: 12, fontWeight: 800, color: "#34d399", textTransform: "uppercase", display: "block", marginBottom: 6, letterSpacing: "0.5px" }}>
                        Companion Summary
                      </span>
                      <p style={{ margin: 0, fontSize: 15, color: "#a7f3d0", lineHeight: 1.6 }}>{extractedData.summary}</p>
                    </div>

                    {/* Worries & Tags */}
                    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                      {extractedData.worries && (
                        <div>
                          <span style={{ fontSize: 13, fontWeight: 700, color: "#94a3b8", display: "block", marginBottom: 8 }}>Worries Detected:</span>
                          <span style={{ fontSize: 14.5, color: "#fca5a5", backgroundColor: "rgba(239, 68, 68, 0.08)", border: "1px solid rgba(239, 68, 68, 0.15)", padding: "8px 16px", borderRadius: 12, display: "inline-block" }}>
                            😟 {extractedData.worries}
                          </span>
                        </div>
                      )}

                      <div>
                        <span style={{ fontSize: 13, fontWeight: 700, color: "#94a3b8", display: "block", marginBottom: 8 }}>Wellness Tags:</span>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                          {extractedData.tags.map((tag) => (
                            <span
                              key={tag}
                              style={{
                                fontSize: 12.5,
                                fontWeight: 650,
                                backgroundColor: "rgba(255,255,255,0.03)",
                                color: "#cbd5e1",
                                padding: "6px 14px",
                                borderRadius: 14,
                                border: "1px solid rgba(255,255,255,0.05)",
                              }}
                            >
                              #{tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Weekly Nudge Recommendations Checklist */}
                    {nudges.length > 0 && (
                      <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: 20 }}>
                        <h4 style={{ margin: "0 0 16px", fontSize: 16, fontWeight: 800, color: "#34d399" }}>
                          ✨ Generated Wellness Nudges (Personal Checklist)
                        </h4>
                        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                          {nudges.map((nudge, idx) => {
                            const nudgeId = `current-nudge-${idx}`;
                            const isCompleted = completedNudges[nudgeId] || false;
                            return (
                              <div
                                key={idx}
                                style={{
                                  backgroundColor: isCompleted ? "rgba(16, 185, 129, 0.1)" : "rgba(16, 185, 129, 0.05)",
                                  border: isCompleted ? "1px solid rgba(16, 185, 129, 0.4)" : "1px solid rgba(16, 185, 129, 0.15)",
                                  borderRadius: 16,
                                  padding: "14px 18px",
                                  fontSize: 14.5,
                                  color: isCompleted ? "#64748b" : "#a7f3d0",
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 14,
                                  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.02)",
                                  transition: "all 0.25s ease",
                                }}
                              >
                                <input
                                  type="checkbox"
                                  checked={isCompleted}
                                  onChange={(e) => {
                                    setCompletedNudges((prev) => ({
                                      ...prev,
                                      [nudgeId]: e.target.checked,
                                    }));
                                  }}
                                  style={{
                                    width: 18,
                                    height: 18,
                                    cursor: "pointer",
                                    accentColor: "#10b981",
                                  }}
                                />
                                <span style={{ fontSize: 20, filter: "drop-shadow(0 0 6px rgba(16,185,129,0.3))" }}>
                                  {CATEGORY_EMOJI[nudge.category] ?? "💡"}
                                </span>
                                <span style={{ textDecoration: isCompleted ? "line-through" : "none", flex: 1 }}>
                                  {nudge.message}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* CBT Guided Reframing Wizard */}
                    {extractedData.worries && (
                      <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: 20 }}>
                        <h4 style={{ margin: "0 0 16px", fontSize: 16, fontWeight: 800, color: "#a78bfa", display: "flex", alignItems: "center", gap: 8 }}>
                          🧠 CBT Thought Challenger Wizard
                        </h4>
                        
                        {cbtCompleted ? (
                          <div style={{ padding: "16px 20px", backgroundColor: "rgba(167, 139, 250, 0.08)", border: "1px solid rgba(167, 139, 250, 0.25)", borderRadius: 20 }}>
                            <span style={{ fontSize: 24, display: "block", marginBottom: 8 }}>🎉 Reframing Complete!</span>
                            <p style={{ margin: 0, fontSize: 14.5, color: "#cbd5e1", lineHeight: 1.6 }}>
                              Your reframed thought is registered:
                              <br />
                              <strong style={{ color: "#a78bfa", display: "block", marginTop: 8 }}>"{cbtReframedText}"</strong>
                              <br />
                              Cognitive flexibility exercises help retrain your brain to see alternative, healthier explanations. You did amazing today!
                            </p>
                            <button
                              onClick={() => {
                                setCbtCompleted(false);
                                setCbtStep(1);
                                setCbtEvidenceFor("");
                                setCbtEvidenceAgainst("");
                                setCbtControllable("");
                                setCbtReframedText("");
                              }}
                              style={{
                                marginTop: 12,
                                backgroundColor: "rgba(167, 139, 250, 0.15)",
                                border: "1px solid rgba(167, 139, 250, 0.3)",
                                color: "#c084fc",
                                padding: "6px 12px",
                                borderRadius: 10,
                                fontSize: 12,
                                fontWeight: 700,
                                cursor: "pointer",
                              }}
                            >
                              Restart Exercise
                            </button>
                          </div>
                        ) : (
                          <div style={{ backgroundColor: "rgba(15, 23, 42, 0.3)", border: "1px solid rgba(255,255,255,0.04)", borderRadius: 20, padding: 20 }}>
                            {/* Step Indicator */}
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                              <span style={{ fontSize: 12, fontWeight: 800, color: "#a78bfa", textTransform: "uppercase" }}>
                                Step {cbtStep} of 3
                              </span>
                              <div style={{ display: "flex", gap: 6 }}>
                                <div style={{ width: 24, height: 6, borderRadius: 3, backgroundColor: cbtStep >= 1 ? "#a78bfa" : "rgba(255,255,255,0.06)" }} />
                                <div style={{ width: 24, height: 6, borderRadius: 3, backgroundColor: cbtStep >= 2 ? "#a78bfa" : "rgba(255,255,255,0.06)" }} />
                                <div style={{ width: 24, height: 6, borderRadius: 3, backgroundColor: cbtStep >= 3 ? "#a78bfa" : "rgba(255,255,255,0.06)" }} />
                              </div>
                            </div>

                            {/* Step 1: Evidence */}
                            {cbtStep === 1 && (
                              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                                <p style={{ margin: 0, fontSize: 14, color: "#cbd5e1", lineHeight: 1.5 }}>
                                  You logged a worry: <strong style={{ color: "#fca5a5" }}>"{extractedData.worries}"</strong>. Let's inspect the evidence.
                                </p>
                                <div>
                                  <label style={{ fontSize: 12.5, fontWeight: 700, color: "#94a3b8", display: "block", marginBottom: 6 }}>
                                    What evidence supports this worry?
                                  </label>
                                  <input
                                    type="text"
                                    value={cbtEvidenceFor}
                                    onChange={(e) => setCbtEvidenceFor(e.target.value)}
                                    placeholder="e.g. I missed one deadline last week..."
                                    style={{
                                      width: "100%",
                                      padding: "10px 14px",
                                      borderRadius: 12,
                                      border: "1px solid rgba(255, 255, 255, 0.08)",
                                      backgroundColor: "rgba(30, 41, 59, 0.4)",
                                      color: "#f8fafc",
                                      fontSize: 13.5,
                                      outline: "none"
                                    }}
                                  />
                                </div>
                                <div>
                                  <label style={{ fontSize: 12.5, fontWeight: 700, color: "#94a3b8", display: "block", marginBottom: 6 }}>
                                    What evidence contradicts this worry?
                                  </label>
                                  <input
                                    type="text"
                                    value={cbtEvidenceAgainst}
                                    onChange={(e) => setCbtEvidenceAgainst(e.target.value)}
                                    placeholder="e.g. My boss said my work is generally excellent..."
                                    style={{
                                      width: "100%",
                                      padding: "10px 14px",
                                      borderRadius: 12,
                                      border: "1px solid rgba(255, 255, 255, 0.08)",
                                      backgroundColor: "rgba(30, 41, 59, 0.4)",
                                      color: "#f8fafc",
                                      fontSize: 13.5,
                                      outline: "none"
                                    }}
                                  />
                                </div>
                                <button
                                  onClick={() => setCbtStep(2)}
                                  disabled={!cbtEvidenceFor.trim() || !cbtEvidenceAgainst.trim()}
                                  style={{
                                    alignSelf: "flex-end",
                                    padding: "8px 16px",
                                    backgroundColor: (!cbtEvidenceFor.trim() || !cbtEvidenceAgainst.trim()) ? "#334155" : "#6366f1",
                                    color: (!cbtEvidenceFor.trim() || !cbtEvidenceAgainst.trim()) ? "#64748b" : "#ffffff",
                                    border: "none",
                                    borderRadius: 12,
                                    fontSize: 13,
                                    fontWeight: 700,
                                    cursor: "pointer",
                                  }}
                                >
                                  Next: Control Index
                                </button>
                              </div>
                            )}

                            {/* Step 2: Control */}
                            {cbtStep === 2 && (
                              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                                <p style={{ margin: 0, fontSize: 14, color: "#cbd5e1", lineHeight: 1.5 }}>
                                  Now, let's categorize what factors you can control vs. what is out of your hands.
                                </p>
                                <div>
                                  <label style={{ fontSize: 12.5, fontWeight: 700, color: "#94a3b8", display: "block", marginBottom: 6 }}>
                                    What can you control in this situation?
                                  </label>
                                  <input
                                    type="text"
                                    value={cbtControllable}
                                    onChange={(e) => setCbtControllable(e.target.value)}
                                    placeholder="e.g. Preparing my slide decks, sleeping early..."
                                    style={{
                                      width: "100%",
                                      padding: "10px 14px",
                                      borderRadius: 12,
                                      border: "1px solid rgba(255, 255, 255, 0.08)",
                                      backgroundColor: "rgba(30, 41, 59, 0.4)",
                                      color: "#f8fafc",
                                      fontSize: 13.5,
                                      outline: "none"
                                    }}
                                  />
                                </div>
                                <div style={{ display: "flex", justifyContent: "space-between" }}>
                                  <button
                                    onClick={() => setCbtStep(1)}
                                    style={{
                                      padding: "8px 16px",
                                      backgroundColor: "transparent",
                                      border: "1px solid rgba(255,255,255,0.1)",
                                      borderRadius: 12,
                                      color: "#94a3b8",
                                      fontSize: 13,
                                      fontWeight: 700,
                                      cursor: "pointer",
                                    }}
                                  >
                                    Back
                                  </button>
                                  <button
                                    onClick={() => setCbtStep(3)}
                                    disabled={!cbtControllable.trim()}
                                    style={{
                                      padding: "8px 16px",
                                      backgroundColor: !cbtControllable.trim() ? "#334155" : "#6366f1",
                                      color: !cbtControllable.trim() ? "#64748b" : "#ffffff",
                                      border: "none",
                                      borderRadius: 12,
                                      fontSize: 13,
                                      fontWeight: 700,
                                      cursor: "pointer",
                                    }}
                                  >
                                    Next: Reframe Thought
                                  </button>
                                </div>
                              </div>
                            )}

                            {/* Step 3: Reframe */}
                            {cbtStep === 3 && (
                              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                                <p style={{ margin: 0, fontSize: 14, color: "#cbd5e1", lineHeight: 1.5 }}>
                                  Finally, let's write a realistic, compassionate reframe of the worry that respects the evidence.
                                </p>
                                <div>
                                  <label style={{ fontSize: 12.5, fontWeight: 700, color: "#94a3b8", display: "block", marginBottom: 6 }}>
                                    Your Balanced Reframe:
                                  </label>
                                  <textarea
                                    value={cbtReframedText}
                                    onChange={(e) => setCbtReframedText(e.target.value)}
                                    placeholder="e.g. Even if I make a minor mistake, it's not the end of my job. I am prepared and will do my best."
                                    rows={3}
                                    style={{
                                      width: "100%",
                                      padding: "10px 14px",
                                      borderRadius: 12,
                                      border: "1px solid rgba(255, 255, 255, 0.08)",
                                      backgroundColor: "rgba(30, 41, 59, 0.4)",
                                      color: "#f8fafc",
                                      fontSize: 13.5,
                                      resize: "none",
                                      outline: "none"
                                    }}
                                  />
                                </div>
                                <div style={{ display: "flex", justifyContent: "space-between" }}>
                                  <button
                                    onClick={() => setCbtStep(2)}
                                    style={{
                                      padding: "8px 16px",
                                      backgroundColor: "transparent",
                                      border: "1px solid rgba(255,255,255,0.1)",
                                      borderRadius: 12,
                                      color: "#94a3b8",
                                      fontSize: 13,
                                      fontWeight: 700,
                                      cursor: "pointer",
                                    }}
                                  >
                                    Back
                                  </button>
                                  <button
                                    onClick={() => setCbtCompleted(true)}
                                    disabled={!cbtReframedText.trim()}
                                    style={{
                                      padding: "8px 16px",
                                      backgroundColor: !cbtReframedText.trim() ? "#334155" : "linear-gradient(135deg, #a78bfa 0%, #7c3aed 100%)",
                                      color: "#ffffff",
                                      border: "none",
                                      borderRadius: 12,
                                      fontSize: 13,
                                      fontWeight: 700,
                                      cursor: "pointer",
                                    }}
                                  >
                                    Reframer Reflected 🎉
                                  </button>
                                </div>
                              </div>
                            )}

                          </div>
                        )}
                      </div>
                    )}

                    {/* Collapse Trace Logs */}
                    <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: 18, marginTop: 6 }}>
                      <button
                        onClick={() => setShowCurrentTrace(!showCurrentTrace)}
                        style={{
                          background: "transparent",
                          border: "none",
                          color: "#38bdf8",
                          fontSize: 13.5,
                          fontWeight: 700,
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          gap: 6,
                          outline: "none"
                        }}
                      >
                        {showCurrentTrace ? "▲ Hide Pipeline Trace Logs" : "▼ Inspect Current Session Pipeline Logs"}
                      </button>
                      
                      {showCurrentTrace && (
                        <div style={{ marginTop: 14, padding: 16, backgroundColor: "rgba(15, 23, 42, 0.7)", borderRadius: 16, border: "1px solid rgba(255,255,255,0.05)", fontSize: 13, fontFamily: "monospace" }}>
                          <div style={{ color: "#38bdf8", fontWeight: 700, marginBottom: 8 }}>🔍 Extraction Agent JSON Payload:</div>
                          <pre style={{ overflowX: "auto", color: "#34d399", margin: 0, padding: 10, backgroundColor: "rgba(0,0,0,0.3)", borderRadius: 8 }}>
                            {JSON.stringify(extractedData, null, 2)}
                          </pre>
                          
                          <div style={{ color: "#c084fc", fontWeight: 700, marginTop: 14, marginBottom: 8 }}>💾 Memory Agent DB Query:</div>
                          <pre style={{ overflowX: "auto", color: "#cbd5e1", margin: 0, padding: 10, backgroundColor: "rgba(0,0,0,0.3)", borderRadius: 8 }}>
                            {`prisma.checkIn.create({
  data: {
    userId: "${USER_ID}",
    moodScore: ${extractedData.moodScore},
    energy: ${extractedData.energy},
    sleep: ${extractedData.sleep ?? "null"},
    summary: "${extractedData.summary.replace(/"/g, '\\"')}",
    worries: ${extractedData.worries ? `"${extractedData.worries}"` : "null"},
    tags: ${JSON.stringify(extractedData.tags)}
  }
})`}
                          </pre>

                          <div style={{ color: "#fbbf24", fontWeight: 700, marginTop: 14, marginBottom: 8 }}>🧠 Nudge Agent Prompt Context:</div>
                          <pre style={{ overflowX: "auto", color: "#fef08a", margin: 0, padding: 10, backgroundColor: "rgba(0,0,0,0.3)", borderRadius: 8, whiteSpace: "pre-wrap" }}>
                            {`System instructions: You are a personalized wellness nudge agent...
Context input: Current mood score ${extractedData.moodScore}/10. Summary: ${extractedData.summary}.`}
                          </pre>
                        </div>
                      )}
                    </div>
                  </section>
                )}
              </div>
            )}

            {/* Tab 2: History & Insights */}
            {activeTab === "history" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
                
                {/* Advanced Charts Section */}
                <section
                  className="glass-panel"
                  style={{
                    borderRadius: 28,
                    padding: 24,
                  }}
                >
                  <h3 style={{ margin: "0 0 20px", fontSize: 18, fontWeight: 800, color: "#38bdf8", display: "flex", alignItems: "center", gap: 10 }}>
                    📊 Historical Wellness Trend Charts
                  </h3>
                  
                  {chartN < 2 ? (
                    <div style={{ padding: "40px 20px", textAlign: "center", color: "#94a3b8", fontSize: 14.5, backgroundColor: "rgba(15,23,42,0.3)", borderRadius: 20, border: "1px solid rgba(255,255,255,0.04)" }}>
                      📊 <strong>Not enough history logs to generate analytics charts.</strong>
                      <p style={{ marginTop: 8, fontSize: 13, color: "#64748b" }}>
                        Please complete at least 2 check-ins, or run <code>npm run db:seed</code> to populate high-quality test data instantly.
                      </p>
                    </div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
                      
                      {/* Mood and Energy Lines Chart */}
                      <div style={{ backgroundColor: "rgba(15,23,42,0.2)", padding: "16px 10px", borderRadius: 20, border: "1px solid rgba(255,255,255,0.03)" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", padding: "0 14px", marginBottom: 12 }}>
                          <span style={{ fontSize: 13, color: "#94a3b8", fontWeight: 700 }}>Mood (Indigo) vs Energy (Emerald) Trends</span>
                          <span style={{ fontSize: 11, color: "#64748b" }}>Hover dots for details</span>
                        </div>
                        
                        <div style={{ position: "relative", width: "100%", height: 180 }}>
                          <svg viewBox="0 0 500 180" width="100%" height="100%">
                            <defs>
                              <linearGradient id="moodGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#6366f1" stopOpacity="0.25" />
                                <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
                              </linearGradient>
                              <linearGradient id="energyGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#10b981" stopOpacity="0.2" />
                                <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
                              </linearGradient>
                            </defs>
                            
                            {/* Grid Lines */}
                            <line x1="45" y1="20" x2="480" y2="20" stroke="rgba(255,255,255,0.06)" strokeDasharray="4 4" />
                            <line x1="45" y1="90" x2="480" y2="90" stroke="rgba(255,255,255,0.06)" strokeDasharray="4 4" />
                            <line x1="45" y1="160" x2="480" y2="160" stroke="rgba(255,255,255,0.15)" />
                            
                            {/* Y-axis Labels */}
                            <text x="35" y="24" fill="#64748b" fontSize="10" fontWeight="800" textAnchor="end">10</text>
                            <text x="35" y="94" fill="#64748b" fontSize="10" fontWeight="800" textAnchor="end">5</text>
                            <text x="35" y="164" fill="#64748b" fontSize="10" fontWeight="800" textAnchor="end">1</text>

                            {/* Glow Gradient Paths */}
                            {moodFillD && <path d={moodFillD} fill="url(#moodGradient)" />}
                            {energyFillD && <path d={energyFillD} fill="url(#energyGradient)" />}

                            {/* Stroke Paths */}
                            {moodPathD && <path d={moodPathD} stroke="#6366f1" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />}
                            {energyPathD && <path d={energyPathD} stroke="#10b981" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />}

                            {/* Data points */}
                            {chartData.map((d, i) => {
                              const x = getX(i);
                              const moodY = getY(d.moodScore);
                              const energyY = getY(d.energy);
                              const dateLabel = new Date(d.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric" });
                              
                              return (
                                <g key={d.id}>
                                  <circle
                                    cx={x}
                                    cy={moodY}
                                    r="4.5"
                                    fill="#6366f1"
                                    stroke="#020617"
                                    strokeWidth="2"
                                    className="chart-dot"
                                  >
                                    <title>{`Mood: ${d.moodScore}/10\nDate: ${dateLabel}\nSummary: ${d.summary}`}</title>
                                  </circle>
                                  <circle
                                    cx={x}
                                    cy={energyY}
                                    r="4.5"
                                    fill="#10b981"
                                    stroke="#020617"
                                    strokeWidth="2"
                                    className="chart-dot"
                                  >
                                    <title>{`Energy: ${d.energy}/10\nDate: ${dateLabel}\nSummary: ${d.summary}`}</title>
                                  </circle>
                                  
                                  {/* X-axis Label */}
                                  <text
                                    x={x}
                                    y="176"
                                    fill="#64748b"
                                    fontSize="9.5"
                                    fontWeight="700"
                                    textAnchor="middle"
                                  >
                                    {new Date(d.createdAt).toLocaleDateString(undefined, { weekday: "short" })}
                                  </text>
                                </g>
                              );
                            })}
                          </svg>
                        </div>
                      </div>

                      {/* Sleep Duration Bar Chart */}
                      <div style={{ backgroundColor: "rgba(15,23,42,0.2)", padding: "16px 10px", borderRadius: 20, border: "1px solid rgba(255,255,255,0.03)" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", padding: "0 14px", marginBottom: 12 }}>
                          <span style={{ fontSize: 13, color: "#94a3b8", fontWeight: 700 }}>Sleep Duration (Hours) History</span>
                          <span style={{ fontSize: 11, color: "#64748b" }}>Goal: 7-8 hours</span>
                        </div>

                        {sleepN === 0 ? (
                          <div style={{ padding: "20px 0", textAlign: "center", color: "#64748b", fontSize: 13.5 }}>
                            No sleep duration recorded in recent check-ins.
                          </div>
                        ) : (
                          <div style={{ position: "relative", width: "100%", height: 120 }}>
                            <svg viewBox="0 0 500 120" width="100%" height="100%">
                              {/* Baseline */}
                              <line x1="45" y1="95" x2="480" y2="95" stroke="rgba(255,255,255,0.15)" />
                              
                              {/* Y-axis Labels */}
                              <text x="35" y="30" fill="#64748b" fontSize="9" fontWeight="800" textAnchor="end">10h</text>
                              <text x="35" y="62" fill="#64748b" fontSize="9" fontWeight="800" textAnchor="end">5h</text>
                              <text x="35" y="95" fill="#64748b" fontSize="9" fontWeight="800" textAnchor="end">0h</text>

                              {/* Bars */}
                              {sleepData.map((d, i) => {
                                const x = sleepN === 1 ? 238 : 50 + i * (410 / (sleepN - 1)) - 12;
                                const hrs = d.sleep || 0;
                                const barHeight = Math.min(80, hrs * 6.5);
                                const y = 95 - barHeight;
                                const dayLabel = new Date(d.createdAt).toLocaleDateString(undefined, { weekday: "short" });

                                return (
                                  <g key={d.id}>
                                    <rect
                                      x={x}
                                      y={y}
                                      width="24"
                                      height={barHeight}
                                      rx="6"
                                      fill="#a78bfa"
                                      fillOpacity="0.15"
                                    />
                                    <rect
                                      x={x}
                                      y={y}
                                      width="24"
                                      height={barHeight}
                                      rx="6"
                                      fill="#a78bfa"
                                      className="chart-bar"
                                    >
                                      <title>{`Sleep: ${hrs} hours\nDate: ${new Date(d.createdAt).toLocaleDateString()}`}</title>
                                    </rect>
                                    
                                    {/* Hours text */}
                                    <text
                                      x={x + 12}
                                      y={y - 5}
                                      fill="#c084fc"
                                      fontSize="9.5"
                                      fontWeight="800"
                                      textAnchor="middle"
                                    >
                                      {`${hrs}h`}
                                    </text>

                                    {/* X label */}
                                    <text
                                      x={x + 12}
                                      y="110"
                                      fill="#64748b"
                                      fontSize="9.5"
                                      fontWeight="750"
                                      textAnchor="middle"
                                    >
                                      {dayLabel}
                                    </text>
                                  </g>
                                );
                              })}
                            </svg>
                          </div>
                        )}
                      </div>

                    </div>
                  )}
                </section>

                {/* Data-Driven Correlation Insights Card */}
                {correlations && (
                  <section
                    className="glass-panel"
                    style={{
                      borderRadius: 28,
                      padding: 24,
                    }}
                  >
                    <h3 style={{ margin: "0 0 16px", fontSize: 18, fontWeight: 800, color: "#a78bfa", display: "flex", alignItems: "center", gap: 8 }}>
                      🔗 Relational Wellness Correlations
                    </h3>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16 }}>
                      
                      {/* Correlation 1: Sleep vs Mood */}
                      <div style={{ padding: 18, backgroundColor: "rgba(15, 23, 42, 0.3)", borderRadius: 20, border: "1px solid rgba(255,255,255,0.04)" }}>
                        <span style={{ fontSize: 12, fontWeight: 800, color: "#a78bfa", textTransform: "uppercase", display: "block", marginBottom: 6 }}>
                          Sleep ➡️ Mood Correlation
                        </span>
                        {correlations.avgHighSleepMood && correlations.avgLowSleepMood ? (
                          <p style={{ margin: 0, fontSize: 14, color: "#cbd5e1", lineHeight: 1.5 }}>
                            On days with <strong>7.0+ hours</strong> of sleep, your mood averaged <strong style={{ color: "#34d399" }}>{correlations.avgHighSleepMood}/10</strong> (compared to <strong style={{ color: "#f87171" }}>{correlations.avgLowSleepMood}/10</strong> on low-sleep days).
                          </p>
                        ) : (
                          <p style={{ margin: 0, fontSize: 13.5, color: "#64748b" }}>
                            Log more sleep records to view sleep-to-mood correlations.
                          </p>
                        )}
                      </div>

                      {/* Correlation 2: Exercise vs Energy */}
                      <div style={{ padding: 18, backgroundColor: "rgba(15, 23, 42, 0.3)", borderRadius: 20, border: "1px solid rgba(255,255,255,0.04)" }}>
                        <span style={{ fontSize: 12, fontWeight: 800, color: "#10b981", textTransform: "uppercase", display: "block", marginBottom: 6 }}>
                          Exercise ➡️ Energy Boost
                        </span>
                        {correlations.avgExEnergy && correlations.avgWorkEnergy ? (
                          <p style={{ margin: 0, fontSize: 14, color: "#cbd5e1", lineHeight: 1.5 }}>
                            Checking in with the <strong style={{ color: "#34d399" }}>#exercise</strong> tag was associated with an average energy of <strong style={{ color: "#34d399" }}>{correlations.avgExEnergy}/10</strong> (vs <strong style={{ color: "#a78bfa" }}>{correlations.avgWorkEnergy}/10</strong> on #work days).
                          </p>
                        ) : (
                          <p style={{ margin: 0, fontSize: 13.5, color: "#64748b" }}>
                            Log check-ins tagged with #exercise and #work to compare energy averages.
                          </p>
                        )}
                      </div>

                    </div>
                  </section>
                )}

                {/* Weekly Patterns (AI Insights) */}
                <section
                  style={{
                    backgroundColor: "rgba(30, 41, 59, 0.4)",
                    backdropFilter: "blur(24px)",
                    borderRadius: 28,
                    padding: 28,
                    border: "1px solid rgba(255, 255, 255, 0.08)",
                    boxShadow: "0 20px 40px -10px rgba(0,0,0,0.3)",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                    <h3 style={{ margin: 0, fontSize: 19, fontWeight: 800, color: "#38bdf8", display: "flex", alignItems: "center", gap: 10 }}>
                      🧠 Weekly Pattern Analysis
                    </h3>
                    {latestPattern && (
                      <div style={{ display: "flex", gap: 10 }}>
                        <button
                          onClick={handlePrintClinicianSummary}
                          style={{
                            backgroundColor: "rgba(167, 139, 250, 0.12)",
                            color: "#a78bfa",
                            border: "1px solid rgba(167, 139, 250, 0.2)",
                            padding: "6px 14px",
                            borderRadius: 14,
                            fontSize: 12.5,
                            fontWeight: 700,
                            cursor: "pointer",
                            transition: "all 0.2s ease",
                            display: "flex",
                            alignItems: "center",
                            gap: 6
                          }}
                        >
                          📄 Print Medical Summary
                        </button>
                        <button
                          onClick={handleExportReport}
                          style={{
                            backgroundColor: "rgba(56, 189, 248, 0.12)",
                            color: "#38bdf8",
                            border: "1px solid rgba(56, 189, 248, 0.2)",
                            padding: "6px 14px",
                            borderRadius: 14,
                            fontSize: 12.5,
                            fontWeight: 700,
                            cursor: "pointer",
                            transition: "all 0.2s ease",
                            display: "flex",
                            alignItems: "center",
                            gap: 6
                          }}
                        >
                          📥 Export Weekly Report
                        </button>
                      </div>
                    )}
                  </div>

                  {loadingHistory ? (
                    <p style={{ color: "#94a3b8", fontSize: 15 }}>Analyzing database history records...</p>
                  ) : latestPattern ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                      {/* Trend Badge */}
                      <div>
                        <span style={{ fontSize: 13, color: "#94a3b8", display: "block", marginBottom: 6 }}>Mood Stability Trend</span>
                        <span
                          style={{
                            fontSize: 13,
                            fontWeight: 700,
                            backgroundColor:
                              latestPattern.moodTrend === "improving" ? "rgba(16, 185, 129, 0.12)" :
                              latestPattern.moodTrend === "stable" ? "rgba(56, 189, 248, 0.12)" : "rgba(251, 191, 36, 0.12)",
                            color:
                              latestPattern.moodTrend === "improving" ? "#34d399" :
                              latestPattern.moodTrend === "stable" ? "#38bdf8" : "#fbbf24",
                            padding: "6px 16px",
                            borderRadius: 20,
                            display: "inline-block",
                            textTransform: "capitalize",
                            border:
                              latestPattern.moodTrend === "improving" ? "1px solid rgba(16,185,129,0.15)" :
                              latestPattern.moodTrend === "stable" ? "1px solid rgba(56,189,248,0.15)" : "1px solid rgba(251,191,36,0.15)",
                          }}
                        >
                          📈 {latestPattern.moodTrend}
                        </span>
                      </div>

                      {/* Summary */}
                      <div>
                        <span style={{ fontSize: 13, color: "#94a3b8", display: "block", marginBottom: 6 }}>Weekly Insight Summary</span>
                        <p style={{ margin: 0, fontSize: 15, lineHeight: 1.7, color: "#cbd5e1" }}>
                          {latestPattern.summary}
                        </p>
                      </div>

                      {/* Detail Bullet Grid */}
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 20, borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: 20 }}>
                        {/* Triggers */}
                        {latestPattern.insights?.triggers?.length > 0 && (
                          <div>
                            <span style={{ fontSize: 13.5, fontWeight: 800, color: "#f87171", display: "block", marginBottom: 8 }}>Triggers Detected</span>
                            <ul style={{ margin: 0, paddingLeft: 18, fontSize: 14, color: "#94a3b8", lineHeight: 1.6 }}>
                              {latestPattern.insights.triggers.map((item: string, i: number) => (
                                <li key={i} style={{ marginBottom: 6 }}>{item}</li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* Boosters */}
                        {latestPattern.insights?.boosters?.length > 0 && (
                          <div>
                            <span style={{ fontSize: 13.5, fontWeight: 800, color: "#34d399", display: "block", marginBottom: 8 }}>Mood Boosters</span>
                            <ul style={{ margin: 0, paddingLeft: 18, fontSize: 14, color: "#94a3b8", lineHeight: 1.6 }}>
                              {latestPattern.insights.boosters.map((item: string, i: number) => (
                                <li key={i} style={{ marginBottom: 6 }}>{item}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>

                      {/* Historical Nudges checklist if populated */}
                      {historyNudges.length > 0 && (
                        <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: 20 }}>
                          <h4 style={{ margin: "0 0 14px", fontSize: 15, fontWeight: 800, color: "#eab308" }}>
                            ✨ Active Wellness Nudges (Seeded Habits)
                          </h4>
                          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                            {historyNudges.map((nudge, idx) => {
                              const nudgeId = `history-nudge-${idx}`;
                              const isCompleted = completedNudges[nudgeId] || false;
                              return (
                                <div
                                  key={idx}
                                  style={{
                                    backgroundColor: isCompleted ? "rgba(234, 179, 8, 0.08)" : "rgba(234, 179, 8, 0.04)",
                                    border: isCompleted ? "1px solid rgba(234, 179, 8, 0.3)" : "1px solid rgba(234, 179, 8, 0.12)",
                                    borderRadius: 14,
                                    padding: "12px 16px",
                                    fontSize: 14,
                                    color: isCompleted ? "#64748b" : "#fef08a",
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 12,
                                    transition: "all 0.25s ease",
                                  }}
                                >
                                  <input
                                    type="checkbox"
                                    checked={isCompleted}
                                    onChange={(e) => {
                                      setCompletedNudges((prev) => ({
                                        ...prev,
                                        [nudgeId]: e.target.checked,
                                      }));
                                    }}
                                    style={{
                                      width: 17,
                                      height: 17,
                                      cursor: "pointer",
                                      accentColor: "#eab308",
                                    }}
                                  />
                                  <span style={{ fontSize: 18 }}>
                                    {CATEGORY_EMOJI[nudge.category] ?? "💡"}
                                  </span>
                                  <span style={{ textDecoration: isCompleted ? "line-through" : "none", flex: 1 }}>
                                    {nudge.message}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div style={{ padding: "20px 0", textAlign: "center", color: "#94a3b8", fontSize: 14.5 }}>
                      💡 Not enough history. Complete at least **5 check-ins** to unlock weekly pattern analytics and mood boosters.
                    </div>
                  )}
                </section>

                {/* Past Logs */}
                <section
                  style={{
                    backgroundColor: "rgba(30, 41, 59, 0.4)",
                    backdropFilter: "blur(24px)",
                    borderRadius: 28,
                    padding: 28,
                    border: "1px solid rgba(255, 255, 255, 0.08)",
                    boxShadow: "0 20px 40px -10px rgba(0,0,0,0.3)",
                  }}
                >
                  <h3 style={{ margin: "0 0 20px", fontSize: 19, fontWeight: 800, color: "#cbd5e1" }}>
                    📜 Check-In History Log
                  </h3>

                  {loadingHistory ? (
                    <p style={{ color: "#94a3b8", fontSize: 15 }}>Fetching database history...</p>
                  ) : historyList.length > 0 ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                      {historyList.map((item) => {
                        const isExpanded = expandedTraces[item.id] || false;
                        return (
                          <div
                            key={item.id}
                            style={{
                              padding: 18,
                              backgroundColor: "rgba(15, 23, 42, 0.3)",
                              borderRadius: 20,
                              border: "1px solid rgba(255, 255, 255, 0.04)",
                              display: "flex",
                              flexDirection: "column",
                              gap: 10,
                            }}
                          >
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                              <span style={{ fontSize: 12.5, fontWeight: 600, color: "#64748b" }}>
                                {new Date(item.createdAt).toLocaleDateString(undefined, {
                                  weekday: "short",
                                  month: "short",
                                  day: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit"
                                })}
                              </span>
                              <div style={{ display: "flex", gap: 8 }}>
                                <span style={{ fontSize: 12, fontWeight: 800, color: "#6366f1", backgroundColor: "rgba(99,102,241,0.12)", padding: "3px 10px", borderRadius: 8, border: "1px solid rgba(99,102,241,0.15)" }}>
                                  Mood: {item.moodScore}
                                </span>
                                <span style={{ fontSize: 12, fontWeight: 800, color: "#10b981", backgroundColor: "rgba(16,185,129,0.12)", padding: "3px 10px", borderRadius: 8, border: "1px solid rgba(16,185,129,0.15)" }}>
                                  Energy: {item.energy}
                                </span>
                              </div>
                            </div>
                            <p style={{ margin: 0, fontSize: 14.5, color: "#cbd5e1", lineHeight: 1.5 }}>{item.summary}</p>
                            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, justifyContent: "space-between", alignItems: "center", marginTop: 4 }}>
                              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                                {item.tags.map((t) => (
                                  <span key={t} style={{ fontSize: 11.5, color: "#64748b" }}>#{t}</span>
                                ))}
                              </div>
                              
                              <button
                                onClick={() => {
                                  setExpandedTraces((prev) => ({
                                    ...prev,
                                    [item.id]: !isExpanded
                                  }));
                                }}
                                style={{
                                  background: "transparent",
                                  border: "none",
                                  color: "#38bdf8",
                                  fontSize: 12,
                                  fontWeight: 650,
                                  cursor: "pointer",
                                  outline: "none"
                                }}
                              >
                                {isExpanded ? "▲ Hide logs" : "▼ Inspect logs"}
                              </button>
                            </div>

                            {/* Expanded logs visualizer for history checks */}
                            {isExpanded && (
                              <div style={{ marginTop: 12, padding: 12, backgroundColor: "rgba(15, 23, 42, 0.7)", borderRadius: 16, border: "1px solid rgba(255,255,255,0.05)", fontSize: 12.5, fontFamily: "monospace" }}>
                                <div style={{ color: "#38bdf8", fontWeight: 700, marginBottom: 6 }}>🔍 Extraction Agent JSON Payload:</div>
                                <pre style={{ overflowX: "auto", color: "#34d399", margin: 0, padding: 8, backgroundColor: "rgba(0,0,0,0.3)", borderRadius: 8 }}>
                                  {JSON.stringify({
                                    moodScore: item.moodScore,
                                    energy: item.energy,
                                    sleep: item.sleep,
                                    summary: item.summary,
                                    worries: item.worries,
                                    tags: item.tags
                                  }, null, 2)}
                                </pre>
                                
                                <div style={{ color: "#c084fc", fontWeight: 700, marginTop: 10, marginBottom: 6 }}>💾 Memory Agent DB Query:</div>
                                <pre style={{ overflowX: "auto", color: "#e2e8f0", margin: 0, padding: 8, backgroundColor: "rgba(0,0,0,0.3)", borderRadius: 8 }}>
                                  {`prisma.checkIn.create({
  data: {
    userId: "${USER_ID}",
    moodScore: ${item.moodScore},
    energy: ${item.energy},
    sleep: ${item.sleep ?? "null"},
    summary: "${item.summary.replace(/"/g, '\\"')}",
    tags: ${JSON.stringify(item.tags)}
  }
})`}
                                </pre>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p style={{ color: "#94a3b8", textAlign: "center", padding: "32px 0", fontSize: 14.5 }}>
                      No check-ins logged yet. Go to the Check-In tab to log your first day!
                    </p>
                  )}
                </section>
              </div>
            )}

          </div>

          {/* Sidebar Area (Right Column) */}
          <div style={{ flex: "1 1 320px", display: "flex", flexDirection: "column", gap: 24 }}>
            
            {/* 1. Privacy & Security Shield Monitor */}
            <section
              style={{
                backgroundColor: "rgba(30, 41, 59, 0.4)",
                backdropFilter: "blur(16px)",
                borderRadius: 24,
                border: "1px solid rgba(255, 255, 255, 0.06)",
                padding: 24,
                boxShadow: "0 10px 30px rgba(0,0,0,0.2)",
              }}
            >
              <h4 style={{ margin: "0 0 16px", fontSize: 15, fontWeight: 800, color: "#34d399", display: "flex", alignItems: "center", gap: 6 }}>
                🔒 Privacy & Security Shield
              </h4>
              
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                
                {/* XSS Sanitizer */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 13, color: "#94a3b8" }}>Input Sanitization</span>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: "#10b981", backgroundColor: "rgba(16, 185, 129, 0.12)", padding: "3px 8px", borderRadius: 8, border: "1px solid rgba(16, 185, 129, 0.15)" }}>
                      ACTIVE
                    </span>
                    {sanitizedCount > 0 && (
                      <span style={{ fontSize: 10, color: "#fca5a5", fontWeight: 700 }}>
                        ({sanitizedCount} Cleaned)
                      </span>
                    )}
                  </div>
                </div>

                {/* Zod Validation */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 13, color: "#94a3b8" }}>Zod Validation Engine</span>
                  <span style={{ fontSize: 11, fontWeight: 700, color: "#10b981", backgroundColor: "rgba(16, 185, 129, 0.12)", padding: "3px 8px", borderRadius: 8, border: "1px solid rgba(16, 185, 129, 0.15)" }}>
                    PASS
                  </span>
                </div>

                {/* Crisis Intercept */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 13, color: "#94a3b8" }}>Crisis Monitor</span>
                  <span style={{ 
                    fontSize: 11, 
                    fontWeight: 700, 
                    color: isCrisis ? "#ef4444" : "#eab308", 
                    backgroundColor: isCrisis ? "rgba(239, 68, 68, 0.12)" : "rgba(234, 179, 8, 0.12)", 
                    padding: "3px 8px", 
                    borderRadius: 8, 
                    border: isCrisis ? "1px solid rgba(239, 68, 68, 0.15)" : "1px solid rgba(234, 179, 8, 0.15)" 
                  }}>
                    {isCrisis ? "HOTLINE TRIGGERED" : "STANDBY"}
                  </span>
                </div>

                {/* Rate Limiting */}
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: 13, color: "#94a3b8" }}>Rate Limiting</span>
                    <span style={{ fontSize: 11, fontWeight: 800, color: rateLimitRemaining < 5 ? "#ef4444" : "#38bdf8" }}>
                      {rateLimitRemaining}/20 Remaining
                    </span>
                  </div>
                  <div style={{ height: 4, backgroundColor: "rgba(255,255,255,0.06)", borderRadius: 2, overflow: "hidden" }}>
                    <div 
                      style={{
                        height: "100%",
                        width: `${(rateLimitRemaining / 20) * 100}%`,
                        backgroundColor: rateLimitRemaining < 5 ? "#ef4444" : "#38bdf8",
                        transition: "width 0.3s ease"
                      }}
                    />
                  </div>
                </div>

                {/* Database gateway details */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: 12 }}>
                  <span style={{ fontSize: 12.5, color: "#64748b" }}>Connection Pools</span>
                  <span style={{ fontSize: 12, color: "#e2e8f0", fontWeight: 500 }}>PgBouncer Gateway</span>
                </div>
                
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 12.5, color: "#64748b" }}>DB Architecture</span>
                  <span style={{ fontSize: 12, color: "#34d399", fontWeight: 600 }}>Supabase PostgreSQL</span>
                </div>

              </div>
            </section>

            {/* 1B. Programmatic Binaural Soundscapes Widget */}
            <section
              style={{
                backgroundColor: "rgba(30, 41, 59, 0.4)",
                backdropFilter: "blur(16px)",
                borderRadius: 24,
                border: "1px solid rgba(255, 255, 255, 0.06)",
                padding: 24,
                boxShadow: "0 10px 30px rgba(0,0,0,0.2)",
              }}
            >
              <h4 style={{ margin: "0 0 14px", fontSize: 15, fontWeight: 800, color: "#38bdf8", display: "flex", alignItems: "center", gap: 6 }}>
                🎵 Auditory Soundscapes (Binaural Beats)
              </h4>
              <p style={{ margin: "0 0 14px", fontSize: 12.5, color: "#94a3b8", lineHeight: 1.4 }}>
                Programmatic audio using the Web Audio API to induce calming delta/alpha frequencies. Use headphones.
              </p>

              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {/* Presets List */}
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {/* Preset 1: Relaxation */}
                  <button
                    onClick={() => {
                      if (audioPlaying === "relax") {
                        stopBinaural();
                      } else {
                        startBinaural("relax", 150, 10);
                      }
                    }}
                    style={{
                      padding: "8px 12px",
                      borderRadius: 14,
                      border: "1px solid rgba(255,255,255,0.06)",
                      backgroundColor: audioPlaying === "relax" ? "rgba(56, 189, 248, 0.15)" : "rgba(15,23,42,0.3)",
                      color: audioPlaying === "relax" ? "#38bdf8" : "#cbd5e1",
                      fontSize: 13,
                      fontWeight: 650,
                      cursor: "pointer",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      transition: "all 0.2s ease",
                    }}
                  >
                    <span>🧘 Alpha Relaxation (10Hz)</span>
                    <span style={{ fontSize: 11, color: "#64748b" }}>
                      {audioPlaying === "relax" ? "⏸️ PLAYING" : "▶️ PLAY"}
                    </span>
                  </button>

                  {/* Preset 2: Focus */}
                  <button
                    onClick={() => {
                      if (audioPlaying === "focus") {
                        stopBinaural();
                      } else {
                        startBinaural("focus", 200, 15);
                      }
                    }}
                    style={{
                      padding: "8px 12px",
                      borderRadius: 14,
                      border: "1px solid rgba(255,255,255,0.06)",
                      backgroundColor: audioPlaying === "focus" ? "rgba(167, 139, 250, 0.15)" : "rgba(15,23,42,0.3)",
                      color: audioPlaying === "focus" ? "#a78bfa" : "#cbd5e1",
                      fontSize: 13,
                      fontWeight: 650,
                      cursor: "pointer",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      transition: "all 0.2s ease",
                    }}
                  >
                    <span>⚡ Beta Focus (15Hz)</span>
                    <span style={{ fontSize: 11, color: "#64748b" }}>
                      {audioPlaying === "focus" ? "⏸️ PLAYING" : "▶️ PLAY"}
                    </span>
                  </button>

                  {/* Preset 3: Deep Sleep */}
                  <button
                    onClick={() => {
                      if (audioPlaying === "sleep") {
                        stopBinaural();
                      } else {
                        startBinaural("sleep", 100, 4);
                      }
                    }}
                    style={{
                      padding: "8px 12px",
                      borderRadius: 14,
                      border: "1px solid rgba(255,255,255,0.06)",
                      backgroundColor: audioPlaying === "sleep" ? "rgba(16, 185, 129, 0.15)" : "rgba(15,23,42,0.3)",
                      color: audioPlaying === "sleep" ? "#34d399" : "#cbd5e1",
                      fontSize: 13,
                      fontWeight: 650,
                      cursor: "pointer",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      transition: "all 0.2s ease",
                    }}
                  >
                    <span>🌌 Delta Deep Sleep (4Hz)</span>
                    <span style={{ fontSize: 11, color: "#64748b" }}>
                      {audioPlaying === "sleep" ? "⏸️ PLAYING" : "▶️ PLAY"}
                    </span>
                  </button>
                </div>

                {/* Volume Slider */}
                {audioPlaying && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 6, borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: 10 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#94a3b8" }}>
                      <span>Synth Volume</span>
                      <span>{Math.round(audioVolume * 100)}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="0.5"
                      step="0.01"
                      value={audioVolume}
                      onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                      style={{ width: "100%", accentColor: "#38bdf8", cursor: "pointer" }}
                    />
                  </div>
                )}
              </div>
            </section>

            {/* 1C. Predictive Mood Forecasting Widget */}
            <section
              style={{
                backgroundColor: "rgba(30, 41, 59, 0.4)",
                backdropFilter: "blur(16px)",
                borderRadius: 24,
                border: "1px solid rgba(255, 255, 255, 0.06)",
                padding: 24,
                boxShadow: "0 10px 30px rgba(0,0,0,0.2)",
              }}
            >
              <h4 style={{ margin: "0 0 14px", fontSize: 15, fontWeight: 800, color: "#a78bfa", display: "flex", alignItems: "center", gap: 6 }}>
                🔮 Predictive Mood Forecasting
              </h4>
              <p style={{ margin: "0 0 16px", fontSize: 12.5, color: "#94a3b8", lineHeight: 1.4 }}>
                Simulate tomorrow's stress indicators by adjusting sleep targets and schedule workload parameters.
              </p>

              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                {/* Sleep Slider */}
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#94a3b8", marginBottom: 6 }}>
                    <span>Tonight's Sleep Goal</span>
                    <span style={{ color: "#a78bfa", fontWeight: 700 }}>{plannedSleep.toFixed(1)} hrs</span>
                  </div>
                  <input
                    type="range"
                    min="4.0"
                    max="10.0"
                    step="0.5"
                    value={plannedSleep}
                    onChange={(e) => setPlannedSleep(parseFloat(e.target.value))}
                    style={{ width: "100%", accentColor: "#a78bfa", cursor: "pointer" }}
                  />
                </div>

                {/* Workload Select */}
                <div>
                  <span style={{ display: "block", fontSize: 12, color: "#94a3b8", marginBottom: 6 }}>
                    Tomorrow's Workload Intensity
                  </span>
                  <div style={{ display: "flex", gap: 8 }}>
                    {(["low", "medium", "high"] as const).map((intensity) => (
                      <button
                        key={intensity}
                        onClick={() => setWorkIntensity(intensity)}
                        style={{
                          flex: 1,
                          padding: "6px 8px",
                          borderRadius: 10,
                          border: "1px solid rgba(255,255,255,0.06)",
                          backgroundColor: workIntensity === intensity ? "rgba(167, 139, 250, 0.15)" : "rgba(15,23,42,0.3)",
                          color: workIntensity === intensity ? "#c084fc" : "#cbd5e1",
                          fontSize: 12,
                          fontWeight: 700,
                          textTransform: "capitalize",
                          cursor: "pointer",
                          transition: "all 0.2s ease"
                        }}
                      >
                        {intensity}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Prediction Result Gauge */}
                <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: 14, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div style={{ textAlign: "center", backgroundColor: "rgba(15,23,42,0.2)", padding: 10, borderRadius: 14, border: "1px solid rgba(255,255,255,0.02)" }}>
                    <span style={{ fontSize: 10.5, color: "#64748b", textTransform: "uppercase", display: "block", marginBottom: 4 }}>
                      Predicted Mood
                    </span>
                    <strong style={{ fontSize: 20, color: predictions.predictedMood >= 7 ? "#34d399" : predictions.predictedMood >= 5 ? "#fbbf24" : "#ef4444" }}>
                      {predictions.predictedMood}/10
                    </strong>
                  </div>
                  <div style={{ textAlign: "center", backgroundColor: "rgba(15,23,42,0.2)", padding: 10, borderRadius: 14, border: "1px solid rgba(255,255,255,0.02)" }}>
                    <span style={{ fontSize: 10.5, color: "#64748b", textTransform: "uppercase", display: "block", marginBottom: 4 }}>
                      Predicted Energy
                    </span>
                    <strong style={{ fontSize: 20, color: predictions.predictedEnergy >= 7 ? "#34d399" : predictions.predictedEnergy >= 5 ? "#fbbf24" : "#ef4444" }}>
                      {predictions.predictedEnergy}/10
                    </strong>
                  </div>
                </div>
              </div>
            </section>

            {/* 1D. Interactive Mindfulness Breathing Pacer Widget */}
            <section
              style={{
                backgroundColor: "rgba(30, 41, 59, 0.4)",
                backdropFilter: "blur(16px)",
                borderRadius: 24,
                border: "1px solid rgba(255, 255, 255, 0.06)",
                padding: 24,
                boxShadow: "0 10px 30px rgba(0,0,0,0.2)",
              }}
            >
              <h4 style={{ margin: "0 0 14px", fontSize: 15, fontWeight: 800, color: "#10b981", display: "flex", alignItems: "center", gap: 6 }}>
                🧘 Interactive Breathing Pacer
              </h4>
              <p style={{ margin: "0 0 16px", fontSize: 12.5, color: "#94a3b8", lineHeight: 1.4 }}>
                Soothe your nervous system with a rhythmic 4-second box breathing exercise.
              </p>

              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 20 }}>
                {/* Expanding / Contracting Pacer Dot Container */}
                <div style={{ 
                  width: 120, 
                  height: 120, 
                  borderRadius: "50%", 
                  backgroundColor: "rgba(15, 23, 42, 0.5)", 
                  border: "1px solid rgba(255,255,255,0.06)",
                  display: "flex", 
                  alignItems: "center", 
                  justifyContent: "center",
                  position: "relative"
                }}>
                  {/* Glowing Animated Outer Circle */}
                  <div style={{
                    width: 50,
                    height: 50,
                    borderRadius: "50%",
                    backgroundColor: !isBreathing ? "rgba(16, 185, 129, 0.2)" :
                      breathPhase === "In" ? "rgba(56, 189, 248, 0.25)" :
                      breathPhase === "Hold" ? "rgba(251, 191, 36, 0.25)" :
                      "rgba(167, 139, 250, 0.25)",
                    boxShadow: !isBreathing ? "0 0 12px rgba(16, 185, 129, 0.3)" :
                      breathPhase === "In" ? "0 0 20px rgba(56, 189, 248, 0.6)" :
                      breathPhase === "Hold" ? "0 0 20px rgba(251, 191, 36, 0.6)" :
                      "0 0 20px rgba(167, 139, 250, 0.6)",
                    transform: !isBreathing ? "scale(1)" :
                      breathPhase === "In" ? "scale(1.7)" :
                      breathPhase === "Hold" ? "scale(1.7)" :
                      "scale(1)",
                    opacity: !isBreathing ? 0.3 :
                      breathPhase === "In" ? 0.9 :
                      breathPhase === "Hold" ? 0.9 :
                      0.4,
                    transition: isBreathing ? "transform 4s linear, opacity 4s linear, background-color 0.5s ease" : "all 0.5s ease"
                  }} />

                  {/* Core Inner Icon */}
                  <span style={{ 
                    position: "absolute", 
                    fontSize: 22, 
                    zIndex: 2, 
                    filter: "drop-shadow(0 0 8px rgba(255,255,255,0.2))" 
                  }}>
                    {!isBreathing ? "🧘" :
                      breathPhase === "In" ? "💨" :
                      breathPhase === "Hold" ? "🛑" :
                      "🌬️"}
                  </span>
                </div>

                {/* Instruction / Phase Text */}
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 14, fontWeight: 800, color: "#f8fafc", minHeight: 20 }}>
                    {!isBreathing ? "Pacer Paused" :
                      breathPhase === "In" ? `Breathe In... (${breathTimer}s)` :
                      breathPhase === "Hold" ? `Hold... (${breathTimer}s)` :
                      `Breathe Out... (${breathTimer}s)`}
                  </div>
                  <span style={{ fontSize: 11, color: "#64748b", marginTop: 4, display: "block" }}>
                    {!isBreathing ? "Click start to begin breathing cycle" : 
                      breathPhase === "In" ? "Expand your lungs fully" :
                      breathPhase === "Hold" ? "Keep your lungs comfortably still" :
                      "Slowly release the tension"}
                  </span>
                </div>

                {/* Start / Stop Toggle Button */}
                <button
                  onClick={() => setIsBreathing(!isBreathing)}
                  style={{
                    width: "100%",
                    padding: "10px 14px",
                    borderRadius: 14,
                    border: "none",
                    background: isBreathing ? "rgba(239, 68, 68, 0.15)" : "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                    color: isBreathing ? "#ef4444" : "#ffffff",
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: "pointer",
                    transition: "all 0.2s ease-in-out",
                  }}
                >
                  {isBreathing ? "Stop Breathing Exercise" : "Start Breathing Exercise"}
                </button>
              </div>
            </section>

            {/* 2. Live Pipeline Visualizer Status */}
            <section
              style={{
                backgroundColor: "rgba(30, 41, 59, 0.4)",
                backdropFilter: "blur(16px)",
                borderRadius: 24,
                border: "1px solid rgba(255, 255, 255, 0.06)",
                padding: 24,
                boxShadow: "0 10px 30px rgba(0,0,0,0.2)",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                <h4 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: "#a78bfa", display: "flex", alignItems: "center", gap: 6 }}>
                  ⚙️ Orchestrator Pipeline
                </h4>
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    backgroundColor: "rgba(167, 139, 250, 0.12)",
                    color: "#a78bfa",
                    padding: "4px 10px",
                    borderRadius: 12,
                    border: "1px solid rgba(167, 139, 250, 0.15)",
                  }}
                >
                  {AGENT_INFO[agentState].name}
                </span>
              </div>
              <p style={{ margin: "0 0 16px", fontSize: 13.5, color: "#94a3b8", lineHeight: 1.4 }}>
                {AGENT_INFO[agentState].desc}
              </p>

              {/* Step Lights indicator */}
              <div style={{ display: "flex", gap: 8 }}>
                {(["checkin", "extraction", "memory", "pattern", "nudge"] as const).map((step, i) => {
                  const states = ["checkin", "extraction", "memory", "pattern", "nudge", "done"];
                  const currentIndex = states.indexOf(agentState);
                  const stepIndex = states.indexOf(step);
                  
                  let bg = "rgba(255, 255, 255, 0.1)"; // pending
                  let glow = "none";
                  let activeClass = "";
                  if (currentIndex > stepIndex) {
                    bg = "#10b981"; // completed
                    glow = "0 0 8px rgba(16, 185, 129, 0.4)";
                  } else if (currentIndex === stepIndex) {
                    bg = "#fbbf24"; // active
                    glow = "0 0 10px rgba(251, 191, 36, 0.5)";
                    activeClass = "active-light";
                  }

                  return (
                    <div
                      key={step}
                      className={activeClass}
                      title={`Agent: ${step}`}
                      style={{
                        flex: 1,
                        height: 6,
                        borderRadius: 3,
                        backgroundColor: bg,
                        boxShadow: glow,
                        transition: "all 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
                      }}
                    />
                  );
                })}
              </div>
            </section>

          </div>
        </div>

        {/* Footer */}
        <footer style={{ textAlign: "center", marginTop: 48, fontSize: 12, color: "#64748b", lineHeight: 1.6 }}>
          <p style={{ margin: "0 0 8px", fontStyle: "italic" }}>
            ⚠️ <strong>Disclaimer:</strong> This application is an AI-driven self-reflection tool designed for general wellness support. It does not replace professional medical advice, clinical diagnosis, or mental health treatment.
          </p>
          Daily Wellness Companion — Kaggle AI Agents Capstone · Built with Next.js 15, Prisma & Supabase
        </footer>
      </div>
      </div>

      {/* 4. Safety Sentinel Printable Clinical Report */}
      <div className="print-only" style={{ padding: 40, color: "#000000", backgroundColor: "#ffffff", fontFamily: "sans-serif" }}>
        <div style={{ borderBottom: "3px double #000000", paddingBottom: 15, marginBottom: 20 }}>
          <h1 style={{ margin: "0 0 6px", fontSize: 24, textTransform: "uppercase", letterSpacing: "1px" }}>
            🌿 Clinician Summary Report
          </h1>
          <span style={{ fontSize: 13, color: "#666" }}>
            Daily Mental Wellness Companion · AI-Generated Self-Reflection Log
          </span>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 24, fontSize: 13 }}>
          <div>
            <strong>Patient ID:</strong> {USER_ID}
            <br />
            <strong>Report Date:</strong> {mounted ? new Date().toLocaleDateString() : ""}
          </div>
          <div style={{ textAlign: "right" }}>
            <strong>Total Check-Ins:</strong> {historyList.length}
            <br />
            <strong>Status:</strong> Active Monitoring
          </div>
        </div>

        <div style={{ border: "1px solid #ccc", padding: 15, borderRadius: 8, marginBottom: 24, backgroundColor: "#f9f9f9" }}>
          <h3 style={{ margin: "0 0 8px", fontSize: 16 }}>📊 Weekly Pattern Summary</h3>
          {latestPattern ? (
            <p style={{ margin: 0, fontSize: 13, lineHeight: 1.5 }}>
              <strong>Stability Trend:</strong> {latestPattern.moodTrend.toUpperCase()}
              <br />
              <strong>Clinical Analysis:</strong> {latestPattern.summary}
            </p>
          ) : (
            <p style={{ margin: 0, fontSize: 13, color: "#777" }}>
              Insufficient history logs for pattern evaluation.
            </p>
          )}
        </div>

        <h3 style={{ fontSize: 16, borderBottom: "1px solid #ccc", paddingBottom: 6, marginBottom: 14 }}>
          📜 Detailed Check-In History
        </h3>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, marginBottom: 24 }}>
          <thead>
            <tr style={{ borderBottom: "2px solid #000", textAlign: "left" }}>
              <th style={{ padding: 8 }}>Date</th>
              <th style={{ padding: 8 }}>Mood</th>
              <th style={{ padding: 8 }}>Energy</th>
              <th style={{ padding: 8 }}>Sleep</th>
              <th style={{ padding: 8 }}>Worry Topics</th>
              <th style={{ padding: 8 }}>Tags</th>
            </tr>
          </thead>
          <tbody>
            {historyList.map((entry) => (
              <tr key={entry.id} style={{ borderBottom: "1px solid #eee" }}>
                <td style={{ padding: 8 }}>{new Date(entry.createdAt).toLocaleDateString()}</td>
                <td style={{ padding: 8 }}>{entry.moodScore}/10</td>
                <td style={{ padding: 8 }}>{entry.energy}/10</td>
                <td style={{ padding: 8 }}>{entry.sleep ? `${entry.sleep}h` : "N/A"}</td>
                <td style={{ padding: 8 }}>{entry.worries || "None"}</td>
                <td style={{ padding: 8 }}>{entry.tags.join(", ") || "None"}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div style={{ borderTop: "1px solid #ccc", paddingTop: 15, fontSize: 11, color: "#666", textAlign: "center", fontStyle: "italic", marginTop: 40 }}>
          Disclaimer: This report is a self-reported wellness journal compiling metrics parsed by NLP models. It is designed to assist, not replace, formal clinical diagnoses or treatment plans.
        </div>
      </div>

    </div>
  );
}
