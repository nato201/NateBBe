import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  MessageSquare,
  Send,
  Trash2,
  Sparkles,
  Bot,
  User,
  Clock,
  Plus,
  ArrowRight,
  Info,
  Maximize2,
  ChevronRight,
  HelpCircle,
  Copy,
  Check,
  AlertTriangle,
  Settings,
  Sliders,
  Maximize,
  Mail,
  Play,
  RefreshCw,
  Lock,
  Shield,
  Calendar,
  List,
  AlertCircle
} from "lucide-react";

interface Message {
  id: string;
  role: "user" | "model";
  text: string;
  timestamp: string;
}

const STARTER_PROMPTS = [
  {
    title: "Poetic Moods",
    text: "Write a short, moody cyberpunk poem about a rain-slicked city in neo-tokyo.",
    icon: "🪐",
  },
  {
    title: "AI & Tech",
    text: "Explain quantum computing in 3 simple sentences that a child would understand.",
    icon: "⚡",
  },
  {
    title: "Creative Brainstorm",
    text: "Give me 5 unique, out-of-the-box sci-fi space app design ideas.",
    icon: "💡",
  },
  {
    title: "Code Structuring",
    text: "Write a clean TypeScript interface for a telemetry tracking device with comments.",
    icon: "💻",
  },
];

export default function App() {
  // Chat History States
  const [messages, setMessages] = useState<Message[]>(() => {
    const saved = localStorage.getItem("nat_bbe_chats");
    return saved
      ? JSON.parse(saved)
      : [
          {
            id: "initial-welcome",
            role: "model",
            text: "Hello! I am **Nat bbe**, your ultra-sleek, witty and highly responsive AI companion. \n\nI was crafted to provide intelligent, beautifully structured answers. How can I inspire your mind today?\n\n*Try choosing one of the dynamic starter cards below, or send me a unique prompt!*",
            timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          },
        ];
  });

  // Tab workspace state switcher
  const [activeTab, setActiveTab] = useState<"chat" | "morning">("chat");

  // Morning Companion States
  const [morningConfig, setMorningConfig] = useState({
    enabled: false,
    timeString: "08:00",
    stylePrompt: "Breathtaking watercolor sunrise over mountains, elegant digital art, warm golden light, peaceful motivational theme",
    recipientEmail: "natomeko@gmail.com",
    hasToken: false,
    lastSentDate: ""
  });

  const [clientId, setClientId] = useState(() => {
    return localStorage.getItem("nat_bbe_google_client_id") || "";
  });
  const [manualToken, setManualToken] = useState("");
  const [morningLogs, setMorningLogs] = useState<any[]>([]);
  const [saveLoading, setSaveLoading] = useState(false);
  const [testSendLoading, setTestSendLoading] = useState(false);
  const [successToast, setSuccessToast] = useState<string | null>(null);
  const [errorToast, setErrorToast] = useState<string | null>(null);

  // Load and fetch initial configurations
  const fetchConfig = async () => {
    try {
      const res = await fetch("/api/morning-config");
      if (res.ok) {
        const data = await res.json();
        setMorningConfig(data);
      }
    } catch (err) {
      console.error("Failed to fetch config:", err);
    }
  };

  const fetchLogs = async () => {
    try {
      const res = await fetch("/api/morning-logs");
      if (res.ok) {
        const data = await res.json();
        setMorningLogs(data);
      }
    } catch (err) {
      console.error("Failed to fetch logs:", err);
    }
  };

  const showSuccessMessage = (msg: string) => {
    setSuccessToast(msg);
    setTimeout(() => setSuccessToast(null), 4000);
  };

  const showErrorMessage = (msg: string) => {
    setErrorToast(msg);
    setTimeout(() => setErrorToast(null), 5000);
  };

  // Run on mount
  useEffect(() => {
    fetchConfig();
    fetchLogs();
    
    // Poll logs every 20 seconds to keep dashboard dynamic
    const logInterval = setInterval(() => {
      fetchLogs();
    }, 20000);
    return () => clearInterval(logInterval);
  }, []);

  // Capture Implicit Flow access_token in hash redirect
  useEffect(() => {
    const hash = window.location.hash;
    if (hash && hash.includes("access_token")) {
      const params = new URLSearchParams(hash.substring(1));
      const token = params.get("access_token");
      if (token) {
        window.history.replaceState(null, "", window.location.pathname);
        handleSaveAccessToken(token);
      }
    }
  }, []);

  const handleSaveAccessToken = async (token: string) => {
    try {
      setSaveLoading(true);
      const res = await fetch("/api/morning-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accessToken: token, enabled: true })
      });
      if (res.ok) {
        showSuccessMessage("Linked Gmail successfully & enabled autopilot morning schedule!");
        fetchConfig();
        fetchLogs();
      } else {
        const d = await res.json();
        showErrorMessage(d.message || "Failed to save OAuth token.");
      }
    } catch (err: any) {
      showErrorMessage(err.toString());
    } finally {
      setSaveLoading(false);
    }
  };

  const handleUpdateConfig = async (updatedFields: Partial<typeof morningConfig>) => {
    try {
      setSaveLoading(true);
      const payload = {
        ...updatedFields,
        timezoneOffset: new Date().getTimezoneOffset() // automatically dynamic
      };
      const res = await fetch("/api/morning-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        showSuccessMessage("Morning settings updated and synchronized with server.");
        fetchConfig();
        fetchLogs();
      } else {
        const d = await res.json();
        showErrorMessage(d.message || "Failed to update settings.");
      }
    } catch (err: any) {
      showErrorMessage(err.toString());
    } finally {
      setSaveLoading(false);
    }
  };

  const handleTestSendNow = async (tokenOverride?: string) => {
    try {
      setTestSendLoading(true);
      const payload: any = {
        recipientEmail: morningConfig.recipientEmail,
        stylePrompt: morningConfig.stylePrompt
      };
      if (tokenOverride) {
        payload.accessToken = tokenOverride;
      }
      
      const res = await fetch("/api/morning-send-test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      
      const d = await res.json();
      if (res.ok) {
        showSuccessMessage(`Breathtaking morning picture and poem dispatched to ${morningConfig.recipientEmail}! Check your inbox.`);
        fetchConfig();
        fetchLogs();
      } else {
        showErrorMessage(d.message || d.error || "Delivery execution failed.");
        fetchLogs();
      }
    } catch (err: any) {
      showErrorMessage(err.toString());
    } finally {
      setTestSendLoading(false);
    }
  };

  const handleOAuthLogin = () => {
    if (!clientId.trim()) {
      showErrorMessage("Google Client ID is required to authorize.");
      return;
    }
    localStorage.setItem("nat_bbe_google_client_id", clientId);
    const redirectUri = encodeURIComponent(window.location.origin);
    const scope = encodeURIComponent("https://www.googleapis.com/auth/gmail.send");
    const state = encodeURIComponent("nat_bbe_oauth_flow");
    const flowUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId.trim()}&redirect_uri=${redirectUri}&response_type=token&scope=${scope}&state=${state}`;
    window.location.href = flowUrl;
  };

  // UI States
  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [apiKeyError, setApiKeyError] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [textSize, setTextSize] = useState<"sm" | "base" | "lg">("base");
  const [sessionStartTime] = useState<Date>(new Date());
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Sync with LocalStorage
  useEffect(() => {
    localStorage.setItem("nat_bbe_chats", JSON.stringify(messages));
  }, [messages]);

  // Session timer ticker
  useEffect(() => {
    const interval = setInterval(() => {
      setElapsedSeconds(Math.floor((new Date().getTime() - sessionStartTime.getTime()) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [sessionStartTime]);

  // Keep bottom elements visible
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  // Time Formatter
  const formatElapsed = () => {
    const min = Math.floor(elapsedSeconds / 60);
    const sec = elapsedSeconds % 60;
    return `${min}:${sec.toString().padStart(2, "0")}`;
  };

  // Click Copy helper
  const handleCopyMessage = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1800);
  };

  // Reset/Clear conversation history
  const handleResetChat = () => {
    if (confirm("Are you sure you want to clear your conversation with Nat bbe?")) {
      const resetState: Message[] = [
        {
          id: `welcome-${Date.now()}`,
          role: "model",
          text: "Let's begin anew! I am pristine and ready to support your creative thinking. What's on your mind?",
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ];
      setMessages(resetState);
      setApiKeyError(null);
    }
  };

  // Core Send Trigger
  const handleSendMessage = async (customPrompt?: string) => {
    const currentInput = (customPrompt || inputMessage).trim();
    if (!currentInput || isLoading) return;

    // Build the user message block
    const userMsg: Message = {
      id: `user-${Date.now()}`,
      role: "user",
      text: currentInput,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setInputMessage("");
    setIsLoading(true);
    setApiKeyError(null);

    try {
      // Proxy request to Express server `/api/chat`
      // Send the latest 15 messages for context pruning, keeping the conversation lightweight
      const payloadMessages = updatedMessages.slice(-15).map((m) => ({
        role: m.role,
        text: m.text,
      }));

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: payloadMessages }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.error === "API_KEY_REQUIRED") {
          throw new Error("API_KEY_REQUIRED");
        }
        throw new Error(data.message || "Something went wrong.");
      }

      const assistantMsg: Message = {
        id: `nat-${Date.now()}`,
        role: "model",
        text: data.reply,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: any) {
      console.error(err);
      if (err.message === "API_KEY_REQUIRED") {
        setApiKeyError(
          "No Gemini API key detected! Please navigate to Settings > Secrets in the AI Studio sidebar/UI, add your GEMINI_API_KEY, and it will link here automatically."
        );
      } else {
        setApiKeyError(err.message || "Failed to receive a response from Nat bbe. Please verify backend state.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Dynamic Inline Markdown Parser
  const renderMessageText = (text: string) => {
    if (!text) return null;

    // Segment standard blocks versus code blocks
    const parts = text.split(/(```[\s\S]*?```)/g);

    return parts.map((part, index) => {
      if (part.startsWith("```") && part.endsWith("```")) {
        const content = part.slice(3, -3);
        const lines = content.split("\n");
        const language = lines[0].trim() || "code";
        const code = lines.slice(1).join("\n").trim();

        return (
          <div
            key={index}
            className="my-3 overflow-hidden rounded-xl border border-white/5 bg-zinc-950/60 font-mono text-xs text-zinc-300"
          >
            <div className="flex items-center justify-between border-b border-white/5 bg-zinc-900/40 px-4 py-2 text-[10px] uppercase tracking-widest text-zinc-500">
              <span>{language}</span>
              <button
                onClick={() => navigator.clipboard.writeText(code)}
                className="hover:text-violet-400 transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <Copy className="size-3" /> Copy
              </button>
            </div>
            <pre className="overflow-x-auto p-4 leading-relaxed whitespace-pre font-mono">
              <code>{code}</code>
            </pre>
          </div>
        );
      } else {
        const lines = part.split("\n");
        return lines.map((line, lineIdx) => {
          // Bullets
          if (line.match(/^\s*[\-\*]\s+/)) {
            const content = line.replace(/^\s*[\-\*]\s+/, "");
            return (
              <div key={`${index}-${lineIdx}`} className="flex items-start gap-2.5 my-1.5 text-zinc-300">
                <span className="text-violet-500 mt-1.5 font-sans text-xs select-none">✦</span>
                <span className="flex-1 leading-relaxed text-zinc-300">{parseInlineMarkdown(content)}</span>
              </div>
            );
          }

          // Numbered lists
          if (line.match(/^\s*\d+\.\s+/)) {
            const num = line.match(/^\s*(\d+)\.\s+/)?.[1] || "1";
            const content = line.replace(/^\s*\d+\.\s+/, "");
            return (
              <div key={`${index}-${lineIdx}`} className="flex items-start gap-2.5 my-1.5 text-zinc-300">
                <span className="text-violet-400 font-mono text-xs mt-1 select-none font-bold">{num}.</span>
                <span className="flex-1 leading-relaxed text-zinc-300">{parseInlineMarkdown(content)}</span>
              </div>
            );
          }

          // Headings
          if (line.startsWith("### ")) {
            return (
              <h4 key={`${index}-${lineIdx}`} className="text-sm font-semibold text-white mt-4 mb-1.5 tracking-tight flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-violet-500" /> {parseInlineMarkdown(line.slice(4))}
              </h4>
            );
          }
          if (line.startsWith("## ")) {
            return (
              <h3 key={`${index}-${lineIdx}`} className="text-base font-bold text-violet-200 mt-5 mb-2.5 tracking-tight">
                {parseInlineMarkdown(line.slice(3))}
              </h3>
            );
          }

          // Standard paragraph
          return line.trim() === "" ? (
            <div key={`${index}-${lineIdx}`} className="h-2" />
          ) : (
            <p key={`${index}-${lineIdx}`} className="leading-relaxed text-zinc-300 my-1 justify-normal">
              {parseInlineMarkdown(line)}
            </p>
          );
        });
      }
    });
  };

  const parseInlineMarkdown = (text: string) => {
    // Standard bold (`**bold**`) and inline code (`code`) parser
    let parts: Array<string | React.ReactNode> = [text];

    parts = parts.flatMap((part) => {
      if (typeof part !== "string") return part;
      const pieces = part.split(/\*\*([\s\S]*?)\*\*/g);
      return pieces.map((piece, i) =>
        i % 2 === 1 ? (
          <strong key={`bold-${i}`} className="font-semibold text-white">
            {piece}
          </strong>
        ) : (
          piece
        )
      );
    });

    parts = parts.flatMap((part) => {
      if (typeof part !== "string") return part;
      const pieces = part.split(/`([^`]+)`/g);
      return pieces.map((piece, i) =>
        i % 2 === 1 ? (
          <code key={`code-${i}`} className="font-mono bg-zinc-950 px-1.5 py-0.5 rounded text-xs text-violet-300/90 border border-white/[0.04]">
            {piece}
          </code>
        ) : (
          piece
        )
      );
    });

    return parts;
  };

  const getTextSizeClass = () => {
    if (textSize === "sm") return "text-[13px]";
    if (textSize === "lg") return "text-[16px]";
    return "text-[14.5px]";
  };
  // Morning Dashboard HTML/JSX
  const renderMorningDashboard = () => {
    return (
      <div className="flex-1 overflow-y-auto px-6 md:px-8 py-8 space-y-8 z-10 scroll-smooth">
        <div className="max-w-4xl mx-auto space-y-8">
          
          {/* Main Title Banner */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-850/60 pb-6">
            <div>
              <div className="text-[10px] font-mono tracking-widest text-violet-400 uppercase font-black mb-1 flex items-center gap-1.5">
                <Sparkles className="size-3 my-0.5" /> Intelligence Synthesis
              </div>
              <h2 className="text-2xl font-black text-white tracking-tight">Morning Visual Autopilot</h2>
              <p className="text-zinc-550 text-xs mt-1">
                Generate custom morning imagery with Gemini and schedule daily delivery directly to your Gmail inbox.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => { fetchConfig(); fetchLogs(); showSuccessMessage("Refreshed server status!"); }}
                className="p-3 bg-zinc-900 border border-white/5 hover:bg-zinc-800 rounded-xl transition cursor-pointer text-zinc-400 group"
                title="Refresh Status"
              >
                <RefreshCw className="size-4 group-hover:rotate-45 transition-transform" />
              </button>
              <div className="text-xs bg-zinc-900 border border-white/5 py-2 px-3.5 rounded-xl flex items-center gap-2 font-mono text-zinc-400">
                <span className={`w-2 h-2 rounded-full ${morningConfig.enabled && morningConfig.hasToken ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)]" : "bg-zinc-650"}`} />
                {morningConfig.enabled && morningConfig.hasToken ? "AUTOPILOT INJECTED" : "INACTIVE"}
              </div>
            </div>
          </div>

          {/* Quick Notice Banner if credentials aren't linked */}
          {!morningConfig.hasToken && (
            <div className="bg-amber-950/20 border border-amber-900/40 p-5 rounded-2xl flex items-start gap-4 shadow-lg shadow-amber-950/5">
              <AlertCircle className="size-5 text-amber-500 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <h4 className="text-xs font-bold text-amber-300 uppercase tracking-wide">Gmail Authentication Required</h4>
                <p className="text-[11px] leading-relaxed text-amber-200/80">
                  Daily automated schedules call the Google Gmail REST API. To authorize sending morning pictures from your email account, please establish a connection below using standard Google auth.
                </p>
              </div>
            </div>
          )}

          {/* Configuration Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Card 1: Configuration */}
            <div className="bg-zinc-950/60 border border-white/5 rounded-2xl p-6 space-y-6 shadow-xl relative overflow-hidden">
              <div className="absolute top-0 left-0 w-20 h-[1px] bg-gradient-to-r from-violet-500 to-transparent" />
              
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-violet-950/40 border border-violet-800/20 text-violet-400 rounded-xl">
                  <Mail className="size-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-widest text-white">Recipient & Settings</h3>
                  <p className="text-[10px] text-zinc-500">Destination parameters</p>
                </div>
              </div>

              <div className="space-y-4 text-xs">
                {/* Recipient Email Input */}
                <div className="space-y-2">
                  <label className="text-[11px] text-zinc-400 font-bold block uppercase tracking-wider">
                    Recipient Email Address
                  </label>
                  <input
                    type="email"
                    value={morningConfig.recipientEmail}
                    onChange={(e) => setMorningConfig({ ...morningConfig, recipientEmail: e.target.value })}
                    className="w-full bg-[#111113] border border-zinc-800/80 rounded-xl px-4 py-3 text-zinc-100 placeholder-zinc-750 font-medium focus:outline-none focus:border-violet-500/80 transition"
                    placeholder="user@gmail.com"
                  />
                </div>

                {/* Target Hours Select */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[11px] text-zinc-400 font-bold block uppercase tracking-wider">
                      Autopilot Schedule
                    </label>
                    <input
                      type="time"
                      value={morningConfig.timeString}
                      onChange={(e) => setMorningConfig({ ...morningConfig, timeString: e.target.value })}
                      className="w-full bg-[#111113] border border-zinc-805 rounded-xl px-4 py-3 text-zinc-100 font-medium font-mono focus:outline-none focus:border-violet-500/80 transition"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[11px] text-zinc-400 font-bold block uppercase tracking-wider">
                      Current Target Timezone
                    </label>
                    <div className="w-full bg-zinc-900/30 border border-zinc-850 rounded-xl px-4 py-3 text-zinc-500 font-medium font-mono">
                      GMT {new Date().getTimezoneOffset() > 0 ? "-" : "+"}{Math.abs(Math.floor(new Date().getTimezoneOffset() / 60))} ({Math.abs(new Date().getTimezoneOffset())}m delay)
                    </div>
                  </div>
                </div>

                {/* Autopilot Scheduler Active switch */}
                <div className="flex items-center justify-between p-4 bg-zinc-900/10 border border-zinc-850 rounded-xl">
                  <div className="space-y-0.5 pr-2">
                    <span className="text-zinc-200 font-semibold block">Enable Autopilot Scheduling</span>
                    <span className="text-[10px] text-zinc-500 block">Sends image automatically every morning.</span>
                  </div>
                  <button
                    onClick={() => handleUpdateConfig({ enabled: !morningConfig.enabled })}
                    className={`shrink-0 w-11 h-6 rounded-full transition-colors relative duration-200 cursor-pointer ${morningConfig.enabled ? "bg-emerald-500" : "bg-zinc-800"}`}
                  >
                    <span className={`absolute top-1 left-1 bg-white ring-0 size-4 rounded-full shadow transition-transform ${morningConfig.enabled ? "translate-x-5" : "translate-x-0"}`} />
                  </button>
                </div>

                <button
                  onClick={() => handleUpdateConfig({
                    recipientEmail: morningConfig.recipientEmail,
                    timeString: morningConfig.timeString,
                  })}
                  disabled={saveLoading}
                  className="w-full py-3 px-4 rounded-xl font-bold bg-white text-black hover:bg-zinc-200 transition text-xs font-sans uppercase shadow cursor-pointer disabled:opacity-50"
                >
                  {saveLoading ? "Synchronizing..." : "Save Delivery settings"}
                </button>
              </div>
            </div>

            {/* Card 2: Custom Morning Prompters */}
            <div className="bg-zinc-950/60 border border-white/5 rounded-2xl p-6 space-y-5 shadow-xl relative overflow-hidden flex flex-col justify-between">
              <div className="absolute top-0 left-0 w-20 h-[1px] bg-gradient-to-r from-violet-500 to-transparent" />
              
              <div className="space-y-5">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-violet-950/40 border border-violet-800/20 text-violet-400 rounded-xl">
                    <Sliders className="size-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-widest text-white">Visual Synthesis prompt</h3>
                    <p className="text-[10px] text-zinc-500">Tune the daily digital art style</p>
                  </div>
                </div>

                <div className="space-y-2 text-xs">
                  <label className="text-[11px] text-zinc-400 font-bold block uppercase tracking-wider">
                    Creative Generation Style Instructions
                  </label>
                  <textarea
                    rows={4}
                    value={morningConfig.stylePrompt}
                    onChange={(e) => setMorningConfig({ ...morningConfig, stylePrompt: e.target.value })}
                    className="w-full bg-[#111113] border border-zinc-800 rounded-xl p-4 text-zinc-200 placeholder-zinc-700 font-medium leading-relaxed focus:outline-none focus:border-violet-500/80 transition"
                    placeholder="E.g., Cosmic minimal wallpaper, rich starry skies, soft blue accent, sunrise poem layout..."
                  />
                  <p className="text-[10px] text-zinc-500 italic mt-1 leading-relaxed">
                    This instructions profile determines morning image synthesis via the Gemini Imagen API. Poetic, cozy, or artistic directions work best!
                  </p>
                </div>
              </div>

              <button
                onClick={() => handleUpdateConfig({ stylePrompt: morningConfig.stylePrompt })}
                disabled={saveLoading}
                className="w-full py-3 px-4 rounded-xl font-bold bg-zinc-900 border border-zinc-800 text-zinc-300 hover:bg-zinc-800 hover:text-white transition text-xs font-sans uppercase tracking-widest cursor-pointer disabled:opacity-50 mt-4"
              >
                {saveLoading ? "Saving Style..." : "Update Style prompt"}
              </button>
            </div>

          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Card 3: OAuth Setup */}
            <div className="bg-zinc-950/60 border border-white/5 rounded-2xl p-6 space-y-6 shadow-xl relative overflow-hidden">
              <div className="absolute top-0 left-0 w-20 h-[1px] bg-gradient-to-r from-cyan-500 to-transparent" />
              
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-[#0e3040] border border-cyan-800/20 text-cyan-400 rounded-xl">
                  <Lock className="size-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-widest text-white">Google Gmail Authorization</h3>
                  <p className="text-[10px] text-zinc-500">Provide token or Client ID credentials</p>
                </div>
              </div>

              <div className="space-y-4 text-xs">
                {/* Method A: Direct paste token */}
                <div className="space-y-2.5 border-b border-zinc-900 pb-5">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] text-zinc-400 font-bold uppercase tracking-wider">
                      Option A: Fast-Pass Access Token (Testing)
                    </label>
                    <span className="text-[10px] text-violet-400 hover:underline cursor-pointer" onClick={() => window.open("https://developers.google.com/oauthplayground", "_blank")}>
                      Open OAuth Playground 🡥
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="password"
                      value={manualToken}
                      onChange={(e) => setManualToken(e.target.value)}
                      placeholder="Paste credentials token (starts with ya29...)"
                      className="flex-1 bg-[#111113] border border-zinc-850 rounded-xl px-4 py-2.5 text-zinc-200 font-mono text-xs focus:outline-none focus:border-cyan-500 transition"
                    />
                    <button
                      onClick={() => {
                        if (!manualToken.trim()) return;
                        handleSaveAccessToken(manualToken.trim());
                        setManualToken("");
                      }}
                      className="px-4 bg-zinc-900 border border-zinc-800 text-zinc-350 font-bold hover:bg-zinc-800 hover:text-white rounded-xl text-xs transition uppercase shrink-0 cursor-pointer"
                    >
                      Link
                    </button>
                  </div>
                  <p className="text-[10px] text-zinc-500 leading-relaxed">
                    Provides direct connection bypass on local viewports. Retrievable from Playground by picking `gmail.send` scope.
                  </p>
                </div>

                {/* Method B: Client ID flow */}
                <div className="space-y-3">
                  <label className="text-[11px] text-zinc-400 font-bold block uppercase tracking-wider">
                    Option B: Link Client Consent Screen (GCP Flow)
                  </label>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="text"
                      value={clientId}
                      onChange={(e) => setClientId(e.target.value)}
                      placeholder="Enter Google Client ID"
                      className="flex-1 bg-[#111113] border border-zinc-855 rounded-xl px-4 py-2.5 text-zinc-200 font-mono text-xs focus:outline-none focus:border-cyan-500 transition"
                    />
                    <button
                      onClick={handleOAuthLogin}
                      className="px-5 py-2.5 bg-gradient-to-r from-indigo-500 to-cyan-500 text-white font-bold rounded-xl text-xs transition uppercase shrink-0 shadow duration-200 hover:brightness-110 active:scale-95 cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <Shield className="size-3.5" /> Direct Sign-In
                    </button>
                  </div>
                  <div className="bg-zinc-900/40 p-3 rounded-lg border border-white/[0.02] text-[10.5px] text-zinc-550 leading-relaxed space-y-1">
                    <span className="font-bold text-zinc-450 block">Origin Callback Checklist:</span>
                    <p>Register origin whitelist URI: <code className="text-zinc-400 select-all font-mono">{window.location.origin}</code></p>
                  </div>
                </div>
              </div>
            </div>

            {/* Card 4: Manual Test Dispatch */}
            <div className="bg-zinc-950/60 border border-white/5 rounded-2xl p-6 space-y-6 shadow-xl relative overflow-hidden flex flex-col justify-between">
              <div className="absolute top-0 left-0 w-20 h-[1px] bg-gradient-to-r from-emerald-500 to-transparent" />
              
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-[#0e3725] border border-emerald-800/20 text-emerald-400 rounded-xl">
                    <Play className="size-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-widest text-white">Manual Quick Launch</h3>
                    <p className="text-[10px] text-zinc-500">Test image generation and delivery immediately</p>
                  </div>
                </div>

                <div className="bg-[#111113]/55 p-5 rounded-2xl border border-dashed border-zinc-850 space-y-3 text-xs text-center">
                  <Sparkles className="size-6 text-violet-400 mx-auto animate-pulse" />
                  <div className="space-y-1">
                    <span className="font-bold text-zinc-200 text-xs block">Immediate Delivery Request</span>
                    <p className="text-[11px] text-zinc-550 leading-relaxed max-w-sm mx-auto">
                      Generate a watercolor morning picture now and email it instantly to <span className="text-zinc-300 font-mono font-semibold">{morningConfig.recipientEmail}</span> to verify connections.
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                {!morningConfig.hasToken && (
                  <span className="text-[10px] text-rose-400 bg-rose-950/10 border border-rose-900/30 py-2 px-3 rounded-xl flex items-center gap-1.5 justify-center">
                    <AlertTriangle className="size-3 shrink-0" /> Connect Google Account to trigger test email.
                  </span>
                )}
                <button
                  onClick={() => handleTestSendNow()}
                  disabled={testSendLoading || !morningConfig.hasToken}
                  className="w-full py-3.5 px-4 rounded-xl font-bold bg-gradient-to-r from-emerald-500 to-teal-500 text-white transition hover:brightness-110 shadow-lg text-xs font-sans uppercase tracking-widest cursor-pointer disabled:opacity-30 disabled:pointer-events-none active:scale-95 flex items-center justify-center gap-2"
                >
                  {testSendLoading ? "Generating Image & Transporting..." : "Generate & Email now (Test)"}
                </button>
              </div>
            </div>

          </div>

          {/* Card 5: Diagnostic logs timeline */}
          <div className="bg-zinc-950/60 border border-white/5 rounded-2xl p-6 space-y-4 shadow-xl relative overflow-hidden">
            <div className="absolute top-0 left-0 w-20 h-[1px] bg-gradient-to-r from-zinc-700 to-transparent" />
            
            <div className="flex items-center justify-between border-b border-zinc-900 pb-3">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-zinc-900 border border-white/5 text-zinc-450 rounded-xl">
                  <List className="size-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-widest text-white">Diagnostic Autopilot logs</h3>
                  <p className="text-[10px] text-zinc-500">Live cron operations logs</p>
                </div>
              </div>
              <button
                onClick={fetchLogs}
                className="text-[10px] font-bold uppercase tracking-wider text-cyan-400 hover:text-cyan-300 bg-zinc-900 px-3 py-1.5 rounded-lg border border-white/5 transition cursor-pointer"
              >
                Flush Logs
              </button>
            </div>

            <div className="max-h-60 overflow-y-auto space-y-2.5 text-xs">
              {morningLogs.length === 0 ? (
                <div className="text-center py-8 text-zinc-600 italic font-mono">
                  No execution logs detected on server. Adjust settings or run manual testing!
                </div>
              ) : (
                morningLogs.map((log: any, idx: number) => (
                  <div key={idx} className="p-3 bg-zinc-900/30 border border-white/[0.03] rounded-xl flex items-start justify-between gap-4 font-mono text-[11px]">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className={`w-1.5 h-1.5 rounded-full ${log.type === "success" ? "bg-emerald-400 shadow-[0_0_4px_rgba(52,211,153,0.5)]" : "bg-rose-500"}`} />
                        <span className={`font-bold ${log.type === "success" ? "text-zinc-300" : "text-rose-450"}`}>{log.message}</span>
                      </div>
                      {log.detail && (
                        <p className="text-[10px] text-zinc-500 leading-relaxed font-sans">{log.detail}</p>
                      )}
                    </div>
                    <span className="text-zinc-650 font-mono text-[9px] text-right shrink-0 mt-0.5">
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>
      </div>
    );
  };

  return (
    <div className="relative w-full h-screen bg-[#050505] text-zinc-300 flex font-sans overflow-hidden">
      
      {/* Floating Notifications Toasts */}
      <AnimatePresence>
        {successToast && (
          <motion.div
            initial={{ opacity: 0, y: -20, x: "-50%" }}
            animate={{ opacity: 1, y: 0, x: "-50%" }}
            exit={{ opacity: 0, y: -20, x: "-50%" }}
            className="fixed top-5 left-1/2 z-[100] bg-emerald-950/90 border border-emerald-500/30 text-emerald-250 py-3.5 px-6 rounded-2xl text-xs font-semibold shadow-2xl flex items-center gap-2 max-w-sm text-center"
          >
            <Check className="size-3.5 text-emerald-400 shrink-0" />
            <span>{successToast}</span>
          </motion.div>
        )}
        {errorToast && (
          <motion.div
            initial={{ opacity: 0, y: -20, x: "-50%" }}
            animate={{ opacity: 1, y: 0, x: "-50%" }}
            exit={{ opacity: 0, y: -20, x: "-50%" }}
            className="fixed top-5 left-1/2 z-[100] bg-rose-950/95 border border-rose-500/30 text-rose-200 py-3.5 px-6 rounded-2xl text-xs font-semibold shadow-2xl flex items-center gap-2 max-w-sm text-center"
          >
            <AlertCircle className="size-3.5 text-rose-400 shrink-0" />
            <span>{errorToast}</span>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Sidebar Panel from Immersive UI theme */}
      <aside className="w-72 bg-[#0A0A0A] border-r border-zinc-850/60 flex flex-col shrink-0 hidden md:flex z-20">
        <div className="p-4 space-y-2 border-b border-zinc-900">
          <button
            onClick={() => setActiveTab("chat")}
            className={`w-full flex items-center gap-3 py-3 px-4 rounded-xl text-xs font-semibold uppercase tracking-wider cursor-pointer transition-all ${
              activeTab === "chat"
                ? "bg-zinc-850 text-white border border-zinc-700/60 shadow-md shadow-black/30"
                : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900/45"
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5 text-cyan-400" />
            Chat terminal
          </button>
          <button
            onClick={() => setActiveTab("morning")}
            className={`w-full flex items-center gap-3 py-3 px-4 rounded-xl text-xs font-semibold uppercase tracking-wider cursor-pointer transition-all ${
              activeTab === "morning"
                ? "bg-zinc-850 text-white border border-zinc-700/60 shadow-md shadow-black/30"
                : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900/45"
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-violet-400 animate-pulse" />
            Morning scheduler
          </button>
        </div>

        {activeTab === "chat" && (
          <div className="p-4">
            <button
              onClick={handleResetChat}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl border border-zinc-700/50 bg-zinc-800/30 hover:bg-zinc-800/60 text-zinc-100 text-sm font-medium transition duration-200 cursor-pointer shadow-sm active:scale-95"
            >
              <Plus className="w-4 h-4 text-cyan-400" />
              New Conversation
            </button>
          </div>
        )}

        <div className="flex-1 px-4 py-2 space-y-6 overflow-y-auto">
          <div>
            <div className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold px-3 mb-2">Active Session</div>
            <div className="p-3 bg-cyan-500/10 text-cyan-300 rounded-lg border border-cyan-500/20 text-xs truncate font-medium flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.5)] animate-pulse"></span>
              Synchronized Session
            </div>
          </div>

          <div>
            <div className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold px-3 mb-2">Session Stats</div>
            <div className="mx-3 bg-[#111111] p-3 rounded-xl border border-white/5 space-y-2 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-zinc-500">Duration:</span>
                <span className="font-mono text-zinc-300 flex items-center gap-1">
                  <Clock className="w-3 h-3 text-zinc-500" /> {formatElapsed()}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-zinc-500">Total Messages:</span>
                <span className="font-mono text-cyan-400 font-medium">
                  {messages.filter(m => m.id !== "initial-welcome").length}
                </span>
              </div>
            </div>
          </div>

          {messages.length > 1 && (
            <div>
              <div className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold px-3 mb-2">Recent Prompts</div>
              <div className="space-y-1.5 max-h-56 overflow-y-auto">
                {messages
                  .filter((m) => m.role === "user")
                  .slice(-4)
                  .map((m) => (
                    <button
                      key={m.id}
                      onClick={() => setInputMessage(m.text)}
                      className="w-full text-left px-3 py-2.5 rounded-lg text-xs truncate text-zinc-400 bg-zinc-900/10 hover:bg-zinc-800/40 border border-transparent hover:border-zinc-800/40 transition cursor-pointer"
                      title={m.text}
                    >
                      {m.text}
                    </button>
                  ))}
              </div>
            </div>
          )}
        </div>

        <div className="p-4 border-t border-zinc-800/50 bg-[#080808]/80 flex flex-col gap-2">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#1f1f1f] to-zinc-900 border border-zinc-800 flex items-center justify-center font-bold text-xs text-zinc-300 shadow">
              NB
            </div>
            <div className="overflow-hidden">
              <div className="text-xs font-medium text-zinc-300 truncate">natomeko</div>
              <p className="text-[10px] text-zinc-500 truncate">natomeko@gmail.com</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Chat Interface */}
      <main className="flex-1 flex flex-col bg-[#050505] overflow-hidden relative">
        
        {/* Atmospheric Ambient Glows from Immersive UI styling */}
        <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-indigo-950/10 rounded-full blur-[120px] pointer-events-none z-0" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[400px] h-[400px] bg-cyan-950/10 rounded-full blur-[100px] pointer-events-none z-0" />

        {/* Header Bar */}
        <header className="h-16 shrink-0 flex items-center justify-between px-6 md:px-8 bg-[#050505]/70 backdrop-blur-md border-b border-zinc-800/50 z-10">
          <div className="flex items-center gap-3">
            <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.6)] animate-pulse"></div>
            <h1 className="text-base md:text-lg font-bold tracking-tight text-white flex items-center gap-2">
              Nat bbe <span className="text-zinc-600 font-medium text-xs hidden sm:inline">v1.2-flash</span>
            </h1>
          </div>

          {/* Quick tab toggle for mobile devices */}
          <div className="md:hidden flex bg-zinc-950/80 p-0.5 rounded-xl border border-white/5 mx-1">
            <button
              onClick={() => setActiveTab("chat")}
              className={`px-3 py-1.5 text-[10px] font-bold tracking-wider rounded-lg transition-all ${
                activeTab === "chat" ? "bg-zinc-900 text-white border border-white/5" : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              Chat
            </button>
            <button
              onClick={() => setActiveTab("morning")}
              className={`px-3 py-1.5 text-[10px] font-bold tracking-wider rounded-lg transition-all ${
                activeTab === "morning" ? "bg-zinc-900 text-white border border-white/5" : "text-zinc-500 hover:text-zinc-350"
              }`}
            >
              Morning
            </button>
          </div>

          <div className="flex items-center gap-2">
            {/* Quick stats on mobile viewports */}
            <div className="flex md:hidden items-center gap-2 font-mono text-[10px] text-zinc-500 bg-zinc-900/40 rounded-lg px-2 text-[10px] py-1">
              <span>{formatElapsed()}</span>
            </div>

            <button
              onClick={() => setShowSettings(!showSettings)}
              className={`p-2 rounded-lg cursor-pointer transition text-zinc-400 hover:text-white ${
                showSettings ? "bg-zinc-800 text-white border border-zinc-700/50" : "hover:bg-zinc-900"
              }`}
              title="Toggle View Settings"
            >
              <Sliders className="size-4" />
            </button>

            <button
              onClick={handleResetChat}
              className="md:hidden p-2 rounded-lg text-zinc-400 hover:text-rose-400 hover:bg-zinc-900 transition-colors"
              title="Reset Chat"
            >
              <Trash2 className="size-4" />
            </button>
          </div>
        </header>

        {/* Interactive Configuration Pane */}
        <AnimatePresence>
          {showSettings && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="z-10 bg-[#0A0A0A]/95 border-b border-zinc-850 overflow-hidden"
            >
              <div className="max-w-3xl mx-auto p-5 grid grid-cols-1 md:grid-cols-2 gap-5 text-xs text-zinc-400">
                <div className="space-y-3 bg-zinc-900/30 p-4 rounded-xl border border-white/5">
                  <h4 className="font-bold text-white uppercase text-[10px] tracking-widest text-cyan-400">
                    Readability Scaling
                  </h4>
                  <p className="text-zinc-400 text-[11px]">
                    Tune the response text height and sizes to match your reading device.
                  </p>
                  <div className="flex gap-2">
                    {(["sm", "base", "lg"] as const).map((sz) => (
                      <button
                        key={sz}
                        onClick={() => setTextSize(sz)}
                        className={`px-3 py-1 rounded bg-[#161618] border text-[10px] uppercase font-semibold cursor-pointer transition ${
                          textSize === sz
                            ? "border-cyan-500 text-cyan-300 bg-cyan-500/5 shadow-[0_0_8px_rgba(6,182,212,0.15)]"
                            : "border-zinc-800 text-zinc-400 hover:border-zinc-700"
                        }`}
                      >
                        {sz === "sm" ? "Compact" : sz === "base" ? "Standard" : "Comfortable"}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="bg-zinc-900/30 p-4 rounded-xl border border-white/5 flex flex-col justify-between">
                  <div>
                    <h4 className="font-bold text-white uppercase text-[10px] tracking-widest text-cyan-400">
                      Processing Endpoint
                    </h4>
                    <p className="text-zinc-400 text-[11px] mt-1">
                      Direct connection to server-side model instance running gemini-3.5-flash.
                    </p>
                  </div>
                  <div className="text-[11px] text-zinc-500 flex items-center gap-1.5 mt-2 bg-zinc-950/40 p-2 rounded-lg border border-white/[0.02]">
                    <Info className="size-3 text-cyan-400 flex-shrink-0" />
                    <span>Secure proxy route handles API key securely.</span>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {activeTab === "morning" ? (
          renderMorningDashboard()
        ) : (
          <>
            {/* Message Streams viewport scroll region */}
            <div className="flex-1 overflow-y-auto px-6 md:px-8 py-8 space-y-8 z-10 scroll-smooth">
              <AnimatePresence initial={false}>
                {messages.map((msg) => (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2 }}
                    className={`flex ${msg.role === "user" ? "justify-end" : "justify-start gap-4"}`}
                  >
                    {/* Agent Avatar Icon */}
                    {msg.role === "model" && (
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-cyan-400 flex items-center justify-center shrink-0 shadow-lg select-none">
                        <span className="text-[10px] font-bold text-white">NB</span>
                      </div>
                    )}

                    <div className={`flex flex-col group ${msg.role === "user" ? "max-w-[70%]" : "max-w-[75%] space-y-1"}`}>
                      
                      {msg.role === "model" && (
                        <div className="text-white/80 font-medium text-xs flex items-center gap-1.5">
                          Nat bbe
                          <span className="text-[8px] font-mono tracking-wider uppercase text-zinc-650 px-1 py-0.2 bg-zinc-900 rounded">
                            gpt model
                          </span>
                        </div>
                      )}

                      {/* Bubble Material framing */}
                      <div
                        className={`${msg.role === "user"
                          ? "bg-zinc-800/40 px-5 py-3 rounded-2xl rounded-tr-none border border-zinc-700/20 text-zinc-200"
                          : "bg-[#111111] px-6 py-4 rounded-3xl rounded-tl-none border border-white/5 shadow-xl shadow-indigo-950/5 text-zinc-300"
                        } ${getTextSizeClass()}`}
                      >
                        <div className="space-y-1.5">
                          {msg.role === "model" ? (
                            renderMessageText(msg.text)
                          ) : (
                            <p className="leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                          )}
                        </div>
                      </div>

                      {/* Action Copy/Metrics row */}
                      <div
                        className={`flex items-center gap-2 mt-1 px-1 text-[10px] text-zinc-500 font-mono transition-opacity duration-150 ${
                          msg.role === "user" ? "justify-end" : "justify-start"
                        }`}
                      >
                        <span>{msg.timestamp}</span>
                        <span>•</span>
                        <button
                          onClick={() => handleCopyMessage(msg.id, msg.text)}
                          className="hover:text-cyan-400 cursor-pointer flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          {copiedId === msg.id ? (
                            <>
                              <Check className="size-2.5 text-emerald-400" />
                              <span className="text-emerald-400">Copied</span>
                            </>
                          ) : (
                            <>
                              <Copy className="size-2.5" />
                              <span>Copy</span>
                            </>
                          )}
                        </button>
                      </div>

                    </div>
                  </motion.div>
                ))}

                {/* AI composing animated dot loop */}
                {isLoading && (
                  <motion.div
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex justify-start gap-4"
                  >
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-cyan-400 flex items-center justify-center shrink-0 shadow-lg select-none">
                      <span className="text-[10px] font-bold text-white">NB</span>
                    </div>
                    <div className="max-w-[70%] space-y-1.5">
                      <div className="text-white/60 font-medium text-xs">Nat bbe</div>
                      <div className="bg-[#111111] px-6 py-4 rounded-3xl rounded-tl-none border border-white/5 shadow-xl">
                        <div className="flex items-center gap-1.5 py-1">
                          <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-bounce [animation-delay:-0.3s]" />
                          <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-bounce [animation-delay:-0.15s]" />
                          <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-bounce" />
                          <span className="text-zinc-500 font-mono text-[10px] uppercase tracking-wider ml-1">
                            Formulating Response...
                          </span>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div ref={messagesEndRef} />
            </div>

            {/* Dynamic API errors drawer */}
            <AnimatePresence>
              {apiKeyError && (
                <motion.div
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 15 }}
                  className="mx-8 my-2 p-4 rounded-xl border border-rose-950 bg-rose-950/20 text-xs text-rose-200 flex items-start gap-3 z-10"
                >
                  <AlertTriangle className="size-4 text-rose-400 mt-0.5 flex-shrink-0" />
                  <div className="space-y-1">
                    <span className="font-semibold text-rose-300">Action Required: API Setup</span>
                    <p className="leading-relaxed opacity-90">{apiKeyError}</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Context Starter Cards */}
            {messages.length <= 1 && !isLoading && (
              <div className="px-6 md:px-8 mt-2 mb-4 z-10 max-w-3xl mx-auto w-full">
                <p className="text-[10px] font-mono tracking-widest text-zinc-500 uppercase mb-3 text-center">
                  Choose an inspiration template
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {STARTER_PROMPTS.map((starter) => (
                    <button
                      key={starter.title}
                      onClick={() => {
                        setInputMessage(starter.text);
                        handleSendMessage(starter.text);
                      }}
                      className="flex items-start text-left p-3.5 rounded-xl bg-zinc-900/10 hover:bg-zinc-800/20 border border-zinc-800/40 hover:border-zinc-700/60 transition duration-150 cursor-pointer text-xs group"
                    >
                      <span className="text-lg mr-3 bg-zinc-900 p-2 rounded-lg border border-white/5 select-none">
                        {starter.icon}
                      </span>
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1 font-semibold text-zinc-200 tracking-wide group-hover:text-cyan-400 transition-colors">
                          {starter.title}
                          <ArrowRight className="size-3 opacity-0 group-hover:opacity-100 transition duration-150 transform group-hover:translate-x-0.5" />
                        </div>
                        <p className="text-zinc-500 text-[11px] leading-relaxed truncate max-w-[220px]">
                          {starter.text}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Input Area block with high tech dual glow effects */}
            <div className="p-6 md:p-8 z-10 bg-gradient-to-t from-[#050505] via-[#050505] to-transparent shrink-0">
              <div className="relative max-w-3xl mx-auto group">
                
                {/* Ambient overlay glow wrapping the input border */}
                <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 to-cyan-500 rounded-2xl blur opacity-15 group-focus-within:opacity-35 transition duration-500"></div>
                
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSendMessage();
                  }}
                  className="relative flex bg-[#161618] border border-[#222225] rounded-2xl shadow-xl overflow-hidden focus-within:border-zinc-700 transition"
                >
                  <input
                    type="text"
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    placeholder="Ask Nat bbe anything..."
                    disabled={isLoading}
                    className="flex-1 bg-transparent py-4 px-6 text-zinc-200 placeholder-zinc-650 focus:outline-none text-sm disabled:opacity-50"
                  />
                  <div className="flex items-center pr-4 gap-2">
                    {inputMessage.trim() && (
                      <button
                        type="button"
                        onClick={() => setInputMessage("")}
                        className="p-1 px-2 text-[10px] text-zinc-500 hover:text-zinc-300 transition-colors bg-zinc-800/40 rounded border border-white/5 font-mono cursor-pointer"
                      >
                        clear
                      </button>
                    )}
                    <button
                      type="submit"
                      disabled={!inputMessage.trim() || isLoading}
                      className="bg-white text-black py-2 px-3.5 text-xs font-bold rounded-xl hover:bg-zinc-200 transition shadow-[0_0_15px_rgba(255,255,255,0.08)] cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      Send
                      <Send className="w-3 h-3" />
                    </button>
                  </div>
                </form>

                <div className="mt-3 flex justify-center gap-6 text-[10px] text-zinc-650 uppercase tracking-widest font-bold font-mono selection:bg-transparent">
                  <span>Enter to Send</span>
                  <span>•</span>
                  <span>Gemini-Pro Engine</span>
                </div>
              </div>
            </div>
          </>
        )}

      </main>
    </div>
  );
}
