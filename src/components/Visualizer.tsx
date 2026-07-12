import { motion } from "motion/react";
import { ZoyaTheme } from "../services/geminiService";

type VisualizerState = "idle" | "listening" | "processing" | "speaking";

interface VisualizerProps {
  state: VisualizerState;
  isLightTheme?: boolean;
  theme?: ZoyaTheme;
}

export default function Visualizer({ state, isLightTheme = false, theme = "automobile" }: VisualizerProps) {
  const getRingAnimation = (index: number, reverse: boolean = false) => {
    const baseSpeed = state === "listening" ? 3 : state === "processing" ? 1.5 : state === "speaking" ? 2 : 15;
    return {
      rotate: reverse ? [-360, 0] : [0, 360],
      transition: { duration: baseSpeed + index * 2, repeat: Infinity, ease: "linear" }
    };
  };

  const getPulseAnimation = () => {
    if (state === "speaking") {
      return {
        scale: [1, 1.05, 0.98, 1.02, 1],
        opacity: [0.8, 1, 0.8, 1, 0.8],
        transition: { duration: 0.5, repeat: Infinity, ease: "easeInOut" }
      };
    }
    if (state === "listening") {
      return {
        scale: [1, 1.02, 1],
        opacity: [0.7, 1, 0.7],
        transition: { duration: 1, repeat: Infinity, ease: "easeInOut" }
      };
    }
    if (state === "processing") {
      return {
        scale: [0.98, 1.02, 0.98],
        opacity: [0.6, 0.9, 0.6],
        transition: { duration: 0.8, repeat: Infinity, ease: "linear" }
      };
    }
    return {
      scale: [1, 1.01, 1],
      opacity: [0.4, 0.6, 0.4],
      transition: { duration: 4, repeat: Infinity, ease: "easeInOut" }
    };
  };

  // Theme-specific color palettes
  const getThemeColors = () => {
    if (theme === "anime") {
      if (isLightTheme) {
        switch (state) {
          case "listening": return { color: "rgba(219, 39, 119, 1)", glow: "shadow-pink-600/70", border: "border-pink-600/80" }; // pink-600
          case "processing": return { color: "rgba(192, 38, 211, 1)", glow: "shadow-fuchsia-600/70", border: "border-fuchsia-600/80" }; // fuchsia-600
          case "speaking": return { color: "rgba(225, 29, 72, 1)", glow: "shadow-rose-600/70", border: "border-rose-600/80" }; // rose-600
          default: return { color: "rgba(244, 63, 94, 1)", glow: "shadow-rose-500/60", border: "border-rose-500/70" }; // rose-500
        }
      } else {
        switch (state) {
          case "listening": return { color: "rgba(244, 114, 182, 1)", glow: "shadow-pink-400/80", border: "border-pink-400" }; // pink-400
          case "processing": return { color: "rgba(232, 121, 249, 1)", glow: "shadow-fuchsia-400/80", border: "border-fuchsia-400" }; // fuchsia-400
          case "speaking": return { color: "rgba(251, 113, 133, 1)", glow: "shadow-rose-400/85", border: "border-rose-400" }; // rose-400
          default: return { color: "rgba(244, 63, 94, 0.8)", glow: "shadow-rose-500/40", border: "border-rose-500/50" }; // rose-500
        }
      }
    } else if (theme === "enemy") {
      if (isLightTheme) {
        switch (state) {
          case "listening": return { color: "rgba(220, 38, 38, 1)", glow: "shadow-red-600/70", border: "border-red-600/80" }; // red-600
          case "processing": return { color: "rgba(217, 119, 6, 1)", glow: "shadow-amber-600/70", border: "border-amber-600/80" }; // amber-600
          case "speaking": return { color: "rgba(159, 18, 57, 1)", glow: "shadow-rose-800/80", border: "border-rose-800/95" }; // rose-800
          default: return { color: "rgba(153, 27, 27, 1)", glow: "shadow-red-800/60", border: "border-red-800/70" }; // red-800
        }
      } else {
        switch (state) {
          case "listening": return { color: "rgba(239, 68, 68, 1)", glow: "shadow-red-500/80", border: "border-red-500" }; // red-500
          case "processing": return { color: "rgba(245, 158, 11, 1)", glow: "shadow-amber-500/80", border: "border-amber-500" }; // amber-500
          case "speaking": return { color: "rgba(225, 29, 72, 1)", glow: "shadow-rose-500/90", border: "border-rose-500" }; // rose-500
          default: return { color: "rgba(220, 38, 38, 0.8)", glow: "shadow-red-600/40", border: "border-red-600/50" }; // red-600
        }
      }
    } else {
      // Default Automobile Theme (Cyan/Blue/Violet)
      if (isLightTheme) {
        switch (state) {
          case "listening": return { color: "rgba(109, 40, 217, 1)", glow: "shadow-violet-600/70", border: "border-violet-600/80" }; // violet-700
          case "processing": return { color: "rgba(3, 105, 161, 1)", glow: "shadow-sky-600/70", border: "border-sky-600/80" };  // sky-700
          case "speaking": return { color: "rgba(190, 24, 74, 1)", glow: "shadow-pink-600/70", border: "border-pink-600/80" };    // pink-700
          default: return { color: "rgba(14, 116, 144, 1)", glow: "shadow-cyan-600/60", border: "border-cyan-600/70" };       // cyan-700
        }
      } else {
        switch (state) {
          case "listening": return { color: "rgba(139, 92, 246, 1)", glow: "shadow-violet-500/60", border: "border-violet-400" };
          case "processing": return { color: "rgba(56, 189, 248, 1)", glow: "shadow-sky-400/80", border: "border-sky-400" };
          case "speaking": return { color: "rgba(236, 72, 153, 1)", glow: "shadow-pink-500/80", border: "border-pink-400" };
          default: return { color: "rgba(6, 182, 212, 0.8)", glow: "shadow-cyan-500/40", border: "border-cyan-500/50" }; // Cyan for idle
        }
      }
    }
  };

  const themeColors = getThemeColors();

  const getCenterText = () => {
    if (theme === "anime") return "CRIMSON";
    if (theme === "enemy") return "NEMESIS";
    return "ZOYA";
  };

  return (
    <div className="absolute inset-0 flex items-center justify-center overflow-hidden pointer-events-none">
      {/* Ambient Glow */}
      <motion.div
        animate={getPulseAnimation()}
        className={`absolute w-[60%] h-[60%] rounded-full blur-[80px] ${themeColors.glow}`}
        style={{ backgroundColor: themeColors.color, opacity: isLightTheme ? 0.08 : 0.15 }}
      />

      {/* Ring 1: Massive Outer Dashed */}
      <motion.div
        animate={getRingAnimation(4, false)}
        className={`absolute w-[100%] h-[100%] rounded-full border-[1.5px] border-dashed ${themeColors.border} ${isLightTheme ? "opacity-40" : "opacity-20"}`}
      />

      {/* Ring 2: Segmented Thick Ring */}
      <motion.div
        animate={getRingAnimation(3, true)}
        className={`absolute w-[85%] h-[85%] rounded-full border-[2.5px] border-dotted ${themeColors.border} ${isLightTheme ? "opacity-50" : "opacity-30"}`}
      />

      {/* Ring 3: Scanner Ring (Solid with gaps) */}
      <motion.div
        animate={getRingAnimation(2, false)}
        className={`absolute w-[70%] h-[70%] rounded-full border-[1.5px] ${themeColors.border} border-t-transparent border-b-transparent ${isLightTheme ? "opacity-60" : "opacity-40"}`}
      />

      {/* Ring 4: Inner Dashed */}
      <motion.div
        animate={getRingAnimation(1, true)}
        className={`absolute w-[55%] h-[55%] rounded-full border-[2.5px] border-dashed ${themeColors.border} ${isLightTheme ? "opacity-70" : "opacity-50"}`}
      />
      
      {/* Ring 5: Core HUD Ring */}
      <motion.div
        animate={getRingAnimation(0, false)}
        className={`absolute w-[40%] h-[40%] rounded-full border-[5px] border-dotted ${themeColors.border} ${isLightTheme ? "opacity-85" : "opacity-70"}`}
      />

      {/* Core Circle */}
      <motion.div
        animate={getPulseAnimation()}
        className={`absolute w-[25%] h-[25%] rounded-full border-[2px] ${themeColors.border} flex items-center justify-center backdrop-blur-md
          ${isLightTheme 
            ? "bg-white/90 shadow-[0_4px_30px_rgba(0,0,0,0.15)]" 
            : "bg-black/40 shadow-[inset_0_0_30px_rgba(0,0,0,0.5)]"
          }`}
        style={{ 
          boxShadow: isLightTheme 
            ? `0 0 30px ${themeColors.color}44, inset 0 0 10px ${themeColors.color}22` 
            : `0 0 40px ${themeColors.color}, inset 0 0 30px ${themeColors.color}` 
        }}
      >
        {/* Center Text */}
        <div 
          className={`font-bold tracking-[0.3em] text-xl md:text-3xl lg:text-4xl transition-all duration-300
            ${isLightTheme ? "text-slate-900 font-extrabold" : "text-white"}`}
          style={{ textShadow: isLightTheme ? `0 0 8px ${themeColors.color}44` : `0 0 15px ${themeColors.color}, 0 0 30px ${themeColors.color}` }}
        >
          {getCenterText()}
        </div>
      </motion.div>
    </div>
  );
}
