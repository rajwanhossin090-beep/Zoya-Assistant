import React from "react";
import { Battery, BatteryCharging, AlertCircle } from "lucide-react";
import { useBatteryStatus } from "../hooks/useBatteryStatus";

interface BatteryIndicatorProps {
  className?: string;
  showText?: boolean;
  size?: "sm" | "md";
}

export default function BatteryIndicator({
  className = "",
  showText = true,
  size = "sm",
}: BatteryIndicatorProps) {
  const { level, isCharging, isSupported, chargingTime, dischargingTime } = useBatteryStatus();

  // Color matching based on level and charging state
  const getLevelColor = () => {
    if (isCharging) return "text-emerald-500 bg-emerald-500";
    if (level <= 20) return "text-rose-500 bg-rose-500";
    if (level <= 50) return "text-amber-500 bg-amber-500 bg-amber-500";
    return "text-current bg-current";
  };

  const getBorderColor = () => {
    if (isCharging) return "border-emerald-500/70";
    if (level <= 20) return "border-rose-500/70";
    if (level <= 50) return "border-amber-500/70";
    return "border-current/60";
  };

  const colorClass = getLevelColor();
  const borderColorClass = getBorderColor();

  // Human readable tooltip info
  const getTooltipText = () => {
    let tooltip = `${level}% battery`;
    if (!isSupported) {
      tooltip += " (simulated, Browser Battery API unsupported)";
    } else {
      if (isCharging) {
        if (chargingTime !== Infinity && chargingTime > 0) {
          const mins = Math.round(chargingTime / 60);
          const hrs = Math.floor(mins / 60);
          const remMins = mins % 60;
          tooltip += ` - Charging (${hrs > 0 ? `${hrs}h ` : ""}${remMins}m until full)`;
        } else {
          tooltip += " - Charging";
        }
      } else {
        if (dischargingTime !== Infinity && dischargingTime > 0) {
          const mins = Math.round(dischargingTime / 60);
          const hrs = Math.floor(mins / 60);
          const remMins = mins % 60;
          tooltip += ` - Discharging (${hrs > 0 ? `${hrs}h ` : ""}${remMins}m remaining)`;
        } else {
          tooltip += " - Discharging";
        }
      }
    }
    return tooltip;
  };

  const isSmall = size === "sm";

  return (
    <div
      className={`flex items-center gap-1.5 transition-all duration-300 select-none group relative ${className}`}
      title={getTooltipText()}
    >
      {/* Percentage Text */}
      {showText && (
        <span className={`font-mono font-semibold tracking-tight leading-none ${isSmall ? "text-[10px]" : "text-xs"}`}>
          {level}%
        </span>
      )}

      {/* Battery Gauge Outer Wrapper */}
      <div className={`flex items-center relative ${isSmall ? "h-3" : "h-4"}`}>
        {/* Battery main block */}
        <div 
          className={`flex items-center border rounded-[3px] px-[1.5px] py-[1.2px] transition-colors duration-300
            ${isSmall ? "w-[22px] h-[12px]" : "w-[26px] h-[15px]"} 
            ${borderColorClass}`}
        >
          {/* Inner Fill bar */}
          <div 
            className={`h-full rounded-[1px] transition-all duration-500 ${colorClass.split(" ")[1]}`}
            style={{ width: `${Math.max(4, Math.min(100, level))}%` }}
          />
        </div>
        
        {/* Battery Tip / Terminal */}
        <div 
          className={`w-[1.2px] border-y-[1.5px] border-r border-current opacity-70 rounded-r-[1px]
            ${isSmall ? "h-1.5" : "h-2"}`}
        />

        {/* Charging Lightning Overlay */}
        {isCharging && (
          <div className="absolute inset-0 flex items-center justify-center -left-0.5">
            <svg 
              className={`text-emerald-400 drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)] ${isSmall ? "w-3 h-3" : "w-3.5 h-3.5"}`}
              viewBox="0 0 24 24" 
              fill="currentColor" 
              stroke="currentColor" 
              strokeWidth="2"
            >
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
            </svg>
          </div>
        )}
      </div>

      {/* Mini warning icon if battery is critically low (< 20% & not charging) */}
      {level <= 20 && !isCharging && (
        <span className="text-rose-500 animate-pulse">
          <AlertCircle size={isSmall ? 10 : 12} />
        </span>
      )}

      {/* Interactive Tooltip (shows on hover) */}
      <div className="absolute top-full right-0 mt-2 scale-0 group-hover:scale-100 transition-all duration-200 origin-top-right z-50 pointer-events-none">
        <div className="bg-slate-900/95 text-white text-[10px] py-1.5 px-3 rounded-lg shadow-xl border border-white/10 whitespace-nowrap font-sans backdrop-blur-sm">
          <div className="flex items-center gap-1.5 font-bold">
            {isCharging ? (
              <BatteryCharging size={11} className="text-emerald-400" />
            ) : (
              <Battery size={11} className={level <= 20 ? "text-rose-400" : "text-cyan-400"} />
            )}
            <span>Device Battery Details</span>
          </div>
          <p className="opacity-75 mt-0.5 font-medium">{getTooltipText()}</p>
        </div>
      </div>
    </div>
  );
}
