import React from 'react';
import { motion } from 'motion/react';
import { MicOff } from 'lucide-react';

interface Props {
  onClose: () => void;
  isLightTheme?: boolean;
}

export default function PermissionModal({ onClose, isLightTheme = false }: Props) {
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
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-500 to-orange-500" />
        
        <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-6
          ${isLightTheme ? "bg-red-100" : "bg-red-500/20"}`}>
          <MicOff size={32} className={isLightTheme ? "text-red-600" : "text-red-400"} />
        </div>
        
        <h2 className="text-2xl font-serif font-semibold mb-3">Microphone Blocked</h2>
        <p className={`text-sm mb-6 leading-relaxed ${isLightTheme ? "text-slate-600" : "text-white/60"}`}>
          Your browser has blocked microphone access for this site. Zoya cannot hear you until you allow it.
        </p>
        
        <div className={`border rounded-xl p-4 text-left w-full mb-8
          ${isLightTheme 
            ? "bg-slate-50 border-slate-200" 
            : "bg-white/5 border-white/10"
          }`}
        >
          <p className={`text-sm font-semibold mb-2 ${isLightTheme ? "text-slate-800" : "text-white/80"}`}>How to fix this:</p>
          {window.self !== window.top ? (
            <div className="space-y-3">
              <p className={`text-xs ${isLightTheme ? "text-amber-700 font-semibold" : "text-amber-300"}`}>
                ⚠️ Zoya is currently running inside an iframe. Chrome & Safari block microphone access inside iframes on phones.
              </p>
              <p className={`text-xs ${isLightTheme ? "text-slate-600" : "text-white/70"}`}>
                Tap <strong>Open in New Tab</strong> below to run Zoya natively and allow microphone access!
              </p>
            </div>
          ) : (
            <ol className={`text-xs list-decimal pl-4 space-y-2 ${isLightTheme ? "text-slate-600" : "text-white/60"}`}>
              <li>Click the <strong>lock icon (🔒)</strong> or <strong>tune icon (⚙️)</strong> next to the URL bar at the top of your browser.</li>
              <li>Find <strong>Microphone</strong> and change it to <strong>Allow</strong>.</li>
              <li>Refresh this page.</li>
            </ol>
          )}
        </div>
        
        <div className="flex flex-col w-full gap-3">
          {window.self !== window.top && (
            <a 
              href={window.location.href}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-3 px-4 bg-gradient-to-r from-violet-500 to-pink-500 text-white font-medium rounded-xl hover:opacity-95 text-center transition-all shadow-lg font-semibold"
            >
              Open in New Tab 🚀
            </a>
          )}
          <button 
            onClick={() => window.location.reload()}
            className={`w-full py-3 px-4 font-semibold rounded-xl transition-colors
              ${isLightTheme 
                ? "bg-slate-900 text-white hover:bg-slate-800" 
                : "bg-white text-black hover:bg-gray-200"
              }`}
          >
            I've allowed it, Refresh Page
          </button>
          <button 
            onClick={onClose}
            className={`w-full py-3 px-4 font-semibold rounded-xl transition-colors
              ${isLightTheme 
                ? "bg-slate-100 text-slate-700 hover:bg-slate-200" 
                : "bg-white/5 text-white/70 hover:bg-white/10"
              }`}
          >
            Close
          </button>
        </div>
      </motion.div>
    </div>
  );
}
