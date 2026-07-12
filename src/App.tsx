import React, { useState, useEffect, useRef, useCallback } from "react";
import { Mic, MicOff, Loader2, Volume2, VolumeX, Keyboard, Send, Trash2, Download, Sun, Moon, PhoneCall, Layers, Smartphone, MessageSquare, Bell, Sparkles, X, Play, Pause, ChevronRight } from "lucide-react";
import { getZoyaResponse, getZoyaAudio, resetZoyaSession, ZoyaMood, ZoyaTheme } from "./services/geminiService";
import { processCommand } from "./services/commandService";
import { LiveSessionManager } from "./services/liveService";
import Visualizer from "./components/Visualizer";
import LiveWallpaper from "./components/LiveWallpaper";
import PermissionModal from "./components/PermissionModal";
import GoogleDialerPermissionModal from "./components/GoogleDialerPermissionModal";
import { playPCM } from "./utils/audioUtils";
import { motion, AnimatePresence } from "motion/react";

type AppState = "idle" | "listening" | "processing" | "speaking";

interface ChatMessage {
  id: string;
  sender: "user" | "zoya";
  text: string;
}

declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

export default function App() {
  const [appState, setAppState] = useState<AppState>("idle");
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallBtn, setShowInstallBtn] = useState(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      // Prevent standard browser prompt
      e.preventDefault();
      // Store the event
      setDeferredPrompt(e);
      // Show custom install trigger button
      setShowInstallBtn(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    // Detect if already installed/standalone mode
    const isStandalone = window.matchMedia("(display-mode: standalone)").matches || (window.navigator as any).standalone;
    
    // Check if iOS
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;

    if (isStandalone) {
      setShowInstallBtn(false);
    } else if (isIOS) {
      // iOS doesn't support beforeinstallprompt, but we want to show install instructions
      setShowInstallBtn(true);
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      // Show prompt
      deferredPrompt.prompt();
      // Wait for choice
      const { outcome } = await deferredPrompt.userChoice;
      console.log(`User PWA installation prompt choice: ${outcome}`);
      // Reset state
      setDeferredPrompt(null);
      setShowInstallBtn(false);
    } else {
      // iOS Safari manual instructions
      alert("To install Zoya on your iPhone/iPad:\n\n1. Tap the 'Share' button in Safari (the box with an up arrow at the bottom/top of the screen).\n2. Scroll down and select 'Add to Home Screen'.\n3. Tap 'Add' in the top right to install.");
    }
  };

  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    const saved = localStorage.getItem("zoya_chat_history");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error("Failed to parse chat history", e);
      }
    }
    return [];
  });
  const messagesRef = useRef(messages);

  useEffect(() => {
    messagesRef.current = messages;
    localStorage.setItem("zoya_chat_history", JSON.stringify(messages));
  }, [messages]);

  const [isMuted, setIsMuted] = useState(false);

  useEffect(() => {
    if (liveSessionRef.current) {
      liveSessionRef.current.isMuted = isMuted;
    }
  }, [isMuted]);

  const [showTextInput, setShowTextInput] = useState(false);
  const [textInput, setTextInput] = useState("");
  const [showPermissionModal, setShowPermissionModal] = useState(false);
  const [isSessionActive, setIsSessionActive] = useState(false);

  const [zoyaMood, setZoyaMood] = useState<ZoyaMood>(() => {
    const saved = localStorage.getItem("zoya_mood");
    return (saved as ZoyaMood) || "sassy";
  });

  const [zoyaTheme, setZoyaTheme] = useState<ZoyaTheme>(() => {
    const saved = localStorage.getItem("zoya_theme");
    if (saved === "pretty_female") return "automobile";
    return (saved as ZoyaTheme) || "automobile";
  });



  const [sassLevel, setSassLevel] = useState<number>(() => {
    const saved = localStorage.getItem("zoya_sass_level");
    return saved !== null ? parseInt(saved, 10) : 50;
  });

  const [isWakeWordEnabled, setIsWakeWordEnabled] = useState(() => {
    const saved = localStorage.getItem("zoya_wake_word_enabled");
    return saved !== "false";
  });

  const [isLightTheme, setIsLightTheme] = useState<boolean>(() => {
    return localStorage.getItem("zoya_light_theme") === "true";
  });

  const [hasDialerPermission, setHasDialerPermission] = useState<boolean>(() => {
    return localStorage.getItem("google_dialer_permission") === "true";
  });
  const [hasDisplayOverPermission, setHasDisplayOverPermission] = useState<boolean>(() => {
    return localStorage.getItem("google_display_over_permission") === "true";
  });
  const [hasBackgroundPermission, setHasBackgroundPermission] = useState<boolean>(() => {
    return localStorage.getItem("google_background_permission") === "true";
  });
  const [showDialerPermissionModal, setShowDialerPermissionModal] = useState(false);

  useEffect(() => {
    localStorage.setItem("google_dialer_permission", String(hasDialerPermission));
  }, [hasDialerPermission]);

  useEffect(() => {
    localStorage.setItem("google_display_over_permission", String(hasDisplayOverPermission));
  }, [hasDisplayOverPermission]);

  useEffect(() => {
    localStorage.setItem("google_background_permission", String(hasBackgroundPermission));
  }, [hasBackgroundPermission]);

  useEffect(() => {
    localStorage.setItem("zoya_light_theme", String(isLightTheme));
  }, [isLightTheme]);

  useEffect(() => {
    localStorage.setItem("zoya_wake_word_enabled", String(isWakeWordEnabled));
  }, [isWakeWordEnabled]);

  const [isVoiceBubbleEnabled, setIsVoiceBubbleEnabled] = useState<boolean>(() => {
    return localStorage.getItem("zoya_voice_bubble_enabled") !== "false";
  });
  const [lastZoyaMessage, setLastZoyaMessage] = useState<string | null>(null);
  const [showBubbleNotification, setShowBubbleNotification] = useState<boolean>(false);
  const [hasNewNotification, setHasNewNotification] = useState<boolean>(false);

  useEffect(() => {
    localStorage.setItem("zoya_voice_bubble_enabled", String(isVoiceBubbleEnabled));
  }, [isVoiceBubbleEnabled]);

  useEffect(() => {
    if (messages.length > 0) {
      const lastMsg = messages[messages.length - 1];
      if (lastMsg.sender === "zoya") {
        setLastZoyaMessage(lastMsg.text);
        setHasNewNotification(true);
        setShowBubbleNotification(true);
        const timer = setTimeout(() => {
          setShowBubbleNotification(false);
        }, 7000);
        return () => clearTimeout(timer);
      }
    }
  }, [messages]);



  useEffect(() => {
    localStorage.setItem("zoya_mood", zoyaMood);
    localStorage.setItem("zoya_sass_level", String(sassLevel));
    localStorage.setItem("zoya_theme", zoyaTheme);
    resetZoyaSession();
    if (isSessionActive && liveSessionRef.current) {
      liveSessionRef.current.stop();
      liveSessionRef.current = null;
      setIsSessionActive(false);
      setAppState("idle");
    }
  }, [zoyaMood, sassLevel, zoyaTheme]);

  const liveSessionRef = useRef<LiveSessionManager | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, appState]);

  const handleTextCommand = useCallback(async (finalTranscript: string) => {
    if (!finalTranscript.trim()) {
      setAppState("idle");
      return;
    }

    setMessages((prev) => [...prev, { id: Date.now().toString(), sender: "user", text: finalTranscript }]);
    
    // If live session is active, send text through it
    if (isSessionActive && liveSessionRef.current) {
      liveSessionRef.current.sendText(finalTranscript);
      return;
    }

    setAppState("processing");

    // 1. Check for browser commands
    const commandResult = processCommand(finalTranscript);

    let responseText = "";

    if (commandResult.isBrowserAction) {
      responseText = commandResult.action;
      setMessages((prev) => [...prev, { id: Date.now().toString() + "-z", sender: "zoya", text: responseText }]);
      
      if (!isMuted) {
        setAppState("speaking");
        const audioBase64 = await getZoyaAudio(responseText, zoyaTheme);
        if (audioBase64) {
          await playPCM(audioBase64);
        }
      }

      setAppState("idle");

      setTimeout(() => {
        if (commandResult.url) {
          if (commandResult.url.startsWith("tel:") && !hasDialerPermission) {
            setShowDialerPermissionModal(true);
            return;
          }
          try {
            window.open(commandResult.url, "_blank");
          } catch (err) {
            console.error("Failed to open URL in a new window:", commandResult.url, err);
          }
        }
      }, 1500);
    } else {
      // 2. General Chit-Chat via Gemini
      responseText = await getZoyaResponse(finalTranscript, messagesRef.current, zoyaMood, sassLevel, zoyaTheme);
      setMessages((prev) => [...prev, { id: Date.now().toString() + "-z", sender: "zoya", text: responseText }]);
      
      if (!isMuted) {
        setAppState("speaking");
        const audioBase64 = await getZoyaAudio(responseText, zoyaTheme);
        if (audioBase64) {
          await playPCM(audioBase64);
        }
      }
      setAppState("idle");
    }
  }, [isMuted, isSessionActive, zoyaMood, sassLevel, zoyaTheme, hasDialerPermission]);

  useEffect(() => {
    return () => {
      if (liveSessionRef.current) {
        liveSessionRef.current.stop();
      }
    };
  }, []);

  const toggleListening = useCallback(async () => {
    if (isSessionActive) {
      setIsSessionActive(false);
      if (liveSessionRef.current) {
        liveSessionRef.current.stop();
        liveSessionRef.current = null;
      }
      setAppState("idle");
      resetZoyaSession();
    } else {
      try {
        setIsSessionActive(true);
        resetZoyaSession();
        
        const session = new LiveSessionManager(zoyaMood, sassLevel, zoyaTheme);
        session.isMuted = isMuted;
        liveSessionRef.current = session;
        
        session.onStateChange = (state) => {
          setAppState(state);
        };
        
        session.onMessage = (sender, text) => {
          setMessages((prev) => [...prev, { id: Date.now().toString() + "-" + sender, sender, text }]);
        };
        
        session.onCommand = (url) => {
          if (url.startsWith("tel:") && !hasDialerPermission) {
            setShowDialerPermissionModal(true);
            return;
          }
          setTimeout(() => {
            try {
              window.open(url, "_blank");
            } catch (err) {
              console.error("Failed to open URL in a new window:", url, err);
            }
          }, 1000);
        };

        await session.start();
      } catch (e) {
        console.error("Failed to start session", e);
        setShowPermissionModal(true);
        setIsSessionActive(false);
        setAppState("idle");
      }
    }
  }, [isSessionActive, isMuted, zoyaMood, sassLevel, zoyaTheme, hasDialerPermission]);

  const toggleListeningRef = useRef(toggleListening);
  useEffect(() => {
    toggleListeningRef.current = toggleListening;
  }, [toggleListening]);

  useEffect(() => {
    if (!isWakeWordEnabled || isSessionActive) {
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.warn("SpeechRecognition is not supported in this browser.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-IN";

    let isStopping = false;

    recognition.onresult = (event: any) => {
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        const result = event.results[i];
        if (!result.isFinal && event.results.length > i + 1) continue;
        const text = result[0].transcript.toLowerCase();
        console.log("Wake word recognition transcript:", text);
        
        if (
          text.includes("hey zoya") || 
          text.includes("he zoya") || 
          text.includes("hay zoya") || 
          text.includes("hai zoya") || 
          text.includes("okay zoya") || 
          text.includes("ok zoya") ||
          text.includes("hi zoya") ||
          text.includes("hello zoya") ||
          text.trim() === "zoya"
        ) {
          console.log("Wake word 'Hey Zoya' detected!");
          isStopping = true;
          recognition.stop();
          
          setTimeout(() => {
            toggleListeningRef.current();
          }, 300);
          break;
        }
      }
    };

    recognition.onerror = (event: any) => {
      const error = event.error;
      // "no-speech" and "aborted" are standard, benign behaviors for continuous listening
      if (error === "no-speech" || error === "aborted") {
        console.debug(`Wake word listener state: ${error}`);
        if (error === "aborted") {
          isStopping = true;
        }
        return;
      }
      
      console.error("Wake word recognition error:", error);
      if (error === "not-allowed" || error === "audio-capture") {
        isStopping = true;
      }
    };

    recognition.onend = () => {
      if (!isStopping && !isSessionActive && isWakeWordEnabled) {
        // Small backoff delay to prevent tight error-loops
        setTimeout(() => {
          if (!isStopping && !isSessionActive && isWakeWordEnabled) {
            try {
              recognition.start();
            } catch (err) {
              console.debug("Failed to restart wake word recognition:", err);
            }
          }
        }, 400);
      }
    };

    try {
      recognition.start();
    } catch (err) {
      console.error("Failed to start wake word recognition:", err);
    }

    return () => {
      isStopping = true;
      try {
        recognition.stop();
      } catch (err) {
        // ignore
      }
    };
  }, [isWakeWordEnabled, isSessionActive]);

  const handleTextSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!textInput.trim()) return;
    
    handleTextCommand(textInput);
    setTextInput("");
    setShowTextInput(false);
  };

  return (
    <div className={`h-[100dvh] w-screen flex flex-col items-center justify-between font-sans relative overflow-hidden m-0 p-0 transition-colors duration-500
      ${isLightTheme ? "bg-[#f8fafc] text-slate-900" : "bg-[#050505] text-white"}`}>
      {showPermissionModal && (
        <PermissionModal 
          onClose={() => setShowPermissionModal(false)} 
          isLightTheme={isLightTheme}
        />
      )}

      {showDialerPermissionModal && (
        <GoogleDialerPermissionModal 
          onClose={() => setShowDialerPermissionModal(false)} 
          hasDialerPermission={hasDialerPermission}
          setHasDialerPermission={setHasDialerPermission}
          hasDisplayOverPermission={hasDisplayOverPermission}
          setHasDisplayOverPermission={setHasDisplayOverPermission}
          hasBackgroundPermission={hasBackgroundPermission}
          setHasBackgroundPermission={setHasBackgroundPermission}
          isLightTheme={isLightTheme}
        />
      )}

      {/* Cinematic Background Gradients with Dynamic Live Wallpaper */}
      <div className="absolute inset-0 w-full h-full overflow-hidden pointer-events-none">

        <div className={`absolute inset-0 transition-all duration-500
          ${isLightTheme ? "bg-gradient-to-b from-white/20 via-slate-50/75 to-[#f8fafc]" : "bg-gradient-to-b from-transparent via-[#050505]/65 to-[#050505]"}`} 
        />
        <div className={`absolute top-[-20%] left-[-10%] w-[50%] h-[50%] blur-[120px] rounded-full transition-all duration-500
          ${zoyaTheme === "anime"
            ? isLightTheme ? "bg-fuchsia-300/30" : "bg-fuchsia-900/25"
            : zoyaTheme === "enemy"
              ? isLightTheme ? "bg-red-300/30" : "bg-red-900/25"
              : isLightTheme ? "bg-violet-300/30" : "bg-violet-900/25"
          }`} 
        />
        <div className={`absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] blur-[120px] rounded-full transition-all duration-500
          ${zoyaTheme === "anime"
            ? isLightTheme ? "bg-rose-300/30" : "bg-rose-900/25"
            : zoyaTheme === "enemy"
              ? isLightTheme ? "bg-neutral-300/30" : "bg-rose-950/25"
              : isLightTheme ? "bg-pink-300/30" : "bg-pink-900/25"
          }`} 
        />
        {/* Responsive, dynamic HTML5 Canvas particle live wallpaper */}
        <LiveWallpaper theme={zoyaTheme} state={appState} />
      </div>

      {/* Header */}
      <header className="absolute top-0 left-0 w-full flex justify-between items-center z-20 shrink-0 px-6 py-4 md:px-12 md:py-6 animate-fade-in">
        <div className="flex items-center gap-3">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm text-white shadow-md transition-all duration-500
            ${zoyaTheme === "anime"
              ? "bg-gradient-to-tr from-pink-400 to-rose-400"
              : zoyaTheme === "enemy"
                ? "bg-gradient-to-tr from-red-600 to-neutral-900"
                : "bg-gradient-to-tr from-violet-500 to-pink-500"
            }`}
          >
            {zoyaTheme === "anime" ? "🌸" : zoyaTheme === "enemy" ? "😈" : "Z"}
          </div>
          <h1 className={`text-xl font-serif font-semibold tracking-wide transition-colors duration-500
            ${isLightTheme ? "text-slate-900" : "text-white opacity-90"}`}
          >
            {zoyaTheme === "anime" ? "Crimson Zoya" : zoyaTheme === "enemy" ? "Nemesis Zoya" : "Zoya Pro"}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          {window.self !== window.top && (
            <a
              href={window.location.href}
              target="_blank"
              rel="noopener noreferrer"
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all text-xs font-semibold tracking-wider mr-1 cursor-pointer
                ${isLightTheme 
                  ? "bg-cyan-50 text-cyan-700 border-cyan-200 hover:bg-cyan-100" 
                  : "bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 hover:text-white border border-cyan-500/30"
                }`}
              title="Open in new tab to grant microphone permission"
            >
              <span>Open in New Tab ↗</span>
            </a>
          )}
          {showInstallBtn && (
            <button
              onClick={handleInstallClick}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all text-xs font-semibold tracking-wider mr-2 cursor-pointer
                ${isLightTheme
                  ? "bg-violet-50 text-violet-700 border-violet-200 hover:bg-violet-100"
                  : "bg-violet-500/10 hover:bg-violet-500/20 text-violet-300 hover:text-white border border-violet-500/30"
                }`}
              title="Install Zoya App"
            >
              <Download size={14} className="animate-bounce" />
              <span>Install App</span>
            </button>
          )}
          <button
            onClick={() => setIsWakeWordEnabled(!isWakeWordEnabled)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all text-xs font-semibold tracking-wider cursor-pointer select-none mr-2
              ${isWakeWordEnabled 
                ? isLightTheme
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                  : "bg-emerald-500/10 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/20" 
                : isLightTheme
                  ? "bg-slate-100 text-slate-400 border-slate-200 hover:bg-slate-200 hover:text-slate-600"
                  : "bg-white/5 text-white/40 border-white/10 hover:bg-white/10 hover:text-white/60"
              }`}
            title="Toggle 'Hey Zoya' voice activation"
          >
            {isWakeWordEnabled ? (
              <>
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span>'Hey Zoya' On</span>
              </>
            ) : (
              <>
                <span className={`h-2 w-2 rounded-full ${isLightTheme ? "bg-slate-300" : "bg-white/20"}`}></span>
                <span>'Hey Zoya' Off</span>
              </>
            )}
          </button>

          <button
            onClick={() => {
              if (hasDialerPermission) {
                setHasDialerPermission(false);
              } else {
                setShowDialerPermissionModal(true);
              }
            }}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all text-xs font-semibold tracking-wider cursor-pointer select-none mr-2
              ${hasDialerPermission 
                ? isLightTheme
                  ? "bg-violet-50 text-violet-700 border-violet-200 hover:bg-violet-100"
                  : "bg-violet-500/10 text-violet-300 border-violet-500/30 hover:bg-violet-500/20" 
                : isLightTheme
                  ? "bg-slate-100 text-slate-400 border-slate-200 hover:bg-slate-200 hover:text-slate-600"
                  : "bg-white/5 text-white/40 border-white/10 hover:bg-white/10 hover:text-white/60"
              }`}
            title="Toggle Google Dialer Permission for dialing phone numbers"
          >
            <PhoneCall size={12} className={hasDialerPermission ? "text-violet-500" : ""} />
            <span>Dialer {hasDialerPermission ? "Allowed" : "Blocked"}</span>
          </button>
          <button
            onClick={() => {
              if (hasDisplayOverPermission) {
                setHasDisplayOverPermission(false);
              } else {
                setShowDialerPermissionModal(true);
              }
            }}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all text-xs font-semibold tracking-wider cursor-pointer select-none mr-2
              ${hasDisplayOverPermission 
                ? isLightTheme
                  ? "bg-pink-50 text-pink-700 border-pink-200 hover:bg-pink-100"
                  : "bg-pink-500/10 text-pink-300 border-pink-500/30 hover:bg-pink-500/20" 
                : isLightTheme
                  ? "bg-slate-100 text-slate-400 border-slate-200 hover:bg-slate-200 hover:text-slate-600"
                  : "bg-white/5 text-white/40 border-white/10 hover:bg-white/10 hover:text-white/60"
              }`}
            title="Toggle Display Over Permission"
          >
            <Layers size={12} className={hasDisplayOverPermission ? "text-pink-500" : ""} />
            <span>Display Over {hasDisplayOverPermission ? "Allowed" : "Blocked"}</span>
          </button>
          <button
            onClick={() => {
              if (hasBackgroundPermission) {
                setHasBackgroundPermission(false);
              } else {
                setShowDialerPermissionModal(true);
              }
            }}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all text-xs font-semibold tracking-wider cursor-pointer select-none mr-2
              ${hasBackgroundPermission 
                ? isLightTheme
                  ? "bg-sky-50 text-sky-700 border-sky-200 hover:bg-sky-100"
                  : "bg-sky-500/10 text-sky-300 border-sky-500/30 hover:bg-sky-500/20" 
                : isLightTheme
                  ? "bg-slate-100 text-slate-400 border-slate-200 hover:bg-slate-200 hover:text-slate-600"
                  : "bg-white/5 text-white/40 border-white/10 hover:bg-white/10 hover:text-white/60"
              }`}
            title="Toggle Background Run Permission"
          >
            <Smartphone size={12} className={hasBackgroundPermission ? "text-sky-500" : ""} />
            <span>Background Run {hasBackgroundPermission ? "Allowed" : "Blocked"}</span>
          </button>
          <button
            onClick={() => setIsVoiceBubbleEnabled(!isVoiceBubbleEnabled)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all text-xs font-semibold tracking-wider cursor-pointer select-none mr-2
              ${isVoiceBubbleEnabled 
                ? isLightTheme
                  ? "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100"
                  : "bg-amber-500/10 text-amber-300 border-amber-500/30 hover:bg-amber-500/20" 
                : isLightTheme
                  ? "bg-slate-100 text-slate-400 border-slate-200 hover:bg-slate-200 hover:text-slate-600"
                  : "bg-white/5 text-white/40 border-white/10 hover:bg-white/10 hover:text-white/60"
              }`}
            title="Toggle Voice Chat Notification Bubble"
          >
            <Bell size={12} className={isVoiceBubbleEnabled ? "text-amber-500" : ""} />
            <span>Voice Bubble {isVoiceBubbleEnabled ? "On" : "Off"}</span>
          </button>
          <button
            onClick={() => setIsLightTheme(!isLightTheme)}
            className={`p-2 rounded-full border transition-colors mr-2 cursor-pointer
              ${isLightTheme
                ? "bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200"
                : "bg-white/5 border-white/10 text-white hover:bg-white/10"
              }`}
            title={isLightTheme ? "Switch to Dark Mode" : "Switch to Light Mode"}
          >
            {isLightTheme ? <Moon size={18} className="opacity-80" /> : <Sun size={18} className="opacity-80" />}
          </button>
          {messages.length > 0 && (
            <button
              onClick={() => {
                if (confirm("Are you sure you want to clear the chat history?")) {
                  setMessages([]);
                  resetZoyaSession();
                }
              }}
              className={`p-2 rounded-full border transition-colors mr-2 cursor-pointer
                ${isLightTheme
                  ? "bg-slate-100 border-slate-200 text-slate-700 hover:bg-red-50 hover:text-red-600"
                  : "bg-white/5 border-white/10 text-white hover:bg-red-500/20 hover:text-red-400"
                }`}
              title="Clear Chat History"
            >
              <Trash2 size={18} className="opacity-70" />
            </button>
          )}
          <button
            onClick={() => setIsMuted(!isMuted)}
            className={`p-2 rounded-full border transition-colors cursor-pointer
              ${isLightTheme
                ? "bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200"
                : "bg-white/5 border-white/10 text-white hover:bg-white/10"
              }`}
            title={isMuted ? "Unmute" : "Mute"}
          >
            {isMuted ? (
              <VolumeX size={18} className="opacity-70" />
            ) : (
              <Volume2 size={18} className="opacity-70" />
            )}
          </button>
        </div>
      </header>

      {/* Main Content - Visualizer & Chat */}
      <main className="absolute inset-0 flex flex-row items-center justify-between w-full h-full z-10 overflow-hidden pt-20 pb-24 px-4 md:px-12 pointer-events-none">
        
        {/* Left Column: Zoya Status */}
        <div className="flex w-[30%] lg:w-[25%] h-full flex-col justify-center gap-4 z-10">
          <div className="h-6">
            <AnimatePresence>
              {appState === "processing" && (
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className={`flex items-center gap-2 text-sm md:text-base italic font-serif transition-colors duration-500
                    ${isLightTheme ? "text-sky-700 font-semibold" : "text-cyan-300/80"}`}
                >
                  <Loader2 size={16} className="animate-spin" />
                  Replying...
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Center Visualizer (Fixed Full Screen Background) */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0">
          <Visualizer state={appState} isLightTheme={isLightTheme} theme={zoyaTheme} />
        </div>

        {/* Right Column: User Status */}
        <div className="flex w-[30%] lg:w-[25%] h-full flex-col justify-center gap-4 z-10">
          <div className="h-6 flex justify-end">
            <AnimatePresence>
              {appState === "listening" && (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className={`flex items-center gap-2 text-sm md:text-base italic transition-colors duration-500
                    ${isLightTheme ? "text-violet-700 font-semibold" : "text-violet-300/80"}`}
                >
                  <div className={`w-2 h-2 rounded-full animate-pulse ${isLightTheme ? "bg-violet-600" : "bg-violet-400"}`} />
                  Listening...
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

      </main>

      {/* Controls */}
      <footer className="absolute bottom-0 left-0 w-full flex flex-col items-center justify-center pb-6 md:pb-8 z-20 shrink-0 gap-3.5 animate-fade-in">
        {/* Mood Selector Segmented Control */}
        <div className="flex flex-col items-center gap-1 pointer-events-auto">
          <span className={`text-[9px] uppercase tracking-widest font-bold transition-colors duration-500
            ${isLightTheme ? "text-slate-500" : "text-white/30"}`}>Zoya's Mood</span>
          <div className={`flex items-center gap-1 border rounded-full p-1 backdrop-blur-md transition-all duration-500
            ${isLightTheme 
              ? "bg-slate-200/90 border-slate-300/80 shadow-[inset_0_2px_4px_rgba(0,0,0,0.06)]" 
              : "bg-black/40 border-white/10 shadow-lg"
            }`}
          >
            {(["sassy", "professional", "bubbly"] as ZoyaMood[]).map((mood) => {
              const isActive = zoyaMood === mood;
              const label = mood === "sassy" ? "💅 Sassy" : mood === "professional" ? "💼 Professional" : "✨ Bubbly";
              const activeThemeBgClass = zoyaTheme === "anime" 
                ? "bg-gradient-to-r from-pink-500 to-rose-500"
                : zoyaTheme === "enemy" 
                  ? "bg-gradient-to-r from-red-600 to-red-900 border border-red-500/20"
                  : "bg-gradient-to-r from-violet-600 to-pink-600";
              return (
                <button
                  key={mood}
                  onClick={() => setZoyaMood(mood)}
                  className={`
                    relative px-4 py-1.5 rounded-full text-xs font-semibold tracking-wide transition-all duration-300 cursor-pointer z-10 select-none
                    ${isActive 
                      ? "text-white scale-105 font-bold" 
                      : isLightTheme 
                        ? "text-slate-600 hover:text-slate-900" 
                        : "text-white/40 hover:text-white/80"
                    }
                  `}
                >
                  {isActive && (
                    <motion.div
                      layoutId="activeMoodBg"
                      className={`absolute inset-0 rounded-full -z-10 shadow-sm ${activeThemeBgClass}`}
                      transition={{ type: "spring", stiffness: 350, damping: 25 }}
                    />
                  )}
                  <span>{label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Sass Level Slider */}
        <div className="flex flex-col items-center gap-1 w-64 pointer-events-auto px-4">
          <div className="flex justify-between w-full text-[10px] uppercase tracking-widest font-bold transition-colors duration-500">
            <span className={isLightTheme ? "text-slate-500" : "text-white/30"}>Sass Level Adjustment</span>
            <span className={`transition-all duration-500
              ${zoyaTheme === "pretty_female" ? "text-pink-500 font-bold" : zoyaTheme === "enemy" ? "text-red-500 font-bold" : "text-violet-500 font-bold"}`}
            >
              {sassLevel}%
            </span>
          </div>
          <div className="flex items-center gap-2 w-full">
            <span className="text-xs select-none">😇</span>
            <input
              type="range"
              min="0"
              max="100"
              value={sassLevel}
              onChange={(e) => setSassLevel(Number(e.target.value))}
              className={`w-full h-1.5 rounded-lg appearance-none cursor-pointer transition-all duration-300 outline-none
                ${isLightTheme ? "bg-slate-300 hover:bg-slate-400" : "bg-white/10 hover:bg-white/20"}
              `}
              style={{
                background: zoyaTheme === "pretty_female"
                  ? isLightTheme
                    ? `linear-gradient(to right, rgb(236, 72, 153) 0%, rgb(236, 72, 153) ${sassLevel}%, rgb(203, 213, 225) ${sassLevel}%, rgb(203, 213, 225) 100%)`
                    : `linear-gradient(to right, rgb(244, 114, 182) 0%, rgb(244, 114, 182) ${sassLevel}%, rgba(255, 255, 255, 0.1) ${sassLevel}%, rgba(255, 255, 255, 0.1) 100%)`
                  : zoyaTheme === "enemy"
                  ? isLightTheme
                    ? `linear-gradient(to right, rgb(220, 38, 38) 0%, rgb(220, 38, 38) ${sassLevel}%, rgb(203, 213, 225) ${sassLevel}%, rgb(203, 213, 225) 100%)`
                    : `linear-gradient(to right, rgb(185, 28, 28) 0%, rgb(185, 28, 28) ${sassLevel}%, rgba(255, 255, 255, 0.1) ${sassLevel}%, rgba(255, 255, 255, 0.1) 100%)`
                  : isLightTheme
                  ? `linear-gradient(to right, rgb(124, 58, 237) 0%, rgb(124, 58, 237) ${sassLevel}%, rgb(203, 213, 225) ${sassLevel}%, rgb(203, 213, 225) 100%)`
                  : `linear-gradient(to right, rgb(139, 92, 246) 0%, rgb(139, 92, 246) ${sassLevel}%, rgba(255, 255, 255, 0.1) ${sassLevel}%, rgba(255, 255, 255, 0.1) 100%)`
              }}
            />
            <span className="text-xs select-none">💅🔥</span>
          </div>
          <div className={`text-[10px] font-medium tracking-wide transition-colors duration-500
            ${isLightTheme ? "text-slate-500" : "text-white/40"}`}
          >
            {zoyaTheme === "pretty_female" ? (
              <span>Gentle Royal Whispers 🌸👑</span>
            ) : zoyaTheme === "enemy" ? (
              <span>Maximum Rival Hostility! 😈⚔️</span>
            ) : (
              sassLevel <= 10 ? "Gentle & Sweet 🥺" :
              sassLevel <= 35 ? "Mild Teasing 😏" :
              sassLevel <= 65 ? "Charming & Sassy 💅" :
              sassLevel <= 85 ? "High Drama Diva 🎭" : "Relentless Savagery! 💀🔥"
            )}
          </div>
        </div>

        <AnimatePresence>
          {showTextInput && (
            <motion.form 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              onSubmit={handleTextSubmit}
              className={`w-full max-w-md flex items-center gap-2 border rounded-full p-1 pl-4 backdrop-blur-md transition-all duration-500
                ${isLightTheme 
                  ? "bg-white border-slate-300 text-slate-900 shadow-[0_10px_30px_rgba(0,0,0,0.08)]" 
                  : "bg-white/5 border-white/10 text-white shadow-2xl"
                }`}
            >
              <input 
                type="text"
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                placeholder="Type a message to Zoya..."
                className={`flex-1 bg-transparent border-none outline-none text-sm transition-colors duration-500
                  ${isLightTheme ? "text-slate-900 placeholder:text-slate-400" : "text-white placeholder:text-white/30"}`}
                autoFocus
              />
              <button 
                type="submit"
                disabled={!textInput.trim()}
                className={`p-2 rounded-full transition-colors disabled:opacity-50 cursor-pointer
                  ${isLightTheme 
                    ? "bg-violet-600 text-white hover:bg-violet-700 disabled:hover:bg-violet-600" 
                    : "bg-violet-500 text-white hover:bg-violet-600 disabled:hover:bg-violet-500"
                  }`}
              >
                <Send size={16} />
              </button>
            </motion.form>
          )}
        </AnimatePresence>

        <div className="flex items-center gap-4">
          <button
            onClick={toggleListening}
            className={`
              group relative flex items-center gap-3 px-8 py-4 rounded-full font-semibold tracking-wide transition-all duration-300 shadow-2xl cursor-pointer
              ${
                isSessionActive
                  ? isLightTheme
                    ? "bg-red-50 text-red-600 border border-red-200 hover:bg-red-100"
                    : "bg-red-500/20 text-red-400 border border-red-500/50 hover:bg-red-500/30"
                  : isLightTheme
                    ? "bg-slate-900 text-white border border-slate-800 hover:bg-black hover:scale-105"
                    : "bg-white/10 text-white border border-white/20 hover:bg-white/20 hover:scale-105"
              }
            `}
          >
            {isSessionActive ? (
              <>
                <MicOff size={20} />
                <span>End Session</span>
              </>
            ) : (
              <>
                <Mic size={20} className="group-hover:animate-bounce" />
                <span>Start Session</span>
              </>
            )}
          </button>
          
          {!isSessionActive && (
            <button
              onClick={() => setShowTextInput(!showTextInput)}
              className={`p-4 rounded-full border transition-colors shadow-2xl cursor-pointer
                ${isLightTheme
                  ? "bg-white border-slate-200 hover:bg-slate-50 text-slate-800"
                  : "bg-white/5 border-white/10 hover:bg-white/10 text-white"
                }`}
              title="Type instead"
            >
              <Keyboard size={20} className="opacity-70" />
            </button>
          )}
        </div>
      </footer>

      {isVoiceBubbleEnabled && (
        <div className="fixed bottom-24 right-6 z-50 flex flex-col items-end gap-3 pointer-events-auto">
          {/* Notification slide-out popover */}
          <AnimatePresence>
            {showBubbleNotification && lastZoyaMessage && (
              <motion.div
                initial={{ opacity: 0, x: 20, scale: 0.9 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: 20, scale: 0.9 }}
                className={`mr-3 max-w-[280px] p-4 rounded-2xl shadow-2xl text-xs border backdrop-blur-md relative flex flex-col gap-2
                  ${isLightTheme 
                    ? "bg-white/95 border-slate-200 text-slate-800 shadow-slate-200/50" 
                    : "bg-[#0c0c0e]/95 border-white/10 text-white shadow-black/80"
                  }`}
              >
                {/* Speech Bubble Arrow */}
                <div className={`absolute right-[-6px] top-6 w-3 h-3 rotate-45 border-r border-t
                  ${isLightTheme ? "bg-white border-slate-200" : "bg-[#0c0c0e]/95 border-white/10"}`} 
                />

                {/* Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Sparkles size={12} className="text-amber-500 animate-pulse" />
                    <span className="font-bold text-[10px] text-violet-500 uppercase tracking-wider">Zoya Notification</span>
                    {hasNewNotification && (
                      <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping" />
                    )}
                  </div>
                  <button 
                    onClick={() => {
                      setShowBubbleNotification(false);
                      setHasNewNotification(false);
                    }}
                    className="p-0.5 rounded-full hover:bg-slate-100 dark:hover:bg-white/10 text-slate-400 dark:text-white/40 cursor-pointer"
                  >
                    <X size={12} />
                  </button>
                </div>

                {/* Message body */}
                <p className="line-clamp-3 leading-relaxed text-slate-600 dark:text-slate-300 font-medium">
                  {lastZoyaMessage}
                </p>

                {/* Quick actions inside notification */}
                <div className="flex items-center justify-between mt-1 pt-1.5 border-t border-slate-100 dark:border-white/5">
                  <span className="text-[9px] text-slate-400 dark:text-white/30 font-mono">Voice Active</span>
                  <button
                    onClick={() => {
                      setShowBubbleNotification(false);
                      setHasNewNotification(false);
                      if (!isSessionActive) {
                        toggleListening();
                      }
                    }}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wide transition-all duration-300 cursor-pointer
                      ${isSessionActive
                        ? "bg-red-500/20 text-red-500 border border-red-500/30"
                        : "bg-violet-600 text-white hover:bg-violet-700 hover:scale-105 shadow-md"
                      }`}
                  >
                    {isSessionActive ? "End Session" : "Reply by Voice"}
                    <ChevronRight size={10} />
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Floating Bubble Trigger */}
          <div className="relative">
            <motion.button
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                if (hasNewNotification) {
                  setShowBubbleNotification(!showBubbleNotification);
                  setHasNewNotification(false);
                } else {
                  toggleListening();
                }
              }}
              className={`w-14 h-14 rounded-full flex items-center justify-center shadow-2xl relative border cursor-pointer select-none transition-colors duration-300
                ${isLightTheme
                  ? "bg-white border-slate-200 text-slate-800 hover:bg-slate-50"
                  : "bg-[#0f0f11] border-white/10 text-white hover:bg-white/5"
                }`}
            >
              {/* Active voice connection concentric rings */}
              {isSessionActive && (
                <>
                  <span className="absolute -inset-2.5 rounded-full border border-violet-500/25 animate-ping duration-1000" />
                  <span className="absolute -inset-1.5 rounded-full border border-violet-500/40 animate-pulse" />
                </>
              )}

              {/* Dynamic waveform visualizer inside bubble */}
              {isSessionActive && (appState === "speaking" || appState === "listening") ? (
                <div className="flex items-center gap-0.5 justify-center h-5 w-8">
                  <span className="w-0.75 h-3 rounded-full animate-bounce bg-violet-500" style={{ animationDelay: "0ms", animationDuration: "0.6s" }} />
                  <span className="w-0.75 h-5 rounded-full animate-bounce bg-pink-500" style={{ animationDelay: "150ms", animationDuration: "0.8s" }} />
                  <span className="w-0.75 h-2 rounded-full animate-bounce bg-cyan-500" style={{ animationDelay: "300ms", animationDuration: "0.5s" }} />
                  <span className="w-0.75 h-4 rounded-full animate-bounce bg-amber-500" style={{ animationDelay: "450ms", animationDuration: "0.7s" }} />
                </div>
              ) : (
                /* Themed avatar / logo icon inside bubble */
                <div className={`w-11 h-11 rounded-full flex items-center justify-center font-bold text-lg text-white shadow-md transition-all duration-300
                  ${zoyaTheme === "anime"
                    ? "bg-gradient-to-tr from-pink-400 to-rose-400"
                    : zoyaTheme === "enemy"
                      ? "bg-gradient-to-tr from-red-600 to-neutral-900"
                      : "bg-gradient-to-tr from-violet-500 to-pink-500"
                  }`}
                >
                  {zoyaTheme === "anime" ? "🌸" : zoyaTheme === "enemy" ? "😈" : "Z"}
                </div>
              )}

              {/* State Status dot badge */}
              <span className={`absolute bottom-0 right-0 w-4 h-4 rounded-full border-2 flex items-center justify-center shadow-md transition-all duration-300
                ${isLightTheme ? "bg-white border-white text-white" : "bg-[#0f0f11] border-[#0f0f11] text-[#0f0f11]"}`}
              >
                {appState === "speaking" ? (
                  <span className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse" />
                ) : appState === "listening" ? (
                  <span className="w-2 h-2 rounded-full bg-violet-500 animate-pulse" />
                ) : appState === "processing" ? (
                  <Loader2 size={10} className="animate-spin text-amber-500" />
                ) : (
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                )}
              </span>

              {/* Badge for unread voice notification count */}
              {hasNewNotification && (
                <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full shadow-md animate-pulse">
                  NEW
                </span>
              )}
            </motion.button>
          </div>
        </div>
      )}

    </div>
  );
}
