import React, { useState, useEffect, useRef, useCallback } from "react";
import { Mic, MicOff, Loader2, Volume2, VolumeX, Keyboard, Send, Trash2, Download, Sun, Moon, PhoneCall, Layers, Smartphone, Youtube, ExternalLink, X, SlidersHorizontal, QrCode, Monitor, Settings, Info, Zap } from "lucide-react";
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
  const [showInstallGuide, setShowInstallGuide] = useState<boolean>(false);
  const [isStandalone, setIsStandalone] = useState<boolean>(false);
  const [copiedUrl, setCopiedUrl] = useState<boolean>(false);
  const [installTab, setInstallTab] = useState<"ios" | "android">(() => {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    return isIOS ? "ios" : "android";
  });

  const [useMobileFrame, setUseMobileFrame] = useState<boolean>(() => {
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    return !isMobile;
  });
  const [isMobileDevice, setIsMobileDevice] = useState<boolean>(false);
  const [showQrModal, setShowQrModal] = useState<boolean>(false);
  const [showSettingsModal, setShowSettingsModal] = useState<boolean>(false);

  useEffect(() => {
    const checkDevice = () => {
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth < 768;
      setIsMobileDevice(isMobile);
    };
    checkDevice();
    window.addEventListener("resize", checkDevice);
    return () => window.removeEventListener("resize", checkDevice);
  }, []);

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
    const checkStandalone = window.matchMedia("(display-mode: standalone)").matches || (window.navigator as any).standalone;
    setIsStandalone(!!checkStandalone);
    
    // Check if iOS
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;

    if (checkStandalone) {
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
      // iOS Safari manual instructions modal
      setShowInstallGuide(true);
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

  const [activeBrowserAction, setActiveBrowserAction] = useState<{
    action: string;
    url: string;
    nativeUrl?: string;
    songName?: string;
    type: "youtube" | "spotify" | "whatsapp" | "call" | "maps" | "open";
  } | null>(null);

  const triggerBrowserAction = useCallback((url: string, actionText: string) => {
    if (url.startsWith("tel:") && !hasDialerPermission) {
      setShowDialerPermissionModal(true);
      return;
    }

    let type: "youtube" | "spotify" | "whatsapp" | "call" | "maps" | "open" = "open";
    let songName = "";

    if (url.includes("youtube.com")) {
      type = "youtube";
      const match = url.match(/search_query=([^&]+)/);
      if (match) songName = decodeURIComponent(match[1]);
    } else if (url.includes("spotify.com")) {
      type = "spotify";
      const match = url.match(/search\/([^&?]+)/);
      if (match) songName = decodeURIComponent(match[1]);
    } else if (url.includes("whatsapp.com")) {
      type = "whatsapp";
    } else if (url.startsWith("tel:")) {
      type = "call";
    } else if (url.includes("google.com/maps") || url.includes("maps.google.com") || url.includes("maps.app.goo.gl")) {
      type = "maps";
    }

    let targetUrl = url;
    let isNativeScheme = false;

    if (url.startsWith("tel:")) {
      isNativeScheme = true;
    }

    setActiveBrowserAction({
      action: actionText,
      url,
      nativeUrl: isNativeScheme ? targetUrl : undefined,
      songName: songName || undefined,
      type
    });
  }, [hasDialerPermission]);

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

      if (commandResult.url) {
        triggerBrowserAction(commandResult.url, responseText);
      }
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
        
        session.onClose = () => {
          setIsSessionActive(false);
          setAppState("idle");
          liveSessionRef.current = null;
        };
        
        session.onCommand = (url) => {
          triggerBrowserAction(url, "Command triggered from voice session");
        };

        await session.start();
      } catch (e) {
        console.error("Failed to start session", e);
        setShowPermissionModal(true);
        setIsSessionActive(false);
        setAppState("idle");
      }
    }
  }, [isSessionActive, isMuted, zoyaMood, sassLevel, zoyaTheme, hasDialerPermission, triggerBrowserAction]);

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

  const handleQuickAction = (commandText: string) => {
    handleTextCommand(commandText);
    setTextInput("");
    setShowTextInput(false);
  };

  const renderQrModal = () => (
    <AnimatePresence key="qr-modal">
      {showQrModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4 pointer-events-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className={`w-full max-w-sm rounded-3xl p-6 shadow-2xl flex flex-col items-center text-center border relative overflow-hidden transition-colors duration-500
              ${isLightTheme 
                ? "bg-white border-slate-200 text-slate-900" 
                : "bg-zinc-950 border-white/10 text-white"
              }`}
          >
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-violet-500 to-pink-500" />
            
            <button
              onClick={() => setShowQrModal(false)}
              className={`absolute top-4 right-4 p-1.5 rounded-full transition-colors cursor-pointer
                ${isLightTheme ? "hover:bg-slate-100 text-slate-400 hover:text-slate-600" : "hover:bg-white/10 text-white/40 hover:text-white"}`}
            >
              <X size={18} />
            </button>

            <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-4
              ${isLightTheme ? "bg-violet-50" : "bg-violet-500/10"}`}>
              <QrCode size={24} className="text-violet-500" />
            </div>

            <h3 className="text-lg font-serif font-semibold mb-2">Run Zoya on Mobile</h3>
            <p className={`text-xs mb-5 leading-relaxed px-2 ${isLightTheme ? "text-slate-500" : "text-white/60"}`}>
              Scan this QR code with your phone camera to run the voice assistant directly on your mobile browser!
            </p>

            <div className="bg-white p-4 rounded-2xl shadow-inner border border-slate-100 flex items-center justify-center mb-5">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(window.location.href)}`}
                alt="Scan QR Code"
                className="w-48 h-48 select-none pointer-events-none"
                referrerPolicy="no-referrer"
              />
            </div>

            <div className="flex items-center gap-1.5 text-[10px] opacity-50 mb-6 bg-slate-500/5 px-3 py-1.5 rounded-full">
              <Info size={11} />
              <span>Ensure phone and computer are on same network</span>
            </div>

            <button
              onClick={() => setShowQrModal(false)}
              className="w-full py-2.5 bg-violet-600 hover:bg-violet-700 text-white font-bold rounded-xl text-xs transition-colors shadow-lg cursor-pointer"
            >
              Done
            </button>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );

  const renderInstallGuideModal = () => {
    const isIframe = window.self !== window.top;
    
    const copyToClipboard = () => {
      navigator.clipboard.writeText(window.location.href);
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2000);
    };

    return (
      <AnimatePresence key="install-guide-modal">
        {showInstallGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4 pointer-events-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className={`w-full max-w-md rounded-3xl p-6 shadow-2xl flex flex-col relative overflow-hidden border transition-colors duration-500
                ${isLightTheme 
                  ? "bg-white border-slate-200 text-slate-900" 
                  : "bg-[#0b0c10]/95 border-white/10 text-white"
                }`}
            >
              <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-violet-500 via-pink-500 to-red-500" />
              
              <button
                onClick={() => setShowInstallGuide(false)}
                className={`absolute top-4 right-4 p-1.5 rounded-full transition-colors cursor-pointer
                  ${isLightTheme ? "hover:bg-slate-100 text-slate-400 hover:text-slate-600" : "hover:bg-white/10 text-white/40 hover:text-white"}`}
              >
                <X size={18} />
              </button>

              <div className="flex items-center gap-2.5 mb-4">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0
                  ${isLightTheme ? "bg-violet-50" : "bg-violet-500/10"}`}>
                  <Smartphone size={20} className="text-violet-500" />
                </div>
                <div className="text-left">
                  <h3 className="text-base font-serif font-semibold">Run on Home Screen</h3>
                  <p className={`text-[11px] ${isLightTheme ? "text-slate-500" : "text-white/40"}`}>
                    Install Zoya as a web app on your phone
                  </p>
                </div>
              </div>

              {isIframe && (
                <div className={`p-3 rounded-2xl text-[11px] mb-4 border leading-relaxed flex flex-col gap-2 text-left
                  ${isLightTheme 
                    ? "bg-amber-50/50 border-amber-200/50 text-amber-800" 
                    : "bg-amber-500/5 border-amber-500/20 text-amber-300"
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-bold">
                    <span>⚠️</span>
                    <span>Running inside a browser frame</span>
                  </div>
                  <p>
                    You are currently previewing Zoya in AI Studio. To run Zoya natively on your home screen, you must first open it directly in your mobile browser.
                  </p>
                  <button
                    onClick={copyToClipboard}
                    className={`mt-1 py-1.5 px-3 rounded-xl font-bold text-[10px] self-start transition-all cursor-pointer flex items-center gap-1
                      ${isLightTheme 
                        ? "bg-amber-600/10 hover:bg-amber-600/20 text-amber-700 border border-amber-600/10" 
                        : "bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/20"
                      }`}
                  >
                    <span>{copiedUrl ? "✓ Copied!" : "📋 Copy App URL"}</span>
                  </button>
                </div>
              )}

              {/* Benefits Banner */}
              <div className={`p-3 rounded-2xl text-[11px] mb-4 flex flex-col gap-1.5 text-left
                ${isLightTheme ? "bg-slate-50" : "bg-white/5"}`}
              >
                <span className="font-bold opacity-80">💡 Home Screen App Benefits:</span>
                <ul className="list-disc list-inside space-y-1 opacity-70 px-0.5">
                  <li>Launches directly, not through the Chrome/Safari browser bar</li>
                  <li>Immersive fullscreen layout without standard URL addresses</li>
                  <li>Keeps background voice wake word alive perfectly</li>
                </ul>
              </div>

              {/* Tab Selector */}
              <div className={`flex p-1 rounded-xl mb-4 text-xs font-semibold
                ${isLightTheme ? "bg-slate-100" : "bg-white/5"}`}
              >
                <button
                  onClick={() => setInstallTab("ios")}
                  className={`flex-1 py-1.5 rounded-lg text-center transition-all cursor-pointer
                    ${installTab === "ios" 
                      ? isLightTheme ? "bg-white shadow-sm text-slate-900" : "bg-white/10 text-white" 
                      : "opacity-60 hover:opacity-90"}`}
                >
                  iPhone & iPad (iOS)
                </button>
                <button
                  onClick={() => setInstallTab("android")}
                  className={`flex-1 py-1.5 rounded-lg text-center transition-all cursor-pointer
                    ${installTab === "android" 
                      ? isLightTheme ? "bg-white shadow-sm text-slate-900" : "bg-white/10 text-white" 
                      : "opacity-60 hover:opacity-90"}`}
                >
                  Android (Chrome)
                </button>
              </div>

              {/* Instructions list */}
              <div className="flex-1 min-h-[140px] flex flex-col justify-center text-left">
                {installTab === "ios" ? (
                  <div className="space-y-3.5 text-xs">
                    <div className="flex gap-2.5 items-start">
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 font-bold text-[10px]
                        ${isLightTheme ? "bg-violet-100 text-violet-700" : "bg-violet-500/20 text-violet-400"}`}>
                        1
                      </div>
                      <div className="leading-relaxed">
                        Open the app in <span className="font-semibold">Safari</span> and tap the <span className="font-semibold">Share</span> button 📤 at the bottom of the screen.
                      </div>
                    </div>
                    <div className="flex gap-2.5 items-start">
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 font-bold text-[10px]
                        ${isLightTheme ? "bg-violet-100 text-violet-700" : "bg-violet-500/20 text-violet-400"}`}>
                        2
                      </div>
                      <div className="leading-relaxed">
                        Scroll down and select <span className="font-semibold">"Add to Home Screen"</span> ➕ from the options list.
                      </div>
                    </div>
                    <div className="flex gap-2.5 items-start">
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 font-bold text-[10px]
                        ${isLightTheme ? "bg-violet-100 text-violet-700" : "bg-violet-500/20 text-violet-400"}`}>
                        3
                      </div>
                      <div className="leading-relaxed">
                        Choose a name (e.g. "Zoya") and tap <span className="font-semibold text-violet-500">"Add"</span> in the top-right corner to install!
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3.5 text-xs">
                    {deferredPrompt ? (
                      <div className="flex flex-col items-center justify-center py-2 text-center gap-3">
                        <p className="opacity-70 text-[11px] px-3">
                          Your Android browser fully supports automatic home screen installation! Click the button below to add Zoya instantly:
                        </p>
                        <button
                          onClick={() => {
                            setShowInstallGuide(false);
                            handleInstallClick();
                          }}
                          className="px-5 py-2.5 bg-violet-600 hover:bg-violet-700 text-white font-bold rounded-xl text-xs transition-colors shadow-md flex items-center gap-1.5 cursor-pointer"
                        >
                          <Download size={14} />
                          <span>Install Instantly Now</span>
                        </button>
                      </div>
                    ) : (
                      <>
                        <div className="flex gap-2.5 items-start">
                          <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 font-bold text-[10px]
                            ${isLightTheme ? "bg-violet-100 text-violet-700" : "bg-violet-500/20 text-violet-400"}`}>
                            1
                          </div>
                          <div className="leading-relaxed">
                            Open this app in <span className="font-semibold">Chrome</span> and tap the <span className="font-semibold">Menu</span> button ⋮ in the top right.
                          </div>
                        </div>
                        <div className="flex gap-2.5 items-start">
                          <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 font-bold text-[10px]
                            ${isLightTheme ? "bg-violet-100 text-violet-700" : "bg-violet-500/20 text-violet-400"}`}>
                            2
                          </div>
                          <div className="leading-relaxed">
                            Tap <span className="font-semibold">"Install App"</span> or <span className="font-semibold">"Add to Home screen"</span> ➕.
                          </div>
                        </div>
                        <div className="flex gap-2.5 items-start">
                          <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 font-bold text-[10px]
                            ${isLightTheme ? "bg-violet-100 text-violet-700" : "bg-violet-500/20 text-violet-400"}`}>
                            3
                          </div>
                          <div className="leading-relaxed">
                            Confirm the installation prompt to complete placing Zoya directly on your phone's screen.
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>

              <button
                onClick={() => setShowInstallGuide(false)}
                className={`w-full mt-6 py-2.5 rounded-xl font-bold text-xs transition-colors shadow-md cursor-pointer
                  ${isLightTheme ? "bg-slate-100 hover:bg-slate-200 text-slate-800" : "bg-white/5 hover:bg-white/10 text-white"}`}
              >
                Close Guide
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    );
  };

  const renderSettingsModal = () => (
    <AnimatePresence key="settings-modal">
      {showSettingsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4 pointer-events-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className={`w-full max-w-md rounded-3xl p-6 shadow-2xl flex flex-col relative overflow-hidden border transition-colors duration-500
              ${isLightTheme 
                ? "bg-white border-slate-200 text-slate-900" 
                : "bg-[#0b0c10]/95 border-white/10 text-white"
              }`}
          >
            <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-violet-500 via-pink-500 to-red-500" />
            
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <Settings className="text-violet-500" size={20} />
                <h3 className="text-lg font-serif font-semibold">Zoya Control Center</h3>
              </div>
              <button
                onClick={() => setShowSettingsModal(false)}
                className={`p-1.5 rounded-full transition-colors cursor-pointer
                  ${isLightTheme ? "hover:bg-slate-100 text-slate-400 hover:text-slate-600" : "hover:bg-white/10 text-white/40 hover:text-white"}`}
              >
                <X size={18} />
              </button>
            </div>

            <p className={`text-xs mb-4 ${isLightTheme ? "text-slate-500" : "text-white/40"}`}>
              Configure system integrations and permissions for full mobile-assistant operations.
            </p>

            <div className="space-y-4 max-h-[380px] overflow-y-auto pr-1">
              <div className={`flex items-center justify-between p-3 rounded-2xl border transition-all
                ${isLightTheme ? "bg-slate-50/50 border-slate-100" : "bg-white/5 border-white/5"}`}>
                <div className="flex flex-col">
                  <span className="text-xs font-semibold">Voice Trigger ('Hey Zoya')</span>
                  <span className="text-[10px] opacity-60">Hands-free microphone detection</span>
                </div>
                <button
                  onClick={() => setIsWakeWordEnabled(!isWakeWordEnabled)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-300 cursor-pointer
                    ${isWakeWordEnabled ? "bg-emerald-500" : isLightTheme ? "bg-slate-200" : "bg-white/10"}`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-300
                    ${isWakeWordEnabled ? "translate-x-6" : "translate-x-1"}`} 
                  />
                </button>
              </div>

              <div className={`flex items-center justify-between p-3 rounded-2xl border transition-all
                ${isLightTheme ? "bg-slate-50/50 border-slate-100" : "bg-white/5 border-white/5"}`}>
                <div className="flex flex-col">
                  <div className="flex items-center gap-1.5">
                    <PhoneCall size={12} className="text-violet-500" />
                    <span className="text-xs font-semibold">Google Dialer</span>
                  </div>
                  <span className="text-[10px] opacity-60">Allows hands-free phone calls</span>
                </div>
                <button
                  onClick={() => {
                    if (hasDialerPermission) {
                      setHasDialerPermission(false);
                    } else {
                      setShowSettingsModal(false);
                      setShowDialerPermissionModal(true);
                    }
                  }}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-300 cursor-pointer
                    ${hasDialerPermission ? "bg-violet-600" : isLightTheme ? "bg-slate-200" : "bg-white/10"}`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-300
                    ${hasDialerPermission ? "translate-x-6" : "translate-x-1"}`} 
                  />
                </button>
              </div>

              <div className={`flex items-center justify-between p-3 rounded-2xl border transition-all
                ${isLightTheme ? "bg-slate-50/50 border-slate-100" : "bg-white/5 border-white/5"}`}>
                <div className="flex flex-col">
                  <div className="flex items-center gap-1.5">
                    <Layers size={12} className="text-pink-500" />
                    <span className="text-xs font-semibold">Display Over Other Apps</span>
                  </div>
                  <span className="text-[10px] opacity-60">Enables dynamic voice HUD</span>
                </div>
                <button
                  onClick={() => {
                    if (hasDisplayOverPermission) {
                      setHasDisplayOverPermission(false);
                    } else {
                      setShowSettingsModal(false);
                      setShowDialerPermissionModal(true);
                    }
                  }}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-300 cursor-pointer
                    ${hasDisplayOverPermission ? "bg-pink-500" : isLightTheme ? "bg-slate-200" : "bg-white/10"}`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-300
                    ${hasDisplayOverPermission ? "translate-x-6" : "translate-x-1"}`} 
                  />
                </button>
              </div>

              <div className={`flex items-center justify-between p-3 rounded-2xl border transition-all
                ${isLightTheme ? "bg-slate-50/50 border-slate-100" : "bg-white/5 border-white/5"}`}>
                <div className="flex flex-col">
                  <div className="flex items-center gap-1.5">
                    <Smartphone size={12} className="text-sky-500" />
                    <span className="text-xs font-semibold">Background Wake Word</span>
                  </div>
                  <span className="text-[10px] opacity-60">Keep wake word alive when minimized</span>
                </div>
                <button
                  onClick={() => {
                    if (hasBackgroundPermission) {
                      setHasBackgroundPermission(false);
                    } else {
                      setShowSettingsModal(false);
                      setShowDialerPermissionModal(true);
                    }
                  }}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-300 cursor-pointer
                    ${hasBackgroundPermission ? "bg-sky-500" : isLightTheme ? "bg-slate-200" : "bg-white/10"}`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-300
                    ${hasBackgroundPermission ? "translate-x-6" : "translate-x-1"}`} 
                  />
                </button>
              </div>



              <div className={`flex items-center justify-between p-3 rounded-2xl border transition-all
                ${isLightTheme ? "bg-slate-50/50 border-slate-100" : "bg-white/5 border-white/5"}`}>
                <div className="flex flex-col">
                  <span className="text-xs font-semibold">Visual Interface Theme</span>
                  <span className="text-[10px] opacity-60">Choose between light & dark layouts</span>
                </div>
                <button
                  onClick={() => setIsLightTheme(!isLightTheme)}
                  className={`p-2 rounded-xl border transition-all cursor-pointer flex items-center justify-center
                    ${isLightTheme 
                      ? "bg-white border-slate-200 text-slate-700 hover:bg-slate-100" 
                      : "bg-[#111] border-white/10 text-white hover:bg-white/5"}`}
                >
                  {isLightTheme ? <Moon size={16} /> : <Sun size={16} />}
                </button>
              </div>

              <div className={`flex items-center justify-between p-3 rounded-2xl border transition-all
                ${isLightTheme ? "bg-slate-50/50 border-slate-100" : "bg-white/5 border-white/5"}`}>
                <div className="flex flex-col">
                  <span className="text-xs font-semibold">Zoya Voice Audio</span>
                  <span className="text-[10px] opacity-60">Toggle verbal speech feedback</span>
                </div>
                <button
                  onClick={() => setIsMuted(!isMuted)}
                  className={`p-2 rounded-xl border transition-all cursor-pointer flex items-center justify-center
                    ${isLightTheme 
                      ? "bg-white border-slate-200 text-slate-700 hover:bg-slate-100" 
                      : "bg-[#111] border-white/10 text-white hover:bg-white/5"}`}
                >
                  {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
                </button>
              </div>

              {messages.length > 0 && (
                <div className={`flex items-center justify-between p-3 rounded-2xl border border-red-500/10 transition-all
                  ${isLightTheme ? "bg-red-50/30" : "bg-red-950/10"}`}>
                  <div className="flex flex-col">
                    <span className="text-xs font-semibold text-red-500">Reset Session History</span>
                    <span className="text-[10px] opacity-50">Wipe dialogue logs and clear context</span>
                  </div>
                  <button
                    onClick={() => {
                      if (confirm("Are you sure you want to clear the chat history?")) {
                        setMessages([]);
                        resetZoyaSession();
                        setShowSettingsModal(false);
                      }
                    }}
                    className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-[11px] transition-colors cursor-pointer shadow-md"
                  >
                    Clear Chat
                  </button>
                </div>
              )}
            </div>

            <div className="mt-5 pt-4 border-t border-slate-100 dark:border-white/5 flex flex-col gap-2">
              {!isMobileDevice && (
                <button
                  onClick={() => {
                    setShowSettingsModal(false);
                    setShowQrModal(true);
                  }}
                  className="w-full py-2.5 bg-gradient-to-r from-violet-600 to-pink-600 text-white font-semibold rounded-xl text-xs hover:opacity-95 transition-all text-center flex items-center justify-center gap-1.5 shadow-md cursor-pointer"
                >
                  <Smartphone size={14} />
                  <span>Run Natively on Physical Mobile Phone</span>
                </button>
              )}
              {isMobileDevice && (
                isStandalone ? (
                  <div className={`w-full py-2.5 ${isLightTheme ? "bg-slate-100 text-emerald-600" : "bg-white/5 text-emerald-400"} font-semibold rounded-xl text-xs transition-all text-center flex items-center justify-center gap-1.5 border ${isLightTheme ? "border-emerald-200" : "border-emerald-500/20"}`}>
                    <span className="text-sm">✨</span>
                    <span>Running Natively on Home Screen</span>
                  </div>
                ) : (
                  <button
                    onClick={() => {
                      setShowSettingsModal(false);
                      setShowInstallGuide(true);
                    }}
                    className="w-full py-2.5 bg-gradient-to-r from-violet-600 to-pink-600 text-white font-semibold rounded-xl text-xs hover:opacity-95 transition-all text-center flex items-center justify-center gap-1.5 shadow-md cursor-pointer"
                  >
                    <Download size={14} />
                    <span>Add to Phone's Home Screen</span>
                  </button>
                )
              )}
              <button
                onClick={() => setShowSettingsModal(false)}
                className={`w-full py-2 text-center text-xs font-semibold rounded-xl transition-all cursor-pointer
                  ${isLightTheme ? "bg-slate-100 text-slate-700 hover:bg-slate-200" : "bg-white/5 text-white/70 hover:bg-white/10"}`}
              >
                Done
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );

  const renderMainApp = () => (
    <div className={`h-full w-full flex flex-col items-center justify-between font-sans relative overflow-hidden m-0 p-0 transition-colors duration-500
      ${isLightTheme ? "bg-[#f8fafc] text-slate-900" : "bg-[#050505] text-white"}`}>
      
      {/* Floating Action Trigger Fallback Card */}
      <AnimatePresence>
        {activeBrowserAction && (
          <motion.div
            initial={{ opacity: 0, y: -50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="absolute top-24 left-1/2 -translate-x-1/2 z-50 w-full max-w-md px-4 pointer-events-auto"
          >
            <div className={`relative overflow-hidden rounded-2xl border p-4 shadow-2xl backdrop-blur-xl transition-all duration-500
              ${isLightTheme 
                ? "bg-white/95 border-slate-200 text-slate-800 shadow-slate-200" 
                : "bg-[#0b0c10]/90 border-violet-500/30 text-white shadow-violet-950/40"
              }`}
            >
              {/* Glowing Background Accent */}
              <div className={`absolute top-0 right-0 -mr-8 -mt-8 w-24 h-24 rounded-full blur-2xl opacity-20 pointer-events-none animate-pulse
                ${activeBrowserAction.type === "youtube" 
                  ? "bg-red-500" 
                  : activeBrowserAction.type === "spotify" 
                    ? "bg-emerald-500" 
                    : activeBrowserAction.type === "maps"
                      ? "bg-sky-500"
                      : activeBrowserAction.type === "whatsapp"
                        ? "bg-teal-500"
                        : "bg-violet-500"}`} 
              />
              
              <div className="flex items-center gap-4 relative z-10">
                {/* Visual Icon Badge */}
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-white shrink-0 shadow-md animate-bounce
                  ${activeBrowserAction.type === "youtube" 
                    ? "bg-gradient-to-tr from-red-600 to-rose-500" 
                    : activeBrowserAction.type === "spotify"
                      ? "bg-gradient-to-tr from-emerald-500 to-green-600"
                      : activeBrowserAction.type === "maps"
                        ? "bg-gradient-to-tr from-sky-500 to-blue-600"
                        : activeBrowserAction.type === "whatsapp"
                          ? "bg-gradient-to-tr from-teal-500 to-emerald-600"
                          : "bg-gradient-to-tr from-violet-600 to-pink-500"
                  }`}
                >
                  {activeBrowserAction.type === "youtube" ? (
                    <Youtube size={22} />
                  ) : activeBrowserAction.type === "spotify" ? (
                    <span className="text-lg font-bold">🎵</span>
                  ) : activeBrowserAction.type === "maps" ? (
                    <span className="text-lg font-bold">📍</span>
                  ) : activeBrowserAction.type === "whatsapp" ? (
                    <span className="text-lg font-bold">💬</span>
                  ) : (
                    <ExternalLink size={20} />
                  )}
                </div>
                
                {/* Text Description */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className={`text-[10px] font-bold uppercase tracking-wider
                      ${activeBrowserAction.type === "youtube" 
                        ? "text-red-500" 
                        : activeBrowserAction.type === "spotify" 
                          ? "text-emerald-500" 
                          : activeBrowserAction.type === "maps"
                            ? "text-sky-500"
                            : activeBrowserAction.type === "whatsapp"
                              ? "text-teal-500"
                              : "text-violet-500"}`}
                    >
                      {activeBrowserAction.type === "youtube" 
                        ? "YouTube Music" 
                        : activeBrowserAction.type === "spotify" 
                          ? "Spotify" 
                          : activeBrowserAction.type === "maps"
                            ? "Google Maps"
                            : activeBrowserAction.type === "whatsapp"
                              ? "WhatsApp Web"
                              : "Assistant Link"}
                    </span>
                    <span className="text-[10px] opacity-40">• Ready</span>
                  </div>
                  <h4 className="text-sm font-semibold truncate leading-snug">
                    {activeBrowserAction.songName || activeBrowserAction.action || "Opening Link..."}
                  </h4>
                  <p className="text-[11px] opacity-60 leading-normal mt-0.5">
                    {activeBrowserAction.type === "maps" 
                      ? "Tap Open Map to view direction/location natively" 
                      : activeBrowserAction.type === "youtube" || activeBrowserAction.type === "spotify"
                        ? "Tap Play to listen now! (Bypasses popup blocker)"
                        : "Tap Open to launch the connection"}
                  </p>
                </div>

                {/* Direct user-click button */}
                <button
                  onClick={() => {
                    try {
                      if (activeBrowserAction.nativeUrl) {
                        window.location.href = activeBrowserAction.nativeUrl;
                      } else {
                        window.open(activeBrowserAction.url, "_blank");
                      }
                      
                      // Auto close overlay after action taken
                      setTimeout(() => {
                        setActiveBrowserAction(null);
                      }, 1000);
                    } catch (e) {
                      console.error(e);
                      window.open(activeBrowserAction.url, "_blank");
                    }
                  }}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white transition-all duration-300 shadow-md cursor-pointer hover:scale-105 select-none
                    ${activeBrowserAction.type === "youtube"
                      ? "bg-red-600 hover:bg-red-700 active:bg-red-800"
                      : activeBrowserAction.type === "spotify"
                        ? "bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700"
                        : activeBrowserAction.type === "maps"
                          ? "bg-sky-500 hover:bg-sky-600 active:bg-sky-700"
                          : activeBrowserAction.type === "whatsapp"
                            ? "bg-teal-500 hover:bg-teal-600 active:bg-teal-700"
                            : "bg-violet-600 hover:bg-violet-700 active:bg-violet-800"
                    }`}
                >
                  <span>
                    {activeBrowserAction.type === "youtube" || activeBrowserAction.type === "spotify"
                      ? "Play"
                      : activeBrowserAction.type === "maps"
                        ? "Open Map"
                        : activeBrowserAction.type === "whatsapp"
                          ? "Send"
                          : "Open"}
                  </span>
                  <ExternalLink size={12} />
                </button>

                {/* Close Button */}
                <button
                  onClick={() => setActiveBrowserAction(null)}
                  className={`p-1.5 rounded-full transition-colors shrink-0 cursor-pointer
                    ${isLightTheme ? "hover:bg-slate-100 text-slate-400 hover:text-slate-600" : "hover:bg-white/10 text-white/40 hover:text-white"}`}
                  title="Dismiss"
                >
                  <X size={16} />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
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
      <header className="absolute top-0 left-0 w-full flex justify-between items-center z-20 shrink-0 px-6 py-4 md:px-12 md:py-6 animate-fade-in pointer-events-auto">
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
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border transition-all text-xs font-semibold tracking-wider mr-1 cursor-pointer
                ${isLightTheme 
                  ? "bg-cyan-50 text-cyan-700 border-cyan-200 hover:bg-cyan-100" 
                  : "bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border-cyan-500/30"
                }`}
              title="Open in new tab to grant microphone permission"
            >
              <span>Open ↗</span>
            </a>
          )}
          
          {/* Settings Control Deck Trigger */}
          <button
            onClick={() => setShowSettingsModal(true)}
            className={`p-2.5 rounded-full border transition-all cursor-pointer flex items-center justify-center shadow-md hover:scale-105 active:scale-95
              ${isLightTheme
                ? "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                : "bg-zinc-900/85 border-white/10 text-white hover:bg-zinc-850"
              }`}
            title="System Settings"
          >
            <SlidersHorizontal size={15} />
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
            <div className="w-full max-w-md flex flex-col gap-2.5 items-center">
              {/* Quick Action Chips */}
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="w-full flex gap-2 overflow-x-auto scrollbar-hide px-1 py-1"
              >
                {QUICK_ACTIONS.map((action, idx) => (
                  <motion.button
                    key={idx}
                    type="button"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleQuickAction(action.label)}
                    className={`shrink-0 flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-semibold border transition-all shadow-sm cursor-pointer
                      ${isLightTheme 
                        ? "bg-white hover:bg-slate-50 border-slate-200 text-slate-700 hover:border-slate-300" 
                        : "bg-white/5 hover:bg-white/10 border-white/10 text-zinc-300 hover:border-white/20"
                      }`}
                  >
                    <span className="text-xs shrink-0 select-none">{action.icon}</span>
                    <span className="truncate">{action.label}</span>
                  </motion.button>
                ))}
              </motion.div>

              <motion.form 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                onSubmit={handleTextSubmit}
                className={`w-full flex items-center gap-2 border rounded-full p-1 pl-4 backdrop-blur-md transition-all duration-500 w-full
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
            </div>
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
    </div>
  );

  // Main Return Statement: Determines Fullscreen vs Mobile Device Simulation
  if (useMobileFrame && !isMobileDevice) {
    return (
      <div className={`min-h-screen w-screen flex flex-col items-center justify-center transition-colors duration-500 p-4 select-none relative
        ${isLightTheme ? "bg-slate-100" : "bg-[#09090b]"}`}
      >
        {/* Ambient Blurred Background decoration */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className={`absolute top-1/4 left-1/4 w-96 h-96 rounded-full blur-[120px] opacity-25 ${isLightTheme ? 'bg-violet-300' : 'bg-violet-900/30'}`} />
          <div className={`absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full blur-[120px] opacity-25 ${isLightTheme ? 'bg-pink-300' : 'bg-pink-900/30'}`} />
        </div>

        {/* Floating Controls Bar */}
        <div className="flex items-center gap-3 mb-5 z-30 pointer-events-auto">
          <button
            onClick={() => setUseMobileFrame(false)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold shadow-md transition-all border cursor-pointer hover:scale-105 active:scale-95
              ${isLightTheme 
                ? "bg-white text-slate-700 border-slate-200 hover:bg-slate-50" 
                : "bg-[#111] text-zinc-300 border-zinc-800 hover:bg-zinc-800"
              }`}
            title="Display as full screen application"
          >
            <Monitor size={14} />
            <span>Fullscreen View</span>
          </button>
          <button
            onClick={() => setShowQrModal(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold shadow-md transition-all border border-violet-500 bg-violet-600 text-white hover:bg-violet-700 cursor-pointer hover:scale-105 active:scale-95"
            title="Get mobile QR code"
          >
            <QrCode size={14} />
            <span>Open on Phone</span>
          </button>
        </div>

        {/* Device Chassis (Meticulously structured iOS / Android style frame) */}
        <div className={`relative w-[390px] h-[844px] rounded-[55px] border-[12px] shadow-2xl overflow-hidden transition-all duration-500 pointer-events-auto flex flex-col
          ${isLightTheme 
            ? "border-slate-850 bg-white shadow-slate-300/80" 
            : "border-zinc-850 bg-black shadow-black/85"
          }`}
        >
          {/* Top Notch / Camera cutout */}
          <div className="absolute top-3 left-1/2 -translate-x-1/2 w-28 h-6 bg-black rounded-full z-50 flex items-center justify-between px-3.5 pointer-events-none">
            <div className="w-2 h-2 bg-zinc-900 rounded-full border border-zinc-800" />
            <div className="w-1 h-1 bg-blue-950 rounded-full" />
          </div>

          {/* Virtual iOS / Android Style Status Bar */}
          <div className={`absolute top-0 left-0 w-full h-10 px-6 flex justify-between items-center z-45 text-xs font-semibold pointer-events-none transition-colors duration-500
            ${isLightTheme ? "text-slate-800" : "text-white"}`}
          >
            {/* Live Clock time */}
            <span className="text-[11px] font-bold tracking-tight">
              {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>

            {/* Status Icons */}
            <div className="flex items-center gap-1.5 text-[10px]">
              {/* Signal Strength Bars */}
              <div className="flex items-end gap-0.5 h-2.5">
                <div className="w-[2px] h-[30%] bg-current rounded-full" />
                <div className="w-[2px] h-[50%] bg-current rounded-full" />
                <div className="w-[2px] h-[75%] bg-current rounded-full" />
                <div className="w-[2px] h-[100%] bg-current rounded-full" />
              </div>
              <span className="font-bold tracking-wider">5G</span>
              {/* Battery Indicator */}
              <div className="flex items-center border border-current rounded-sm px-[1.5px] py-[1px] w-5 h-3 opacity-80">
                <div className="bg-current h-full w-[85%] rounded-2xs" />
              </div>
            </div>
          </div>

          {/* Side chassis button mockups (floating volume/power bezels) */}
          <div className="absolute left-[-15px] top-32 w-[3px] h-8 bg-zinc-700/50 rounded-l-md z-40 pointer-events-none" />
          <div className="absolute left-[-15px] top-44 w-[3px] h-12 bg-zinc-700/50 rounded-l-md z-40 pointer-events-none" />
          <div className="absolute left-[-15px] top-60 w-[3px] h-12 bg-zinc-700/50 rounded-l-md z-40 pointer-events-none" />
          <div className="absolute right-[-15px] top-40 w-[3px] h-16 bg-zinc-700/50 rounded-r-md z-40 pointer-events-none" />

          {/* Phone Screen Display container */}
          <div className="flex-1 w-full h-full relative overflow-hidden bg-[#050505]">
            {renderMainApp()}
          </div>

          {/* Virtual bottom swipe/Home indicator */}
          <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 w-32 h-1 bg-zinc-500/50 rounded-full z-50 pointer-events-none" />
        </div>

        {/* Modal Modifiers Render */}
        {renderQrModal()}
        {renderSettingsModal()}
        {renderInstallGuideModal()}
      </div>
    );
  }

  // Fallback Fullscreen rendering (Default on mobile devices)
  return (
    <>
      {renderMainApp()}
      {renderQrModal()}
      {renderSettingsModal()}
      {renderInstallGuideModal()}
    </>
  );
}

const QUICK_ACTIONS = [
  { label: "What's the weather?", icon: "🌤️" },
  { label: "Check my schedule", icon: "📅" },
  { label: "Play some music", icon: "🎵" },
  { label: "Call Boss", icon: "📞" },
  { label: "Open Spotify", icon: "🟢" },
  { label: "Send WhatsApp message", icon: "💬" }
];

