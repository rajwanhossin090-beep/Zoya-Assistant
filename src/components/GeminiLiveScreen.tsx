import React, { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Mic, 
  MicOff, 
  PhoneOff, 
  Volume2, 
  VolumeX, 
  Sparkles, 
  SlidersHorizontal,
  Flame,
  Smile,
  Zap,
  RotateCcw,
  MessageSquare,
  ShieldAlert
} from "lucide-react";
import { ZoyaMood, ZoyaTheme } from "../services/geminiService";
import BatteryIndicator from "./BatteryIndicator";

interface GeminiLiveScreenProps {
  state: "idle" | "listening" | "processing" | "speaking";
  isMuted: boolean;
  onToggleMute: () => void;
  onEndSession: () => void;
  messages: Array<{ id?: string; sender: "user" | "zoya"; text: string }>;
  theme: ZoyaTheme;
  onThemeChange: (theme: ZoyaTheme) => void;
  mood: ZoyaMood;
  onMoodChange: (mood: ZoyaMood) => void;
  sassLevel: number;
  onSassLevelChange: (level: number) => void;
}

export default function GeminiLiveScreen({
  state,
  isMuted,
  onToggleMute,
  onEndSession,
  messages,
  theme,
  onThemeChange,
  mood,
  onMoodChange,
  sassLevel,
  onSassLevelChange,
}: GeminiLiveScreenProps) {
  const [showQuickSettings, setShowQuickSettings] = useState(false);
  const transcriptEndRef = useRef<HTMLDivElement>(null);

  // Filter messages to show only the live session voice dialogue (recent 12 items for context)
  const recentDialogues = messages.slice(-12);

  // Autoscroll transcripts
  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, state]);

  // Theme-specific backgrounds and accent colors
  const getThemeConfig = () => {
    switch (theme) {
      case "anime":
        return {
          bgGradient: "from-[#110108] via-[#200412] to-[#080004]",
          accentGlow: "bg-pink-500/20",
          accentColor: "text-pink-400",
          accentBg: "bg-pink-500",
          waveColors: ["bg-pink-400", "bg-rose-400", "bg-fuchsia-400", "bg-pink-300"],
          title: "Crimson Zoya",
          ringColor: "border-pink-500/30",
          orbShadow: "0 0 50px rgba(236, 72, 153, 0.6)"
        };
      case "enemy":
        return {
          bgGradient: "from-[#0d0101] via-[#1f0202] to-[#050000]",
          accentGlow: "bg-red-600/25",
          accentColor: "text-red-500",
          accentBg: "bg-red-600",
          waveColors: ["bg-red-500", "bg-rose-600", "bg-orange-500", "bg-red-400"],
          title: "Nemesis Zoya",
          ringColor: "border-red-500/30",
          orbShadow: "0 0 50px rgba(220, 38, 38, 0.6)"
        };
      default: // automobile
        return {
          bgGradient: "from-[#010c12] via-[#021824] to-[#000508]",
          accentGlow: "bg-cyan-500/20",
          accentColor: "text-cyan-400",
          accentBg: "bg-cyan-500",
          waveColors: ["bg-cyan-400", "bg-violet-500", "bg-sky-400", "bg-teal-400"],
          title: "Zoya Pro",
          ringColor: "border-cyan-500/30",
          orbShadow: "0 0 50px rgba(6, 182, 212, 0.6)"
        };
    }
  };

  const config = getThemeConfig();

  // Sass-level based descriptive label
  const getSassLabel = () => {
    if (sassLevel <= 20) return "Polite Assistant";
    if (sassLevel <= 50) return "Playful Sarcasm";
    if (sassLevel <= 80) return "Sassy Rebel";
    return "Absolute Savage 🔥";
  };

  return (
    <div className={`fixed inset-0 w-screen h-screen z-50 flex flex-col items-center justify-between text-white overflow-hidden select-none bg-gradient-to-b ${config.bgGradient}`}>
      
      {/* 1. Immersive Floating Ambient Light Blobs */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
        <motion.div 
          animate={{
            scale: [1, 1.2, 0.9, 1.1, 1],
            x: [0, 50, -30, 20, 0],
            y: [0, -40, 60, -20, 0],
          }}
          transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
          className={`absolute top-1/4 left-1/3 w-80 h-80 rounded-full blur-[130px] opacity-35 ${config.accentGlow}`}
        />
        <motion.div 
          animate={{
            scale: [1, 0.8, 1.15, 0.9, 1],
            x: [0, -60, 40, -30, 0],
            y: [0, 50, -40, 30, 0],
          }}
          transition={{ duration: 22, repeat: Infinity, ease: "easeInOut" }}
          className="absolute bottom-1/3 right-1/4 w-96 h-96 rounded-full blur-[140px] opacity-25 bg-violet-600/20"
        />
      </div>

      {/* 2. Top Bar Header */}
      <header className="w-full max-w-5xl flex justify-between items-center px-6 pt-6 z-10">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg shadow-lg relative overflow-hidden bg-white/5 border border-white/10`}>
            {theme === "anime" ? "🌸" : theme === "enemy" ? "😈" : "⚡"}
            <span className="absolute inset-0 bg-white/10 animate-pulse pointer-events-none" />
          </div>
          <div>
            <h1 className="text-base md:text-lg font-serif font-bold tracking-wide flex items-center gap-2">
              {config.title}
              <span className="flex h-2 w-2 relative">
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${state === 'listening' ? 'bg-green-400' : state === 'speaking' ? 'bg-pink-400' : 'bg-amber-400'}`}></span>
                <span className={`relative inline-flex rounded-full h-2 w-2 ${state === 'listening' ? 'bg-green-500' : state === 'speaking' ? 'bg-pink-500' : 'bg-amber-500'}`}></span>
              </span>
            </h1>
            <p className="text-[10px] opacity-55 tracking-wider uppercase">
              {state === "listening" 
                ? "Listening... You can interrupt anytime" 
                : state === "speaking" 
                  ? "Speaking..." 
                  : state === "processing" 
                    ? "Thinking..." 
                    : "Connecting..."}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Real Device Battery Status */}
          <BatteryIndicator 
            size="md" 
            className="px-3.5 py-1.5 rounded-full border border-white/10 bg-white/5 text-white/95 text-xs font-semibold tracking-wider transition-all hover:bg-white/10 backdrop-blur-sm" 
          />

          {/* Quick Settings Drawer Toggle */}
          <button
            onClick={() => setShowQuickSettings(!showQuickSettings)}
            className={`p-3 rounded-full border transition-all cursor-pointer flex items-center justify-center shadow-lg hover:scale-105 active:scale-95
              ${showQuickSettings 
                ? "bg-white text-slate-900 border-white" 
                : "bg-white/5 border-white/10 text-white hover:bg-white/15"}`}
            title="Configure Assistant"
          >
            <SlidersHorizontal size={16} />
          </button>
        </div>
      </header>

      {/* 3. Central Gemini Live Soundwave Visualizer */}
      <main className="w-full flex-1 flex flex-col items-center justify-center relative z-10 px-4">
        <div className="relative w-72 h-72 flex items-center justify-center">
          
          {/* Orbital Glowing Rings around visualizer */}
          <div className={`absolute inset-0 rounded-full border border-dashed ${config.ringColor} animate-[spin_50s_linear_infinite] opacity-40`} />
          <div className={`absolute -inset-4 rounded-full border border-dotted ${config.ringColor} animate-[spin_30s_linear_infinite_reverse] opacity-20`} />

          {/* Central Interactive Soundwave Display */}
          <div className="absolute inset-0 flex items-center justify-center">
            
            {/* Mode A: Speaking - Energetic Dynamic Bouncing Bars */}
            {state === "speaking" && (
              <div className="flex items-end justify-center gap-2 h-36">
                {[...Array(6)].map((_, i) => (
                  <motion.div
                    key={`speaking-bar-${i}`}
                    animate={{
                      height: [
                        "20px", 
                        `${35 + Math.sin(i * 1.5) * 40}px`, 
                        `${15 + Math.cos(i * 2) * 50}px`, 
                        `${85 + Math.sin(i * 3) * 35}px`, 
                        "20px"
                      ],
                      borderRadius: ["12px", "24px", "12px"]
                    }}
                    transition={{
                      duration: 0.5 + (i * 0.08),
                      repeat: Infinity,
                      ease: "easeInOut",
                    }}
                    className={`w-3.5 rounded-full shadow-lg ${config.waveColors[i % config.waveColors.length]} opacity-90`}
                    style={{
                      boxShadow: `0 0 20px rgba(255, 255, 255, 0.2)`
                    }}
                  />
                ))}
              </div>
            )}

            {/* Mode B: Listening - Gentle Breathing Dots */}
            {state === "listening" && (
              <div className="flex items-center justify-center gap-3.5 h-12">
                {[...Array(4)].map((_, i) => (
                  <motion.div
                    key={`listening-dot-${i}`}
                    animate={{
                      scale: [1, 1.6, 1],
                      opacity: [0.5, 1, 0.5]
                    }}
                    transition={{
                      duration: 1.4,
                      repeat: Infinity,
                      delay: i * 0.25,
                      ease: "easeInOut"
                    }}
                    className={`w-4 h-4 rounded-full ${config.waveColors[i % config.waveColors.length]} shadow-md`}
                    style={{
                      boxShadow: `0 0 15px ${config.accentColor === "text-pink-400" ? "rgba(236,72,153,0.5)" : config.accentColor === "text-red-500" ? "rgba(220,38,38,0.5)" : "rgba(6,182,212,0.5)"}`
                    }}
                  />
                ))}
              </div>
            )}

            {/* Mode C: Thinking / Processing - Glowing Swirling Orb */}
            {state === "processing" && (
              <div className="relative flex items-center justify-center w-36 h-36">
                <motion.div
                  animate={{
                    rotate: [0, 360],
                    borderRadius: ["42% 58% 70% 30% / 45% 45% 55% 55%", "70% 30% 52% 48% / 60% 40% 60% 40%", "42% 58% 70% 30% / 45% 45% 55% 55%"]
                  }}
                  transition={{
                    duration: 3,
                    repeat: Infinity,
                    ease: "linear"
                  }}
                  className={`absolute w-28 h-28 opacity-80 blur-[2px] ${config.accentBg}`}
                  style={{
                    boxShadow: config.orbShadow
                  }}
                />
                <div className="absolute w-20 h-20 rounded-full bg-black/45 backdrop-blur-md border border-white/20 flex items-center justify-center">
                  <motion.div 
                    animate={{ scale: [0.85, 1.1, 0.85] }}
                    transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                    className="text-white font-mono text-xs font-bold tracking-widest text-center"
                  >
                    THINKING
                  </motion.div>
                </div>
              </div>
            )}

            {/* Mode D: Idle / Connecting */}
            {state === "idle" && (
              <motion.div
                animate={{
                  scale: [0.95, 1.05, 0.95],
                  opacity: [0.3, 0.6, 0.3]
                }}
                transition={{
                  duration: 2.5,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
                className={`w-14 h-14 rounded-full ${config.accentBg} blur-md`}
              />
            )}

          </div>
        </div>

        {/* Ambient indicator of full-duplex functionality */}
        <p className="text-[10px] opacity-40 mt-3 flex items-center gap-1">
          <Zap size={10} className="text-amber-400" />
          Full duplex voice mode is active. Speak normally to interrupt.
        </p>
      </main>

      {/* 4. Live Dialogue/Transcript Subtitles Panel */}
      <section className="w-full max-w-2xl h-36 px-6 relative z-10 flex flex-col justify-end">
        {/* Shadow Overlay top to look blended */}
        <div className="absolute top-0 left-0 w-full h-8 bg-gradient-to-b from-[#09090b]/0 to-transparent pointer-events-none" />
        
        <div className="w-full overflow-y-auto pr-2 flex flex-col gap-2.5 max-h-full scrollbar-none">
          {recentDialogues.length === 0 ? (
            <div className="text-center opacity-30 text-xs italic py-4">
              Zoya is waiting for you to say something...
            </div>
          ) : (
            recentDialogues.map((dlg, idx) => {
              const isUser = dlg.sender === "user";
              return (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: isUser ? 0.75 : 1, y: 0 }}
                  key={dlg.id || `dlg-${idx}`}
                  className={`flex flex-col ${isUser ? "items-end" : "items-start"}`}
                >
                  <span className={`text-[9px] uppercase tracking-wider font-semibold mb-0.5 opacity-40 ${isUser ? "text-violet-400" : config.accentColor}`}>
                    {isUser ? "You" : "Zoya"}
                  </span>
                  <div className={`max-w-[85%] text-xs md:text-sm px-3 py-2 rounded-2xl leading-relaxed
                    ${isUser 
                      ? "bg-white/10 text-white rounded-tr-none border border-white/5" 
                      : "bg-white/5 text-slate-100 rounded-tl-none border border-white/5"}`}>
                    {dlg.text}
                  </div>
                </motion.div>
              );
            })
          )}
          <div ref={transcriptEndRef} />
        </div>
      </section>

      {/* 5. Sleek Floating Action Control Bar */}
      <footer className="w-full max-w-md px-6 py-6 z-10 flex items-center justify-between gap-4">
        
        {/* Button A: Mute/Unmute microphone */}
        <button
          onClick={onToggleMute}
          className={`p-4 rounded-full border transition-all cursor-pointer shadow-lg hover:scale-105 active:scale-95 flex items-center justify-center
            ${isMuted 
              ? "bg-red-500/25 border-red-500/40 text-red-400" 
              : "bg-white/5 border-white/10 text-white hover:bg-white/10"}`}
          title={isMuted ? "Unmute Mic" : "Mute Mic"}
        >
          {isMuted ? <MicOff size={20} /> : <Mic size={20} />}
        </button>

        {/* Button B: Core End Session Action (Glowing Crimson Red Circle) */}
        <button
          onClick={onEndSession}
          className="relative group p-5 rounded-full bg-gradient-to-tr from-red-600 to-rose-500 text-white shadow-2xl hover:scale-110 active:scale-95 transition-all cursor-pointer flex items-center justify-center border border-red-500/20"
          style={{
            boxShadow: "0 10px 30px rgba(239, 68, 68, 0.4)"
          }}
          title="End Voice Chat"
        >
          <PhoneOff size={22} className="group-hover:rotate-12 transition-transform" />
          <span className="absolute -inset-1 rounded-full bg-red-500/20 animate-pulse pointer-events-none" />
        </button>

        {/* Button C: Quick settings switch directly in screen */}
        <button
          onClick={() => setShowQuickSettings(!showQuickSettings)}
          className={`p-4 rounded-full border transition-all cursor-pointer shadow-lg hover:scale-105 active:scale-95 flex items-center justify-center
            ${showQuickSettings 
              ? "bg-amber-500/20 border-amber-500/40 text-amber-400" 
              : "bg-white/5 border-white/10 text-white hover:bg-white/10"}`}
          title="Voice customization options"
        >
          <Sparkles size={20} />
        </button>

      </footer>

      {/* 6. Sliding Glassmorphic Customize Settings Drawer (Interactive UI Panel) */}
      <AnimatePresence>
        {showQuickSettings && (
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 180 }}
            className="absolute bottom-0 left-0 w-full bg-zinc-950/95 border-t border-white/10 backdrop-blur-2xl z-20 p-6 rounded-t-[32px] shadow-2xl flex flex-col gap-5"
          >
            <div className="flex justify-between items-center pb-2 border-b border-white/5">
              <div className="flex items-center gap-2">
                <SlidersHorizontal size={16} className="text-cyan-400" />
                <h3 className="font-bold text-sm tracking-wide">Zoya Configuration</h3>
              </div>
              <button
                onClick={() => setShowQuickSettings(false)}
                className="text-xs font-semibold px-2.5 py-1 rounded-full bg-white/10 text-slate-300 hover:bg-white/20 hover:text-white transition-colors cursor-pointer"
              >
                Done
              </button>
            </div>

            {/* Theme / Identity Selection */}
            <div className="flex flex-col gap-2">
              <span className="text-[10px] uppercase font-bold tracking-widest text-slate-400">Assistant Persona & Theme</span>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: "automobile", label: "Zoya Pro ⚡", desc: "Default AI" },
                  { id: "anime", label: "Crimson 🌸", desc: "Anime Cute" },
                  { id: "enemy", label: "Nemesis 😈", desc: "Brutal Rival" }
                ].map((t) => (
                  <button
                    key={t.id}
                    onClick={() => onThemeChange(t.id as ZoyaTheme)}
                    className={`flex flex-col items-center justify-center p-2.5 rounded-2xl border transition-all text-center cursor-pointer
                      ${theme === t.id 
                        ? "bg-white text-slate-900 border-white font-semibold shadow-md" 
                        : "bg-white/5 border-white/5 hover:bg-white/10 text-slate-300"}`}
                  >
                    <span className="text-xs">{t.label}</span>
                    <span className={`text-[8px] opacity-60 mt-0.5 ${theme === t.id ? "text-slate-700" : "text-slate-400"}`}>{t.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Mood selector inside drawer */}
            <div className="flex flex-col gap-2">
              <span className="text-[10px] uppercase font-bold tracking-widest text-slate-400">Zoya's Voice Mood</span>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: "sassy", label: "Sassy 💅", desc: "High Sass" },
                  { id: "submissive", label: "Sweet 🥺", desc: "Polite & soft" },
                  { id: "helpful", label: "Helpful 😇", desc: "Direct answers" }
                ].map((m) => (
                  <button
                    key={m.id}
                    onClick={() => onMoodChange(m.id as ZoyaMood)}
                    className={`flex flex-col items-center justify-center p-2.5 rounded-2xl border transition-all text-center cursor-pointer
                      ${mood === m.id 
                        ? "bg-white text-slate-900 border-white font-semibold shadow-md" 
                        : "bg-white/5 border-white/5 hover:bg-white/10 text-slate-300"}`}
                  >
                    <span className="text-xs">{m.label}</span>
                    <span className={`text-[8px] opacity-60 mt-0.5 ${mood === m.id ? "text-slate-700" : "text-slate-400"}`}>{m.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Sass Slider inside drawer */}
            <div className="flex flex-col gap-2 bg-white/5 p-3.5 rounded-2xl border border-white/5">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-1.5">
                  <Flame size={14} className="text-amber-500 animate-pulse" />
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-300">Sass Level</span>
                </div>
                <span className="text-xs font-bold text-amber-400 font-mono">{sassLevel}% ({getSassLabel()})</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={sassLevel}
                onChange={(e) => onSassLevelChange(Number(e.target.value))}
                className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-amber-500 mt-2"
              />
              <span className="text-[9px] opacity-55 text-slate-400 italic">
                Adjust how savage, sarcastic, or helpful Zoya will be in her voice replies!
              </span>
            </div>
            
            {/* Helpful warning banner in settings drawer */}
            <div className="flex items-start gap-2 bg-amber-500/10 border border-amber-500/20 p-3 rounded-2xl text-[10px] text-amber-300 leading-normal">
              <ShieldAlert size={14} className="shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">Interruption Pro-Tip:</span> Since full duplex audio is enabled, you can interrupt Zoya simply by speaking! If the browser stops listening or locks permissions, tap the End button and restart.
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
