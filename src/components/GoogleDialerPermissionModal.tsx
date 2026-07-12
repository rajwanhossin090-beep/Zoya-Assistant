import React from 'react';
import { motion } from 'motion/react';
import { PhoneCall, ShieldAlert } from 'lucide-react';

interface Props {
  onClose: () => void;
  onAllow: () => void;
  isLightTheme?: boolean;
}

export default function GoogleDialerPermissionModal({ onClose, onAllow, isLightTheme = false }: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className={`w-full max-w-md rounded-3xl p-8 shadow-2xl flex flex-col items-center text-center relative overflow-hidden border
          ${isLightTheme 
            ? "bg-white border-slate-200 text-slate-900" 
            : "bg-[#111] border-white/10 text-white"
          }`}
      >
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-violet-500 to-pink-500" />
        
        <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-6 relative
          ${isLightTheme ? "bg-violet-100" : "bg-violet-500/20"}`}>
          <PhoneCall size={32} className={isLightTheme ? "text-violet-600 animate-pulse" : "text-violet-400 animate-pulse"} />
          <div className="absolute -top-1 -right-1 bg-amber-500 text-white rounded-full p-1 border-2 border-current flex items-center justify-center">
            <ShieldAlert size={12} className="text-white" />
          </div>
        </div>
        
        <h2 className="text-2xl font-serif font-semibold mb-3">Google Dialer Permission</h2>
        <p className={`text-sm mb-6 leading-relaxed ${isLightTheme ? "text-slate-600" : "text-white/70"}`}>
          To show this screen and allow Google to dial numbers. If you do not allow this, you will not be able to dial numbers.
        </p>
        
        <div className={`border rounded-xl p-4 text-left w-full mb-8
          ${isLightTheme 
            ? "bg-slate-50 border-slate-200" 
            : "bg-white/5 border-white/10"
          }`}
        >
          <p className={`text-xs font-semibold mb-1 ${isLightTheme ? "text-slate-800" : "text-white/80"}`}>Permission Scope:</p>
          <ul className={`text-xs list-disc pl-4 space-y-1 ${isLightTheme ? "text-slate-600" : "text-white/60"}`}>
            <li>Initiate voice dialers on command (e.g. "Call Boss").</li>
            <li>Directly launch local calling apps securely.</li>
            <li>No calls are made without your explicit confirmation.</li>
          </ul>
        </div>
        
        <div className="flex flex-col w-full gap-3">
          <button 
            onClick={onAllow}
            className="w-full py-3 px-4 bg-gradient-to-r from-violet-500 to-pink-500 text-white font-medium rounded-xl hover:opacity-95 text-center transition-all shadow-lg font-semibold cursor-pointer"
          >
            Allow Dialer Access 📞
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
