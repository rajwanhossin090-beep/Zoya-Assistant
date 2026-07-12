import React from 'react';
import { motion } from 'motion/react';
import { PhoneCall, ShieldAlert, Layers, Check, X } from 'lucide-react';

interface Props {
  onClose: () => void;
  hasDialerPermission: boolean;
  setHasDialerPermission: (val: boolean) => void;
  hasDisplayOverPermission: boolean;
  setHasDisplayOverPermission: (val: boolean) => void;
  isLightTheme?: boolean;
}

export default function GoogleDialerPermissionModal({ 
  onClose, 
  hasDialerPermission, 
  setHasDialerPermission,
  hasDisplayOverPermission,
  setHasDisplayOverPermission,
  isLightTheme = false 
}: Props) {

  const handleAllowAll = () => {
    setHasDialerPermission(true);
    setHasDisplayOverPermission(true);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className={`w-full max-w-md rounded-3xl p-8 shadow-2xl flex flex-col items-center text-center relative overflow-hidden border
          ${isLightTheme 
            ? "bg-white border-slate-200 text-slate-900" 
            : "bg-[#111] border-white/10 text-white"
          }`}
      >
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-violet-500 via-fuchsia-500 to-pink-500" />
        
        <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-6 relative
          ${isLightTheme ? "bg-violet-100" : "bg-violet-500/20"}`}>
          <PhoneCall size={30} className={isLightTheme ? "text-violet-600 animate-pulse" : "text-violet-400 animate-pulse"} />
          <div className="absolute -bottom-1 -right-1 bg-amber-500 text-white rounded-full p-1 border-2 border-current flex items-center justify-center">
            <ShieldAlert size={12} className="text-white" />
          </div>
        </div>
        
        <h2 className="text-2xl font-serif font-semibold mb-2">Google Dialer Permissions</h2>
        <p className={`text-xs mb-6 leading-relaxed max-w-sm ${isLightTheme ? "text-slate-500" : "text-white/60"}`}>
          Zoya needs the following system permissions to assist with placing voice calls and displaying call controls.
        </p>

        {/* Permission Toggles Container */}
        <div className="w-full flex flex-col gap-4 mb-8">
          {/* Dialer Permission Item */}
          <div 
            onClick={() => setHasDialerPermission(!hasDialerPermission)}
            className={`border rounded-2xl p-4 text-left w-full transition-all duration-300 cursor-pointer select-none flex items-start gap-3
              ${hasDialerPermission
                ? isLightTheme 
                  ? "bg-violet-50/50 border-violet-200 shadow-sm" 
                  : "bg-violet-500/5 border-violet-500/30 shadow-sm"
                : isLightTheme 
                  ? "bg-slate-50 border-slate-200 hover:bg-slate-100" 
                  : "bg-white/2 border-white/5 hover:bg-white/5"
              }`}
          >
            <div className={`p-2 rounded-xl mt-0.5
              ${hasDialerPermission
                ? isLightTheme ? "bg-violet-100 text-violet-700" : "bg-violet-500/20 text-violet-300"
                : isLightTheme ? "bg-slate-200 text-slate-500" : "bg-white/5 text-white/40"
              }`}
            >
              <PhoneCall size={18} />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <span className={`text-sm font-semibold ${isLightTheme ? "text-slate-800" : "text-white/90"}`}>
                  Call Dialer Permission
                </span>
                <span className={`text-xs px-2 py-0.5 rounded-full font-bold uppercase tracking-wider
                  ${hasDialerPermission
                    ? "bg-emerald-500/10 text-emerald-500"
                    : "bg-amber-500/10 text-amber-500"
                  }`}
                >
                  {hasDialerPermission ? "Allowed" : "Not Allowed"}
                </span>
              </div>
              <p className={`text-[11px] mt-1 leading-relaxed ${isLightTheme ? "text-slate-500" : "text-white/55"}`}>
                Allows Zoya to show dialer screen and trigger phone dialing commands. If you do not allow this, you will not be able to dial numbers.
              </p>
            </div>
          </div>

          {/* Display Over Other Apps Permission Item */}
          <div 
            onClick={() => setHasDisplayOverPermission(!hasDisplayOverPermission)}
            className={`border rounded-2xl p-4 text-left w-full transition-all duration-300 cursor-pointer select-none flex items-start gap-3
              ${hasDisplayOverPermission
                ? isLightTheme 
                  ? "bg-pink-50/50 border-pink-200 shadow-sm" 
                  : "bg-pink-500/5 border-pink-500/30 shadow-sm"
                : isLightTheme 
                  ? "bg-slate-50 border-slate-200 hover:bg-slate-100" 
                  : "bg-white/2 border-white/5 hover:bg-white/5"
              }`}
          >
            <div className={`p-2 rounded-xl mt-0.5
              ${hasDisplayOverPermission
                ? isLightTheme ? "bg-pink-100 text-pink-700" : "bg-pink-500/20 text-pink-300"
                : isLightTheme ? "bg-slate-200 text-slate-500" : "bg-white/5 text-white/40"
              }`}
            >
              <Layers size={18} />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <span className={`text-sm font-semibold ${isLightTheme ? "text-slate-800" : "text-white/90"}`}>
                  Display Over Permission
                </span>
                <span className={`text-xs px-2 py-0.5 rounded-full font-bold uppercase tracking-wider
                  ${hasDisplayOverPermission
                    ? "bg-emerald-500/10 text-emerald-500"
                    : "bg-amber-500/10 text-amber-500"
                  }`}
                >
                  {hasDisplayOverPermission ? "Allowed" : "Not Allowed"}
                </span>
              </div>
              <p className={`text-[11px] mt-1 leading-relaxed ${isLightTheme ? "text-slate-500" : "text-white/55"}`}>
                Allows Google Dialer to display calling interface and floating assist cards over other active applications.
              </p>
            </div>
          </div>
        </div>
        
        <div className="flex flex-col w-full gap-3">
          <button 
            onClick={handleAllowAll}
            className="w-full py-3 px-4 bg-gradient-to-r from-violet-500 to-pink-500 text-white font-semibold rounded-xl hover:opacity-95 text-center transition-all shadow-lg cursor-pointer"
          >
            Allow Selected Access ⚡
          </button>
          <button 
            onClick={onClose}
            className={`w-full py-3 px-4 font-semibold rounded-xl transition-colors cursor-pointer
              ${isLightTheme 
                ? "bg-slate-100 text-slate-700 hover:bg-slate-200" 
                : "bg-white/5 text-white/70 hover:bg-white/10"
              }`}
          >
            Don't Allow
          </button>
        </div>
      </motion.div>
    </div>
  );
}
