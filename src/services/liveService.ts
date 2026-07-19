import { GoogleGenAI, LiveServerMessage, Modality, Type } from "@google/genai";
import { processCommand } from "./commandService";
import { getSystemInstruction, ZoyaMood, ZoyaTheme } from "./geminiService";

export class LiveSessionManager {
  private ai: GoogleGenAI;
  private mood: ZoyaMood;
  private sassLevel: number;
  private theme: ZoyaTheme;
  private sessionPromise: Promise<any> | null = null;
  private audioContext: AudioContext | null = null;
  private mediaStream: MediaStream | null = null;
  private processor: ScriptProcessorNode | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  
  // Audio playback state
  private playbackContext: AudioContext | null = null;
  private nextPlayTime: number = 0;
  private isPlaying: boolean = false;
  public isMuted: boolean = false;
  private isStopped: boolean = false;

  // Screen sharing state
  private screenStream: MediaStream | null = null;
  private screenInterval: number | null = null;
  private activeShareMode: "screen" | "camera" | "none" = "none";
  public onScreenShareActive: (active: boolean, mode: "screen" | "camera" | "none") => void = () => {};
  
  public onStateChange: (state: "idle" | "listening" | "processing" | "speaking") => void = () => {};
  public onMessage: (sender: "user" | "zoya", text: string) => void = () => {};
  public onCommand: (url: string) => void = () => {};
  public onClose: (error?: any) => void = () => {};

  constructor(mood: ZoyaMood = "sassy", sassLevel: number = 50, theme: ZoyaTheme = "automobile") {
    this.mood = mood;
    this.sassLevel = sassLevel;
    this.theme = theme;
    this.ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }

  async start() {
    try {
      this.isStopped = false;
      this.onStateChange("processing");
      
      // Initialize Audio Contexts
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      this.audioContext = new AudioContextClass({ sampleRate: 16000 });
      this.playbackContext = new AudioContextClass({ sampleRate: 24000 });
      this.nextPlayTime = this.playbackContext.currentTime;

      // Get Microphone
      this.mediaStream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          channelCount: 1,
          sampleRate: 16000,
          echoCancellation: true,
          noiseSuppression: true,
        } 
      });

      this.source = this.audioContext.createMediaStreamSource(this.mediaStream);
      this.processor = this.audioContext.createScriptProcessor(4096, 1, 1);

      this.processor.onaudioprocess = (e) => {
        if (!this.sessionPromise) return;
        const inputData = e.inputBuffer.getChannelData(0);
        const pcm16 = new Int16Array(inputData.length);
        for (let i = 0; i < inputData.length; i++) {
          let s = Math.max(-1, Math.min(1, inputData[i]));
          pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
        }
        
        // Convert to base64
        const buffer = new ArrayBuffer(pcm16.length * 2);
        const view = new DataView(buffer);
        for (let i = 0; i < pcm16.length; i++) {
          view.setInt16(i * 2, pcm16[i], true);
        }
        
        let binary = '';
        const bytes = new Uint8Array(buffer);
        for (let i = 0; i < bytes.byteLength; i++) {
          binary += String.fromCharCode(bytes[i]);
        }
        const base64Data = btoa(binary);

        this.sessionPromise.then(session => {
          session.sendRealtimeInput({
            audio: { data: base64Data, mimeType: 'audio/pcm;rate=16000' }
          });
        }).catch(err => console.error("Error sending audio", err));
      };

      this.source.connect(this.processor);
      this.processor.connect(this.audioContext.destination);

      // Select prebuilt voice based on theme
      const themeVoiceName = this.theme === "enemy" 
        ? "Charon" 
        : this.theme === "anime"
          ? "Aoede"
          : "Kore";

      // Connect to Live API
      this.sessionPromise = this.ai.live.connect({
        model: "gemini-3.1-flash-live-preview",
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: themeVoiceName } },
          },
          systemInstruction: getSystemInstruction(this.mood, this.sassLevel, this.theme),
          inputAudioTranscription: {},
          outputAudioTranscription: {},
          tools: [{
            functionDeclarations: [
              {
                name: "executeBrowserAction",
                description: "Open a website or perform a browser action (like opening YouTube, Spotify, or WhatsApp). Call this when the user asks to open a site, play a song, or send a message.",
                parameters: {
                  type: Type.OBJECT,
                  properties: {
                    actionType: { type: Type.STRING, description: "Type of action: 'open', 'youtube', 'spotify', 'whatsapp', 'call'" },
                    query: { type: Type.STRING, description: "The search query, website name, message content, or phone number to dial." },
                    target: { type: Type.STRING, description: "The target phone number for WhatsApp or Calls, if applicable." }
                  },
                  required: ["actionType", "query"]
                }
              }
            ]
          }]
        },
        callbacks: {
          onopen: () => {
            console.log("Live API Connected");
            this.onStateChange("listening");
          },
          onmessage: async (message: LiveServerMessage) => {
            // Handle Audio Output
            const base64Audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            if (base64Audio) {
              this.onStateChange("speaking");
              this.playAudioChunk(base64Audio);
            }

            // Handle Interruption
            if (message.serverContent?.interrupted) {
              this.stopPlayback();
              this.onStateChange("listening");
            }

            // Handle Transcriptions
            const userText = message.serverContent?.modelTurn?.parts?.[0]?.text;
            if (userText) {
               // Output transcription
               this.onMessage("zoya", userText);
            }

            // Handle Function Calls
            const functionCalls = message.toolCall?.functionCalls;
            if (functionCalls && functionCalls.length > 0) {
              for (const call of functionCalls) {
                if (call.name === "executeBrowserAction") {
                  const args = call.args as any;
                  let url = "";
                  if (args.actionType === "youtube") {
                    url = `https://www.youtube.com/results?search_query=${encodeURIComponent(args.query)}`;
                  } else if (args.actionType === "spotify") {
                    url = `https://open.spotify.com/search/${encodeURIComponent(args.query)}`;
                  } else if (args.actionType === "whatsapp") {
                    url = `https://web.whatsapp.com/send?phone=${args.target || ''}&text=${encodeURIComponent(args.query)}`;
                  } else if (args.actionType === "call") {
                    const number = (args.target || args.query || "").replace(/\s+/g, "");
                    url = `tel:${number}`;
                  } else {
                    const rawQuery = args.query.trim();
                    if (rawQuery.includes(":/") || rawQuery.includes(":")) {
                      url = rawQuery;
                    } else {
                      let website = rawQuery.replace(/\s+/g, "");
                      if (!website.includes(".")) website += ".com";
                      url = `https://www.${website}`;
                    }
                  }
                  
                  this.onCommand(url);
                  
                  // Send tool response
                  this.sessionPromise?.then(session => {
                     session.sendToolResponse({
                       functionResponses: [{
                         name: call.name,
                         id: call.id,
                         response: { result: "Action executed successfully in the browser." }
                       }]
                     });
                  });
                }
              }
            }
          },
          onclose: () => {
            console.log("Live API Closed");
            const wasStopped = this.isStopped;
            this.stop();
            if (!wasStopped && this.onClose) {
              this.onClose();
            }
          },
          onerror: (err: any) => {
            const errMsg = err?.message || String(err);
            if (errMsg.includes("cancelled") || errMsg.includes("canceled") || errMsg.includes("aborted")) {
              console.log("Live API connection closed or cancelled gracefully:", errMsg);
            } else {
              console.error("Live API Error:", err);
            }
            const wasStopped = this.isStopped;
            this.stop();
            if (!wasStopped && this.onClose) {
              this.onClose(err);
            }
          }
        }
      });

    } catch (error) {
      console.error("Failed to start Live Session:", error);
      this.stop();
    }
  }

  private playAudioChunk(base64Data: string) {
    if (!this.playbackContext || this.isMuted) return;
    
    try {
      const binaryString = atob(base64Data);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const buffer = new Int16Array(bytes.buffer);
      const audioBuffer = this.playbackContext.createBuffer(1, buffer.length, 24000);
      const channelData = audioBuffer.getChannelData(0);
      for (let i = 0; i < buffer.length; i++) {
        channelData[i] = buffer[i] / 32768.0;
      }
      
      const source = this.playbackContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(this.playbackContext.destination);
      
      const currentTime = this.playbackContext.currentTime;
      if (this.nextPlayTime < currentTime) {
        this.nextPlayTime = currentTime;
      }
      
      source.start(this.nextPlayTime);
      this.nextPlayTime += audioBuffer.duration;
      this.isPlaying = true;
      
      source.onended = () => {
        if (this.playbackContext && this.playbackContext.currentTime >= this.nextPlayTime - 0.1) {
          this.isPlaying = false;
          this.onStateChange("listening");
        }
      };
    } catch (e) {
      console.error("Error playing chunk", e);
    }
  }

  private stopPlayback() {
    if (this.playbackContext) {
      this.playbackContext.close();
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      this.playbackContext = new AudioContextClass({ sampleRate: 24000 });
      this.nextPlayTime = this.playbackContext.currentTime;
      this.isPlaying = false;
    }
  }

  stop() {
    if (this.isStopped) return;
    this.isStopped = true;

    // Clean up screen sharing
    this.stopScreenShare();

    if (this.processor) {
      try { this.processor.disconnect(); } catch (e) {}
      this.processor = null;
    }
    if (this.source) {
      try { this.source.disconnect(); } catch (e) {}
      this.source = null;
    }
    if (this.mediaStream) {
      try {
        this.mediaStream.getTracks().forEach(t => t.stop());
      } catch (e) {}
      this.mediaStream = null;
    }
    if (this.audioContext) {
      try { this.audioContext.close(); } catch (e) {}
      this.audioContext = null;
    }
    this.stopPlayback();
    
    if (this.sessionPromise) {
      const p = this.sessionPromise;
      this.sessionPromise = null;
      p.then(session => {
        try { session.close(); } catch (e) {}
      }).catch(() => {});
    }
    
    this.onStateChange("idle");
  }

  public isScreenSharing(): boolean {
    return !!this.screenStream;
  }

  public getShareMode(): "screen" | "camera" | "none" {
    return this.activeShareMode;
  }

  async startScreenShare() {
    if (this.screenStream) return;
    try {
      let mode: "screen" | "camera" = "screen";

      // 1. Check if navigator.mediaDevices exists
      if (!navigator.mediaDevices) {
        throw new Error("navigator.mediaDevices is not available. Please verify this app is running in a secure context (HTTPS/localhost) and that frame permissions are enabled.");
      }

      // 2. Attempt getDisplayMedia (screen share) first, fallback to getUserMedia (webcam) if unsupported or fails
      if (typeof navigator.mediaDevices.getDisplayMedia === "function") {
        try {
          this.screenStream = await navigator.mediaDevices.getDisplayMedia({
            video: {
              width: { max: 640 },
              height: { max: 480 },
              frameRate: { max: 5 }
            },
            audio: false
          });
          mode = "screen";
        } catch (screenError: any) {
          // If user cancelled, don't fallback to webcam automatically as it might breach trust;
          // but if it's a permission or system failure, try camera fallback!
          if (screenError?.name === "NotAllowedError" || screenError?.name === "PermissionDeniedError") {
            console.log("Screen share permission denied by user; aborting.");
            throw screenError;
          }
          console.warn("getDisplayMedia call failed, attempting camera fallback...", screenError);
          if (typeof navigator.mediaDevices.getUserMedia === "function") {
            this.screenStream = await navigator.mediaDevices.getUserMedia({
              video: {
                width: { ideal: 320 },
                height: { ideal: 240 },
                facingMode: "user"
              },
              audio: false
            });
            mode = "camera";
          } else {
            throw screenError;
          }
        }
      } else if (typeof navigator.mediaDevices.getUserMedia === "function") {
        console.warn("getDisplayMedia is not available in this environment. Falling back to camera stream.");
        this.screenStream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 320 },
            height: { ideal: 240 },
            facingMode: "user"
          },
          audio: false
        });
        mode = "camera";
      } else {
        throw new Error("Neither screen sharing (getDisplayMedia) nor camera streaming (getUserMedia) is supported by this browser context.");
      }

      const videoTrack = this.screenStream.getVideoTracks()[0];
      if (!videoTrack) {
        throw new Error("No video tracks found in captured stream.");
      }
      
      const video = document.createElement("video");
      video.srcObject = this.screenStream;
      video.muted = true;
      video.playsInline = true;
      video.play().catch(err => console.error("Error playing capture video:", err));

      const canvas = document.createElement("canvas");
      canvas.width = 320;
      canvas.height = 240;
      const ctx = canvas.getContext("2d");

      this.screenInterval = window.setInterval(() => {
        if (!this.sessionPromise || !ctx || video.paused || video.ended) return;
        
        try {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const dataUrl = canvas.toDataURL("image/jpeg", 0.5);
          const base64Data = dataUrl.split(",")[1];
          
          this.sessionPromise.then(session => {
            session.sendRealtimeInput({
              video: { data: base64Data, mimeType: "image/jpeg" }
            });
          }).catch(err => console.error("Error sending screen frame:", err));
        } catch (err) {
          console.error("Error capturing screen frame:", err);
        }
      }, 1500); // 1.5 seconds interval (~0.66 FPS)

      videoTrack.onended = () => {
        this.stopScreenShare();
      };

      this.activeShareMode = mode;
      this.onScreenShareActive(true, mode);
    } catch (err) {
      console.error("Failed to start visual share:", err);
      this.stopScreenShare();
      throw err;
    }
  }

  stopScreenShare() {
    if (this.screenInterval) {
      clearInterval(this.screenInterval);
      this.screenInterval = null;
    }
    if (this.screenStream) {
      try {
        this.screenStream.getTracks().forEach(t => t.stop());
      } catch (e) {}
      this.screenStream = null;
    }
    this.activeShareMode = "none";
    this.onScreenShareActive(false, "none");
  }

  sendText(text: string) {
    if (this.sessionPromise) {
      this.sessionPromise.then(session => {
        session.sendRealtimeInput({ text });
      });
    }
  }
}
